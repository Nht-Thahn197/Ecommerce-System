import prisma from "../../libs/prisma";
import { MockPaymentInput } from "./payment.types";

export const mockPayment = async (userId: string, input: MockPaymentInput) => {
  if (!input.order_id) {
    throw new Error("order_id is required");
  }

  if (!["paid", "failed"].includes(input.status)) {
    throw new Error("Invalid payment status");
  }

  const order = await prisma.orders.findUnique({
    where: { id: input.order_id },
    select: {
      id: true,
      user_id: true,
      payment_method: true,
      payment_status: true,
      order_status: true,
    },
  });

  if (!order || order.user_id !== userId) {
    throw new Error("Order not found");
  }

  if (order.order_status === "cancelled") {
    throw new Error("Order is cancelled");
  }

  if (order.payment_method === "cod") {
    throw new Error("COD cannot use mock payment");
  }

  if (order.payment_status === "paid" && input.status === "paid") {
    throw new Error("Order already paid");
  }

  const updated = await prisma.orders.update({
    where: { id: input.order_id },
    data: { payment_status: input.status },
  });

  return updated;
};
