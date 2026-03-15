import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import { getShopDetailById, listPendingShops } from "../shops/shop.service";
import { AdminProductsQuery, RecentOrdersQuery } from "./admin.types";

const MAX_LIMIT = 100;
const PRODUCT_STATUSES = new Set([
  "active",
  "pending",
  "rejected",
  "locked",
  "inactive",
]);

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

export const getShopDetail = async (shopId: string) => {
  return getShopDetailById(shopId);
};

const buildProductWhere = (query: AdminProductsQuery) => {
  const where: Prisma.productsWhereInput = {};
  const status = query.status?.trim();
  const q = query.q?.trim();
  const shopId = query.shop_id?.trim();

  if (status && status !== "all") {
    where.status = status;
  }
  if (shopId) {
    where.shop_id = shopId;
  }
  if (q) {
    const orConditions: Prisma.productsWhereInput[] = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { gtin: { contains: q, mode: "insensitive" } },
      { shops: { name: { contains: q, mode: "insensitive" } } },
      { categories: { name: { contains: q, mode: "insensitive" } } },
      { product_variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
    ];

    if (isUuid(q)) {
      orConditions.unshift({ id: q });
    }

    where.OR = orConditions;
  }

  return where;
};

const normalizeProductStatus = (value?: string) => {
  const normalized = (value || "").trim().toLowerCase();
  if (!normalized) {
    throw new Error("Status is required");
  }
  if (!PRODUCT_STATUSES.has(normalized)) {
    throw new Error("Invalid product status");
  }
  return normalized;
};

const isUuid = (value?: string) =>
  Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value
      )
  );

export const getAdminProducts = async (query: AdminProductsQuery) => {
  const { page, limit, skip } = getPagination(query);
  const where = buildProductWhere(query);
  const summaryWhere: Prisma.productsWhereInput = {};

  if (query.shop_id?.trim()) {
    summaryWhere.shop_id = query.shop_id.trim();
  }

  const [total, items, statusGroup] = await Promise.all([
    prisma.products.count({ where }),
    prisma.products.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        created_at: true,
        category_id: true,
        shop_id: true,
        categories: {
          select: { id: true, name: true },
        },
        shops: {
          select: { id: true, name: true },
        },
        product_variants: {
          select: { id: true, sku: true, price: true, stock: true },
        },
      },
    }),
    prisma.products.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: summaryWhere,
    }),
  ]);

  const summary = statusGroup.reduce(
    (acc, row) => {
      const key = row.status || "unknown";
      acc.by_status[key] = row._count._all;
      acc.total += row._count._all;
      return acc;
    },
    { total: 0, by_status: {} as Record<string, number> }
  );

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    summary,
  };
};

export const updateProductStatusByAdmin = async (
  productId: string,
  status?: string
) => {
  const nextStatus = normalizeProductStatus(status);

  return prisma.products.update({
    where: { id: productId },
    data: { status: nextStatus },
  });
};
