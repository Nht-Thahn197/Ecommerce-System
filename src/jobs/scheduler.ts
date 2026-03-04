import { Prisma } from "@prisma/client";
import prisma from "../libs/prisma";
import { recalculateOrderStatus } from "../modules/orders/order.service";

const DAY_MS = 24 * 60 * 60 * 1000;
const AUTO_RECEIVE_DAYS = 7;
const RETURN_WINDOW_DAYS = 15;
const PAYOUT_DELAY_DAYS = 5;

const AUTO_RECEIVE_INTERVAL_MS = Number(
  process.env.AUTO_RECEIVE_INTERVAL_MS || 60 * 60 * 1000
);
const PAYOUT_INTERVAL_MS = Number(
  process.env.PAYOUT_INTERVAL_MS || 60 * 60 * 1000
);

const PLATFORM_FEE_PERCENT = (() => {
  const raw = Number(process.env.PLATFORM_FEE_PERCENT || "0");
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return raw > 1 ? raw / 100 : raw;
})();

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * DAY_MS);

export const runAutoReceiveJob = async () => {
  const cutoff = new Date(Date.now() - AUTO_RECEIVE_DAYS * DAY_MS);
  const now = new Date();

  const items = await prisma.order_items.findMany({
    where: {
      status: "delivered",
      shipments: {
        some: {
          shipping_status: "delivered",
          delivered_at: { lte: cutoff },
        },
      },
    },
    select: { id: true, order_id: true },
  });

  if (items.length === 0) return { updated: 0 };

  const orderIds = new Set<string>();

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.order_items.update({
        where: { id: item.id },
        data: {
          status: "received",
          received_at: now,
          return_deadline_at: addDays(now, RETURN_WINDOW_DAYS),
          payout_available_at: addDays(now, PAYOUT_DELAY_DAYS),
        },
      });

      if (item.order_id) {
        orderIds.add(item.order_id);
      }
    }

    for (const orderId of orderIds) {
      await recalculateOrderStatus(orderId, tx);
    }
  });

  return { updated: items.length };
};

export const runPayoutJob = async () => {
  const now = new Date();
  const feeRate = new Prisma.Decimal(PLATFORM_FEE_PERCENT);

  const items = await prisma.order_items.findMany({
    where: {
      status: "received",
      payout_available_at: { lte: now },
      shop_payout: { is: null },
      orders: { payment_status: "paid" },
    },
    select: {
      id: true,
      quantity: true,
      price: true,
      shop_id: true,
      payout_available_at: true,
      shops: { select: { owner_id: true } },
    },
  });

  if (items.length === 0) return { paid: 0 };

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (!item.shop_id || !item.shops?.owner_id) continue;

      const gross = new Prisma.Decimal(item.price).mul(item.quantity);
      const fee = gross.mul(feeRate);
      const net = gross.sub(fee);

      const wallet =
        (await tx.wallets.findFirst({
          where: { user_id: item.shops.owner_id },
          select: { id: true },
        })) ||
        (await tx.wallets.create({
          data: { user_id: item.shops.owner_id, balance: 0 },
          select: { id: true },
        }));

      await tx.wallets.update({
        where: { id: wallet.id },
        data: { balance: { increment: net } },
      });

      await tx.wallet_transactions.create({
        data: {
          wallet_id: wallet.id,
          amount: net,
          type: "payout",
          reference_id: item.id,
        },
      });

      await tx.shop_payouts.create({
        data: {
          order_item_id: item.id,
          shop_id: item.shop_id,
          gross_amount: gross,
          fee_amount: fee,
          net_amount: net,
          status: "paid",
          available_at: item.payout_available_at || now,
          paid_at: now,
        },
      });
    }
  });

  return { paid: items.length };
};

export const startScheduler = () => {
  if (process.env.SCHEDULER_ENABLED !== "true") return;

  const safeRun = async (fn: () => Promise<any>, name: string) => {
    try {
      await fn();
    } catch (error) {
      console.error(`[scheduler] ${name} error`, error);
    }
  };

  safeRun(runAutoReceiveJob, "auto-receive");
  safeRun(runPayoutJob, "payout");

  setInterval(() => safeRun(runAutoReceiveJob, "auto-receive"), AUTO_RECEIVE_INTERVAL_MS);
  setInterval(() => safeRun(runPayoutJob, "payout"), PAYOUT_INTERVAL_MS);
};
