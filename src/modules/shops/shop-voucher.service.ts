import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import { ShopVoucherInput, ShopVouchersQuery } from "./shop-voucher.types";

const MAX_LIMIT = 100;
const VOUCHER_TYPES = new Set(["amount", "percent"]);
const VOUCHER_FILTER_STATUSES = new Set([
  "all",
  "running",
  "upcoming",
  "expired",
  "inactive",
]);

const shopVoucherSelect = {
  id: true,
  shop_id: true,
  code: true,
  discount_type: true,
  discount_value: true,
  min_order_amount: true,
  product_ids: true,
  max_discount_amount: true,
  starts_at: true,
  ends_at: true,
  quantity: true,
  used_quantity: true,
  is_active: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.shop_vouchersSelect;

type ShopVoucherRow = Prisma.shop_vouchersGetPayload<{
  select: typeof shopVoucherSelect;
}>;

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

const parseQuantity = (value: string | number | null | undefined) => {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error("Số lượng voucher phải lớn hơn 0");
  }
  return normalized;
};

const readProductIds = (value: Prisma.JsonValue | null | undefined) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((item) => String(item || "").trim())
            .filter((item): item is string => Boolean(item))
        )
      )
    : [];

const parseProductIdsInput = (value?: string[] | null) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((item) => String(item || "").trim())
            .filter((item): item is string => Boolean(item))
        )
      )
    : [];

const ensureSellerShop = async (userId: string, shopId: string) => {
  const shop = await prisma.shops.findFirst({
    where: { id: shopId, owner_id: userId, status: "approved" },
    select: { id: true, name: true },
  });

  if (!shop) {
    throw new Error("Shop không tồn tại hoặc bạn không có quyền truy cập");
  }

  return shop;
};

const ensureProductsBelongToShop = async (
  shopId: string,
  productIds: string[]
) => {
  if (!productIds.length) return [];

  const products = await prisma.products.findMany({
    where: {
      shop_id: shopId,
      id: { in: productIds },
    },
    select: { id: true },
  });

  if (products.length !== productIds.length) {
    throw new Error("Sản phẩm áp dụng không hợp lệ");
  }

  return productIds;
};

const computeVoucherState = (
  voucher: Pick<ShopVoucherRow, "is_active" | "starts_at" | "ends_at">
) => {
  const now = new Date();
  if (!voucher.is_active) return "inactive";
  if (voucher.starts_at > now) return "upcoming";
  if (voucher.ends_at < now) return "expired";
  return "running";
};

const serializeShopVoucher = (voucher: ShopVoucherRow) => ({
  id: voucher.id,
  shop_id: voucher.shop_id,
  code: voucher.code,
  discount_type: voucher.discount_type,
  discount_value: Number(voucher.discount_value),
  min_order_amount: Number(voucher.min_order_amount),
  product_ids: readProductIds(voucher.product_ids),
  max_discount_amount:
    voucher.max_discount_amount === null || voucher.max_discount_amount === undefined
      ? null
      : Number(voucher.max_discount_amount),
  starts_at: voucher.starts_at,
  ends_at: voucher.ends_at,
  quantity: voucher.quantity,
  used_quantity: voucher.used_quantity,
  remaining_quantity: Math.max(0, voucher.quantity - voucher.used_quantity),
  is_active: Boolean(voucher.is_active),
  state: computeVoucherState(voucher),
  created_at: voucher.created_at,
  updated_at: voucher.updated_at,
});

const buildVoucherWhere = (shopId: string, query: ShopVouchersQuery) => {
  const where: Prisma.shop_vouchersWhereInput = { shop_id: shopId };
  const now = new Date();
  const keyword = query.q?.trim();
  const status = (query.status || "all").trim().toLowerCase();

  if (keyword) {
    where.code = { contains: keyword, mode: "insensitive" };
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

const getVoucherSummary = async (shopId: string) => {
  const now = new Date();

  const [total, running, upcoming, expired, inactive] = await Promise.all([
    prisma.shop_vouchers.count({ where: { shop_id: shopId } }),
    prisma.shop_vouchers.count({
      where: {
        shop_id: shopId,
        is_active: true,
        starts_at: { lte: now },
        ends_at: { gte: now },
      },
    }),
    prisma.shop_vouchers.count({
      where: {
        shop_id: shopId,
        is_active: true,
        starts_at: { gt: now },
      },
    }),
    prisma.shop_vouchers.count({
      where: {
        shop_id: shopId,
        is_active: true,
        ends_at: { lt: now },
      },
    }),
    prisma.shop_vouchers.count({
      where: {
        shop_id: shopId,
        is_active: false,
      },
    }),
  ]);

  return {
    total,
    running,
    upcoming,
    expired,
    inactive,
  };
};

const toVoucherWriteError = (error: unknown) => {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new Error("Mã voucher đã tồn tại trong shop");
  }

  return error instanceof Error
    ? error
    : new Error("Không thể lưu voucher của shop");
};

const normalizeShopVoucherPayload = async (
  shopId: string,
  input: ShopVoucherInput,
  currentVoucher?: Pick<ShopVoucherRow, "used_quantity">
) => {
  const code = normalizeVoucherCode(input.code);
  if (!code) {
    throw new Error("Mã giảm giá là bắt buộc");
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

  const quantity = parseQuantity(input.quantity);
  if ((currentVoucher?.used_quantity || 0) > quantity) {
    throw new Error("Số lượng voucher không thể nhỏ hơn số đã dùng");
  }

  const productIds = await ensureProductsBelongToShop(
    shopId,
    parseProductIdsInput(input.product_ids)
  );

  return {
    code,
    discount_type: discountType,
    discount_value: discountValue,
    min_order_amount: minOrderAmount,
    product_ids: productIds.length
      ? (productIds as Prisma.InputJsonValue)
      : Prisma.DbNull,
    max_discount_amount: maxDiscountAmount,
    starts_at: startsAt,
    ends_at: endsAt,
    quantity,
    is_active: typeof input.is_active === "boolean" ? input.is_active : true,
    updated_at: new Date(),
  };
};

export const getShopVouchers = async (
  userId: string,
  shopId: string,
  query: ShopVouchersQuery
) => {
  await ensureSellerShop(userId, shopId);
  const { page, limit, skip } = getPagination(query);
  const where = buildVoucherWhere(shopId, query);

  const [total, items, summary] = await Promise.all([
    prisma.shop_vouchers.count({ where }),
    prisma.shop_vouchers.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: shopVoucherSelect,
    }),
    getVoucherSummary(shopId),
  ]);

  return {
    data: items.map(serializeShopVoucher),
    summary,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

export const getShopVoucherById = async (
  userId: string,
  shopId: string,
  voucherId: string
) => {
  await ensureSellerShop(userId, shopId);

  const voucher = await prisma.shop_vouchers.findFirst({
    where: {
      id: voucherId,
      shop_id: shopId,
    },
    select: shopVoucherSelect,
  });

  if (!voucher) {
    throw new Error("Voucher không tồn tại");
  }

  return serializeShopVoucher(voucher);
};

export const createShopVoucher = async (
  userId: string,
  shopId: string,
  input: ShopVoucherInput
) => {
  await ensureSellerShop(userId, shopId);
  const data = await normalizeShopVoucherPayload(shopId, input);

  try {
    const voucher = await prisma.shop_vouchers.create({
      data: {
        shop_id: shopId,
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_order_amount: data.min_order_amount,
        product_ids: data.product_ids,
        max_discount_amount: data.max_discount_amount,
        starts_at: data.starts_at,
        ends_at: data.ends_at,
        quantity: data.quantity,
        used_quantity: 0,
        is_active: data.is_active,
      },
      select: shopVoucherSelect,
    });

    return serializeShopVoucher(voucher);
  } catch (error) {
    throw toVoucherWriteError(error);
  }
};

export const updateShopVoucher = async (
  userId: string,
  shopId: string,
  voucherId: string,
  input: ShopVoucherInput
) => {
  await ensureSellerShop(userId, shopId);

  const existing = await prisma.shop_vouchers.findFirst({
    where: {
      id: voucherId,
      shop_id: shopId,
    },
    select: {
      id: true,
      used_quantity: true,
    },
  });

  if (!existing) {
    throw new Error("Voucher không tồn tại");
  }

  const data = await normalizeShopVoucherPayload(shopId, input, existing);

  try {
    const voucher = await prisma.shop_vouchers.update({
      where: { id: existing.id },
      data,
      select: shopVoucherSelect,
    });

    return serializeShopVoucher(voucher);
  } catch (error) {
    throw toVoucherWriteError(error);
  }
};

export const deleteShopVoucher = async (
  userId: string,
  shopId: string,
  voucherId: string
) => {
  await ensureSellerShop(userId, shopId);

  const existing = await prisma.shop_vouchers.findFirst({
    where: {
      id: voucherId,
      shop_id: shopId,
    },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Voucher không tồn tại");
  }

  await prisma.shop_vouchers.delete({
    where: { id: existing.id },
  });
};
