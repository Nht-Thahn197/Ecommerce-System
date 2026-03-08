import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import { ensureSelectableCategory } from "../categories/category.service";
import {
  CreateProductInput,
  CreateVariantInput,
  ListProductsQuery,
  UpdateProductInput,
  UpdateVariantInput,
  UpdateVariantStockInput,
} from "./product.types";

const MAX_LIMIT = 100;
const MAX_MEDIA_ITEMS = 9;
const ALLOWED_PRODUCT_CONDITIONS = new Set(["new", "like_new", "used"]);
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

const productSelect = {
  id: true,
  name: true,
  description: true,
  gtin: true,
  condition: true,
  length_cm: true,
  width_cm: true,
  height_cm: true,
  cover_image_url: true,
  video_url: true,
  media_gallery: true,
  status: true,
  created_at: true,
  shop_id: true,
  category_id: true,
  categories: {
    select: {
      id: true,
      name: true,
    },
  },
  shops: {
    select: {
      id: true,
      name: true,
    },
  },
  product_variants: {
    select: {
      id: true,
      sku: true,
      price: true,
      stock: true,
      weight: true,
    },
  },
} satisfies Prisma.productsSelect;

const toNumber = (value?: string) => {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const parseBoolean = (value?: string) =>
  TRUE_VALUES.has((value || "").trim().toLowerCase());

const getDescendantCategoryIds = async (categoryId: number) => {
  const rows = await prisma.categories.findMany({
    select: { id: true, parent_id: true },
  });

  const childrenMap = new Map<number, number[]>();
  rows.forEach((row) => {
    if (!row.parent_id) return;
    const siblings = childrenMap.get(row.parent_id) || [];
    siblings.push(row.id);
    childrenMap.set(row.parent_id, siblings);
  });

  const visited = new Set<number>([categoryId]);
  const queue = [categoryId];

  while (queue.length) {
    const currentId = queue.shift()!;
    const children = childrenMap.get(currentId) || [];

    children.forEach((childId) => {
      if (visited.has(childId)) return;
      visited.add(childId);
      queue.push(childId);
    });
  }

  return Array.from(visited);
};

const normalizeString = (value?: string | null, maxLength = 0) => {
  if (value === undefined) return undefined;
  const trimmed = value?.trim() || "";
  if (!trimmed) return null;
  if (maxLength > 0 && trimmed.length > maxLength) {
    throw new Error("Product field exceeds maximum length");
  }
  return trimmed;
};

const normalizeInteger = (value?: number | null, allowNull = false) => {
  if (value === undefined) return undefined;
  if (value === null) return allowNull ? null : undefined;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error("Numeric product field must be >= 0");
  }
  return Math.floor(value);
};

const normalizeCondition = (value?: string | null) => {
  if (value === undefined) return undefined;
  const normalized = value?.trim() || "new";
  if (!ALLOWED_PRODUCT_CONDITIONS.has(normalized)) {
    throw new Error("Invalid product condition");
  }
  return normalized;
};

const normalizeMediaGallery = (value?: string[] | null) => {
  if (value === undefined) return undefined;
  const items = Array.isArray(value)
    ? value
        .map((item) => item?.trim())
        .filter((item): item is string => Boolean(item))
        .slice(0, MAX_MEDIA_ITEMS)
    : [];

  return items.length ? (items as Prisma.InputJsonValue) : Prisma.DbNull;
};

const buildWhere = async (
  query: ListProductsQuery
): Promise<Prisma.productsWhereInput> => {
  const where: Prisma.productsWhereInput = {};

  const categoryId = toNumber(query.category_id);
  const status = query.status || "active";
  const q = query.q?.trim();
  const shopId = query.shop_id?.trim();

  if (categoryId) {
    if (parseBoolean(query.include_descendants)) {
      where.category_id = {
        in: await getDescendantCategoryIds(categoryId),
      };
    } else {
      where.category_id = categoryId;
    }
  }
  if (status) where.status = status;
  if (shopId) where.shop_id = shopId;
  if (q) where.name = { contains: q, mode: "insensitive" };

  const minPrice = toNumber(query.min_price);
  const maxPrice = toNumber(query.max_price);

  if (minPrice !== undefined || maxPrice !== undefined) {
    const price: Prisma.DecimalFilter = {};
    if (minPrice !== undefined) price.gte = minPrice;
    if (maxPrice !== undefined) price.lte = maxPrice;
    where.product_variants = { some: { price } };
  }

  return where;
};

export const listProducts = async (query: ListProductsQuery) => {
  const page = Math.max(1, toNumber(query.page) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, toNumber(query.limit) || 20)
  );
  const skip = (page - 1) * limit;

  const where = await buildWhere(query);

  const [total, items] = await Promise.all([
    prisma.products.count({ where }),
    prisma.products.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: productSelect,
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

export const getProductById = async (id: string) => {
  const product = await prisma.products.findUnique({
    where: { id },
    select: productSelect,
  });

  if (!product) throw new Error("Product not found");

  return product;
};

export const updateVariantStock = async (
  userId: string,
  variantId: string,
  input: UpdateVariantStockInput
) => {
  const stock = Math.max(0, Math.floor(input.stock));

  const variant = await prisma.product_variants.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      products: { select: { shop_id: true } },
    },
  });

  if (!variant?.products?.shop_id) {
    throw new Error("Product variant not found");
  }

  const shop = await prisma.shops.findFirst({
    where: { id: variant.products.shop_id, owner_id: userId },
    select: { id: true },
  });

  if (!shop) {
    throw new Error("Seller only");
  }

  return prisma.product_variants.update({
    where: { id: variantId },
    data: { stock },
  });
};

const getSellerShopId = async (userId: string, shopId?: string) => {
  if (shopId) {
    const shop = await prisma.shops.findFirst({
      where: { id: shopId, owner_id: userId, status: "approved" },
      select: { id: true },
    });
    if (!shop) throw new Error("Shop not found");
    return shop.id;
  }

  const shop = await prisma.shops.findFirst({
    where: { owner_id: userId, status: "approved" },
    select: { id: true },
  });

  if (!shop) throw new Error("Seller only");
  return shop.id;
};

export const createProduct = async (
  userId: string,
  input: CreateProductInput
) => {
  if (!input.name?.trim()) {
    throw new Error("Product name is required");
  }

  if (input.category_id === undefined || input.category_id === null) {
    throw new Error("Category is required");
  }

  await ensureSelectableCategory(input.category_id);

  const shopId = await getSellerShopId(userId, input.shop_id);
  const mediaGallery = normalizeMediaGallery(input.media_gallery);

  return prisma.products.create({
    data: {
      name: input.name.trim(),
      description: normalizeString(input.description) ?? null,
      category_id: input.category_id ?? null,
      gtin: normalizeString(input.gtin, 100) ?? null,
      condition: normalizeCondition(input.condition) || "new",
      length_cm: normalizeInteger(input.length_cm, true) ?? null,
      width_cm: normalizeInteger(input.width_cm, true) ?? null,
      height_cm: normalizeInteger(input.height_cm, true) ?? null,
      cover_image_url: normalizeString(input.cover_image_url, 500) ?? null,
      video_url: normalizeString(input.video_url, 500) ?? null,
      media_gallery: mediaGallery ?? Prisma.DbNull,
      status: input.status || "active",
      shop_id: shopId,
    },
  });
};

export const updateProduct = async (
  userId: string,
  productId: string,
  input: UpdateProductInput
) => {
  const product = await prisma.products.findUnique({
    where: { id: productId },
    select: { id: true, shop_id: true },
  });

  if (!product?.shop_id) {
    throw new Error("Product not found");
  }

  const shop = await prisma.shops.findFirst({
    where: { id: product.shop_id, owner_id: userId },
    select: { id: true },
  });

  if (!shop) {
    throw new Error("Seller only");
  }

  if (input.category_id !== undefined) {
    await ensureSelectableCategory(input.category_id);
  }

  const data: Prisma.productsUncheckedUpdateInput = {
    status: input.status,
  };

  if (input.name !== undefined) {
    const name = input.name?.trim();
    if (!name) {
      throw new Error("Product name is required");
    }
    data.name = name;
  }

  if (input.description !== undefined) {
    data.description = normalizeString(input.description);
  }

  if (input.category_id !== undefined) {
    data.category_id = input.category_id;
  }

  if (input.gtin !== undefined) {
    data.gtin = normalizeString(input.gtin, 100);
  }

  if (input.condition !== undefined) {
    data.condition = normalizeCondition(input.condition) || "new";
  }

  if (input.length_cm !== undefined) {
    data.length_cm = normalizeInteger(input.length_cm, true);
  }

  if (input.width_cm !== undefined) {
    data.width_cm = normalizeInteger(input.width_cm, true);
  }

  if (input.height_cm !== undefined) {
    data.height_cm = normalizeInteger(input.height_cm, true);
  }

  if (input.cover_image_url !== undefined) {
    data.cover_image_url = normalizeString(input.cover_image_url, 500);
  }

  if (input.video_url !== undefined) {
    data.video_url = normalizeString(input.video_url, 500);
  }

  if (input.media_gallery !== undefined) {
    data.media_gallery = normalizeMediaGallery(input.media_gallery);
  }

  return prisma.products.update({
    where: { id: productId },
    data,
  });
};

export const deleteProduct = async (userId: string, productId: string) => {
  const product = await prisma.products.findUnique({
    where: { id: productId },
    select: { id: true, shop_id: true },
  });

  if (!product?.shop_id) {
    throw new Error("Product not found");
  }

  const shop = await prisma.shops.findFirst({
    where: { id: product.shop_id, owner_id: userId },
    select: { id: true },
  });

  if (!shop) {
    throw new Error("Seller only");
  }

  return prisma.products.update({
    where: { id: productId },
    data: { status: "inactive" },
  });
};

export const createVariant = async (
  userId: string,
  productId: string,
  input: CreateVariantInput
) => {
  if (!Number.isFinite(input.price) || input.price <= 0) {
    throw new Error("Price must be greater than 0");
  }

  const product = await prisma.products.findUnique({
    where: { id: productId },
    select: { id: true, shop_id: true },
  });

  if (!product?.shop_id) {
    throw new Error("Product not found");
  }

  const shop = await prisma.shops.findFirst({
    where: { id: product.shop_id, owner_id: userId },
    select: { id: true },
  });

  if (!shop) {
    throw new Error("Seller only");
  }

  return prisma.product_variants.create({
    data: {
      product_id: productId,
      sku: input.sku || null,
      price: input.price,
      stock: input.stock ?? 0,
      weight: normalizeInteger(input.weight, true) ?? null,
    },
  });
};

export const updateVariant = async (
  userId: string,
  variantId: string,
  input: UpdateVariantInput
) => {
  const variant = await prisma.product_variants.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      product_id: true,
      products: { select: { shop_id: true } },
    },
  });

  if (!variant?.products?.shop_id) {
    throw new Error("Product variant not found");
  }

  const shop = await prisma.shops.findFirst({
    where: { id: variant.products.shop_id, owner_id: userId },
    select: { id: true },
  });

  if (!shop) {
    throw new Error("Seller only");
  }

  if (input.price !== undefined && (!Number.isFinite(input.price) || input.price <= 0)) {
    throw new Error("Price must be greater than 0");
  }

  if (input.stock !== undefined && input.stock < 0) {
    throw new Error("Stock must be >= 0");
  }

  return prisma.product_variants.update({
    where: { id: variantId },
    data: {
      sku: input.sku ?? undefined,
      price: input.price ?? undefined,
      stock: input.stock ?? undefined,
      weight: normalizeInteger(input.weight) ?? undefined,
    },
  });
};

export const deleteVariant = async (userId: string, variantId: string) => {
  const variant = await prisma.product_variants.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      products: { select: { shop_id: true } },
      order_items: { select: { id: true } },
    },
  });

  if (!variant?.products?.shop_id) {
    throw new Error("Product variant not found");
  }

  const shop = await prisma.shops.findFirst({
    where: { id: variant.products.shop_id, owner_id: userId },
    select: { id: true },
  });

  if (!shop) {
    throw new Error("Seller only");
  }

  if (variant.order_items.length > 0) {
    throw new Error("Cannot delete variant with existing orders");
  }

  await prisma.product_variants.delete({
    where: { id: variantId },
  });
};
