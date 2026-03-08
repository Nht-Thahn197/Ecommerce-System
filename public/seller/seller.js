(() => {
  const storageKeys = {
    userBase: "bambi_user_base",
    userToken: "bambi_user_token",
    userRefresh: "bambi_user_refresh",
    sellerBase: "bambi_seller_base",
    sellerToken: "bambi_seller_token",
    sellerRefresh: "bambi_seller_refresh",
  };

  const SHOP_PREF_KEY = "bambi_seller_current_shop";
  const VIEW_PARAM = "view";
  const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const NUMBER_FORMATTER = new Intl.NumberFormat("vi-VN");
  const PRICE_FORMATTER = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });

  const VIEW_META = {
    dashboard: {
      breadcrumb: "Trang chủ / Tổng quan",
      title: "Kênh Người Bán",
      subtitle:
        "Theo dõi shop, quản lý sản phẩm và tạo sản phẩm mới trong một màn hình gọn hơn.",
    },
    products: {
      breadcrumb: "Trang chủ / Sản phẩm",
      title: "Sản phẩm",
      subtitle:
        "Lọc nhanh sản phẩm theo trạng thái, danh mục và thao tác ẩn hoặc bật hiển thị ngay.",
    },
    "new-product": {
      breadcrumb: "Trang chủ / Sản phẩm / Thêm 1 sản phẩm mới",
      title: "Thêm 1 sản phẩm mới",
      subtitle:
        "Soạn sản phẩm theo từng phần giống seller center, đồng thời xem preview và checklist hoàn thiện.",
    },
  };

  const SELLER_ORDER_ACTIONS = {
    pending: { label: "Xác nhận", status: "confirmed" },
    confirmed: { label: "Bàn giao", status: "shipping" },
    shipping: { label: "Đánh dấu giao", status: "delivered" },
  };

  const els = {
    shell: document.querySelector(".seller-shell"),
    breadcrumb: document.querySelector("#sellerBreadcrumb"),
    pageTitle: document.querySelector("#sellerPageTitle"),
    pageSubtitle: document.querySelector("#sellerPageSubtitle"),
    sellerStatus: document.querySelector("#sellerStatus"),
    sellerEmptyState: document.querySelector("#sellerEmptyState"),
    sellerViews: Array.from(document.querySelectorAll(".seller-view")),
    sellerNavLinks: Array.from(
      document.querySelectorAll(".seller-nav-link[data-view-target]")
    ),
    sellerShopSummaryName: document.querySelector("#sellerShopSummaryName"),
    sellerShopSummaryMeta: document.querySelector("#sellerShopSummaryMeta"),
    sellerShopSelect: document.querySelector("#sellerShopSelect"),
    reloadSellerData: document.querySelector("#reloadSellerData"),
    reloadProductsView: document.querySelector("#reloadProductsView"),
    sellerUserAvatar: document.querySelector("#sellerUserAvatar"),
    sellerUserName: document.querySelector("#sellerUserName"),
    sellerUserRole: document.querySelector("#sellerUserRole"),
    logoutSeller: document.querySelector("#logoutSeller"),
    dashboardHeroStats: document.querySelector("#dashboardHeroStats"),
    dashboardSummaryCards: document.querySelector("#dashboardSummaryCards"),
    dashboardPerformance: document.querySelector("#dashboardPerformance"),
    dashboardSuggestions: document.querySelector("#dashboardSuggestions"),
    recentOrdersTable: document.querySelector("#recentOrdersTable"),
    productStatusTabs: document.querySelector("#productStatusTabs"),
    productSearch: document.querySelector("#productSearch"),
    productCategoryFilter: document.querySelector("#productCategoryFilter"),
    productSort: document.querySelector("#productSort"),
    clearProductFilters: document.querySelector("#clearProductFilters"),
    productsSummary: document.querySelector("#productsSummary"),
    productsTable: document.querySelector("#productsTable"),
    formTabButtons: Array.from(
      document.querySelectorAll("#sellerFormTabs [data-scroll-target]")
    ),
    draftChecklist: document.querySelector("#draftChecklist"),
    triggerGalleryUpload: document.querySelector("#triggerGalleryUpload"),
    galleryInput: document.querySelector("#galleryInput"),
    galleryPreview: document.querySelector("#galleryPreview"),
    triggerCoverUpload: document.querySelector("#triggerCoverUpload"),
    coverInput: document.querySelector("#coverInput"),
    coverPreview: document.querySelector("#coverPreview"),
    triggerVideoUpload: document.querySelector("#triggerVideoUpload"),
    videoInput: document.querySelector("#videoInput"),
    videoPreview: document.querySelector("#videoPreview"),
    productNameInput: document.querySelector("#productNameInput"),
    productNameCount: document.querySelector("#productNameCount"),
    productCategoryInput: document.querySelector("#productCategoryInput"),
    productGtinInput: document.querySelector("#productGtinInput"),
    productDescriptionInput: document.querySelector("#productDescriptionInput"),
    productPriceInput: document.querySelector("#productPriceInput"),
    productStockInput: document.querySelector("#productStockInput"),
    productSkuInput: document.querySelector("#productSkuInput"),
    productWeightInput: document.querySelector("#productWeightInput"),
    productLengthInput: document.querySelector("#productLengthInput"),
    productWidthInput: document.querySelector("#productWidthInput"),
    productHeightInput: document.querySelector("#productHeightInput"),
    shippingSelfPickup: document.querySelector("#shippingSelfPickup"),
    shippingSameDay: document.querySelector("#shippingSameDay"),
    shippingFast: document.querySelector("#shippingFast"),
    shippingExpress: document.querySelector("#shippingExpress"),
    preorderInputs: Array.from(
      document.querySelectorAll('input[name="productPreorder"]')
    ),
    productConditionInput: document.querySelector("#productConditionInput"),
    cancelProductDraft: document.querySelector("#cancelProductDraft"),
    resetProductDraft: document.querySelector("#resetProductDraft"),
    saveProductHidden: document.querySelector("#saveProductHidden"),
    saveProductVisible: document.querySelector("#saveProductVisible"),
    previewImage: document.querySelector("#previewImage"),
    previewImagePlaceholder: document.querySelector("#previewImagePlaceholder"),
    previewCategory: document.querySelector("#previewCategory"),
    previewName: document.querySelector("#previewName"),
    previewPrice: document.querySelector("#previewPrice"),
    previewShopName: document.querySelector("#previewShopName"),
    previewStock: document.querySelector("#previewStock"),
    previewDescription: document.querySelector("#previewDescription"),
    previewBadges: document.querySelector("#previewBadges"),
  };

  if (!els.shell) return;

  const createEmptyDraft = () => ({
    name: "",
    categoryId: "",
    gtin: "",
    description: "",
    price: "",
    stock: "0",
    sku: "",
    weight: "",
    length: "",
    width: "",
    height: "",
    condition: "new",
    preorder: "none",
    shipping: {
      selfPickup: false,
      sameDay: false,
      fast: true,
      express: false,
    },
    gallery: [],
    cover: null,
    video: null,
  });

  const state = {
    currentView: "dashboard",
    user: null,
    approvedShops: [],
    currentShopId: "",
    categories: [],
    products: [],
    orderItems: [],
    productFilters: {
      status: "all",
      search: "",
      categoryId: "",
      sort: "recent",
    },
    draft: createEmptyDraft(),
    statusTimer: 0,
    isSaving: false,
  };

  const getLoginRedirect = () => {
    const next = `${window.location.pathname}${window.location.search}`;
    return `/ui/login.html?next=${encodeURIComponent(next)}`;
  };

  const getSessionCandidates = () => [
    {
      source: "seller",
      base:
        localStorage.getItem(storageKeys.sellerBase) ||
        localStorage.getItem(storageKeys.userBase) ||
        window.location.origin,
      token: localStorage.getItem(storageKeys.sellerToken) || "",
      refresh:
        localStorage.getItem(storageKeys.sellerRefresh) ||
        localStorage.getItem(storageKeys.userRefresh) ||
        "",
    },
    {
      source: "user",
      base:
        localStorage.getItem(storageKeys.userBase) || window.location.origin,
      token: localStorage.getItem(storageKeys.userToken) || "",
      refresh: localStorage.getItem(storageKeys.userRefresh) || "",
    },
  ];

  const getActiveSession = () =>
    getSessionCandidates().find((session) => session.token) || {
      source: "seller",
      base: window.location.origin,
      token: "",
      refresh: "",
    };

  const getToken = () => getActiveSession().token;

  const clearAuth = () => {
    Object.values(storageKeys).forEach((key) => localStorage.removeItem(key));
  };

  const saveSession = (source, token, refreshToken, base) => {
    const isSeller = source === "seller";
    localStorage.setItem(
      isSeller ? storageKeys.sellerBase : storageKeys.userBase,
      base || window.location.origin
    );
    localStorage.setItem(
      isSeller ? storageKeys.sellerToken : storageKeys.userToken,
      token
    );
    localStorage.setItem(
      isSeller ? storageKeys.sellerRefresh : storageKeys.userRefresh,
      refreshToken
    );
  };

  const redirectToLogin = () => {
    window.location.href = getLoginRedirect();
  };

  const parseResponsePayload = async (response) => {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (_error) {
      return { message: text };
    }
  };

  let refreshPromise = null;

  const refreshSession = async () => {
    if (refreshPromise) return refreshPromise;

    const candidates = getSessionCandidates().filter(
      (candidate) => candidate.refresh
    );

    if (!candidates.length) {
      throw new Error("Phiên đăng nhập đã hết hạn.");
    }

    refreshPromise = (async () => {
      let lastError = new Error("Không thể làm mới phiên đăng nhập.");

      for (const candidate of candidates) {
        try {
          const response = await fetch(`${candidate.base}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: candidate.refresh }),
          });

          const payload = await parseResponsePayload(response);

          if (!response.ok || !payload.token || !payload.refresh_token) {
            throw new Error(
              payload.message || "Không thể làm mới phiên đăng nhập."
            );
          }

          saveSession(
            candidate.source,
            payload.token,
            payload.refresh_token,
            candidate.base
          );

          return {
            source: candidate.source,
            base: candidate.base,
            token: payload.token,
            refresh: payload.refresh_token,
          };
        } catch (error) {
          lastError =
            error instanceof Error
              ? error
              : new Error("Không thể làm mới phiên đăng nhập.");
        }
      }

      throw lastError;
    })();

    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  };

  const apiFetch = async (path, options = {}, config = {}) => {
    const { redirectOn401 = false, retryOn401 = true } = config;
    const session = getActiveSession();
    const headers = { ...(options.headers || {}) };
    let body = options.body;

    if (body && typeof body !== "string" && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }

    if (session.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    const response = await fetch(`${session.base}${path}`, {
      ...options,
      headers,
      body,
    });

    const payload = await parseResponsePayload(response);

    if (
      response.status === 401 &&
      retryOn401 &&
      path !== "/auth/refresh" &&
      session.token
    ) {
      try {
        const refreshed = await refreshSession();
        const retryHeaders = { ...(options.headers || {}) };
        let retryBody = options.body;

        if (
          retryBody &&
          typeof retryBody !== "string" &&
          !(retryBody instanceof FormData)
        ) {
          retryHeaders["Content-Type"] = "application/json";
          retryBody = JSON.stringify(retryBody);
        }

        retryHeaders.Authorization = `Bearer ${refreshed.token}`;

        const retryResponse = await fetch(`${refreshed.base}${path}`, {
          ...options,
          headers: retryHeaders,
          body: retryBody,
        });
        const retryPayload = await parseResponsePayload(retryResponse);

        if (!retryResponse.ok) {
          throw new Error(retryPayload.message || "Không thể tải dữ liệu.");
        }

        return retryPayload;
      } catch (error) {
        clearAuth();
        if (redirectOn401) {
          redirectToLogin();
        }
        throw (
          error instanceof Error
            ? error
            : new Error("Phiên đăng nhập đã hết hạn.")
        );
      }
    }

    if (!response.ok) {
      throw new Error(payload.message || "Không thể tải dữ liệu.");
    }

    return payload;
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const formatDate = (value) => {
    if (!value) return "Chưa có dữ liệu";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Chưa có dữ liệu";
    return DATE_FORMATTER.format(date);
  };

  const formatPrice = (value) => {
    const amount = Number(value);
    return Number.isFinite(amount) ? PRICE_FORMATTER.format(amount) : "0 đ";
  };

  const formatCompactNumber = (value) => {
    const amount = Number(value) || 0;
    return NUMBER_FORMATTER.format(Math.round(amount));
  };

  const toOptionalNumber = (value) => {
    if (value === null || value === undefined || value === "") return undefined;
    const amount = Number(value);
    return Number.isFinite(amount) ? amount : undefined;
  };

  const clampText = (value, maxLength) => {
    const text = String(value || "").trim();
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).trim()}…`;
  };

  const shortId = (value) => String(value || "").slice(0, 8).toUpperCase();

  const getInitial = (value) =>
    String(value || "").trim().charAt(0).toUpperCase() || "B";

  const getCurrentShop = () =>
    state.approvedShops.find((shop) => shop.id === state.currentShopId) || null;

  const getCategoryMap = () =>
    new Map(state.categories.map((item) => [String(item.id), item]));

  const getCategoryLabel = (categoryId) => {
    if (!categoryId) return "Chưa chọn ngành hàng";
    const category = getCategoryMap().get(String(categoryId));
    return category?.breadcrumb || category?.name || "Chưa chọn ngành hàng";
  };

  const getPrimaryVariant = (product) =>
    Array.isArray(product?.product_variants) && product.product_variants.length
      ? product.product_variants[0]
      : null;

  const getProductPrice = (product) => {
    const prices = (product?.product_variants || [])
      .map((variant) => Number(variant.price))
      .filter(Number.isFinite);
    return prices.length ? Math.min(...prices) : 0;
  };

  const getProductStock = (product) =>
    (product?.product_variants || []).reduce((total, variant) => {
      const stock = Number(variant.stock);
      return total + (Number.isFinite(stock) ? stock : 0);
    }, 0);

  const getCurrentShopOrders = () => {
    const productIds = new Set(state.products.map((product) => product.id));
    if (!productIds.size) return [];
    return state.orderItems.filter((item) =>
      productIds.has(item?.product_variants?.products?.id)
    );
  };

  const getOrderItemAmount = (item) => {
    const price = Number(item?.price);
    const quantity = Number(item?.quantity);
    return (Number.isFinite(price) ? price : 0) *
      (Number.isFinite(quantity) ? quantity : 0);
  };

  const getOrderStatusMeta = (status) => {
    switch (status) {
      case "pending":
        return { label: "Chờ xác nhận", className: "" };
      case "confirmed":
        return { label: "Đã xác nhận", className: "orange" };
      case "shipping":
        return { label: "Đang giao", className: "blue" };
      case "delivered":
        return { label: "Đã giao", className: "gray" };
      case "received":
        return { label: "Hoàn tất", className: "gray" };
      case "cancelled":
        return { label: "Đã hủy", className: "gray" };
      case "returned":
        return { label: "Hoàn trả", className: "gray" };
      default:
        return { label: status || "Không rõ", className: "gray" };
    }
  };

  const getProductStatusMeta = (status) =>
    status === "active"
      ? { label: "Đang hiển thị", className: "" }
      : { label: "Đang ẩn", className: "gray" };

  const getSellerOrderAction = (item) =>
    SELLER_ORDER_ACTIONS[item?.status] || null;

  const showStatus = (message, options = {}) => {
    if (!els.sellerStatus) return;

    const { error = false, persist = false } = options;
    window.clearTimeout(state.statusTimer);
    els.sellerStatus.textContent = message;
    els.sellerStatus.style.display = "block";
    els.sellerStatus.classList.toggle("error", Boolean(error));

    if (!persist) {
      state.statusTimer = window.setTimeout(() => {
        if (els.sellerStatus) {
          els.sellerStatus.style.display = "none";
        }
      }, error ? 6500 : 3800);
    }
  };

  const hideStatus = () => {
    if (!els.sellerStatus) return;
    window.clearTimeout(state.statusTimer);
    els.sellerStatus.style.display = "none";
  };

  const setSelectValue = (select, value) => {
    if (!select) return;
    select.value = value;
    window.BambiCustomSelect?.refreshSelect(select);
  };

  const updateViewChrome = () => {
    const meta = VIEW_META[state.currentView] || VIEW_META.dashboard;
    const currentShop = getCurrentShop();

    if (els.breadcrumb) els.breadcrumb.textContent = meta.breadcrumb;
    if (els.pageTitle) els.pageTitle.textContent = meta.title;
    if (els.pageSubtitle) {
      els.pageSubtitle.textContent = currentShop
        ? `${meta.subtitle} Shop đang chọn: ${currentShop.name}.`
        : meta.subtitle;
    }

    document.title = `${meta.title} | Bambi Seller`;
  };

  const setView = (view) => {
    const nextView = VIEW_META[view] ? view : "dashboard";
    state.currentView = nextView;

    els.sellerViews.forEach((section) => {
      const active = section.dataset.view === nextView;
      section.classList.toggle("hidden", !active);
    });

    els.sellerNavLinks.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.viewTarget === nextView
      );
    });

    updateViewChrome();

    const params = new URLSearchParams(window.location.search);
    params.set(VIEW_PARAM, nextView);
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}?${params.toString()}`
    );

    if (nextView === "products") renderProductsView();
    if (nextView === "new-product") renderDraft();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateUserInfo = () => {
    if (!state.user) return;

    const displayName =
      state.user.full_name || state.user.email || "Tài khoản seller";

    if (els.sellerUserName) els.sellerUserName.textContent = displayName;
    if (els.sellerUserRole) {
      els.sellerUserRole.textContent = state.approvedShops.length
        ? `${state.approvedShops.length} shop đã duyệt`
        : "Chờ duyệt seller";
    }
    if (els.sellerUserAvatar) {
      els.sellerUserAvatar.textContent = getInitial(displayName);
    }
  };

  const toggleApprovedContent = (hasApprovedShop) => {
    if (els.sellerEmptyState) {
      els.sellerEmptyState.classList.toggle("hidden", hasApprovedShop);
    }

    els.sellerViews.forEach((section) => {
      section.classList.toggle("hidden", !hasApprovedShop);
    });

    if (els.sellerShopSelect) {
      els.sellerShopSelect.disabled = !hasApprovedShop;
      window.BambiCustomSelect?.refreshSelect(els.sellerShopSelect);
    }

    if (els.reloadSellerData) els.reloadSellerData.disabled = !hasApprovedShop;
    if (els.reloadProductsView) {
      els.reloadProductsView.disabled = !hasApprovedShop;
    }

    if (!hasApprovedShop) {
      state.currentView = "dashboard";
      updateViewChrome();
    }
  };

  const populateShopSelect = () => {
    if (!els.sellerShopSelect) return;

    els.sellerShopSelect.innerHTML = state.approvedShops.length
      ? state.approvedShops
          .map(
            (shop) =>
              `<option value="${escapeHtml(shop.id)}">${escapeHtml(
                shop.name
              )}</option>`
          )
          .join("")
      : '<option value="">Chưa có shop đã duyệt</option>';

    if (
      !state.approvedShops.some((shop) => shop.id === state.currentShopId) &&
      state.approvedShops[0]
    ) {
      state.currentShopId = state.approvedShops[0].id;
    }

    setSelectValue(els.sellerShopSelect, state.currentShopId || "");
  };

  const populateCategorySelects = () => {
    const optionsHtml = state.categories
      .map(
        (category) =>
          `<option value="${category.id}">${escapeHtml(
            category.breadcrumb || category.name
          )}</option>`
      )
      .join("");

    if (els.productCategoryFilter) {
      els.productCategoryFilter.innerHTML = `
        <option value="">Tất cả ngành hàng</option>
        ${optionsHtml}
      `;
      setSelectValue(
        els.productCategoryFilter,
        state.productFilters.categoryId || ""
      );
    }

    if (els.productCategoryInput) {
      els.productCategoryInput.innerHTML = `
        <option value="">Chọn ngành hàng</option>
        ${optionsHtml}
      `;
      setSelectValue(els.productCategoryInput, state.draft.categoryId || "");
    }
  };

  const updateShopSummary = () => {
    const currentShop = getCurrentShop();
    const activeCount = state.products.filter(
      (product) => product.status === "active"
    ).length;
    const hiddenCount = state.products.filter(
      (product) => product.status !== "active"
    ).length;

    if (els.sellerShopSummaryName) {
      els.sellerShopSummaryName.textContent = currentShop
        ? currentShop.name
        : "Chưa có shop đã duyệt";
    }

    if (els.sellerShopSummaryMeta) {
      if (!currentShop) {
        els.sellerShopSummaryMeta.textContent =
          "Hoàn tất hồ sơ seller để mở Seller Studio.";
      } else {
        const contact =
          currentShop.contact_phone ||
          currentShop.contact_email ||
          "Chưa có liên hệ";
        els.sellerShopSummaryMeta.textContent = `Đã duyệt ${
          currentShop.approved_at
            ? `từ ${formatDate(currentShop.approved_at)}`
            : "và sẵn sàng bán hàng"
        } · ${activeCount} đang hiển thị · ${hiddenCount} đang ẩn · ${contact}`;
      }
    }
  };

  const getDashboardMetrics = () => {
    const products = state.products;
    const orders = getCurrentShopOrders();
    const activeProducts = products.filter(
      (product) => product.status === "active"
    );
    const hiddenProducts = products.filter(
      (product) => product.status !== "active"
    );
    const lowStockProducts = products.filter(
      (product) => getProductStock(product) > 0 && getProductStock(product) <= 5
    );
    const totalStock = products.reduce(
      (total, product) => total + getProductStock(product),
      0
    );
    const processingOrders = orders.filter((item) =>
      ["pending", "confirmed", "shipping"].includes(item.status)
    );
    const deliveredOrders = orders.filter((item) =>
      ["delivered", "received"].includes(item.status)
    );
    const grossRevenue = orders
      .filter((item) => !["cancelled", "returned"].includes(item.status))
      .reduce((total, item) => total + getOrderItemAmount(item), 0);
    const realizedRevenue = deliveredOrders.reduce(
      (total, item) => total + getOrderItemAmount(item),
      0
    );
    const averagePrice =
      products.length > 0
        ? products.reduce((total, product) => total + getProductPrice(product), 0) /
          products.length
        : 0;

    return {
      totalProducts: products.length,
      activeProducts: activeProducts.length,
      hiddenProducts: hiddenProducts.length,
      lowStockProducts: lowStockProducts.length,
      totalStock,
      orders: orders.length,
      processingOrders: processingOrders.length,
      deliveredOrders: deliveredOrders.length,
      grossRevenue,
      realizedRevenue,
      averagePrice,
    };
  };

  const renderRecentOrders = () => {
    if (!els.recentOrdersTable) return;

    const orders = getCurrentShopOrders().slice(0, 12);

    if (!orders.length) {
      els.recentOrdersTable.innerHTML = `
        <div class="seller-empty-block">
          Chưa có item đơn hàng nào gắn với shop đang chọn.
        </div>
      `;
      return;
    }

    els.recentOrdersTable.innerHTML = `
      <table class="seller-order-table">
        <thead>
          <tr>
            <th>Sản phẩm</th>
            <th>Mã đơn</th>
            <th>Trạng thái</th>
            <th>Số lượng</th>
            <th>Thành tiền</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${orders
            .map((item) => {
              const statusMeta = getOrderStatusMeta(item.status);
              const action = getSellerOrderAction(item);
              const productName =
                item?.product_variants?.products?.name || "Sản phẩm";
              const sku = item?.product_variants?.sku || "Chưa có SKU";

              return `
                <tr>
                  <td>
                    <div class="seller-product-name">
                      <strong>${escapeHtml(productName)}</strong>
                      <span class="muted">SKU: ${escapeHtml(sku)}</span>
                    </div>
                  </td>
                  <td>
                    <div class="seller-product-name">
                      <strong>#${escapeHtml(shortId(item?.orders?.id))}</strong>
                      <span class="muted">${escapeHtml(
                        formatDate(item?.orders?.created_at || item?.created_at)
                      )}</span>
                    </div>
                  </td>
                  <td>
                    <span class="chip ${escapeHtml(
                      statusMeta.className
                    )}">${escapeHtml(statusMeta.label)}</span>
                  </td>
                  <td>${escapeHtml(formatCompactNumber(item.quantity || 0))}</td>
                  <td>
                    <div class="seller-product-name">
                      <strong>${escapeHtml(
                        formatPrice(getOrderItemAmount(item))
                      )}</strong>
                      <span class="muted">${escapeHtml(
                        item?.orders?.payment_status || "pending"
                      )} · ${escapeHtml(
                        item?.orders?.payment_method || "cod"
                      )}</span>
                    </div>
                  </td>
                  <td>
                    ${
                      action
                        ? `<button
                             class="seller-mini-btn"
                             type="button"
                             data-action="advance-order"
                             data-item-id="${escapeHtml(item.id)}"
                             data-next-status="${escapeHtml(action.status)}"
                           >${escapeHtml(action.label)}</button>`
                        : '<span class="muted">Không có bước tiếp theo</span>'
                    }
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  };

  const renderDashboard = () => {
    const metrics = getDashboardMetrics();
    const currentShop = getCurrentShop();
    const processingRate =
      metrics.orders > 0
        ? Math.round((metrics.deliveredOrders / metrics.orders) * 100)
        : 0;

    if (els.dashboardHeroStats) {
      els.dashboardHeroStats.innerHTML = [
        {
          label: "Sản phẩm đang bán",
          value: formatCompactNumber(metrics.activeProducts),
          note: "Hiển thị với người mua ở storefront.",
        },
        {
          label: "Đơn cần xử lý",
          value: formatCompactNumber(metrics.processingOrders),
          note: "Bao gồm chờ xác nhận, bàn giao và đang giao.",
        },
        {
          label: "Sắp hết hàng",
          value: formatCompactNumber(metrics.lowStockProducts),
          note: "Những sản phẩm còn từ 1 đến 5 đơn vị trong kho.",
        },
        {
          label: "Tồn kho hiện có",
          value: formatCompactNumber(metrics.totalStock),
          note: currentShop
            ? `Đang xem dữ liệu của ${currentShop.name}.`
            : "Chưa chọn shop.",
        },
      ]
        .map(
          (item) => `
            <div class="seller-hero-stat">
              <span>${escapeHtml(item.label)}</span>
              <strong>${escapeHtml(item.value)}</strong>
              <div class="seller-summary-note">${escapeHtml(item.note)}</div>
            </div>
          `
        )
        .join("");
    }

    if (els.dashboardSummaryCards) {
      els.dashboardSummaryCards.innerHTML = [
        {
          title: "Tổng sản phẩm",
          value: formatCompactNumber(metrics.totalProducts),
          note: "Bao gồm sản phẩm đang hiển thị và đang ẩn.",
        },
        {
          title: "Đang ẩn",
          value: formatCompactNumber(metrics.hiddenProducts),
          note: "Có thể bật lại nhanh ở tab Sản phẩm.",
        },
        {
          title: "Doanh số tạm tính",
          value: formatPrice(metrics.realizedRevenue),
          note: "Tổng giá trị từ các item đã giao hoặc hoàn tất.",
        },
        {
          title: "Giá bán trung bình",
          value: formatPrice(metrics.averagePrice),
          note: "Tính trên biến thể đầu tiên của từng sản phẩm.",
        },
      ]
        .map(
          (item) => `
            <article class="seller-summary-card">
              <h3>${escapeHtml(item.title)}</h3>
              <span class="seller-summary-value">${escapeHtml(item.value)}</span>
              <div class="seller-summary-note">${escapeHtml(item.note)}</div>
            </article>
          `
        )
        .join("");
    }

    if (els.dashboardPerformance) {
      els.dashboardPerformance.innerHTML = [
        {
          title: "Đơn seller",
          value: formatCompactNumber(metrics.orders),
          note: "Tổng item đơn hàng thuộc shop đang chọn.",
        },
        {
          title: "Đơn đã giao",
          value: formatCompactNumber(metrics.deliveredOrders),
          note: "Các item đã đến bước giao xong hoặc hoàn tất.",
        },
        {
          title: "Tỷ lệ hoàn tất",
          value: `${formatCompactNumber(processingRate)}%`,
          note: "Tỷ lệ item đã giao trên tổng item seller đang có.",
        },
        {
          title: "Doanh số mở rộng",
          value: formatPrice(metrics.grossRevenue),
          note: "Tính trên toàn bộ item chưa bị hủy hoặc trả hàng.",
        },
      ]
        .map(
          (item) => `
            <article class="seller-metric-card">
              <h3>${escapeHtml(item.title)}</h3>
              <span class="seller-metric-value">${escapeHtml(item.value)}</span>
              <p>${escapeHtml(item.note)}</p>
            </article>
          `
        )
        .join("");
    }

    if (els.dashboardSuggestions) {
      const suggestions = [];

      if (!metrics.totalProducts) {
        suggestions.push({
          title: "Đăng sản phẩm đầu tiên",
          description:
            "Shop đã được duyệt nhưng chưa có sản phẩm nào. Mở form để tạo sản phẩm và biến thể đầu tiên.",
          button: "Mở form",
          target: "new-product",
        });
      }

      if (metrics.hiddenProducts > 0) {
        suggestions.push({
          title: `${formatCompactNumber(
            metrics.hiddenProducts
          )} sản phẩm đang ẩn`,
          description:
            "Rà soát các listing đã ẩn và bật lại khi đã đủ mô tả, giá hoặc tồn kho.",
          button: "Xem sản phẩm",
          target: "products",
        });
      }

      if (metrics.lowStockProducts > 0) {
        suggestions.push({
          title: "Một số sản phẩm sắp hết hàng",
          description:
            "Ưu tiên theo dõi tồn kho thấp để tránh listing vẫn hiển thị nhưng không đáp ứng đơn mới.",
          button: "Kiểm tra kho",
          target: "products",
        });
      }

      if (metrics.processingOrders > 0) {
        suggestions.push({
          title: "Có đơn cần xử lý ngay",
          description:
            "Xác nhận hoặc bàn giao đơn gần đây để không chậm tiến độ vận hành shop.",
          button: "Xem đơn",
          target: "dashboard",
        });
      }

      if (!state.categories.length) {
        suggestions.push({
          title: "Chưa có danh mục lá",
          description:
            "Admin cần khai báo taxonomy trước khi seller có thể tạo sản phẩm đúng ngành hàng.",
          button: "Tải lại",
          target: "dashboard",
        });
      }

      if (!suggestions.length) {
        suggestions.push({
          title: "Nhịp vận hành đang ổn",
          description:
            "Shop đã có đủ dữ liệu cơ bản. Bạn có thể tiếp tục mở rộng thêm listing mới.",
          button: "Thêm sản phẩm",
          target: "new-product",
        });
      }

      els.dashboardSuggestions.innerHTML = suggestions
        .map(
          (item) => `
            <article class="seller-suggestion-card">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="muted">${escapeHtml(item.description)}</span>
              <div>
                <button class="seller-mini-btn" type="button" data-view-target="${escapeHtml(
                  item.target
                )}">${escapeHtml(item.button)}</button>
              </div>
            </article>
          `
        )
        .join("");
    }

    renderRecentOrders();
  };

  const getFilteredProducts = () => {
    const query = state.productFilters.search.trim().toLowerCase();
    const categoryFilter = state.productFilters.categoryId;
    const statusFilter = state.productFilters.status;
    const sortBy = state.productFilters.sort;

    const filtered = state.products.filter((product) => {
      if (statusFilter !== "all" && product.status !== statusFilter) {
        return false;
      }

      if (categoryFilter && String(product.category_id) !== String(categoryFilter)) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystacks = [
        product.name,
        product.id,
        product.categories?.name,
        getCategoryLabel(product.category_id),
        ...(product.product_variants || []).map((variant) => variant.sku),
      ]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());

      return haystacks.some((value) => value.includes(query));
    });

    filtered.sort((left, right) => {
      if (sortBy === "price_desc") {
        return getProductPrice(right) - getProductPrice(left);
      }

      if (sortBy === "stock_desc") {
        return getProductStock(right) - getProductStock(left);
      }

      if (sortBy === "name_asc") {
        return String(left.name || "").localeCompare(String(right.name || ""), "vi");
      }

      return (
        new Date(right.created_at || 0).getTime() -
        new Date(left.created_at || 0).getTime()
      );
    });

    return filtered;
  };

  const renderProductTabs = () => {
    if (!els.productStatusTabs) return;

    const counts = {
      all: state.products.length,
      active: state.products.filter((product) => product.status === "active")
        .length,
      inactive: state.products.filter((product) => product.status !== "active")
        .length,
    };

    const labels = {
      all: "Tất cả",
      active: "Đang hoạt động",
      inactive: "Đang ẩn",
    };

    els.productStatusTabs.innerHTML = Object.keys(labels)
      .map(
        (status) => `
          <button
            class="seller-tab ${
              state.productFilters.status === status ? "active" : ""
            }"
            type="button"
            data-status="${status}"
          >
            ${escapeHtml(labels[status])} (${escapeHtml(
              formatCompactNumber(counts[status])
            )})
          </button>
        `
      )
      .join("");
  };

  const renderProductsView = () => {
    renderProductTabs();

    const filtered = getFilteredProducts();
    const activeCount = state.products.filter(
      (product) => product.status === "active"
    ).length;
    const hiddenCount = state.products.filter(
      (product) => product.status !== "active"
    ).length;

    if (els.productsSummary) {
      els.productsSummary.textContent = `${formatCompactNumber(
        filtered.length
      )}/${formatCompactNumber(state.products.length)} sản phẩm · ${formatCompactNumber(
        activeCount
      )} đang hiển thị · ${formatCompactNumber(hiddenCount)} đang ẩn`;
    }

    if (!els.productsTable) return;

    if (!state.products.length) {
      els.productsTable.innerHTML = `
        <div class="seller-empty-block">
          Shop chưa có sản phẩm nào. Hãy tạo listing đầu tiên để bắt đầu bán.
          <div class="seller-tag-row">
            <button class="seller-btn primary" type="button" data-view-target="new-product">
              Thêm 1 sản phẩm mới
            </button>
          </div>
        </div>
      `;
      return;
    }

    if (!filtered.length) {
      els.productsTable.innerHTML = `
        <div class="seller-empty-block">
          Không có sản phẩm phù hợp với bộ lọc hiện tại.
        </div>
      `;
      return;
    }

    els.productsTable.innerHTML = `
      <table class="seller-products-table">
        <thead>
          <tr>
            <th>Tên sản phẩm</th>
            <th>Ngành hàng</th>
            <th>Giá</th>
            <th>Kho</th>
            <th>Ngày tạo</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          ${filtered
            .map((product) => {
              const variant = getPrimaryVariant(product);
              const productStatus = getProductStatusMeta(product.status);
              return `
                <tr>
                  <td>
                    <div class="seller-product-name">
                      <strong>${escapeHtml(product.name || "Sản phẩm")}</strong>
                      <span class="muted">${escapeHtml(
                        product.description
                          ? clampText(product.description, 110)
                          : "Chưa có mô tả"
                      )}</span>
                      <div class="seller-tag-row">
                        <span class="chip ${escapeHtml(
                          productStatus.className
                        )}">${escapeHtml(productStatus.label)}</span>
                        <span class="chip gray">#${escapeHtml(
                          shortId(product.id)
                        )}</span>
                        ${
                          variant?.sku
                            ? `<span class="chip orange">SKU ${escapeHtml(
                                variant.sku
                              )}</span>`
                            : ""
                        }
                      </div>
                    </div>
                  </td>
                  <td>${escapeHtml(getCategoryLabel(product.category_id))}</td>
                  <td>${escapeHtml(formatPrice(getProductPrice(product)))}</td>
                  <td>${escapeHtml(formatCompactNumber(getProductStock(product)))}</td>
                  <td>${escapeHtml(formatDate(product.created_at))}</td>
                  <td>
                    <div class="seller-actions">
                      <button
                        class="seller-mini-btn ghost"
                        type="button"
                        data-action="duplicate-product"
                        data-product-id="${escapeHtml(product.id)}"
                      >
                        Sao chép
                      </button>
                      <button
                        class="seller-mini-btn ${
                          product.status === "active" ? "warn" : ""
                        }"
                        type="button"
                        data-action="toggle-product"
                        data-product-id="${escapeHtml(product.id)}"
                        data-next-status="${
                          product.status === "active" ? "inactive" : "active"
                        }"
                      >
                        ${product.status === "active" ? "Ẩn" : "Hiển thị"}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    `;
  };

  const buildChecklistItems = () => {
    const nameLength = state.draft.name.trim().length;
    const descriptionLength = state.draft.description.trim().length;
    const price = toOptionalNumber(state.draft.price);
    const stock = toOptionalNumber(state.draft.stock);

    return [
      {
        title: "Thêm ít nhất 3 hình ảnh",
        description: "Nên có bộ ảnh đủ góc nhìn trước khi hiển thị sản phẩm.",
        complete: state.draft.gallery.length >= 3,
      },
      {
        title: "Thêm video sản phẩm",
        description: "Video được tải lên và lưu cùng dữ liệu sản phẩm.",
        complete: Boolean(state.draft.video),
      },
      {
        title: "Tên sản phẩm đủ rõ",
        description: "Tiêu đề nên trong khoảng 25-120 ký tự.",
        complete: nameLength >= 25 && nameLength <= 120,
      },
      {
        title: "Mô tả có chiều sâu",
        description: "Nên từ 100 ký tự trở lên để listing đủ ngữ cảnh.",
        complete: descriptionLength >= 100,
      },
      {
        title: "Ngành hàng, giá và kho đã sẵn sàng",
        description: "Đây là các trường bắt buộc cho API tạo sản phẩm hiện tại.",
        complete:
          Boolean(state.draft.categoryId) &&
          Number.isFinite(price) &&
          price > 0 &&
          Number.isFinite(stock) &&
          stock >= 0,
      },
    ];
  };

  const renderChecklist = () => {
    if (!els.draftChecklist) return;
    els.draftChecklist.innerHTML = buildChecklistItems()
      .map(
        (item) => `
          <div class="seller-check-item ${item.complete ? "complete" : ""}">
            <span class="seller-check-icon">${item.complete ? "✓" : "•"}</span>
            <div class="seller-check-copy">
              <strong>${escapeHtml(item.title)}</strong>
              <span class="muted">${escapeHtml(item.description)}</span>
            </div>
          </div>
        `
      )
      .join("");
  };

  const revokeMedia = (item) => {
    if (item?.url && String(item.url).startsWith("blob:")) {
      URL.revokeObjectURL(item.url);
    }
  };

  const revokeAllDraftMedia = () => {
    state.draft.gallery.forEach(revokeMedia);
    revokeMedia(state.draft.cover);
    revokeMedia(state.draft.video);
  };

  const renderMediaPanels = () => {
    if (els.galleryPreview) {
      els.galleryPreview.innerHTML = state.draft.gallery.length
        ? state.draft.gallery
            .map(
              (item, index) => `
                <div class="seller-media-card">
                  <img src="${escapeHtml(item.url)}" alt="${escapeHtml(
                    item.name
                  )}" />
                  <button
                    class="seller-media-remove"
                    type="button"
                    data-action="remove-gallery"
                    data-media-id="${escapeHtml(item.id)}"
                    aria-label="Xóa ảnh"
                  >
                    ×
                  </button>
                  <div class="seller-media-foot">Ảnh ${escapeHtml(
                    String(index + 1)
                  )}</div>
                </div>
              `
            )
            .join("")
        : '<div class="seller-empty-copy">Chưa có ảnh nào trong bản nháp.</div>';
    }

    if (els.coverPreview) {
      els.coverPreview.innerHTML = state.draft.cover
        ? `
            <div class="seller-cover-card">
              <img src="${escapeHtml(state.draft.cover.url)}" alt="${escapeHtml(
                state.draft.cover.name
              )}" />
              <button
                class="seller-media-remove"
                type="button"
                data-action="remove-cover"
                aria-label="Xóa ảnh bìa"
              >
                ×
              </button>
              <div class="seller-media-foot">Ảnh bìa</div>
            </div>
          `
        : '<div class="seller-empty-copy">Chưa có ảnh bìa.</div>';
    }

    if (els.videoPreview) {
      els.videoPreview.innerHTML = state.draft.video
        ? `
            <div class="stack">
              <strong>${escapeHtml(state.draft.video.name)}</strong>
              <span class="muted">Video này sẽ được tải lên server khi bạn lưu sản phẩm.</span>
              <div>
                <button class="seller-mini-btn ghost" type="button" data-action="remove-video">
                  Xóa video
                </button>
              </div>
            </div>
          `
        : "Chưa có video";
    }
  };

  const renderPreview = () => {
    const previewImage =
      state.draft.cover?.url || state.draft.gallery[0]?.url || "";
    const currentShop = getCurrentShop();
    const badges = [];
    const description =
      state.draft.description.trim() ||
      "Mô tả ngắn của sản phẩm sẽ được cắt gọn để xem trước.";
    const price = toOptionalNumber(state.draft.price);
    const stock = toOptionalNumber(state.draft.stock);

    if (state.draft.condition) {
      badges.push(
        state.draft.condition === "new"
          ? "Hàng mới"
          : state.draft.condition === "like_new"
          ? "Gần như mới"
          : "Đã qua sử dụng"
      );
    }

    if (state.draft.preorder === "2days") badges.push("Đặt trước 2 ngày");
    if (state.draft.gtin.trim()) badges.push("Có GTIN");
    if (state.draft.shipping.selfPickup) badges.push("Tự nhận hàng");
    if (state.draft.shipping.sameDay) badges.push("Trong ngày");
    if (state.draft.shipping.fast) badges.push("Giao nhanh");
    if (state.draft.shipping.express) badges.push("Hỏa tốc");

    if (els.previewImage) {
      if (previewImage) {
        els.previewImage.src = previewImage;
        els.previewImage.hidden = false;
      } else {
        els.previewImage.removeAttribute("src");
        els.previewImage.hidden = true;
      }
    }

    if (els.previewImagePlaceholder) {
      els.previewImagePlaceholder.hidden = Boolean(previewImage);
    }

    if (els.previewCategory) {
      els.previewCategory.textContent = getCategoryLabel(state.draft.categoryId);
    }
    if (els.previewName) {
      els.previewName.textContent =
        state.draft.name.trim() || "Tên sản phẩm sẽ hiển thị tại đây";
    }
    if (els.previewPrice) {
      els.previewPrice.textContent =
        Number.isFinite(price) && price > 0 ? formatPrice(price) : "0 đ";
    }
    if (els.previewShopName) {
      els.previewShopName.textContent = currentShop?.name || "Shop";
    }
    if (els.previewStock) {
      els.previewStock.textContent = `Kho ${formatCompactNumber(
        Number.isFinite(stock) ? stock : 0
      )}`;
    }
    if (els.previewDescription) {
      els.previewDescription.textContent = clampText(description, 160);
    }
    if (els.previewBadges) {
      els.previewBadges.innerHTML = badges.length
        ? badges
            .map(
              (badge) =>
                `<span class="chip gray">${escapeHtml(String(badge))}</span>`
            )
            .join("")
        : '<span class="chip gray">Chưa có badge preview</span>';
    }
  };

  const renderDraft = () => {
    if (els.productNameCount) {
      els.productNameCount.textContent = `${state.draft.name.trim().length}/120`;
    }
    renderChecklist();
    renderMediaPanels();
    renderPreview();
  };

  const syncDraftToForm = () => {
    if (els.productNameInput) els.productNameInput.value = state.draft.name;
    if (els.productGtinInput) els.productGtinInput.value = state.draft.gtin;
    if (els.productDescriptionInput) {
      els.productDescriptionInput.value = state.draft.description;
    }
    if (els.productPriceInput) els.productPriceInput.value = state.draft.price;
    if (els.productStockInput) els.productStockInput.value = state.draft.stock;
    if (els.productSkuInput) els.productSkuInput.value = state.draft.sku;
    if (els.productWeightInput) {
      els.productWeightInput.value = state.draft.weight;
    }
    if (els.productLengthInput) {
      els.productLengthInput.value = state.draft.length;
    }
    if (els.productWidthInput) els.productWidthInput.value = state.draft.width;
    if (els.productHeightInput) {
      els.productHeightInput.value = state.draft.height;
    }

    if (els.shippingSelfPickup) {
      els.shippingSelfPickup.checked = state.draft.shipping.selfPickup;
    }
    if (els.shippingSameDay) {
      els.shippingSameDay.checked = state.draft.shipping.sameDay;
    }
    if (els.shippingFast) {
      els.shippingFast.checked = state.draft.shipping.fast;
    }
    if (els.shippingExpress) {
      els.shippingExpress.checked = state.draft.shipping.express;
    }

    els.preorderInputs.forEach((input) => {
      input.checked = input.value === state.draft.preorder;
    });

    setSelectValue(els.productCategoryInput, state.draft.categoryId || "");
    setSelectValue(els.productConditionInput, state.draft.condition || "new");
    renderDraft();
  };

  const resetDraft = () => {
    revokeAllDraftMedia();
    state.draft = createEmptyDraft();
    if (els.galleryInput) els.galleryInput.value = "";
    if (els.coverInput) els.coverInput.value = "";
    if (els.videoInput) els.videoInput.value = "";
    syncDraftToForm();
  };

  const toRemoteMedia = (url, fallbackName) => {
    const value = String(url || "").trim();
    if (!value) return null;
    const fileName = value.split("/").filter(Boolean).pop() || fallbackName;
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: fileName,
      url: value,
      file: null,
      serverUrl: value,
    };
  };

  const prefillDraftFromProduct = (productId) => {
    const product = state.products.find((item) => item.id === productId);
    if (!product) {
      showStatus("Không tìm thấy sản phẩm để sao chép.", { error: true });
      return;
    }

    const variant = getPrimaryVariant(product);
    const gallery = Array.isArray(product.media_gallery)
      ? product.media_gallery
          .map((url, index) => toRemoteMedia(url, `gallery-${index + 1}`))
          .filter(Boolean)
      : [];

    revokeAllDraftMedia();
    state.draft = {
      ...createEmptyDraft(),
      name: clampText(`${product.name} - Bản sao`, 120),
      categoryId: product.category_id ? String(product.category_id) : "",
      gtin: product.gtin || "",
      description: product.description || "",
      price: variant?.price ? String(Number(variant.price) || "") : "",
      stock: String(getProductStock(product)),
      weight:
        variant?.weight !== undefined && variant?.weight !== null
          ? String(Number(variant.weight) || 0)
          : "",
      length:
        product.length_cm !== undefined && product.length_cm !== null
          ? String(product.length_cm)
          : "",
      width:
        product.width_cm !== undefined && product.width_cm !== null
          ? String(product.width_cm)
          : "",
      height:
        product.height_cm !== undefined && product.height_cm !== null
          ? String(product.height_cm)
          : "",
      condition: product.condition || "new",
      sku: "",
      gallery,
      cover: toRemoteMedia(product.cover_image_url, "cover"),
      video: toRemoteMedia(product.video_url, "video"),
    };
    syncDraftToForm();
    setView("new-product");
    showStatus("Đã nạp dữ liệu sản phẩm vào form tạo mới.");
  };

  const setFormBusy = (busy) => {
    state.isSaving = busy;
    if (els.saveProductHidden) els.saveProductHidden.disabled = busy;
    if (els.saveProductVisible) els.saveProductVisible.disabled = busy;
    if (els.resetProductDraft) els.resetProductDraft.disabled = busy;
    if (els.cancelProductDraft) els.cancelProductDraft.disabled = busy;
  };

  const validateDraft = () => {
    if (!state.currentShopId) {
      return "Chưa có shop đã duyệt để tạo sản phẩm.";
    }

    if (!state.draft.name.trim()) {
      return "Vui lòng nhập tên sản phẩm.";
    }

    if (!state.draft.categoryId) {
      return "Vui lòng chọn ngành hàng.";
    }

    const price = toOptionalNumber(state.draft.price);
    if (!Number.isFinite(price) || price <= 0) {
      return "Giá bán phải lớn hơn 0.";
    }

    const stock = toOptionalNumber(state.draft.stock);
    if (!Number.isFinite(stock) || stock < 0) {
      return "Kho hàng phải từ 0 trở lên.";
    }

    return "";
  };

  const uploadDraftMedia = async () => {
    const galleryFiles = state.draft.gallery.filter((item) => item?.file);
    const coverFile = state.draft.cover?.file ? state.draft.cover.file : null;
    const videoFile = state.draft.video?.file ? state.draft.video.file : null;

    if (!galleryFiles.length && !coverFile && !videoFile) {
      return {
        gallery: [],
        cover_image_url: null,
        video_url: null,
      };
    }

    const formData = new FormData();
    galleryFiles.forEach((item) => formData.append("gallery", item.file));
    if (coverFile) formData.append("cover", coverFile);
    if (videoFile) formData.append("video", videoFile);

    const payload = await apiFetch(
      "/products/media/upload",
      {
        method: "POST",
        body: formData,
      },
      { redirectOn401: true }
    );

    return payload?.media || {
      gallery: [],
      cover_image_url: null,
      video_url: null,
    };
  };

  const saveDraftAsProduct = async (status) => {
    const validationMessage = validateDraft();
    if (validationMessage) {
      showStatus(validationMessage, { error: true });
      return;
    }

    const variantPayload = {
      price: Number(state.draft.price),
      stock: Math.max(0, Math.floor(Number(state.draft.stock) || 0)),
      sku: state.draft.sku.trim() || undefined,
      weight: toOptionalNumber(state.draft.weight),
    };

    setFormBusy(true);
    showStatus("Đang tạo sản phẩm mới...", { persist: true });

    try {
      const uploadedMedia = await uploadDraftMedia();
      const existingGallery = state.draft.gallery
        .map((item) => item?.serverUrl || "")
        .filter(Boolean);

      const payload = {
        name: state.draft.name.trim(),
        description: state.draft.description.trim(),
        category_id: Number(state.draft.categoryId),
        gtin: state.draft.gtin.trim() || undefined,
        condition: state.draft.condition || "new",
        length_cm: toOptionalNumber(state.draft.length),
        width_cm: toOptionalNumber(state.draft.width),
        height_cm: toOptionalNumber(state.draft.height),
        cover_image_url:
          uploadedMedia.cover_image_url ||
          state.draft.cover?.serverUrl ||
          undefined,
        video_url:
          uploadedMedia.video_url ||
          state.draft.video?.serverUrl ||
          undefined,
        media_gallery: [...existingGallery, ...(uploadedMedia.gallery || [])],
        status,
        shop_id: state.currentShopId,
      };

      const productResponse = await apiFetch(
        "/products",
        {
          method: "POST",
          body: payload,
        },
        { redirectOn401: true }
      );

      const productId = productResponse?.product?.id;
      if (!productId) {
        throw new Error("Không nhận được mã sản phẩm mới.");
      }

      try {
        await apiFetch(
          `/products/${productId}/variants`,
          {
            method: "POST",
            body: variantPayload,
          },
          { redirectOn401: true }
        );
      } catch (variantError) {
        await Promise.all([loadProducts(), loadOrders()]);
        renderAll();
        setView("products");
        throw new Error(
          `Sản phẩm đã được tạo nhưng chưa thêm được biến thể đầu tiên: ${
            variantError instanceof Error
              ? variantError.message
              : "Không rõ lỗi"
          }`
        );
      }

      resetDraft();
      await Promise.all([loadProducts(), loadOrders()]);
      renderAll();
      setView("products");
      showStatus(
        status === "active"
          ? "Đã tạo và hiển thị sản phẩm mới."
          : "Đã lưu sản phẩm ở trạng thái ẩn."
      );
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể tạo sản phẩm.",
        { error: true }
      );
    } finally {
      setFormBusy(false);
    }
  };

  const updateProductStatus = async (productId, nextStatus, button) => {
    if (!productId || !nextStatus) return;

    const originalText = button?.textContent || "";
    if (button) {
      button.disabled = true;
      button.textContent = "Đang lưu...";
    }

    try {
      await apiFetch(
        `/products/${productId}`,
        {
          method: "PATCH",
          body: { status: nextStatus },
        },
        { redirectOn401: true }
      );

      await loadProducts();
      renderAll();
      showStatus(
        nextStatus === "active"
          ? "Sản phẩm đã được bật hiển thị."
          : "Sản phẩm đã được chuyển sang trạng thái ẩn."
      );
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể cập nhật sản phẩm.",
        { error: true }
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  };

  const updateOrderStatus = async (itemId, nextStatus, button) => {
    if (!itemId || !nextStatus) return;

    const originalText = button?.textContent || "";
    if (button) {
      button.disabled = true;
      button.textContent = "Đang cập nhật...";
    }

    try {
      await apiFetch(
        `/orders/items/${itemId}/status`,
        {
          method: "PATCH",
          body: { status: nextStatus },
        },
        { redirectOn401: true }
      );
      await loadOrders();
      renderDashboard();
      showStatus("Đã cập nhật trạng thái đơn hàng.");
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể cập nhật đơn hàng.",
        { error: true }
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  };

  const loadMe = async () => {
    const payload = await apiFetch("/auth/me", {}, { redirectOn401: true });
    state.user = payload.user || null;
    updateUserInfo();
  };

  const loadShops = async () => {
    const payload = await apiFetch("/shops/me", {}, { redirectOn401: true });
    const shops = payload?.shops?.data || [];
    state.approvedShops = shops.filter((shop) => shop?.status === "approved");

    const preferredShopId = localStorage.getItem(SHOP_PREF_KEY) || "";
    state.currentShopId =
      state.approvedShops.find((shop) => shop.id === preferredShopId)?.id ||
      state.approvedShops[0]?.id ||
      "";

    populateShopSelect();
    updateUserInfo();
    toggleApprovedContent(Boolean(state.approvedShops.length));
  };

  const loadCategories = async () => {
    const payload = await apiFetch("/categories?leaf_only=true", {}, {});
    state.categories = Array.isArray(payload?.data) ? payload.data : [];
    populateCategorySelects();
    renderDraft();
  };

  const loadProducts = async () => {
    if (!state.currentShopId) {
      state.products = [];
      return;
    }

    const shopId = encodeURIComponent(state.currentShopId);
    const [activePayload, inactivePayload] = await Promise.all([
      apiFetch(`/products?shop_id=${shopId}&status=active&limit=100`, {}, {}),
      apiFetch(`/products?shop_id=${shopId}&status=inactive&limit=100`, {}, {}),
    ]);

    const merged = new Map();
    [...(activePayload?.data || []), ...(inactivePayload?.data || [])].forEach(
      (product) => merged.set(product.id, product)
    );

    state.products = Array.from(merged.values()).sort(
      (left, right) =>
        new Date(right.created_at || 0).getTime() -
        new Date(left.created_at || 0).getTime()
    );
  };

  const loadOrders = async () => {
    const payload = await apiFetch("/orders/seller/items?limit=20", {}, {
      redirectOn401: true,
    });
    state.orderItems = payload?.items?.data || [];
  };

  const renderAll = () => {
    updateShopSummary();
    updateViewChrome();
    renderDashboard();
    renderProductsView();
    renderDraft();
  };

  const loadSellerData = async (options = {}) => {
    const { silent = false } = options;

    if (!state.currentShopId) {
      state.products = [];
      state.orderItems = [];
      renderAll();
      return;
    }

    if (!silent) {
      showStatus("Đang đồng bộ Seller Studio...", { persist: true });
    }

    try {
      await Promise.all([loadCategories(), loadProducts(), loadOrders()]);
      renderAll();
      if (!silent) {
        showStatus("Đã đồng bộ dữ liệu seller.");
      } else {
        hideStatus();
      }
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể tải dữ liệu seller.",
        { error: true }
      );
    }
  };

  const syncActiveFormTab = () => {
    if (state.currentView !== "new-product") return;

    const sections = els.formTabButtons
      .map((button) => ({
        button,
        section: document.querySelector(`#${button.dataset.scrollTarget}`),
      }))
      .filter((item) => item.section);

    if (!sections.length) return;

    let activeTarget = sections[0].button.dataset.scrollTarget;
    let closestDistance = Number.POSITIVE_INFINITY;

    sections.forEach(({ button, section }) => {
      const distance = Math.abs(section.getBoundingClientRect().top - 150);
      if (distance < closestDistance) {
        closestDistance = distance;
        activeTarget = button.dataset.scrollTarget;
      }
    });

    els.formTabButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.scrollTarget === activeTarget
      );
    });
  };

  const bindInputEvents = () => {
    els.productSearch?.addEventListener("input", (event) => {
      state.productFilters.search = event.target.value || "";
      renderProductsView();
    });

    els.productCategoryFilter?.addEventListener("change", (event) => {
      state.productFilters.categoryId = event.target.value || "";
      renderProductsView();
    });

    els.productSort?.addEventListener("change", (event) => {
      state.productFilters.sort = event.target.value || "recent";
      renderProductsView();
    });

    els.productNameInput?.addEventListener("input", (event) => {
      state.draft.name = event.target.value || "";
      renderDraft();
    });

    els.productCategoryInput?.addEventListener("change", (event) => {
      state.draft.categoryId = event.target.value || "";
      renderDraft();
    });

    els.productGtinInput?.addEventListener("input", (event) => {
      state.draft.gtin = event.target.value || "";
      renderDraft();
    });

    els.productDescriptionInput?.addEventListener("input", (event) => {
      state.draft.description = event.target.value || "";
      renderDraft();
    });

    els.productPriceInput?.addEventListener("input", (event) => {
      state.draft.price = event.target.value || "";
      renderDraft();
    });

    els.productStockInput?.addEventListener("input", (event) => {
      state.draft.stock = event.target.value || "0";
      renderDraft();
    });

    els.productSkuInput?.addEventListener("input", (event) => {
      state.draft.sku = event.target.value || "";
      renderDraft();
    });

    els.productWeightInput?.addEventListener("input", (event) => {
      state.draft.weight = event.target.value || "";
      renderDraft();
    });

    els.productLengthInput?.addEventListener("input", (event) => {
      state.draft.length = event.target.value || "";
      renderDraft();
    });

    els.productWidthInput?.addEventListener("input", (event) => {
      state.draft.width = event.target.value || "";
      renderDraft();
    });

    els.productHeightInput?.addEventListener("input", (event) => {
      state.draft.height = event.target.value || "";
      renderDraft();
    });

    els.productConditionInput?.addEventListener("change", (event) => {
      state.draft.condition = event.target.value || "new";
      renderDraft();
    });

    els.shippingSelfPickup?.addEventListener("change", (event) => {
      state.draft.shipping.selfPickup = Boolean(event.target.checked);
      renderDraft();
    });

    els.shippingSameDay?.addEventListener("change", (event) => {
      state.draft.shipping.sameDay = Boolean(event.target.checked);
      renderDraft();
    });

    els.shippingFast?.addEventListener("change", (event) => {
      state.draft.shipping.fast = Boolean(event.target.checked);
      renderDraft();
    });

    els.shippingExpress?.addEventListener("change", (event) => {
      state.draft.shipping.express = Boolean(event.target.checked);
      renderDraft();
    });

    els.preorderInputs.forEach((input) => {
      input.addEventListener("change", (event) => {
        if (event.target.checked) {
          state.draft.preorder = event.target.value || "none";
          renderDraft();
        }
      });
    });

    els.sellerShopSelect?.addEventListener("change", async (event) => {
      const nextShopId = event.target.value || "";
      if (!nextShopId || nextShopId === state.currentShopId) return;
      state.currentShopId = nextShopId;
      localStorage.setItem(SHOP_PREF_KEY, nextShopId);
      updateShopSummary();
      renderDraft();
      await loadSellerData();
    });
  };

  const toLocalMedia = (file) => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    url: URL.createObjectURL(file),
    file,
    serverUrl: null,
    size: file.size,
    type: file.type,
  });

  const bindMediaEvents = () => {
    els.triggerGalleryUpload?.addEventListener("click", () => {
      els.galleryInput?.click();
    });

    els.triggerCoverUpload?.addEventListener("click", () => {
      els.coverInput?.click();
    });

    els.triggerVideoUpload?.addEventListener("click", () => {
      els.videoInput?.click();
    });

    els.galleryInput?.addEventListener("change", (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;

      const remainingSlots = Math.max(0, 9 - state.draft.gallery.length);
      const incoming = files.slice(0, remainingSlots).map(toLocalMedia);
      state.draft.gallery = [...state.draft.gallery, ...incoming];

      if (files.length > remainingSlots) {
        showStatus("Gallery chỉ hỗ trợ tối đa 9 ảnh cho mỗi sản phẩm.", {
          error: true,
        });
      }

      event.target.value = "";
      renderDraft();
    });

    els.coverInput?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      revokeMedia(state.draft.cover);
      state.draft.cover = toLocalMedia(file);
      event.target.value = "";
      renderDraft();
    });

    els.videoInput?.addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      revokeMedia(state.draft.video);
      state.draft.video = toLocalMedia(file);
      event.target.value = "";
      renderDraft();
    });
  };

  const bindDocumentEvents = () => {
    document.addEventListener("click", async (event) => {
      const viewButton = event.target.closest("[data-view-target]");
      if (viewButton && state.approvedShops.length) {
        event.preventDefault();
        setView(viewButton.dataset.viewTarget || "dashboard");
        return;
      }

      const productTab = event.target.closest("#productStatusTabs [data-status]");
      if (productTab) {
        state.productFilters.status = productTab.dataset.status || "all";
        renderProductsView();
        return;
      }

      const scrollTab = event.target.closest(
        "#sellerFormTabs [data-scroll-target]"
      );
      if (scrollTab) {
        const targetId = scrollTab.dataset.scrollTarget;
        const section = targetId
          ? document.querySelector(`#${targetId}`)
          : null;
        if (section) {
          els.formTabButtons.forEach((button) => {
            button.classList.toggle(
              "active",
              button.dataset.scrollTarget === targetId
            );
          });
          section.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) return;

      const action = actionButton.dataset.action;

      if (action === "duplicate-product") {
        prefillDraftFromProduct(actionButton.dataset.productId);
        return;
      }

      if (action === "toggle-product") {
        await updateProductStatus(
          actionButton.dataset.productId,
          actionButton.dataset.nextStatus,
          actionButton
        );
        return;
      }

      if (action === "advance-order") {
        await updateOrderStatus(
          actionButton.dataset.itemId,
          actionButton.dataset.nextStatus,
          actionButton
        );
        return;
      }

      if (action === "remove-gallery") {
        const mediaId = actionButton.dataset.mediaId;
        const media = state.draft.gallery.find((item) => item.id === mediaId);
        revokeMedia(media);
        state.draft.gallery = state.draft.gallery.filter(
          (item) => item.id !== mediaId
        );
        renderDraft();
        return;
      }

      if (action === "remove-cover") {
        revokeMedia(state.draft.cover);
        state.draft.cover = null;
        renderDraft();
        return;
      }

      if (action === "remove-video") {
        revokeMedia(state.draft.video);
        state.draft.video = null;
        renderDraft();
      }
    });

    els.reloadSellerData?.addEventListener("click", async () => {
      await loadSellerData();
    });

    els.reloadProductsView?.addEventListener("click", async () => {
      await loadProducts();
      renderAll();
      showStatus("Đã tải lại danh sách sản phẩm.");
    });

    els.clearProductFilters?.addEventListener("click", () => {
      state.productFilters = {
        status: "all",
        search: "",
        categoryId: "",
        sort: "recent",
      };
      if (els.productSearch) els.productSearch.value = "";
      setSelectValue(els.productCategoryFilter, "");
      setSelectValue(els.productSort, "recent");
      renderProductsView();
    });

    els.cancelProductDraft?.addEventListener("click", () => {
      setView("products");
    });

    els.resetProductDraft?.addEventListener("click", () => {
      const shouldReset = window.confirm(
        "Xóa toàn bộ dữ liệu bản nháp hiện tại?"
      );
      if (!shouldReset) return;
      resetDraft();
      showStatus("Đã làm lại form sản phẩm.");
    });

    els.saveProductHidden?.addEventListener("click", async () => {
      await saveDraftAsProduct("inactive");
    });

    els.saveProductVisible?.addEventListener("click", async () => {
      await saveDraftAsProduct("active");
    });

    els.logoutSeller?.addEventListener("click", () => {
      clearAuth();
      redirectToLogin();
    });

    document.addEventListener("scroll", syncActiveFormTab, { passive: true });
    window.addEventListener("beforeunload", revokeAllDraftMedia);
  };

  const bootstrap = async () => {
    if (!getToken()) {
      redirectToLogin();
      return;
    }

    bindInputEvents();
    bindMediaEvents();
    bindDocumentEvents();

    try {
      showStatus("Đang tải Seller Studio...", { persist: true });
      await Promise.all([loadMe(), loadShops()]);
      updateShopSummary();

      if (!state.approvedShops.length) {
        hideStatus();
        return;
      }

      localStorage.setItem(SHOP_PREF_KEY, state.currentShopId);
      await loadSellerData({ silent: true });

      const viewFromUrl = new URLSearchParams(window.location.search).get(
        VIEW_PARAM
      );
      setView(VIEW_META[viewFromUrl] ? viewFromUrl : "dashboard");
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể khởi tạo Seller Studio.",
        { error: true }
      );
    }
  };

  bootstrap();
})();
