export type ShipmentStatus = "waiting_pickup" | "shipping" | "delivered";

export interface UpdateShipmentInput {
  tracking_code?: string;
  shipping_status?: ShipmentStatus;
}
