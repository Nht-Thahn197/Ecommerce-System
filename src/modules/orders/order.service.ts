import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import {
  createOrderConfirmedNotification,
  createOrderDeliveredNotification,
  createOrderHandedToCarrierNotification,
} from "../notifications/notification.service";
import {
  ListOrdersQuery,
  ListSellerItemsQuery,
  OrderItemStatus,
  RequestSellerWithdrawalInput,
  SellerWalletSummaryQuery,
} from "./order.types";

const TERMINAL_STATUSES: OrderItemStatus[] = [
  "received",
  "cancelled",
  "returned",
];

const RETURN_WINDOW_DAYS = 15;
const PAYOUT_DELAY_DAYS = 5;
const MAX_LIMIT = 100;
const DEFAULT_WALLET_TX_LIMIT = 12;
const WITHDRAW_PENDING_TYPE = "withdraw_pending";
const WITHDRAW_APPROVED_TYPE = "withdraw_approved";
const WITHDRAW_REJECTED_TYPE = "withdraw_rejected";
const LEGACY_WITHDRAW_TYPE = "withdraw_request";
const PAYOUT_TYPE = "payout";
const PAYOUT_RESTORE_TYPE = "payout_restore";
const PAYOUT_REVERSAL_TYPE = "payout_reversal";
const PLATFORM_FEE_PERCENT = (() => {
  const raw = Number(process.env.PLATFORM_FEE_PERCENT || "30");
  if (!Number.isFinite(raw) || raw < 0) return 0.3;
  return raw > 1 ? raw / 100 : raw;
})();

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

const addDays = (date: Date, days: number) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const parseMoneyInput = (
  value: string | number | null | undefined,
  fieldLabel: string,
  { allowUndefined = false } = {}
) => {
  if (value === null || value === undefined || value === "") {
    if (allowUndefined) return undefined;
    throw new Error(`${fieldLabel} is required`);
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${fieldLabel} is invalid`);
  }

  return new Prisma.Decimal(amount.toFixed(2));
};

const toMoneyDecimal = (value: Prisma.Decimal | string | number) =>
  new Prisma.Decimal(value).toDecimalPlaces(2);

const getWalletTransactionLimit = (query?: { limit?: string }) =>
  Math.min(
    20,
    Math.max(1, toNumber(query?.limit) || DEFAULT_WALLET_TX_LIMIT)
  );

const getShopPaymentAccountSnapshot = (shop: {
  onboarding_data?: Prisma.JsonValue | null;
  shop_payment_accounts?: Array<{
    bank_name?: string | null;
    account_number?: string | null;
    account_holder?: string | null;
  }>;
}) => {
  const directAccount = shop.shop_payment_accounts?.[0];
  if (directAccount?.account_number || directAccount?.bank_name) {
    return directAccount;
  }

  const onboarding =
    shop.onboarding_data && typeof shop.onboarding_data === "object"
      ? (shop.onboarding_data as Record<string, any>)
      : null;
  const fallback = onboarding?.payment_account;
  if (!fallback || typeof fallback !== "object") return null;

  return {
    bank_name: fallback.bank_name || null,
    account_number: fallback.account_number || null,
    account_holder: fallback.account_holder || null,
  };
};

const getOrCreateWallet = async (
  tx: Prisma.TransactionClient,
  userId: string
) => {
  return (
    (await tx.wallets.findFirst({
      where: { user_id: userId },
      select: { id: true, balance: true },
    })) ||
    (await tx.wallets.create({
      data: { user_id: userId, balance: 0 },
      select: { id: true, balance: true },
    }))
  );
};

const getPendingWithdrawalAmount = async (
  tx: Prisma.TransactionClient,
  walletId: string
) => {
  const aggregate = await tx.wallet_transactions.aggregate({
    where: {
      wallet_id: walletId,
      type: WITHDRAW_PENDING_TYPE,
    },
    _sum: { amount: true },
  });

  return aggregate._sum.amount
    ? new Prisma.Decimal(aggregate._sum.amount).abs()
    : new Prisma.Decimal(0);
};

export const applySellerPayoutForReceivedItem = async (
  tx: Prisma.TransactionClient,
  itemId: string,
  paidAt = new Date()
) => {
  const item = await tx.order_items.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      status: true,
      quantity: true,
      price: true,
      shop_id: true,
      received_at: true,
      payout_available_at: true,
      orders: {
        select: {
          id: true,
          payment_status: true,
        },
      },
      shops: {
        select: {
          owner_id: true,
        },
      },
      shop_payout: {
        select: {
          id: true,
          net_amount: true,
          status: true,
        },
      },
    },
  });

  if (!item || item.status !== "received") return null;
  if (item.orders?.payment_status !== "paid") return null;
  if (!item.shop_id || !item.shops?.owner_id) return null;

  const wallet = await getOrCreateWallet(tx, item.shops.owner_id);
  const availableAt =
    item.payout_available_at || item.received_at || paidAt;

  if (item.shop_payout?.status === "paid") {
    return item.shop_payout;
  }

  if (item.shop_payout?.status === "reversed") {
    const restoreAmount = toMoneyDecimal(item.shop_payout.net_amount || 0);

    await tx.wallets.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: restoreAmount },
      },
    });

    await tx.wallet_transactions.create({
      data: {
        wallet_id: wallet.id,
        amount: restoreAmount,
        type: PAYOUT_RESTORE_TYPE,
        reference_id: item.id,
      },
    });

    return tx.shop_payouts.update({
      where: { order_item_id: item.id },
      data: {
        status: "paid",
        available_at: availableAt,
        paid_at: paidAt,
      },
      select: {
        id: true,
        status: true,
        net_amount: true,
      },
    });
  }

  const gross = toMoneyDecimal(new Prisma.Decimal(item.price).mul(item.quantity));
  const fee = toMoneyDecimal(gross.mul(PLATFORM_FEE_PERCENT));
  const net = toMoneyDecimal(gross.sub(fee));

  await tx.wallets.update({
    where: { id: wallet.id },
    data: {
      balance: { increment: net },
    },
  });

  await tx.wallet_transactions.create({
    data: {
      wallet_id: wallet.id,
      amount: net,
      type: PAYOUT_TYPE,
      reference_id: item.id,
    },
  });

  return tx.shop_payouts.create({
    data: {
      order_item_id: item.id,
      shop_id: item.shop_id,
      gross_amount: gross,
      fee_amount: fee,
      net_amount: net,
      status: "paid",
      available_at: availableAt,
      paid_at: paidAt,
    },
    select: {
      id: true,
      status: true,
      net_amount: true,
    },
  });
};

export const reverseSellerPayoutForOrderItem = async (
  tx: Prisma.TransactionClient,
  itemId: string,
  reversedAt = new Date()
) => {
  const payout = await tx.shop_payouts.findUnique({
    where: { order_item_id: itemId },
    select: {
      id: true,
      order_item_id: true,
      net_amount: true,
      status: true,
      order_items: {
        select: {
          id: true,
          shops: {
            select: {
              owner_id: true,
            },
          },
        },
      },
    },
  });

  if (!payout || payout.status === "reversed") {
    return payout;
  }

  const ownerId = payout.order_items?.shops?.owner_id;
  if (!ownerId) {
    throw new Error("Không tìm thấy chủ shop để hoàn tác payout.");
  }

  const wallet = await getOrCreateWallet(tx, ownerId);
  const reversalAmount = toMoneyDecimal(payout.net_amount || 0);

  await tx.wallets.update({
    where: { id: wallet.id },
    data: {
      balance: { decrement: reversalAmount },
    },
  });

  await tx.wallet_transactions.create({
    data: {
      wallet_id: wallet.id,
      amount: reversalAmount.neg(),
      type: PAYOUT_REVERSAL_TYPE,
      reference_id: itemId,
    },
  });

  return tx.shop_payouts.update({
    where: { order_item_id: itemId },
    data: {
      status: "reversed",
      available_at: reversedAt,
    },
    select: {
      id: true,
      status: true,
      net_amount: true,
    },
  });
};

const orderSelect = {
  id: true,
  user_id: true,
  total_amount: true,
  payment_method: true,
  payment_status: true,
  order_status: true,
  created_at: true,
  order_items: {
    select: {
      id: true,
      status: true,
      quantity: true,
      price: true,
      shop_id: true,
      created_at: true,
      received_at: true,
      return_deadline_at: true,
      product_variants: {
        select: {
          id: true,
          sku: true,
          price: true,
          products: {
            select: {
              id: true,
              name: true,
              status: true,
              shop_id: true,
            },
          },
        },
      },
    },
  },
};

const getOrderItemProductId = (item: any) =>
  String(item?.product_variants?.products?.id || "");

const attachUserReviewsToOrders = async (userId: string, orders: any[]) => {
  if (!Array.isArray(orders) || !orders.length) {
    return orders;
  }

  const productIds = Array.from(
    new Set(
      orders.flatMap((order) =>
        Array.isArray(order?.order_items)
          ? order.order_items
              .map((item: any) => getOrderItemProductId(item))
              .filter(Boolean)
          : []
      )
    )
  );

  if (!productIds.length) {
    return orders;
  }

  const reviews = await prisma.reviews.findMany({
    where: {
      user_id: userId,
      product_id: { in: productIds },
    },
    select: {
      id: true,
      product_id: true,
      rating: true,
      comment: true,
      created_at: true,
    },
  });

  const reviewByProductId = new Map(
    reviews
      .filter((review) => review.product_id)
      .map((review) => [String(review.product_id), review])
  );

  return orders.map((order) => ({
    ...order,
    order_items: Array.isArray(order?.order_items)
      ? order.order_items.map((item: any) => ({
          ...item,
          review: reviewByProductId.get(getOrderItemProductId(item)) || null,
        }))
      : [],
  }));
};

export const listOrdersForUser = async (
  userId: string,
  query: ListOrdersQuery
) => {
  const { page, limit, skip } = getPagination(query);

  const where = { user_id: userId };

  const [total, orders] = await Promise.all([
    prisma.orders.count({ where }),
    prisma.orders.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: orderSelect,
    }),
  ]);

  const ordersWithReviews = await attachUserReviewsToOrders(userId, orders);

  return {
    data: ordersWithReviews,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

export const getOrderForUser = async (userId: string, orderId: string) => {
  const order = await prisma.orders.findFirst({
    where: { id: orderId, user_id: userId },
    select: orderSelect,
  });

  if (!order) throw new Error("Order not found");

  const [orderWithReviews] = await attachUserReviewsToOrders(userId, [order]);
  return orderWithReviews;
};

export const listOrderItemsForSeller = async (
  userId: string,
  query: ListSellerItemsQuery
) => {
  const shops = await prisma.shops.findMany({
    where: { owner_id: userId },
    select: { id: true },
  });

  const shopIds = shops.map((shop) => shop.id);
  if (shopIds.length === 0) {
    return {
      data: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
    };
  }

  const { page, limit, skip } = getPagination(query);

  const where = { shop_id: { in: shopIds } };

  const [total, items] = await Promise.all([
    prisma.order_items.count({ where }),
    prisma.order_items.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shop_id: true,
        status: true,
        quantity: true,
        price: true,
        created_at: true,
        orders: {
          select: {
            id: true,
            user_id: true,
            payment_method: true,
            payment_status: true,
            created_at: true,
          },
        },
        product_variants: {
          select: {
            id: true,
            sku: true,
            price: true,
            products: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
  ]);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

export const getSellerWalletSummary = async (
  userId: string,
  query: SellerWalletSummaryQuery
) => {
  const shops = await prisma.shops.findMany({
    where: { owner_id: userId },
    select: {
      id: true,
      name: true,
      status: true,
      onboarding_data: true,
      shop_payment_accounts: {
        take: 1,
        select: {
          bank_name: true,
          account_number: true,
          account_holder: true,
        },
      },
    },
  });

  const approvedShops = shops.filter((shop) => shop.status === "approved");
  const selectedShop =
    approvedShops.find((shop) => shop.id === query.shop_id) ||
    approvedShops[0] ||
    shops.find((shop) => shop.id === query.shop_id) ||
    shops[0] ||
    null;

  const wallet = await prisma.wallets.findFirst({
    where: { user_id: userId },
    select: {
      id: true,
      balance: true,
      created_at: true,
    },
  });

  const selectedShopBank = selectedShop
    ? getShopPaymentAccountSnapshot(selectedShop)
    : null;

  if (!wallet) {
    return {
      wallet: {
        id: null,
        balance: 0,
        available_balance: 0,
        created_at: null,
      },
      stats: {
        total_credited: 0,
        total_requested: 0,
        pending_withdrawals: 0,
      },
      selected_shop: selectedShop
        ? {
            id: selectedShop.id,
            name: selectedShop.name,
            bank_account: selectedShopBank,
          }
        : null,
      transactions: [],
    };
  }

  const limit = getWalletTransactionLimit(query);

  const [transactions, totalCreditedAgg, totalRequestedAgg, pendingWithdrawalAgg] =
    await Promise.all([
      prisma.wallet_transactions.findMany({
        where: { wallet_id: wallet.id },
        orderBy: { created_at: "desc" },
        take: limit,
        select: {
          id: true,
          amount: true,
          type: true,
          reference_id: true,
          created_at: true,
        },
      }),
      prisma.wallet_transactions.aggregate({
        where: {
          wallet_id: wallet.id,
          type: { in: [PAYOUT_TYPE, PAYOUT_RESTORE_TYPE] },
        },
        _sum: { amount: true },
      }),
      prisma.wallet_transactions.aggregate({
        where: {
          wallet_id: wallet.id,
          type: {
            in: [
              WITHDRAW_PENDING_TYPE,
              WITHDRAW_APPROVED_TYPE,
              LEGACY_WITHDRAW_TYPE,
            ],
          },
        },
        _sum: { amount: true },
      }),
      prisma.wallet_transactions.aggregate({
        where: {
          wallet_id: wallet.id,
          type: WITHDRAW_PENDING_TYPE,
        },
        _sum: { amount: true },
      }),
    ]);

  const payoutItemIds = transactions
    .filter(
      (item) =>
        [PAYOUT_TYPE, PAYOUT_RESTORE_TYPE, PAYOUT_REVERSAL_TYPE].includes(
          item.type || ""
        ) && item.reference_id
    )
    .map((item) => item.reference_id as string);
  const withdrawalShopIds = transactions
    .filter(
      (item) =>
        [
          WITHDRAW_PENDING_TYPE,
          WITHDRAW_APPROVED_TYPE,
          WITHDRAW_REJECTED_TYPE,
          LEGACY_WITHDRAW_TYPE,
        ].includes(item.type || "") && item.reference_id
    )
    .map((item) => item.reference_id as string);

  const [payoutItems, referencedShops] = await Promise.all([
    payoutItemIds.length
      ? prisma.order_items.findMany({
          where: { id: { in: payoutItemIds } },
          select: {
            id: true,
            shop_id: true,
            orders: {
              select: {
                id: true,
                created_at: true,
              },
            },
            product_variants: {
              select: {
                products: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    withdrawalShopIds.length
      ? prisma.shops.findMany({
          where: { id: { in: Array.from(new Set(withdrawalShopIds)) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const payoutItemMap = new Map(payoutItems.map((item) => [item.id, item]));
  const shopMap = new Map(
    [...shops, ...referencedShops].map((shop) => [shop.id, shop])
  );
  const pendingWithdrawals = pendingWithdrawalAgg._sum.amount
    ? new Prisma.Decimal(pendingWithdrawalAgg._sum.amount).abs()
    : new Prisma.Decimal(0);
  const currentBalance = toMoneyDecimal(wallet.balance || 0);
  const availableBalance = toMoneyDecimal(currentBalance.sub(pendingWithdrawals));

  return {
    wallet: {
      id: wallet.id,
      balance: wallet.balance || 0,
      available_balance: availableBalance,
      created_at: wallet.created_at,
    },
    stats: {
      total_credited: totalCreditedAgg._sum.amount || 0,
      total_requested: totalRequestedAgg._sum.amount
        ? new Prisma.Decimal(totalRequestedAgg._sum.amount).abs()
        : 0,
      pending_withdrawals: pendingWithdrawals,
    },
    selected_shop: selectedShop
      ? {
          id: selectedShop.id,
          name: selectedShop.name,
          bank_account: selectedShopBank,
        }
      : null,
    transactions: transactions.map((item) => {
      if (
        [PAYOUT_TYPE, PAYOUT_RESTORE_TYPE, PAYOUT_REVERSAL_TYPE].includes(
          item.type || ""
        ) &&
        item.reference_id
      ) {
        const payoutItem = payoutItemMap.get(item.reference_id);
        const sourceShop = payoutItem?.shop_id
          ? shopMap.get(payoutItem.shop_id)
          : null;
        const isReversal = item.type === PAYOUT_REVERSAL_TYPE;
        const isRestore = item.type === PAYOUT_RESTORE_TYPE;

        return {
          id: item.id,
          amount: item.amount || 0,
          type: item.type || PAYOUT_TYPE,
          direction: isReversal ? "out" : "in",
          created_at: item.created_at,
          reference_id: item.reference_id,
          shop_id: payoutItem?.shop_id || null,
          title: isReversal
            ? "Hoàn tác doanh thu đơn hàng"
            : payoutItem?.product_variants?.products?.name ||
              "Doanh thu đơn hàng hoàn tất",
          subtitle: payoutItem?.orders?.id
            ? `Đơn #${String(payoutItem.orders.id).slice(0, 8)}`
            : sourceShop?.name || "Đã cập nhật vào ví Bambi",
          status_label: isReversal
            ? "Hoàn tác"
            : isRestore
              ? "Khôi phục"
              : "Đã cộng",
          status_tone: isReversal ? "orange" : "green",
        };
      }

      if (
        [
          WITHDRAW_PENDING_TYPE,
          WITHDRAW_APPROVED_TYPE,
          WITHDRAW_REJECTED_TYPE,
          LEGACY_WITHDRAW_TYPE,
        ].includes(item.type || "")
      ) {
        const targetShop = item.reference_id
          ? shopMap.get(item.reference_id)
          : null;
        const isPending = item.type === WITHDRAW_PENDING_TYPE;
        const isRejected = item.type === WITHDRAW_REJECTED_TYPE;

        return {
          id: item.id,
          amount: item.amount || 0,
          type: item.type || WITHDRAW_PENDING_TYPE,
          direction: "out",
          created_at: item.created_at,
          reference_id: item.reference_id,
          shop_id: item.reference_id || null,
          title: "Yêu cầu thanh toán",
          subtitle: targetShop?.name
            ? `Rút về tài khoản ngân hàng của ${targetShop.name}`
            : "Rút về tài khoản ngân hàng",
          status_label: isRejected
            ? "Từ chối"
            : isPending
              ? "Chờ duyệt"
              : "Đã duyệt",
          status_tone: isRejected ? "gray" : isPending ? "orange" : "green",
        };
      }

      return {
        id: item.id,
        amount: item.amount || 0,
        type: item.type || "wallet",
        direction:
          item.amount && new Prisma.Decimal(item.amount).gte(0) ? "in" : "out",
        created_at: item.created_at,
        reference_id: item.reference_id,
        shop_id: null,
        title: "Biến động số dư Bambi",
        subtitle: "Giao dịch ví của seller",
      };
    }),
  };
};

export const requestSellerWithdrawal = async (
  userId: string,
  input: RequestSellerWithdrawalInput
) => {
  const approvedShops = await prisma.shops.findMany({
    where: { owner_id: userId, status: "approved" },
    select: {
      id: true,
      name: true,
      onboarding_data: true,
      shop_payment_accounts: {
        take: 1,
        select: {
          bank_name: true,
          account_number: true,
          account_holder: true,
        },
      },
    },
  });

  if (!approvedShops.length) {
    throw new Error("Seller chưa có shop đã duyệt để nhận thanh toán");
  }

  const selectedShop =
    approvedShops.find((shop) => shop.id === input.shop_id) || approvedShops[0];
  if (!selectedShop) {
    throw new Error("Shop nhận thanh toán không hợp lệ");
  }

  const bankAccount = getShopPaymentAccountSnapshot(selectedShop);
  if (!bankAccount?.bank_name || !bankAccount?.account_number) {
    throw new Error("Shop chưa có tài khoản ngân hàng nhận tiền");
  }

  const wallet = await prisma.wallets.findFirst({
    where: { user_id: userId },
    select: {
      id: true,
      balance: true,
    },
  });

  if (!wallet || !wallet.balance || new Prisma.Decimal(wallet.balance).lte(0)) {
    throw new Error("Ví Bambi chưa có số dư khả dụng để thanh toán");
  }

  const result = await prisma.$transaction(async (tx) => {
    const currentWallet = await tx.wallets.findUnique({
      where: { id: wallet.id },
      select: {
        id: true,
        balance: true,
      },
    });

    if (!currentWallet || !currentWallet.balance) {
      throw new Error("Ví Bambi chưa sẵn sàng để thanh toán");
    }

    const currentBalance = new Prisma.Decimal(currentWallet.balance);
    const pendingAmount = await getPendingWithdrawalAmount(tx, currentWallet.id);
    const availableBalance = currentBalance.sub(pendingAmount);
    const requestedAmount =
      parseMoneyInput(input.amount, "amount", { allowUndefined: true }) ||
      availableBalance;

    if (requestedAmount.lte(0)) {
      throw new Error("Số tiền yêu cầu thanh toán không hợp lệ");
    }

    if (availableBalance.lt(requestedAmount)) {
      throw new Error("Số dư khả dụng của ví Bambi không đủ");
    }

    const transaction = await tx.wallet_transactions.create({
      data: {
        wallet_id: currentWallet.id,
        amount: requestedAmount.neg(),
        type: WITHDRAW_PENDING_TYPE,
        reference_id: selectedShop.id,
      },
      select: {
        id: true,
        amount: true,
        type: true,
        reference_id: true,
        created_at: true,
      },
    });

    return {
      wallet: {
        id: currentWallet.id,
        balance: currentBalance,
        available_balance: toMoneyDecimal(availableBalance.sub(requestedAmount)),
      },
      transaction,
    };
  });

  return {
    message: `Đã gửi yêu cầu thanh toán về ${bankAccount.bank_name}. Admin sẽ duyệt trước khi chuyển tiền.`,
    wallet: result.wallet,
    transaction: result.transaction,
    shop: {
      id: selectedShop.id,
      name: selectedShop.name,
    },
    bank_account: bankAccount,
  };
};

const canCustomerCancel = (status: OrderItemStatus) =>
  status === "pending" || status === "confirmed";

const canSellerCancel = (status: OrderItemStatus) =>
  status === "pending" || status === "confirmed";

const isValidTransition = (
  current: OrderItemStatus,
  next: OrderItemStatus,
  actor: "customer" | "seller"
) => {
  if (current === next) return false;

  if (actor === "seller") {
    if (next === "confirmed") return current === "pending";
    if (next === "shipping") return current === "confirmed";
    if (next === "delivered") return current === "shipping";
    if (next === "cancelled") return canSellerCancel(current);
    return false;
  }

  if (next === "received") return current === "delivered";
  if (next === "cancelled") return canCustomerCancel(current);
  return false;
};

export const recalculateOrderStatus = async (
  orderId: string,
  tx?: Prisma.TransactionClient
) => {
  const db = tx || prisma;
  const items = await db.order_items.findMany({
    where: { order_id: orderId },
    select: { status: true },
  });

  if (items.length === 0) return;

  const statuses = items.map((item) => item.status as OrderItemStatus);
  const allCancelled = statuses.every((status) => status === "cancelled");
  const allTerminal = statuses.every((status) =>
    TERMINAL_STATUSES.includes(status)
  );

  let nextStatus = "pending";
  if (allCancelled) {
    nextStatus = "cancelled";
  } else if (allTerminal) {
    nextStatus = "completed";
  } else if (statuses.some((status) => status !== "pending")) {
    nextStatus = "processing";
  }

  await db.orders.update({
    where: { id: orderId },
    data: { order_status: nextStatus },
  });
};

export const updateOrderItemStatus = async (
  userId: string,
  itemId: string,
  nextStatus: OrderItemStatus
) => {
  const item = await prisma.order_items.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      status: true,
      order_id: true,
      received_at: true,
      return_deadline_at: true,
      product_variant_id: true,
      quantity: true,
      orders: { select: { user_id: true } },
      shops: { select: { owner_id: true } },
    },
  });

  if (!item) throw new Error("Order item not found");

  const isCustomer = item.orders?.user_id === userId;
  const isSeller = item.shops?.owner_id === userId;

  if (!isCustomer && !isSeller) {
    throw new Error("Unauthorized");
  }

  const actor = isSeller ? "seller" : "customer";

  if (!isValidTransition(item.status as OrderItemStatus, nextStatus, actor)) {
    throw new Error("Invalid status transition");
  }

  if (nextStatus === "returned") {
    if (!item.return_deadline_at) {
      throw new Error("Return window is not available");
    }
    if (item.return_deadline_at.getTime() < Date.now()) {
      throw new Error("Return window expired");
    }
  }

  const updateData: {
    status: OrderItemStatus;
    received_at?: Date | null;
    return_deadline_at?: Date | null;
    payout_available_at?: Date | null;
  } = {
    status: nextStatus,
  };

  if (nextStatus === "received") {
    const now = new Date();
    updateData.received_at = now;
    updateData.return_deadline_at = addDays(now, RETURN_WINDOW_DAYS);
    updateData.payout_available_at = addDays(now, PAYOUT_DELAY_DAYS);
  }

  if (nextStatus === "cancelled") {
    updateData.received_at = null;
    updateData.return_deadline_at = null;
    updateData.payout_available_at = null;
  }

  if (nextStatus === "returned") {
    updateData.payout_available_at = null;
  }

  await prisma.$transaction(async (tx) => {
    await tx.order_items.update({
      where: { id: itemId },
      data: updateData,
    });

    if (nextStatus === "cancelled" || nextStatus === "returned") {
      if (item.product_variant_id) {
        await tx.product_variants.update({
          where: { id: item.product_variant_id },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    if (item.order_id) {
      await recalculateOrderStatus(item.order_id, tx);
    }
  });

  if (isSeller) {
    if (nextStatus === "confirmed") {
      await createOrderConfirmedNotification(itemId);
    }

    if (nextStatus === "shipping") {
      await createOrderHandedToCarrierNotification(itemId);
    }

    if (nextStatus === "delivered") {
      await createOrderDeliveredNotification(itemId);
    }
  }

  return { message: "Status updated" };
};

export const updatePaymentStatus = async (
  orderId: string,
  paymentStatus: "pending" | "paid" | "refunded" | "failed"
) => {
  const allowed = ["pending", "paid", "refunded", "failed"];
  if (!allowed.includes(paymentStatus)) {
    throw new Error("Invalid payment status");
  }

  const order = await prisma.orders.findUnique({
    where: { id: orderId },
    select: { id: true, payment_method: true, payment_status: true },
  });

  if (!order) throw new Error("Order not found");

  if (order.payment_method === "cod" && paymentStatus === "paid") {
    return prisma.orders.update({
      where: { id: orderId },
      data: { payment_status: "paid" },
    });
  }

  return prisma.orders.update({
    where: { id: orderId },
    data: { payment_status: paymentStatus },
  });
};
