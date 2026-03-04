export type MockPaymentStatus = "paid" | "failed";

export interface MockPaymentInput {
  order_id: string;
  status: MockPaymentStatus;
}
