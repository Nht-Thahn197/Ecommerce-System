export interface ShopAddressInput {
  province?: string;
  district?: string;
  ward?: string;
  detail?: string;
}

export interface ShopPaymentAccountInput {
  bank_name?: string;
  account_number?: string;
  account_holder?: string;
}

export interface ShopDocumentInput {
  doc_type?: string;
  doc_url?: string;
}

export interface RegisterShopInput {
  name: string;
  description?: string;
  address?: ShopAddressInput;
  payment_account?: ShopPaymentAccountInput;
  documents?: ShopDocumentInput[];
}

export interface UpdateShopStatusInput {
  status: "approved" | "rejected";
  rejected_reason?: string;
}

export interface ListShopsQuery {
  page?: string;
  limit?: string;
}
