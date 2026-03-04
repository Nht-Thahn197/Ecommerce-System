import prisma from "../../libs/prisma";
import { SearchQuery } from "./search.types";

const MAX_LIMIT = 50;

const toNumber = (value?: string) => {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

export const searchAll = async (query: SearchQuery) => {
  const q = query.q?.trim();
  if (!q) {
    throw new Error("q is required");
  }

  const limit = Math.min(MAX_LIMIT, Math.max(1, toNumber(query.limit) || 10));

  const [products, shops] = await Promise.all([
    prisma.products.findMany({
      where: {
        status: "active",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        shop_id: true,
        created_at: true,
      },
    }),
    prisma.shops.findMany({
      where: {
        status: "approved",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
      },
    }),
  ]);

  return { products, shops };
};
