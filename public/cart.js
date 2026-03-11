(function () {
  const auth = window.BambiStoreAuth || {};

  const els = {
    status: document.querySelector("#cartStatus"),
    content: document.querySelector("#cartContent"),
    empty: document.querySelector("#cartEmptyState"),
    groupList: document.querySelector("#cartGroupList"),
    selectAllTop: document.querySelector("#cartSelectAllTop"),
    selectAllBottom: document.querySelector("#cartSelectAllBottom"),
    selectionMeta: document.querySelector("#cartSelectionMeta"),
    summaryTotal: document.querySelector("#cartSummaryTotal"),
    checkoutBtn: document.querySelector("#cartCheckoutBtn"),
    clearSelectedBtn: document.querySelector("#cartClearSelected"),
  };

  if (!els.groupList) return;

  const state = {
    items: [],
    productMap: new Map(),
    selectedIds: new Set(),
    initialised: false,
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

  const getInitials = (value) => {
    const parts = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) return "BM";
    return parts.map((part) => part[0]?.toUpperCase() || "").join("");
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

  const getItemStock = (item) => {
    const stock = Number(item?.product_variants?.stock || 0);
    return Number.isFinite(stock) ? Math.max(0, stock) : 0;
  };

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

  const getSelectedItems = () =>
    state.items.filter((item) => state.selectedIds.has(String(item.id)));

  const syncSelectAllControls = () => {
    const total = state.items.length;
    const selected = state.selectedIds.size;
    const checked = total > 0 && selected === total;
    const indeterminate = selected > 0 && selected < total;

    [els.selectAllTop, els.selectAllBottom].forEach((input) => {
      if (!input) return;
      input.checked = checked;
      input.indeterminate = indeterminate;
    });
  };

  const updateSummary = () => {
    const selectedItems = getSelectedItems();
    const selectedQuantity = selectedItems.reduce(
      (sum, item) => sum + Number(item?.quantity || 0),
      0
    );
    const totalAmount = selectedItems.reduce(
      (sum, item) => sum + getItemPrice(item) * Number(item?.quantity || 0),
      0
    );

    if (els.selectionMeta) {
      els.selectionMeta.textContent = `${selectedItems.length} sản phẩm được chọn • ${selectedQuantity} món`;
    }

    if (els.summaryTotal) {
      els.summaryTotal.textContent = formatCurrency(totalAmount);
    }

    if (els.checkoutBtn) {
      els.checkoutBtn.disabled = selectedItems.length === 0;
      els.checkoutBtn.textContent = selectedItems.length
        ? `Mua hàng (${selectedItems.length})`
        : "Mua hàng";
    }

    if (els.clearSelectedBtn) {
      els.clearSelectedBtn.disabled = selectedItems.length === 0;
    }

    syncSelectAllControls();
  };

  const renderGroups = () => {
    const groups = getGroups();

    els.groupList.innerHTML = groups
      .map((group) => {
        const itemCount = group.items.reduce(
          (sum, item) => sum + Number(item?.quantity || 0),
          0
        );

        return `
          <section class="cart-shop-card">
            <div class="cart-shop-head">
              <div class="cart-shop-name">
                <span class="cart-shop-badge">Shop</span>
                <span>${escapeHtml(group.name)}</span>
              </div>
              <div class="cart-shop-meta">${itemCount} món trong shop này</div>
            </div>
            <div class="cart-item-list">
              ${group.items
                .map((item) => {
                  const itemId = String(item?.id || "");
                  const title = getItemTitle(item);
                  const imageUrl = getItemImage(item);
                  const unitPrice = getItemPrice(item);
                  const quantity = Number(item?.quantity || 1);
                  const stock = getItemStock(item);
                  const lineTotal = unitPrice * quantity;
                  const sku = getItemSku(item);
                  const variantLabel = getItemVariantLabel(item);
                  const maxQuantity = stock > 0 ? stock : quantity;
                  const stockMessage =
                    stock <= 0
                      ? "Hết hàng"
                      : stock <= 10
                        ? `Còn ${stock} sản phẩm`
                        : "";

                  return `
                    <article class="cart-item-row" data-cart-item-id="${escapeHtml(itemId)}">
                      <label class="cart-check" aria-label="Chọn sản phẩm ${escapeHtml(title)}">
                        <input
                          type="checkbox"
                          data-cart-select="${escapeHtml(itemId)}"
                          value="${escapeHtml(itemId)}"
                          ${state.selectedIds.has(itemId) ? "checked" : ""}
                        />
                      </label>
                      <div class="cart-item-main">
                        <div class="cart-item-thumb">
                          ${
                            imageUrl
                              ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" />`
                              : `<span>${escapeHtml(getInitials(title))}</span>`
                          }
                        </div>
                        <div class="cart-item-info">
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
                      <div class="cart-item-col">
                        <span class="cart-col-label">Đơn giá</span>
                        <span class="cart-unit-price">${escapeHtml(
                          formatCurrency(unitPrice)
                        )}</span>
                      </div>
                      <div class="cart-item-col">
                        <span class="cart-col-label">Số lượng</span>
                        <div class="cart-qty-control">
                          <button
                            class="cart-qty-btn"
                            type="button"
                            data-qty-change="-1"
                            data-item-id="${escapeHtml(itemId)}"
                            ${quantity <= 1 ? "disabled" : ""}
                          >
                            -
                          </button>
                          <input
                            class="cart-qty-input"
                            type="number"
                            min="1"
                            max="${Math.max(1, maxQuantity)}"
                            value="${quantity}"
                            data-qty-input="${escapeHtml(itemId)}"
                          />
                          <button
                            class="cart-qty-btn"
                            type="button"
                            data-qty-change="1"
                            data-item-id="${escapeHtml(itemId)}"
                            ${quantity >= maxQuantity ? "disabled" : ""}
                          >
                            +
                          </button>
                        </div>
                        ${
                          stockMessage
                            ? `<span class="cart-item-stock">${escapeHtml(stockMessage)}</span>`
                            : ""
                        }
                      </div>
                      <div class="cart-item-col">
                        <span class="cart-col-label">Số tiền</span>
                        <strong class="cart-line-total">${escapeHtml(
                          formatCurrency(lineTotal)
                        )}</strong>
                      </div>
                      <div class="cart-item-actions">
                        <span class="cart-col-label">Thao tác</span>
                        <button
                          class="cart-remove-btn"
                          type="button"
                          data-remove-item="${escapeHtml(itemId)}"
                        >
                          Xóa
                        </button>
                      </div>
                    </article>
                  `;
                })
                .join("")}
            </div>
          </section>
        `;
      })
      .join("");
  };

  const render = () => {
    const hasItems = state.items.length > 0;

    els.content.hidden = !hasItems;
    els.empty.hidden = hasItems;

    if (!hasItems) {
      els.groupList.innerHTML = "";
      updateSummary();
      return;
    }

    renderGroups();
    updateSummary();
  };

  const toggleItemBusy = (itemId, busy) => {
    const row = document.querySelector(`[data-cart-item-id="${itemId}"]`);
    if (!row) return;

    row.classList.toggle("is-busy", Boolean(busy));
    row.querySelectorAll("button, input").forEach((element) => {
      element.disabled = Boolean(busy);
    });
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

  const loadCart = async ({
    preserveSelection = false,
    quiet = false,
    keepScroll = false,
  } = {}) => {
    if (typeof auth.getToken !== "function" || !auth.getToken()) {
      if (typeof auth.redirectToLogin === "function") {
        auth.redirectToLogin();
      }
      return;
    }

    const previousSelection = new Set(state.selectedIds);
    const scrollTop = keepScroll ? window.scrollY : null;

    try {
      if (!quiet) {
        showStatus("Đang tải giỏ hàng...");
      }
      const payload = await auth.apiFetch("/cart", {}, { redirectOn401: true });
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const productMap = await loadProductDetails(items);

      state.items = items;
      state.productMap = productMap;

      if (preserveSelection && state.initialised) {
        state.selectedIds = new Set(
          items
            .map((item) => String(item.id))
            .filter((itemId) => previousSelection.has(itemId))
        );
      } else {
        state.selectedIds = new Set(items.map((item) => String(item.id)));
      }

      state.initialised = true;
      hideStatus();
      render();
      if (scrollTop !== null) {
        window.scrollTo({ top: scrollTop });
      }
    } catch (error) {
      if (!quiet) {
        els.content.hidden = true;
        els.empty.hidden = false;
        els.groupList.innerHTML = "";
      }
      showStatus(
        error instanceof Error ? error.message : "Không thể tải giỏ hàng.",
        true
      );
    }
  };

  const updateItemQuantity = async (itemId, quantity) => {
    const item = state.items.find((entry) => String(entry.id) === String(itemId));
    if (!item) return;

    const stock = getItemStock(item);
    const maxQuantity = stock > 0 ? stock : Number(item.quantity || 1);
    const parsedQuantity = Number(quantity);
    const safeQuantity = Number.isFinite(parsedQuantity)
      ? Math.floor(parsedQuantity)
      : Number(item.quantity || 1);
    const nextQuantity = Math.max(1, Math.min(maxQuantity, safeQuantity));

    if (nextQuantity === Number(item.quantity || 1)) {
      render();
      return;
    }

    toggleItemBusy(itemId, true);

    try {
      await auth.apiFetch(
        `/cart/items/${encodeURIComponent(itemId)}`,
        {
          method: "PATCH",
          body: { quantity: nextQuantity },
        },
        { redirectOn401: true }
      );

      window.BambiStoreCart?.emitChange?.();
      await loadCart({ preserveSelection: true, quiet: true, keepScroll: true });
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể cập nhật số lượng.",
        true
      );
      toggleItemBusy(itemId, false);
    }
  };

  const removeItem = async (itemId) => {
    toggleItemBusy(itemId, true);

    try {
      await auth.apiFetch(
        `/cart/items/${encodeURIComponent(itemId)}`,
        { method: "DELETE" },
        { redirectOn401: true }
      );

      state.selectedIds.delete(String(itemId));
      window.BambiStoreCart?.emitChange?.();
      await loadCart({ preserveSelection: true, quiet: true, keepScroll: true });
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Không thể xóa sản phẩm.", true);
      toggleItemBusy(itemId, false);
    }
  };

  const removeSelectedItems = async () => {
    const selectedIds = Array.from(state.selectedIds);
    if (!selectedIds.length) return;

    showStatus("Đang xóa các sản phẩm đã chọn...");

    try {
      await Promise.all(
        selectedIds.map((itemId) =>
          auth.apiFetch(
            `/cart/items/${encodeURIComponent(itemId)}`,
            { method: "DELETE" },
            { redirectOn401: true }
          )
        )
      );

      window.BambiStoreCart?.emitChange?.();
      await loadCart({ preserveSelection: false });
      hideStatus();
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể xóa các sản phẩm đã chọn.",
        true
      );
    }
  };

  const checkout = async () => {
    const selectedItems = getSelectedItems();

    if (!selectedItems.length) return;

    if (selectedItems.length !== state.items.length) {
      showStatus(
        "Hiện tại hệ thống thanh toán toàn bộ giỏ hàng. Hãy chọn tất cả sản phẩm để tiếp tục.",
        true
      );
      return;
    }

    if (els.checkoutBtn) {
      els.checkoutBtn.disabled = true;
    }

    try {
      showStatus("Đang tạo đơn hàng...");
      await auth.apiFetch(
        "/checkout",
        {
          method: "POST",
          body: { payment_method: "cod" },
        },
        { redirectOn401: true }
      );

      window.BambiStoreCart?.emitChange?.();
      showStatus("Đặt hàng thành công. Đang chuyển sang trang đơn mua.");

      window.setTimeout(() => {
        window.location.href = "/ui/orders.html";
      }, 600);
    } catch (error) {
      showStatus(error instanceof Error ? error.message : "Không thể tạo đơn hàng.", true);
      updateSummary();
    }
  };

  const bindEvents = () => {
    [els.selectAllTop, els.selectAllBottom].forEach((input) => {
      input?.addEventListener("change", (event) => {
        const checked = Boolean(event.target.checked);
        state.selectedIds = checked
          ? new Set(state.items.map((item) => String(item.id)))
          : new Set();
        updateSummary();
        document.querySelectorAll("[data-cart-select]").forEach((checkbox) => {
          checkbox.checked = checked;
        });
      });
    });

    els.groupList.addEventListener("change", (event) => {
      const selectInput = event.target.closest("[data-cart-select]");
      if (selectInput) {
        const itemId = String(selectInput.dataset.cartSelect || selectInput.value || "");
        if (selectInput.checked) {
          state.selectedIds.add(itemId);
        } else {
          state.selectedIds.delete(itemId);
        }
        updateSummary();
        return;
      }

      const qtyInput = event.target.closest("[data-qty-input]");
      if (qtyInput) {
        const itemId = String(qtyInput.dataset.qtyInput || "");
        const nextQuantity = Number(qtyInput.value || 1);
        updateItemQuantity(itemId, nextQuantity);
      }
    });

    els.groupList.addEventListener("click", (event) => {
      const qtyButton = event.target.closest("[data-qty-change]");
      if (qtyButton) {
        const itemId = String(qtyButton.dataset.itemId || "");
        const delta = Number(qtyButton.dataset.qtyChange || 0);
        const item = state.items.find((entry) => String(entry.id) === itemId);
        if (!item || !delta) return;
        updateItemQuantity(itemId, Number(item.quantity || 1) + delta);
        return;
      }

      const removeButton = event.target.closest("[data-remove-item]");
      if (removeButton) {
        removeItem(String(removeButton.dataset.removeItem || ""));
      }
    });

    els.clearSelectedBtn?.addEventListener("click", () => {
      removeSelectedItems();
    });

    els.checkoutBtn?.addEventListener("click", () => {
      checkout();
    });
  };

  bindEvents();
  loadCart();
})();
