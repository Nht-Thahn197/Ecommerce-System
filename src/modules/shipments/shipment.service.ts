import prisma from "../../libs/prisma";
import {
  createOrderDeliveredNotification,
  createOrderInTransitNotification,
} from "../notifications/notification.service";
import { recalculateOrderStatus } from "../orders/order.service";
import { ShipmentStatus, UpdateShipmentInput } from "./shipment.types";

const canAdvanceStatus = (current: ShipmentStatus, next: ShipmentStatus) => {
  if (current === next) return true;
  if (current === "waiting_pickup" && next === "shipping") return true;
  if (current === "shipping" && next === "delivered") return true;
  return false;
};

const validateOrderItemForUser = async (userId: string, itemId: string) => {
  const item = await prisma.order_items.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      status: true,
      order_id: true,
      orders: { select: { user_id: true } },
      shops: { select: { owner_id: true } },
      shipments: { select: { shipping_status: true } },
    },
  });

  if (!item) throw new Error("Order item not found");

  const isCustomer = item.orders?.user_id === userId;
  const isSeller = item.shops?.owner_id === userId;

  return { item, isCustomer, isSeller };
};

export const getShipmentForItem = async (userId: string, itemId: string) => {
  const { item, isCustomer, isSeller } = await validateOrderItemForUser(
    userId,
    itemId
  );

  if (!isCustomer && !isSeller) {
    throw new Error("Unauthorized");
  }

  const shipment = await prisma.shipments.findFirst({
    where: { order_item_id: item.id },
  });

  return shipment;
};

export const updateShipmentForItem = async (
  userId: string,
  itemId: string,
  input: UpdateShipmentInput
) => {
  const { item, isSeller } = await validateOrderItemForUser(userId, itemId);

  if (!isSeller) {
    throw new Error("Seller only");
  }

  const now = new Date();
  const nextStatus = input.shipping_status;

  const existingShipment = await prisma.shipments.findFirst({
    where: { order_item_id: item.id },
  });

  const currentStatus = (existingShipment?.shipping_status ||
    "waiting_pickup") as ShipmentStatus;

  if (nextStatus && !canAdvanceStatus(currentStatus, nextStatus)) {
    throw new Error("Invalid shipment status transition");
  }

  return prisma.$transaction(async (tx) => {
    let shipment;

    if (existingShipment) {
      shipment = await tx.shipments.update({
        where: { id: existingShipment.id },
        data: {
          tracking_code: input.tracking_code ?? existingShipment.tracking_code,
          shipping_status: nextStatus || existingShipment.shipping_status,
          shipped_at:
            nextStatus === "shipping" ? now : existingShipment.shipped_at,
          delivered_at:
            nextStatus === "delivered" ? now : existingShipment.delivered_at,
        },
      });
    } else {
      shipment = await tx.shipments.create({
        data: {
          order_item_id: item.id,
          tracking_code: input.tracking_code,
          shipping_status: nextStatus || "waiting_pickup",
          shipped_at: nextStatus === "shipping" ? now : null,
          delivered_at: nextStatus === "delivered" ? now : null,
        },
      });
    }

    if (nextStatus === "shipping") {
      await tx.order_items.update({
        where: { id: item.id },
        data: { status: "shipping" },
      });
    }

    if (nextStatus === "delivered") {
      await tx.order_items.update({
        where: { id: item.id },
        data: { status: "delivered" },
      });
    }

    if (item.order_id && nextStatus) {
      await recalculateOrderStatus(item.order_id, tx);
    }

    if (nextStatus === "shipping") {
      await createOrderInTransitNotification(item.id, tx);
    }

    if (nextStatus === "delivered") {
      await createOrderDeliveredNotification(item.id, tx);
    }

    return shipment;
  });
};
