import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import {
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

const saveShopDetails = async (
  tx: Prisma.TransactionClient,
  shopId: string,
  input: RegisterShopInput,
  documents: ReturnType<typeof buildDocuments>
) => {
  await tx.shop_addresses.deleteMany({ where: { shop_id: shopId } });
  await tx.shop_payment_accounts.deleteMany({ where: { shop_id: shopId } });
  await tx.shop_documents.deleteMany({ where: { shop_id: shopId } });

  if (input.address) {
    await tx.shop_addresses.create({
      data: {
        shop_id: shopId,
        province: input.address.province || null,
        district: input.address.district || null,
        ward: input.address.ward || null,
        detail: input.address.detail || null,
      },
    });
  }

  if (input.payment_account) {
    await tx.shop_payment_accounts.create({
      data: {
        shop_id: shopId,
        bank_name: input.payment_account.bank_name || null,
        account_number: input.payment_account.account_number || null,
        account_holder: input.payment_account.account_holder || null,
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

  const shop = await prisma.$transaction(async (tx) => {
    if (existing?.status === "rejected") {
      const updated = await tx.shops.update({
        where: { id: existing.id },
        data: {
          name: input.name.trim(),
          description: input.description?.trim() || null,
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
        description: input.description?.trim() || null,
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
        status: true,
        created_at: true,
        users: {
          select: { id: true, email: true, full_name: true },
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
