(function () {
  const auth = window.BambiStoreAuth || {};

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
    total: document.querySelector("#checkoutTotal"),
    note: document.querySelector("#checkoutNote"),
    placeOrderBtn: document.querySelector("#placeOrderBtn"),
    addressModal: document.querySelector("#addressSelectModal"),
    addressModalList: document.querySelector("#addressSelectList"),
    closeAddressModalBtn: document.querySelector("#closeAddressModalBtn"),
  };

  if (!els.shopList) return;

  const ADDRESS_STORAGE_PREFIX = "bambi_customer_addresses_v2";
  const SHIPPING_OPTIONS = {
    fast: {
      label: "Nhanh",
      fee: 15000,
      note: "Giao trong 2-3 ngày (tùy theo shop)",
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
    addresses: [],
    selectedAddressId: "",
    shipping: {},
    submitting: false,
  };

  const formatCurrency = (value) => {
    const amount = Number(value);
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
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

  const getItemPrice = (item) => Number(item?.product_variants?.price || 0);

  const getItemProduct = (item) => state.productMap.get(getProductId(item)) || null;

  const getItemTitle = (item) => {
    const product = getItemProduct(item);
    return product?.name || `Sản phẩm #${getProductId(item) || item?.id || ""}`;
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
      const fallbackShopId = String(item?.product_variants?.products?.shop_id || "default");
      const shopId = String(product?.shops?.id || fallbackShopId);
      const shopName = product?.shops?.name || "Shop Bambi";

      if (!groups.has(shopId)) {
        groups.set(shopId, {
          id: shopId,
          name: shopName,
          items: [],
        });
      }

      groups.get(shopId).items.push(item);
    });

    return Array.from(groups.values());
  };

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
      updateSummary();
      return;
    }

    const tags = [];
    if (selected.is_default) {
      tags.push('<span class="address-tag is-default">Mặc định</span>');
    }
    tags.push(`<span class="address-tag">${escapeHtml(getAddressTypeLabel(selected.address_type))}</span>`);

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
      <div class="checkout-address-text">${escapeHtml(buildAddressText(selected) || "Chưa có địa chỉ cụ thể")}</div>
      <div class="checkout-address-tags">${tags.join("")}</div>
    `;
    els.addressInfo.hidden = false;
    els.addressEmpty.hidden = true;
    if (els.changeAddressBtn) {
      els.changeAddressBtn.disabled = false;
    }
    updateSummary();
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
              <p class="address-card-text">${escapeHtml(buildAddressText(address) || "Chưa có địa chỉ cụ thể")}</p>
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

  const openAddressModal = () => {
    if (!els.addressModal) return;
    renderAddressModalList();
    els.addressModal.hidden = false;
    els.addressModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("account-modal-open");
  };

  const closeAddressModal = () => {
    if (!els.addressModal) return;
    els.addressModal.hidden = true;
    els.addressModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("account-modal-open");
  };

  const getShippingTotal = () => {
    const groups = getGroups();
    return groups.reduce((sum, group) => {
      const method = state.shipping[group.id] || "fast";
      const option = SHIPPING_OPTIONS[method] || SHIPPING_OPTIONS.fast;
      return sum + option.fee;
    }, 0);
  };

  const updateSummary = () => {
    const subtotal = state.items.reduce(
      (sum, item) => sum + getItemPrice(item) * Number(item?.quantity || 0),
      0
    );
    const shippingTotal = state.items.length ? getShippingTotal() : 0;
    const total = subtotal + shippingTotal;
    const itemCount = state.items.reduce(
      (sum, item) => sum + Number(item?.quantity || 0),
      0
    );

    if (els.subtotal) {
      els.subtotal.textContent = formatCurrency(subtotal);
    }
    if (els.shipping) {
      els.shipping.textContent = formatCurrency(shippingTotal);
    }
    if (els.total) {
      els.total.textContent = formatCurrency(total);
    }
    if (els.itemCount) {
      els.itemCount.textContent = itemCount ? `${itemCount} sản phẩm` : "";
    }

    const hasAddress = Boolean(getSelectedAddress());
    const canOrder = state.items.length > 0 && hasAddress && !state.submitting;

    if (els.placeOrderBtn) {
      els.placeOrderBtn.disabled = !canOrder;
      els.placeOrderBtn.textContent = state.submitting ? "Đang đặt hàng..." : "Đặt hàng";
    }

    if (els.note) {
      if (!hasAddress && state.items.length > 0) {
        els.note.textContent = "Vui lòng thêm địa chỉ nhận hàng trước khi đặt hàng.";
        els.note.hidden = false;
      } else {
        els.note.textContent = "";
        els.note.hidden = true;
      }
    }
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
                              ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" />`
                              : `<span>${escapeHtml(title.slice(0, 2).toUpperCase())}</span>`
                          }
                        </div>
                        <div class="checkout-item-info">
                          <h3 class="cart-item-title">${escapeHtml(title)}</h3>
                          <div class="cart-item-meta">
                            <span class="cart-meta-chip">Phân loại: ${escapeHtml(variantLabel)}</span>
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
                        <span class="cart-unit-price">${escapeHtml(formatCurrency(unitPrice))}</span>
                      </div>
                      <div class="checkout-item-qty">
                        <span class="checkout-col-label">Số lượng</span>
                        <span class="checkout-qty">x${escapeHtml(quantity)}</span>
                      </div>
                      <div class="checkout-item-total">
                        <span class="checkout-col-label">Thành tiền</span>
                        <strong class="cart-line-total">${escapeHtml(formatCurrency(lineTotal))}</strong>
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
                  <p>Chức năng sẽ cập nhật sau.</p>
                </div>
                <button class="ghost-btn" type="button" disabled>Chọn voucher</button>
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

  const loadCart = async () => {
    if (!ensureAuth()) return;

    try {
      showStatus("Đang tải giỏ hàng...");
      const payload = await auth.apiFetch("/cart", {}, { redirectOn401: true });
      const items = Array.isArray(payload?.items) ? payload.items : [];

      if (!items.length) {
        els.content.hidden = true;
        els.empty.hidden = false;
        hideStatus();
        state.items = [];
        state.productMap = new Map();
        updateSummary();
        return;
      }

      const productMap = await loadProductDetails(items);
      state.items = items;
      state.productMap = productMap;
      renderShopList();
      hideStatus();
      els.content.hidden = false;
      els.empty.hidden = true;
      updateSummary();
    } catch (error) {
      els.content.hidden = true;
      els.empty.hidden = false;
      showStatus(error instanceof Error ? error.message : "Không thể tải giỏ hàng.", true);
    }
  };

  const placeOrder = async () => {
    if (state.submitting) return;

    const selectedAddress = getSelectedAddress();
    if (!selectedAddress) {
      showStatus("Bạn cần thêm địa chỉ nhận hàng trước khi đặt.", true);
      updateSummary();
      return;
    }

    if (!state.items.length) return;

    const paymentMethod =
      document.querySelector('input[name="paymentMethod"]:checked')?.value || "cod";

    try {
      state.submitting = true;
      updateSummary();
      showStatus("Đang đặt hàng...");
      await auth.apiFetch(
        "/checkout",
        {
          method: "POST",
          body: { payment_method: paymentMethod },
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
      updateSummary();
    }
  };

  const bindEvents = () => {
    els.changeAddressBtn?.addEventListener("click", () => {
      if (!state.addresses.length) return;
      openAddressModal();
    });

    els.closeAddressModalBtn?.addEventListener("click", () => {
      closeAddressModal();
    });

    els.addressModal?.addEventListener("click", (event) => {
      if (event.target === els.addressModal) {
        closeAddressModal();
      }
    });

    els.addressModalList?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-select-address]");
      if (!button) return;
      const addressId = String(button.dataset.selectAddress || "");
      if (!addressId) return;
      state.selectedAddressId = addressId;
      renderAddress();
      closeAddressModal();
    });

    els.shopList.addEventListener("change", (event) => {
      const input = event.target.closest("input[data-shipping-option]");
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
      updateSummary();
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
  loadCart();
  loadAddresses();
})();
