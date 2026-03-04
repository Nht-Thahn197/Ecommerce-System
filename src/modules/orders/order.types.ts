export type OrderItemStatus =
  | "pending"
  | "confirmed"
  | "shipping"
  | "delivered"
  | "received"
  | "cancelled"
  | "returned";

export interface UpdateOrderItemStatusInput {
  status: OrderItemStatus;
}

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export interface UpdatePaymentStatusInput {
  payment_status: PaymentStatus;
}

export interface ListOrdersQuery {
  page?: string;
  limit?: string;
}

export interface ListSellerItemsQuery {
  page?: string;
  limit?: string;
}
