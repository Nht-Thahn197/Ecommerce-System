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
  const datetimePickers = new Map();
  let activeDatetimePicker = null;

  const VIEW_META = {
    dashboard: {
      breadcrumb: "Trang chủ / Tổng quan",
      title: "Kênh Người Bán",
    },
    products: {
      breadcrumb: "Trang chủ / Sản phẩm",
      title: "Sản phẩm",
    },
    "shop-promotions": {
      breadcrumb: "Trang ch\u1ee7 / Marketing / Khuy\u1ebfn m\u00e3i c\u1ee7a shop",
      title: "Khuy\u1ebfn m\u00e3i c\u1ee7a shop",
    },
    "finance-revenue": {
      breadcrumb: "Trang chủ / Tài chính / Doanh thu",
      title: "Doanh thu",
    },
    "finance-wallet": {
      breadcrumb: "Trang chủ / Tài chính / Số dư tk Bambi",
      title: "Số dư tk Bambi",
    },
    "finance-bank": {
      breadcrumb: "Trang chủ / Tài chính / Tài khoản ngân hàng",
      title: "Tài khoản ngân hàng",
    },
    "new-product": {
      breadcrumb: "Trang chủ / Sản phẩm / Thêm 1 sản phẩm mới",
      title: "Thêm 1 sản phẩm mới",
    },
    "orders-all": {
      breadcrumb: "Trang chủ / Đơn hàng / Tất cả",
      title: "Quản lý đơn hàng",
    },
    "orders-returns": {
      breadcrumb: "Trang chủ / Đơn hàng / Trả hàng & Hủy",
      title: "Trả hàng/Hoàn tiền",
    },
    "shipping-settings": {
      breadcrumb: "Trang chủ / Đơn hàng / Cài đặt vận chuyển",
      title: "Cài đặt vận chuyển",
    },
    "shop-profile": {
      breadcrumb: "Trang chủ / Hồ sơ shop",
      title: "Hồ sơ shop",
    },
  };

  const SELLER_ORDER_ACTIONS = {
    pending: { label: "Xác nhận", status: "confirmed" },
    confirmed: { label: "Bàn giao", status: "shipping" },
    shipping: { label: "Đánh dấu giao", status: "delivered" },
  };

  const ORDER_FILTER_GROUPS = {
    all: [
      { id: "all", label: "Tất cả", match: () => true },
      { id: "pending", label: "Chờ xác nhận", match: (item) => item?.status === "pending" },
      { id: "confirmed", label: "Chờ lấy hàng", match: (item) => item?.status === "confirmed" },
      { id: "shipping", label: "Đang giao", match: (item) => item?.status === "shipping" },
      { id: "delivered", label: "Đã giao", match: (item) => item?.status === "delivered" },
      { id: "received", label: "Hoàn thành", match: (item) => item?.status === "received" },
      {
        id: "returns",
        label: "Trả hàng/Hoàn tiền/Hủy",
        match: (item) => ["returned", "cancelled"].includes(item?.status),
      },
    ],
    returns: [
      {
        id: "all",
        label: "Tất cả",
        match: (item) => ["returned", "cancelled"].includes(item?.status),
      },
      { id: "returned", label: "Trả hàng/Hoàn tiền", match: (item) => item?.status === "returned" },
      { id: "cancelled", label: "Đơn hủy", match: (item) => item?.status === "cancelled" },
    ],
  };

  const SHIPPING_METHODS = [
    {
      key: "express",
      label: "Hỏa tốc",
      description: "Phù hợp đơn cần giao gấp trong nội thành.",
    },
    {
      key: "standard",
      label: "Nhanh",
      description: "Luồng giao tiêu chuẩn cho đa số đơn hàng.",
    },
    {
      key: "economy",
      label: "Tiết kiệm",
      description: "Chi phí thấp, phù hợp đơn không gấp.",
    },
    {
      key: "selfPickup",
      label: "Tự nhận hàng",
      description: "Người mua tự nhận tại địa điểm của shop.",
    },
  ];

  const els = {
    shell: document.querySelector(".seller-shell"),
    breadcrumb: document.querySelector("#sellerBreadcrumb"),
    pageTitle: document.querySelector("#sellerPageTitle"),
    sellerStatus: document.querySelector("#sellerStatus"),
    sellerEmptyState: document.querySelector("#sellerEmptyState"),
    sellerViews: Array.from(document.querySelectorAll(".seller-view")),
    shopPromotionsView: document.querySelector(
      '.seller-view[data-view="shop-promotions"]'
    ),
    financeRevenueView: document.querySelector(
      '.seller-view[data-view="finance-revenue"]'
    ),
    financeWalletView: document.querySelector(
      '.seller-view[data-view="finance-wallet"]'
    ),
    financeBankView: document.querySelector(
      '.seller-view[data-view="finance-bank"]'
    ),
    sellerNavLinks: Array.from(
      document.querySelectorAll(".seller-nav-link[data-view-target]")
    ),
    reloadProductsView: document.querySelector("#reloadProductsView"),
    sellerUserAvatar: document.querySelector("#sellerUserAvatar"),
    sellerUserName: document.querySelector("#sellerUserName"),
    dashboardHeroStats: document.querySelector("#dashboardHeroStats"),
    dashboardSummaryCards: document.querySelector("#dashboardSummaryCards"),
    dashboardPerformance: document.querySelector("#dashboardPerformance"),
    dashboardSuggestions: document.querySelector("#dashboardSuggestions"),
    recentOrdersTable: document.querySelector("#recentOrdersTable"),
    ordersAllTabs: document.querySelector("#ordersAllTabs"),
    ordersAllSummary: document.querySelector("#ordersAllSummary"),
    ordersAllTable: document.querySelector("#ordersAllTable"),
    ordersAllEmpty: document.querySelector("#ordersAllEmpty"),
    ordersAllShopLabel: document.querySelector("#ordersAllShopLabel"),
    ordersReturnsTabs: document.querySelector("#ordersReturnsTabs"),
    ordersReturnsSummary: document.querySelector("#ordersReturnsSummary"),
    ordersReturnsTable: document.querySelector("#ordersReturnsTable"),
    ordersReturnsEmpty: document.querySelector("#ordersReturnsEmpty"),
    ordersReturnsShopLabel: document.querySelector("#ordersReturnsShopLabel"),
    reloadOrdersAll: document.querySelector("#reloadOrdersAll"),
    reloadOrdersReturns: document.querySelector("#reloadOrdersReturns"),
    shippingSettingsContent: document.querySelector("#shippingSettingsContent"),
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
    productCategoryTrigger: document.querySelector("#productCategoryTrigger"),
    productCategoryValue: document.querySelector("#productCategoryValue"),
    productCategoryMeta: document.querySelector("#productCategoryMeta"),
    productGtinInput: document.querySelector("#productGtinInput"),
    productDescriptionInput: document.querySelector("#productDescriptionInput"),
    productPriceInput: document.querySelector("#productPriceInput"),
    productStockInput: document.querySelector("#productStockInput"),
    enableVariantGroupsBtn: document.querySelector("#enableVariantGroupsBtn"),
    addSecondVariantGroupBtn: document.querySelector("#addSecondVariantGroupBtn"),
    multiVariantSection: document.querySelector("#multiVariantSection"),
    variantGroupsEditor: document.querySelector("#variantGroupsEditor"),
    variantMatrixTable: document.querySelector("#variantMatrixTable"),
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
    previewVariantSummary: document.querySelector("#previewVariantSummary"),
    previewShopName: document.querySelector("#previewShopName"),
    previewStock: document.querySelector("#previewStock"),
    previewDescription: document.querySelector("#previewDescription"),
    previewBadges: document.querySelector("#previewBadges"),
    categoryPickerModal: document.querySelector("#categoryPickerModal"),
    categoryPickerSearch: document.querySelector("#categoryPickerSearch"),
    categoryPickerResults: document.querySelector("#categoryPickerResults"),
    categoryPickerColumns: document.querySelector("#categoryPickerColumns"),
    categoryPickerSelected: document.querySelector("#categoryPickerSelected"),
    closeCategoryPicker: document.querySelector("#closeCategoryPicker"),
    cancelCategoryPicker: document.querySelector("#cancelCategoryPicker"),
    confirmCategoryPicker: document.querySelector("#confirmCategoryPicker"),
    shopVoucherStats: null,
    shopVoucherQuery: null,
    shopVoucherStatusFilter: null,
    reloadShopVouchers: null,
    shopVoucherCountLabel: null,
    shopVoucherTable: null,
    shopVoucherForm: null,
    shopVoucherFormTitle: null,
    shopVoucherFormDescription: null,
    shopVoucherModeTag: null,
    shopVoucherId: null,
    shopVoucherCode: null,
    shopVoucherDiscountType: null,
    shopVoucherDiscountValue: null,
    shopVoucherMinOrderAmount: null,
    shopVoucherMaxDiscountAmount: null,
    shopVoucherQuantity: null,
    shopVoucherStartsAt: null,
    shopVoucherEndsAt: null,
    shopVoucherIsActive: null,
    shopVoucherProductSummary: null,
    shopVoucherProductList: null,
    shopVoucherPreviewHeadline: null,
    shopVoucherPreviewSummary: null,
    submitShopVoucherForm: null,
    resetShopVoucherForm: null,
    deleteShopVoucherBtn: null,
    shopProfileSummary: null,
    shopProfileTabs: null,
    shopProfileContent: null,
  };

  if (!els.shell) return;

  const ensureFinanceUi = () => {
    const marketingNav = document.querySelector(
      '.seller-nav-link[data-view-target="shop-promotions"]'
    );
    const newProductNav = document.querySelector(
      '.seller-nav-link[data-view-target="new-product"]'
    );
    const marketingNavSection = marketingNav?.closest(".seller-nav-section");
    const productNavSection = newProductNav?.closest(".seller-nav-section");

    if (
      (marketingNavSection || productNavSection) &&
      !document.querySelector('.seller-nav-link[data-view-target="finance-revenue"]')
    ) {
      const financeNavSection = document.createElement("section");
      financeNavSection.className = "seller-nav-section";
      financeNavSection.innerHTML = `
        <p class="seller-nav-heading">Tài chính</p>
        <button class="seller-nav-link" type="button" data-view-target="finance-revenue">
          <span class="seller-nav-icon">DT</span>
          <span class="seller-nav-copy">
            <strong>Doanh thu</strong>
            <span>Theo dõi đơn đã giao và doanh số đã ghi nhận</span>
          </span>
        </button>
        <button class="seller-nav-link" type="button" data-view-target="finance-wallet">
          <span class="seller-nav-icon">SD</span>
          <span class="seller-nav-copy">
            <strong>Số dư tk Bambi</strong>
            <span>Xem số dư khả dụng và khoản chờ đối soát</span>
          </span>
        </button>
        <button class="seller-nav-link" type="button" data-view-target="finance-bank">
          <span class="seller-nav-icon">NH</span>
          <span class="seller-nav-copy">
            <strong>Tài khoản ngân hàng</strong>
            <span>Kiểm tra tài khoản nhận tiền của shop</span>
          </span>
        </button>
      `;
      (marketingNavSection || productNavSection).insertAdjacentElement(
        "afterend",
        financeNavSection
      );
    }

    const financeAnchorView =
      document.querySelector('.seller-view[data-view="shop-profile"]') ||
      document.querySelector('.seller-view[data-view="products"]');

    if (
      financeAnchorView &&
      !document.querySelector('.seller-view[data-view="finance-revenue"]')
    ) {
      [
        {
          view: "finance-revenue",
          title: "Doanh thu",
          copy: "Theo dõi doanh thu của shop theo đơn đã giao và đã hoàn thành.",
        },
        {
          view: "finance-wallet",
          title: "Số dư tk Bambi",
          copy: "Kiểm tra số dư khả dụng và các khoản đang chờ đối soát.",
        },
        {
          view: "finance-bank",
          title: "Tài khoản ngân hàng",
          copy: "Theo dõi tài khoản ngân hàng nhận tiền đang dùng cho shop.",
        },
      ].forEach((item) => {
        const financeView = document.createElement("section");
        financeView.className = "seller-view hidden";
        financeView.dataset.view = item.view;
        financeView.innerHTML = `
          <article class="seller-panel">
            <div class="seller-panel-head">
              <div>
                <h2>${item.title}</h2>
                <p class="muted">${item.copy}</p>
              </div>
            </div>
          </article>
        `;
        financeAnchorView.insertAdjacentElement("beforebegin", financeView);
      });
    }

    els.financeRevenueView = document.querySelector(
      '.seller-view[data-view="finance-revenue"]'
    );
    els.financeWalletView = document.querySelector(
      '.seller-view[data-view="finance-wallet"]'
    );
    els.financeBankView = document.querySelector(
      '.seller-view[data-view="finance-bank"]'
    );
    els.sellerViews = Array.from(document.querySelectorAll(".seller-view"));
    els.sellerNavLinks = Array.from(
      document.querySelectorAll(".seller-nav-link[data-view-target]")
    );
  };

  const ensureShopProfileUi = () => {
    const newProductNav = document.querySelector(
      '.seller-nav-link[data-view-target="new-product"]'
    );
    const marketingNav = document.querySelector(
      '.seller-nav-link[data-view-target="shop-promotions"]'
    );
    const financeNav = document.querySelector(
      '.seller-nav-link[data-view-target="finance-revenue"]'
    );
    const productNavSection = newProductNav?.closest(".seller-nav-section");
    const marketingNavSection = marketingNav?.closest(".seller-nav-section");
    const financeNavSection = financeNav?.closest(".seller-nav-section");

    if (
      (financeNavSection || marketingNavSection || productNavSection) &&
      !document.querySelector('.seller-nav-link[data-view-target="shop-profile"]')
    ) {
      const shopNavSection = document.createElement("section");
      shopNavSection.className = "seller-nav-section";
      shopNavSection.innerHTML = `
        <p class="seller-nav-heading">Quản lý shop</p>
        <button class="seller-nav-link" type="button" data-view-target="shop-profile">
          <span class="seller-nav-icon">HS</span>
          <span class="seller-nav-copy">
            <strong>Hồ sơ shop</strong>
            <span>Thông tin cơ bản, thuế và định danh</span>
          </span>
        </button>
      `;
      (financeNavSection || marketingNavSection || productNavSection).insertAdjacentElement(
        "afterend",
        shopNavSection
      );
    }

    if (els.dashboardSummaryCards && !document.querySelector(".seller-management-panel")) {
      const managementPanel = document.createElement("section");
      managementPanel.className = "seller-panel seller-management-panel";
      managementPanel.innerHTML = `
        <div class="seller-panel-head">
          <div>
            <span class="seller-eyebrow">Quản lý shop</span>
            <h2>Khu vực quản lý shop</h2>
            <p class="muted">Truy cập nhanh hồ sơ shop để xem thông tin cơ bản, thuế và định danh.</p>
          </div>
        </div>
        <div class="seller-management-grid">
          <button class="seller-management-card" type="button" data-view-target="shop-profile">
            <span class="seller-management-icon">HS</span>
            <span class="seller-management-copy">
              <strong>Hồ sơ shop</strong>
              <span>Theo dõi thông tin cơ bản, thuế và định danh của shop</span>
            </span>
          </button>
        </div>
      `;
      els.dashboardSummaryCards.insertAdjacentElement("afterend", managementPanel);
    }

    const productsView = document.querySelector('.seller-view[data-view="products"]');
    if (productsView && !document.querySelector('.seller-view[data-view="shop-profile"]')) {
      const shopProfileView = document.createElement("section");
      shopProfileView.className = "seller-view hidden";
      shopProfileView.dataset.view = "shop-profile";
      shopProfileView.innerHTML = `
        <article class="seller-panel seller-shop-profile-shell">
          <div id="shopProfileSummary" class="seller-shop-profile-summary"></div>
          <div id="shopProfileTabs" class="seller-shop-profile-tabs"></div>
          <div id="shopProfileContent" class="seller-shop-profile-content"></div>
        </article>
      `;
      productsView.insertAdjacentElement("beforebegin", shopProfileView);
    }

    els.shopProfileSummary = document.querySelector("#shopProfileSummary");
    els.shopProfileTabs = document.querySelector("#shopProfileTabs");
    els.shopProfileContent = document.querySelector("#shopProfileContent");
    els.sellerViews = Array.from(document.querySelectorAll(".seller-view"));
    els.sellerNavLinks = Array.from(
      document.querySelectorAll(".seller-nav-link[data-view-target]")
    );
  };

  ensureFinanceUi();
  ensureShopProfileUi();

  const ensureShopPromotionsUi = () => {
    if (!els.shopPromotionsView || els.shopVoucherTable) return;

    els.shopPromotionsView.innerHTML = `
      <section id="shopVoucherStats" class="seller-stat-grid"></section>

      <section class="seller-dashboard-grid seller-promotion-layout">
        <article class="seller-panel">
          <div class="seller-panel-head seller-panel-head-wrap">
            <div>
              <h2>Voucher của shop</h2>
              <p class="muted">Tạo, sửa và xóa mã giảm giá riêng cho shop theo sản phẩm, điều kiện đơn và thời gian chạy.</p>
            </div>
            <div class="stack-actions">
              <button class="seller-btn ghost" id="reloadShopVouchers" type="button">Tải lại</button>
            </div>
          </div>

          <div class="seller-toolbar seller-promotion-toolbar">
            <input
              id="shopVoucherQuery"
              class="input"
              placeholder="Tìm theo mã voucher"
            />
            <select id="shopVoucherStatusFilter" class="select">
              <option value="all">Tất cả trạng thái</option>
              <option value="running">Đang diễn ra</option>
              <option value="upcoming">Sắp bắt đầu</option>
              <option value="expired">Đã hết hạn</option>
              <option value="inactive">Đang tắt</option>
            </select>
            <button class="seller-btn subtle" id="clearShopVoucherFilters" type="button">Đặt lại</button>
          </div>

          <div class="seller-toolbar-meta">
            <span id="shopVoucherCountLabel">0 voucher</span>
            <span class="chip gray">Để trống sản phẩm áp dụng nếu muốn chạy cho toàn shop</span>
          </div>

          <div id="shopVoucherTable"></div>
        </article>

        <aside class="seller-panel seller-promotion-form-panel">
          <div class="seller-panel-head">
            <div>
              <h2 id="shopVoucherFormTitle">Tạo voucher mới</h2>
              <p class="muted" id="shopVoucherFormDescription">Thiết lập giá trị giảm, điều kiện đơn và khoảng thời gian hiệu lực.</p>
            </div>
            <span class="chip orange" id="shopVoucherModeTag">Tạo mới</span>
          </div>

          <form id="shopVoucherForm" class="seller-promotion-form">
            <input id="shopVoucherId" type="hidden" />

            <div class="field">
              <label for="shopVoucherCode">Mã giảm giá</label>
              <input
                id="shopVoucherCode"
                class="input"
                type="text"
                maxlength="50"
                placeholder="Ví dụ: SHOP10K"
                required
              />
            </div>

            <div class="seller-two-column">
              <div class="field">
                <label for="shopVoucherDiscountType">Kiểu giảm giá</label>
                <select id="shopVoucherDiscountType" class="select">
                  <option value="amount">Giảm số tiền</option>
                  <option value="percent">Giảm phần trăm</option>
                </select>
              </div>

              <div class="field">
                <label for="shopVoucherDiscountValue">Giá trị giảm</label>
                <input
                  id="shopVoucherDiscountValue"
                  class="input"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Ví dụ: 10000 hoặc 10"
                  required
                />
              </div>
            </div>

            <div class="seller-two-column">
              <div class="field">
                <label for="shopVoucherMinOrderAmount">Điều kiện đơn tối thiểu</label>
                <input
                  id="shopVoucherMinOrderAmount"
                  class="input"
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Ví dụ: 500000"
                />
              </div>

              <div class="field">
                <label for="shopVoucherQuantity">Số lượng voucher</label>
                <input
                  id="shopVoucherQuantity"
                  class="input"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ví dụ: 10"
                  required
                />
              </div>
            </div>

            <div class="field">
              <label for="shopVoucherMaxDiscountAmount">Giảm tối đa</label>
              <input
                id="shopVoucherMaxDiscountAmount"
                class="input"
                type="number"
                min="0"
                step="1000"
                placeholder="Chỉ dùng cho voucher %"
              />
            </div>

            <div class="seller-promotion-datetime-stack">
              <div class="field">
                <label for="shopVoucherStartsAtTrigger">Bắt đầu</label>
                <div class="datetime-picker seller-datetime-picker" data-input-id="shopVoucherStartsAt">
                  <input id="shopVoucherStartsAt" type="datetime-local" hidden />
                  <button
                    id="shopVoucherStartsAtTrigger"
                    class="datetime-trigger seller-datetime-trigger"
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded="false"
                    aria-controls="shopVoucherStartsAtPanel"
                  >
                    <span class="datetime-trigger-copy">
                      <span class="datetime-trigger-kicker">Thời gian bắt đầu</span>
                      <strong class="datetime-trigger-value" data-role="display">Chọn ngày và giờ</strong>
                    </span>
                    <span class="datetime-trigger-arrow" aria-hidden="true"></span>
                  </button>
                  <button class="datetime-backdrop" type="button" tabindex="-1" aria-hidden="true"></button>
                  <div id="shopVoucherStartsAtPanel" class="datetime-panel seller-datetime-panel" hidden>
                    <div class="datetime-panel-grid seller-datetime-grid">
                      <div class="field datetime-calendar-field">
                        <label>Ngày</label>
                        <div class="datetime-calendar seller-datetime-calendar">
                          <input id="shopVoucherStartsAtDate" type="hidden" data-role="date" />
                          <div class="datetime-calendar-head">
                            <button
                              class="datetime-calendar-nav"
                              type="button"
                              data-role="month-prev"
                              aria-label="Tháng trước"
                            >
                              &lsaquo;
                            </button>
                            <strong class="datetime-calendar-title" data-role="month-label"></strong>
                            <button
                              class="datetime-calendar-nav"
                              type="button"
                              data-role="month-next"
                              aria-label="Tháng sau"
                            >
                              &rsaquo;
                            </button>
                          </div>
                          <div class="datetime-calendar-weekdays">
                            <span>T2</span>
                            <span>T3</span>
                            <span>T4</span>
                            <span>T5</span>
                            <span>T6</span>
                            <span>T7</span>
                            <span>CN</span>
                          </div>
                          <div class="datetime-calendar-grid" data-role="calendar-grid"></div>
                          <div class="datetime-calendar-footer">
                            <button class="datetime-preset" type="button" data-role="calendar-today">
                              Hôm nay
                            </button>
                          </div>
                        </div>
                      </div>
                      <div class="field">
                        <label for="shopVoucherStartsAtHour">Giờ</label>
                        <select
                          id="shopVoucherStartsAtHour"
                          class="select datetime-select"
                          data-role="hour"
                        ></select>
                      </div>
                      <div class="field">
                        <label for="shopVoucherStartsAtMinute">Phút</label>
                        <select
                          id="shopVoucherStartsAtMinute"
                          class="select datetime-select"
                          data-role="minute"
                        ></select>
                      </div>
                    </div>
                    <div class="datetime-presets seller-datetime-presets">
                      <button class="datetime-preset" type="button" data-role="preset" data-preset="now">
                        Bây giờ
                      </button>
                      <button
                        class="datetime-preset"
                        type="button"
                        data-role="preset"
                        data-preset="plus-1-day"
                      >
                        +1 ngày
                      </button>
                      <button
                        class="datetime-preset"
                        type="button"
                        data-role="preset"
                        data-preset="end-of-day"
                      >
                        Cuối ngày
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div class="field">
                <label for="shopVoucherEndsAtTrigger">Kết thúc</label>
                <div class="datetime-picker seller-datetime-picker" data-input-id="shopVoucherEndsAt">
                  <input id="shopVoucherEndsAt" type="datetime-local" hidden />
                  <button
                    id="shopVoucherEndsAtTrigger"
                    class="datetime-trigger seller-datetime-trigger"
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded="false"
                    aria-controls="shopVoucherEndsAtPanel"
                  >
                    <span class="datetime-trigger-copy">
                      <span class="datetime-trigger-kicker">Thời gian kết thúc</span>
                      <strong class="datetime-trigger-value" data-role="display">Chọn ngày và giờ</strong>
                    </span>
                    <span class="datetime-trigger-arrow" aria-hidden="true"></span>
                  </button>
                  <button class="datetime-backdrop" type="button" tabindex="-1" aria-hidden="true"></button>
                  <div id="shopVoucherEndsAtPanel" class="datetime-panel seller-datetime-panel" hidden>
                    <div class="datetime-panel-grid seller-datetime-grid">
                      <div class="field datetime-calendar-field">
                        <label>Ngày</label>
                        <div class="datetime-calendar seller-datetime-calendar">
                          <input id="shopVoucherEndsAtDate" type="hidden" data-role="date" />
                          <div class="datetime-calendar-head">
                            <button
                              class="datetime-calendar-nav"
                              type="button"
                              data-role="month-prev"
                              aria-label="Tháng trước"
                            >
                              &lsaquo;
                            </button>
                            <strong class="datetime-calendar-title" data-role="month-label"></strong>
                            <button
                              class="datetime-calendar-nav"
                              type="button"
                              data-role="month-next"
                              aria-label="Tháng sau"
                            >
                              &rsaquo;
                            </button>
                          </div>
                          <div class="datetime-calendar-weekdays">
                            <span>T2</span>
                            <span>T3</span>
                            <span>T4</span>
                            <span>T5</span>
                            <span>T6</span>
                            <span>T7</span>
                            <span>CN</span>
                          </div>
                          <div class="datetime-calendar-grid" data-role="calendar-grid"></div>
                          <div class="datetime-calendar-footer">
                            <button class="datetime-preset" type="button" data-role="calendar-today">
                              Hôm nay
                            </button>
                          </div>
                        </div>
                      </div>
                      <div class="field">
                        <label for="shopVoucherEndsAtHour">Giờ</label>
                        <select
                          id="shopVoucherEndsAtHour"
                          class="select datetime-select"
                          data-role="hour"
                        ></select>
                      </div>
                      <div class="field">
                        <label for="shopVoucherEndsAtMinute">Phút</label>
                        <select
                          id="shopVoucherEndsAtMinute"
                          class="select datetime-select"
                          data-role="minute"
                        ></select>
                      </div>
                    </div>
                    <div class="datetime-presets seller-datetime-presets">
                      <button class="datetime-preset" type="button" data-role="preset" data-preset="now">
                        Bây giờ
                      </button>
                      <button
                        class="datetime-preset"
                        type="button"
                        data-role="preset"
                        data-preset="plus-1-day"
                      >
                        +1 ngày
                      </button>
                      <button
                        class="datetime-preset"
                        type="button"
                        data-role="preset"
                        data-preset="end-of-day"
                      >
                        Cuối ngày
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="field">
              <div class="seller-promotion-product-head">
                <label>Sản phẩm áp dụng</label>
                <button class="seller-mini-btn ghost" id="clearShopVoucherProducts" type="button">
                  Áp dụng toàn shop
                </button>
              </div>
              <div id="shopVoucherProductSummary" class="seller-inline-meta"></div>
              <div id="shopVoucherProductList" class="seller-promotion-product-list"></div>
            </div>

            <label class="seller-switch-row seller-promotion-switch">
              <span>
                <strong>Bật voucher ngay</strong>
                <small>Voucher chỉ chạy khi trong thời gian hiệu lực và công tắc đang bật.</small>
              </span>
              <input id="shopVoucherIsActive" type="checkbox" checked />
              <span class="seller-switch"></span>
            </label>

            <div class="seller-promotion-preview">
              <strong id="shopVoucherPreviewHeadline">Giảm 10.000đ cho đơn từ 0đ</strong>
              <p id="shopVoucherPreviewSummary" class="muted">Áp dụng toàn bộ sản phẩm của shop trong khoảng thời gian đã chọn.</p>
            </div>

            <div class="stack-actions">
              <button class="seller-btn primary" id="submitShopVoucherForm" type="submit">Tạo voucher</button>
              <button class="seller-btn ghost" id="resetShopVoucherForm" type="button">Làm mới form</button>
              <button class="seller-btn subtle" id="deleteShopVoucherBtn" type="button" hidden>Xóa voucher</button>
            </div>
          </form>
        </aside>
      </section>
    `;

    els.shopVoucherStats = document.querySelector("#shopVoucherStats");
    els.shopVoucherQuery = document.querySelector("#shopVoucherQuery");
    els.shopVoucherStatusFilter = document.querySelector("#shopVoucherStatusFilter");
    els.reloadShopVouchers = document.querySelector("#reloadShopVouchers");
    els.shopVoucherCountLabel = document.querySelector("#shopVoucherCountLabel");
    els.shopVoucherTable = document.querySelector("#shopVoucherTable");
    els.shopVoucherForm = document.querySelector("#shopVoucherForm");
    els.shopVoucherFormTitle = document.querySelector("#shopVoucherFormTitle");
    els.shopVoucherFormDescription = document.querySelector("#shopVoucherFormDescription");
    els.shopVoucherModeTag = document.querySelector("#shopVoucherModeTag");
    els.shopVoucherId = document.querySelector("#shopVoucherId");
    els.shopVoucherCode = document.querySelector("#shopVoucherCode");
    els.shopVoucherDiscountType = document.querySelector("#shopVoucherDiscountType");
    els.shopVoucherDiscountValue = document.querySelector("#shopVoucherDiscountValue");
    els.shopVoucherMinOrderAmount = document.querySelector("#shopVoucherMinOrderAmount");
    els.shopVoucherMaxDiscountAmount = document.querySelector("#shopVoucherMaxDiscountAmount");
    els.shopVoucherQuantity = document.querySelector("#shopVoucherQuantity");
    els.shopVoucherStartsAt = document.querySelector("#shopVoucherStartsAt");
    els.shopVoucherEndsAt = document.querySelector("#shopVoucherEndsAt");
    els.shopVoucherIsActive = document.querySelector("#shopVoucherIsActive");
    els.shopVoucherProductSummary = document.querySelector("#shopVoucherProductSummary");
    els.shopVoucherProductList = document.querySelector("#shopVoucherProductList");
    els.shopVoucherPreviewHeadline = document.querySelector("#shopVoucherPreviewHeadline");
    els.shopVoucherPreviewSummary = document.querySelector("#shopVoucherPreviewSummary");
    els.submitShopVoucherForm = document.querySelector("#submitShopVoucherForm");
    els.resetShopVoucherForm = document.querySelector("#resetShopVoucherForm");
    els.deleteShopVoucherBtn = document.querySelector("#deleteShopVoucherBtn");
  };

  ensureShopPromotionsUi();

  const createEmptyDraft = () => ({
    name: "",
    categoryId: "",
    gtin: "",
    description: "",
    price: "",
    stock: "0",
    variantMode: "single",
    variantGroups: [],
    variantItems: [],
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

  const createEmptyShopProfileEditor = () => ({
    isEditing: false,
    isSaving: false,
    name: "",
    description: "",
    avatarFile: null,
    avatarPreviewUrl: "",
    avatarObjectUrl: "",
  });

  const createEmptyCategoryPicker = () => ({
    isOpen: false,
    search: "",
    browsePath: [],
    pendingCategoryId: "",
  });

  const createShopVoucherSummary = () => ({
    total: 0,
    running: 0,
    upcoming: 0,
    expired: 0,
    inactive: 0,
  });

  const createEmptyWalletSummary = () => ({
    wallet: {
      id: "",
      balance: 0,
      available_balance: 0,
      created_at: "",
    },
    stats: {
      total_credited: 0,
      total_requested: 0,
      pending_withdrawals: 0,
    },
    selected_shop: null,
    transactions: [],
  });

  const createEmptyShopVoucherDraft = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    end.setHours(23, 59, 0, 0);

    return {
      id: "",
      code: "",
      discount_type: "amount",
      discount_value: "",
      min_order_amount: "0",
      product_ids: [],
      max_discount_amount: "",
      starts_at: new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
      ends_at: new Date(end.getTime() - end.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16),
      quantity: "10",
      is_active: true,
    };
  };

  const state = {
    currentView: "dashboard",
    user: null,
    approvedShops: [],
    currentShopId: "",
    shippingSettingsSaving: false,
    categories: [],
    products: [],
    orderItems: [],
    orderFilters: {
      all: "all",
      returns: "all",
    },
    productFilters: {
      status: "all",
      search: "",
      categoryId: "",
      sort: "recent",
    },
    shopVouchers: [],
    shopVoucherSummary: createShopVoucherSummary(),
    shopVoucherFilters: {
      query: "",
      status: "all",
    },
    shopVoucherEditor: createEmptyShopVoucherDraft(),
    walletSummary: createEmptyWalletSummary(),
    isRequestingWithdrawal: false,
    shopProfileTab: "basic",
    shopProfileEditor: createEmptyShopProfileEditor(),
    categoryPicker: createEmptyCategoryPicker(),
    editingProductId: "",
    editingVariantId: "",
    draft: createEmptyDraft(),
    statusTimer: 0,
    isSaving: false,
  };

  const createRuntimeId = (prefix = "draft") =>
    `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  const createDraftVariantOption = (value = "") => ({
    id: createRuntimeId("option"),
    value,
  });

  const createDraftVariantGroup = (name = "", options) => ({
    id: createRuntimeId("group"),
    name,
    options:
      Array.isArray(options) && options.length
        ? options
        : [createDraftVariantOption(""), createDraftVariantOption("")],
  });

  const buildVariantItemKey = (optionValues = []) =>
    optionValues.map((value) => String(value || "").trim()).join("||");

  const createDraftVariantItem = ({
    variantId = "",
    optionValues = [],
    price = "",
    stock = "0",
    image = null,
  } = {}) => ({
    key: buildVariantItemKey(optionValues),
    variantId,
    optionValues: Array.isArray(optionValues)
      ? optionValues.map((value) => String(value || "").trim())
      : [],
    price: price === undefined || price === null ? "" : String(price),
    stock: stock === undefined || stock === null ? "0" : String(stock),
    image,
  });

  const getNormalizedVariantGroups = (groups = state.draft.variantGroups) =>
    (Array.isArray(groups) ? groups : [])
      .map((group) => ({
        id: group?.id || createRuntimeId("group"),
        name: String(group?.name || "").trim(),
        options: Array.from(
          new Set(
            (Array.isArray(group?.options) ? group.options : [])
              .map((option) => ({
                id: option?.id || createRuntimeId("option"),
                value: String(option?.value || "").trim(),
              }))
              .filter((option) => option.value)
              .map((option) => option.value)
          )
        ),
      }))
      .filter((group) => group.name && group.options.length)
      .slice(0, 2);

  const buildVariantCombinations = (groups) => {
    if (!Array.isArray(groups) || !groups.length) return [];

    return groups.reduce(
      (all, group) =>
        all.flatMap((prefix) =>
          group.options.map((option) => [...prefix, String(option || "").trim()])
        ),
      [[]]
    );
  };

  const syncDraftVariantItems = () => {
    if (state.draft.variantMode !== "multiple") {
      state.draft.variantItems.forEach((item) => revokeMedia(item?.image));
      state.draft.variantItems = [];
      return;
    }

    const groups = getNormalizedVariantGroups();
    const combos = buildVariantCombinations(groups);
    const currentMap = new Map(
      state.draft.variantItems.map((item) => [item.key, item])
    );
    const nextKeys = new Set(combos.map((combo) => buildVariantItemKey(combo)));

    state.draft.variantItems
      .filter((item) => !nextKeys.has(item.key))
      .forEach((item) => revokeMedia(item?.image));

    state.draft.variantItems = combos.map((combo) => {
      const key = buildVariantItemKey(combo);
      const current = currentMap.get(key);
      return current
        ? {
            ...current,
            key,
            optionValues: [...combo],
          }
        : createDraftVariantItem({ optionValues: combo });
    });
  };

  const getDraftSalesSnapshot = () => {
    if (state.draft.variantMode === "multiple") {
      const prices = state.draft.variantItems
        .map((item) => toOptionalNumber(item.price))
        .filter((value) => Number.isFinite(value) && value > 0);
      const stock = state.draft.variantItems.reduce((total, item) => {
        const value = toOptionalNumber(item.stock);
        return total + (Number.isFinite(value) ? value : 0);
      }, 0);

      return {
        price: prices.length ? Math.min(...prices) : undefined,
        minPrice: prices.length ? Math.min(...prices) : undefined,
        maxPrice: prices.length ? Math.max(...prices) : undefined,
        stock,
        variantCount: state.draft.variantItems.length,
      };
    }

    return {
      price: toOptionalNumber(state.draft.price),
      minPrice: toOptionalNumber(state.draft.price),
      maxPrice: toOptionalNumber(state.draft.price),
      stock: toOptionalNumber(state.draft.stock) || 0,
      variantCount: 1,
    };
  };

  const getDraftVariantSummary = () => {
    if (state.draft.variantMode !== "multiple") return "";

    const groups = getNormalizedVariantGroups();
    if (!groups.length) return "";

    return groups
      .map((group) => `${group.name}: ${group.options.join(", ")}`)
      .join(" • ");
  };

  const setDraftVariantMode = (mode) => {
    if (mode === "multiple") {
      state.draft.variantMode = "multiple";
      if (!state.draft.variantGroups.length) {
        state.draft.variantGroups = [createDraftVariantGroup()];
      }
      syncDraftVariantItems();
      return;
    }

    state.draft.variantMode = "single";
    state.draft.variantGroups = [];
    syncDraftVariantItems();
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

  const getShopAvatarUrl = (shop) => shop?.avatar_url || state.user?.avatar_url || "";

  const getShopOnboardingData = (shop) =>
    shop?.onboarding_data && typeof shop.onboarding_data === "object"
      ? shop.onboarding_data
      : {};

  const getShopShippingConfig = (shop) => {
    const shippingConfig = getShopOnboardingData(shop)?.shipping_config || {};
    return SHIPPING_METHODS.reduce(
      (config, method) => ({
        ...config,
        [method.key]: Boolean(shippingConfig?.[method.key]),
      }),
      {}
    );
  };

  const countEnabledShippingMethods = (config = {}) =>
    SHIPPING_METHODS.filter((method) => Boolean(config?.[method.key])).length;

  const replaceApprovedShop = (nextShop) => {
    state.approvedShops = state.approvedShops.map((shop) =>
      shop.id === nextShop.id ? nextShop : shop
    );
  };

  const getShopAddress = (shop, addressType) => {
    const matchedAddress = Array.isArray(shop?.shop_addresses)
      ? shop.shop_addresses.find((item) => item?.address_type === addressType)
      : null;

    if (matchedAddress) return matchedAddress;

    const onboarding = getShopOnboardingData(shop);
    const fallbackKey = addressType === "tax" ? "tax_address" : "pickup_address";
    return onboarding?.[fallbackKey] || null;
  };

  const getShopPaymentAccount = (shop) => {
    if (Array.isArray(shop?.shop_payment_accounts) && shop.shop_payment_accounts[0]) {
      return shop.shop_payment_accounts[0];
    }

    return getShopOnboardingData(shop)?.payment_account || null;
  };

  const maskAccountNumber = (value) => {
    const text = String(value || "")
      .replace(/\s+/g, "")
      .trim();
    if (!text) return "Chưa cập nhật";
    return `**** ${text.slice(-4)}`;
  };

  const getShopDocumentsByType = (shop, docType) =>
    Array.isArray(shop?.shop_documents)
      ? shop.shop_documents.filter((item) => item?.doc_type === docType)
      : [];

  const toDatetimeLocalValue = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };

  const refreshSelect = (target) => {
    target?.dispatchEvent(new Event("bambi:custom-select-sync"));
    window.BambiCustomSelect?.refreshSelect(target);
  };

  const padNumber = (value) => String(value).padStart(2, "0");

  const parseDatetimeLocalValue = (value) => {
    if (!value || typeof value !== "string" || !value.includes("T")) return null;

    const [datePart, timePart = "00:00"] = value.split("T");
    if (!datePart) return null;

    const [hourPart = "00", minutePart = "00"] = timePart.split(":");

    return {
      date: datePart,
      hour: padNumber(Number(hourPart) || 0),
      minute: padNumber(Number(minutePart) || 0),
    };
  };

  const buildDatetimeLocalValue = (dateValue, hourValue, minuteValue) => {
    if (!dateValue) return "";
    return `${dateValue}T${padNumber(Number(hourValue) || 0)}:${padNumber(
      Number(minuteValue) || 0
    )}`;
  };

  const parseDateValue = (value) => {
    if (!value || typeof value !== "string") return null;
    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  };

  const toDateValue = (date) =>
    `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;

  const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

  const shiftMonth = (date, offset) =>
    new Date(date.getFullYear(), date.getMonth() + offset, 1);

  const formatCalendarMonth = (date) => {
    const label = new Intl.DateTimeFormat("vi-VN", {
      month: "long",
      year: "numeric",
    }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const renderCalendar = (picker) => {
    if (!picker.calendarGrid || !picker.monthLabel) return;

    const selectedDate = parseDateValue(picker.date.value) || new Date();
    const cursor = picker.monthCursor || startOfMonth(selectedDate);
    const monthStart = startOfMonth(cursor);
    const leadingDays = (monthStart.getDay() + 6) % 7;
    const gridStart = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      monthStart.getDate() - leadingDays
    );
    const todayValue = toDateValue(new Date());
    const selectedValue = picker.date.value;

    picker.monthCursor = monthStart;
    picker.monthLabel.textContent = formatCalendarMonth(monthStart);
    picker.calendarGrid.innerHTML = Array.from({ length: 42 }, (_, index) => {
      const cellDate = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index
      );
      const cellValue = toDateValue(cellDate);
      const className = [
        "datetime-calendar-day",
        cellDate.getMonth() !== monthStart.getMonth() ? "is-muted" : "",
        cellValue === todayValue ? "is-today" : "",
        cellValue === selectedValue ? "is-selected" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return `
        <button class="${className}" type="button" data-role="calendar-day" data-value="${cellValue}">
          ${cellDate.getDate()}
        </button>
      `;
    }).join("");
  };

  const focusCalendarSelection = (picker) => {
    picker.calendarGrid
      ?.querySelector(".datetime-calendar-day.is-selected, .datetime-calendar-day.is-today, .datetime-calendar-day")
      ?.focus();
  };

  const closeDatetimePicker = (picker) => {
    if (!picker) return;
    picker.root.classList.remove("is-open");
    picker.trigger.setAttribute("aria-expanded", "false");
    picker.panel.hidden = true;
    if (activeDatetimePicker === picker) {
      activeDatetimePicker = null;
    }
  };

  const syncDatetimePickerTrigger = (picker) => {
    picker.display.textContent = picker.input.value
      ? formatDate(picker.input.value)
      : "Chọn ngày và giờ";
  };

  const syncDatetimePickerControls = (picker) => {
    const fallbackValue = toDatetimeLocalValue(new Date());
    const parsed =
      parseDatetimeLocalValue(picker.input.value) || parseDatetimeLocalValue(fallbackValue);
    if (!parsed) return;

    picker.date.value = parsed.date;
    picker.monthCursor = startOfMonth(parseDateValue(parsed.date) || new Date());
    picker.hour.value = parsed.hour;
    picker.minute.value = parsed.minute;
    renderCalendar(picker);
    refreshSelect(picker.hour);
    refreshSelect(picker.minute);
    syncDatetimePickerTrigger(picker);
  };

  const commitDatetimePickerValue = (picker, emitEvents = true) => {
    const nextValue = buildDatetimeLocalValue(
      picker.date.value,
      picker.hour.value,
      picker.minute.value
    );

    picker.input.value = nextValue;
    syncDatetimePickerTrigger(picker);

    if (emitEvents) {
      picker.input.dispatchEvent(new Event("input", { bubbles: true }));
      picker.input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  };

  const openDatetimePicker = (picker) => {
    if (!picker) return;
    if (activeDatetimePicker && activeDatetimePicker !== picker) {
      closeDatetimePicker(activeDatetimePicker);
    }

    syncDatetimePickerControls(picker);
    picker.root.classList.add("is-open");
    picker.trigger.setAttribute("aria-expanded", "true");
    picker.panel.hidden = false;
    activeDatetimePicker = picker;
    window.requestAnimationFrame(() => focusCalendarSelection(picker));
  };

  const applyDatetimePreset = (picker, preset) => {
    const parsedCurrent = parseDatetimeLocalValue(picker.input.value);
    const baseDate = parsedCurrent
      ? new Date(`${parsedCurrent.date}T${parsedCurrent.hour}:${parsedCurrent.minute}`)
      : new Date();

    if (preset === "now") {
      baseDate.setSeconds(0, 0);
    } else if (preset === "plus-1-day") {
      baseDate.setDate(baseDate.getDate() + 1);
    } else if (preset === "end-of-day") {
      baseDate.setHours(23, 59, 0, 0);
    }

    const parsedNext = parseDatetimeLocalValue(toDatetimeLocalValue(baseDate));
    if (!parsedNext) return;

    picker.date.value = parsedNext.date;
    picker.hour.value = parsedNext.hour;
    picker.minute.value = parsedNext.minute;
    refreshSelect(picker.hour);
    refreshSelect(picker.minute);
    commitDatetimePickerValue(picker);
  };

  const populateDatetimeSelect = (select, total) => {
    if (!select || select.options.length) return;

    select.innerHTML = Array.from({ length: total }, (_, index) => {
      const value = padNumber(index);
      return `<option value="${value}">${value}</option>`;
    }).join("");
  };

  const initDatetimePickers = () => {
    document.querySelectorAll(".datetime-picker").forEach((root) => {
      const inputId = root.dataset.inputId;
      const input = inputId
        ? document.querySelector(`#${inputId}`)
        : root.querySelector('input[type="datetime-local"]');
      if (!input || datetimePickers.has(input.id)) return;

      const picker = {
        root,
        input,
        trigger: root.querySelector(".datetime-trigger"),
        backdrop: root.querySelector(".datetime-backdrop"),
        panel: root.querySelector(".datetime-panel"),
        display: root.querySelector('[data-role="display"]'),
        date: root.querySelector('[data-role="date"]'),
        monthLabel: root.querySelector('[data-role="month-label"]'),
        calendarGrid: root.querySelector('[data-role="calendar-grid"]'),
        prevMonthButton: root.querySelector('[data-role="month-prev"]'),
        nextMonthButton: root.querySelector('[data-role="month-next"]'),
        todayButton: root.querySelector('[data-role="calendar-today"]'),
        hour: root.querySelector('[data-role="hour"]'),
        minute: root.querySelector('[data-role="minute"]'),
        monthCursor: null,
      };

      populateDatetimeSelect(picker.hour, 24);
      populateDatetimeSelect(picker.minute, 60);

      picker.trigger?.addEventListener("click", () => {
        if (picker.root.classList.contains("is-open")) {
          closeDatetimePicker(picker);
          return;
        }
        openDatetimePicker(picker);
      });

      picker.backdrop?.addEventListener("click", () => {
        closeDatetimePicker(picker);
        picker.trigger?.focus();
      });

      picker.hour?.addEventListener("change", () => commitDatetimePickerValue(picker));
      picker.minute?.addEventListener("change", () => commitDatetimePickerValue(picker));

      picker.prevMonthButton?.addEventListener("click", () => {
        picker.monthCursor = shiftMonth(picker.monthCursor || new Date(), -1);
        renderCalendar(picker);
      });

      picker.nextMonthButton?.addEventListener("click", () => {
        picker.monthCursor = shiftMonth(picker.monthCursor || new Date(), 1);
        renderCalendar(picker);
      });

      picker.todayButton?.addEventListener("click", () => {
        const today = new Date();
        picker.date.value = toDateValue(today);
        picker.monthCursor = startOfMonth(today);
        renderCalendar(picker);
        commitDatetimePickerValue(picker);
      });

      picker.calendarGrid?.addEventListener("click", (event) => {
        const button = event.target.closest('[data-role="calendar-day"]');
        if (!button) return;

        picker.date.value = button.dataset.value;
        picker.monthCursor = startOfMonth(parseDateValue(button.dataset.value) || new Date());
        renderCalendar(picker);
        commitDatetimePickerValue(picker);
      });

      root.querySelectorAll('[data-role="preset"]').forEach((button) => {
        button.addEventListener("click", () => {
          applyDatetimePreset(picker, button.dataset.preset);
        });
      });

      picker.input.addEventListener("input", () => syncDatetimePickerControls(picker));
      picker.input.addEventListener("change", () => syncDatetimePickerControls(picker));

      datetimePickers.set(picker.input.id, picker);
      syncDatetimePickerControls(picker);
      closeDatetimePicker(picker);
    });
  };

  const syncAllDatetimePickers = () => {
    datetimePickers.forEach((picker) => syncDatetimePickerControls(picker));
  };

  const getShopVoucherStateMeta = (status) => {
    switch (status) {
      case "running":
        return { label: "Đang diễn ra", className: "green" };
      case "upcoming":
        return { label: "Sắp bắt đầu", className: "orange" };
      case "expired":
        return { label: "Đã hết hạn", className: "gray" };
      case "inactive":
        return { label: "Đang tắt", className: "gray" };
      default:
        return { label: "Không rõ", className: "gray" };
    }
  };

  const getShopVoucherProductOptions = () =>
    [...state.products].sort((left, right) =>
      String(left?.name || "").localeCompare(String(right?.name || ""), "vi")
    );

  const getShopVoucherProductLabel = (productIds = []) => {
    const ids = Array.isArray(productIds) ? productIds : [];
    if (!ids.length) return "Toàn bộ sản phẩm của shop";

    const productMap = new Map(
      state.products.map((product) => [product.id, product.name || shortId(product.id)])
    );
    const names = ids.map((id) => productMap.get(id) || `#${shortId(id)}`);

    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 3).join(", ")} +${names.length - 3} sản phẩm`;
  };

  const formatShopVoucherDiscount = (discountType, discountValue) => {
    const numericValue = Number(discountValue || 0);
    if (discountType === "percent") {
      return `${formatCompactNumber(numericValue)}%`;
    }
    return formatPrice(numericValue);
  };

  const buildShopVoucherHeadline = (voucher) =>
    `Giảm ${formatShopVoucherDiscount(
      voucher.discount_type,
      voucher.discount_value
    )} cho đơn từ ${formatPrice(voucher.min_order_amount || 0)}`;

  const buildShopVoucherSummary = (voucher) => {
    const parts = [
      `${voucher.quantity || 0} lượt`,
      `${formatDate(voucher.starts_at)} - ${formatDate(voucher.ends_at)}`,
    ];

    if (voucher.discount_type === "percent" && Number(voucher.max_discount_amount) > 0) {
      parts.unshift(`Tối đa ${formatPrice(voucher.max_discount_amount)}`);
    }

    parts.push(getShopVoucherProductLabel(voucher.product_ids));
    return parts.join(" • ");
  };

  const setShopVoucherFormMode = (mode, voucher = null) => {
    const isEdit = mode === "edit" && voucher;

    if (els.shopVoucherFormTitle) {
      els.shopVoucherFormTitle.textContent = isEdit
        ? `Sửa voucher ${voucher.code}`
        : "Tạo voucher mới";
    }

    if (els.shopVoucherFormDescription) {
      els.shopVoucherFormDescription.textContent = isEdit
        ? "Cập nhật giá trị giảm, sản phẩm áp dụng và khung thời gian cho voucher đã có."
        : "Thiết lập giá trị giảm, điều kiện đơn và khoảng thời gian hiệu lực.";
    }

    if (els.shopVoucherModeTag) {
      els.shopVoucherModeTag.textContent = isEdit ? "Đang sửa" : "Tạo mới";
    }

    if (els.submitShopVoucherForm) {
      els.submitShopVoucherForm.textContent = isEdit ? "Lưu thay đổi" : "Tạo voucher";
    }

    if (els.deleteShopVoucherBtn) {
      els.deleteShopVoucherBtn.hidden = !isEdit;
    }
  };

  const syncShopVoucherMaxField = () => {
    if (!els.shopVoucherMaxDiscountAmount) return;
    const isPercent = state.shopVoucherEditor.discount_type === "percent";
    els.shopVoucherMaxDiscountAmount.disabled = !isPercent;
    if (!isPercent) {
      els.shopVoucherMaxDiscountAmount.value = "";
    }
  };

  const syncShopVoucherPreview = () => {
    if (!els.shopVoucherPreviewHeadline || !els.shopVoucherPreviewSummary) return;

    const draft = state.shopVoucherEditor;
    const summaryDraft = {
      ...draft,
      quantity: Number(draft.quantity || 0),
      min_order_amount: Number(draft.min_order_amount || 0),
      discount_value: Number(draft.discount_value || 0),
      max_discount_amount: Number(draft.max_discount_amount || 0),
    };

    els.shopVoucherPreviewHeadline.textContent = buildShopVoucherHeadline(summaryDraft);
    els.shopVoucherPreviewSummary.textContent = buildShopVoucherSummary(summaryDraft);
  };

  const renderShopVoucherProductList = () => {
    if (!els.shopVoucherProductList || !els.shopVoucherProductSummary) return;

    const products = getShopVoucherProductOptions();
    const selectedIds = new Set(state.shopVoucherEditor.product_ids || []);

    els.shopVoucherProductSummary.innerHTML = products.length
      ? `<span>${selectedIds.size ? `Đã chọn ${selectedIds.size} sản phẩm` : "Đang áp dụng toàn shop"}</span>`
      : "<span>Shop chưa có sản phẩm để gắn voucher.</span>";

    if (!products.length) {
      els.shopVoucherProductList.innerHTML =
        '<div class="seller-empty-compact">Chưa có sản phẩm nào để áp dụng voucher.</div>';
      return;
    }

    els.shopVoucherProductList.innerHTML = products
      .map((product) => {
        const checked = selectedIds.has(product.id) ? "checked" : "";
        const statusMeta = getProductStatusMeta(product.status);

        return `
          <label class="seller-promotion-product-item">
            <input
              type="checkbox"
              data-role="shop-voucher-product"
              value="${escapeHtml(product.id)}"
              ${checked}
            />
            <span class="seller-promotion-product-copy">
              <strong>${escapeHtml(product.name || "Sản phẩm chưa đặt tên")}</strong>
              <small>${escapeHtml(formatPrice(product.product_variants?.[0]?.price || 0))}</small>
            </span>
            <span class="chip ${escapeHtml(statusMeta.className)}">${escapeHtml(
              statusMeta.label
            )}</span>
          </label>
        `;
      })
      .join("");
  };

  const syncShopVoucherForm = () => {
    if (!els.shopVoucherForm) return;

    const draft = state.shopVoucherEditor;
    if (els.shopVoucherId) els.shopVoucherId.value = draft.id || "";
    if (els.shopVoucherCode) els.shopVoucherCode.value = draft.code || "";
    if (els.shopVoucherDiscountType) setSelectValue(els.shopVoucherDiscountType, draft.discount_type);
    if (els.shopVoucherDiscountValue) els.shopVoucherDiscountValue.value = draft.discount_value || "";
    if (els.shopVoucherMinOrderAmount) {
      els.shopVoucherMinOrderAmount.value = draft.min_order_amount || "0";
    }
    if (els.shopVoucherMaxDiscountAmount) {
      els.shopVoucherMaxDiscountAmount.value = draft.max_discount_amount || "";
    }
    if (els.shopVoucherQuantity) els.shopVoucherQuantity.value = draft.quantity || "10";
    if (els.shopVoucherStartsAt) els.shopVoucherStartsAt.value = draft.starts_at || "";
    if (els.shopVoucherEndsAt) els.shopVoucherEndsAt.value = draft.ends_at || "";
    if (els.shopVoucherIsActive) els.shopVoucherIsActive.checked = Boolean(draft.is_active);

    syncShopVoucherMaxField();
    syncAllDatetimePickers();
    renderShopVoucherProductList();
    syncShopVoucherPreview();
  };

  const resetShopVoucherForm = () => {
    state.shopVoucherEditor = createEmptyShopVoucherDraft();
    setShopVoucherFormMode("create");
    syncShopVoucherForm();
  };

  const fillShopVoucherForm = (voucher) => {
    state.shopVoucherEditor = {
      id: voucher.id,
      code: voucher.code || "",
      discount_type: voucher.discount_type || "amount",
      discount_value: String(voucher.discount_value || ""),
      min_order_amount: String(voucher.min_order_amount || 0),
      product_ids: Array.isArray(voucher.product_ids) ? [...voucher.product_ids] : [],
      max_discount_amount:
        voucher.max_discount_amount === null || voucher.max_discount_amount === undefined
          ? ""
          : String(voucher.max_discount_amount),
      starts_at: toDatetimeLocalValue(voucher.starts_at),
      ends_at: toDatetimeLocalValue(voucher.ends_at),
      quantity: String(voucher.quantity || 1),
      is_active: Boolean(voucher.is_active),
    };
    setShopVoucherFormMode("edit", voucher);
    syncShopVoucherForm();
  };

  const renderShopVoucherStats = () => {
    if (!els.shopVoucherStats) return;

    const stats = [
      ["Tổng voucher", state.shopVoucherSummary.total, "Tổng số mã giảm giá của shop"],
      ["Đang chạy", state.shopVoucherSummary.running, "Đang trong thời gian hiệu lực"],
      ["Sắp chạy", state.shopVoucherSummary.upcoming, "Đã lên lịch nhưng chưa bắt đầu"],
      ["Đã hết hạn", state.shopVoucherSummary.expired, "Đã qua thời gian áp dụng"],
    ];

    els.shopVoucherStats.innerHTML = stats
      .map(
        ([label, value, note]) => `
          <article class="seller-summary-card">
            <h3>${escapeHtml(label)}</h3>
            <span class="seller-summary-value">${escapeHtml(value)}</span>
            <div class="seller-summary-note">${escapeHtml(note)}</div>
          </article>
        `
      )
      .join("");
  };

  const renderShopVoucherTable = () => {
    if (!els.shopVoucherTable || !els.shopVoucherCountLabel) return;

    els.shopVoucherCountLabel.textContent = `${state.shopVouchers.length} voucher`;

    if (!state.shopVouchers.length) {
      els.shopVoucherTable.innerHTML =
        '<div class="seller-empty-block">Chưa có voucher phù hợp với bộ lọc hiện tại.</div>';
      return;
    }

    els.shopVoucherTable.innerHTML = `
      <table class="seller-products-table seller-voucher-table">
        <thead>
          <tr>
            <th>Mã voucher</th>
            <th>Ưu đãi</th>
            <th>Sản phẩm áp dụng</th>
            <th>Thời gian</th>
            <th>Trạng thái</th>
            <th>Còn lại</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          ${state.shopVouchers
            .map((voucher) => {
              const stateMeta = getShopVoucherStateMeta(voucher.state);
              return `
                <tr>
                  <td>
                    <div class="seller-product-name">
                      <strong>${escapeHtml(voucher.code)}</strong>
                      <span class="muted">${escapeHtml(buildShopVoucherHeadline(voucher))}</span>
                    </div>
                  </td>
                  <td>${escapeHtml(buildShopVoucherSummary(voucher))}</td>
                  <td>${escapeHtml(getShopVoucherProductLabel(voucher.product_ids))}</td>
                  <td>
                    <div class="seller-product-name">
                      <strong>${escapeHtml(formatDate(voucher.starts_at))}</strong>
                      <span class="muted">đến ${escapeHtml(formatDate(voucher.ends_at))}</span>
                    </div>
                  </td>
                  <td>
                    <span class="chip ${escapeHtml(stateMeta.className)}">${escapeHtml(
                      stateMeta.label
                    )}</span>
                  </td>
                  <td>
                    <div class="seller-product-name">
                      <strong>${escapeHtml(voucher.remaining_quantity)}</strong>
                      <span class="muted">/${escapeHtml(voucher.quantity)} lượt</span>
                    </div>
                  </td>
                  <td class="seller-voucher-action-cell">
                    <div class="seller-actions">
                      <button
                        class="seller-mini-btn"
                        type="button"
                        data-action="edit-shop-voucher"
                        data-voucher-id="${escapeHtml(voucher.id)}"
                      >
                        Sửa
                      </button>
                      <button
                        class="seller-mini-btn ghost"
                        type="button"
                        data-action="delete-shop-voucher"
                        data-voucher-id="${escapeHtml(voucher.id)}"
                      >
                        Xóa
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

  const renderShopPromotions = () => {
    ensureShopPromotionsUi();
    initDatetimePickers();
    if (els.shopVoucherQuery) {
      els.shopVoucherQuery.value = state.shopVoucherFilters.query || "";
    }
    if (els.shopVoucherStatusFilter) {
      setSelectValue(els.shopVoucherStatusFilter, state.shopVoucherFilters.status || "all");
    }
    renderShopVoucherStats();
    renderShopVoucherTable();
    syncShopVoucherForm();
  };

  const buildShopVoucherQuery = () => {
    const params = new URLSearchParams({
      limit: "100",
      status: state.shopVoucherFilters.status || "all",
    });

    const query = state.shopVoucherFilters.query.trim();
    if (query) params.set("q", query);
    return params.toString();
  };

  const loadShopVouchers = async () => {
    if (!state.currentShopId) {
      state.shopVouchers = [];
      state.shopVoucherSummary = createShopVoucherSummary();
      resetShopVoucherForm();
      return;
    }

    const payload = await apiFetch(
      `/shops/${encodeURIComponent(state.currentShopId)}/vouchers?${buildShopVoucherQuery()}`,
      {},
      { redirectOn401: true }
    );

    state.shopVouchers = payload?.vouchers?.data || [];
    state.shopVoucherSummary = payload?.vouchers?.summary || createShopVoucherSummary();
  };

  const getShopVoucherPayload = () => ({
    code: state.shopVoucherEditor.code.trim(),
    discount_type: state.shopVoucherEditor.discount_type,
    discount_value: state.shopVoucherEditor.discount_value,
    min_order_amount: state.shopVoucherEditor.min_order_amount || "0",
    product_ids: [...(state.shopVoucherEditor.product_ids || [])],
    max_discount_amount:
      state.shopVoucherEditor.discount_type === "percent"
        ? state.shopVoucherEditor.max_discount_amount || null
        : null,
    starts_at: state.shopVoucherEditor.starts_at,
    ends_at: state.shopVoucherEditor.ends_at,
    quantity: state.shopVoucherEditor.quantity,
    is_active: Boolean(state.shopVoucherEditor.is_active),
  });

  const saveShopVoucher = async () => {
    if (!state.currentShopId) return;

    const isEditMode = Boolean(state.shopVoucherEditor.id);
    const voucherId = state.shopVoucherEditor.id;
    const path = isEditMode
      ? `/shops/${encodeURIComponent(state.currentShopId)}/vouchers/${encodeURIComponent(voucherId)}`
      : `/shops/${encodeURIComponent(state.currentShopId)}/vouchers`;

    const response = await apiFetch(
      path,
      {
        method: isEditMode ? "PATCH" : "POST",
        body: getShopVoucherPayload(),
      },
      { redirectOn401: true }
    );

    await loadShopVouchers();
    fillShopVoucherForm(response.voucher);
    renderShopPromotions();
    showStatus(isEditMode ? "Đã cập nhật voucher của shop." : "Đã tạo voucher của shop.");
  };

  const deleteShopVoucherById = async (voucherId) => {
    if (!state.currentShopId || !voucherId) return;

    const voucher =
      state.shopVouchers.find((item) => item.id === voucherId) || state.shopVoucherEditor;
    const code = voucher?.code || "voucher này";
    const shouldDelete = window.confirm(`Xóa ${code}?`);
    if (!shouldDelete) return;

    await apiFetch(
      `/shops/${encodeURIComponent(state.currentShopId)}/vouchers/${encodeURIComponent(voucherId)}`,
      {
        method: "DELETE",
      },
      { redirectOn401: true }
    );

    await loadShopVouchers();
    resetShopVoucherForm();
    renderShopPromotions();
    showStatus("Đã xóa voucher của shop.");
  };

  const formatBusinessType = (value) => {
    const map = {
      individual: "Cá nhân",
      household: "Hộ kinh doanh",
      company: "Công ty",
    };
    return map[value] || "Chưa cập nhật";
  };

  const formatIdentityType = (value) => {
    const map = {
      cccd: "Căn cước công dân",
      cmnd: "Chứng minh nhân dân",
      passport: "Hộ chiếu",
    };
    return map[value] || "Chưa cập nhật";
  };

  const buildAddressText = (address = {}) =>
    [address.detail, address.ward, address.district, address.province]
      .filter(Boolean)
      .join(", ");

  const getDocTypeLabel = (docType) => {
    const map = {
      business_license: "Giấy phép kinh doanh",
      identity_front: "Giấy tờ mặt trước",
      identity_selfie: "Ảnh chân dung cầm giấy tờ",
      identity_extra: "Tài liệu bổ sung",
    };
    return map[docType] || "Tài liệu";
  };

  const revokeShopProfileAvatarPreview = () => {
    if (state.shopProfileEditor.avatarObjectUrl) {
      URL.revokeObjectURL(state.shopProfileEditor.avatarObjectUrl);
    }
    state.shopProfileEditor.avatarObjectUrl = "";
  };

  const resetShopProfileEditor = () => {
    revokeShopProfileAvatarPreview();
    state.shopProfileEditor = createEmptyShopProfileEditor();
  };

  const getCurrentShopAvatarUrl = () =>
    state.shopProfileEditor.avatarPreviewUrl || getShopAvatarUrl(getCurrentShop());

  const startShopProfileEdit = () => {
    const currentShop = getCurrentShop();
    if (!currentShop) return;

    revokeShopProfileAvatarPreview();
    state.shopProfileTab = "basic";
    state.shopProfileEditor = {
      isEditing: true,
      isSaving: false,
      name: currentShop.name || "",
      description: currentShop.description || "",
      avatarFile: null,
      avatarPreviewUrl: getShopAvatarUrl(currentShop),
      avatarObjectUrl: "",
    };
    renderShopProfile();
  };

  const setShopProfileAvatarFile = (file) => {
    revokeShopProfileAvatarPreview();

    if (!file) {
      state.shopProfileEditor.avatarFile = null;
      state.shopProfileEditor.avatarPreviewUrl = getShopAvatarUrl(getCurrentShop());
      renderShopProfile();
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    state.shopProfileEditor.avatarFile = file;
    state.shopProfileEditor.avatarPreviewUrl = objectUrl;
    state.shopProfileEditor.avatarObjectUrl = objectUrl;
    renderShopProfile();
  };

  const saveShopProfile = async () => {
    const currentShop = getCurrentShop();
    if (!currentShop) return;

    const name = state.shopProfileEditor.name.trim();
    const description = state.shopProfileEditor.description.trim();

    if (!name) {
      showStatus("Tên shop không được để trống.", { error: true });
      return;
    }

    state.shopProfileEditor.isSaving = true;
    renderShopProfile();
    showStatus("Đang cập nhật hồ sơ shop...", { persist: true });

    try {
      let nextShop = currentShop;

      if (state.shopProfileEditor.avatarFile) {
        const formData = new FormData();
        formData.append("avatar", state.shopProfileEditor.avatarFile);
        const avatarPayload = await apiFetch(
          `/shops/${currentShop.id}/avatar`,
          {
            method: "POST",
            body: formData,
          },
          { redirectOn401: true }
        );
        nextShop = { ...nextShop, ...(avatarPayload?.shop || {}) };
      }

      const shopPayload = await apiFetch(
        `/shops/${currentShop.id}/profile`,
        {
          method: "PATCH",
          body: {
            name,
            description,
          },
        },
        { redirectOn401: true }
      );

      nextShop = { ...nextShop, ...(shopPayload?.shop || {}) };
      state.approvedShops = state.approvedShops.map((shop) =>
        shop.id === currentShop.id ? nextShop : shop
      );

      resetShopProfileEditor();
      renderAll();
      showStatus("Đã cập nhật hồ sơ shop.");
    } catch (error) {
      state.shopProfileEditor.isSaving = false;
      renderShopProfile();
      showStatus(
        error instanceof Error ? error.message : "Không thể cập nhật hồ sơ shop.",
        { error: true }
      );
    }
  };

  const getCategoryMap = () =>
    new Map(state.categories.map((item) => [String(item.id), item]));

  const getLeafCategories = () => state.categories.filter((item) => item?.is_leaf);

  const normalizeCategoryKey = (value) =>
    value === null || value === undefined || value === "" ? "" : String(value);

  const getCategoryById = (categoryId) =>
    categoryId ? getCategoryMap().get(String(categoryId)) || null : null;

  const getCategoryChildren = (parentId = null) =>
    state.categories
      .filter(
        (item) =>
          normalizeCategoryKey(item?.parent_id ?? null) ===
          normalizeCategoryKey(parentId ?? null)
      )
      .sort((left, right) => left.name.localeCompare(right.name, "vi"));

  const getCategoryLineageIds = (categoryId) => {
    const targetId = String(categoryId || "");
    if (!targetId) return [];

    const categoryMap = getCategoryMap();
    const lineage = [];
    const seen = new Set();
    let current = categoryMap.get(targetId) || null;

    while (current && !seen.has(current.id)) {
      lineage.unshift(String(current.id));
      seen.add(current.id);
      current = current.parent_id ? categoryMap.get(String(current.parent_id)) || null : null;
    }

    return lineage;
  };

  const getCategoryColumns = (pathIds = []) => {
    const columns = [];
    let parentId = null;
    let depth = 0;

    while (true) {
      const items = getCategoryChildren(parentId);
      if (!items.length) break;

      const activeId = pathIds[depth] || "";
      columns.push({ depth, activeId, items });

      const activeCategory = getCategoryById(activeId);
      if (!activeCategory || activeCategory.is_leaf) break;

      parentId = activeCategory.id;
      depth += 1;
    }

    return columns;
  };

  const getCategorySearchResults = (query) => {
    const normalizedQuery = String(query || "").trim().toLocaleLowerCase("vi");
    if (!normalizedQuery) return [];

    return getLeafCategories()
      .filter((item) =>
        [item.name, item.breadcrumb]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase("vi").includes(normalizedQuery))
      )
      .slice(0, 24);
  };

  const syncCategoryInput = () => {
    if (els.productCategoryInput) {
      els.productCategoryInput.value = state.draft.categoryId || "";
    }
  };

  const renderCategoryTrigger = () => {
    const selectedCategory = getCategoryById(state.draft.categoryId);
    const hasValue = Boolean(state.draft.categoryId);

    if (els.productCategoryValue) {
      els.productCategoryValue.textContent = hasValue
        ? selectedCategory?.name || "Chọn ngành hàng"
        : "Chọn ngành hàng";
    }

    if (els.productCategoryMeta) {
      els.productCategoryMeta.textContent = hasValue
        ? selectedCategory?.breadcrumb || "Bấm để đổi ngành hàng hoặc chọn lại theo nhiều cấp."
        : "Mở form chọn danh mục nhiều cấp giống seller center.";
    }

    els.productCategoryTrigger?.classList.toggle("has-value", hasValue);
    syncCategoryInput();
  };

  const closeCategoryPicker = () => {
    state.categoryPicker.isOpen = false;
    state.categoryPicker.search = "";
    document.body.classList.remove("is-category-picker-open");
    if (els.categoryPickerModal) {
      els.categoryPickerModal.classList.add("hidden");
      els.categoryPickerModal.setAttribute("aria-hidden", "true");
    }
    if (els.productCategoryTrigger) {
      els.productCategoryTrigger.setAttribute("aria-expanded", "false");
    }
  };

  const renderCategoryPicker = () => {
    if (!els.categoryPickerModal) return;

    const { isOpen, search, browsePath, pendingCategoryId } = state.categoryPicker;
    els.categoryPickerModal.classList.toggle("hidden", !isOpen);
    els.categoryPickerModal.setAttribute("aria-hidden", isOpen ? "false" : "true");
    document.body.classList.toggle("is-category-picker-open", isOpen);
    if (els.productCategoryTrigger) {
      els.productCategoryTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }

    if (!isOpen) return;

    const selectedCategory = getCategoryById(pendingCategoryId);
    const searchQuery = String(search || "").trim();
    const results = getCategorySearchResults(searchQuery);

    if (els.categoryPickerSearch && els.categoryPickerSearch.value !== search) {
      els.categoryPickerSearch.value = search;
    }

    if (els.categoryPickerSelected) {
      els.categoryPickerSelected.textContent = selectedCategory?.breadcrumb || "Chưa chọn ngành hàng";
    }

    if (els.confirmCategoryPicker) {
      els.confirmCategoryPicker.disabled = !selectedCategory?.is_leaf;
    }

    if (els.categoryPickerResults) {
      const showResults = Boolean(searchQuery);
      els.categoryPickerResults.classList.toggle("hidden", !showResults);
      els.categoryPickerResults.innerHTML = showResults
        ? results.length
          ? results
              .map((item) => {
                const isSelected = String(item.id) === String(pendingCategoryId);
                return `
                  <button
                    class="seller-category-search-item${isSelected ? " is-selected" : ""}"
                    type="button"
                    data-category-id="${escapeHtml(item.id)}"
                  >
                    <strong>${escapeHtml(item.name)}</strong>
                    <span>${escapeHtml(item.breadcrumb || item.name)}</span>
                  </button>
                `;
              })
              .join("")
          : '<div class="seller-category-empty">Không tìm thấy danh mục phù hợp.</div>'
        : "";
    }

    if (els.categoryPickerColumns) {
      const showColumns = !searchQuery;
      els.categoryPickerColumns.classList.toggle("hidden", !showColumns);

      if (!showColumns) return;

      const columns = getCategoryColumns(browsePath);
      els.categoryPickerColumns.innerHTML = columns
        .map(
          (column) => `
            <section class="seller-category-column">
              <div class="seller-category-list">
                ${column.items
                  .map((item) => {
                    const isActive = String(column.activeId) === String(item.id);
                    const isSelected = String(pendingCategoryId) === String(item.id);
                    return `
                      <button
                        class="seller-category-item${isActive ? " is-active" : ""}${
                          isSelected ? " is-selected" : ""
                        }"
                        type="button"
                        data-category-id="${escapeHtml(item.id)}"
                      >
                        <span>${escapeHtml(item.name)}</span>
                        <span class="seller-category-item-mark" aria-hidden="true">${
                          item.is_leaf ? "&bull;" : "&rsaquo;"
                        }</span>
                      </button>
                    `;
                  })
                  .join("")}
              </div>
            </section>
          `
        )
        .join("");

      if (!columns.length) {
        els.categoryPickerColumns.innerHTML =
          '<div class="seller-category-empty">Không có danh mục để hiển thị.</div>';
      }
    }
  };

  const openCategoryPicker = () => {
    if (!state.categories.length) {
      showStatus("Danh mục đang được tải, vui lòng thử lại sau.", { error: true });
      return;
    }

    state.categoryPicker = {
      isOpen: true,
      search: "",
      browsePath: getCategoryLineageIds(state.draft.categoryId),
      pendingCategoryId: state.draft.categoryId || "",
    };
    renderCategoryPicker();
    window.setTimeout(() => els.categoryPickerSearch?.focus(), 0);
  };

  const updateCategoryPickerSelection = (categoryId) => {
    const category = getCategoryById(categoryId);
    if (!category) return;

    const browsePath = getCategoryLineageIds(category.id);
    const pendingLineage = getCategoryLineageIds(state.categoryPicker.pendingCategoryId);
    const keepsPending =
      !category.is_leaf &&
      pendingLineage.length >= browsePath.length &&
      browsePath.every((id, index) => pendingLineage[index] === id);

    state.categoryPicker.browsePath = browsePath;
    state.categoryPicker.pendingCategoryId = category.is_leaf
      ? String(category.id)
      : keepsPending
        ? state.categoryPicker.pendingCategoryId
        : "";
    renderCategoryPicker();
  };

  const confirmCategoryPicker = () => {
    const selectedCategory = getCategoryById(state.categoryPicker.pendingCategoryId);
    if (!selectedCategory?.is_leaf) return;

    state.draft.categoryId = String(selectedCategory.id);
    renderDraft();
    closeCategoryPicker();
  };

  const getCategoryLabel = (categoryId) => {
    if (!categoryId) return "Chưa chọn ngành hàng";
    const category = getCategoryById(categoryId);
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

  const getEditingProduct = () =>
    state.editingProductId
      ? state.products.find((product) => product.id === state.editingProductId)
      : null;

  const getEditingProductStatus = () => getEditingProduct()?.status || "";

  const getProductStatusCounts = (products = []) => {
    const counts = {
      all: products.length,
      active: 0,
      pending: 0,
      rejected: 0,
      locked: 0,
      inactive: 0,
    };

    products.forEach((product) => {
      switch (product?.status) {
        case "active":
          counts.active += 1;
          break;
        case "pending":
          counts.pending += 1;
          break;
        case "rejected":
          counts.rejected += 1;
          break;
        case "locked":
          counts.locked += 1;
          break;
        case "inactive":
          counts.inactive += 1;
          break;
        default:
          break;
      }
    });

    return counts;
  };

  const resolveDraftStatus = (requestedStatus) => {
    const currentStatus = getEditingProductStatus();

    if (currentStatus === "locked") {
      return "locked";
    }

    if (requestedStatus === "inactive") {
      if (currentStatus === "pending" || currentStatus === "rejected") {
        return currentStatus;
      }
      return "inactive";
    }

    if (currentStatus === "active") return "active";
    if (currentStatus === "pending") return "pending";
    if (currentStatus === "rejected") return "pending";
    if (currentStatus === "inactive") return "pending";
    return "pending";
  };

  const getPublishButtonLabel = () => {
    if (!state.editingProductId) return "Gửi duyệt";

    const status = getEditingProductStatus();
    switch (status) {
      case "active":
        return "Cập nhật & Hiển thị";
      case "pending":
        return "Cập nhật & Chờ duyệt";
      case "rejected":
        return "Gửi duyệt lại";
      case "locked":
        return "Cập nhật (bị khóa)";
      case "inactive":
      default:
        return "Gửi duyệt";
    }
  };

  const getHiddenButtonLabel = () => {
    if (!state.editingProductId) return "Lưu & Ẩn";

    const status = getEditingProductStatus();
    if (status === "pending" || status === "rejected" || status === "locked") {
      return "Cập nhật";
    }
    return "Cập nhật & Ẩn";
  };

  const getProductSaveMessage = (status, mode) => {
    const isCreate = mode === "create";
    switch (status) {
      case "active":
        return isCreate
          ? "Đã tạo và hiển thị sản phẩm."
          : "Đã cập nhật và hiển thị sản phẩm.";
      case "pending":
        return isCreate
          ? "Đã gửi sản phẩm mới để admin duyệt."
          : "Đã gửi sản phẩm để admin duyệt.";
      case "inactive":
        return isCreate
          ? "Đã lưu sản phẩm ở trạng thái ẩn."
          : "Đã cập nhật sản phẩm ở trạng thái ẩn.";
      case "rejected":
        return "Đã cập nhật sản phẩm bị từ chối.";
      case "locked":
        return "Đã cập nhật thông tin, sản phẩm vẫn đang bị khóa.";
      default:
        return isCreate ? "Đã lưu sản phẩm." : "Đã cập nhật sản phẩm.";
    }
  };

  const getCurrentShopOrders = () => {
    const productIds = new Set(state.products.map((product) => product.id));
    const items = Array.isArray(state.orderItems) ? state.orderItems : [];
    if (state.currentShopId && items.some((item) => item?.shop_id)) {
      return items.filter((item) => item?.shop_id === state.currentShopId);
    }
    if (!productIds.size) return items;
    return items.filter((item) => {
      const productId = item?.product_variants?.products?.id;
      if (!productId) return true;
      return productIds.has(productId);
    });
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

  const getProductStatusMeta = (status) => {
    switch (status) {
      case "active":
        return { label: "Đang hiển thị", className: "" };
      case "pending":
        return { label: "Chờ duyệt", className: "orange" };
      case "rejected":
        return { label: "Chưa được đăng", className: "gray" };
      case "locked":
        return { label: "Bị khóa", className: "gray" };
      case "inactive":
        return { label: "Đang ẩn", className: "gray" };
      default:
        return { label: status || "Không rõ", className: "gray" };
    }
  };

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

  const getEventTarget = (event) => {
    const target = event?.target;
    if (target instanceof Element) return target;
    if (target && target.parentElement) return target.parentElement;
    return null;
  };

  const isEditingDraft = () => Boolean(state.editingProductId);

  const setSelectValue = (select, value) => {
    if (!select) return;
    select.value = value;
    if (select.tagName === "SELECT") {
      window.BambiCustomSelect?.refreshSelect(select);
    }
  };

  const updateViewChrome = () => {
    const meta =
      state.currentView === "new-product" && isEditingDraft()
        ? {
            breadcrumb: "Trang chủ / Sản phẩm / Sửa sản phẩm",
            title: "Sửa sản phẩm",
          }
        : VIEW_META[state.currentView] || VIEW_META.dashboard;

    if (els.breadcrumb) els.breadcrumb.textContent = meta.breadcrumb;
    if (els.pageTitle) els.pageTitle.textContent = meta.title;

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
    if (nextView === "orders-all") renderOrdersAllView();
    if (nextView === "orders-returns") renderOrdersReturnsView();
    if (nextView === "shipping-settings") renderShippingSettings();
    if (nextView === "shop-promotions") renderShopPromotions();
    if (nextView === "finance-revenue") renderFinanceRevenue();
    if (nextView === "finance-wallet") renderFinanceWalletView();
    if (nextView === "finance-bank") renderFinanceBankView();
    if (nextView === "new-product") renderDraft();
    if (nextView === "shop-profile") renderShopProfile();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateUserInfo = () => {
    if (!state.user) return;

    const displayName =
      state.user.full_name || state.user.email || "Tài khoản seller";

    if (els.sellerUserName) els.sellerUserName.textContent = displayName;
    if (els.sellerUserAvatar) {
      const avatarUrl = state.user.avatar_url || "";
      els.sellerUserAvatar.innerHTML = avatarUrl
        ? `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)}" />`
        : escapeHtml(getInitial(displayName));
    }
  };

  const toggleApprovedContent = (hasApprovedShop) => {
    if (els.sellerEmptyState) {
      els.sellerEmptyState.classList.toggle("hidden", hasApprovedShop);
    }

    els.sellerViews.forEach((section) => {
      section.classList.toggle("hidden", !hasApprovedShop);
    });

    if (els.reloadProductsView) {
      els.reloadProductsView.disabled = !hasApprovedShop;
    }

    if (!hasApprovedShop) {
      state.currentView = "dashboard";
      updateViewChrome();
    }
  };

  const populateCategorySelects = () => {
    const optionsHtml = getLeafCategories()
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

    if (els.productCategoryInput?.tagName === "SELECT") {
      els.productCategoryInput.innerHTML = `
        <option value="">Chọn ngành hàng</option>
        ${optionsHtml}
      `;
      setSelectValue(els.productCategoryInput, state.draft.categoryId || "");
    }
  };

  const getDashboardMetrics = () => {
    const products = state.products;
    const orders = getCurrentShopOrders();
    const activeProducts = products.filter(
      (product) => product.status === "active"
    );
    const inactiveProducts = products.filter(
      (product) => product.status === "inactive"
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
      hiddenProducts: inactiveProducts.length,
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

  const getFinanceMetrics = () => {
    const orders = getCurrentShopOrders();
    const deliveredItems = orders.filter((item) => item?.status === "delivered");
    const receivedItems = orders.filter((item) => item?.status === "received");
    const completedItems = orders.filter((item) =>
      ["delivered", "received"].includes(item?.status)
    );
    const deliveredRevenue = deliveredItems.reduce(
      (total, item) => total + getOrderItemAmount(item),
      0
    );
    const receivedRevenue = receivedItems.reduce(
      (total, item) => total + getOrderItemAmount(item),
      0
    );

    return {
      orders,
      deliveredItems,
      receivedItems,
      completedItems,
      deliveredRevenue,
      receivedRevenue,
      totalCompletedRevenue: deliveredRevenue + receivedRevenue,
      averageCompletedValue:
        completedItems.length > 0
          ? (deliveredRevenue + receivedRevenue) / completedItems.length
          : 0,
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

  const getOrderFilters = (group) =>
    ORDER_FILTER_GROUPS[group] || ORDER_FILTER_GROUPS.all;

  const ensureOrderFilter = (group) => {
    const filters = getOrderFilters(group);
    const current = state.orderFilters[group];
    if (!filters.some((filter) => filter.id === current)) {
      state.orderFilters[group] = filters[0]?.id || "all";
    }
    return state.orderFilters[group];
  };

  const setOrderFilter = (group, value) => {
    const filters = getOrderFilters(group);
    if (!filters.some((filter) => filter.id === value)) return;
    state.orderFilters[group] = value;
    if (group === "returns") {
      renderOrdersReturnsView();
      return;
    }
    renderOrdersAllView();
  };

  const sortOrderItems = (items) =>
    [...items].sort((left, right) => {
      const leftTime = new Date(left?.orders?.created_at || left?.created_at || 0).getTime();
      const rightTime = new Date(right?.orders?.created_at || right?.created_at || 0).getTime();
      return rightTime - leftTime;
    });

  const buildFinanceTransactionList = (items, options = {}) => {
    const {
      emptyMessage = "Chưa có giao dịch nào cho shop này.",
      statusLabel = "",
    } = options;

    if (!items.length) {
      return `<div class="seller-empty-block">${escapeHtml(emptyMessage)}</div>`;
    }

    return `
      <div class="seller-finance-list">
        ${items
          .map((item) => {
            const productName =
              item?.product_variants?.products?.name || "Sản phẩm chưa đặt tên";
            const orderId = shortId(item?.orders?.id || item?.id);
            const statusMeta = getOrderStatusMeta(item?.status);
            const displayStatus = statusLabel || statusMeta.label;

            return `
              <article class="seller-finance-row">
                <div class="seller-finance-row-main">
                  <strong>${escapeHtml(productName)}</strong>
                  <span>#${escapeHtml(orderId)} · ${escapeHtml(
              formatDate(item?.orders?.created_at || item?.created_at)
            )}</span>
                </div>
                <div class="seller-finance-amount">
                  <span class="chip ${escapeHtml(statusMeta.className)}">${escapeHtml(
              displayStatus
            )}</span>
                  <strong>${escapeHtml(formatPrice(getOrderItemAmount(item)))}</strong>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  };

  const buildWalletTransactionList = (items, emptyMessage) => {
    if (!items.length) {
      return `<div class="seller-empty-block">${escapeHtml(
        emptyMessage || "Chưa có giao dịch ví nào."
      )}</div>`;
    }

    return `
      <div class="seller-finance-list">
        ${items
          .map((item) => {
            const directionClass = item?.direction === "out" ? "is-out" : "is-in";
            const amount = Number(item?.amount || 0);
            const signedAmount = `${item?.direction === "out" ? "-" : "+"}${formatPrice(
              Math.abs(amount)
            )}`;
            const statusChip = item?.status_label
              ? `<span class="chip ${escapeHtml(
                  item?.status_tone || "gray"
                )}">${escapeHtml(item.status_label)}</span>`
              : "";

            return `
              <article class="seller-finance-row">
                <div class="seller-finance-row-main">
                  <strong>${escapeHtml(item?.title || "Biến động số dư Bambi")}</strong>
                  <span>${escapeHtml(item?.subtitle || "Giao dịch ví của seller")}</span>
                  <span>${escapeHtml(formatDate(item?.created_at))}</span>
                </div>
                <div class="seller-finance-amount ${directionClass}">
                  <span class="chip ${escapeHtml(
                    item?.direction === "out" ? "orange" : ""
                  )}">${escapeHtml(
              item?.direction === "out" ? "Tiền ra" : "Tiền vào"
            )}</span>
                  ${statusChip}
                  <strong>${escapeHtml(signedAmount)}</strong>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
    `;
  };

  const renderOrderTabs = (group, container) => {
    if (!container) return;
    const filters = getOrderFilters(group);
    const active = ensureOrderFilter(group);
    container.innerHTML = filters
      .map(
        (filter) => `
          <button
            class="seller-tab ${filter.id === active ? "active" : ""}"
            type="button"
            data-order-filter="${escapeHtml(filter.id)}"
            data-order-group="${escapeHtml(group)}"
          >
            ${escapeHtml(filter.label)}
          </button>
        `
      )
      .join("");
  };

  const renderOrderTable = (container, items) => {
    if (!container) return;
    if (!items.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
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
          ${items
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

  const renderOrdersAllView = () => {
    if (!els.ordersAllTabs || !els.ordersAllTable || !els.ordersAllSummary) return;
    const shop = getCurrentShop();
    const items = sortOrderItems(getCurrentShopOrders());
    renderOrderTabs("all", els.ordersAllTabs);
    const filters = getOrderFilters("all");
    const active = ensureOrderFilter("all");
    const matcher = filters.find((filter) => filter.id === active)?.match || (() => true);
    const filtered = items.filter(matcher);

    if (els.ordersAllSummary) {
      els.ordersAllSummary.textContent = `${filtered.length} mục hiển thị · ${items.length} tổng`;
    }
    if (els.ordersAllShopLabel) {
      els.ordersAllShopLabel.textContent = shop?.name ? `Shop: ${shop.name}` : "Chưa chọn shop";
      els.ordersAllShopLabel.style.display = shop ? "inline-flex" : "none";
    }

    renderOrderTable(els.ordersAllTable, filtered);
    if (els.ordersAllEmpty) {
      els.ordersAllEmpty.classList.toggle("hidden", filtered.length > 0);
    }
  };

  const renderOrdersReturnsView = () => {
    if (!els.ordersReturnsTabs || !els.ordersReturnsTable || !els.ordersReturnsSummary) return;
    const shop = getCurrentShop();
    const items = sortOrderItems(getCurrentShopOrders());
    renderOrderTabs("returns", els.ordersReturnsTabs);
    const filters = getOrderFilters("returns");
    const active = ensureOrderFilter("returns");
    const matcher = filters.find((filter) => filter.id === active)?.match || (() => false);
    const filtered = items.filter(matcher);

    if (els.ordersReturnsSummary) {
      els.ordersReturnsSummary.textContent = `${filtered.length} mục hiển thị · ${
        items.filter((item) => ["returned", "cancelled"].includes(item?.status)).length
      } tổng`;
    }
    if (els.ordersReturnsShopLabel) {
      els.ordersReturnsShopLabel.textContent = shop?.name ? `Shop: ${shop.name}` : "Chưa chọn shop";
      els.ordersReturnsShopLabel.style.display = shop ? "inline-flex" : "none";
    }

    renderOrderTable(els.ordersReturnsTable, filtered);
    if (els.ordersReturnsEmpty) {
      els.ordersReturnsEmpty.classList.toggle("hidden", filtered.length > 0);
    }
  };

  const renderShippingSettings = () => {
    if (!els.shippingSettingsContent) return;
    const currentShop = getCurrentShop();

    if (!currentShop) {
      els.shippingSettingsContent.innerHTML = `
        <div class="seller-empty-block">Chưa có shop đã duyệt để hiển thị cấu hình vận chuyển.</div>
      `;
      return;
    }

    const shippingConfig = getShopShippingConfig(currentShop);
    const enabledCount = countEnabledShippingMethods(shippingConfig);
    const disabledAttr = state.shippingSettingsSaving ? "disabled" : "";
    const statusCopy = state.shippingSettingsSaving
      ? "Đang cập nhật..."
      : "Bật hoặc tắt từng phương thức để áp dụng ngay cho shop.";

    els.shippingSettingsContent.innerHTML = `
      <div class="seller-inline-alert">
        ${escapeHtml(currentShop.name || "Shop")} có thể chủ động bật hoặc tắt phương thức vận chuyển phù hợp với quá trình vận hành hiện tại. ${statusCopy}
      </div>
      <div class="seller-shipping-card">
        <div class="seller-shipping-head">
          <strong>Phương thức vận chuyển</strong>
          <span class="muted">${enabledCount}/${SHIPPING_METHODS.length} phương thức đang bật</span>
        </div>
        ${SHIPPING_METHODS.map((method) => {
          const enabled = Boolean(shippingConfig?.[method.key]);
          return `
            <label class="seller-switch-row">
              <span>
                <strong>${escapeHtml(method.label)}</strong>
                <small>${escapeHtml(method.description)} · ${
                  enabled ? "Đang bật" : "Chưa bật"
                }</small>
              </span>
              <input
                type="checkbox"
                data-shipping-toggle="${escapeHtml(method.key)}"
                ${enabled ? "checked" : ""}
                ${disabledAttr}
              />
              <span class="seller-switch"></span>
            </label>
          `;
        }).join("")}
      </div>
    `;
  };

  const updateShippingSettings = async (methodKey, enabled) => {
    const currentShop = getCurrentShop();
    if (!currentShop || !methodKey) return;

    const currentConfig = getShopShippingConfig(currentShop);
    const nextConfig = {
      ...currentConfig,
      [methodKey]: Boolean(enabled),
    };

    if (!countEnabledShippingMethods(nextConfig)) {
      showStatus("Shop cần bật ít nhất 1 phương thức vận chuyển.", {
        error: true,
      });
      renderShippingSettings();
      return;
    }

    state.shippingSettingsSaving = true;
    renderShippingSettings();
    showStatus("Đang cập nhật phương thức vận chuyển...", { persist: true });

    try {
      const payload = await apiFetch(
        `/shops/${encodeURIComponent(currentShop.id)}/profile`,
        {
          method: "PATCH",
          body: {
            shipping_config: nextConfig,
          },
        },
        { redirectOn401: true }
      );

      replaceApprovedShop({ ...currentShop, ...(payload?.shop || {}) });
      state.shippingSettingsSaving = false;
      renderAll();
      showStatus("Đã cập nhật phương thức vận chuyển.");
    } catch (error) {
      state.shippingSettingsSaving = false;
      renderShippingSettings();
      showStatus(
        error instanceof Error
          ? error.message
          : "Không thể cập nhật phương thức vận chuyển.",
        { error: true }
      );
    }
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
          note: "Những sản phẩm còn từ 10 đơn vị trong kho.",
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
          note:
            "Bao gồm sản phẩm hiển thị, chờ duyệt, chưa được đăng, bị khóa và đang ẩn.",
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
          target: "orders-all",
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

  const renderFinanceEmptyView = (view, title, copy) => {
    if (!view) return;

    view.innerHTML = `
      <article class="seller-panel">
        <div class="seller-panel-head">
          <div>
            <span class="seller-eyebrow">Tài chính</span>
            <h2>${escapeHtml(title)}</h2>
            <p class="muted">${escapeHtml(copy)}</p>
          </div>
        </div>
        <div class="seller-empty-block">Chưa có shop đã duyệt để hiển thị dữ liệu tài chính.</div>
      </article>
    `;
  };

  const renderFinanceRevenue = () => {
    if (!els.financeRevenueView) return;

    const currentShop = getCurrentShop();
    if (!currentShop) {
      renderFinanceEmptyView(
        els.financeRevenueView,
        "Doanh thu",
        "Theo dõi doanh thu của shop theo đơn đã giao và đơn đã hoàn thành."
      );
      return;
    }

    const dashboardMetrics = getDashboardMetrics();
    const financeMetrics = getFinanceMetrics();
    const paymentAccount = getShopPaymentAccount(currentShop);
    const recentTransactions = sortOrderItems(financeMetrics.completedItems).slice(0, 8);

    els.financeRevenueView.innerHTML = `
      <section class="seller-finance-shell">
        <article class="seller-panel">
          <div class="seller-panel-head seller-panel-head-wrap">
            <div>
              <span class="seller-eyebrow">Tài chính</span>
              <h2>Doanh thu của ${escapeHtml(currentShop.name || "shop")}</h2>
              <p class="muted">Tổng hợp các item đã giao hoặc đã hoàn thành thuộc shop đang chọn.</p>
            </div>
            <div class="stack-actions">
              <button class="seller-btn subtle" type="button" data-view-target="finance-wallet">
                Số dư tk Bambi
              </button>
              <button class="seller-btn ghost" type="button" data-view-target="finance-bank">
                Tài khoản ngân hàng
              </button>
            </div>
          </div>
          <div class="seller-stat-grid seller-finance-stat-grid">
            <article class="seller-summary-card">
              <h3>Doanh thu đã ghi nhận</h3>
              <span class="seller-summary-value">${escapeHtml(
                formatPrice(financeMetrics.totalCompletedRevenue)
              )}</span>
              <div class="seller-summary-note">Bao gồm các item ở trạng thái đã giao và hoàn thành.</div>
            </article>
            <article class="seller-summary-card">
              <h3>Đơn đã giao/hoàn thành</h3>
              <span class="seller-summary-value">${escapeHtml(
                formatCompactNumber(financeMetrics.completedItems.length)
              )}</span>
              <div class="seller-summary-note">Đếm theo item seller đã đi qua bước giao xong.</div>
            </article>
            <article class="seller-summary-card">
              <h3>Chờ người mua xác nhận</h3>
              <span class="seller-summary-value">${escapeHtml(
                formatPrice(financeMetrics.deliveredRevenue)
              )}</span>
              <div class="seller-summary-note">${escapeHtml(
                `${formatCompactNumber(financeMetrics.deliveredItems.length)} item đang ở trạng thái Đã giao.`
              )}</div>
            </article>
            <article class="seller-summary-card">
              <h3>Giá trị trung bình/item</h3>
              <span class="seller-summary-value">${escapeHtml(
                formatPrice(financeMetrics.averageCompletedValue)
              )}</span>
              <div class="seller-summary-note">Tính trên các item đã giao hoặc hoàn thành của shop.</div>
            </article>
          </div>
        </article>

        <section class="seller-dashboard-grid seller-finance-grid">
          <article class="seller-panel">
            <div class="seller-panel-head">
              <div>
                <h2>Giao dịch gần đây</h2>
                <p class="muted">Danh sách item mới nhất đang đóng góp vào doanh thu của shop.</p>
              </div>
            </div>
            ${buildFinanceTransactionList(recentTransactions, {
              emptyMessage: "Chưa có giao dịch doanh thu nào cho shop này.",
            })}
          </article>

          <aside class="seller-panel">
            <div class="seller-panel-head">
              <div>
                <h2>Tóm tắt đối soát</h2>
                <p class="muted">Kiểm tra nhanh nơi nhận tiền và chỉ số bán hàng chính.</p>
              </div>
            </div>
            <div class="seller-suggestion-stack">
              <article class="seller-suggestion-card">
                <strong>Doanh số mở rộng</strong>
                <span class="muted">${escapeHtml(
                  formatPrice(dashboardMetrics.grossRevenue)
                )}</span>
              </article>
              <article class="seller-suggestion-card">
                <strong>Đã hoàn thành</strong>
                <span class="muted">${escapeHtml(
                  formatPrice(financeMetrics.receivedRevenue)
                )}</span>
              </article>
              <article class="seller-suggestion-card">
                <strong>Tài khoản nhận tiền</strong>
                <span class="muted">${escapeHtml(
                  paymentAccount
                    ? `${paymentAccount.bank_name || "Ngân hàng"} · ${maskAccountNumber(
                        paymentAccount.account_number
                      )}`
                    : "Chưa cập nhật tài khoản ngân hàng"
                )}</span>
              </article>
            </div>
          </aside>
        </section>
      </section>
    `;
  };

  const renderFinanceWalletLegacy = () => {
    if (!els.financeWalletView) return;

    {
      const activeShop = getCurrentShop();
      if (!activeShop) {
        renderFinanceEmptyView(
          els.financeWalletView,
          "Sá»‘ dÆ° tk Bambi",
          "Theo dÃµi sá»‘ dÆ° kháº£ dá»¥ng vÃ  cÃ¡c khoáº£n Ä‘ang chá» Ä‘á»‘i soÃ¡t."
        );
        return;
      }

      const metrics = getFinanceMetrics();
      const bankAccount = getShopPaymentAccount(activeShop);
      const walletBalance = Number(state.walletSummary?.wallet?.balance || 0);
      const totalCredited = Number(state.walletSummary?.stats?.total_credited || 0);
      const totalRequested = Number(state.walletSummary?.stats?.total_requested || 0);
      const walletTransactions = Array.isArray(state.walletSummary?.transactions)
        ? state.walletSummary.transactions
        : [];
      const canRequestWithdrawal =
        walletBalance > 0 &&
        Boolean(bankAccount?.bank_name) &&
        Boolean(bankAccount?.account_number) &&
        !state.isRequestingWithdrawal;

      els.financeWalletView.innerHTML = `
        <section class="seller-finance-shell">
          <article class="seller-panel">
            <div class="seller-panel-head seller-panel-head-wrap">
              <div>
                <span class="seller-eyebrow">TÃ i chÃ­nh</span>
                <h2>Sá»‘ dÆ° tk Bambi</h2>
                <p class="muted">Khi item Ä‘Æ¡n hÃ ng hoÃ n táº¥t vÃ  admin Ä‘á»‘i soÃ¡t, tiá»n sáº½ Ä‘Æ°á»£c cá»™ng vÃ o ví Ä‘á»ƒ shop rÃºt vá» ngÃ¢n hÃ ng.</p>
              </div>
              <div class="stack-actions">
                <button class="seller-btn subtle" type="button" data-view-target="finance-revenue">
                  Doanh thu
                </button>
                <button class="seller-btn ghost" type="button" data-view-target="finance-bank">
                  TÃ i khoáº£n ngÃ¢n hÃ ng
                </button>
              </div>
            </div>

            <div class="seller-finance-balance-card">
              <div class="seller-finance-balance-main">
                <span>Sá»‘ dÆ° kháº£ dá»¥ng</span>
                <strong>${escapeHtml(formatPrice(walletBalance))}</strong>
                <p class="muted">Sá»‘ dÆ° nÃ y Ä‘Æ°á»£c cá»™ng tá»« cÃ¡c Ä‘Æ¡n Ä‘Ã£ hoÃ n thÃ nh vÃ  báº¡n cÃ³ thá»ƒ yÃªu cáº§u thanh toÃ¡n vá» tÃ i khoáº£n ngÃ¢n hÃ ng cá»§a shop.</p>
                <div class="stack-actions">
                  <button
                    class="seller-btn primary"
                    type="button"
                    data-action="request-wallet-withdrawal"
                    ${canRequestWithdrawal ? "" : "disabled"}
                  >
                    ${escapeHtml(
                      state.isRequestingWithdrawal ? "Äang gá»­i yÃªu cáº§u..." : "YÃªu cáº§u thanh toÃ¡n"
                    )}
                  </button>
                </div>
              </div>
              <div class="seller-finance-balance-side">
                <article class="seller-suggestion-card">
                  <strong>Tá»•ng Ä‘Ã£ cá»™ng vÃ o ví</strong>
                  <span class="muted">${escapeHtml(formatPrice(totalCredited))}</span>
                </article>
                <article class="seller-suggestion-card">
                  <strong>Tá»•ng Ä‘Ã£ yÃªu cáº§u thanh toÃ¡n</strong>
                  <span class="muted">${escapeHtml(formatPrice(totalRequested))}</span>
                </article>
                <article class="seller-suggestion-card">
                  <strong>TÃ i khoáº£n nháº­n tiá»n</strong>
                  <span class="muted">${escapeHtml(
                    bankAccount
                      ? `${bankAccount.bank_name || "NgÃ¢n hÃ ng"} Â· ${maskAccountNumber(
                          bankAccount.account_number
                        )}`
                      : "ChÆ°a liÃªn káº¿t tÃ i khoáº£n ngÃ¢n hÃ ng"
                  )}</span>
                </article>
                <article class="seller-suggestion-card">
                  <strong>Doanh thu hoÃ n táº¥t cá»§a shop</strong>
                  <span class="muted">${escapeHtml(
                    formatPrice(metrics.receivedRevenue)
                  )}</span>
                </article>
              </div>
            </div>
          </article>

          <article class="seller-panel">
            <div class="seller-panel-head">
              <div>
                <h2>Lá»‹ch sá»­ ví Bambi</h2>
                <p class="muted">Bao gá»“m cÃ¡c khoáº£n admin Ä‘á»‘i soÃ¡t vÃ  cÃ¡c yÃªu cáº§u thanh toÃ¡n vá» ngÃ¢n hÃ ng.</p>
              </div>
            </div>
            ${buildWalletTransactionList(
              walletTransactions,
              "ChÆ°a cÃ³ giao dá»‹ch ví nÃ o Ä‘Æ°á»£c ghi nháº­n."
            )}
          </article>
        </section>
      `;
      return;
    }

    const currentShop = getCurrentShop();
    if (!currentShop) {
      renderFinanceEmptyView(
        els.financeWalletView,
        "Số dư tk Bambi",
        "Theo dõi số dư khả dụng và các khoản đang chờ đối soát."
      );
      return;
    }

    const financeMetrics = getFinanceMetrics();
    const paymentAccount = getShopPaymentAccount(currentShop);
    const walletBalance = Number(state.walletSummary?.wallet?.available_balance || 0);
    const pendingWithdrawals = Number(
      state.walletSummary?.stats?.pending_withdrawals || 0
    );
    const totalCredited = Number(state.walletSummary?.stats?.total_credited || 0);
    const totalRequested = Number(state.walletSummary?.stats?.total_requested || 0);
    const walletTransactions = Array.isArray(state.walletSummary?.transactions)
      ? state.walletSummary.transactions
      : [];
    const canRequestWithdrawal =
      walletBalance > 0 &&
      Boolean(paymentAccount?.bank_name) &&
      Boolean(paymentAccount?.account_number) &&
      !state.isRequestingWithdrawal;

    els.financeWalletView.innerHTML = `
      <section class="seller-finance-shell">
        <article class="seller-panel">
          <div class="seller-panel-head seller-panel-head-wrap">
            <div>
              <span class="seller-eyebrow">Tài chính</span>
              <h2>Số dư tk Bambi</h2>
              <p class="muted">Tập trung vào số dư khả dụng, khoản đã hoàn tất và tài khoản nhận tiền hiện tại.</p>
            </div>
            <div class="stack-actions">
              <button class="seller-btn subtle" type="button" data-view-target="finance-revenue">
                Doanh thu
              </button>
              <button class="seller-btn ghost" type="button" data-view-target="finance-bank">
                Tài khoản ngân hàng
              </button>
            </div>
          </div>

          <div class="seller-finance-balance-card">
            <div class="seller-finance-balance-main">
              <span>Số dư khả dụng</span>
              <strong>${escapeHtml(formatPrice(estimatedAvailableBalance))}</strong>
              <p class="muted">Số dư khả dụng sẽ tiếp tục được đồng bộ khi luồng đối soát payout cập nhật vào seller console.</p>
            </div>
            <div class="seller-finance-balance-side">
              <article class="seller-suggestion-card">
                <strong>Đã hoàn thành</strong>
                <span class="muted">${escapeHtml(
                  formatPrice(financeMetrics.receivedRevenue)
                )}</span>
              </article>
              <article class="seller-suggestion-card">
                <strong>Đã giao chờ xác nhận</strong>
                <span class="muted">${escapeHtml(
                  formatPrice(financeMetrics.deliveredRevenue)
                )}</span>
              </article>
              <article class="seller-suggestion-card">
                <strong>Tài khoản nhận tiền</strong>
                <span class="muted">${escapeHtml(
                  paymentAccount
                    ? `${paymentAccount.bank_name || "Ngân hàng"} · ${maskAccountNumber(
                        paymentAccount.account_number
                      )}`
                    : "Chưa liên kết tài khoản ngân hàng"
                )}</span>
              </article>
            </div>
          </div>
        </article>

        <article class="seller-panel">
          <div class="seller-panel-head">
            <div>
              <h2>Khoản cộng gần đây</h2>
              <p class="muted">Các item đã hoàn thành gần nhất đang tham gia vào luồng thanh toán của shop.</p>
            </div>
          </div>
          ${buildFinanceTransactionList(recentCredits, {
            emptyMessage: "Chưa có item hoàn thành nào để ghi nhận vào số dư.",
            statusLabel: "Đã hoàn thành",
          })}
        </article>
      </section>
    `;
  };

  const renderFinanceBankLegacy = () => {
    if (!els.financeBankView) return;

    const currentShop = getCurrentShop();
    if (!currentShop) {
      renderFinanceEmptyView(
        els.financeBankView,
        "Tài khoản ngân hàng",
        "Kiểm tra tài khoản ngân hàng nhận tiền đang liên kết với shop."
      );
      return;
    }

    const paymentAccount = getShopPaymentAccount(currentShop);

    els.financeBankView.innerHTML = `
      <section class="seller-finance-shell">
        <article class="seller-panel">
          <div class="seller-panel-head seller-panel-head-wrap">
            <div>
              <span class="seller-eyebrow">Tài chính</span>
              <h2>Tài khoản ngân hàng</h2>
              <p class="muted">Thông tin tài khoản nhận tiền đang lấy từ hồ sơ shop đã duyệt.</p>
            </div>
            <div class="stack-actions">
              <button class="seller-btn subtle" type="button" data-view-target="finance-wallet">
                Số dư tk Bambi
              </button>
              <button class="seller-btn ghost" type="button" data-view-target="shop-profile">
                Hồ sơ shop
              </button>
            </div>
          </div>

          ${
            paymentAccount
              ? `
                <div class="seller-finance-bank-grid">
                  <article class="seller-finance-bank-card">
                    <div class="seller-finance-bank-card-head">
                      <div>
                        <small>Ngân hàng nhận tiền</small>
                        <h3>${escapeHtml(paymentAccount.bank_name || "Ngân hàng")}</h3>
                      </div>
                      <span class="seller-finance-pill">Đang sử dụng</span>
                    </div>
                    <div class="seller-finance-bank-number">${escapeHtml(
                      maskAccountNumber(paymentAccount.account_number)
                    )}</div>
                    <div class="seller-finance-bank-foot">
                      <strong>${escapeHtml(
                        paymentAccount.account_holder || "Chưa cập nhật chủ tài khoản"
                      )}</strong>
                      <span>${escapeHtml(
                        currentShop.status === "approved"
                          ? "Đã đối chiếu với hồ sơ shop"
                          : "Đang chờ xác minh"
                      )}</span>
                    </div>
                  </article>

                  <div class="seller-shop-info-grid">
                    ${renderProfileInfoItems([
                      {
                        label: "Ngân hàng",
                        value: paymentAccount.bank_name || "Chưa cập nhật",
                      },
                      {
                        label: "Số tài khoản",
                        value: paymentAccount.account_number || "Chưa cập nhật",
                      },
                      {
                        label: "Chủ tài khoản",
                        value: paymentAccount.account_holder || "Chưa cập nhật",
                      },
                      {
                        label: "Trạng thái hồ sơ",
                        value:
                          currentShop.status === "approved" ? "Đã duyệt" : currentShop.status || "N/A",
                      },
                      {
                        label: "Email liên hệ shop",
                        value: currentShop.contact_email || "Chưa cập nhật",
                        wide: true,
                      },
                      {
                        label: "Gợi ý cập nhật",
                        value: "Chỉnh sửa ở Hồ sơ shop khi cần thay đổi tài khoản nhận tiền.",
                        wide: true,
                      },
                    ])}
                  </div>
                </div>
              `
              : `
                <div class="seller-empty-block">
                  Shop chưa có tài khoản ngân hàng nhận tiền. Hãy cập nhật ở Hồ sơ shop để seller có thể đối soát.
                </div>
              `
          }
        </article>
      </section>
    `;
  };

  const renderFinanceWalletView = () => {
    if (!els.financeWalletView) return;

    const currentShop = getCurrentShop();
    if (!currentShop) {
      renderFinanceEmptyView(
        els.financeWalletView,
        "S\u1ed1 d\u01b0 tk Bambi",
        "Theo d\u00f5i s\u1ed1 d\u01b0 kh\u1ea3 d\u1ee5ng v\u00e0 c\u00e1c kho\u1ea3n \u0111ang ch\u1edd \u0111\u1ed1i so\u00e1t."
      );
      return;
    }

    const financeMetrics = getFinanceMetrics();
    const paymentAccount = getShopPaymentAccount(currentShop);
    const walletBalance = Number(state.walletSummary?.wallet?.available_balance || 0);
    const pendingWithdrawals = Number(
      state.walletSummary?.stats?.pending_withdrawals || 0
    );
    const totalCredited = Number(state.walletSummary?.stats?.total_credited || 0);
    const totalRequested = Number(state.walletSummary?.stats?.total_requested || 0);
    const walletTransactions = Array.isArray(state.walletSummary?.transactions)
      ? state.walletSummary.transactions
      : [];
    const canRequestWithdrawal =
      walletBalance > 0 &&
      Boolean(paymentAccount?.bank_name) &&
      Boolean(paymentAccount?.account_number) &&
      !state.isRequestingWithdrawal;

    els.financeWalletView.innerHTML = `
      <section class="seller-finance-shell">
        <article class="seller-panel">
          <div class="seller-panel-head seller-panel-head-wrap">
            <div>
              <span class="seller-eyebrow">T\u00e0i ch\u00ednh</span>
              <h2>S\u1ed1 d\u01b0 tk Bambi</h2>
              <p class="muted">Sau khi kh\u00e1ch x\u00e1c nh\u1eadn \u0111\u00e3 nh\u1eadn h\u00e0ng, Bambi \u0111\u1ed1i so\u00e1t trong 5 ng\u00e0y r\u1ed3i c\u1ed9ng 70% gi\u00e1 tr\u1ecb \u0111\u01a1n v\u00e0o v\u00ed c\u1ee7a shop. Y\u00eau c\u1ea7u r\u00fat ti\u1ec1n s\u1ebd ch\u1edd admin duy\u1ec7t.</p>
            </div>
            <div class="stack-actions">
              <button class="seller-btn subtle" type="button" data-view-target="finance-revenue">
                Doanh thu
              </button>
              <button class="seller-btn ghost" type="button" data-view-target="finance-bank">
                T\u00e0i kho\u1ea3n ng\u00e2n h\u00e0ng
              </button>
            </div>
          </div>

          <div class="seller-finance-balance-card">
            <div class="seller-finance-balance-main">
              <span>S\u1ed1 d\u01b0 kh\u1ea3 d\u1ee5ng</span>
              <strong>${escapeHtml(formatPrice(walletBalance))}</strong>
              <p class="muted">S\u1ed1 d\u01b0 n\u00e0y \u0111\u00e3 tr\u1eeb c\u00e1c y\u00eau c\u1ea7u r\u00fat ti\u1ec1n \u0111ang ch\u1edd duy\u1ec7t v\u00e0 s\u1eb5n s\u00e0ng chuy\u1ec3n v\u1ec1 t\u00e0i kho\u1ea3n ng\u00e2n h\u00e0ng c\u1ee7a shop.</p>
              <div class="stack-actions">
                <button
                  class="seller-btn primary"
                  type="button"
                  data-action="request-wallet-withdrawal"
                  ${canRequestWithdrawal ? "" : "disabled"}
                >
                  ${escapeHtml(
                    state.isRequestingWithdrawal
                      ? "\u0110ang g\u1eedi y\u00eau c\u1ea7u..."
                      : "Y\u00eau c\u1ea7u thanh to\u00e1n"
                  )}
                </button>
              </div>
            </div>
            <div class="seller-finance-balance-side">
              <article class="seller-suggestion-card">
                <strong>T\u1ed5ng \u0111\u00e3 c\u1ed9ng v\u00e0o v\u00ed</strong>
                <span class="muted">${escapeHtml(formatPrice(totalCredited))}</span>
              </article>
              <article class="seller-suggestion-card">
                <strong>\u0110ang ch\u1edd admin duy\u1ec7t</strong>
                <span class="muted">${escapeHtml(formatPrice(pendingWithdrawals))}</span>
              </article>
              <article class="seller-suggestion-card">
                <strong>\u0110ang ch\u1edd admin duy\u1ec7t</strong>
                <span class="muted">${escapeHtml(formatPrice(pendingWithdrawals))}</span>
              </article>
              <article class="seller-suggestion-card">
                <strong>T\u1ed5ng \u0111\u00e3 y\u00eau c\u1ea7u thanh to\u00e1n</strong>
                <span class="muted">${escapeHtml(formatPrice(totalRequested))}</span>
              </article>
              <article class="seller-suggestion-card">
                <strong>T\u00e0i kho\u1ea3n nh\u1eadn ti\u1ec1n</strong>
                <span class="muted">${escapeHtml(
                  paymentAccount
                    ? `${paymentAccount.bank_name || "Ng\u00e2n h\u00e0ng"} \u00b7 ${maskAccountNumber(
                        paymentAccount.account_number
                      )}`
                    : "Ch\u01b0a li\u00ean k\u1ebft t\u00e0i kho\u1ea3n ng\u00e2n h\u00e0ng"
                )}</span>
              </article>
              <article class="seller-suggestion-card">
                <strong>Doanh thu ho\u00e0n t\u1ea5t c\u1ee7a shop</strong>
                <span class="muted">${escapeHtml(
                  formatPrice(financeMetrics.receivedRevenue)
                )}</span>
              </article>
            </div>
          </div>
        </article>

        <article class="seller-panel">
          <div class="seller-panel-head">
            <div>
              <h2>L\u1ecbch s\u1eed v\u00ed Bambi</h2>
              <p class="muted">Bao g\u1ed3m kho\u1ea3n \u0111\u01b0\u1ee3c c\u1ed9ng v\u00e0o v\u00ed, kho\u1ea3n ho\u00e0n t\u00e1c khi tr\u1ea3 h\u00e0ng v\u00e0 c\u00e1c y\u00eau c\u1ea7u r\u00fat ti\u1ec1n.</p>
            </div>
          </div>
          ${buildWalletTransactionList(
            walletTransactions,
            "Ch\u01b0a c\u00f3 giao d\u1ecbch v\u00ed n\u00e0o \u0111\u01b0\u1ee3c ghi nh\u1eadn."
          )}
        </article>
      </section>
    `;
  };

  const renderFinanceBankView = () => {
    if (!els.financeBankView) return;

    const currentShop = getCurrentShop();
    if (!currentShop) {
      renderFinanceEmptyView(
        els.financeBankView,
        "T\u00e0i kho\u1ea3n ng\u00e2n h\u00e0ng",
        "Ki\u1ec3m tra t\u00e0i kho\u1ea3n ng\u00e2n h\u00e0ng nh\u1eadn ti\u1ec1n \u0111ang li\u00ean k\u1ebft v\u1edbi shop."
      );
      return;
    }

    const paymentAccount = getShopPaymentAccount(currentShop);

    els.financeBankView.innerHTML = `
      <section class="seller-finance-shell">
        <article class="seller-panel">
          <div class="seller-panel-head seller-panel-head-wrap">
            <div>
              <span class="seller-eyebrow">T\u00e0i ch\u00ednh</span>
              <h2>T\u00e0i kho\u1ea3n ng\u00e2n h\u00e0ng</h2>
              <p class="muted">Th\u00f4ng tin t\u00e0i kho\u1ea3n nh\u1eadn ti\u1ec1n \u0111ang l\u1ea5y t\u1eeb h\u1ed3 s\u01a1 shop \u0111\u00e3 duy\u1ec7t.</p>
            </div>
            <div class="stack-actions">
              <button class="seller-btn subtle" type="button" data-view-target="finance-wallet">
                S\u1ed1 d\u01b0 tk Bambi
              </button>
              <button class="seller-btn ghost" type="button" data-view-target="shop-profile">
                H\u1ed3 s\u01a1 shop
              </button>
            </div>
          </div>

          ${
            paymentAccount
              ? `
                <div class="seller-finance-bank-grid">
                  <article class="seller-finance-bank-card">
                    <div class="seller-finance-bank-card-head">
                      <div>
                        <small>Ng\u00e2n h\u00e0ng nh\u1eadn ti\u1ec1n</small>
                        <h3>${escapeHtml(paymentAccount.bank_name || "Ng\u00e2n h\u00e0ng")}</h3>
                      </div>
                      <span class="seller-finance-pill">\u0110ang s\u1eed d\u1ee5ng</span>
                    </div>
                    <div class="seller-finance-bank-number">${escapeHtml(
                      maskAccountNumber(paymentAccount.account_number)
                    )}</div>
                    <div class="seller-finance-bank-foot">
                      <strong>${escapeHtml(
                        paymentAccount.account_holder || "Ch\u01b0a c\u1eadp nh\u1eadt ch\u1ee7 t\u00e0i kho\u1ea3n"
                      )}</strong>
                      <span>${escapeHtml(
                        currentShop.status === "approved"
                          ? "\u0110\u00e3 \u0111\u1ed1i chi\u1ebfu v\u1edbi h\u1ed3 s\u01a1 shop"
                          : "\u0110ang ch\u1edd x\u00e1c minh"
                      )}</span>
                    </div>
                  </article>

                  <div class="seller-shop-info-grid">
                    ${renderProfileInfoItems([
                      {
                        label: "Ng\u00e2n h\u00e0ng",
                        value: paymentAccount.bank_name || "Ch\u01b0a c\u1eadp nh\u1eadt",
                      },
                      {
                        label: "S\u1ed1 t\u00e0i kho\u1ea3n",
                        value: paymentAccount.account_number || "Ch\u01b0a c\u1eadp nh\u1eadt",
                      },
                      {
                        label: "Ch\u1ee7 t\u00e0i kho\u1ea3n",
                        value: paymentAccount.account_holder || "Ch\u01b0a c\u1eadp nh\u1eadt",
                      },
                      {
                        label: "Tr\u1ea1ng th\u00e1i h\u1ed3 s\u01a1",
                        value:
                          currentShop.status === "approved" ? "\u0110\u00e3 duy\u1ec7t" : currentShop.status || "N/A",
                      },
                      {
                        label: "Email li\u00ean h\u1ec7 shop",
                        value: currentShop.contact_email || "Ch\u01b0a c\u1eadp nh\u1eadt",
                        wide: true,
                      },
                      {
                        label: "G\u1ee3i \u00fd c\u1eadp nh\u1eadt",
                        value: "Ch\u1ec9nh s\u1eeda \u1edf H\u1ed3 s\u01a1 shop khi c\u1ea7n thay \u0111\u1ed5i t\u00e0i kho\u1ea3n nh\u1eadn ti\u1ec1n.",
                        wide: true,
                      },
                    ])}
                  </div>
                </div>
              `
              : `
                <div class="seller-empty-block">
                  Shop ch\u01b0a c\u00f3 t\u00e0i kho\u1ea3n ng\u00e2n h\u00e0ng nh\u1eadn ti\u1ec1n. H\u00e3y c\u1eadp nh\u1eadt \u1edf H\u1ed3 s\u01a1 shop \u0111\u1ec3 seller c\u00f3 th\u1ec3 \u0111\u1ed1i so\u00e1t.
                </div>
              `
          }
        </article>
      </section>
    `;
  };

  const renderProfileInfoItems = (items) =>
    items
      .map((item) => {
        const wideClass = item.wide ? " seller-info-item-wide" : "";
        const detailHtml = item.detail
          ? `<p>${escapeHtml(item.detail)}</p>`
          : "";
        const valueHtml = item.valueHtml
          ? item.valueHtml
          : `<strong>${escapeHtml(item.value || "Chưa cập nhật")}</strong>`;

        return `
          <article class="seller-info-item${wideClass}">
            <span>${escapeHtml(item.label)}</span>
            ${valueHtml}
            ${detailHtml}
          </article>
        `;
      })
      .join("");

  const renderShopDocumentCards = (shop) => {
    const docTypes = [
      "business_license",
      "identity_front",
      "identity_selfie",
      "identity_extra",
    ];

    return docTypes
      .map((docType) => {
        const documents = getShopDocumentsByType(shop, docType);
        const linksHtml = documents.length
          ? documents
              .map(
                (doc, index) => `
                  <a class="seller-doc-link" href="${escapeHtml(
                    doc?.doc_url || "#"
                  )}" target="_blank" rel="noreferrer">
                    <span>${escapeHtml(`${getDocTypeLabel(docType)} ${documents.length > 1 ? `#${index + 1}` : ""}`.trim())}</span>
                    <small>${escapeHtml(doc?.status || "pending")}</small>
                  </a>
                `
              )
              .join("")
          : '<div class="seller-empty-compact">Chưa có tài liệu được tải lên.</div>';

        return `
          <article class="seller-shop-profile-card">
            <div class="seller-panel-head seller-panel-head-wrap">
              <div>
                <h3>${escapeHtml(getDocTypeLabel(docType))}</h3>
                <p class="muted">${escapeHtml(
                  documents.length
                    ? `${documents.length} file đã lưu cho loại tài liệu này.`
                    : "Khu vực này sẽ hiển thị giấy tờ sau khi seller hoàn tất hồ sơ."
                )}</p>
              </div>
            </div>
            <div class="seller-doc-list">
              ${linksHtml}
            </div>
          </article>
        `;
      })
      .join("");
  };

  const renderShopProfile = () => {
    if (!els.shopProfileSummary || !els.shopProfileTabs || !els.shopProfileContent) {
      return;
    }

    const currentShop = getCurrentShop();
    if (!currentShop) {
      els.shopProfileSummary.innerHTML = `
        <div class="seller-empty-block">Chưa có shop đã duyệt để hiển thị hồ sơ.</div>
      `;
      els.shopProfileTabs.innerHTML = "";
      els.shopProfileContent.innerHTML = "";
      return;
    }

    const onboarding = getShopOnboardingData(currentShop);
    const pickupAddress = getShopAddress(currentShop, "pickup");
    const taxAddress = getShopAddress(currentShop, "tax");
    const paymentAccount = getShopPaymentAccount(currentShop);
    const taxInfo = onboarding?.tax_info || {};
    const identityInfo = onboarding?.identity_info || {};
    const shopDocuments = Array.isArray(currentShop.shop_documents)
      ? currentShop.shop_documents
      : [];

    const tabs = [
      { id: "basic", label: "Thông tin cơ bản" },
      { id: "tax", label: "Thông tin thuế" },
      { id: "identity", label: "Thông tin định danh" },
    ];

    if (!tabs.some((tab) => tab.id === state.shopProfileTab)) {
      state.shopProfileTab = "basic";
    }

    const avatarMarkup = getCurrentShopAvatarUrl()
      ? `<img src="${escapeHtml(getCurrentShopAvatarUrl())}" alt="${escapeHtml(
          currentShop.name || "Shop"
        )}" />`
      : `<span>${escapeHtml(getInitial(currentShop.name || "S"))}</span>`;
    const avatarFileLabel = state.shopProfileEditor.avatarFile?.name
      ? state.shopProfileEditor.avatarFile.name
      : getCurrentShopAvatarUrl()
        ? "Đang dùng avatar hiện tại"
        : "Chưa chọn tệp nào";

    els.shopProfileSummary.innerHTML = `
      <div class="seller-shop-profile-hero">
        <article class="seller-shop-profile-card">
          <div class="seller-panel-head seller-panel-head-wrap">
            <div class="seller-shop-profile-brand">
              <div class="seller-shop-avatar">${avatarMarkup}</div>
              <div class="seller-shop-profile-copy">
                <div class="seller-tag-row">
                  <span class="chip ${escapeHtml(
                    currentShop.status === "approved" ? "" : "gray"
                  )}">${escapeHtml(
        currentShop.status === "approved" ? "Đã duyệt" : currentShop.status || "N/A"
      )}</span>
                  <span class="chip gray">ID ${escapeHtml(shortId(currentShop.id))}</span>
                </div>
                <h3>${escapeHtml(currentShop.name || "Shop")}</h3>
                <p>${escapeHtml(
                  currentShop.description ||
                    "Shop chưa cập nhật mô tả. Bạn có thể bổ sung ở bước chỉnh sửa sau."
                )}</p>
                <div class="seller-profile-chip-row">
                  <span>${escapeHtml(currentShop.contact_email || "Chưa có email liên hệ")}</span>
                  <span>${escapeHtml(currentShop.contact_phone || "Chưa có số điện thoại")}</span>
                </div>
              </div>
            </div>
            <div class="stack-actions seller-shop-profile-actions">
              ${
                state.shopProfileEditor.isEditing
                  ? `
                    <button
                      class="seller-btn ghost"
                      type="button"
                      data-action="cancel-shop-profile-edit"
                      ${state.shopProfileEditor.isSaving ? "disabled" : ""}
                    >
                      Hủy
                    </button>
                    <button
                      class="seller-btn primary"
                      type="button"
                      data-action="save-shop-profile"
                      ${state.shopProfileEditor.isSaving ? "disabled" : ""}
                    >
                      ${escapeHtml(
                        state.shopProfileEditor.isSaving ? "Đang lưu..." : "Lưu thay đổi"
                      )}
                    </button>
                  `
                  : `
                    <button class="seller-btn subtle" type="button" data-action="edit-shop-profile">
                      Chỉnh sửa
                    </button>
                  `
              }
            </div>
          </div>
        </article>
      </div>
    `;

    els.shopProfileTabs.innerHTML = tabs
      .map(
        (tab) => `
          <button
            class="seller-profile-tab ${tab.id === state.shopProfileTab ? "active" : ""}"
            type="button"
            data-shop-profile-tab="${escapeHtml(tab.id)}"
          >
            ${escapeHtml(tab.label)}
          </button>
        `
      )
      .join("");

    if (state.shopProfileTab === "basic") {
      els.shopProfileContent.innerHTML = `
        <section class="seller-shop-profile-card">
          <div class="seller-panel-head seller-panel-head-wrap">
            <div>
              <h3>Thông tin cơ bản</h3>
              <p class="muted">Tóm tắt thông tin công khai và vận hành của shop.</p>
            </div>
          </div>
          ${
            state.shopProfileEditor.isEditing
              ? `
                <div class="seller-shop-edit-card">
                  <div class="seller-shop-edit-avatar-row">
                    <div class="seller-shop-avatar seller-shop-avatar-large">${avatarMarkup}</div>
                    <div class="field seller-shop-avatar-field">
                      <label for="shopProfileAvatarInput">Avatar shop</label>
                      <div class="seller-file-input-row ${state.shopProfileEditor.isSaving ? "is-disabled" : ""}">
                        <input
                          id="shopProfileAvatarInput"
                          class="seller-file-input-native"
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          ${state.shopProfileEditor.isSaving ? "disabled" : ""}
                        />
                        <label
                          for="shopProfileAvatarInput"
                          class="seller-file-input-trigger"
                          ${state.shopProfileEditor.isSaving ? 'aria-disabled="true"' : ""}
                        >
                          Chọn tệp
                        </label>
                        <span class="seller-file-input-name">${escapeHtml(avatarFileLabel)}</span>
                      </div>
                      <div class="seller-inline-meta">
                        <span>Avatar này dùng ảnh đại diện tài khoản seller, tối đa 1MB.</span>
                      </div>
                    </div>
                  </div>
                  <div class="field">
                    <label for="shopProfileNameInput">Tên shop</label>
                    <input
                      id="shopProfileNameInput"
                      class="input"
                      maxlength="255"
                      value="${escapeHtml(state.shopProfileEditor.name)}"
                      ${state.shopProfileEditor.isSaving ? "disabled" : ""}
                    />
                  </div>
                  <div class="field">
                    <label for="shopProfileDescriptionInput">Mô tả shop</label>
                    <textarea
                      id="shopProfileDescriptionInput"
                      class="textarea"
                      placeholder="Giới thiệu ngắn về shop"
                      ${state.shopProfileEditor.isSaving ? "disabled" : ""}
                    >${escapeHtml(state.shopProfileEditor.description)}</textarea>
                  </div>
                </div>
              `
              : ""
          }
          <div class="seller-shop-info-grid">
            ${renderProfileInfoItems([
              { label: "Tên shop", value: currentShop.name },
              {
                label: "Mô tả shop",
                value: currentShop.description || "Chưa cập nhật",
                wide: true,
              },
              {
                label: "Email liên hệ",
                value: currentShop.contact_email || "Chưa cập nhật",
              },
              {
                label: "Số điện thoại",
                value: currentShop.contact_phone || "Chưa cập nhật",
              },
              {
                label: "Địa chỉ lấy hàng",
                value: pickupAddress ? buildAddressText(pickupAddress) : "Chưa cập nhật",
                detail:
                  pickupAddress?.contact_name || pickupAddress?.contact_phone
                    ? `${pickupAddress?.contact_name || "Chưa có người nhận"} · ${
                        pickupAddress?.contact_phone || "Chưa có số điện thoại"
                      }`
                    : "",
                wide: true,
              },
              {
                label: "Tài khoản nhận tiền",
                value: paymentAccount
                  ? `${paymentAccount.account_holder || "Chưa rõ"} · ${
                      paymentAccount.bank_name || "Chưa có ngân hàng"
                    }`
                  : "Chưa cập nhật",
                detail: paymentAccount?.account_number || "",
                wide: true,
              },
            ])}
          </div>
        </section>
      `;
      return;
    }

    if (state.shopProfileTab === "tax") {
      els.shopProfileContent.innerHTML = `
        <section class="seller-shop-profile-card">
          <div class="seller-inline-alert">
            Thông tin thuế hiện được lấy từ hồ sơ đăng ký shop đã được duyệt. Màn hình này đang ở chế độ xem trước, chưa mở chỉnh sửa trực tiếp.
          </div>
          <div class="seller-shop-info-grid">
            ${renderProfileInfoItems([
              {
                label: "Loại hình kinh doanh",
                value: formatBusinessType(taxInfo?.business_type),
              },
              {
                label: "Tên pháp lý / đơn vị",
                value: taxInfo?.business_name || "Chưa cập nhật",
              },
              {
                label: "Mã số thuế",
                value: taxInfo?.tax_code || "Chưa cập nhật",
              },
              {
                label: "Email hóa đơn",
                value: taxInfo?.invoice_email || "Chưa cập nhật",
              },
              {
                label: "Địa chỉ đăng ký thuế",
                value: taxAddress ? buildAddressText(taxAddress) : "Chưa cập nhật",
                detail:
                  taxAddress?.contact_name || taxAddress?.contact_phone
                    ? `${taxAddress?.contact_name || "Chưa có người liên hệ"} · ${
                        taxAddress?.contact_phone || "Chưa có số điện thoại"
                      }`
                    : "",
                wide: true,
              },
            ])}
          </div>
        </section>
      `;
      return;
    }

    els.shopProfileContent.innerHTML = `
      <section class="seller-shop-profile-card">
        <div class="seller-shop-info-grid">
          ${renderProfileInfoItems([
            {
              label: "Hình thức định danh",
              value: formatIdentityType(identityInfo?.identity_type),
            },
            {
              label: "Số giấy tờ",
              value: identityInfo?.identity_number || "Chưa cập nhật",
            },
            {
              label: "Họ và tên",
              value: identityInfo?.identity_full_name || "Chưa cập nhật",
            },
            {
              label: "Xác nhận hồ sơ",
              value: identityInfo?.consent ? "Đã xác nhận" : "Chưa xác nhận",
            },
          ])}
        </div>
      </section>
      <section class="seller-doc-grid">
        ${renderShopDocumentCards(currentShop)}
      </section>
    `;
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

    const counts = getProductStatusCounts(state.products);
    const labels = {
      all: "Tất cả",
      active: "Đang hoạt động",
      pending: "Chờ duyệt",
      rejected: "Chưa được đăng",
      locked: "Bị khóa",
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
    const counts = getProductStatusCounts(state.products);

    if (els.productsSummary) {
      els.productsSummary.textContent = [
        `${formatCompactNumber(filtered.length)}/${formatCompactNumber(
          state.products.length
        )} sản phẩm`,
        `${formatCompactNumber(counts.active)} đang hiển thị`,
        `${formatCompactNumber(counts.pending)} chờ duyệt`,
        `${formatCompactNumber(counts.rejected)} chưa được đăng`,
        `${formatCompactNumber(counts.locked)} bị khóa`,
        `${formatCompactNumber(counts.inactive)} đang ẩn`,
      ].join(" · ");
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
              const canToggle =
                product.status === "active" || product.status === "inactive";
              const toggleLabel = product.status === "active" ? "Ẩn" : "Gửi duyệt";
              const toggleNextStatus =
                product.status === "active" ? "inactive" : "pending";
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
                        data-action="edit-product"
                        data-product-id="${escapeHtml(product.id)}"
                      >
                        Sửa
                      </button>
                      ${
                        canToggle
                          ? `
                            <button
                              class="seller-mini-btn ${
                                product.status === "active" ? "warn" : ""
                              }"
                              type="button"
                              data-action="toggle-product"
                              data-product-id="${escapeHtml(product.id)}"
                              data-next-status="${toggleNextStatus}"
                            >
                              ${toggleLabel}
                            </button>
                          `
                          : ""
                      }
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
    const sales = getDraftSalesSnapshot();
    const price = sales.price;
    const stock = sales.stock;

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
          Number.isFinite(sales.price) &&
          sales.price > 0 &&
          Number.isFinite(sales.stock) &&
          sales.stock >= 0,
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
    state.draft.variantItems.forEach((item) => revokeMedia(item?.image));
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

  const renderSalesSection = () => {
    const singleVariantFields = els.productPriceInput?.closest(".seller-two-column");
    const isMultiple = state.draft.variantMode === "multiple";
    const normalizedGroups = getNormalizedVariantGroups();

    if (singleVariantFields) {
      singleVariantFields.hidden = isMultiple;
    }

    if (els.enableVariantGroupsBtn) {
      els.enableVariantGroupsBtn.hidden = isMultiple;
    }

    if (els.multiVariantSection) {
      els.multiVariantSection.hidden = !isMultiple;
      const tableHeadTitle = els.multiVariantSection.querySelector(
        ".seller-variant-table-head strong"
      );
      const tableHeadMeta = els.multiVariantSection.querySelector(
        ".seller-variant-table-head .muted"
      );
      if (tableHeadTitle) {
        tableHeadTitle.textContent = "Danh sách phân loại";
      }
      if (tableHeadMeta) {
        tableHeadMeta.textContent = "Giá và kho hàng là bắt buộc cho từng biến thể.";
      }
    }

    if (els.addSecondVariantGroupBtn) {
      els.addSecondVariantGroupBtn.hidden = !isMultiple || state.draft.variantGroups.length >= 2;
    }

    if (els.variantGroupsEditor) {
      if (!isMultiple) {
        els.variantGroupsEditor.innerHTML = "";
      } else {
        els.variantGroupsEditor.innerHTML = state.draft.variantGroups
          .map(
            (group, groupIndex) => `
              <div class="seller-variant-group-card" data-group-id="${escapeHtml(group.id)}">
                <div class="seller-variant-group-head">
                  <strong>Phân loại ${escapeHtml(String(groupIndex + 1))}</strong>
                  <button
                    class="seller-variant-icon-btn"
                    type="button"
                    data-action="remove-variant-group"
                    data-group-id="${escapeHtml(group.id)}"
                    aria-label="Xóa nhóm phân loại"
                  >
                    ×
                  </button>
                </div>
                <div class="seller-variant-group-form">
                  <label class="seller-variant-label">
                    <span>Tên nhóm</span>
                    <input
                      class="input"
                      type="text"
                      value="${escapeHtml(group.name)}"
                      maxlength="14"
                      data-action="variant-group-name"
                      data-group-id="${escapeHtml(group.id)}"
                      placeholder="Ví dụ: Màu sắc"
                    />
                  </label>
                  <div class="seller-variant-options-list">
                    ${(Array.isArray(group.options) ? group.options : [])
                      .map(
                        (option, optionIndex) => `
                          <div class="seller-variant-option-row">
                            <label class="seller-variant-label seller-variant-option-input">
                              <span>${optionIndex === 0 ? "Tùy chọn" : " "}</span>
                              <input
                                class="input"
                                type="text"
                                value="${escapeHtml(option.value)}"
                                maxlength="20"
                                data-action="variant-option-value"
                                data-group-id="${escapeHtml(group.id)}"
                                data-option-id="${escapeHtml(option.id)}"
                                placeholder="Ví dụ: Đỏ, Xanh"
                              />
                            </label>
                            <div class="seller-variant-option-actions">
                              <button
                                class="seller-variant-icon-btn"
                                type="button"
                                data-action="add-variant-option"
                                data-group-id="${escapeHtml(group.id)}"
                                aria-label="Thêm tùy chọn"
                              >
                                +
                              </button>
                              <button
                                class="seller-variant-icon-btn ghost"
                                type="button"
                                data-action="remove-variant-option"
                                data-group-id="${escapeHtml(group.id)}"
                                data-option-id="${escapeHtml(option.id)}"
                                aria-label="Xóa tùy chọn"
                              >
                                −
                              </button>
                            </div>
                          </div>
                        `
                      )
                      .join("")}
                  </div>
                </div>
              </div>
            `
          )
          .join("");
      }
    }

    if (els.variantMatrixTable) {
      if (!isMultiple) {
        els.variantMatrixTable.innerHTML = "";
      } else if (!normalizedGroups.length || !state.draft.variantItems.length) {
        els.variantMatrixTable.innerHTML = `
          <div class="seller-variant-empty">
            Hãy nhập tên nhóm và ít nhất một tùy chọn hợp lệ để tạo danh sách biến thể.
          </div>
        `;
      } else {
        const groupLabels = normalizedGroups.map((group) => group.name);
        const hasSecondGroup = groupLabels.length > 1;
        const renderVariantImageCell = (item, optionLabel) => {
          const imageUrl = item.image?.url || "";

          return `
            <div class="seller-variant-image-card">
              ${
                imageUrl
                  ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(optionLabel || "Bien the")}" />`
                  : `<span>Chưa có ảnh</span>`
              }
              <div class="seller-variant-image-actions">
                <button
                  class="seller-mini-btn ghost"
                  type="button"
                  data-action="pick-variant-image"
                  data-variant-key="${escapeHtml(item.key)}"
                >
                  ${imageUrl ? "Đổi ảnh" : "Thêm ảnh"}
                </button>
                ${
                  imageUrl
                    ? `<button
                        class="seller-mini-btn ghost"
                        type="button"
                        data-action="remove-variant-image"
                        data-variant-key="${escapeHtml(item.key)}"
                      >
                        Xóa
                      </button>`
                    : ""
                }
              </div>
            </div>
          `;
        };

        const rows = hasSecondGroup
          ? normalizedGroups[0].options
              .map((primaryOption) => {
                const relatedItems = state.draft.variantItems.filter(
                  (item) => item.optionValues[0] === primaryOption
                );

                return relatedItems
                  .map((item, itemIndex) => {
                    const optionLabel = item.optionValues.join(" / ");
                    return `
                      <tr>
                        ${
                          itemIndex === 0
                            ? `<td class="seller-variant-matrix-primary" rowspan="${relatedItems.length}">
                                <strong>${escapeHtml(primaryOption)}</strong>
                              </td>`
                            : ""
                        }
                        <td>${escapeHtml(item.optionValues[1] || "Bien the")}</td>
                        <td>${renderVariantImageCell(item, optionLabel)}</td>
                        <td>
                          <input
                            class="input"
                            type="number"
                            min="0"
                            step="1000"
                            value="${escapeHtml(item.price)}"
                            data-action="variant-row-price"
                            data-variant-key="${escapeHtml(item.key)}"
                            placeholder="Nhập giá"
                          />
                        </td>
                        <td>
                          <input
                            class="input"
                            type="number"
                            min="0"
                            step="1"
                            value="${escapeHtml(item.stock)}"
                            data-action="variant-row-stock"
                            data-variant-key="${escapeHtml(item.key)}"
                            placeholder="0"
                          />
                        </td>
                      </tr>
                    `;
                  })
                  .join("");
              })
              .join("")
          : state.draft.variantItems
              .map((item) => {
                const optionLabel = item.optionValues[0] || "Biến thể";

                return `
                  <tr>
                    <td class="seller-variant-matrix-primary">
                      <strong>${escapeHtml(optionLabel)}</strong>
                    </td>
                    <td>${renderVariantImageCell(item, optionLabel)}</td>
                    <td>
                      <input
                        class="input"
                        type="number"
                        min="0"
                        step="1000"
                        value="${escapeHtml(item.price)}"
                        data-action="variant-row-price"
                        data-variant-key="${escapeHtml(item.key)}"
                        placeholder="Nhập giá"
                      />
                    </td>
                    <td>
                      <input
                        class="input"
                        type="number"
                        min="0"
                        step="1"
                        value="${escapeHtml(item.stock)}"
                        data-action="variant-row-stock"
                        data-variant-key="${escapeHtml(item.key)}"
                        placeholder="0"
                      />
                    </td>
                  </tr>
                `;
              })
              .join("");

        els.variantMatrixTable.innerHTML = `
          <div class="seller-variant-matrix-wrap">
            <table class="seller-variant-matrix">
              <thead>
                <tr>
                  <th>${escapeHtml(groupLabels[0] || "Phân loại 1")}</th>
                  ${
                    hasSecondGroup
                      ? `<th>${escapeHtml(groupLabels[1] || "Phân loại 2")}</th>`
                      : ""
                  }
                  <th>Ảnh</th>
                  <th>Giá</th>
                  <th>Kho hàng</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      }
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
    const sales = getDraftSalesSnapshot();
    const price = sales.price;
    const stock = sales.stock;
    const minPrice = sales.minPrice;
    const maxPrice = sales.maxPrice;
    const variantSummary = getDraftVariantSummary();

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
    if (els.previewPrice && Number.isFinite(minPrice) && minPrice > 0) {
      els.previewPrice.textContent =
        Number.isFinite(maxPrice) && maxPrice > minPrice
          ? `${formatPrice(minPrice)} ~ ${formatPrice(maxPrice)}`
          : formatPrice(minPrice);
    }
    if (els.previewVariantSummary) {
      const hasVariantSummary = Boolean(variantSummary);
      els.previewVariantSummary.hidden = !hasVariantSummary;
      els.previewVariantSummary.textContent = hasVariantSummary
        ? clampText(variantSummary, 120)
        : "";
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
    renderCategoryTrigger();
    renderSalesSection();
    if (els.resetProductDraft) {
      els.resetProductDraft.textContent = isEditingDraft()
        ? "Xóa sản phẩm"
        : "Làm lại form";
    }
    if (els.saveProductHidden) {
      els.saveProductHidden.textContent = getHiddenButtonLabel();
    }
    if (els.saveProductVisible) {
      els.saveProductVisible.textContent = getPublishButtonLabel();
    }
    renderChecklist();
    renderMediaPanels();
    renderPreview();
  };

  const enableVariantGroups = () => {
    setDraftVariantMode("multiple");
    renderDraft();
  };

  const addVariantGroup = () => {
    if (state.draft.variantGroups.length >= 2) return;
    setDraftVariantMode("multiple");
    state.draft.variantGroups = [
      ...state.draft.variantGroups,
      createDraftVariantGroup(),
    ].slice(0, 2);
    syncDraftVariantItems();
    renderDraft();
  };

  const removeVariantGroup = (groupId) => {
    state.draft.variantGroups = state.draft.variantGroups.filter(
      (group) => group.id !== groupId
    );

    if (!state.draft.variantGroups.length) {
      setDraftVariantMode("single");
      renderDraft();
      return;
    }

    syncDraftVariantItems();
    renderDraft();
  };

  const addVariantOption = (groupId) => {
    state.draft.variantGroups = state.draft.variantGroups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            options: [...group.options, createDraftVariantOption("")],
          }
        : group
    );
    renderDraft();
  };

  const removeVariantOption = (groupId, optionId) => {
    state.draft.variantGroups = state.draft.variantGroups.map((group) => {
      if (group.id !== groupId) return group;
      const nextOptions = group.options.filter((option) => option.id !== optionId);
      return {
        ...group,
        options: nextOptions.length ? nextOptions : [createDraftVariantOption("")],
      };
    });
    syncDraftVariantItems();
    renderDraft();
  };

  const updateVariantGroupName = (groupId, value) => {
    state.draft.variantGroups = state.draft.variantGroups.map((group) =>
      group.id === groupId ? { ...group, name: value || "" } : group
    );
  };

  const updateVariantOptionValue = (groupId, optionId, value) => {
    state.draft.variantGroups = state.draft.variantGroups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            options: group.options.map((option) =>
              option.id === optionId ? { ...option, value: value || "" } : option
            ),
          }
        : group
    );
  };

  const commitVariantGroupChanges = () => {
    syncDraftVariantItems();
    renderDraft();
  };

  const updateVariantRowField = (variantKey, field, value) => {
    state.draft.variantItems = state.draft.variantItems.map((item) =>
      item.key === variantKey
        ? {
            ...item,
            [field]: value,
          }
        : item
    );
    renderChecklist();
    renderPreview();
  };

  const setVariantRowImage = (variantKey, file) => {
    state.draft.variantItems = state.draft.variantItems.map((item) => {
      if (item.key !== variantKey) return item;
      revokeMedia(item.image);
      return {
        ...item,
        image: file ? toLocalMedia(file) : null,
      };
    });
    renderDraft();
  };

  const clearVariantRowImage = (variantKey) => {
    state.draft.variantItems = state.draft.variantItems.map((item) => {
      if (item.key !== variantKey) return item;
      revokeMedia(item.image);
      return {
        ...item,
        image: null,
      };
    });
    renderDraft();
  };

  const syncDraftToForm = () => {
    if (els.productNameInput) els.productNameInput.value = state.draft.name;
    if (els.productGtinInput) els.productGtinInput.value = state.draft.gtin;
    if (els.productDescriptionInput) {
      els.productDescriptionInput.value = state.draft.description;
    }
    if (els.productPriceInput) els.productPriceInput.value = state.draft.price;
    if (els.productStockInput) els.productStockInput.value = state.draft.stock;
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

    syncCategoryInput();
    setSelectValue(els.productConditionInput, state.draft.condition || "new");
    renderDraft();
  };

  const resetDraft = () => {
    revokeAllDraftMedia();
    state.editingProductId = "";
    state.editingVariantId = "";
    state.draft = createEmptyDraft();
    if (els.galleryInput) els.galleryInput.value = "";
    if (els.coverInput) els.coverInput.value = "";
    if (els.videoInput) els.videoInput.value = "";
    syncDraftToForm();
    updateViewChrome();
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

  const openProductEditor = (productId) => {
    const product = state.products.find((item) => item.id === productId);
    if (!product) {
      showStatus("Không tìm thấy sản phẩm để sửa.", { error: true });
      return;
    }

    const variant = getPrimaryVariant(product);
    const variantConfig = Array.isArray(product?.variant_config)
      ? product.variant_config
      : [];
    const gallery = Array.isArray(product.media_gallery)
      ? product.media_gallery
          .map((url, index) => toRemoteMedia(url, `gallery-${index + 1}`))
          .filter(Boolean)
      : [];
    const hasVariantGroups = variantConfig.length > 0;
    const draftVariantGroups = hasVariantGroups
      ? variantConfig.map((group) =>
          createDraftVariantGroup(
            String(group?.name || ""),
            Array.isArray(group?.options)
              ? group.options.map((option) => createDraftVariantOption(String(option || "")))
              : []
          )
        )
      : [];
    const draftVariantItems = hasVariantGroups
      ? (product.product_variants || []).map((item, index) =>
          createDraftVariantItem({
            variantId: item?.id || "",
            optionValues: Array.isArray(item?.option_values)
              ? item.option_values.map((value) => String(value || ""))
              : [],
            price: item?.price ? String(Number(item.price) || "") : "",
            stock:
              item?.stock !== undefined && item?.stock !== null
                ? String(Number(item.stock) || 0)
                : "0",
            image: toRemoteMedia(item?.image_url, `variant-${index + 1}`),
          })
        )
      : [];

    revokeAllDraftMedia();
    state.editingProductId = product.id;
    state.editingVariantId = variant?.id || "";
    state.draft = {
      ...createEmptyDraft(),
      name: clampText(product.name || "", 120),
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
      variantMode: hasVariantGroups ? "multiple" : "single",
      variantGroups: draftVariantGroups,
      variantItems: draftVariantItems,
      gallery,
      cover: toRemoteMedia(product.cover_image_url, "cover"),
      video: toRemoteMedia(product.video_url, "video"),
    };
    if (hasVariantGroups) {
      syncDraftVariantItems();
    }
    syncDraftToForm();
    setView("new-product");
    showStatus("Đã nạp dữ liệu sản phẩm vào form chỉnh sửa.");
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

    if (state.draft.variantMode === "multiple") {
      const groups = getNormalizedVariantGroups();
      if (!groups.length) {
        return "Vui lòng nhập ít nhất 1 nhóm phân loại hợp lệ.";
      }

      if (!state.draft.variantItems.length) {
        return "Vui lòng nhập tùy chọn để tạo danh sách biến thể.";
      }

      const invalidVariant = state.draft.variantItems.find((item) => {
        const price = toOptionalNumber(item.price);
        const stock = toOptionalNumber(item.stock);
        return !Number.isFinite(price) || price <= 0 || !Number.isFinite(stock) || stock < 0;
      });

      if (invalidVariant) {
        return "Giá và kho hàng của từng biến thể là bắt buộc.";
      }

      return "";
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

  const uploadDraftVariantImages = async () => {
    const pendingItems = state.draft.variantItems.filter((item) => item?.image?.file);
    if (!pendingItems.length) {
      return new Map();
    }

    const formData = new FormData();
    pendingItems.forEach((item) => formData.append("gallery", item.image.file));

    const payload = await apiFetch(
      "/products/media/upload",
      {
        method: "POST",
        body: formData,
      },
      { redirectOn401: true }
    );

    const urls = Array.isArray(payload?.media?.gallery) ? payload.media.gallery : [];
    const uploadedMap = new Map();

    pendingItems.forEach((item, index) => {
      uploadedMap.set(item.key, urls[index] || item?.image?.serverUrl || "");
    });

    return uploadedMap;
  };

  const buildVariantConfigPayload = () =>
    state.draft.variantMode === "multiple"
      ? getNormalizedVariantGroups().map((group) => ({
          name: group.name,
          options: [...group.options],
        }))
      : null;

  const buildVariantSyncPayload = (uploadedVariantImageMap = new Map()) => {
    if (state.draft.variantMode !== "multiple") {
      return [
        {
          id: state.editingVariantId || undefined,
          price: Number(state.draft.price),
          stock: Math.max(0, Math.floor(Number(state.draft.stock) || 0)),
          weight: toOptionalNumber(state.draft.weight),
          image_url: null,
          option_values: [],
          sku: null,
        },
      ];
    }

    return state.draft.variantItems.map((item) => ({
      id: item.variantId || undefined,
      price: Number(item.price),
      stock: Math.max(0, Math.floor(Number(item.stock) || 0)),
      weight: toOptionalNumber(state.draft.weight),
      image_url:
        uploadedVariantImageMap.get(item.key) || item?.image?.serverUrl || null,
      option_values: [...item.optionValues],
      sku: null,
    }));
  };

  const saveDraftAsProduct = async (status) => {
    const validationMessage = validateDraft();
    if (validationMessage) {
      showStatus(validationMessage, { error: true });
      return;
    }

    setFormBusy(true);
    showStatus("Đang tạo sản phẩm mới...", { persist: true });

    try {
      const uploadedMedia = await uploadDraftMedia();
      const uploadedVariantImageMap = await uploadDraftVariantImages();
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
        variant_config: buildVariantConfigPayload(),
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
            method: "PUT",
            body: {
              variants: buildVariantSyncPayload(uploadedVariantImageMap),
            },
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
      showStatus(getProductSaveMessage(status, "create"));
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể tạo sản phẩm.",
        { error: true }
      );
    } finally {
      setFormBusy(false);
    }
  };

  const updateDraftProduct = async (status) => {
    const validationMessage = validateDraft();
    if (validationMessage) {
      showStatus(validationMessage, { error: true });
      return;
    }

    if (!state.editingProductId) {
      showStatus("Không xác định sản phẩm cần cập nhật.", { error: true });
      return;
    }

    setFormBusy(true);
    showStatus("Đang cập nhật sản phẩm...", { persist: true });

    try {
      const uploadedMedia = await uploadDraftMedia();
      const uploadedVariantImageMap = await uploadDraftVariantImages();
      const existingGallery = state.draft.gallery
        .map((item) => item?.serverUrl || "")
        .filter(Boolean);

      const payload = {
        name: state.draft.name.trim(),
        description: state.draft.description.trim(),
        category_id: Number(state.draft.categoryId),
        gtin: state.draft.gtin.trim(),
        condition: state.draft.condition || "new",
        length_cm: toOptionalNumber(state.draft.length),
        width_cm: toOptionalNumber(state.draft.width),
        height_cm: toOptionalNumber(state.draft.height),
        cover_image_url:
          uploadedMedia.cover_image_url || state.draft.cover?.serverUrl || null,
        video_url: uploadedMedia.video_url || state.draft.video?.serverUrl || null,
        media_gallery: [...existingGallery, ...(uploadedMedia.gallery || [])],
        variant_config: buildVariantConfigPayload(),
        status,
      };

      await apiFetch(
        `/products/${state.editingProductId}`,
        {
          method: "PATCH",
          body: payload,
        },
        { redirectOn401: true }
      );

      try {
        await apiFetch(
          `/products/${state.editingProductId}/variants`,
          {
            method: "PUT",
            body: {
              variants: buildVariantSyncPayload(uploadedVariantImageMap),
            },
          },
          { redirectOn401: true }
        );
      } catch (variantError) {
        await Promise.all([loadProducts(), loadOrders()]);
        renderAll();
        setView("products");
        throw new Error(
          `Sản phẩm đã được cập nhật nhưng chưa lưu được biến thể: ${
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
      showStatus(getProductSaveMessage(status, "update"));
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể cập nhật sản phẩm.",
        { error: true }
      );
    } finally {
      setFormBusy(false);
    }
  };

  const saveDraft = async (status) => {
    if (isEditingDraft()) {
      await updateDraftProduct(status);
      return;
    }

    await saveDraftAsProduct(status);
  };

  const deleteCurrentProduct = async (button) => {
    if (!state.editingProductId) return;

    const shouldDelete = window.confirm(
      "Xóa sản phẩm này? Sản phẩm sẽ được chuyển sang trạng thái ẩn."
    );
    if (!shouldDelete) return;

    const originalText = button?.textContent || "";
    setFormBusy(true);
    if (button) {
      button.textContent = "Đang xóa...";
    }

    try {
      await apiFetch(
        `/products/${state.editingProductId}`,
        {
          method: "DELETE",
        },
        { redirectOn401: true }
      );

      resetDraft();
      await Promise.all([loadProducts(), loadOrders()]);
      renderAll();
      setView("products");
      showStatus("Đã xóa sản phẩm.");
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể xóa sản phẩm.",
        { error: true }
      );
      if (button) {
        button.textContent = originalText;
      }
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
          : nextStatus === "pending"
            ? "Sản phẩm đã được gửi duyệt."
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

    resetShopProfileEditor();
    resetShopVoucherForm();
    updateUserInfo();
    toggleApprovedContent(Boolean(state.approvedShops.length));
  };

  const loadCategories = async () => {
    const payload = await apiFetch("/categories", {}, {});
    state.categories = Array.isArray(payload?.data) ? payload.data : [];
    populateCategorySelects();
    renderCategoryPicker();
    renderDraft();
  };

  const loadProducts = async () => {
    if (!state.currentShopId) {
      state.products = [];
      return;
    }

    const shopId = encodeURIComponent(state.currentShopId);
    const statusList = ["active", "inactive", "pending", "rejected", "locked"];
    const payloads = await Promise.all(
      statusList.map((status) =>
        apiFetch(
          `/products?shop_id=${shopId}&status=${status}&limit=100`,
          {},
          {}
        )
      )
    );

    const merged = new Map();
    payloads.forEach((payload) => {
      (payload?.data || []).forEach((product) => merged.set(product.id, product));
    });

    state.products = Array.from(merged.values()).sort(
      (left, right) =>
        new Date(right.created_at || 0).getTime() -
        new Date(left.created_at || 0).getTime()
    );
  };

  const loadOrders = async () => {
    const payload = await apiFetch("/orders/seller/items?limit=100", {}, {
      redirectOn401: true,
    });
    state.orderItems = payload?.items?.data || [];
  };

  const loadWalletSummary = async () => {
    const params = new URLSearchParams();
    params.set("limit", "12");
    if (state.currentShopId) {
      params.set("shop_id", state.currentShopId);
    }

    const payload = await apiFetch(
      `/orders/seller/wallet?${params.toString()}`,
      {},
      { redirectOn401: true }
    );
    state.walletSummary =
      payload?.wallet_summary || createEmptyWalletSummary();
  };

  const requestWalletWithdrawal = async (button) => {
    if (state.isRequestingWithdrawal) return;

    const currentShop = getCurrentShop();
    if (!currentShop) {
      showStatus("Chưa có shop để gửi yêu cầu thanh toán.", { error: true });
      return;
    }

    const paymentAccount = getShopPaymentAccount(currentShop);
    if (!paymentAccount?.bank_name || !paymentAccount?.account_number) {
      showStatus("Shop chưa có tài khoản ngân hàng nhận tiền.", { error: true });
      return;
    }

    const balance = Number(state.walletSummary?.wallet?.available_balance || 0);
    if (!Number.isFinite(balance) || balance <= 0) {
      showStatus("Ví Bambi chưa có số dư khả dụng để thanh toán.", {
        error: true,
      });
      return;
    }

    const confirmed = window.confirm(
      `Gửi yêu cầu thanh toán ${formatPrice(balance)} về ${paymentAccount.bank_name} ${maskAccountNumber(
        paymentAccount.account_number
      )}? Yêu cầu này sẽ chờ admin duyệt.`
    );
    if (!confirmed) return;

    const originalText = button?.textContent || "Yêu cầu thanh toán";

    try {
      state.isRequestingWithdrawal = true;
      if (button) {
        button.disabled = true;
        button.textContent = "Đang gửi yêu cầu...";
      }

      showStatus("Đang gửi yêu cầu thanh toán...", { persist: true });
      const payload = await apiFetch(
        "/orders/seller/wallet/withdraw",
        {
          method: "POST",
          body: { shop_id: state.currentShopId || undefined },
        },
        { redirectOn401: true }
      );

      await loadWalletSummary();
      showStatus(payload?.message || "Đã gửi yêu cầu thanh toán.");
    } catch (error) {
      showStatus(
        error instanceof Error ? error.message : "Không thể gửi yêu cầu thanh toán.",
        { error: true }
      );
    } finally {
      state.isRequestingWithdrawal = false;
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
      renderFinanceWalletView();
    }
  };

  const reloadOrders = async () => {
    await Promise.all([loadOrders(), loadWalletSummary()]);
    renderDashboard();
    renderOrdersAllView();
    renderOrdersReturnsView();
    renderFinanceRevenue();
    renderFinanceWalletView();
    showStatus("Đã tải lại dữ liệu đơn hàng.");
  };

  const renderAll = () => {
    updateViewChrome();
    renderDashboard();
    renderOrdersAllView();
    renderOrdersReturnsView();
    renderShippingSettings();
    renderShopPromotions();
    renderFinanceRevenue();
    renderFinanceWalletView();
    renderFinanceBankView();
    renderShopProfile();
    renderProductsView();
    renderDraft();
  };

  const loadSellerData = async (options = {}) => {
    const { silent = false } = options;

    if (!state.currentShopId) {
      state.products = [];
      state.shopVouchers = [];
      state.shopVoucherSummary = createShopVoucherSummary();
      state.orderItems = [];
      state.walletSummary = createEmptyWalletSummary();
      renderAll();
      return;
    }

    if (!silent) {
      showStatus("Đang đồng bộ Seller Studio...", { persist: true });
    }

    try {
      await Promise.all([
        loadCategories(),
        loadProducts(),
        loadOrders(),
        loadShopVouchers(),
        loadWalletSummary(),
      ]);
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
    const clearShopVoucherFilters = document.querySelector("#clearShopVoucherFilters");
    const clearShopVoucherProducts = document.querySelector("#clearShopVoucherProducts");

    els.shopVoucherQuery?.addEventListener("input", (event) => {
      state.shopVoucherFilters.query = event.target.value || "";
    });

    els.shopVoucherQuery?.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      await loadShopVouchers();
      renderShopPromotions();
    });

    els.shopVoucherStatusFilter?.addEventListener("change", async (event) => {
      state.shopVoucherFilters.status = event.target.value || "all";
      await loadShopVouchers();
      renderShopPromotions();
    });

    els.reloadShopVouchers?.addEventListener("click", async () => {
      await loadShopVouchers();
      renderShopPromotions();
      showStatus("Đã tải lại danh sách voucher của shop.");
    });

    clearShopVoucherFilters?.addEventListener("click", async () => {
      state.shopVoucherFilters = {
        query: "",
        status: "all",
      };
      await loadShopVouchers();
      renderShopPromotions();
    });

    els.shopVoucherForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      await saveShopVoucher();
    });

    els.shopVoucherCode?.addEventListener("input", (event) => {
      state.shopVoucherEditor.code = (event.target.value || "")
        .toUpperCase()
        .replace(/\s+/g, "");
      event.target.value = state.shopVoucherEditor.code;
      syncShopVoucherPreview();
    });

    els.shopVoucherDiscountType?.addEventListener("change", (event) => {
      state.shopVoucherEditor.discount_type = event.target.value || "amount";
      if (state.shopVoucherEditor.discount_type !== "percent") {
        state.shopVoucherEditor.max_discount_amount = "";
      }
      syncShopVoucherMaxField();
      syncShopVoucherPreview();
    });

    els.shopVoucherDiscountValue?.addEventListener("input", (event) => {
      state.shopVoucherEditor.discount_value = event.target.value || "";
      syncShopVoucherPreview();
    });

    els.shopVoucherMinOrderAmount?.addEventListener("input", (event) => {
      state.shopVoucherEditor.min_order_amount = event.target.value || "0";
      syncShopVoucherPreview();
    });

    els.shopVoucherMaxDiscountAmount?.addEventListener("input", (event) => {
      state.shopVoucherEditor.max_discount_amount = event.target.value || "";
      syncShopVoucherPreview();
    });

    els.shopVoucherQuantity?.addEventListener("input", (event) => {
      state.shopVoucherEditor.quantity = event.target.value || "1";
      syncShopVoucherPreview();
    });

    els.shopVoucherStartsAt?.addEventListener("change", (event) => {
      state.shopVoucherEditor.starts_at = event.target.value || "";
      syncShopVoucherPreview();
    });

    els.shopVoucherEndsAt?.addEventListener("change", (event) => {
      state.shopVoucherEditor.ends_at = event.target.value || "";
      syncShopVoucherPreview();
    });

    els.shopVoucherIsActive?.addEventListener("change", (event) => {
      state.shopVoucherEditor.is_active = Boolean(event.target.checked);
    });

    els.shopVoucherProductList?.addEventListener("change", (event) => {
      const target = event.target.closest('[data-role="shop-voucher-product"]');
      if (!target) return;

      const selected = new Set(state.shopVoucherEditor.product_ids || []);
      if (target.checked) {
        selected.add(target.value);
      } else {
        selected.delete(target.value);
      }

      state.shopVoucherEditor.product_ids = Array.from(selected);
      renderShopVoucherProductList();
      syncShopVoucherPreview();
    });

    clearShopVoucherProducts?.addEventListener("click", () => {
      state.shopVoucherEditor.product_ids = [];
      renderShopVoucherProductList();
      syncShopVoucherPreview();
    });

    els.resetShopVoucherForm?.addEventListener("click", () => {
      resetShopVoucherForm();
      showStatus("Đã làm mới form voucher.");
    });

    els.deleteShopVoucherBtn?.addEventListener("click", async () => {
      await deleteShopVoucherById(state.shopVoucherEditor.id);
    });

    els.shopVoucherTable?.addEventListener("click", async (event) => {
      const actionButton = event.target.closest("[data-action]");
      if (!actionButton) return;

      const voucherId = actionButton.dataset.voucherId || "";
      if (!voucherId) return;

      if (actionButton.dataset.action === "edit-shop-voucher") {
        const voucher = state.shopVouchers.find((item) => item.id === voucherId);
        if (!voucher) return;
        fillShopVoucherForm(voucher);
        showStatus("Đã nạp thông tin voucher để chỉnh sửa.");
        return;
      }

      if (actionButton.dataset.action === "delete-shop-voucher") {
        await deleteShopVoucherById(voucherId);
      }
    });

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

    els.productCategoryTrigger?.addEventListener("click", () => {
      openCategoryPicker();
    });

    els.categoryPickerSearch?.addEventListener("input", (event) => {
      state.categoryPicker.search = event.target.value || "";
      renderCategoryPicker();
    });

    els.categoryPickerResults?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category-id]");
      if (!button) return;
      updateCategoryPickerSelection(button.dataset.categoryId || "");
    });

    els.categoryPickerColumns?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-category-id]");
      if (!button) return;
      updateCategoryPickerSelection(button.dataset.categoryId || "");
    });

    els.closeCategoryPicker?.addEventListener("click", closeCategoryPicker);
    els.cancelCategoryPicker?.addEventListener("click", closeCategoryPicker);
    els.confirmCategoryPicker?.addEventListener("click", confirmCategoryPicker);

    els.categoryPickerModal?.addEventListener("click", (event) => {
      if (event.target.dataset.categoryPickerClose === "backdrop") {
        closeCategoryPicker();
      }
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

    els.enableVariantGroupsBtn?.addEventListener("click", () => {
      enableVariantGroups();
    });

    els.addSecondVariantGroupBtn?.addEventListener("click", () => {
      addVariantGroup();
    });

    els.variantGroupsEditor?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action || "";
      const groupId = button.dataset.groupId || "";
      const optionId = button.dataset.optionId || "";

      if (action === "add-variant-option") {
        addVariantOption(groupId);
      }

      if (action === "remove-variant-option") {
        removeVariantOption(groupId, optionId);
      }

      if (action === "remove-variant-group") {
        removeVariantGroup(groupId);
      }
    });

    els.variantGroupsEditor?.addEventListener("input", (event) => {
      const input = event.target.closest("[data-action]");
      if (!input) return;

      const action = input.dataset.action || "";
      const groupId = input.dataset.groupId || "";
      const optionId = input.dataset.optionId || "";

      if (action === "variant-group-name") {
        updateVariantGroupName(groupId, input.value || "");
      }

      if (action === "variant-option-value") {
        updateVariantOptionValue(groupId, optionId, input.value || "");
      }
    });

    els.variantGroupsEditor?.addEventListener("change", (event) => {
      const input = event.target.closest("[data-action]");
      if (!input) return;
      const action = input.dataset.action || "";
      if (action === "variant-group-name" || action === "variant-option-value") {
        commitVariantGroupChanges();
      }
    });

    els.variantMatrixTable?.addEventListener("input", (event) => {
      const input = event.target.closest("[data-action]");
      if (!input) return;

      const action = input.dataset.action || "";
      const variantKey = input.dataset.variantKey || "";

      if (action === "variant-row-price") {
        updateVariantRowField(variantKey, "price", input.value || "");
      }

      if (action === "variant-row-stock") {
        updateVariantRowField(variantKey, "stock", input.value || "0");
      }
    });

    els.variantMatrixTable?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action || "";
      const variantKey = button.dataset.variantKey || "";

      if (action === "remove-variant-image") {
        clearVariantRowImage(variantKey);
        return;
      }

      if (action === "pick-variant-image") {
        const picker = document.createElement("input");
        picker.type = "file";
        picker.accept = "image/*";
        picker.addEventListener("change", () => {
          const file = picker.files?.[0] || null;
          if (!file) return;
          setVariantRowImage(variantKey, file);
        });
        picker.click();
      }
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

    els.shippingSettingsContent?.addEventListener("change", async (event) => {
      const input = event.target.closest("[data-shipping-toggle]");
      if (!input) return;

      await updateShippingSettings(
        input.dataset.shippingToggle || "",
        Boolean(input.checked)
      );
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

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && activeDatetimePicker) {
        closeDatetimePicker(activeDatetimePicker);
        return;
      }

      if (event.key === "Escape" && state.categoryPicker.isOpen) {
        closeCategoryPicker();
      }
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
    els.shopProfileSummary?.addEventListener("click", async (event) => {
      const target = getEventTarget(event);
      if (!target) return;

      const actionButton = target.closest("[data-action]");
      if (!actionButton) return;

      const action = actionButton.dataset.action;
      if (!["edit-shop-profile", "cancel-shop-profile-edit", "save-shop-profile"].includes(action)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (action === "edit-shop-profile") {
        startShopProfileEdit();
        return;
      }

      if (action === "cancel-shop-profile-edit") {
        resetShopProfileEditor();
        renderShopProfile();
        return;
      }

      await saveShopProfile();
    });

    document.addEventListener("click", async (event) => {
      const target = getEventTarget(event);
      if (!target) return;

      const viewButton = target.closest("[data-view-target]");
      if (viewButton && state.approvedShops.length) {
        event.preventDefault();
        setView(viewButton.dataset.viewTarget || "dashboard");
        return;
      }

      const productTab = target.closest("#productStatusTabs [data-status]");
      if (productTab) {
        state.productFilters.status = productTab.dataset.status || "all";
        renderProductsView();
        return;
      }

      const orderTab = target.closest("[data-order-filter]");
      if (orderTab) {
        const group = orderTab.dataset.orderGroup || "all";
        const value = orderTab.dataset.orderFilter || "all";
        setOrderFilter(group, value);
        return;
      }

      const scrollTab = target.closest(
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

      const shopProfileTab = target.closest("[data-shop-profile-tab]");
      if (shopProfileTab) {
        state.shopProfileTab = shopProfileTab.dataset.shopProfileTab || "basic";
        renderShopProfile();
        return;
      }

      const actionButton = target.closest("[data-action]");
      if (!actionButton) return;

      const action = actionButton.dataset.action;

      if (action === "edit-shop-profile") {
        startShopProfileEdit();
        return;
      }

      if (action === "cancel-shop-profile-edit") {
        resetShopProfileEditor();
        renderShopProfile();
        return;
      }

      if (action === "save-shop-profile") {
        await saveShopProfile();
        return;
      }

      if (action === "request-wallet-withdrawal") {
        await requestWalletWithdrawal(actionButton);
        return;
      }

      if (action === "edit-product") {
        openProductEditor(actionButton.dataset.productId);
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

    document.addEventListener("input", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.id === "shopProfileNameInput") {
        state.shopProfileEditor.name = target.value || "";
        return;
      }

      if (target.id === "shopProfileDescriptionInput") {
        state.shopProfileEditor.description = target.value || "";
      }
    });

    document.addEventListener("change", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      if (target.id === "shopProfileAvatarInput") {
        const file = target.files?.[0] || null;
        setShopProfileAvatarFile(file);
      }
    });

    els.reloadProductsView?.addEventListener("click", async () => {
      await loadProducts();
      renderAll();
      showStatus("Đã tải lại danh sách sản phẩm.");
    });

    els.reloadOrdersAll?.addEventListener("click", async () => {
      await reloadOrders();
    });

    els.reloadOrdersReturns?.addEventListener("click", async () => {
      await reloadOrders();
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

    els.resetProductDraft?.addEventListener("click", async () => {
      if (isEditingDraft()) {
        await deleteCurrentProduct(els.resetProductDraft);
        return;
      }

      const shouldReset = window.confirm(
        "Xóa toàn bộ dữ liệu bản nháp hiện tại?"
      );
      if (!shouldReset) return;
      resetDraft();
      showStatus("Đã làm lại form sản phẩm.");
    });

    els.saveProductHidden?.addEventListener("click", async () => {
      await saveDraft(resolveDraftStatus("inactive"));
    });

    els.saveProductVisible?.addEventListener("click", async () => {
      await saveDraft(resolveDraftStatus("active"));
    });

    document.addEventListener("scroll", syncActiveFormTab, { passive: true });
    window.addEventListener("beforeunload", () => {
      revokeAllDraftMedia();
      revokeShopProfileAvatarPreview();
    });
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
