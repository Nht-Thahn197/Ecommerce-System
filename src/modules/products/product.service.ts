import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import {
  CreateProductInput,
  CreateVariantInput,
  ListProductsQuery,
  UpdateProductInput,
  UpdateVariantInput,
  UpdateVariantStockInput,
} from "./product.types";

const MAX_LIMIT = 100;

const productSelect = {
  id: true,
  name: true,
  description: true,
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
  product_variants: {
    select: {
      id: true,
      sku: true,
      price: true,
      stock: true,
    },
  },
} satisfies Prisma.productsSelect;

const toNumber = (value?: string) => {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const buildWhere = (query: ListProductsQuery): Prisma.productsWhereInput => {
  const where: Prisma.productsWhereInput = {};

  const categoryId = toNumber(query.category_id);
  const status = query.status || "active";
  const q = query.q?.trim();
  const shopId = query.shop_id?.trim();

  if (categoryId) where.category_id = categoryId;
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

  const where = buildWhere(query);

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

  const shopId = await getSellerShopId(userId, input.shop_id);

  return prisma.products.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      category_id: input.category_id ?? null,
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

  return prisma.products.update({
    where: { id: productId },
    data: {
      name: input.name?.trim(),
      description: input.description?.trim(),
      category_id: input.category_id ?? undefined,
      status: input.status,
    },
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
      weight: input.weight ?? null,
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
      weight: input.weight ?? undefined,
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
