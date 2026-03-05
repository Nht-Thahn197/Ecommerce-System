import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import {
  CreateReturnInput,
  CreateDisputeInput,
  ListReturnsQuery,
  ResolveDisputeInput,
  UpdateReturnStatusInput,
} from "./return.types";

const MAX_LIMIT = 100;
const PAYOUT_DELAY_DAYS = 5;

const toNumber = (value?: string) => {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const getPagination = (query?: { page?: string; limit?: string }) => {
  const page = Math.max(1, toNumber(query?.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, toNumber(query?.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export const requestReturn = async (userId: string, input: CreateReturnInput) => {
  if (!input.order_item_id) {
    throw new Error("order_item_id is required");
  }

  const item = await prisma.order_items.findUnique({
    where: { id: input.order_item_id },
    select: {
      id: true,
      status: true,
      return_deadline_at: true,
      orders: { select: { user_id: true } },
    },
  });

  if (!item || item.orders?.user_id !== userId) {
    throw new Error("Order item not found");
  }

  if (item.status !== "received") {
    throw new Error("Only received items can be returned");
  }

  if (item.return_deadline_at && item.return_deadline_at.getTime() < Date.now()) {
    throw new Error("Return window expired");
  }

  const existing = await prisma.returns.findFirst({
    where: { order_item_id: item.id },
    select: { id: true, status: true },
  });

  if (existing) {
    throw new Error("Return already requested");
  }

  const reason = input.reason?.trim() || null;

  const result = await prisma.$transaction(async (tx) => {
    const ret = await tx.returns.create({
      data: {
        order_item_id: item.id,
        reason,
        status: "requested",
      },
    });

    await tx.order_items.update({
      where: { id: item.id },
      data: {
        status: "returned",
        payout_available_at: null,
      },
    });

    return ret;
  });

  return result;
};

export const listMyReturns = async (userId: string, query: ListReturnsQuery) => {
  const { page, limit, skip } = getPagination(query);

  const where = {
    order_items: {
      orders: { user_id: userId },
    },
  };

  const [total, items] = await Promise.all([
    prisma.returns.count({ where }),
    prisma.returns.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        reason: true,
        status: true,
        dispute_status: true,
        dispute_reason: true,
        disputed_at: true,
        dispute_resolution: true,
        dispute_resolved_at: true,
        refund_amount: true,
        rejected_reason: true,
        resolved_at: true,
        created_at: true,
        order_items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            product_variants: {
              select: {
                products: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

export const listPendingReturns = async (query: ListReturnsQuery) => {
  const { page, limit, skip } = getPagination(query);
  const where = { status: "requested" as const };

  const [total, items] = await Promise.all([
    prisma.returns.count({ where }),
    prisma.returns.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        reason: true,
        status: true,
        created_at: true,
        order_items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            orders: { select: { user_id: true } },
          },
        },
      },
    }),
  ]);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

export const updateReturnStatus = async (
  adminId: string,
  returnId: string,
  input: UpdateReturnStatusInput
) => {
  const ret = await prisma.returns.findUnique({
    where: { id: returnId },
    select: {
      id: true,
      status: true,
      order_item_id: true,
      order_items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          product_variant_id: true,
          orders: { select: { id: true, user_id: true, payment_status: true } },
        },
      },
    },
  });

  const orderItem = ret?.order_items;
  if (!ret || !orderItem) {
    throw new Error("Return not found");
  }

  if (ret.status !== "requested") {
    throw new Error("Return already processed");
  }

  const now = new Date();
  const refundAmount = new Prisma.Decimal(orderItem.price).mul(orderItem.quantity);

  return prisma.$transaction(async (tx) => {
    if (input.status === "approved") {
      await tx.returns.update({
        where: { id: ret.id },
        data: {
          status: "approved",
          refund_amount: refundAmount,
          approved_by: adminId,
          resolved_at: now,
          rejected_reason: null,
          dispute_status: null,
          dispute_reason: null,
          dispute_resolved_at: null,
          dispute_resolved_by: null,
          dispute_resolution: null,
        },
      });

      if (orderItem.product_variant_id) {
        await tx.product_variants.update({
          where: { id: orderItem.product_variant_id },
          data: { stock: { increment: orderItem.quantity } },
        });
      }

      if (orderItem.orders?.payment_status === "paid") {
        const wallet =
          (await tx.wallets.findFirst({
            where: { user_id: orderItem.orders.user_id },
            select: { id: true },
          })) ||
          (await tx.wallets.create({
            data: { user_id: orderItem.orders.user_id, balance: 0 },
            select: { id: true },
          }));

        await tx.wallets.update({
          where: { id: wallet.id },
          data: { balance: { increment: refundAmount } },
        });

        await tx.wallet_transactions.create({
          data: {
            wallet_id: wallet.id,
            amount: refundAmount,
            type: "refund",
            reference_id: ret.id,
          },
        });
      }

      return { message: "Return approved" };
    }

    await tx.returns.update({
      where: { id: ret.id },
      data: {
        status: "rejected",
        approved_by: adminId,
        resolved_at: now,
        rejected_reason: input.rejected_reason || "Rejected",
      },
    });

    await tx.order_items.update({
      where: { id: orderItem.id },
      data: {
        status: "received",
        payout_available_at: addDays(now, PAYOUT_DELAY_DAYS),
      },
    });

    return { message: "Return rejected" };
  });
};

export const requestDispute = async (
  userId: string,
  returnId: string,
  input: CreateDisputeInput
) => {
  const ret = await prisma.returns.findUnique({
    where: { id: returnId },
    select: {
      id: true,
      status: true,
      dispute_status: true,
      order_item_id: true,
      order_items: { select: { orders: { select: { user_id: true } } } },
    },
  });

  if (!ret || ret.order_items?.orders?.user_id !== userId) {
    throw new Error("Return not found");
  }

  if (ret.status !== "rejected") {
    throw new Error("Only rejected returns can be disputed");
  }

  if (ret.dispute_status) {
    throw new Error("Dispute already submitted");
  }

  const reason = input.reason?.trim() || null;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.returns.update({
      where: { id: returnId },
      data: {
        dispute_status: "pending",
        dispute_reason: reason,
        disputed_at: new Date(),
      },
    });

    if (ret.order_item_id) {
      await tx.order_items.update({
        where: { id: ret.order_item_id },
        data: { payout_available_at: null },
      });
    }

    return updated;
  });
};

export const listDisputes = async (query: ListReturnsQuery) => {
  const { page, limit, skip } = getPagination(query);
  const where = { dispute_status: "pending" as const };

  const [total, items] = await Promise.all([
    prisma.returns.count({ where }),
    prisma.returns.findMany({
      where,
      skip,
      take: limit,
      orderBy: { disputed_at: "desc" },
      select: {
        id: true,
        status: true,
        dispute_status: true,
        dispute_reason: true,
        disputed_at: true,
        order_items: {
          select: {
            id: true,
            quantity: true,
            price: true,
            orders: { select: { user_id: true } },
          },
        },
      },
    }),
  ]);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

export const resolveDispute = async (
  adminId: string,
  returnId: string,
  input: ResolveDisputeInput
) => {
  const ret = await prisma.returns.findUnique({
    where: { id: returnId },
    select: {
      id: true,
      status: true,
      dispute_status: true,
      order_item_id: true,
      order_items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          product_variant_id: true,
          orders: { select: { user_id: true, payment_status: true } },
        },
      },
    },
  });

  const orderItem = ret?.order_items;
  if (!ret || !orderItem) {
    throw new Error("Return not found");
  }

  if (ret.dispute_status !== "pending") {
    throw new Error("Dispute not pending");
  }

  const now = new Date();
  const refundAmount = new Prisma.Decimal(orderItem.price).mul(orderItem.quantity);

  return prisma.$transaction(async (tx) => {
    if (input.action === "approve") {
      await tx.returns.update({
        where: { id: ret.id },
        data: {
          status: "approved",
          refund_amount: refundAmount,
          approved_by: adminId,
          resolved_at: now,
          dispute_status: "approved",
          dispute_resolved_at: now,
          dispute_resolved_by: adminId,
          dispute_resolution: input.resolution || "Approved",
        },
      });

      await tx.order_items.update({
        where: { id: orderItem.id },
        data: {
          status: "returned",
          payout_available_at: null,
        },
      });

      if (orderItem.product_variant_id) {
        await tx.product_variants.update({
          where: { id: orderItem.product_variant_id },
          data: { stock: { increment: orderItem.quantity } },
        });
      }

      if (orderItem.orders?.payment_status === "paid") {
        const wallet =
          (await tx.wallets.findFirst({
            where: { user_id: orderItem.orders.user_id },
            select: { id: true },
          })) ||
          (await tx.wallets.create({
            data: { user_id: orderItem.orders.user_id, balance: 0 },
            select: { id: true },
          }));

        await tx.wallets.update({
          where: { id: wallet.id },
          data: { balance: { increment: refundAmount } },
        });

        await tx.wallet_transactions.create({
          data: {
            wallet_id: wallet.id,
            amount: refundAmount,
            type: "refund",
            reference_id: ret.id,
          },
        });
      }

      return { message: "Dispute approved" };
    }

    await tx.returns.update({
      where: { id: ret.id },
      data: {
        dispute_status: "rejected",
        dispute_resolved_at: now,
        dispute_resolved_by: adminId,
        dispute_resolution: input.resolution || "Rejected",
      },
    });

    await tx.order_items.update({
      where: { id: orderItem.id },
      data: {
        payout_available_at: addDays(now, PAYOUT_DELAY_DAYS),
      },
    });

    return { message: "Dispute rejected" };
  });
};
