import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import { ListNotificationsQuery } from "./notification.types";

const MAX_LIMIT = 100;
const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const TABLE_TRUE_CACHE_MS = 5 * 60 * 1000;
const TABLE_FALSE_CACHE_MS = 10 * 1000;
const DEDUPE_WINDOW_MINUTES = 10;

type NotificationDbClient = typeof prisma | Prisma.TransactionClient;

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  image_url: string | null;
  order_id: string | null;
  order_item_id: string | null;
  return_id: string | null;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
};

interface CreateNotificationInput {
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  image_url?: string | null;
  order_id?: string | null;
  order_item_id?: string | null;
  return_id?: string | null;
}

let notificationTableCache:
  | {
      value: boolean;
      checked_at: number;
    }
  | null = null;

const toNumber = (value?: string) => {
  if (!value) return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const parseBoolean = (value?: string) =>
  TRUE_VALUES.has((value || "").trim().toLowerCase());

const uuidSql = (value: string) => Prisma.sql`CAST(${value} AS UUID)`;

const nullableUuidSql = (value?: string | null) =>
  value ? uuidSql(value) : Prisma.sql`NULL`;

const getPagination = (query?: { page?: string; limit?: string }) => {
  const page = Math.max(1, toNumber(query?.page) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, toNumber(query?.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const getNotificationTableAvailability = async (
  db: NotificationDbClient = prisma
) => {
  const now = Date.now();
  if (notificationTableCache) {
    const ttl = notificationTableCache.value
      ? TABLE_TRUE_CACHE_MS
      : TABLE_FALSE_CACHE_MS;
    if (now - notificationTableCache.checked_at < ttl) {
      return notificationTableCache.value;
    }
  }

  try {
    const rows = await db.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'notifications'
      ) AS exists
    `;

    const value = Boolean(rows?.[0]?.exists);
    notificationTableCache = {
      value,
      checked_at: now,
    };
    return value;
  } catch {
    notificationTableCache = {
      value: false,
      checked_at: now,
    };
    return false;
  }
};

const serializeNotification = (row: NotificationRow) => ({
  id: row.id,
  user_id: row.user_id,
  type: row.type,
  title: row.title,
  message: row.message,
  link: row.link || null,
  image_url: row.image_url || null,
  order_id: row.order_id || null,
  order_item_id: row.order_item_id || null,
  return_id: row.return_id || null,
  is_read: Boolean(row.is_read),
  read_at: row.read_at || null,
  created_at: row.created_at,
});

const buildOrderCode = (orderId?: string | null) =>
  orderId ? `#${String(orderId).slice(0, 8).toUpperCase()}` : "";

const resolveMediaGalleryFirst = (value: unknown) =>
  Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).find(Boolean) || ""
    : "";

const getOrderItemContext = async (
  itemId: string,
  db: NotificationDbClient = prisma
) => {
  const item = await db.order_items.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      orders: {
        select: {
          id: true,
          user_id: true,
        },
      },
      product_variants: {
        select: {
          image_url: true,
          products: {
            select: {
              name: true,
              cover_image_url: true,
              media_gallery: true,
            },
          },
        },
      },
      shipments: {
        take: 1,
        orderBy: { created_at: "desc" },
        select: {
          tracking_code: true,
          shipping_status: true,
        },
      },
      returns: {
        take: 1,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
        },
      },
    },
  });

  if (!item?.orders?.user_id) {
    return null;
  }

  const product = item.product_variants?.products;
  const productName =
    product?.name || `Sản phẩm ${String(item.id).slice(0, 8).toUpperCase()}`;
  const imageUrl =
    item.product_variants?.image_url ||
    product?.cover_image_url ||
    resolveMediaGalleryFirst(product?.media_gallery) ||
    null;

  return {
    user_id: String(item.orders.user_id),
    order_id: String(item.orders.id || ""),
    order_code: buildOrderCode(item.orders.id),
    order_item_id: String(item.id),
    product_name: productName,
    image_url: imageUrl,
    tracking_code: item.shipments?.[0]?.tracking_code || "",
    return_id: item.returns?.[0]?.id || null,
  };
};

const createNotification = async (
  input: CreateNotificationInput,
  db: NotificationDbClient = prisma
) => {
  if (!input.user_id || !input.type || !input.title || !input.message) {
    return null;
  }

  const tableAvailable = await getNotificationTableAvailability(db);
  if (!tableAvailable) {
    return null;
  }

  const dedupeCondition = input.order_item_id
    ? Prisma.sql`order_item_id = ${uuidSql(input.order_item_id)}`
    : input.return_id
      ? Prisma.sql`return_id = ${uuidSql(input.return_id)}`
      : input.order_id
        ? Prisma.sql`order_id = ${uuidSql(input.order_id)}`
        : null;

  if (dedupeCondition) {
    const existing = await db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT id
      FROM notifications
      WHERE user_id = ${uuidSql(input.user_id)}
        AND type = ${input.type}
        AND ${dedupeCondition}
        AND created_at >= NOW() - (${DEDUPE_WINDOW_MINUTES} * INTERVAL '1 minute')
      LIMIT 1
    `);

    if (existing.length) {
      return null;
    }
  }

  await db.$executeRaw(Prisma.sql`
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      link,
      image_url,
      order_id,
      order_item_id,
      return_id
    )
    VALUES (
      ${uuidSql(input.user_id)},
      ${input.type},
      ${input.title},
      ${input.message},
      ${input.link || null},
      ${input.image_url || null},
      ${nullableUuidSql(input.order_id)},
      ${nullableUuidSql(input.order_item_id)},
      ${nullableUuidSql(input.return_id)}
    )
  `);

  return true;
};

export const listNotificationsForUser = async (
  userId: string,
  query: ListNotificationsQuery
) => {
  const tableAvailable = await getNotificationTableAvailability();
  const { page, limit, skip } = getPagination(query);

  if (!tableAvailable) {
    return {
      data: [],
      pagination: {
        page,
        limit,
        total: 0,
        total_pages: 0,
      },
      summary: {
        total: 0,
        unread_count: 0,
      },
    };
  }

  const conditions: Prisma.Sql[] = [Prisma.sql`user_id = ${uuidSql(userId)}`];
  if (parseBoolean(query.unread_only)) {
    conditions.push(Prisma.sql`is_read = false`);
  }

  const whereSql = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

  const [items, totalRows, unreadRows] = await Promise.all([
    prisma.$queryRaw<NotificationRow[]>(Prisma.sql`
      SELECT
        id,
        user_id,
        type,
        title,
        message,
        link,
        image_url,
        order_id,
        order_item_id,
        return_id,
        is_read,
        read_at,
        created_at
      FROM notifications
      ${whereSql}
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${skip}
    `),
    prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM notifications
      ${whereSql}
    `),
    prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS count
      FROM notifications
      WHERE user_id = ${uuidSql(userId)}
        AND is_read = false
    `),
  ]);

  const total = Number(totalRows?.[0]?.count || 0);
  const unreadCount = Number(unreadRows?.[0]?.count || 0);

  return {
    data: items.map(serializeNotification),
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
    summary: {
      total,
      unread_count: unreadCount,
    },
  };
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
  const tableAvailable = await getNotificationTableAvailability();
  if (!tableAvailable) {
    return { updated: false };
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE notifications
    SET
      is_read = true,
      read_at = COALESCE(read_at, NOW())
    WHERE id = ${uuidSql(notificationId)}
      AND user_id = ${uuidSql(userId)}
  `);

  return { updated: true };
};

export const markAllNotificationsRead = async (userId: string) => {
  const tableAvailable = await getNotificationTableAvailability();
  if (!tableAvailable) {
    return { updated: false };
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE notifications
    SET
      is_read = true,
      read_at = COALESCE(read_at, NOW())
    WHERE user_id = ${uuidSql(userId)}
      AND is_read = false
  `);

  return { updated: true };
};

export const createOrderConfirmedNotification = async (
  itemId: string,
  db: NotificationDbClient = prisma
) => {
  const context = await getOrderItemContext(itemId, db);
  if (!context) return null;

  return createNotification(
    {
      user_id: context.user_id,
      type: "order_confirmed",
      title: "Đơn hàng của bạn đã được duyệt",
      message: `${context.product_name} trong đơn hàng ${context.order_code} đã được shop xác nhận.`,
      link: "/ui/orders.html",
      image_url: context.image_url,
      order_id: context.order_id,
      order_item_id: context.order_item_id,
    },
    db
  );
};

export const createOrderHandedToCarrierNotification = async (
  itemId: string,
  db: NotificationDbClient = prisma
) => {
  const context = await getOrderItemContext(itemId, db);
  if (!context) return null;

  return createNotification(
    {
      user_id: context.user_id,
      type: "order_handed_to_carrier",
      title: "Đơn hàng của bạn đã được giao cho đơn vị vận chuyển",
      message: `${context.product_name} trong đơn hàng ${context.order_code} đã được bàn giao cho đơn vị vận chuyển.`,
      link: "/ui/orders.html",
      image_url: context.image_url,
      order_id: context.order_id,
      order_item_id: context.order_item_id,
    },
    db
  );
};

export const createOrderInTransitNotification = async (
  itemId: string,
  db: NotificationDbClient = prisma
) => {
  const context = await getOrderItemContext(itemId, db);
  if (!context) return null;

  const trackingSuffix = context.tracking_code
    ? ` Mã vận đơn: ${context.tracking_code}.`
    : "";

  return createNotification(
    {
      user_id: context.user_id,
      type: "order_in_transit",
      title: "Đơn hàng của bạn đang được giao",
      message: `${context.product_name} trong đơn hàng ${context.order_code} đang được giao đến bạn.${trackingSuffix}`,
      link: "/ui/orders.html",
      image_url: context.image_url,
      order_id: context.order_id,
      order_item_id: context.order_item_id,
    },
    db
  );
};

export const createOrderDeliveredNotification = async (
  itemId: string,
  db: NotificationDbClient = prisma
) => {
  const context = await getOrderItemContext(itemId, db);
  if (!context) return null;

  return createNotification(
    {
      user_id: context.user_id,
      type: "order_delivered",
      title: "Đơn hàng của bạn đã được giao",
      message: `${context.product_name} trong đơn hàng ${context.order_code} đã được giao. Vui lòng xác nhận đã nhận được hàng.`,
      link: "/ui/orders.html",
      image_url: context.image_url,
      order_id: context.order_id,
      order_item_id: context.order_item_id,
    },
    db
  );
};

export const createReturnApprovedNotification = async (
  itemId: string,
  returnId?: string | null,
  db: NotificationDbClient = prisma
) => {
  const context = await getOrderItemContext(itemId, db);
  if (!context) return null;

  return createNotification(
    {
      user_id: context.user_id,
      type: "return_approved",
      title: "Yêu cầu trả hàng đã được duyệt",
      message: `Yêu cầu trả hàng cho ${context.product_name} trong đơn hàng ${context.order_code} đã được duyệt.`,
      link: "/ui/orders.html#returned",
      image_url: context.image_url,
      order_id: context.order_id,
      order_item_id: context.order_item_id,
      return_id: returnId || context.return_id,
    },
    db
  );
};
