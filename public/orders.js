(function () {
  const auth = window.BambiStoreAuth || {};

  const els = {
    status: document.querySelector("#orderStatus"),
    list: document.querySelector("#orderList"),
    empty: document.querySelector("#orderEmptyState"),
    filters: Array.from(document.querySelectorAll("[data-order-filter]")),
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

  const state = {
    orders: [],
    productMap: new Map(),
    filter: "all",
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

  const render = () => {
    const entries = buildEntries().filter(matchesFilter);

    if (!entries.length) {
      els.list.innerHTML = "";
      if (els.empty) els.empty.hidden = false;
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

        return `
          <div class="order-card">
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
              <div class="actions">
                <button class="primary" type="button">Mua lại</button>
                <button type="button">Liên hệ người bán</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");
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

  const loadOrders = async () => {
    if (!ensureAuth()) return;

    try {
      showStatus("Đang tải đơn mua...");
      const payload = await auth.apiFetch("/orders", {}, { redirectOn401: true });
      const orders = Array.isArray(payload?.orders?.data) ? payload.orders.data : [];
      state.orders = orders;
      state.productMap = await loadProductDetails(orders);
      hideStatus();
      render();
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể tải đơn mua.",
        true
      );
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
  };

  bindEvents();
  loadOrders();
})();
