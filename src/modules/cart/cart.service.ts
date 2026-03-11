import prisma from "../../libs/prisma";
import { AddCartItemInput, UpdateCartItemInput } from "./cart.types";

const MAX_QUANTITY = 99;

const parseQuantity = (value: number | undefined, fallback: number) => {
  if (value === undefined || value === null) return fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.floor(value);
};

const clampQuantity = (value: number) =>
  Math.min(MAX_QUANTITY, Math.max(1, value));

const cartItemSelect = {
  id: true,
  quantity: true,
  created_at: true,
  updated_at: true,
  product_variants: {
    select: {
      id: true,
      sku: true,
      price: true,
      stock: true,
      image_url: true,
      option_values: true,
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
};

const buildCartSummary = (items: Array<any>) => {
  const total_quantity = items.reduce(
    (sum, item) => sum + (item.quantity || 0),
    0
  );
  const total_amount = items.reduce((sum, item) => {
    const price = Number(item.product_variants?.price || 0);
    return sum + price * (item.quantity || 0);
  }, 0);

  return { total_quantity, total_amount };
};

export const getCart = async (userId: string) => {
  const items = await prisma.cart_items.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
    select: cartItemSelect,
  });

  return {
    items,
    summary: buildCartSummary(items),
  };
};

export const addCartItem = async (userId: string, input: AddCartItemInput) => {
  if (!input.product_variant_id) {
    throw new Error("Product variant id is required");
  }

  const quantity = clampQuantity(parseQuantity(input.quantity, 1));

  const variant = await prisma.product_variants.findUnique({
    where: { id: input.product_variant_id },
    select: { id: true, products: { select: { status: true } } },
  });

  if (!variant || variant.products?.status !== "active") {
    throw new Error("Product variant not found");
  }

  const item = await prisma.cart_items.upsert({
    where: {
      user_id_product_variant_id: {
        user_id: userId,
        product_variant_id: input.product_variant_id,
      },
    },
    update: {
      quantity: {
        increment: quantity,
      },
      updated_at: new Date(),
    },
    create: {
      user_id: userId,
      product_variant_id: input.product_variant_id,
      quantity,
    },
    select: cartItemSelect,
  });

  return item;
};

export const updateCartItem = async (
  userId: string,
  itemId: string,
  input: UpdateCartItemInput
) => {
  const quantity = parseQuantity(input.quantity, 0);

  const existing = await prisma.cart_items.findFirst({
    where: { id: itemId, user_id: userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Cart item not found");
  }

  if (quantity <= 0) {
    await prisma.cart_items.delete({
      where: { id: itemId },
    });
    return null;
  }

  const updated = await prisma.cart_items.update({
    where: { id: itemId },
    data: {
      quantity: clampQuantity(quantity),
      updated_at: new Date(),
    },
    select: cartItemSelect,
  });

  return updated;
};

export const removeCartItem = async (userId: string, itemId: string) => {
  const existing = await prisma.cart_items.findFirst({
    where: { id: itemId, user_id: userId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Cart item not found");
  }

  await prisma.cart_items.delete({
    where: { id: itemId },
  });
};

export const clearCart = async (userId: string) => {
  await prisma.cart_items.deleteMany({
    where: { user_id: userId },
  });
};
