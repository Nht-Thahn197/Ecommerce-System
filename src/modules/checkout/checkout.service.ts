import { Prisma } from "@prisma/client";
import prisma from "../../libs/prisma";
import { CheckoutInput } from "./checkout.types";

const DEFAULT_PAYMENT_METHOD = "cod";

const SHIPPING_OPTIONS = {
  fast: {
    label: "Nhanh",
    fee: 15000,
  },
  express: {
    label: "Hoa toc",
    fee: 35000,
  },
} as const;

type ShippingMethodKey = keyof typeof SHIPPING_OPTIONS;
type VoucherKind = "discount" | "shipping";

const cartItemSelect = {
  id: true,
  quantity: true,
  product_variant_id: true,
  product_variants: {
    select: {
      id: true,
      price: true,
      stock: true,
      products: {
        select: {
          id: true,
          status: true,
          shop_id: true,
          category_id: true,
        },
      },
    },
  },
} satisfies Prisma.cart_itemsSelect;

const voucherSelect = {
  id: true,
  code: true,
  voucher_kind: true,
  discount_type: true,
  discount_value: true,
  min_order_amount: true,
  category_id: true,
  max_discount_amount: true,
  starts_at: true,
  ends_at: true,
  is_active: true,
  categories: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.platform_vouchersSelect;

const shopVoucherSelect = {
  id: true,
  shop_id: true,
  code: true,
  discount_type: true,
  discount_value: true,
  min_order_amount: true,
  product_ids: true,
  max_discount_amount: true,
  starts_at: true,
  ends_at: true,
  quantity: true,
  used_quantity: true,
  is_active: true,
} satisfies Prisma.shop_vouchersSelect;

type CheckoutCartItem = Prisma.cart_itemsGetPayload<{
  select: typeof cartItemSelect;
}>;

type VoucherRow = Prisma.platform_vouchersGetPayload<{
  select: typeof voucherSelect;
}>;

type ShopVoucherRow = Prisma.shop_vouchersGetPayload<{
  select: typeof shopVoucherSelect;
}>;

const toNumber = (value: unknown) => Number(value || 0);

const normalizeVoucherCode = (value?: string | null) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeCartItemIds = (value: CheckoutInput["cart_item_ids"]) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((item) => String(item || "").trim())
            .filter((item): item is string => Boolean(item))
        )
      )
    : [];

const readProductIds = (value: Prisma.JsonValue | null | undefined) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((item) => String(item || "").trim())
            .filter((item): item is string => Boolean(item))
        )
      )
    : [];

const getRequestedVoucherCodes = (input: CheckoutInput) => ({
  discount: normalizeVoucherCode(
    input.platform_discount_voucher_code || input.platform_voucher_code
  ),
  shipping: normalizeVoucherCode(input.platform_shipping_voucher_code),
});

const getRequestedShopVoucherCodes = (input: CheckoutInput, shopIds: string[]) => {
  const source =
    input.shop_voucher_codes && typeof input.shop_voucher_codes === "object"
      ? input.shop_voucher_codes
      : {};

  return shopIds.reduce<Record<string, string>>((result, shopId) => {
    result[shopId] = normalizeVoucherCode(source[shopId]);
    return result;
  }, {});
};

const normalizeShippingMethod = (value: unknown): ShippingMethodKey =>
  String(value || "").trim().toLowerCase() === "express" ? "express" : "fast";

const validateCartItems = (items: CheckoutCartItem[]) => {
  if (!items.length) {
    throw new Error("Gio hang dang trong");
  }

  for (const item of items) {
    if (!item.product_variants?.products) {
      throw new Error("Khong tim thay san pham");
    }

    if (item.product_variants.products.status !== "active") {
      throw new Error("San pham hien khong the ban");
    }

    const stock = item.product_variants.stock ?? 0;
    if (stock < item.quantity) {
      throw new Error("San pham khong du ton kho");
    }
  }
};

const getItemSubtotal = (item: CheckoutCartItem) =>
  toNumber(item.product_variants?.price) * Number(item.quantity || 0);

const getCartSubtotal = (items: CheckoutCartItem[]) =>
  items.reduce((sum, item) => sum + getItemSubtotal(item), 0);

const getItemCount = (items: CheckoutCartItem[]) =>
  items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const getShopIdFromItem = (item: CheckoutCartItem) =>
  String(item.product_variants?.products?.shop_id || "default");

const getProductIdFromItem = (item: CheckoutCartItem) =>
  String(item.product_variants?.products?.id || "");

const getShopIds = (items: CheckoutCartItem[]) =>
  Array.from(new Set(items.map(getShopIdFromItem).filter(Boolean)));

const getCartItemsByShop = (items: CheckoutCartItem[]) => {
  const result = new Map<string, CheckoutCartItem[]>();

  items.forEach((item) => {
    const shopId = getShopIdFromItem(item);
    const currentItems = result.get(shopId) || [];
    currentItems.push(item);
    result.set(shopId, currentItems);
  });

  return result;
};

const getNormalizedShipping = (
  shopIds: string[],
  shippingMethods?: Record<string, string> | null
) => {
  const normalized: Record<string, ShippingMethodKey> = {};
  let shippingTotal = 0;

  shopIds.forEach((shopId) => {
    const method = normalizeShippingMethod(shippingMethods?.[shopId]);
    normalized[shopId] = method;
    shippingTotal += SHIPPING_OPTIONS[method].fee;
  });

  return {
    shipping_methods: normalized,
    shipping_total: shippingTotal,
  };
};

const buildCategoryDescendantMap = async (categoryIds: number[]) => {
  const targetIds = Array.from(new Set(categoryIds.filter(Number.isFinite)));
  if (!targetIds.length) {
    return new Map<number, Set<number>>();
  }

  const rows = await prisma.categories.findMany({
    select: {
      id: true,
      parent_id: true,
    },
  });

  const childrenMap = new Map<number, number[]>();
  rows.forEach((row) => {
    if (!row.parent_id) return;
    const siblings = childrenMap.get(row.parent_id) || [];
    siblings.push(row.id);
    childrenMap.set(row.parent_id, siblings);
  });

  const result = new Map<number, Set<number>>();

  targetIds.forEach((categoryId) => {
    const visited = new Set<number>([categoryId]);
    const queue = [categoryId];

    while (queue.length) {
      const currentId = queue.shift()!;
      const children = childrenMap.get(currentId) || [];

      children.forEach((childId) => {
        if (visited.has(childId)) return;
        visited.add(childId);
        queue.push(childId);
      });
    }

    result.set(categoryId, visited);
  });

  return result;
};

const getApplicableSubtotal = (
  items: CheckoutCartItem[],
  voucher: VoucherRow,
  categoryDescendants: Map<number, Set<number>>
) => {
  if (!voucher.category_id) {
    return getCartSubtotal(items);
  }

  const allowedCategoryIds =
    categoryDescendants.get(voucher.category_id) || new Set<number>([voucher.category_id]);

  return items.reduce((sum, item) => {
    const categoryId = item.product_variants?.products?.category_id;
    if (!categoryId || !allowedCategoryIds.has(categoryId)) {
      return sum;
    }
    return sum + getItemSubtotal(item);
  }, 0);
};

const getApplicableShopSubtotal = (items: CheckoutCartItem[], voucher: ShopVoucherRow) => {
  const allowedProductIds = readProductIds(voucher.product_ids);
  if (!allowedProductIds.length) {
    return getCartSubtotal(items);
  }

  const productIdSet = new Set(allowedProductIds);

  return items.reduce((sum, item) => {
    const productId = getProductIdFromItem(item);
    if (!productId || !productIdSet.has(productId)) {
      return sum;
    }
    return sum + getItemSubtotal(item);
  }, 0);
};

const calculateDiscountAmount = (
  discountBase: number,
  discount: {
    discount_type?: string | null;
    discount_value?: unknown;
    max_discount_amount?: unknown;
  }
) => {
  if (discountBase <= 0) {
    return 0;
  }

  let discountAmount = 0;

  if (discount.discount_type === "percent") {
    discountAmount = (discountBase * toNumber(discount.discount_value)) / 100;

    const maxDiscountAmount = toNumber(discount.max_discount_amount);
    if (maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, maxDiscountAmount);
    }
  } else {
    discountAmount = toNumber(discount.discount_value);
  }

  return Math.max(0, Math.min(discountBase, Math.round(discountAmount)));
};

const calculateVoucherDiscount = (
  voucher: VoucherRow,
  applicableSubtotal: number,
  shippingTotal: number
) => {
  const minOrderAmount = toNumber(voucher.min_order_amount);
  if (!applicableSubtotal || applicableSubtotal < minOrderAmount) {
    return 0;
  }

  const discountBase =
    voucher.voucher_kind === "shipping" ? shippingTotal : applicableSubtotal;

  return calculateDiscountAmount(discountBase, voucher);
};

const calculateShopVoucherDiscount = (
  voucher: ShopVoucherRow,
  applicableSubtotal: number
) => {
  const minOrderAmount = toNumber(voucher.min_order_amount);
  if (!applicableSubtotal || applicableSubtotal < minOrderAmount) {
    return 0;
  }

  return calculateDiscountAmount(applicableSubtotal, voucher);
};

const serializeVoucher = (
  voucher: VoucherRow,
  applicableSubtotal: number,
  estimatedDiscount: number
) => ({
  id: voucher.id,
  code: voucher.code,
  voucher_kind: (voucher.voucher_kind || "discount") as VoucherKind,
  discount_type: voucher.discount_type,
  discount_value: toNumber(voucher.discount_value),
  min_order_amount: toNumber(voucher.min_order_amount),
  category_id: voucher.category_id ?? null,
  category_name: voucher.categories?.name || null,
  max_discount_amount:
    voucher.max_discount_amount === null || voucher.max_discount_amount === undefined
      ? null
      : toNumber(voucher.max_discount_amount),
  starts_at: voucher.starts_at,
  ends_at: voucher.ends_at,
  is_active: Boolean(voucher.is_active),
  applicable_subtotal: applicableSubtotal,
  estimated_discount: estimatedDiscount,
});

const serializeShopVoucher = (
  voucher: ShopVoucherRow,
  applicableSubtotal: number,
  estimatedDiscount: number
) => ({
  id: voucher.id,
  shop_id: voucher.shop_id,
  code: voucher.code,
  discount_type: voucher.discount_type,
  discount_value: toNumber(voucher.discount_value),
  min_order_amount: toNumber(voucher.min_order_amount),
  product_ids: readProductIds(voucher.product_ids),
  max_discount_amount:
    voucher.max_discount_amount === null || voucher.max_discount_amount === undefined
      ? null
      : toNumber(voucher.max_discount_amount),
  starts_at: voucher.starts_at,
  ends_at: voucher.ends_at,
  quantity: voucher.quantity,
  used_quantity: voucher.used_quantity,
  remaining_quantity: Math.max(0, voucher.quantity - voucher.used_quantity),
  is_active: Boolean(voucher.is_active),
  applicable_subtotal: applicableSubtotal,
  estimated_discount: estimatedDiscount,
});

const buildCheckoutSnapshot = async (
  userId: string,
  input: CheckoutInput,
  options: {
    requireSelectedVoucherKinds?: VoucherKind[];
    requireSelectedShopVoucherShops?: string[];
  } = {}
) => {
  const requestedCartItemIds = normalizeCartItemIds(input.cart_item_ids);
  const cartItems = await prisma.cart_items.findMany({
    where: {
      user_id: userId,
      ...(requestedCartItemIds.length
        ? {
            id: {
              in: requestedCartItemIds,
            },
          }
        : {}),
    },
    select: cartItemSelect,
  });

  if (requestedCartItemIds.length) {
    const matchedItemIds = new Set(cartItems.map((item) => String(item.id)));
    const hasMissingItems = requestedCartItemIds.some((itemId) => !matchedItemIds.has(itemId));

    if (hasMissingItems) {
      throw new Error("Mot so san pham da chon khong con trong gio hang.");
    }
  }

  validateCartItems(cartItems);

  const subtotal = getCartSubtotal(cartItems);
  const itemCount = getItemCount(cartItems);
  const shopIds = getShopIds(cartItems);
  const cartItemsByShop = getCartItemsByShop(cartItems);
  const shipping = getNormalizedShipping(shopIds, input.shipping_methods || null);
  const requestedVoucherCodes = getRequestedVoucherCodes(input);
  const requestedShopVoucherCodes = getRequestedShopVoucherCodes(input, shopIds);
  const now = new Date();

  const [activePlatformVouchers, currentShopVouchers] = await Promise.all([
    prisma.platform_vouchers.findMany({
      where: {
        is_active: true,
        starts_at: { lte: now },
        ends_at: { gte: now },
      },
      orderBy: [{ ends_at: "asc" }, { created_at: "desc" }],
      select: voucherSelect,
    }),
    prisma.shop_vouchers.findMany({
      where: {
        shop_id: { in: shopIds },
        is_active: true,
        starts_at: { lte: now },
        ends_at: { gte: now },
      },
      orderBy: [{ ends_at: "asc" }, { created_at: "desc" }],
      select: shopVoucherSelect,
    }),
  ]);

  const categoryDescendants = await buildCategoryDescendantMap(
    activePlatformVouchers
      .map((voucher) => voucher.category_id)
      .filter((value): value is number => Number.isFinite(value as number))
  );

  const serializedPlatformVouchers = activePlatformVouchers
    .map((voucher) => {
      const applicableSubtotal = getApplicableSubtotal(
        cartItems,
        voucher,
        categoryDescendants
      );
      const estimatedDiscount = calculateVoucherDiscount(
        voucher,
        applicableSubtotal,
        shipping.shipping_total
      );

      if (estimatedDiscount <= 0) {
        return null;
      }

      return serializeVoucher(voucher, applicableSubtotal, estimatedDiscount);
    })
    .filter((voucher): voucher is NonNullable<typeof voucher> => Boolean(voucher))
    .sort((left, right) => {
      if (right.estimated_discount !== left.estimated_discount) {
        return right.estimated_discount - left.estimated_discount;
      }
      return new Date(left.ends_at).getTime() - new Date(right.ends_at).getTime();
    });

  const availableShopVouchers = currentShopVouchers.filter(
    (voucher) => voucher.used_quantity < voucher.quantity
  );

  const vouchers = {
    discount: serializedPlatformVouchers.filter((voucher) => voucher.voucher_kind !== "shipping"),
    shipping: serializedPlatformVouchers.filter((voucher) => voucher.voucher_kind === "shipping"),
  };

  const shop_vouchers = shopIds.reduce<Record<string, ReturnType<typeof serializeShopVoucher>[]>>(
    (result, shopId) => {
      result[shopId] = [];
      return result;
    },
    {}
  );

  availableShopVouchers.forEach((voucher) => {
    const shopItems = cartItemsByShop.get(voucher.shop_id) || [];
    if (!shopItems.length) return;

    const applicableSubtotal = getApplicableShopSubtotal(shopItems, voucher);
    const estimatedDiscount = calculateShopVoucherDiscount(voucher, applicableSubtotal);

    if (estimatedDiscount <= 0) {
      return;
    }

    shop_vouchers[voucher.shop_id] = [
      ...(shop_vouchers[voucher.shop_id] || []),
      serializeShopVoucher(voucher, applicableSubtotal, estimatedDiscount),
    ];
  });

  Object.values(shop_vouchers).forEach((shopVoucherList) => {
    shopVoucherList.sort((left, right) => {
      if (right.estimated_discount !== left.estimated_discount) {
        return right.estimated_discount - left.estimated_discount;
      }
      return new Date(left.ends_at).getTime() - new Date(right.ends_at).getTime();
    });
  });

  const selectedVouchers: {
    discount: (typeof vouchers.discount)[number] | null;
    shipping: (typeof vouchers.shipping)[number] | null;
  } = {
    discount: null,
    shipping: null,
  };

  const selectionErrors: Record<VoucherKind, string> = {
    discount: "",
    shipping: "",
  };

  const requiredKinds = new Set(options.requireSelectedVoucherKinds || []);

  (["discount", "shipping"] as VoucherKind[]).forEach((kind) => {
    const requestedCode = requestedVoucherCodes[kind];
    if (!requestedCode) return;

    selectedVouchers[kind] =
      vouchers[kind].find((voucher) => voucher.code === requestedCode) || null;

    if (selectedVouchers[kind]) return;

    const existingVoucher = activePlatformVouchers.find(
      (voucher) => voucher.code === requestedCode
    );

    selectionErrors[kind] = existingVoucher
      ? kind === "shipping"
        ? "Voucher giam phi van chuyen khong du dieu kien ap dung cho gio hang hien tai."
        : "Voucher giam gia khong du dieu kien ap dung cho gio hang hien tai."
      : "Voucher khong ton tai hoac da het hieu luc.";

    if (requiredKinds.has(kind)) {
      throw new Error(selectionErrors[kind]);
    }
  });

  const selected_shop_vouchers = shopIds.reduce<
    Record<string, ReturnType<typeof serializeShopVoucher> | null>
  >((result, shopId) => {
    result[shopId] = null;
    return result;
  }, {});

  const shop_selection_errors = shopIds.reduce<Record<string, string>>((result, shopId) => {
    result[shopId] = "";
    return result;
  }, {});

  const requiredShopIds = new Set(options.requireSelectedShopVoucherShops || []);

  shopIds.forEach((shopId) => {
    const requestedCode = requestedShopVoucherCodes[shopId];
    if (!requestedCode) return;

    selected_shop_vouchers[shopId] =
      shop_vouchers[shopId].find((voucher) => voucher.code === requestedCode) || null;

    if (selected_shop_vouchers[shopId]) return;

    const existingVoucher = currentShopVouchers.find(
      (voucher) => voucher.shop_id === shopId && voucher.code === requestedCode
    );

    shop_selection_errors[shopId] = existingVoucher
      ? "Voucher cua shop da het luot su dung hoac khong du dieu kien ap dung cho san pham trong gio."
      : "Voucher cua shop khong ton tai hoac da het hieu luc.";

    if (requiredShopIds.has(shopId)) {
      throw new Error(shop_selection_errors[shopId]);
    }
  });

  const platformDiscountTotal = selectedVouchers.discount?.estimated_discount || 0;
  const shopDiscountTotal = Object.values(selected_shop_vouchers).reduce(
    (sum, voucher) => sum + (voucher?.estimated_discount || 0),
    0
  );
  const productDiscountTotal = platformDiscountTotal + shopDiscountTotal;
  const shippingDiscountTotal = selectedVouchers.shipping?.estimated_discount || 0;
  const discountTotal = productDiscountTotal + shippingDiscountTotal;
  const totalAmount = Math.max(
    0,
    Math.round(subtotal + shipping.shipping_total - discountTotal)
  );

  return {
    cartItems,
    vouchers,
    shop_vouchers,
    selected_vouchers: selectedVouchers,
    selected_shop_vouchers,
    selected_voucher_codes: {
      discount: selectedVouchers.discount?.code || "",
      shipping: selectedVouchers.shipping?.code || "",
    },
    selected_shop_voucher_codes: shopIds.reduce<Record<string, string>>((result, shopId) => {
      result[shopId] = selected_shop_vouchers[shopId]?.code || "";
      return result;
    }, {}),
    selection_errors: selectionErrors,
    shop_selection_errors,
    pricing: {
      subtotal,
      shipping_total: shipping.shipping_total,
      platform_discount_total: platformDiscountTotal,
      shop_discount_total: shopDiscountTotal,
      product_discount_total: productDiscountTotal,
      shipping_discount_total: shippingDiscountTotal,
      discount_total: discountTotal,
      total_amount: totalAmount,
      item_count: itemCount,
    },
    shipping_methods: shipping.shipping_methods,
  };
};

export const previewCheckout = async (userId: string, input: CheckoutInput) => {
  const snapshot = await buildCheckoutSnapshot(userId, input);

  return {
    vouchers: snapshot.vouchers,
    shop_vouchers: snapshot.shop_vouchers,
    selected_vouchers: snapshot.selected_vouchers,
    selected_shop_vouchers: snapshot.selected_shop_vouchers,
    selected_voucher_codes: snapshot.selected_voucher_codes,
    selected_shop_voucher_codes: snapshot.selected_shop_voucher_codes,
    selection_errors: snapshot.selection_errors,
    shop_selection_errors: snapshot.shop_selection_errors,
    pricing: snapshot.pricing,
    shipping_methods: snapshot.shipping_methods,
  };
};

export const checkoutCart = async (userId: string, input: CheckoutInput) => {
  const paymentMethod = input.payment_method || DEFAULT_PAYMENT_METHOD;
  const requestedShopVoucherShops = Object.entries(input.shop_voucher_codes || {})
    .filter(([, code]) => Boolean(normalizeVoucherCode(code)))
    .map(([shopId]) => shopId);

  const snapshot = await buildCheckoutSnapshot(userId, input, {
    requireSelectedVoucherKinds: (["discount", "shipping"] as VoucherKind[]).filter(
      (kind) => Boolean(getRequestedVoucherCodes(input)[kind])
    ),
    requireSelectedShopVoucherShops: requestedShopVoucherShops,
  });

  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();

    for (const voucher of Object.values(snapshot.selected_shop_vouchers)) {
      if (!voucher) continue;

      const updated = await tx.shop_vouchers.updateMany({
        where: {
          id: voucher.id,
          shop_id: voucher.shop_id,
          is_active: true,
          starts_at: { lte: now },
          ends_at: { gte: now },
          used_quantity: { lt: voucher.quantity },
        },
        data: {
          used_quantity: { increment: 1 },
          updated_at: now,
        },
      });

      if (updated.count !== 1) {
        throw new Error("Voucher cua shop da het luot su dung.");
      }
    }

    for (const item of snapshot.cartItems) {
      if (!item.product_variant_id) {
        throw new Error("Khong tim thay phan loai san pham");
      }

      const updated = await tx.product_variants.updateMany({
        where: {
          id: item.product_variant_id,
          stock: { gte: item.quantity },
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (updated.count !== 1) {
        throw new Error("San pham khong du ton kho");
      }
    }

    const order = await tx.orders.create({
      data: {
        user_id: userId,
        total_amount: snapshot.pricing.total_amount,
        payment_method: paymentMethod,
        payment_status: paymentMethod === "cod" ? "pending" : "paid",
        order_status: "pending",
      },
    });

    await tx.order_items.createMany({
      data: snapshot.cartItems.map((item) => ({
        order_id: order.id,
        shop_id: item.product_variants?.products?.shop_id || null,
        product_variant_id: item.product_variant_id,
        quantity: item.quantity,
        price: item.product_variants?.price || 0,
        status: "pending",
      })),
    });

    await tx.cart_items.deleteMany({
      where: {
        user_id: userId,
        id: {
          in: snapshot.cartItems.map((item) => item.id),
        },
      },
    });

    return order;
  });

  return {
    order: result,
    pricing: snapshot.pricing,
    applied_vouchers: snapshot.selected_vouchers,
    applied_shop_vouchers: snapshot.selected_shop_vouchers,
    shipping_methods: snapshot.shipping_methods,
  };
};
