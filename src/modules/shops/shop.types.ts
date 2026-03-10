export interface ShopAddressInput {
  contact_name?: string;
  contact_phone?: string;
  province?: string;
  district?: string;
  ward?: string;
  detail?: string;
}

export interface ShopShippingConfigInput {
  express?: boolean;
  standard?: boolean;
  economy?: boolean;
  selfPickup?: boolean;
}

export interface ShopTaxInfoInput {
  business_type?: string;
  business_name?: string;
  invoice_email?: string;
  tax_code?: string;
}

export interface ShopIdentityInfoInput {
  identity_type?: string;
  identity_number?: string;
  identity_full_name?: string;
  consent?: boolean;
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
  contact_email?: string;
  contact_phone?: string;
  address?: ShopAddressInput;
  pickup_address?: ShopAddressInput;
  tax_address?: ShopAddressInput;
  payment_account?: ShopPaymentAccountInput;
  shipping_config?: ShopShippingConfigInput;
  tax_info?: ShopTaxInfoInput;
  identity_info?: ShopIdentityInfoInput;
  documents?: ShopDocumentInput[];
}

export interface UpdateShopProfileInput {
  name?: string;
  description?: string | null;
}

export interface UpdateShopStatusInput {
  status: "approved" | "rejected";
  rejected_reason?: string;
}

export interface ListShopsQuery {
  page?: string;
  limit?: string;
}
