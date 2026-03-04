import prisma from "../../libs/prisma";
import { CheckoutInput } from "./checkout.types";

const DEFAULT_PAYMENT_METHOD = "cod";

const toNumber = (value: any) => Number(value || 0);

export const checkoutCart = async (userId: string, input: CheckoutInput) => {
  const paymentMethod = input.payment_method || DEFAULT_PAYMENT_METHOD;

  const cartItems = await prisma.cart_items.findMany({
    where: { user_id: userId },
    select: {
      id: true,
      quantity: true,
      product_variant_id: true,
      product_variants: {
        select: {
          price: true,
          stock: true,
          products: {
            select: {
              id: true,
              status: true,
              shop_id: true,
            },
          },
        },
      },
    },
  });

  if (cartItems.length === 0) {
    throw new Error("Cart is empty");
  }

  for (const item of cartItems) {
    if (!item.product_variants?.products) {
      throw new Error("Product not found");
    }
    if (item.product_variants.products.status !== "active") {
      throw new Error("Product is inactive");
    }
    const stock = item.product_variants.stock ?? 0;
    if (stock < item.quantity) {
      throw new Error("Not enough stock");
    }
  }

  const totalAmount = cartItems.reduce((sum, item) => {
    const price = toNumber(item.product_variants?.price);
    return sum + price * item.quantity;
  }, 0);

  const result = await prisma.$transaction(async (tx) => {
    for (const item of cartItems) {
      if (!item.product_variant_id) {
        throw new Error("Product variant not found");
      }
      const updated = await tx.product_variants.updateMany({
        where: {
          id: item.product_variant_id,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (updated.count !== 1) {
        throw new Error("Not enough stock");
      }
    }

    const order = await tx.orders.create({
      data: {
        user_id: userId,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: paymentMethod === "cod" ? "pending" : "paid",
        order_status: "pending",
      },
    });

    await tx.order_items.createMany({
      data: cartItems.map((item) => ({
        order_id: order.id,
        shop_id: item.product_variants.products?.shop_id || null,
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        price: item.product_variants?.price || 0,
        status: "pending",
      })),
    });

    await tx.cart_items.deleteMany({
      where: { user_id: userId },
    });

    return order;
  });

  return { order: result };
};
