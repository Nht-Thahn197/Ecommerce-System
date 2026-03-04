import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import { ListProductsQuery, UpdateVariantStockInput } from "./product.types";

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
