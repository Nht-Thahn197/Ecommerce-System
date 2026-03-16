import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import { getShopDetailById, listPendingShops } from "../shops/shop.service";
import {
  AdminProductsQuery,
  AdminVoucherInput,
  AdminVouchersQuery,
  RecentOrdersQuery,
} from "./admin.types";

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

const VOUCHER_TYPES = new Set(["amount", "percent"]);
const VOUCHER_KINDS = new Set(["discount", "shipping"]);
const VOUCHER_FILTER_STATUSES = new Set([
  "all",
  "running",
  "upcoming",
  "expired",
  "inactive",
]);

const voucherSelect = {
  id: true,
  code: true,
  voucher_kind: true,
  discount_type: true,
  discount_value: true,
  min_order_amount: true,
  category_id: true,
  max_discount_amount: true,
  starts_at: true,
  ends_at: true,
  is_active: true,
  created_at: true,
  updated_at: true,
  categories: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.platform_vouchersSelect;

type VoucherRow = Prisma.platform_vouchersGetPayload<{ select: typeof voucherSelect }>;

const normalizeVoucherCode = (value?: string) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const parseMoneyValue = (
  value: string | number | null | undefined,
  fieldLabel: string,
  { allowNull = false, min = 0, allowZero = true } = {}
) => {
  if (value === null || value === undefined || value === "") {
    if (allowNull) return null;
    throw new Error(`${fieldLabel} là bắt buộc`);
  }

  const normalized = Number(value);
  if (!Number.isFinite(normalized)) {
    throw new Error(`${fieldLabel} không hợp lệ`);
  }
  if (normalized < min || (!allowZero && normalized === 0)) {
    throw new Error(`${fieldLabel} không hợp lệ`);
  }
  return new Prisma.Decimal(normalized.toFixed(2));
};

const parseCategoryId = (value?: number | string | null) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error("Ngành hàng áp dụng không hợp lệ");
  }
  return parsed;
};

const parseVoucherDate = (value: string | undefined, fieldLabel: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    throw new Error(`${fieldLabel} là bắt buộc`);
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldLabel} không hợp lệ`);
  }
  return date;
};

const ensureVoucherCategoryExists = async (categoryId: number | null) => {
  if (!categoryId) return null;
  const category = await prisma.categories.findUnique({
    where: { id: categoryId },
    select: { id: true },
  });
  if (!category) {
    throw new Error("Ngành hàng áp dụng không tồn tại");
  }
  return category.id;
};

const computeVoucherState = (voucher: Pick<VoucherRow, "is_active" | "starts_at" | "ends_at">) => {
  const now = new Date();
  if (!voucher.is_active) return "inactive";
  if (voucher.starts_at > now) return "upcoming";
  if (voucher.ends_at < now) return "expired";
  return "running";
};

const serializeVoucher = (voucher: VoucherRow) => ({
  id: voucher.id,
  code: voucher.code,
  voucher_kind: voucher.voucher_kind || "discount",
  discount_type: voucher.discount_type,
  discount_value: Number(voucher.discount_value),
  min_order_amount: Number(voucher.min_order_amount),
  category_id: voucher.category_id ?? null,
  category_name: voucher.categories?.name || null,
  max_discount_amount:
    voucher.max_discount_amount === null || voucher.max_discount_amount === undefined
      ? null
      : Number(voucher.max_discount_amount),
  starts_at: voucher.starts_at,
  ends_at: voucher.ends_at,
  is_active: Boolean(voucher.is_active),
  state: computeVoucherState(voucher),
  created_at: voucher.created_at,
  updated_at: voucher.updated_at,
});

const buildVoucherWhere = (query: AdminVouchersQuery) => {
  const where: Prisma.platform_vouchersWhereInput = {};
  const now = new Date();
  const keyword = query.q?.trim();
  const status = (query.status || "all").trim().toLowerCase();

  if (keyword) {
    where.OR = [
      { code: { contains: keyword, mode: "insensitive" } },
      { categories: { name: { contains: keyword, mode: "insensitive" } } },
    ];
  }

  if (status && status !== "all") {
    if (!VOUCHER_FILTER_STATUSES.has(status)) {
      throw new Error("Bộ lọc trạng thái voucher không hợp lệ");
    }

    if (status === "running") {
      where.is_active = true;
      where.starts_at = { lte: now };
      where.ends_at = { gte: now };
    }

    if (status === "upcoming") {
      where.is_active = true;
      where.starts_at = { gt: now };
    }

    if (status === "expired") {
      where.is_active = true;
      where.ends_at = { lt: now };
    }

    if (status === "inactive") {
      where.is_active = false;
    }
  }

  return where;
};

const normalizeVoucherPayload = async (input: AdminVoucherInput) => {
  const code = normalizeVoucherCode(input.code);
  if (!code) {
    throw new Error("Mã giảm giá là bắt buộc");
  }

  const voucherKind = String(input.voucher_kind || "discount")
    .trim()
    .toLowerCase();
  if (!VOUCHER_KINDS.has(voucherKind)) {
    throw new Error("Loáº¡i voucher khÃ´ng há»£p lá»‡");
  }

  const discountType = String(input.discount_type || "").trim().toLowerCase();
  if (!VOUCHER_TYPES.has(discountType)) {
    throw new Error("Loại giảm giá không hợp lệ");
  }

  const discountValue = parseMoneyValue(input.discount_value, "Giá trị giảm", {
    min: 0,
    allowZero: false,
  }) as Prisma.Decimal;
  const minOrderAmount = parseMoneyValue(
    input.min_order_amount ?? 0,
    "Điều kiện đơn hàng",
    {
      min: 0,
      allowZero: true,
    }
  ) as Prisma.Decimal;
  const maxDiscountAmount =
    discountType === "percent"
      ? parseMoneyValue(input.max_discount_amount, "Giảm tối đa", {
          allowNull: true,
          min: 0,
          allowZero: false,
        })
      : null;

  if (discountType === "percent") {
    const percentValue = discountValue.toNumber();
    if (percentValue <= 0 || percentValue > 100) {
      throw new Error("Phần trăm giảm phải lớn hơn 0 và không vượt quá 100");
    }
  }

  const startsAt = parseVoucherDate(input.starts_at, "Thời gian bắt đầu");
  const endsAt = parseVoucherDate(input.ends_at, "Thời gian kết thúc");
  if (endsAt <= startsAt) {
    throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
  }

  const categoryId = await ensureVoucherCategoryExists(parseCategoryId(input.category_id));

  return {
    code,
    voucher_kind: voucherKind,
    discount_type: discountType,
    discount_value: discountValue,
    min_order_amount: minOrderAmount,
    category_id: categoryId,
    max_discount_amount: maxDiscountAmount,
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: typeof input.is_active === "boolean" ? input.is_active : true,
    updated_at: new Date(),
  };
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

export const getAdminVouchers = async (query: AdminVouchersQuery) => {
  const { page, limit, skip } = getPagination(query);
  const where = buildVoucherWhere(query);
  const now = new Date();

  const [total, items, running, upcoming, expired, inactive] = await Promise.all([
    prisma.platform_vouchers.count({ where }),
    prisma.platform_vouchers.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ created_at: "desc" }, { code: "asc" }],
      select: voucherSelect,
    }),
    prisma.platform_vouchers.count({
      where: {
        is_active: true,
        starts_at: { lte: now },
        ends_at: { gte: now },
      },
    }),
    prisma.platform_vouchers.count({
      where: {
        is_active: true,
        starts_at: { gt: now },
      },
    }),
    prisma.platform_vouchers.count({
      where: {
        is_active: true,
        ends_at: { lt: now },
      },
    }),
    prisma.platform_vouchers.count({
      where: {
        is_active: false,
      },
    }),
  ]);

  return {
    data: items.map(serializeVoucher),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    summary: {
      total: running + upcoming + expired + inactive,
      running,
      upcoming,
      expired,
      inactive,
    },
  };
};

export const getAdminVoucherById = async (voucherId: string) => {
  const voucher = await prisma.platform_vouchers.findUnique({
    where: { id: voucherId },
    select: voucherSelect,
  });

  if (!voucher) {
    throw new Error("Mã giảm giá không tồn tại");
  }

  return serializeVoucher(voucher);
};

export const createAdminVoucher = async (input: AdminVoucherInput) => {
  const payload = await normalizeVoucherPayload(input);

  try {
    const voucher = await prisma.platform_vouchers.create({
      data: payload,
      select: voucherSelect,
    });
    return getAdminVoucherById(voucher.id);
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new Error("Mã giảm giá đã tồn tại");
    }
    throw error;
  }
};

export const updateAdminVoucher = async (
  voucherId: string,
  input: AdminVoucherInput
) => {
  const existing = await prisma.platform_vouchers.findUnique({
    where: { id: voucherId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Mã giảm giá không tồn tại");
  }

  const payload = await normalizeVoucherPayload(input);

  try {
    const voucher = await prisma.platform_vouchers.update({
      where: { id: voucherId },
      data: payload,
      select: { id: true },
    });
    return getAdminVoucherById(voucher.id);
  } catch (error: any) {
    if (error?.code === "P2002") {
      throw new Error("Mã giảm giá đã tồn tại");
    }
    throw error;
  }
};

export const deleteAdminVoucher = async (voucherId: string) => {
  const existing = await prisma.platform_vouchers.findUnique({
    where: { id: voucherId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Mã giảm giá không tồn tại");
  }

  await prisma.platform_vouchers.delete({
    where: { id: voucherId },
  });
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
