(function () {
  const auth = window.BambiStoreAuth || {};
  const CHECKOUT_SELECTION_QUERY_PARAM = "selected";

  const els = {
    status: document.querySelector("#checkoutStatus"),
    content: document.querySelector("#checkoutContent"),
    empty: document.querySelector("#checkoutEmptyState"),
    addressInfo: document.querySelector("#checkoutAddressInfo"),
    addressEmpty: document.querySelector("#checkoutAddressEmpty"),
    changeAddressBtn: document.querySelector("#changeAddressBtn"),
    shopList: document.querySelector("#checkoutShopList"),
    itemCount: document.querySelector("#checkoutItemCount"),
    subtotal: document.querySelector("#checkoutSubtotal"),
    shipping: document.querySelector("#checkoutShipping"),
    productDiscount: document.querySelector("#checkoutProductDiscount"),
    productDiscountRow: document.querySelector("#checkoutProductDiscountRow"),
    shopDiscount: document.querySelector("#checkoutShopDiscount"),
    shopDiscountRow: document.querySelector("#checkoutShopDiscountRow"),
    shippingDiscount: document.querySelector("#checkoutShippingDiscount"),
    shippingDiscountRow: document.querySelector("#checkoutShippingDiscountRow"),
    total: document.querySelector("#checkoutTotal"),
    note: document.querySelector("#checkoutNote"),
    placeOrderBtn: document.querySelector("#placeOrderBtn"),
    addressModal: document.querySelector("#addressSelectModal"),
    addressModalList: document.querySelector("#addressSelectList"),
    closeAddressModalBtn: document.querySelector("#closeAddressModalBtn"),
    discountVoucherText: document.querySelector("#checkoutDiscountVoucherText"),
    discountVoucherMeta: document.querySelector("#checkoutDiscountVoucherMeta"),
    chooseDiscountVoucherBtn: document.querySelector("#chooseDiscountVoucherBtn"),
    shippingVoucherText: document.querySelector("#checkoutShippingVoucherText"),
    shippingVoucherMeta: document.querySelector("#checkoutShippingVoucherMeta"),
    chooseShippingVoucherBtn: document.querySelector("#chooseShippingVoucherBtn"),
    platformVoucherModal: document.querySelector("#platformVoucherModal"),
    platformVoucherTitle: document.querySelector("#platformVoucherTitle"),
    platformVoucherSubtitle: document.querySelector("#platformVoucherSubtitle"),
    platformVoucherList: document.querySelector("#platformVoucherList"),
    closePlatformVoucherModalBtn: document.querySelector(
      "#closePlatformVoucherModalBtn"
    ),
    shopVoucherModal: document.querySelector("#shopVoucherModal"),
    shopVoucherTitle: document.querySelector("#shopVoucherTitle"),
    shopVoucherSubtitle: document.querySelector("#shopVoucherSubtitle"),
    shopVoucherList: document.querySelector("#shopVoucherList"),
    closeShopVoucherModalBtn: document.querySelector("#closeShopVoucherModalBtn"),
  };

  if (!els.shopList) return;

  const ADDRESS_STORAGE_PREFIX = "bambi_customer_addresses_v2";
  const SHIPPING_OPTIONS = {
    fast: {
      label: "Nhanh",
      fee: 15000,
      note: "Giao trong 2-3 ngày",
    },
    express: {
      label: "Hỏa tốc",
      fee: 35000,
      note: "Ưu tiên giao sớm trong ngày",
    },
  };

  const state = {
    items: [],
    productMap: new Map(),
    requestedCartItemIds: [],
    addresses: [],
    selectedAddressId: "",
    shipping: {},
    submitting: false,
    previewLoading: false,
    previewError: "",
    selectionErrors: {
      discount: "",
      shipping: "",
    },
    selectedVoucherCodes: {
      discount: "",
      shipping: "",
    },
    platformVouchers: {
      discount: [],
      shipping: [],
    },
    selectedPlatformVouchers: {
      discount: null,
      shipping: null,
    },
    shopVouchers: {},
    selectedShopVouchers: {},
    selectedShopVoucherCodes: {},
    shopSelectionErrors: {},
    activeVoucherKind: "discount",
    activeShopVoucherShopId: "",
    pricing: null,
    previewRequestId: 0,
  };

  const formatCurrency = (value) => {
    const amount = Number(value);
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
  };

  const formatDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const showStatus = (message, error = false) => {
    if (!els.status) return;
    els.status.hidden = false;
    els.status.textContent = message;
    els.status.classList.toggle("error", Boolean(error));
  };

  const hideStatus = () => {
    if (!els.status) return;
    els.status.hidden = true;
    els.status.textContent = "";
    els.status.classList.remove("error");
  };

  const parseRequestedCartItemIds = () => {
    const params = new URLSearchParams(window.location.search);
    const rawValue = String(params.get(CHECKOUT_SELECTION_QUERY_PARAM) || "").trim();

    if (!rawValue) return [];

    return Array.from(
      new Set(
        rawValue
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean)
      )
    );
  };

  state.requestedCartItemIds = parseRequestedCartItemIds();

  const ensureAuth = () => {
    if (typeof auth.getToken !== "function" || !auth.getToken()) {
      auth.redirectToLogin?.();
      return false;
    }
    return true;
  };

  const fetchJson = async (path) => {
    const response = await fetch(path);
    const text = await response.text();
    let payload = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch (_error) {
      payload = { message: text };
    }

    if (!response.ok) {
      throw new Error(payload.message || "Không thể tải dữ liệu.");
    }

    return payload;
  };

  const getProductId = (item) => String(item?.product_variants?.products?.id || "");
  const getShopId = (item) => String(item?.product_variants?.products?.shop_id || "default");
  const getItemPrice = (item) => Number(item?.product_variants?.price || 0);
  const getItemProduct = (item) => state.productMap.get(getProductId(item)) || null;

  const getItemTitle = (item) => {
    const product = getItemProduct(item);
    return (
      product?.name ||
      item?.product_variants?.products?.name ||
      `San pham #${getProductId(item) || item?.id || ""}`
    );
  };

  const getItemImage = (item) => {
    const product = getItemProduct(item);
    return (
      item?.product_variants?.image_url ||
      product?.cover_image_url ||
      (Array.isArray(product?.media_gallery) ? product.media_gallery[0] : "") ||
      ""
    );
  };

  const getItemVariantLabel = (item) => {
    const optionValues = Array.isArray(item?.product_variants?.option_values)
      ? item.product_variants.option_values.filter(Boolean)
      : [];

    return optionValues.length ? optionValues.join(" / ") : "Mặc định";
  };

  const getItemSku = (item) => String(item?.product_variants?.sku || "").trim();

  const getGroups = () => {
    const groups = new Map();

    state.items.forEach((item) => {
      const product = getItemProduct(item);
      const shopId = String(product?.shops?.id || getShopId(item));
      const shopName = product?.shops?.name || "Shop Bambi";

      if (!groups.has(shopId)) {
        groups.set(shopId, { id: shopId, name: shopName, items: [] });
      }

      groups.get(shopId).items.push(item);
    });

    return Array.from(groups.values());
  };

  const getGroupByShopId = (shopId) => getGroups().find((group) => group.id === shopId) || null;

  const loadProductDetails = async (items) => {
    const productIds = Array.from(new Set(items.map(getProductId).filter(Boolean)));
    const map = new Map();

    if (!productIds.length) return map;

    const results = await Promise.allSettled(
      productIds.map(async (productId) => {
        const payload = await fetchJson(`/products/${encodeURIComponent(productId)}`);
        return [String(productId), payload?.product || null];
      })
    );

    results.forEach((result) => {
      if (result.status !== "fulfilled") return;
      const [productId, product] = result.value;
      map.set(productId, product);
    });

    return map;
  };

  const getAddressStorageKey = (user) =>
    `${ADDRESS_STORAGE_PREFIX}:${user?.id || user?.email || user?.phone || "anonymous"}`;

  const normalizeAddress = (item) => ({
    id: String(item?.id || ""),
    contact_name: item?.contact_name || "",
    contact_phone: item?.contact_phone || "",
    province: item?.province || "",
    district: item?.district || "",
    ward: item?.ward || "",
    detail: item?.detail || "",
    address_type: item?.address_type === "office" ? "office" : "home",
    is_default: Boolean(item?.is_default),
  });

  const ensureDefaultAddress = (items) => {
    if (!items.length) return [];
    const defaultId = items.find((address) => address.is_default)?.id || items[0].id;

    return items.map((address) => ({
      ...address,
      is_default: address.id === defaultId,
    }));
  };

  const getSelectedAddress = () =>
    state.addresses.find((address) => address.id === state.selectedAddressId) || null;

  const buildAddressText = (address = {}) =>
    [address.detail, address.ward, address.district, address.province]
      .filter(Boolean)
      .join(", ");

  const getAddressTypeLabel = (type) => (type === "office" ? "Văn phòng" : "Nhà riêng");

  const syncModalLock = () => {
    const hasOpenModal = Boolean(
      document.querySelector(".account-modal:not([hidden])")
    );
    document.body.classList.toggle("account-modal-open", hasOpenModal);
  };

  const openModal = (modal) => {
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    syncModalLock();
  };

  const closeModal = (modal) => {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    syncModalLock();
  };

  const getShippingTotal = () => {
    const groups = getGroups();

    return groups.reduce((sum, group) => {
      const method = state.shipping[group.id] || "fast";
      const option = SHIPPING_OPTIONS[method] || SHIPPING_OPTIONS.fast;
      return sum + option.fee;
    }, 0);
  };

  const getFallbackPricing = () => {
    const subtotal = state.items.reduce(
      (sum, item) => sum + getItemPrice(item) * Number(item?.quantity || 0),
      0
    );
    const shippingTotal = state.items.length ? getShippingTotal() : 0;
    const itemCount = state.items.reduce(
      (sum, item) => sum + Number(item?.quantity || 0),
      0
    );

    return {
      subtotal,
      shipping_total: shippingTotal,
      platform_discount_total: 0,
      shop_discount_total: 0,
      product_discount_total: 0,
      shipping_discount_total: 0,
      discount_total: 0,
      total_amount: subtotal + shippingTotal,
      item_count: itemCount,
    };
  };

  const getCurrentPricing = () => state.pricing || getFallbackPricing();

  const buildCheckoutRequestBody = (paymentMethod) => ({
    ...(state.requestedCartItemIds.length
      ? { cart_item_ids: state.requestedCartItemIds }
      : {}),
    ...(paymentMethod ? { payment_method: paymentMethod } : {}),
    shipping_methods: state.shipping,
    platform_discount_voucher_code: state.selectedVoucherCodes.discount || null,
    platform_shipping_voucher_code: state.selectedVoucherCodes.shipping || null,
    shop_voucher_codes: state.selectedShopVoucherCodes,
  });

  const buildVoucherHeadline = (voucher) => {
    const discountText =
      voucher.discount_type === "percent"
        ? `${Number(voucher.discount_value || 0)}%`
        : formatCurrency(voucher.discount_value || 0);

    return voucher.voucher_kind === "shipping"
      ? `Giảm ${discountText} phí vận chuyển cho đơn từ ${formatCurrency(
          voucher.min_order_amount || 0
        )}`
      : `Giảm ${discountText} cho đơn từ ${formatCurrency(voucher.min_order_amount || 0)}`;
  };

  const buildVoucherSummary = (voucher) => {
    const parts = [
      `Áp dụng ${voucher.category_name ? `cho ${voucher.category_name}` : "toàn sàn"}`,
      `Hiệu lực ${formatDateTime(voucher.starts_at)} - ${formatDateTime(voucher.ends_at)}`,
    ];

    if (voucher.discount_type === "percent" && voucher.max_discount_amount) {
      parts.push(`Tối đa ${formatCurrency(voucher.max_discount_amount)}`);
    }

    return parts.join(" | ");
  };

  const getVoucherKindMeta = (kind) =>
    kind === "shipping"
      ? {
          title: "Voucher Giảm phí vận chuyển",
          subtitle: "Các voucher dưới đây sẽ trừ trực tiếp vào phí vận chuyển của đơn hàng.",
          empty: "Chưa có voucher giảm phí vận chuyển phù hợp với giỏ hàng hiện tại.",
          available: "voucher giảm phí vận chuyển",
          selected: "Đã áp dụng voucher giảm phí vận chuyển",
        }
      : {
          title: "Voucher giảm giá",
          subtitle: "ác voucher dưới đây sẽ trừ trực tiếp vào giá trị đơn hàng của bạn.",
          empty: "Chưa có voucher giảm giá phù hợp với giỏ hàng hiện tại.",
          available: "voucher giảm giá",
          selected: "Đã áp dụng voucher giảm giá",
        };

  const getVoucherElements = (kind) =>
    kind === "shipping"
      ? {
          text: els.shippingVoucherText,
          meta: els.shippingVoucherMeta,
          button: els.chooseShippingVoucherBtn,
        }
      : {
          text: els.discountVoucherText,
          meta: els.discountVoucherMeta,
          button: els.chooseDiscountVoucherBtn,
        };

  const getKnownProductName = (productId) => {
    const product = state.productMap.get(String(productId));
    if (product?.name) return product.name;

    const matchedItem = state.items.find((item) => getProductId(item) === String(productId));
    return matchedItem ? getItemTitle(matchedItem) : "";
  };

  const getShopVoucherProductLabel = (voucher) => {
    const productIds = Array.isArray(voucher?.product_ids) ? voucher.product_ids : [];
    if (!productIds.length) {
      return "Áp dụng cho mọi sản phẩm của shop";
    }

    const names = productIds.map(getKnownProductName).filter(Boolean);
    if (names.length && names.length === productIds.length && names.length <= 3) {
      return names.join(", ");
    }

    return `Áp dụng cho ${productIds.length} sản phẩm trong shop`;
  };

  const buildShopVoucherHeadline = (voucher) => {
    const discountText =
      voucher.discount_type === "percent"
        ? `${Number(voucher.discount_value || 0)}%`
        : formatCurrency(voucher.discount_value || 0);

    return `Giảm ${discountText} cho đơn từ ${formatCurrency(voucher.min_order_amount || 0)}`;
  };

  const buildShopVoucherSummary = (voucher) => {
    const parts = [
      `Hiệu lực ${formatDateTime(voucher.starts_at)} - ${formatDateTime(voucher.ends_at)}`,
      getShopVoucherProductLabel(voucher),
    ];

    if (voucher.discount_type === "percent" && voucher.max_discount_amount) {
      parts.push(`Tối đa ${formatCurrency(voucher.max_discount_amount)}`);
    }

    if (Number.isFinite(Number(voucher.remaining_quantity))) {
      parts.push(`Còn ${Number(voucher.remaining_quantity || 0)} lượt`);
    }

    return parts.join(" | ");
  };

  const renderPlatformVoucher = (kind) => {
    const { button, text, meta } = getVoucherElements(kind);
    const vouchers = state.platformVouchers[kind] || [];
    const selectedVoucher = state.selectedPlatformVouchers[kind];
    const selectionError = state.selectionErrors[kind];
    const copy = getVoucherKindMeta(kind);

    if (!button || !text || !meta) return;

    if (state.previewLoading) {
      button.disabled = true;
      text.textContent = "Đang cập nhật voucher và tổng tiền...";
      button.textContent = "Đang tải...";
      meta.hidden = true;
      meta.innerHTML = "";
      return;
    }

    if (state.previewError) {
      button.disabled = state.submitting || !state.items.length;
      text.textContent = state.previewError;
      button.textContent = "Thử lại";
      meta.hidden = true;
      meta.innerHTML = "";
      return;
    }

    button.disabled = state.submitting || !state.items.length || vouchers.length === 0;

    if (selectedVoucher) {
      text.textContent = `${copy.selected} ${selectedVoucher.code}.`;
      button.textContent = "Đổi voucher";
      meta.hidden = false;
      meta.innerHTML = [
        `<span class="checkout-voucher-chip is-code">${escapeHtml(
          selectedVoucher.code
        )}</span>`,
        `<span class="checkout-voucher-chip">Tiết kiệm ${escapeHtml(
          formatCurrency(selectedVoucher.estimated_discount || 0)
        )}</span>`,
      ].join("");
      return;
    }

    text.textContent = selectionError
      ? selectionError
      : vouchers.length
      ? `Có ${vouchers.length} ${copy.available} phù hợp với giỏ hàng của bạn.`
      : copy.empty;
    button.textContent = vouchers.length ? "Chọn voucher" : "Không có voucher";
    meta.hidden = true;
    meta.innerHTML = "";
  };

  const renderPlatformVoucherList = () => {
    if (!els.platformVoucherList) return;

    const kind = state.activeVoucherKind;
    const vouchers = state.platformVouchers[kind] || [];
    const selectedCode = state.selectedVoucherCodes[kind] || "";
    const copy = getVoucherKindMeta(kind);

    if (els.platformVoucherTitle) {
      els.platformVoucherTitle.textContent = copy.title;
    }

    if (els.platformVoucherSubtitle) {
      els.platformVoucherSubtitle.textContent = copy.subtitle;
    }

    const clearCard = `
      <button
        class="checkout-voucher-card ${selectedCode ? "" : "is-active"}"
        type="button"
        data-platform-voucher-code=""
      >
        <div class="checkout-voucher-card-main">
          <strong>Không dùng voucher</strong>
          <span>Giữ nguyên tổng thanh toán hiện tại.</span>
        </div>
      </button>
    `;

    if (!vouchers.length) {
      els.platformVoucherList.innerHTML = `
        ${clearCard}
        <div class="address-empty-card">
          <strong>Chưa có voucher phù hợp</strong>
          <p>${escapeHtml(copy.empty)}</p>
        </div>
      `;
      return;
    }

    els.platformVoucherList.innerHTML = [
      clearCard,
      ...vouchers.map((voucher) => {
        const isActive = selectedCode === voucher.code;
        return `
          <button
            class="checkout-voucher-card ${isActive ? "is-active" : ""}"
            type="button"
            data-platform-voucher-code="${escapeHtml(voucher.code)}"
          >
            <div class="checkout-voucher-card-head">
              <span class="checkout-voucher-card-code">${escapeHtml(voucher.code)}</span>
              <span class="checkout-voucher-card-save">Tiết kiệm ${escapeHtml(
                formatCurrency(voucher.estimated_discount || 0)
              )}</span>
            </div>
            <div class="checkout-voucher-card-main">
              <strong>${escapeHtml(buildVoucherHeadline(voucher))}</strong>
              <span>${escapeHtml(buildVoucherSummary(voucher))}</span>
            </div>
          </button>
        `;
      }),
    ].join("");
  };

  const renderShopVoucherList = () => {
    if (!els.shopVoucherList || !els.shopVoucherTitle || !els.shopVoucherSubtitle) return;

    const shopId = state.activeShopVoucherShopId;
    const group = shopId ? getGroupByShopId(shopId) : null;
    const shopName = group?.name || "shop này";
    const vouchers = (shopId && state.shopVouchers[shopId]) || [];
    const selectedCode = (shopId && state.selectedShopVoucherCodes[shopId]) || "";

    els.shopVoucherTitle.textContent = `Chọn voucher của ${shopName}`;
    els.shopVoucherSubtitle.textContent =
      "Các voucher dưới đây đã được lọc theo sản phẩm của shop trong giỏ hàng hiện tại.";

    if (!shopId || !group) {
      els.shopVoucherList.innerHTML = `
        <div class="address-empty-card">
          <strong>Khong tim thay shop</strong>
          <p>Hãy tải lại giỏ hàng và thử lại.</p>
        </div>
      `;
      return;
    }

    const clearCard = `
      <button
        class="checkout-voucher-card ${selectedCode ? "" : "is-active"}"
        type="button"
        data-shop-voucher-code=""
      >
        <div class="checkout-voucher-card-main">
          <strong>Không dùng voucher</strong>
          <span>Giữ nguyên tổng tiền của shop này.</span>
        </div>
      </button>
    `;

    if (!vouchers.length) {
      const emptyMessage =
        state.shopSelectionErrors[shopId] ||
        "Shop này hiện chưa có voucher phù hợp với các sản phẩm trong giỏ.";

      els.shopVoucherList.innerHTML = `
        ${clearCard}
        <div class="address-empty-card">
          <strong>Chưa có voucher phù hợp</strong>
          <p>${escapeHtml(emptyMessage)}</p>
        </div>
      `;
      return;
    }

    els.shopVoucherList.innerHTML = [
      clearCard,
      ...vouchers.map((voucher) => {
        const isActive = selectedCode === voucher.code;
        return `
          <button
            class="checkout-voucher-card ${isActive ? "is-active" : ""}"
            type="button"
            data-shop-voucher-code="${escapeHtml(voucher.code)}"
          >
            <div class="checkout-voucher-card-head">
              <span class="checkout-voucher-card-code">${escapeHtml(voucher.code)}</span>
              <span class="checkout-voucher-card-save">Tiết kiệm ${escapeHtml(
                formatCurrency(voucher.estimated_discount || 0)
              )}</span>
            </div>
            <div class="checkout-voucher-card-main">
              <strong>${escapeHtml(buildShopVoucherHeadline(voucher))}</strong>
              <span>${escapeHtml(buildShopVoucherSummary(voucher))}</span>
            </div>
          </button>
        `;
      }),
    ].join("");
  };

  const renderSummary = () => {
    const pricing = getCurrentPricing();
    const platformDiscount = Number(
      pricing.platform_discount_total || pricing.product_discount_total || 0
    );
    const shopDiscount = Number(pricing.shop_discount_total || 0);
    const shippingDiscount = Number(pricing.shipping_discount_total || 0);

    if (els.subtotal) {
      els.subtotal.textContent = formatCurrency(pricing.subtotal);
    }

    if (els.shipping) {
      els.shipping.textContent = formatCurrency(pricing.shipping_total);
    }

    if (els.productDiscount && els.productDiscountRow) {
      els.productDiscountRow.hidden = platformDiscount <= 0;
      els.productDiscount.textContent = `-${formatCurrency(platformDiscount)}`;
    }

    if (els.shopDiscount && els.shopDiscountRow) {
      els.shopDiscountRow.hidden = shopDiscount <= 0;
      els.shopDiscount.textContent = `-${formatCurrency(shopDiscount)}`;
    }

    if (els.shippingDiscount && els.shippingDiscountRow) {
      els.shippingDiscountRow.hidden = shippingDiscount <= 0;
      els.shippingDiscount.textContent = `-${formatCurrency(shippingDiscount)}`;
    }

    if (els.total) {
      els.total.textContent = formatCurrency(pricing.total_amount);
    }

    if (els.itemCount) {
      const itemCount = Number(pricing.item_count || 0);
      els.itemCount.textContent = itemCount ? `${itemCount} sản phẩm` : "";
    }

    const hasAddress = Boolean(getSelectedAddress());
    const canOrder =
      state.items.length > 0 &&
      hasAddress &&
      !state.submitting &&
      !state.previewLoading &&
      !state.previewError;

    if (els.placeOrderBtn) {
      els.placeOrderBtn.disabled = !canOrder;
      els.placeOrderBtn.textContent = state.submitting ? "Đang đặt hàng..." : "Đặt hàng";
    }

    if (els.note) {
      if (state.previewError && state.items.length > 0) {
        els.note.textContent = state.previewError;
        els.note.hidden = false;
      } else if (!hasAddress && state.items.length > 0) {
        els.note.textContent = "Vui lòng thêm địa chỉ nhận hàng trước khi đặt hàng.";
        els.note.hidden = false;
      } else {
        els.note.textContent = "";
        els.note.hidden = true;
      }
    }
  };

  const renderAddress = () => {
    const selected = getSelectedAddress();

    if (!els.addressInfo || !els.addressEmpty) return;

    if (!selected) {
      els.addressInfo.hidden = true;
      els.addressInfo.innerHTML = "";
      els.addressEmpty.hidden = false;
      if (els.changeAddressBtn) {
        els.changeAddressBtn.disabled = true;
      }
      renderSummary();
      return;
    }

    const tags = [];
    if (selected.is_default) {
      tags.push('<span class="address-tag is-default">Mặc định</span>');
    }
    tags.push(
      `<span class="address-tag">${escapeHtml(getAddressTypeLabel(selected.address_type))}</span>`
    );

    els.addressInfo.innerHTML = `
      <div class="checkout-address-contact">
        <strong>${escapeHtml(selected.contact_name || "Chưa có người nhận")}</strong>
        ${
          selected.contact_phone
            ? `<span class="address-card-divider">|</span><span>${escapeHtml(
                selected.contact_phone
              )}</span>`
            : ""
        }
      </div>
      <div class="checkout-address-text">${escapeHtml(
        buildAddressText(selected) || "Chưa có địa chỉ cụ thể"
      )}</div>
      <div class="checkout-address-tags">${tags.join("")}</div>
    `;
    els.addressInfo.hidden = false;
    els.addressEmpty.hidden = true;
    if (els.changeAddressBtn) {
      els.changeAddressBtn.disabled = false;
    }
    renderSummary();
  };

  const renderAddressModalList = () => {
    if (!els.addressModalList) return;

    if (!state.addresses.length) {
      els.addressModalList.innerHTML = `
        <div class="address-empty-card">
          <strong>Chưa có địa chỉ nào</strong>
          <p>Hãy thêm địa chỉ nhận hàng trong trang tài khoản.</p>
        </div>
      `;
      return;
    }

    els.addressModalList.innerHTML = state.addresses
      .map((address) => {
        const isSelected = address.id === state.selectedAddressId;
        const tags = [];

        if (address.is_default) {
          tags.push('<span class="address-tag is-default">Mặc định</span>');
        }

        tags.push(
          `<span class="address-tag">${escapeHtml(getAddressTypeLabel(address.address_type))}</span>`
        );

        return `
          <div class="address-card">
            <div class="address-card-main">
              <div class="address-card-head">
                <div class="address-card-contact">
                  <strong>${escapeHtml(address.contact_name || "Chưa có người nhận")}</strong>
                  ${
                    address.contact_phone
                      ? `<span class="address-card-divider">|</span><span>${escapeHtml(
                          address.contact_phone
                        )}</span>`
                      : ""
                  }
                </div>
              </div>
              <p class="address-card-text">${escapeHtml(
                buildAddressText(address) || "Chưa có địa chỉ cụ thể"
              )}</p>
              <div class="address-card-tags">${tags.join("")}</div>
            </div>
            <div class="address-card-actions">
              <button
                class="address-secondary-btn"
                type="button"
                data-select-address="${escapeHtml(address.id)}"
                ${isSelected ? "disabled" : ""}
              >
                ${isSelected ? "Đang chọn" : "Chọn"}
              </button>
            </div>
          </div>
        `;
      })
      .join("");
  };

  const renderShopList = () => {
    const groups = getGroups();

    els.shopList.innerHTML = groups
      .map((group) => {
        const shopId = group.id;
        const itemCount = group.items.reduce(
          (sum, item) => sum + Number(item?.quantity || 0),
          0
        );
        const vouchers = state.shopVouchers[shopId] || [];
        const selectedVoucher = state.selectedShopVouchers[shopId] || null;
        const selectionError = state.shopSelectionErrors[shopId] || "";

        if (!state.shipping[shopId]) {
          state.shipping[shopId] = "fast";
        }

        const shippingOptions = Object.entries(SHIPPING_OPTIONS)
          .map(([key, option]) => {
            const checked = state.shipping[shopId] === key;
            return `
              <label class="checkout-ship-option ${checked ? "is-active" : ""}">
                <input
                  type="radio"
                  name="shipping_${escapeHtml(shopId)}"
                  value="${escapeHtml(key)}"
                  data-shipping-option
                  data-shop-id="${escapeHtml(shopId)}"
                  ${checked ? "checked" : ""}
                />
                <div class="checkout-ship-info">
                  <strong>${escapeHtml(option.label)}</strong>
                  <span>${escapeHtml(option.note)}</span>
                </div>
                <span class="checkout-ship-fee">${escapeHtml(formatCurrency(option.fee))}</span>
              </label>
            `;
          })
          .join("");

        let voucherText = "";
        let voucherButtonText = "Chọn voucher";
        let voucherButtonDisabled = false;
        let voucherMeta = "";

        if (state.previewLoading) {
          voucherText = "Đang cập nhật voucher của shop...";
          voucherButtonText = "Đang tải...";
          voucherButtonDisabled = true;
        } else if (state.previewError) {
          voucherText = state.previewError;
          voucherButtonText = "Thử lại";
          voucherButtonDisabled = state.submitting || !state.items.length;
        } else if (selectedVoucher) {
          voucherText = `Đã áp dụng voucher ${selectedVoucher.code} cho shop này.`;
          voucherButtonText = "Đổi voucher";
          voucherButtonDisabled = state.submitting || !state.items.length;
          voucherMeta = `
            <div class="checkout-voucher-meta">
              <span class="checkout-voucher-chip is-code">${escapeHtml(
                selectedVoucher.code
              )}</span>
              <span class="checkout-voucher-chip">Tiết kiệm ${escapeHtml(
                formatCurrency(selectedVoucher.estimated_discount || 0)
              )}</span>
            </div>
          `;
        } else if (selectionError) {
          voucherText = selectionError;
          voucherButtonText = vouchers.length ? "Chọn voucher" : "Không có voucher";
          voucherButtonDisabled =
            state.submitting || !state.items.length || vouchers.length === 0;
        } else if (vouchers.length) {
          voucherText = `Có ${vouchers.length} voucher phù hợp cho shop này.`;
          voucherButtonText = "Chọn voucher";
          voucherButtonDisabled = state.submitting || !state.items.length;
        } else {
          voucherText = "Shop này hiện chưa có voucher phù hợp với giỏ hàng.";
          voucherButtonText = "Không có voucher";
          voucherButtonDisabled = true;
        }

        return `
          <section class="cart-shop-card checkout-shop-card" data-shop-id="${escapeHtml(shopId)}">
            <div class="cart-shop-head">
              <div class="cart-shop-name">
                <span class="cart-shop-badge">Shop</span>
                <span>${escapeHtml(group.name)}</span>
              </div>
              <div class="cart-shop-meta">${itemCount} món trong shop này</div>
            </div>
            <div class="checkout-item-list">
              ${group.items
                .map((item) => {
                  const title = getItemTitle(item);
                  const imageUrl = getItemImage(item);
                  const unitPrice = getItemPrice(item);
                  const quantity = Number(item?.quantity || 1);
                  const lineTotal = unitPrice * quantity;
                  const sku = getItemSku(item);
                  const variantLabel = getItemVariantLabel(item);

                  return `
                    <article class="checkout-item-row">
                      <div class="checkout-item-main">
                        <div class="cart-item-thumb">
                          ${
                            imageUrl
                              ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(
                                  title
                                )}" loading="lazy" />`
                              : `<span>${escapeHtml(title.slice(0, 2).toUpperCase())}</span>`
                          }
                        </div>
                        <div class="checkout-item-info">
                          <h3 class="cart-item-title">${escapeHtml(title)}</h3>
                          <div class="cart-item-meta">
                            <span class="cart-meta-chip">Phân loại: ${escapeHtml(
                              variantLabel
                            )}</span>
                            ${
                              sku
                                ? `<span class="cart-meta-chip">SKU: ${escapeHtml(sku)}</span>`
                                : ""
                            }
                          </div>
                        </div>
                      </div>
                      <div class="checkout-item-price">
                        <span class="checkout-col-label">Đơn giá</span>
                        <span class="cart-unit-price">${escapeHtml(
                          formatCurrency(unitPrice)
                        )}</span>
                      </div>
                      <div class="checkout-item-qty">
                        <span class="checkout-col-label">Số lượng</span>
                        <span class="checkout-qty">x${escapeHtml(quantity)}</span>
                      </div>
                      <div class="checkout-item-total">
                        <span class="checkout-col-label">Thành tiền</span>
                        <strong class="cart-line-total">${escapeHtml(
                          formatCurrency(lineTotal)
                        )}</strong>
                      </div>
                    </article>
                  `;
                })
                .join("")}
            </div>
            <div class="checkout-shop-footer">
              <div class="checkout-shop-voucher">
                <div>
                  <h4>Voucher của shop</h4>
                  <p>${escapeHtml(voucherText)}</p>
                  ${voucherMeta}
                </div>
                <button
                  class="ghost-btn"
                  type="button"
                  data-action="choose-shop-voucher"
                  data-shop-id="${escapeHtml(shopId)}"
                  ${voucherButtonDisabled ? "disabled" : ""}
                >
                  ${escapeHtml(voucherButtonText)}
                </button>
              </div>
              <div class="checkout-shop-shipping">
                <div>
                  <h4>Phương thức vận chuyển</h4>
                  <p>Tùy theo shop cài đặt.</p>
                </div>
                <div class="checkout-shipping-options">
                  ${shippingOptions}
                </div>
              </div>
            </div>
          </section>
        `;
      })
      .join("");
  };

  const updatePaymentStyles = () => {
    document.querySelectorAll(".payment-option").forEach((label) => {
      const input = label.querySelector('input[name="paymentMethod"]');
      label.classList.toggle("is-active", Boolean(input?.checked));
    });
  };

  const loadAddresses = async () => {
    if (!ensureAuth()) return;

    try {
      const payload = await auth.apiFetch("/auth/me", {}, { redirectOn401: true });
      const user = payload?.user || {};
      const key = getAddressStorageKey(user);
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      state.addresses = ensureDefaultAddress(
        Array.isArray(parsed) ? parsed.map(normalizeAddress).filter((item) => item.id) : []
      );
      state.selectedAddressId =
        state.addresses.find((address) => address.is_default)?.id || state.addresses[0]?.id || "";
      renderAddress();
    } catch (_error) {
      state.addresses = [];
      state.selectedAddressId = "";
      renderAddress();
    }
  };

  const refreshCheckoutPreview = async ({ silent = false } = {}) => {
    if (!ensureAuth() || !state.items.length) return;

    const requestId = ++state.previewRequestId;
    state.previewLoading = true;
    state.previewError = "";
    state.selectionErrors = { discount: "", shipping: "" };
    state.shopSelectionErrors = {};
    renderShopList();
    renderPlatformVoucher("discount");
    renderPlatformVoucher("shipping");
    renderPlatformVoucherList();
    renderShopVoucherList();
    renderSummary();

    try {
      const payload = await auth.apiFetch(
        "/checkout/preview",
        {
          method: "POST",
          body: buildCheckoutRequestBody(),
        },
        { redirectOn401: true }
      );

      if (requestId !== state.previewRequestId) return;

      state.platformVouchers = {
        discount: Array.isArray(payload?.vouchers?.discount)
          ? payload.vouchers.discount
          : [],
        shipping: Array.isArray(payload?.vouchers?.shipping)
          ? payload.vouchers.shipping
          : [],
      };
      state.shopVouchers =
        payload?.shop_vouchers && typeof payload.shop_vouchers === "object"
          ? payload.shop_vouchers
          : {};
      state.selectedPlatformVouchers = {
        discount: payload?.selected_vouchers?.discount || null,
        shipping: payload?.selected_vouchers?.shipping || null,
      };
      state.selectedShopVouchers =
        payload?.selected_shop_vouchers && typeof payload.selected_shop_vouchers === "object"
          ? payload.selected_shop_vouchers
          : {};
      state.selectedVoucherCodes = {
        discount: payload?.selected_voucher_codes?.discount || "",
        shipping: payload?.selected_voucher_codes?.shipping || "",
      };
      state.selectedShopVoucherCodes =
        payload?.selected_shop_voucher_codes &&
        typeof payload.selected_shop_voucher_codes === "object"
          ? payload.selected_shop_voucher_codes
          : {};
      state.selectionErrors = {
        discount: payload?.selection_errors?.discount || "",
        shipping: payload?.selection_errors?.shipping || "",
      };
      state.shopSelectionErrors =
        payload?.shop_selection_errors && typeof payload.shop_selection_errors === "object"
          ? payload.shop_selection_errors
          : {};
      state.pricing = payload?.pricing || null;
      state.shipping = payload?.shipping_methods || state.shipping;
      state.previewError = "";

      if (
        state.activeShopVoucherShopId &&
        !getGroupByShopId(state.activeShopVoucherShopId)
      ) {
        state.activeShopVoucherShopId = "";
        closeModal(els.shopVoucherModal);
      }

      renderShopList();
      renderPlatformVoucher("discount");
      renderPlatformVoucher("shipping");
      renderPlatformVoucherList();
      renderShopVoucherList();
      renderSummary();
    } catch (error) {
      if (requestId !== state.previewRequestId) return;

      state.platformVouchers = { discount: [], shipping: [] };
      state.shopVouchers = {};
      state.selectedPlatformVouchers = { discount: null, shipping: null };
      state.selectedShopVouchers = {};
      state.selectedVoucherCodes = { discount: "", shipping: "" };
      state.selectedShopVoucherCodes = {};
      state.selectionErrors = { discount: "", shipping: "" };
      state.shopSelectionErrors = {};
      state.pricing = null;
      state.previewError =
        error instanceof Error ? error.message : "Không thể tính được tổng đơn hàng.";

      renderShopList();
      renderPlatformVoucher("discount");
      renderPlatformVoucher("shipping");
      renderPlatformVoucherList();
      renderShopVoucherList();
      renderSummary();

      if (!silent) {
        showStatus(state.previewError, true);
      }
    } finally {
      if (requestId !== state.previewRequestId) return;
      state.previewLoading = false;
      renderShopList();
      renderPlatformVoucher("discount");
      renderPlatformVoucher("shipping");
      renderShopVoucherList();
      renderSummary();
    }
  };

  const loadCart = async () => {
    if (!ensureAuth()) return;

    try {
      showStatus("Đang tải giỏ hàng...");
      const payload = await auth.apiFetch("/cart", {}, { redirectOn401: true });
      const allItems = Array.isArray(payload?.items) ? payload.items : [];
      const requestedItemIdSet = new Set(state.requestedCartItemIds);
      const items = requestedItemIdSet.size
        ? allItems.filter((item) => requestedItemIdSet.has(String(item?.id || "")))
        : allItems;

      if (!items.length) {
        els.content.hidden = true;
        els.empty.hidden = false;
        if (requestedItemIdSet.size) {
          showStatus("KhÃ´ng tÃ¬m tháº¥y sáº£n pháº©m Ä‘Ã£ chá»n trong giá» hÃ ng.", true);
        } else {
          hideStatus();
        }
        state.items = [];
        state.productMap = new Map();
        state.platformVouchers = { discount: [], shipping: [] };
        state.shopVouchers = {};
        state.selectedPlatformVouchers = { discount: null, shipping: null };
        state.selectedShopVouchers = {};
        state.selectedVoucherCodes = { discount: "", shipping: "" };
        state.selectedShopVoucherCodes = {};
        state.selectionErrors = { discount: "", shipping: "" };
        state.shopSelectionErrors = {};
        state.pricing = null;
        state.previewError = "";
        state.activeShopVoucherShopId = "";
        closeModal(els.platformVoucherModal);
        closeModal(els.shopVoucherModal);
        renderShopList();
        renderPlatformVoucher("discount");
        renderPlatformVoucher("shipping");
        renderPlatformVoucherList();
        renderShopVoucherList();
        renderSummary();
        return;
      }

      const productMap = await loadProductDetails(items);
      state.items = items;
      state.productMap = productMap;
      state.shipping = {};
      state.platformVouchers = { discount: [], shipping: [] };
      state.shopVouchers = {};
      state.selectedPlatformVouchers = { discount: null, shipping: null };
      state.selectedShopVouchers = {};
      state.selectedVoucherCodes = { discount: "", shipping: "" };
      state.selectedShopVoucherCodes = {};
      state.selectionErrors = { discount: "", shipping: "" };
      state.shopSelectionErrors = {};
      state.pricing = null;
      state.previewError = "";
      state.previewLoading = true;
      renderShopList();
      renderSummary();
      renderPlatformVoucher("discount");
      renderPlatformVoucher("shipping");
      renderPlatformVoucherList();
      renderShopVoucherList();
      await refreshCheckoutPreview({ silent: true });
      hideStatus();
      els.content.hidden = false;
      els.empty.hidden = true;
    } catch (error) {
      els.content.hidden = true;
      els.empty.hidden = false;
      showStatus(error instanceof Error ? error.message : "Không thể tải giỏ hàng.", true);
    }
  };

  const placeOrder = async () => {
    if (state.submitting || state.previewLoading || state.previewError) return;

    const selectedAddress = getSelectedAddress();
    if (!selectedAddress) {
      showStatus("Bạn cần thêm địa chỉ nhận hàng trước khi đặt hàng.", true);
      renderSummary();
      return;
    }

    if (!state.items.length) return;

    const paymentMethod =
      document.querySelector('input[name="paymentMethod"]:checked')?.value || "cod";

    try {
      state.submitting = true;
      renderShopList();
      renderPlatformVoucher("discount");
      renderPlatformVoucher("shipping");
      renderShopVoucherList();
      renderSummary();
      showStatus("Đang đặt hàng...");
      await auth.apiFetch(
        "/checkout",
        {
          method: "POST",
          body: buildCheckoutRequestBody(paymentMethod),
        },
        { redirectOn401: true }
      );
      window.BambiStoreCart?.emitChange?.();
      showStatus("Đặt hàng thành công. Đang chuyển sang trang đơn mua.");
      window.setTimeout(() => {
        window.location.href = "/ui/orders.html";
      }, 800);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Không thể đặt hàng.", true);
    } finally {
      state.submitting = false;
      renderShopList();
      renderPlatformVoucher("discount");
      renderPlatformVoucher("shipping");
      renderShopVoucherList();
      renderSummary();
    }
  };

  const bindEvents = () => {
    els.changeAddressBtn?.addEventListener("click", () => {
      if (!state.addresses.length) return;
      renderAddressModalList();
      openModal(els.addressModal);
    });

    els.closeAddressModalBtn?.addEventListener("click", () => {
      closeModal(els.addressModal);
    });

    els.closePlatformVoucherModalBtn?.addEventListener("click", () => {
      closeModal(els.platformVoucherModal);
    });

    els.closeShopVoucherModalBtn?.addEventListener("click", () => {
      closeModal(els.shopVoucherModal);
    });

    const handlePlatformVoucherButtonClick = async (kind) => {
      if (state.previewLoading || state.submitting || !state.items.length) return;

      if (state.previewError) {
        await refreshCheckoutPreview();
        return;
      }

      state.activeVoucherKind = kind;
      renderPlatformVoucherList();
      openModal(els.platformVoucherModal);
    };

    els.chooseDiscountVoucherBtn?.addEventListener("click", async () => {
      await handlePlatformVoucherButtonClick("discount");
    });

    els.chooseShippingVoucherBtn?.addEventListener("click", async () => {
      await handlePlatformVoucherButtonClick("shipping");
    });

    [els.addressModal, els.platformVoucherModal, els.shopVoucherModal].forEach((modal) => {
      modal?.addEventListener("click", (event) => {
        if (event.target === modal) {
          closeModal(modal);
        }
      });
    });

    els.addressModalList?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("[data-select-address]");
      if (!button) return;

      const addressId = String(button.dataset.selectAddress || "");
      if (!addressId) return;

      state.selectedAddressId = addressId;
      renderAddress();
      closeModal(els.addressModal);
    });

    els.platformVoucherList?.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("[data-platform-voucher-code]");
      if (!button) return;

      state.selectedVoucherCodes[state.activeVoucherKind] = String(
        button.dataset.platformVoucherCode || ""
      );
      closeModal(els.platformVoucherModal);
      await refreshCheckoutPreview({ silent: true });
    });

    els.shopVoucherList?.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest("[data-shop-voucher-code]");
      if (!button || !state.activeShopVoucherShopId) return;

      state.selectedShopVoucherCodes[state.activeShopVoucherShopId] = String(
        button.dataset.shopVoucherCode || ""
      );
      closeModal(els.shopVoucherModal);
      await refreshCheckoutPreview({ silent: true });
    });

    els.shopList.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const button = target.closest('[data-action="choose-shop-voucher"]');
      if (!button) return;

      const shopId = String(button.dataset.shopId || "");
      if (!shopId || state.previewLoading || state.submitting || !state.items.length) return;

      if (state.previewError) {
        await refreshCheckoutPreview();
        return;
      }

      state.activeShopVoucherShopId = shopId;
      renderShopVoucherList();
      openModal(els.shopVoucherModal);
    });

    els.shopList.addEventListener("change", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const input = target.closest("input[data-shipping-option]");
      if (!input) return;

      const shopId = String(input.dataset.shopId || "");
      const method = String(input.value || "fast");
      if (!shopId) return;

      state.shipping[shopId] = method;
      const optionGroup = input.closest(".checkout-shipping-options");
      optionGroup?.querySelectorAll(".checkout-ship-option").forEach((label) => {
        const radio = label.querySelector("input[data-shipping-option]");
        label.classList.toggle("is-active", Boolean(radio?.checked));
      });

      renderSummary();
      await refreshCheckoutPreview({ silent: true });
    });

    document.querySelectorAll('input[name="paymentMethod"]').forEach((input) => {
      input.addEventListener("change", () => {
        updatePaymentStyles();
      });
    });

    els.placeOrderBtn?.addEventListener("click", () => {
      placeOrder();
    });
  };

  bindEvents();
  updatePaymentStyles();
  renderShopList();
  renderPlatformVoucher("discount");
  renderPlatformVoucher("shipping");
  renderPlatformVoucherList();
  renderShopVoucherList();
  renderSummary();
  loadCart();
  loadAddresses();
})();
