(function () {
  const auth = window.BambiStoreAuth || {};
  const CART_SELECTION_QUERY_PARAM = "selected";

  const els = {
    status: document.querySelector("#orderStatus"),
    list: document.querySelector("#orderList"),
    empty: document.querySelector("#orderEmptyState"),
    filters: Array.from(document.querySelectorAll("[data-order-filter]")),
    reviewModal: document.querySelector("#reviewModal"),
    reviewModalList: document.querySelector("#reviewModalList"),
    closeReviewModalBtn: document.querySelector("#closeReviewModalBtn"),
    reviewModalCancelBtn: document.querySelector("#reviewModalCancelBtn"),
    reviewModalSubmitBtn: document.querySelector("#reviewModalSubmitBtn"),
  };

  if (!els.list) return;

  const STATUS_LABELS = {
    pending: "Chờ xác nhận",
    confirmed: "Chờ giao hàng",
    shipping: "Đang vận chuyển",
    delivered: "Đã giao",
    received: "Hoàn thành",
    cancelled: "Đã hủy",
    returned: "Trả hàng/Hoàn tiền",
  };

  const STATUS_CLASS = {
    pending: "status-pending",
    confirmed: "status-confirmed",
    shipping: "status-shipping",
    delivered: "status-delivered",
    received: "status-received",
    cancelled: "status-cancelled",
    returned: "status-returned",
  };

  const FILTER_LABELS = {
    all: "Tất cả",
    pending: "Chờ thanh toán",
    shipping: "Vận chuyển",
    waiting: "Chờ giao hàng",
    completed: "Hoàn thành",
    cancelled: "Đã hủy",
    returned: "Trả hàng/Hoàn tiền",
  };

  const REVIEW_RATING_LABELS = {
    1: "Tệ",
    2: "Tạm ổn",
    3: "Bình thường",
    4: "Tốt",
    5: "Tuyệt vời",
  };
  const MAX_REVIEW_IMAGES = 6;
  const MAX_REVIEW_VIDEOS = 1;

  const state = {
    orders: [],
    productMap: new Map(),
    filter: "all",
    confirmingEntryKey: "",
    returningEntryKey: "",
    reorderingEntryKey: "",
    reviewingEntryKey: "",
    reviewDrafts: {},
    submittingReview: false,
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
    String(value ?? "")
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

  const syncModalLock = () => {
    const hasOpenModal = Boolean(document.querySelector(".account-modal:not([hidden])"));
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

  const getItemProduct = (item) => state.productMap.get(getProductId(item)) || null;

  const getVariantDetails = (item) => {
    const product = getItemProduct(item);
    const variantId = String(item?.product_variants?.id || "");
    if (!product || !variantId) return null;
    const variants = Array.isArray(product.product_variants)
      ? product.product_variants
      : [];
    return variants.find((variant) => String(variant?.id || "") === variantId) || null;
  };

  const getItemImage = (item) => {
    const product = getItemProduct(item);
    const variant = getVariantDetails(item);
    return (
      variant?.image_url ||
      item?.product_variants?.image_url ||
      product?.cover_image_url ||
      (Array.isArray(product?.media_gallery) ? product.media_gallery[0] : "") ||
      ""
    );
  };

  const getItemTitle = (item) => {
    const product = getItemProduct(item);
    return (
      product?.name ||
      item?.product_variants?.products?.name ||
      `Sản phẩm #${getProductId(item) || item?.id || ""}`
    );
  };

  const getItemVariantLabel = (item) => {
    const variant = getVariantDetails(item);
    const optionValues = Array.isArray(variant?.option_values)
      ? variant.option_values.filter(Boolean)
      : [];
    return optionValues.length ? optionValues.join(" / ") : "Mặc định";
  };

  const getShopInfo = (item) => {
    const product = getItemProduct(item);
    const shopId =
      String(product?.shops?.id || item?.product_variants?.products?.shop_id || "");
    const shopName = product?.shops?.name || "Shop Bambi";
    return { shopId: shopId || "default", shopName };
  };

  const groupItemsByShop = (items) => {
    const groups = new Map();
    items.forEach((item) => {
      const { shopId, shopName } = getShopInfo(item);
      if (!groups.has(shopId)) {
        groups.set(shopId, { id: shopId, name: shopName, items: [] });
      }
      groups.get(shopId).items.push(item);
    });
    return Array.from(groups.values());
  };

  const resolveStatusKey = (items = []) => {
    const statuses = items
      .map((item) => String(item?.status || ""))
      .filter(Boolean);
    if (!statuses.length) return "pending";
    const all = (key) => statuses.every((status) => status === key);

    if (all("cancelled")) return "cancelled";
    if (statuses.includes("returned")) return "returned";
    if (all("received")) return "received";
    if (statuses.includes("shipping")) return "shipping";
    if (statuses.includes("delivered")) return "delivered";
    if (statuses.includes("confirmed")) return "confirmed";
    return "pending";
  };

  const matchesFilter = (entry) => {
    const filter = state.filter;
    if (filter === "all") return true;

    if (filter === "pending") {
      return entry.order?.payment_status === "pending";
    }

    if (filter === "shipping") {
      return ["shipping", "delivered"].includes(entry.statusKey);
    }

    if (filter === "waiting") {
      return ["pending", "confirmed"].includes(entry.statusKey);
    }

    if (filter === "completed") {
      return (
        entry.statusKey === "received" || entry.order?.order_status === "completed"
      );
    }

    if (filter === "cancelled") {
      return (
        entry.statusKey === "cancelled" || entry.order?.order_status === "cancelled"
      );
    }

    if (filter === "returned") {
      return (
        entry.statusKey === "returned" || entry.order?.payment_status === "refunded"
      );
    }

    return true;
  };

  const buildEntries = () => {
    const entries = [];
    state.orders.forEach((order) => {
      const groups = groupItemsByShop(order?.order_items || []);
      groups.forEach((group) => {
        const statusKey = resolveStatusKey(group.items);
        entries.push({
          order,
          shopId: group.id,
          shopName: group.name,
          items: group.items,
          statusKey,
        });
      });
    });
    return entries;
  };

  const getEntryKey = (entry) =>
    `${String(entry?.order?.id || "order")}:${String(entry?.shopId || "shop")}`;

  const canConfirmReceived = (entry) =>
    Array.isArray(entry?.items) &&
    entry.items.some((item) => String(item?.status || "") === "delivered") &&
    entry.items.every((item) => ["delivered", "received"].includes(String(item?.status || "")));

  const canRequestReturn = (entry) => canConfirmReceived(entry);

  const isCompletedEntry = (entry) =>
    Array.isArray(entry?.items) &&
    entry.items.length > 0 &&
    entry.items.every((item) => String(item?.status || "") === "received");

  const findEntry = (orderId, shopId) =>
    buildEntries().find(
      (entry) =>
        String(entry?.order?.id || "") === String(orderId || "") &&
        String(entry?.shopId || "") === String(shopId || "")
    ) || null;

  const getBuyAgainRequests = (entry) => {
    const quantitiesByVariantId = new Map();

    if (!Array.isArray(entry?.items)) return [];

    entry.items.forEach((item) => {
      const variantId = String(item?.product_variants?.id || "").trim();
      const productStatus = String(item?.product_variants?.products?.status || "").trim();
      const quantity = Number(item?.quantity || 0);

      if (!variantId || (productStatus && productStatus !== "active")) {
        return;
      }

      const safeQuantity = Number.isFinite(quantity) ? Math.max(1, Math.floor(quantity)) : 1;
      quantitiesByVariantId.set(
        variantId,
        Number(quantitiesByVariantId.get(variantId) || 0) + safeQuantity
      );
    });

    return Array.from(quantitiesByVariantId.entries()).map(
      ([productVariantId, quantity]) => ({
        productVariantId,
        quantity,
      })
    );
  };

  const getReviewTargetKey = (item) => getProductId(item);

  const getReviewableTargets = (entry) => {
    const targets = new Map();

    if (!Array.isArray(entry?.items)) return [];

    entry.items.forEach((item) => {
      const productId = getReviewTargetKey(item);
      const itemStatus = String(item?.status || "");
      const hasReview = Boolean(item?.review?.id);

      if (!productId || itemStatus !== "received" || hasReview || targets.has(productId)) {
        return;
      }

      targets.set(productId, item);
    });

    return Array.from(targets.values());
  };

  const hasReviewableTargets = (entry) => getReviewableTargets(entry).length > 0;

  const getReviewDraft = (productId) => {
    const key = String(productId || "");
    return (
      state.reviewDrafts[key] || {
        rating: 5,
        comment: "",
        imageUrls: [],
        videoUrls: [],
        uploading: false,
      }
    );
  };

  const getDraftMediaUrls = (draft, key) =>
    Array.from(
      new Set(
        (Array.isArray(draft?.[key]) ? draft[key] : [])
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      )
    );

  const isReviewModalBusy = () =>
    state.submittingReview ||
    Object.values(state.reviewDrafts).some((draft) => Boolean(draft?.uploading));

  const resetReviewState = () => {
    state.reviewingEntryKey = "";
    state.reviewDrafts = {};
    state.submittingReview = false;
  };

  const closeReviewModal = () => {
    resetReviewState();
    closeModal(els.reviewModal);
  };

  const renderReviewStars = (productId, rating) =>
    Array.from({ length: 5 }, (_, index) => {
      const value = index + 1;
      return `
        <button
          class="review-star-btn ${value <= rating ? "active" : ""}"
          type="button"
          data-review-rating="${value}"
          data-product-id="${escapeHtml(productId)}"
          aria-label="${escapeHtml(`${value} sao`)}"
          aria-pressed="${value === rating ? "true" : "false"}"
        >
          ★
        </button>
      `;
    }).join("");

  const renderReviewMediaPreview = (productId, draft) => {
    const imageUrls = getDraftMediaUrls(draft, "imageUrls");
    const videoUrls = getDraftMediaUrls(draft, "videoUrls");
    const items = [
      ...imageUrls.map((url) => ({ type: "image", url })),
      ...videoUrls.map((url) => ({ type: "video", url })),
    ];

    if (!items.length) {
      return `
        <div class="review-media-empty">
          Bạn có thể thêm ảnh hoặc video thực tế của sản phẩm.
        </div>
      `;
    }

    return items
      .map((item) => {
        const mediaMarkup =
          item.type === "video"
            ? `
              <video src="${escapeHtml(item.url)}" controls preload="metadata"></video>
              <span class="review-media-badge">Video</span>
            `
            : `<img src="${escapeHtml(item.url)}" alt="Media đánh giá" loading="lazy" />`;

        return `
          <figure class="review-media-preview ${item.type === "video" ? "is-video" : ""}">
            ${mediaMarkup}
            <button
              class="review-media-remove"
              type="button"
              data-review-remove-media="1"
              data-product-id="${escapeHtml(productId)}"
              data-media-type="${escapeHtml(item.type)}"
              data-media-url="${escapeHtml(item.url)}"
              aria-label="Xóa media"
            >
              ×
            </button>
          </figure>
        `;
      })
      .join("");
  };

  const renderReviewModal = () => {
    if (!els.reviewModalList) return;

    const entry = state.reviewingEntryKey
      ? buildEntries().find((item) => getEntryKey(item) === state.reviewingEntryKey) || null
      : null;
    const targets = getReviewableTargets(entry);

    if (!entry || !targets.length) {
      closeReviewModal();
      return;
    }

    const modalBusy = isReviewModalBusy();

    els.reviewModalList.innerHTML = targets
      .map((item) => {
        const productId = getReviewTargetKey(item);
        const draft = getReviewDraft(productId);
        const title = getItemTitle(item);
        const variantLabel = getItemVariantLabel(item);
        const imageUrl = getItemImage(item);
        const imageUrls = getDraftMediaUrls(draft, "imageUrls");
        const videoUrls = getDraftMediaUrls(draft, "videoUrls");
        const imageMarkup = imageUrl
          ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" loading="lazy" />`
          : "Ảnh";

        return `
          <section class="review-modal-card" data-review-card="${escapeHtml(productId)}">
            <div class="review-modal-product">
              <div class="order-thumb">${imageMarkup}</div>
              <div class="review-modal-copy">
                <h4 class="review-modal-title">${escapeHtml(title)}</h4>
                <div class="review-modal-meta">Phân loại: ${escapeHtml(variantLabel)}</div>
              </div>
            </div>
            <div class="review-rating-row">
              <strong>Chất lượng sản phẩm</strong>
              <div class="review-star-list">
                ${renderReviewStars(productId, draft.rating)}
              </div>
              <span class="review-rating-label">${escapeHtml(
                REVIEW_RATING_LABELS[draft.rating] || REVIEW_RATING_LABELS[5]
              )}</span>
            </div>
            <textarea
              class="review-modal-comment"
              data-review-comment="${escapeHtml(productId)}"
              placeholder="Hãy chia sẻ cảm nhận của bạn về sản phẩm này."
              ${modalBusy ? "disabled" : ""}
            >${escapeHtml(draft.comment || "")}</textarea>
            <div class="review-media-section">
              <div class="review-media-toolbar">
                <label class="review-upload-chip ${imageUrls.length >= MAX_REVIEW_IMAGES || modalBusy ? "disabled" : ""}">
                  <input
                    class="review-upload-input"
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    data-review-image-input="${escapeHtml(productId)}"
                    multiple
                    ${imageUrls.length >= MAX_REVIEW_IMAGES || modalBusy ? "disabled" : ""}
                  />
                  <span>Thêm ảnh</span>
                </label>
                <label class="review-upload-chip ${videoUrls.length >= MAX_REVIEW_VIDEOS || modalBusy ? "disabled" : ""}">
                  <input
                    class="review-upload-input"
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
                    data-review-video-input="${escapeHtml(productId)}"
                    ${videoUrls.length >= MAX_REVIEW_VIDEOS || modalBusy ? "disabled" : ""}
                  />
                  <span>Thêm video</span>
                </label>
                <span class="review-media-hint">
                  Tối đa ${MAX_REVIEW_IMAGES} ảnh và ${MAX_REVIEW_VIDEOS} video
                </span>
              </div>
              <div class="review-media-grid">
                ${renderReviewMediaPreview(productId, draft)}
              </div>
              ${
                draft.uploading
                  ? `<div class="review-media-status">Đang tải tệp đánh giá...</div>`
                  : ""
              }
            </div>
          </section>
        `;
      })
      .join("");

    if (els.reviewModalSubmitBtn) {
      els.reviewModalSubmitBtn.disabled = modalBusy;
      els.reviewModalSubmitBtn.textContent = state.submittingReview
        ? "Đang gửi đánh giá..."
        : modalBusy
          ? "Đang xử lý media..."
        : "Hoàn thành";
    }

    if (els.reviewModalCancelBtn) {
      els.reviewModalCancelBtn.disabled = modalBusy;
    }
  };

  const openReviewModal = (entry) => {
    const targets = getReviewableTargets(entry);
    if (!targets.length) return;

    state.reviewingEntryKey = getEntryKey(entry);
    state.reviewDrafts = targets.reduce((result, item) => {
      const productId = getReviewTargetKey(item);
      result[productId] = {
        rating: 5,
        comment: "",
        imageUrls: [],
        videoUrls: [],
        uploading: false,
      };
      return result;
    }, {});
    state.submittingReview = false;

    renderReviewModal();
    openModal(els.reviewModal);
  };

  const render = () => {
    const entries = buildEntries().filter(matchesFilter);

    if (!entries.length) {
      els.list.innerHTML = "";
      if (els.empty) els.empty.hidden = false;
      if (state.reviewingEntryKey) {
        closeReviewModal();
      }
      return;
    }

    if (els.empty) els.empty.hidden = true;

    els.list.innerHTML = entries
      .map((entry) => {
        const statusLabel = STATUS_LABELS[entry.statusKey] || "Đang xử lý";
        const statusClass = STATUS_CLASS[entry.statusKey] || "status-pending";
        const orderId = entry.order?.id ? `#${entry.order.id}` : "";
        const total = entry.items.reduce(
          (sum, item) => sum + Number(item?.price || 0) * Number(item?.quantity || 0),
          0
        );
        const entryKey = getEntryKey(entry);
        const confirming = state.confirmingEntryKey === entryKey;
        const returning = state.returningEntryKey === entryKey;
        const reordering = state.reorderingEntryKey === entryKey;
        const showReceivedButton = canConfirmReceived(entry);
        const showReturnButton = canRequestReturn(entry);
        const showPostDeliveryActions =
          isCompletedEntry(entry) || entry.order?.order_status === "completed";
        const showReviewButton = showPostDeliveryActions && hasReviewableTargets(entry);
        const actionsMarkup = showReceivedButton
          ? `
              ${
                showReturnButton
                  ? `
                    <button
                      class="secondary-accent"
                      type="button"
                      data-action="request-return"
                      data-order-id="${escapeHtml(entry.order?.id || "")}"
                      data-shop-id="${escapeHtml(entry.shopId)}"
                      ${confirming || returning ? "disabled" : ""}
                    >
                      ${returning ? "Đang gửi yêu cầu..." : "Yêu cầu trả hàng/Hoàn tiền"}
                    </button>
                  `
                  : ""
              }
              <button
                class="primary"
                type="button"
                data-action="confirm-received"
                data-order-id="${escapeHtml(entry.order?.id || "")}"
                data-shop-id="${escapeHtml(entry.shopId)}"
                ${confirming || returning ? "disabled" : ""}
              >
                ${confirming ? "Đang cập nhật..." : "Đã nhận được hàng"}
              </button>
            `
          : showPostDeliveryActions
          ? `
              <button
                class="primary"
                type="button"
                data-action="buy-again"
                data-order-id="${escapeHtml(entry.order?.id || "")}"
                data-shop-id="${escapeHtml(entry.shopId)}"
                ${reordering ? "disabled" : ""}
              >
                ${reordering ? "Đang thêm..." : "Mua lại"}
              </button>
              <button type="button" data-action="contact-seller">Liên hệ người bán</button>
            `
          : "";

        return `
          <div class="order-card" data-entry-key="${escapeHtml(entryKey)}">
            <div class="order-header">
              <div>
                <strong>${escapeHtml(entry.shopName)}</strong>
                ${
                  orderId
                    ? `<span class="order-meta">Đơn ${escapeHtml(orderId)}</span>`
                    : ""
                }
              </div>
              <div class="order-status ${escapeHtml(statusClass)}">${escapeHtml(
                statusLabel
              )}</div>
            </div>
            <div class="order-item-list">
              ${entry.items
                .map((item) => {
                  const title = getItemTitle(item);
                  const variantLabel = getItemVariantLabel(item);
                  const quantity = Number(item?.quantity || 1);
                  const lineTotal = Number(item?.price || 0) * quantity;
                  const imageUrl = getItemImage(item);
                  const imageMarkup = imageUrl
                    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(
                        title
                      )}" loading="lazy" />`
                    : "Ảnh";

                  return `
                    <div class="order-item">
                      <div class="order-thumb">${imageMarkup}</div>
                      <div>
                        <div>${escapeHtml(title)}</div>
                        <div class="muted">Phân loại: ${escapeHtml(
                          variantLabel
                        )} | x${escapeHtml(quantity)}</div>
                      </div>
                      <div class="price">${escapeHtml(formatCurrency(lineTotal))}</div>
                    </div>
                  `;
                })
                .join("")}
            </div>
            <div class="order-actions">
              <div class="muted">Tổng thanh toán: ${escapeHtml(
                formatCurrency(total)
              )}</div>
              ${actionsMarkup ? `<div class="actions">${actionsMarkup}</div>` : ""}
            </div>
          </div>
        `;
      })
      .join("");

    entries.forEach((entry) => {
      if (!hasReviewableTargets(entry)) return;

      const card = els.list.querySelector(`[data-entry-key="${getEntryKey(entry)}"]`);
      const actions = card?.querySelector(".order-actions .actions");
      if (!actions) return;

      const buyAgainButton = actions.querySelector('[data-action="buy-again"]');
      const contactButton = actions.querySelector('[data-action="contact-seller"]');

      if (buyAgainButton) {
        buyAgainButton.classList.remove("primary");
      }

      const reviewButton = document.createElement("button");
      reviewButton.type = "button";
      reviewButton.className = "primary";
      reviewButton.dataset.action = "open-review";
      reviewButton.dataset.orderId = String(entry.order?.id || "");
      reviewButton.dataset.shopId = String(entry.shopId || "");
      reviewButton.textContent = "Đánh giá";

      actions.innerHTML = "";
      actions.append(reviewButton);
      if (contactButton) actions.append(contactButton);
      if (buyAgainButton) actions.append(buyAgainButton);
    });

    if (state.reviewingEntryKey) {
      renderReviewModal();
    }
  };

  const setFilter = (value) => {
    const next = FILTER_LABELS[value] ? value : "all";
    state.filter = next;
    els.filters.forEach((el) => {
      el.classList.toggle("active", el.dataset.orderFilter === next);
    });
    render();
  };

  const loadProductDetails = async (orders) => {
    const productIds = new Set();
    orders.forEach((order) => {
      (order?.order_items || []).forEach((item) => {
        const id = getProductId(item);
        if (id) productIds.add(id);
      });
    });

    if (!productIds.size) return new Map();

    const results = await Promise.allSettled(
      Array.from(productIds).map(async (productId) => {
        const payload = await fetchJson(`/products/${encodeURIComponent(productId)}`);
        return [String(productId), payload?.product || null];
      })
    );

    const map = new Map();
    results.forEach((result) => {
      if (result.status !== "fulfilled") return;
      const [productId, product] = result.value;
      map.set(productId, product);
    });

    return map;
  };

  const loadOrders = async ({ showLoading = true } = {}) => {
    if (!ensureAuth()) return;

    try {
      if (showLoading) {
        showStatus("Đang tải đơn mua...");
      }
      const payload = await auth.apiFetch("/orders", {}, { redirectOn401: true });
      const orders = Array.isArray(payload?.orders?.data) ? payload.orders.data : [];
      state.orders = orders;
      state.productMap = await loadProductDetails(orders);
      if (showLoading) {
        hideStatus();
      }
      render();
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể tải đơn mua.",
        true
      );
    }
  };

  const confirmReceived = async (entry) => {
    const deliveredItems = Array.isArray(entry?.items)
      ? entry.items.filter((item) => String(item?.status || "") === "delivered")
      : [];

    if (!deliveredItems.length) return;

    state.confirmingEntryKey = getEntryKey(entry);
    render();
    showStatus("Đang xác nhận đã nhận được hàng...");

    try {
      await Promise.all(
        deliveredItems.map((item) =>
          auth.apiFetch(
            `/orders/items/${encodeURIComponent(item.id)}/status`,
            {
              method: "PATCH",
              body: { status: "received" },
            },
            { redirectOn401: true }
          )
        )
      );

      showStatus("Đã hoàn tất đơn hàng.");
      await loadOrders({ showLoading: false });
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể cập nhật trạng thái đơn hàng.",
        true
      );
      await loadOrders({ showLoading: false });
    } finally {
      state.confirmingEntryKey = "";
      render();
    }
  };

  const requestReturn = async (entry) => {
    const deliveredItems = Array.isArray(entry?.items)
      ? entry.items.filter((item) => String(item?.status || "") === "delivered")
      : [];

    if (!deliveredItems.length) return;

    const reasonInput = window.prompt(
      "Lý do trả hàng/hoàn tiền:",
      "Sản phẩm không đúng mô tả"
    );
    if (reasonInput === null) return;

    const reason = (reasonInput || "").trim();
    if (!reason) {
      showStatus("Vui lòng nhập lý do trả hàng/hoàn tiền.", true);
      return;
    }

    state.returningEntryKey = getEntryKey(entry);
    render();
    showStatus("Đang gửi yêu cầu trả hàng/hoàn tiền...");

    try {
      await Promise.all(
        deliveredItems.map((item) =>
          auth.apiFetch(
            "/returns",
            {
              method: "POST",
              body: {
                order_item_id: item.id,
                reason,
              },
            },
            { redirectOn401: true }
          )
        )
      );

      showStatus("Đã gửi yêu cầu trả hàng/hoàn tiền. Admin sẽ xem xét yêu cầu này.");
      await loadOrders({ showLoading: false });
    } catch (error) {
      showStatus(
        error instanceof Error
          ? error.message
          : "Không thể gửi yêu cầu trả hàng/hoàn tiền.",
        true
      );
      await loadOrders({ showLoading: false });
    } finally {
      state.returningEntryKey = "";
      render();
    }
  };

  const buyAgain = async (entry) => {
    if (!ensureAuth()) return;

    if (typeof auth.apiFetch !== "function") {
      showStatus("Không thể kết nối chức năng giỏ hàng.", true);
      return;
    }

    const requests = getBuyAgainRequests(entry);
    if (!requests.length) {
      showStatus("Không thể mua lại vì sản phẩm không còn khả dụng.", true);
      return;
    }

    state.reorderingEntryKey = getEntryKey(entry);
    render();
    showStatus("Đang thêm sản phẩm vào giỏ hàng...");

    try {
      const results = await Promise.allSettled(
        requests.map(({ productVariantId, quantity }) =>
          auth.apiFetch(
            "/cart/items",
            {
              method: "POST",
              body: {
                product_variant_id: productVariantId,
                quantity,
              },
            },
            { redirectOn401: true }
          )
        )
      );

      const cartItemIds = Array.from(
        new Set(
          results
            .filter((result) => result.status === "fulfilled")
            .map((result) => String(result.value?.item?.id || "").trim())
            .filter(Boolean)
        )
      );

      if (!cartItemIds.length) {
        const firstError = results.find((result) => result.status === "rejected");
        throw firstError?.status === "rejected" && firstError.reason instanceof Error
          ? firstError.reason
          : new Error("Không thể thêm sản phẩm vào giỏ hàng.");
      }

      window.BambiStoreCart?.emitChange?.();

      const cartUrl = new URL("/ui/cart.html", window.location.origin);
      cartUrl.searchParams.set(CART_SELECTION_QUERY_PARAM, cartItemIds.join(","));
      window.location.href = `${cartUrl.pathname}${cartUrl.search}`;
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ hàng.",
        true
      );
    } finally {
      state.reorderingEntryKey = "";
      render();
    }
  };

  const mergeDraftMediaUrls = (productId, key, urls, maxCount) => {
    state.reviewDrafts[productId] = {
      ...getReviewDraft(productId),
      [key]: Array.from(
        new Set([
          ...getDraftMediaUrls(getReviewDraft(productId), key),
          ...urls.map((value) => String(value || "").trim()).filter(Boolean),
        ])
      ).slice(0, maxCount),
    };
  };

  const setDraftUploading = (productId, uploading) => {
    state.reviewDrafts[productId] = {
      ...getReviewDraft(productId),
      uploading,
    };
  };

  const removeDraftMedia = (productId, mediaType, mediaUrl) => {
    const draft = getReviewDraft(productId);
    const key = mediaType === "video" ? "videoUrls" : "imageUrls";
    state.reviewDrafts[productId] = {
      ...draft,
      [key]: getDraftMediaUrls(draft, key).filter((url) => url !== mediaUrl),
    };
    renderReviewModal();
  };

  const uploadDraftMedia = async (productId, field, fileList) => {
    if (!ensureAuth()) return;
    if (!productId || !fileList?.length || state.submittingReview) return;

    const draft = getReviewDraft(productId);
    const existingImages = getDraftMediaUrls(draft, "imageUrls");
    const existingVideos = getDraftMediaUrls(draft, "videoUrls");

    const maxCount = field === "images" ? MAX_REVIEW_IMAGES : MAX_REVIEW_VIDEOS;
    const existingCount = field === "images" ? existingImages.length : existingVideos.length;
    const availableSlots = Math.max(0, maxCount - existingCount);

    if (!availableSlots) {
      showStatus(
        field === "images"
          ? `Bạn chỉ có thể tải tối đa ${MAX_REVIEW_IMAGES} ảnh cho mỗi đánh giá.`
          : `Bạn chỉ có thể tải tối đa ${MAX_REVIEW_VIDEOS} video cho mỗi đánh giá.`,
        true
      );
      return;
    }

    const files = Array.from(fileList).slice(0, availableSlots);
    if (!files.length) return;

    const formData = new FormData();
    files.forEach((file) => {
      formData.append(field === "images" ? "images" : "video", file);
    });

    const currentEntryKey = state.reviewingEntryKey;
    setDraftUploading(productId, true);
    renderReviewModal();

    try {
      const payload = await auth.apiFetch(
        "/reviews/media/upload",
        {
          method: "POST",
          body: formData,
        },
        { redirectOn401: true }
      );

      if (state.reviewingEntryKey !== currentEntryKey || !state.reviewDrafts[productId]) {
        return;
      }

      const media = payload?.media || {};
      if (field === "images") {
        mergeDraftMediaUrls(
          productId,
          "imageUrls",
          Array.isArray(media?.image_urls) ? media.image_urls : [],
          MAX_REVIEW_IMAGES
        );
      } else {
        mergeDraftMediaUrls(
          productId,
          "videoUrls",
          Array.isArray(media?.video_urls) ? media.video_urls : [],
          MAX_REVIEW_VIDEOS
        );
      }

      hideStatus();
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể tải media đánh giá.",
        true
      );
    } finally {
      if (state.reviewDrafts[productId]) {
        setDraftUploading(productId, false);
      }
      if (state.reviewingEntryKey === currentEntryKey) {
        renderReviewModal();
      }
    }
  };

  const submitReviews = async () => {
    const entry = state.reviewingEntryKey
      ? buildEntries().find((item) => getEntryKey(item) === state.reviewingEntryKey) || null
      : null;
    const targets = getReviewableTargets(entry);

    if (!entry || !targets.length || state.submittingReview) {
      return;
    }

    if (isReviewModalBusy()) {
      showStatus("Vui lòng chờ tải xong ảnh hoặc video trước khi gửi đánh giá.", true);
      return;
    }

    state.submittingReview = true;
    renderReviewModal();
    showStatus("Đang gửi đánh giá...");

    try {
      const results = await Promise.allSettled(
        targets.map((item) => {
          const productId = getReviewTargetKey(item);
          const draft = getReviewDraft(productId);

          return auth.apiFetch(
            "/reviews",
            {
              method: "POST",
              body: {
                product_id: productId,
                rating: Number(draft.rating || 5),
                comment: String(draft.comment || "").trim(),
                image_urls: getDraftMediaUrls(draft, "imageUrls"),
                video_urls: getDraftMediaUrls(draft, "videoUrls"),
              },
            },
            { redirectOn401: true }
          );
        })
      );

      const failed = results.filter((result) => result.status === "rejected");
      const successCount = results.length - failed.length;

      if (successCount > 0) {
        closeReviewModal();
        await loadOrders({ showLoading: false });
      }

      if (!failed.length) {
        showStatus("Đánh giá sản phẩm thành công.");
        return;
      }

      const firstError = failed[0];
      const errorMessage =
        firstError.status === "rejected" && firstError.reason instanceof Error
          ? firstError.reason.message
          : "Không thể gửi một số đánh giá.";

      showStatus(
        successCount
          ? `Đã gửi ${successCount}/${results.length} đánh giá. ${errorMessage}`
          : errorMessage,
        true
      );
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể gửi đánh giá.",
        true
      );
    } finally {
      state.submittingReview = false;
      if (state.reviewingEntryKey) {
        renderReviewModal();
      }
    }
  };

  const bindEvents = () => {
    els.filters.forEach((el) => {
      el.addEventListener("click", (event) => {
        event.preventDefault();
        const value = el.dataset.orderFilter || "all";
        setFilter(value);
      });
    });

    els.closeReviewModalBtn?.addEventListener("click", () => {
      if (isReviewModalBusy()) return;
      closeReviewModal();
    });

    els.reviewModalCancelBtn?.addEventListener("click", () => {
      if (isReviewModalBusy()) return;
      closeReviewModal();
    });

    els.reviewModalSubmitBtn?.addEventListener("click", () => {
      submitReviews();
    });

    els.reviewModal?.addEventListener("click", (event) => {
      if (event.target === els.reviewModal && !isReviewModalBusy()) {
        closeReviewModal();
      }
    });

    els.reviewModalList?.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const removeMediaButton = target.closest("[data-review-remove-media]");
      if (removeMediaButton && !state.submittingReview) {
        const productId = String(removeMediaButton.dataset.productId || "");
        const mediaType = String(removeMediaButton.dataset.mediaType || "");
        const mediaUrl = String(removeMediaButton.dataset.mediaUrl || "");
        if (productId && mediaType && mediaUrl) {
          removeDraftMedia(productId, mediaType, mediaUrl);
        }
        return;
      }

      const starButton = target.closest("[data-review-rating]");
      if (!starButton || state.submittingReview) return;

      const productId = String(starButton.dataset.productId || "");
      const rating = Number(starButton.dataset.reviewRating || 0);
      if (!productId || !Number.isFinite(rating) || rating < 1 || rating > 5) return;

      state.reviewDrafts[productId] = {
        ...getReviewDraft(productId),
        rating,
      };
      renderReviewModal();
    });

    els.reviewModalList?.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement)) return;

      const productId = String(target.dataset.reviewComment || "");
      if (!productId) return;

      state.reviewDrafts[productId] = {
        ...getReviewDraft(productId),
        comment: target.value || "",
      };
    });

    els.reviewModalList?.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "file") return;

      const imageProductId = String(target.dataset.reviewImageInput || "");
      const videoProductId = String(target.dataset.reviewVideoInput || "");
      const productId = imageProductId || videoProductId;
      const files = target.files;

      if (productId && files?.length) {
        uploadDraftMedia(productId, imageProductId ? "images" : "video", files);
      }

      target.value = "";
    });

    els.list?.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const buyAgainButton = target.closest('[data-action="buy-again"]');
      if (buyAgainButton) {
        const orderId = String(buyAgainButton.dataset.orderId || "");
        const shopId = String(buyAgainButton.dataset.shopId || "");
        if (
          !orderId ||
          !shopId ||
          state.confirmingEntryKey ||
          state.returningEntryKey ||
          state.reorderingEntryKey
        ) {
          return;
        }

        const entry = findEntry(orderId, shopId);
        if (!entry) return;

        await buyAgain(entry);
        return;
      }

      const reviewButton = target.closest('[data-action="open-review"]');
      if (reviewButton) {
        const orderId = String(reviewButton.dataset.orderId || "");
        const shopId = String(reviewButton.dataset.shopId || "");
        if (
          !orderId ||
          !shopId ||
          state.confirmingEntryKey ||
          state.returningEntryKey ||
          state.reorderingEntryKey
        ) {
          return;
        }

        const entry = findEntry(orderId, shopId);
        if (!entry) return;

        openReviewModal(entry);
        return;
      }

      const returnButton = target.closest('[data-action="request-return"]');
      if (returnButton) {
        const orderId = String(returnButton.dataset.orderId || "");
        const shopId = String(returnButton.dataset.shopId || "");
        if (
          !orderId ||
          !shopId ||
          state.confirmingEntryKey ||
          state.returningEntryKey ||
          state.reorderingEntryKey
        ) {
          return;
        }

        const entry = findEntry(orderId, shopId);
        if (!entry) return;

        await requestReturn(entry);
        return;
      }

      const button = target.closest('[data-action="confirm-received"]');
      if (!button) return;

      const orderId = String(button.dataset.orderId || "");
      const shopId = String(button.dataset.shopId || "");
      if (
        !orderId ||
        !shopId ||
        state.confirmingEntryKey ||
        state.returningEntryKey ||
        state.reorderingEntryKey
      ) {
        return;
      }

      const entry = findEntry(orderId, shopId);
      if (!entry) return;

      await confirmReceived(entry);
    });
  };

  bindEvents();
  loadOrders();
})();
