import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import {
  ListOrdersQuery,
  ListSellerItemsQuery,
  OrderItemStatus,
} from "./order.types";

const TERMINAL_STATUSES: OrderItemStatus[] = [
  "received",
  "cancelled",
  "returned",
];

const RETURN_WINDOW_DAYS = 15;
const PAYOUT_DELAY_DAYS = 5;
const MAX_LIMIT = 100;

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

const orderSelect = {
  id: true,
  user_id: true,
  total_amount: true,
  payment_method: true,
  payment_status: true,
  order_status: true,
  created_at: true,
  order_items: {
    select: {
      id: true,
      status: true,
      quantity: true,
      price: true,
      shop_id: true,
      created_at: true,
      received_at: true,
      return_deadline_at: true,
      product_variants: {
        select: {
          id: true,
          sku: true,
          price: true,
          products: {
            select: {
              id: true,
              name: true,
              status: true,
              shop_id: true,
            },
          },
        },
      },
    },
  },
};

export const listOrdersForUser = async (
  userId: string,
  query: ListOrdersQuery
) => {
  const { page, limit, skip } = getPagination(query);

  const where = { user_id: userId };

  const [total, orders] = await Promise.all([
    prisma.orders.count({ where }),
    prisma.orders.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: orderSelect,
    }),
  ]);

  return {
    data: orders,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

export const getOrderForUser = async (userId: string, orderId: string) => {
  const order = await prisma.orders.findFirst({
    where: { id: orderId, user_id: userId },
    select: orderSelect,
  });

  if (!order) throw new Error("Order not found");

  return order;
};

export const listOrderItemsForSeller = async (
  userId: string,
  query: ListSellerItemsQuery
) => {
  const shops = await prisma.shops.findMany({
    where: { owner_id: userId },
    select: { id: true },
  });

  const shopIds = shops.map((shop) => shop.id);
  if (shopIds.length === 0) {
    return {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
    };
  }

  const { page, limit, skip } = getPagination(query);

  const where = { shop_id: { in: shopIds } };

  const [total, items] = await Promise.all([
    prisma.order_items.count({ where }),
    prisma.order_items.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        status: true,
        quantity: true,
        price: true,
        created_at: true,
        orders: {
          select: {
            id: true,
            user_id: true,
            payment_method: true,
            payment_status: true,
            created_at: true,
          },
        },
        product_variants: {
          select: {
            id: true,
            sku: true,
            price: true,
            products: {
              select: { id: true, name: true },
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

const canCustomerCancel = (status: OrderItemStatus) =>
  status === "pending" || status === "confirmed";

const canSellerCancel = (status: OrderItemStatus) =>
  status === "pending" || status === "confirmed";

const isValidTransition = (
  current: OrderItemStatus,
  next: OrderItemStatus,
  actor: "customer" | "seller"
) => {
  if (current === next) return false;

  if (actor === "seller") {
    if (next === "confirmed") return current === "pending";
    if (next === "shipping") return current === "confirmed";
    if (next === "delivered") return current === "shipping";
    if (next === "cancelled") return canSellerCancel(current);
    return false;
  }

  if (next === "received") return current === "delivered";
  if (next === "cancelled") return canCustomerCancel(current);
  return false;
};

export const recalculateOrderStatus = async (
  orderId: string,
  tx?: Prisma.TransactionClient
) => {
  const db = tx || prisma;
  const items = await db.order_items.findMany({
    where: { order_id: orderId },
    select: { status: true },
  });

  if (items.length === 0) return;

  const statuses = items.map((item) => item.status as OrderItemStatus);
  const allCancelled = statuses.every((status) => status === "cancelled");
  const allTerminal = statuses.every((status) =>
    TERMINAL_STATUSES.includes(status)
  );

  let nextStatus = "pending";
  if (allCancelled) {
    nextStatus = "cancelled";
  } else if (allTerminal) {
    nextStatus = "completed";
  } else if (statuses.some((status) => status !== "pending")) {
    nextStatus = "processing";
  }

  await db.orders.update({
    where: { id: orderId },
    data: { order_status: nextStatus },
  });
};

export const updateOrderItemStatus = async (
  userId: string,
  itemId: string,
  nextStatus: OrderItemStatus
) => {
  const item = await prisma.order_items.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      status: true,
      order_id: true,
      received_at: true,
      return_deadline_at: true,
      product_variant_id: true,
      quantity: true,
      orders: { select: { user_id: true } },
      shops: { select: { owner_id: true } },
    },
  });

  if (!item) throw new Error("Order item not found");

  const isCustomer = item.orders?.user_id === userId;
  const isSeller = item.shops?.owner_id === userId;

  if (!isCustomer && !isSeller) {
    throw new Error("Unauthorized");
  }

  const actor = isSeller ? "seller" : "customer";

  if (!isValidTransition(item.status as OrderItemStatus, nextStatus, actor)) {
    throw new Error("Invalid status transition");
  }

  if (nextStatus === "returned") {
    if (!item.return_deadline_at) {
      throw new Error("Return window is not available");
    }
    if (item.return_deadline_at.getTime() < Date.now()) {
      throw new Error("Return window expired");
    }
  }

  const updateData: {
    status: OrderItemStatus;
    received_at?: Date | null;
    return_deadline_at?: Date | null;
    payout_available_at?: Date | null;
  } = {
    status: nextStatus,
  };

  if (nextStatus === "received") {
    const now = new Date();
    updateData.received_at = now;
    updateData.return_deadline_at = addDays(now, RETURN_WINDOW_DAYS);
    updateData.payout_available_at = addDays(now, PAYOUT_DELAY_DAYS);
  }

  if (nextStatus === "cancelled") {
    updateData.received_at = null;
    updateData.return_deadline_at = null;
    updateData.payout_available_at = null;
  }

  if (nextStatus === "returned") {
    updateData.payout_available_at = null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.order_items.update({
      where: { id: itemId },
      data: updateData,
    });

    if (nextStatus === "cancelled" || nextStatus === "returned") {
      if (item.product_variant_id) {
        await tx.product_variants.update({
          where: { id: item.product_variant_id },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    if (item.order_id) {
      await recalculateOrderStatus(item.order_id, tx);
    }
  });

  return { message: "Status updated" };
};

export const updatePaymentStatus = async (
  orderId: string,
  paymentStatus: "pending" | "paid" | "refunded" | "failed"
) => {
  const allowed = ["pending", "paid", "refunded", "failed"];
  if (!allowed.includes(paymentStatus)) {
    throw new Error("Invalid payment status");
  }

  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    select: { id: true, payment_method: true, payment_status: true },
  });

  if (!order) throw new Error("Order not found");

  if (order.payment_method === "cod" && paymentStatus === "paid") {
    return prisma.orders.update({
      where: { id: orderId },
      data: { payment_status: "paid" },
    });
  }

  return prisma.orders.update({
    where: { id: orderId },
    data: { payment_status: paymentStatus },
  });
};
