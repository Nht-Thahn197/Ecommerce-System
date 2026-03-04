import prisma from "../../libs/prisma";
import { listPendingShops } from "../shops/shop.service";
import { RecentOrdersQuery } from "./admin.types";

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

export const getOverview = async () => {
  const [
    usersCount,
    shopsCount,
    approvedShopsCount,
    pendingShopsCount,
    productsCount,
    ordersCount,
    reviewsCount,
    revenueAgg,
    orderStatusGroup,
    paymentStatusGroup,
  ] = await Promise.all([
    prisma.users.count(),
    prisma.shops.count(),
    prisma.shops.count({ where: { status: "approved" } }),
    prisma.shops.count({ where: { status: "pending" } }),
    prisma.products.count(),
    prisma.orders.count(),
    prisma.reviews.count(),
    prisma.orders.aggregate({
      where: { payment_status: "paid" },
      _sum: { total_amount: true },
    }),
    prisma.orders.groupBy({
      by: ["order_status"],
      _count: { _all: true },
    }),
    prisma.orders.groupBy({
      by: ["payment_status"],
      _count: { _all: true },
    }),
  ]);

  const totalRevenue = Number(revenueAgg._sum.total_amount || 0);

  return {
    counts: {
      users: usersCount,
      shops: shopsCount,
      shops_approved: approvedShopsCount,
      shops_pending: pendingShopsCount,
      products: productsCount,
      orders: ordersCount,
      reviews: reviewsCount,
    },
    revenue: {
      total_paid: totalRevenue,
    },
    order_status: orderStatusGroup.map((row) => ({
      status: row.order_status || "unknown",
      count: row._count._all,
    })),
    payment_status: paymentStatusGroup.map((row) => ({
      status: row.payment_status || "unknown",
      count: row._count._all,
    })),
  };
};

export const getRecentOrders = async (query: RecentOrdersQuery) => {
  const { page, limit, skip } = getPagination(query);

  const [total, orders] = await Promise.all([
    prisma.orders.count(),
    prisma.orders.findMany({
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        user_id: true,
        total_amount: true,
        payment_method: true,
        payment_status: true,
        order_status: true,
        created_at: true,
        users: {
          select: { id: true, email: true, full_name: true },
        },
      },
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

export const getPendingShops = async (query?: { page?: string; limit?: string }) => {
  return listPendingShops(query || {});
};
