const AdminShopDetailPage = (() => {
  const Admin = window.BambiAdmin;
  let shop = null;

  const getShopId = () => new URLSearchParams(window.location.search).get("id") || "";

  const formatAddress = (address) => {
    if (!address) return "Chưa có";
    const contact = [address.contact_name, address.contact_phone].filter(Boolean).join(" · ");
    const location = [address.detail, address.ward, address.district, address.province]
      .filter(Boolean)
      .join(", ");
    return [contact, location].filter(Boolean).join(" — ") || "Chưa có";
  };

  const getPickupAddress = () =>
    shop?.shop_addresses?.find((item) => item.address_type === "pickup") ||
    shop?.shop_addresses?.[0] ||
    null;

  const getTaxAddress = () => {
    const taxAddress = shop?.shop_addresses?.find((item) => item.address_type === "tax");
    if (taxAddress) return taxAddress;
    return shop?.onboarding_data?.tax_address || null;
  };

  const groupDocuments = () => {
    const grouped = new Map();
    (shop?.shop_documents || []).forEach((doc) => {
      const key = doc.doc_type || "other";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(doc);
    });
    return grouped;
  };

  const docLabel = (type) => {
    const map = {
      business_license: "Giấy phép kinh doanh",
      identity_front: "Giấy tờ mặt trước",
      identity_selfie: "Ảnh chân dung cầm giấy tờ",
      identity_extra: "Tài liệu bổ sung",
      cccd: "CCCD / CMND",
      bank_proof: "Xác nhận tài khoản ngân hàng",
      tax_code: "Giấy tờ thuế",
      other: "Tài liệu khác",
    };
    return map[type] || type || "Tài liệu";
  };

  const boolLabel = (value) => (value ? "Đã bật" : "Chưa bật");

  const statusChip = (status) => {
    if (status === "approved") return "Đã duyệt";
    if (status === "rejected") return "Bị từ chối";
    return "Đang chờ duyệt";
  };

  const renderHero = () => {
    const container = Admin.$("#shopHeroCard");
    if (!shop) {
      container.innerHTML = '<div class="empty-state">Không tìm thấy hồ sơ shop.</div>';
      return;
    }

    const onboarding = shop.onboarding_data || {};
    const owner = shop.users || {};
    const payment = shop.shop_payment_accounts?.[0] || {};
    const pickupAddress = getPickupAddress();

    container.innerHTML = `
      <div class="detail-hero-grid">
        <div>
          <div class="toolbar-row" style="margin-bottom: 0;">
            <div>
              <div class="kicker">Hồ sơ shop</div>
              <h2 style="margin-top: 8px;">${Admin.escapeHtml(shop.name || "-")}</h2>
            </div>
            <span class="chip ${shop.status === "approved" ? "green" : shop.status === "rejected" ? "red" : "gray"}">${Admin.escapeHtml(statusChip(shop.status))}</span>
          </div>
          <p class="muted" style="margin-top: 10px;">${Admin.escapeHtml(
            shop.description || "Seller chưa điền mô tả shop."
          )}</p>
          <div class="detail-meta-grid">
            <article class="stat-card">
              <span>Chủ shop</span>
              <strong style="font-size: 24px;">${Admin.escapeHtml(owner.full_name || owner.email || "-")}</strong>
              <small>${Admin.escapeHtml(owner.email || "-")}</small>
            </article>
            <article class="stat-card">
              <span>Liên hệ vận hành</span>
              <strong style="font-size: 24px;">${Admin.escapeHtml(shop.contact_phone || owner.phone || "-")}</strong>
              <small>${Admin.escapeHtml(shop.contact_email || owner.email || "-")}</small>
            </article>
            <article class="stat-card">
              <span>Ngày tạo hồ sơ</span>
              <strong style="font-size: 24px;">${Admin.escapeHtml(Admin.formatDateTime(shop.created_at))}</strong>
              <small>${Admin.escapeHtml(shop.approved_at ? `Duyệt lúc ${Admin.formatDateTime(shop.approved_at)}` : "Chưa có thời điểm duyệt")}</small>
            </article>
          </div>
        </div>

        <div class="review-card">
          <h3>Quyết định duyệt</h3>
          <dl>
            <div>
              <dt>Địa chỉ lấy hàng</dt>
              <dd>${Admin.escapeHtml(formatAddress(pickupAddress))}</dd>
            </div>
            <div>
              <dt>Tài khoản nhận tiền</dt>
              <dd>${Admin.escapeHtml([payment.bank_name, payment.account_holder, payment.account_number].filter(Boolean).join(" · ") || "Chưa có")}</dd>
            </div>
            <div>
              <dt>Ghi chú onboarding</dt>
              <dd>${Admin.escapeHtml(shop.rejected_reason || onboarding.review_note || "Chưa có ghi chú từ admin")}</dd>
            </div>
          </dl>
          <div class="stack-actions" style="margin-top: 18px;">
            <button class="btn" id="approveShopBtn" type="button">Duyệt shop</button>
            <button class="btn danger" id="rejectShopBtn" type="button">Từ chối shop</button>
          </div>
        </div>
      </div>
    `;
  };

  const renderStepSummary = () => {
    const onboarding = shop?.onboarding_data || {};
    const steps = [
      ["Thông tin shop", getPickupAddress() ? "Đã có địa chỉ lấy hàng và tài khoản nhận tiền" : "Thiếu thông tin địa chỉ / tài khoản"],
      ["Cài đặt vận chuyển", Object.values(onboarding.shipping_config || {}).some(Boolean) ? "Đã chọn ít nhất một phương thức" : "Chưa có cấu hình vận chuyển"],
      ["Thông tin thuế", onboarding.tax_info?.business_name ? `Loại hình: ${onboarding.tax_info.business_type || "-"}` : "Thiếu thông tin thuế"],
      ["Thông tin định danh", onboarding.identity_info?.identity_number ? `Loại giấy tờ: ${onboarding.identity_info.identity_type || "-"}` : "Thiếu dữ liệu định danh"],
    ];

    Admin.$("#stepSummary").innerHTML = steps
      .map(
        ([title, note]) => `
          <article class="step-mini-card">
            <strong>${Admin.escapeHtml(title)}</strong>
            <span>${Admin.escapeHtml(note)}</span>
          </article>
        `
      )
      .join("");
  };

  const renderInfoSection = (selector, cards) => {
    const container = Admin.$(`${selector} .detail-info-grid`);
    container.innerHTML = cards
      .map(
        (card) => `
          <article class="detail-info-card">
            <h3>${Admin.escapeHtml(card.title)}</h3>
            <dl>
              ${card.items
                .map(
                  (item) => `
                    <div>
                      <dt>${Admin.escapeHtml(item.label)}</dt>
                      <dd>${Admin.escapeHtml(item.value)}</dd>
                    </div>
                  `
                )
                .join("")}
            </dl>
          </article>
        `
      )
      .join("");
  };

  const renderSections = () => {
    const onboarding = shop?.onboarding_data || {};
    const owner = shop?.users || {};
    const pickupAddress = getPickupAddress();
    const taxAddress = getTaxAddress();
    const payment = shop?.shop_payment_accounts?.[0] || {};

    renderInfoSection("#stepShopInfo", [
      {
        title: "Thông tin cơ bản",
        items: [
          { label: "Tên shop", value: shop?.name || "-" },
          { label: "Mô tả", value: shop?.description || "Chưa có mô tả" },
          { label: "Email liên hệ", value: shop?.contact_email || owner.email || "-" },
          { label: "Số điện thoại liên hệ", value: shop?.contact_phone || owner.phone || "-" },
        ],
      },
      {
        title: "Địa chỉ và thanh toán",
        items: [
          { label: "Địa chỉ lấy hàng", value: formatAddress(pickupAddress) },
          { label: "Ngân hàng", value: payment.bank_name || "-" },
          { label: "Chủ tài khoản", value: payment.account_holder || "-" },
          { label: "Số tài khoản", value: payment.account_number || "-" },
        ],
      },
    ]);

    const shipping = onboarding.shipping_config || {};
    renderInfoSection("#stepShipping", [
      {
        title: "Phương thức vận chuyển",
        items: [
          { label: "Hỏa tốc", value: boolLabel(shipping.express) },
          { label: "Nhanh", value: boolLabel(shipping.standard) },
          { label: "Tiết kiệm", value: boolLabel(shipping.economy) },
          { label: "Tự vận chuyển", value: boolLabel(shipping.selfPickup) },
        ],
      },
    ]);

    const taxInfo = onboarding.tax_info || {};
    renderInfoSection("#stepTax", [
      {
        title: "Thông tin thuế",
        items: [
          { label: "Loại hình kinh doanh", value: taxInfo.business_type || "-" },
          { label: "Tên pháp lý / đơn vị", value: taxInfo.business_name || "-" },
          { label: "Email nhận hóa đơn", value: taxInfo.invoice_email || "-" },
          { label: "Mã số thuế", value: taxInfo.tax_code || "Chưa khai báo" },
        ],
      },
      {
        title: "Địa chỉ thuế",
        items: [
          { label: "Địa chỉ đăng ký thuế", value: formatAddress(taxAddress) },
        ],
      },
    ]);

    const identityInfo = onboarding.identity_info || {};
    renderInfoSection("#stepIdentity", [
      {
        title: "Thông tin giấy tờ",
        items: [
          { label: "Loại giấy tờ", value: identityInfo.identity_type || "-" },
          { label: "Số giấy tờ", value: identityInfo.identity_number || "-" },
          { label: "Họ tên trên giấy tờ", value: identityInfo.identity_full_name || "-" },
          { label: "Đã xác nhận cam kết", value: identityInfo.consent ? "Có" : "Chưa" },
        ],
      },
    ]);
  };

  const renderDocuments = () => {
    const container = Admin.$("#documentsGrid");
    const grouped = groupDocuments();

    if (!grouped.size) {
      container.innerHTML = '<div class="empty-state">Seller chưa tải giấy tờ nào lên.</div>';
      return;
    }

    container.innerHTML = Array.from(grouped.entries())
      .map(
        ([type, documents]) => `
          <article class="detail-doc-card">
            <h3>${Admin.escapeHtml(docLabel(type))}</h3>
            <ul class="doc-list">
              ${documents
                .map(
                  (doc) => `
                    <li>
                      <a href="${Admin.escapeHtml(doc.doc_url || "#")}" target="_blank" rel="noopener noreferrer">${Admin.escapeHtml(doc.doc_url?.split("/").pop() || "Tài liệu")}</a>
                      <small>Trạng thái: ${Admin.escapeHtml(doc.status || "pending")} · Tải lên lúc ${Admin.escapeHtml(Admin.formatDateTime(doc.created_at))}</small>
                    </li>
                  `
                )
                .join("")}
            </ul>
          </article>
        `
      )
      .join("");
  };

  const renderPage = () => {
    renderHero();
    renderStepSummary();
    renderSections();
    renderDocuments();
  };

  const loadDetail = async () => {
    const shopId = getShopId();
    if (!shopId) {
      throw new Error("Thiếu mã shop trên URL.");
    }

    const payload = await Admin.apiFetch(`/admin/shops/${shopId}`);
    shop = payload.shop || null;
    renderPage();
  };

  const updateStatus = async (status) => {
    const shopId = getShopId();
    if (!shopId) return;

    const body = { status };
    if (status === "rejected") {
      body.rejected_reason = prompt("Lý do từ chối shop?") || "Không đạt điều kiện duyệt";
    }

    await Admin.apiFetch(`/shops/${shopId}/status`, {
      method: "PATCH",
      body,
    });
  };

  const bindActions = () => {
    Admin.$("#reloadDetail")?.addEventListener("click", async () => {
      try {
        await loadDetail();
        Admin.setStatus("Đã tải lại chi tiết hồ sơ shop.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    Admin.$("#shopHeroCard")?.addEventListener("click", async (event) => {
      const approveBtn = event.target.closest("#approveShopBtn");
      const rejectBtn = event.target.closest("#rejectShopBtn");
      if (!approveBtn && !rejectBtn) return;

      try {
        await updateStatus(approveBtn ? "approved" : "rejected");
        await loadDetail();
        Admin.setStatus(approveBtn ? "Đã duyệt shop." : "Đã từ chối shop.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
  };

  const init = async () => {
    Admin.initShell("shops");
    bindActions();

    if (!Admin.hasToken()) {
      Admin.setStatus("Bạn chưa đăng nhập admin. Hãy mở trang đăng nhập quản trị để xem chi tiết shop.");
      return;
    }

    try {
      await loadDetail();
      Admin.setStatus("Đã tải chi tiết hồ sơ shop.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminShopDetailPage.init();
