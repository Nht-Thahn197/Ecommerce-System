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

type CheckoutCartItem = Prisma.cart_itemsGetPayload<{
  select: typeof cartItemSelect;
}>;

type VoucherRow = Prisma.platform_vouchersGetPayload<{
  select: typeof voucherSelect;
}>;

const toNumber = (value: unknown) => Number(value || 0);

const normalizeVoucherCode = (value?: string | null) =>
  String(value || "")
    .trim()
    .toUpperCase();

const getRequestedVoucherCodes = (input: CheckoutInput) => ({
  discount: normalizeVoucherCode(
    input.platform_discount_voucher_code || input.platform_voucher_code
  ),
  shipping: normalizeVoucherCode(input.platform_shipping_voucher_code),
});

const normalizeShippingMethod = (value: unknown): ShippingMethodKey =>
  String(value || "").trim().toLowerCase() === "express" ? "express" : "fast";

const validateCartItems = (items: CheckoutCartItem[]) => {
  if (!items.length) {
    throw new Error("Giỏ hàng đang trống");
  }

  for (const item of items) {
    if (!item.product_variants?.products) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    if (item.product_variants.products.status !== "active") {
      throw new Error("Sản phẩm hiện không thể bán");
    }

    const stock = item.product_variants.stock ?? 0;
    if (stock < item.quantity) {
      throw new Error("Sản phẩm không đủ tồn kho");
    }
  }
};

const getItemSubtotal = (item: CheckoutCartItem) =>
  toNumber(item.product_variants?.price) * Number(item.quantity || 0);

const getCartSubtotal = (items: CheckoutCartItem[]) =>
  items.reduce((sum, item) => sum + getItemSubtotal(item), 0);

const getItemCount = (items: CheckoutCartItem[]) =>
  items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

const getShopIds = (items: CheckoutCartItem[]) =>
  Array.from(
    new Set(
      items
        .map((item) => String(item.product_variants?.products?.shop_id || "default"))
        .filter(Boolean)
    )
  );

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
  if (discountBase <= 0) {
    return 0;
  }

  let discountAmount = 0;

  if (voucher.discount_type === "percent") {
    discountAmount =
      (discountBase * toNumber(voucher.discount_value)) / 100;

    const maxDiscountAmount = toNumber(voucher.max_discount_amount);
    if (maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, maxDiscountAmount);
    }
  } else {
    discountAmount = toNumber(voucher.discount_value);
  }

  return Math.max(0, Math.min(discountBase, Math.round(discountAmount)));
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

const buildCheckoutSnapshot = async (
  userId: string,
  input: CheckoutInput,
  options: {
    requireSelectedVoucherKinds?: VoucherKind[];
  } = {}
) => {
  const cartItems = await prisma.cart_items.findMany({
    where: { user_id: userId },
    select: cartItemSelect,
  });

  validateCartItems(cartItems);

  const subtotal = getCartSubtotal(cartItems);
  const itemCount = getItemCount(cartItems);
  const shopIds = getShopIds(cartItems);
  const shipping = getNormalizedShipping(shopIds, input.shipping_methods || null);
  const requestedVoucherCodes = getRequestedVoucherCodes(input);
  const now = new Date();

  const activeVouchers = await prisma.platform_vouchers.findMany({
    where: {
      is_active: true,
      starts_at: { lte: now },
      ends_at: { gte: now },
    },
    orderBy: [{ ends_at: "asc" }, { created_at: "desc" }],
    select: voucherSelect,
  });

  const categoryDescendants = await buildCategoryDescendantMap(
    activeVouchers
      .map((voucher) => voucher.category_id)
      .filter((value): value is number => Number.isFinite(value as number))
  );

  const serializedVouchers = activeVouchers
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

  const vouchers = {
    discount: serializedVouchers.filter((voucher) => voucher.voucher_kind !== "shipping"),
    shipping: serializedVouchers.filter((voucher) => voucher.voucher_kind === "shipping"),
  };

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

    const existingVoucher = activeVouchers.find(
      (voucher) => voucher.code === requestedCode
    );

    selectionErrors[kind] = existingVoucher
      ? kind === "shipping"
        ? "Voucher giảm phí vận chuyển không đủ điều kiện áp dụng cho giỏ hàng hiện tại."
        : "Voucher giảm giá không đủ điều kiện áp dụng cho giỏ hàng hiện tại."
      : "Voucher không tồn tại hoặc đã hết hiệu lực.";

    if (requiredKinds.has(kind)) {
      throw new Error(selectionErrors[kind]);
    }
  });

  const productDiscountTotal = selectedVouchers.discount?.estimated_discount || 0;
  const shippingDiscountTotal = selectedVouchers.shipping?.estimated_discount || 0;
  const discountTotal = productDiscountTotal + shippingDiscountTotal;
  const totalAmount = Math.max(
    0,
    Math.round(subtotal + shipping.shipping_total - discountTotal)
  );

  return {
    cartItems,
    vouchers,
    selected_vouchers: selectedVouchers,
    selected_voucher_codes: {
      discount: selectedVouchers.discount?.code || "",
      shipping: selectedVouchers.shipping?.code || "",
    },
    selection_errors: selectionErrors,
    pricing: {
      subtotal,
      shipping_total: shipping.shipping_total,
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
    selected_vouchers: snapshot.selected_vouchers,
    selected_voucher_codes: snapshot.selected_voucher_codes,
    selection_errors: snapshot.selection_errors,
    pricing: snapshot.pricing,
    shipping_methods: snapshot.shipping_methods,
  };
};

export const checkoutCart = async (userId: string, input: CheckoutInput) => {
  const paymentMethod = input.payment_method || DEFAULT_PAYMENT_METHOD;
  const snapshot = await buildCheckoutSnapshot(userId, input, {
    requireSelectedVoucherKinds: (["discount", "shipping"] as VoucherKind[]).filter(
      (kind) => Boolean(getRequestedVoucherCodes(input)[kind])
    ),
  });

  const result = await prisma.$transaction(async (tx) => {
    for (const item of snapshot.cartItems) {
      if (!item.product_variant_id) {
        throw new Error("Không tìm thấy phân loại sản phẩm");
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
        throw new Error("Sản phẩm không đủ tồn kho");
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
      where: { user_id: userId },
    });

    return order;
  });

  return {
    order: result,
    pricing: snapshot.pricing,
    applied_vouchers: snapshot.selected_vouchers,
    shipping_methods: snapshot.shipping_methods,
  };
};
