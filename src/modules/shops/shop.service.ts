import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import {
  ShopAddressInput,
  ShopIdentityInfoInput,
  ShopShippingConfigInput,
  ShopTaxInfoInput,
  ListShopsQuery,
  RegisterShopInput,
  ShopDocumentInput,
  UpdateShopStatusInput,
} from "./shop.types";

const MAX_LIMIT = 100;

const toNumber = (value?: string) => {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const getPagination = (query?: { page?: string; limit?: string }) => {
  const page = Math.max(1, toNumber(query?.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, toNumber(query?.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const buildDocuments = (docs?: ShopDocumentInput[]) => {
  if (!docs || docs.length === 0) return [];
  return docs
    .filter((doc) => doc.doc_url)
    .map((doc) => ({
      doc_type: doc.doc_type || null,
      doc_url: doc.doc_url || null,
      status: "pending",
    }));
};

const sanitizeString = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizeAddress = (address?: ShopAddressInput | null) => {
  if (!address) return null;

  const normalized = {
    contact_name: sanitizeString(address.contact_name),
    contact_phone: sanitizeString(address.contact_phone),
    province: sanitizeString(address.province),
    district: sanitizeString(address.district),
    ward: sanitizeString(address.ward),
    detail: sanitizeString(address.detail),
  };

  const hasAnyValue = Object.values(normalized).some(Boolean);
  return hasAnyValue ? normalized : null;
};

const normalizeShippingConfig = (config?: ShopShippingConfigInput | null) => ({
  express: Boolean(config?.express),
  standard: Boolean(config?.standard),
  economy: Boolean(config?.economy),
  selfPickup: Boolean(config?.selfPickup),
});

const normalizeTaxInfo = (taxInfo?: ShopTaxInfoInput | null) => ({
  business_type: sanitizeString(taxInfo?.business_type),
  business_name: sanitizeString(taxInfo?.business_name),
  invoice_email: sanitizeString(taxInfo?.invoice_email),
  tax_code: sanitizeString(taxInfo?.tax_code),
});

const normalizeIdentityInfo = (identityInfo?: ShopIdentityInfoInput | null) => ({
  identity_type: sanitizeString(identityInfo?.identity_type),
  identity_number: sanitizeString(identityInfo?.identity_number),
  identity_full_name: sanitizeString(identityInfo?.identity_full_name),
  consent: Boolean(identityInfo?.consent),
});

const buildOnboardingData = (input: RegisterShopInput) => {
  const pickupAddress = normalizeAddress(input.pickup_address || input.address);
  const taxAddress = normalizeAddress(input.tax_address);

  return {
    version: 2,
    shipping_config: normalizeShippingConfig(input.shipping_config),
    tax_info: normalizeTaxInfo(input.tax_info),
    identity_info: normalizeIdentityInfo(input.identity_info),
    pickup_address: pickupAddress,
    tax_address: taxAddress,
  };
};

const saveShopDetails = async (
  tx: Prisma.TransactionClient,
  shopId: string,
  input: RegisterShopInput,
  documents: ReturnType<typeof buildDocuments>
) => {
  const pickupAddress = normalizeAddress(input.pickup_address || input.address);
  const taxAddress = normalizeAddress(input.tax_address);

  await tx.shop_addresses.deleteMany({ where: { shop_id: shopId } });
  await tx.shop_payment_accounts.deleteMany({ where: { shop_id: shopId } });
  await tx.shop_documents.deleteMany({ where: { shop_id: shopId } });

  const addressesData = [pickupAddress, taxAddress]
    .map((address, index) =>
      address
        ? {
            shop_id: shopId,
            address_type: index === 0 ? "pickup" : "tax",
            contact_name: address.contact_name,
            contact_phone: address.contact_phone,
            province: address.province,
            district: address.district,
            ward: address.ward,
            detail: address.detail,
          }
        : null
    )
    .filter(Boolean) as Prisma.shop_addressesCreateManyInput[];

  if (addressesData.length) {
    await tx.shop_addresses.createMany({
      data: addressesData,
    });
  }

  if (input.payment_account) {
    await tx.shop_payment_accounts.create({
      data: {
        shop_id: shopId,
        bank_name: sanitizeString(input.payment_account.bank_name),
        account_number: sanitizeString(input.payment_account.account_number),
        account_holder: sanitizeString(input.payment_account.account_holder),
      },
    });
  }

  if (documents.length) {
    await tx.shop_documents.createMany({
      data: documents.map((doc) => ({
        shop_id: shopId,
        doc_type: doc.doc_type,
        doc_url: doc.doc_url,
        status: doc.status,
      })),
    });
  }
};

export const registerShop = async (userId: string, input: RegisterShopInput) => {
  if (!input.name?.trim()) {
    throw new Error("Shop name is required");
  }

  const existing = await prisma.shops.findFirst({
    where: { owner_id: userId },
    select: { id: true, status: true },
  });

  if (existing && existing.status !== "rejected") {
    throw new Error("Shop already exists");
  }

  const documents = buildDocuments(input.documents);
  const onboardingData = buildOnboardingData(input);
  const contactEmail = sanitizeString(input.contact_email);
  const contactPhone =
    sanitizeString(input.contact_phone) ||
    normalizeAddress(input.pickup_address || input.address)?.contact_phone;

  const shop = await prisma.$transaction(async (tx) => {
    if (existing?.status === "rejected") {
      const updated = await tx.shops.update({
        where: { id: existing.id },
        data: {
          name: input.name.trim(),
          description: sanitizeString(input.description),
          contact_email: contactEmail,
          contact_phone: contactPhone,
          onboarding_data: onboardingData,
          status: "pending",
          rejected_reason: null,
          approved_at: null,
          approved_by: null,
        },
      });

      await saveShopDetails(tx, existing.id, input, documents);
      return updated;
    }

    const created = await tx.shops.create({
      data: {
        owner_id: userId,
        name: input.name.trim(),
        description: sanitizeString(input.description),
        contact_email: contactEmail,
        contact_phone: contactPhone,
        onboarding_data: onboardingData,
        status: "pending",
      },
    });

    await saveShopDetails(tx, created.id, input, documents);

    return created;
  });

  return shop;
};

export const getMyShops = async (userId: string, query: ListShopsQuery) => {
  const { page, limit, skip } = getPagination(query);
  const where = { owner_id: userId };

  const [total, shops] = await Promise.all([
    prisma.shops.count({ where }),
    prisma.shops.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        contact_email: true,
        contact_phone: true,
        onboarding_data: true,
        status: true,
        rejected_reason: true,
        approved_at: true,
        created_at: true,
        shop_addresses: true,
        shop_payment_accounts: true,
        shop_documents: true,
      },
    }),
  ]);

  return {
    data: shops,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

export const listApprovedShops = async (query: ListShopsQuery) => {
  const { page, limit, skip } = getPagination(query);
  const where = { status: "approved" as const };

  const [total, shops] = await Promise.all([
    prisma.shops.count({ where }),
    prisma.shops.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        contact_email: true,
        contact_phone: true,
        onboarding_data: true,
        status: true,
        created_at: true,
      },
    }),
  ]);

  return {
    data: shops,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

export const listPendingShops = async (query: ListShopsQuery) => {
  const { page, limit, skip } = getPagination(query);
  const where = { status: "pending" as const };

  const [total, shops] = await Promise.all([
    prisma.shops.count({ where }),
    prisma.shops.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        contact_email: true,
        contact_phone: true,
        onboarding_data: true,
        status: true,
        created_at: true,
        users: {
          select: { id: true, email: true, full_name: true, phone: true },
        },
        shop_documents: true,
        shop_addresses: true,
        shop_payment_accounts: true,
      },
    }),
  ]);

  return {
    data: shops,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

export const getShopDetailById = async (shopId: string) => {
  const shop = await prisma.shops.findUnique({
    where: { id: shopId },
    select: {
      id: true,
      name: true,
      description: true,
      contact_email: true,
      contact_phone: true,
      onboarding_data: true,
      status: true,
      rejected_reason: true,
      approved_at: true,
      created_at: true,
      users: {
        select: {
          id: true,
          email: true,
          full_name: true,
          phone: true,
          avatar_url: true,
          created_at: true,
        },
      },
      approved_by_user: {
        select: {
          id: true,
          email: true,
          full_name: true,
        },
      },
      shop_addresses: {
        orderBy: { created_at: "asc" },
      },
      shop_payment_accounts: {
        orderBy: { created_at: "asc" },
      },
      shop_documents: {
        orderBy: { created_at: "asc" },
      },
      products: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!shop) {
    throw new Error("Shop not found");
  }

  return shop;
};

export const updateShopStatus = async (
  adminId: string,
  shopId: string,
  input: UpdateShopStatusInput
) => {
  const shop = await prisma.shops.findUnique({
    where: { id: shopId },
    select: { id: true, status: true },
  });

  if (!shop) throw new Error("Shop not found");

  if (input.status === "approved") {
    return prisma.shops.update({
      where: { id: shopId },
      data: {
        status: "approved",
        approved_by: adminId,
        approved_at: new Date(),
        rejected_reason: null,
      },
    });
  }

  return prisma.shops.update({
    where: { id: shopId },
    data: {
      status: "rejected",
      approved_by: adminId,
      approved_at: null,
      rejected_reason: input.rejected_reason || "Rejected",
    },
  });
};
