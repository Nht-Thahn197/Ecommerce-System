export interface CreateReturnInput {
  order_item_id: string;
  reason?: string;
}

export interface UpdateReturnStatusInput {
  status: "approved" | "rejected";
  rejected_reason?: string;
}

export interface ListReturnsQuery {
  page?: string;
  limit?: string;
}

export interface CreateDisputeInput {
  reason?: string;
}

export interface ResolveDisputeInput {
  action: "approve" | "reject";
  resolution?: string;
}
