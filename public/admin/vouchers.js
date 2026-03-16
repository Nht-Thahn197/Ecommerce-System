const AdminVouchersPage = (() => {
  const Admin = window.BambiAdmin;
  const { $, escapeHtml, formatCurrency, formatDateTime } = Admin;

  const pageSizeOptions = [10, 15, 20];

  const state = {
    vouchers: [],
    categories: [],
    summary: {
      total: 0,
      running: 0,
      upcoming: 0,
      expired: 0,
      inactive: 0,
    },
    pagination: {
      page: 1,
      limit: 15,
      total: 0,
      total_pages: 1,
    },
    currentPage: 1,
    currentPageSize: 15,
    currentQuery: "",
    currentStatus: "all",
    selectedVoucherId: "",
  };

  const paginationEls = {
    shell: () => $("#voucherPagination"),
    summary: () => $("#voucherPaginationSummary"),
    pageSize: () => $("#voucherPageSize"),
    prev: () => $("#voucherPrevPage"),
    next: () => $("#voucherNextPage"),
    label: () => $("#voucherPageLabel"),
  };

  const refreshSelect = (target) => {
    target?.dispatchEvent(new Event("bambi:custom-select-sync"));
    window.BambiCustomSelect?.refreshSelect(target);
  };

  const getFormDefaults = () => {
    const now = new Date();
    now.setSeconds(0, 0);
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    end.setHours(23, 59, 0, 0);

    return {
      id: "",
      code: "",
      voucher_kind: "discount",
      discount_type: "amount",
      discount_value: "",
      min_order_amount: "0",
      category_id: "",
      max_discount_amount: "",
      starts_at: toDatetimeLocalValue(now),
      ends_at: toDatetimeLocalValue(end),
      is_active: true,
    };
  };

  const toDatetimeLocalValue = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return localDate.toISOString().slice(0, 16);
  };

  const normalizePageSize = (value) =>
    pageSizeOptions.includes(Number(value)) ? Number(value) : 15;

  const getStateMeta = (voucherState) => {
    const map = {
      running: { label: "Đang diễn ra", className: "green" },
      upcoming: { label: "Sắp bắt đầu", className: "blue" },
      expired: { label: "Đã kết thúc", className: "gray" },
      inactive: { label: "Tạm tắt", className: "orange" },
    };
    return map[voucherState] || { label: "Không xác định", className: "gray" };
  };

  const getVoucherKindMeta = (voucherKind) => {
    if (voucherKind === "shipping") {
      return {
        label: "Voucher giảm phí vận chuyển",
        shortLabel: "Phí vận chuyển",
        tableLabel: "Vận chuyển",
      };
    }

    return {
      label: "Voucher giảm giá",
      shortLabel: "Đơn hàng",
      tableLabel: "Giảm giá",
    };
  };

  const getCategoryLabel = (categoryId) => {
    if (!categoryId) return "Toàn sàn";
    return state.categories.find((category) => String(category.id) === String(categoryId))?.breadcrumb || "Toàn sàn";
  };

  const formatDiscountValue = (type, value) => {
    const amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return type === "percent" ? "0%" : formatCurrency(0);
    }
    if (type === "percent") {
      return `${amount}%`;
    }
    return formatCurrency(amount);
  };

  const buildVoucherHeadline = (voucher) => {
    const discountText = formatDiscountValue(voucher.discount_type, voucher.discount_value);
    const minOrder = formatCurrency(Number(voucher.min_order_amount || 0));
    return voucher.voucher_kind === "shipping"
      ? `Giảm ${discountText} phí vận chuyển cho đơn từ ${minOrder}`
      : `Giảm ${discountText} cho đơn từ ${minOrder}`;
  };

  const buildVoucherSummary = (voucher) => {
    const parts = [];
    const categoryLabel = getCategoryLabel(voucher.category_id);
    const startText = voucher.starts_at ? formatDateTime(voucher.starts_at) : "-";
    const endText = voucher.ends_at ? formatDateTime(voucher.ends_at) : "-";

    parts.push(`Áp dụng từ ${startText} đến ${endText}`);

    if (voucher.discount_type === "percent" && voucher.max_discount_amount) {
      parts.push(`giảm tối đa ${formatCurrency(Number(voucher.max_discount_amount))}`);
    }

    if (voucher.category_id) {
      parts.push(`chỉ áp dụng với danh mục ${categoryLabel}`);
    } else {
      parts.push("áp dụng cho toàn sàn");
    }

    parts.unshift(getVoucherKindMeta(voucher.voucher_kind).label);

    return parts.join(", ");
  };

  const collectFormData = () => ({
    id: $("#voucherId").value.trim(),
    code: $("#voucherCode").value.trim(),
    voucher_kind: $("#voucherKind").value,
    discount_type: $("#voucherDiscountType").value,
    discount_value: $("#voucherDiscountValue").value.trim(),
    min_order_amount: $("#voucherMinOrderAmount").value.trim() || "0",
    category_id: $("#voucherCategoryId").value || null,
    max_discount_amount: $("#voucherMaxDiscountAmount").disabled
      ? null
      : $("#voucherMaxDiscountAmount").value.trim() || null,
    starts_at: $("#voucherStartsAt").value,
    ends_at: $("#voucherEndsAt").value,
    is_active: $("#voucherIsActive").checked,
  });

  const syncDiscountFieldState = () => {
    const type = $("#voucherDiscountType").value;
    const valueInput = $("#voucherDiscountValue");
    const maxInput = $("#voucherMaxDiscountAmount");

    if (type === "percent") {
      valueInput.placeholder = "Ví dụ: 10";
      valueInput.step = "1";
      maxInput.disabled = false;
      maxInput.placeholder = "Ví dụ: 20000";
    } else {
      valueInput.placeholder = "Ví dụ: 10000";
      valueInput.step = "1000";
      maxInput.disabled = true;
      maxInput.value = "";
      maxInput.placeholder = "Chỉ dùng cho voucher %";
    }
  };

  const renderPreview = () => {
    const formData = collectFormData();
    const stateMeta = getStateMeta(
      formData.is_active
        ? new Date(formData.starts_at) > new Date()
          ? "upcoming"
          : new Date(formData.ends_at) < new Date()
          ? "expired"
          : "running"
        : "inactive"
    );
    const categoryLabel = getCategoryLabel(formData.category_id);
    const kindMeta = getVoucherKindMeta(formData.voucher_kind);

    $("#voucherPreviewHeadline").textContent = buildVoucherHeadline(formData);
    $("#voucherPreviewSummary").textContent = buildVoucherSummary(formData);
    $("#voucherPreviewMeta").innerHTML = [
      `<span class="chip ${escapeHtml(stateMeta.className)}">${escapeHtml(stateMeta.label)}</span>`,
      `<span class="chip gray">${escapeHtml(kindMeta.tableLabel)}</span>`,
      `<span class="chip gray">${escapeHtml(categoryLabel)}</span>`,
      `<span class="chip gray">${escapeHtml(formData.code || "Chưa đặt mã")}</span>`,
    ].join("");
  };

  const renderStats = () => {
    const stats = [
      ["Tổng voucher", state.summary.total, "Tổng số voucher của sàn"],
      ["Đang diễn ra", state.summary.running, "Có thể áp dụng ngay"],
      ["Sắp bắt đầu", state.summary.upcoming, "Chờ đến khung giờ mở"],
      ["Đã kết thúc", state.summary.expired, "Cần tạo mới nếu muốn gia hạn"],
      ["Tạm tắt", state.summary.inactive, "Không hiện cho người dùng"],
    ];

    $("#voucherStats").innerHTML = stats
      .map(
        ([label, value, note]) => `
          <article class="stat-card">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
            <small>${escapeHtml(note)}</small>
          </article>
        `
      )
      .join("");
  };

  const renderPagination = () => {
    const shell = paginationEls.shell();
    const summary = paginationEls.summary();
    const pageSize = paginationEls.pageSize();
    const prevButton = paginationEls.prev();
    const nextButton = paginationEls.next();
    const label = paginationEls.label();
    const total = state.pagination.total || 0;

    if (!shell || !summary || !pageSize || !prevButton || !nextButton || !label) return;

    if (!total) {
      shell.hidden = true;
      return;
    }

    shell.hidden = false;
    const start = (state.pagination.page - 1) * state.pagination.limit + 1;
    const end = Math.min(start + state.vouchers.length - 1, total);

    summary.textContent = `Hiển thị ${start}-${end} trong ${total} voucher`;
    pageSize.value = String(state.currentPageSize);
    label.textContent = `Trang ${state.pagination.page}/${Math.max(
      state.pagination.total_pages,
      1
    )}`;
    prevButton.disabled = state.pagination.page <= 1;
    nextButton.disabled =
      state.pagination.page >= Math.max(state.pagination.total_pages, 1);
  };

  const renderTable = () => {
    $("#voucherCountLabel").textContent = `${state.pagination.total || 0} voucher`;

    if (!state.vouchers.length) {
      $("#voucherTable").innerHTML =
        '<div class="empty-state">Chưa có voucher phù hợp với bộ lọc hiện tại.</div>';
      renderPagination();
      return;
    }

    $("#voucherTable").innerHTML = `
      <div class="table-wrap">
        <table class="table voucher-table">
          <thead>
            <tr>
              <th>Mã voucher</th>
              <th>Loại</th>
              <th>Mô tả</th>
              <th>Ngành hàng</th>
              <th>Hiệu lực</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${state.vouchers
              .map((voucher) => {
                const stateMeta = getStateMeta(voucher.state);
                const kindMeta = getVoucherKindMeta(voucher.voucher_kind);
                const isSelected = state.selectedVoucherId === voucher.id;

                return `
                  <tr ${isSelected ? 'class="voucher-row-active"' : ""}>
                    <td>
                      <strong class="voucher-code">${escapeHtml(voucher.code)}</strong><br />
                      <span class="muted">${escapeHtml(buildVoucherHeadline(voucher))}</span>
                    </td>
                    <td>${escapeHtml(kindMeta.tableLabel)}</td>
                    <td>
                      <div class="voucher-summary">${escapeHtml(buildVoucherSummary(voucher))}</div>
                    </td>
                    <td>${escapeHtml(voucher.category_name || "Toàn sàn")}</td>
                    <td>
                      <span class="muted">${escapeHtml(formatDateTime(voucher.starts_at))}</span><br />
                      <span class="muted">đến ${escapeHtml(formatDateTime(voucher.ends_at))}</span>
                    </td>
                    <td><span class="chip ${escapeHtml(stateMeta.className)}">${escapeHtml(
                      stateMeta.label
                    )}</span></td>
                    <td class="actions">
                      <button class="btn secondary" type="button" data-action="edit-voucher" data-id="${escapeHtml(
                        voucher.id
                      )}">Sửa</button>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    renderPagination();
  };

  const populateCategorySelect = () => {
    const select = $("#voucherCategoryId");
    select.innerHTML = '<option value="">Tất cả ngành hàng</option>';

    state.categories.forEach((category) => {
      const option = new Option(category.breadcrumb || category.name, String(category.id));
      select.append(option);
    });

    refreshSelect(select);
  };

  const setFormMode = (mode, voucher = null) => {
    const title = $("#voucherFormTitle");
    const description = $("#voucherFormDescription");
    const tag = $("#voucherFormModeTag");
    const submit = $("#submitVoucherForm");
    const deleteButton = $("#deleteVoucherBtn");

    if (mode === "edit" && voucher) {
      title.textContent = `Sửa voucher ${voucher.code}`;
      description.textContent =
        "Cập nhật giá trị giảm, điều kiện và thời gian hiệu lực cho mã voucher đã tồn tại.";
      tag.textContent = "Đang sửa";
      submit.textContent = "Lưu thay đổi";
      deleteButton.style.display = "";
      state.selectedVoucherId = voucher.id;
      return;
    }

    title.textContent = "Tạo voucher mới";
    description.textContent =
      "Tạo mã giảm giá cho toàn sàn với điều kiện và khung giờ áp dụng rõ ràng.";
    tag.textContent = "Tạo mới";
    submit.textContent = "Tạo voucher";
    deleteButton.style.display = "none";
    state.selectedVoucherId = "";
  };

  const resetForm = () => {
    const defaults = getFormDefaults();
    $("#voucherId").value = defaults.id;
    $("#voucherCode").value = defaults.code;
    $("#voucherKind").value = defaults.voucher_kind;
    $("#voucherDiscountType").value = defaults.discount_type;
    $("#voucherDiscountValue").value = defaults.discount_value;
    $("#voucherMinOrderAmount").value = defaults.min_order_amount;
    $("#voucherCategoryId").value = defaults.category_id;
    $("#voucherMaxDiscountAmount").value = defaults.max_discount_amount;
    $("#voucherStartsAt").value = defaults.starts_at;
    $("#voucherEndsAt").value = defaults.ends_at;
    $("#voucherIsActive").checked = defaults.is_active;
    setFormMode("create");
    syncDiscountFieldState();
    refreshSelect($("#voucherKind"));
    refreshSelect($("#voucherDiscountType"));
    refreshSelect($("#voucherCategoryId"));
    renderPreview();
    renderTable();
  };

  const fillForm = (voucher) => {
    $("#voucherId").value = voucher.id;
    $("#voucherCode").value = voucher.code;
    $("#voucherKind").value = voucher.voucher_kind || "discount";
    $("#voucherDiscountType").value = voucher.discount_type;
    $("#voucherDiscountValue").value = String(voucher.discount_value || "");
    $("#voucherMinOrderAmount").value = String(voucher.min_order_amount || 0);
    $("#voucherCategoryId").value = voucher.category_id ? String(voucher.category_id) : "";
    $("#voucherMaxDiscountAmount").value =
      voucher.max_discount_amount === null || voucher.max_discount_amount === undefined
        ? ""
        : String(voucher.max_discount_amount);
    $("#voucherStartsAt").value = toDatetimeLocalValue(voucher.starts_at);
    $("#voucherEndsAt").value = toDatetimeLocalValue(voucher.ends_at);
    $("#voucherIsActive").checked = Boolean(voucher.is_active);
    setFormMode("edit", voucher);
    syncDiscountFieldState();
    refreshSelect($("#voucherKind"));
    refreshSelect($("#voucherDiscountType"));
    refreshSelect($("#voucherCategoryId"));
    renderPreview();
    renderTable();
  };

  const loadCategories = async () => {
    const payload = await Admin.apiFetch("/categories");
    state.categories = payload.data || [];
    populateCategorySelect();
  };

  const buildVoucherQuery = () => {
    const params = new URLSearchParams();
    params.set("page", String(state.currentPage));
    params.set("limit", String(state.currentPageSize));
    if (state.currentQuery) params.set("q", state.currentQuery);
    if (state.currentStatus && state.currentStatus !== "all") {
      params.set("status", state.currentStatus);
    }
    return params.toString();
  };

  const loadVouchers = async () => {
    const payload = await Admin.apiFetch(`/admin/vouchers?${buildVoucherQuery()}`);
    state.vouchers = payload.vouchers?.data || [];
    state.summary = payload.vouchers?.summary || state.summary;
    state.pagination = payload.vouchers?.pagination || state.pagination;
    renderStats();
    renderTable();
  };

  const loadVoucherDetail = async (voucherId) => {
    const payload = await Admin.apiFetch(`/admin/vouchers/${voucherId}`);
    fillForm(payload.voucher);
  };

  const applyFilter = async () => {
    state.currentQuery = $("#voucherQuery").value.trim();
    state.currentStatus = $("#voucherStatusFilter").value;
    state.currentPage = 1;
    await loadVouchers();
  };

  const clearFilter = async () => {
    $("#voucherQuery").value = "";
    $("#voucherStatusFilter").value = "all";
    refreshSelect($("#voucherStatusFilter"));
    state.currentQuery = "";
    state.currentStatus = "all";
    state.currentPage = 1;
    await loadVouchers();
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const payload = collectFormData();
    const isEditMode = Boolean(payload.id);
    const path = isEditMode ? `/admin/vouchers/${payload.id}` : "/admin/vouchers";

    const response = await Admin.apiFetch(path, {
      method: isEditMode ? "PATCH" : "POST",
      body: {
        code: payload.code,
        voucher_kind: payload.voucher_kind,
        discount_type: payload.discount_type,
        discount_value: payload.discount_value,
        min_order_amount: payload.min_order_amount,
        category_id: payload.category_id || null,
        max_discount_amount: payload.max_discount_amount,
        starts_at: payload.starts_at,
        ends_at: payload.ends_at,
        is_active: payload.is_active,
      },
    });

    await loadVouchers();
    fillForm(response.voucher);
    Admin.setStatus(isEditMode ? "Đã cập nhật voucher." : "Đã tạo voucher mới.");
  };

  const handleDelete = async () => {
    const voucherId = $("#voucherId").value.trim();
    if (!voucherId) return;

    const code = $("#voucherCode").value.trim() || "voucher này";
    const confirmed = window.confirm(`Xóa ${code}? Hành động này không thể hoàn tác.`);
    if (!confirmed) return;

    await Admin.apiFetch(`/admin/vouchers/${voucherId}`, {
      method: "DELETE",
    });

    await loadVouchers();
    resetForm();
    Admin.setStatus("Đã xóa voucher.");
  };

  const bindEvents = () => {
    $("#reloadVouchers")?.addEventListener("click", async () => {
      try {
        await loadVouchers();
        Admin.setStatus("Đã tải lại danh sách voucher.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    $("#createVoucherBtn")?.addEventListener("click", () => {
      resetForm();
      $("#voucherCode").focus();
    });

    $("#applyVoucherFilter")?.addEventListener("click", async () => {
      try {
        await applyFilter();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    $("#clearVoucherFilter")?.addEventListener("click", async () => {
      try {
        await clearFilter();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    $("#voucherQuery")?.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      try {
        await applyFilter();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    $("#voucherStatusFilter")?.addEventListener("change", async () => {
      try {
        await applyFilter();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    paginationEls.pageSize()?.addEventListener("change", async (event) => {
      state.currentPageSize = normalizePageSize(event.target.value);
      state.currentPage = 1;
      try {
        await loadVouchers();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    paginationEls.prev()?.addEventListener("click", async () => {
      if (state.currentPage <= 1) return;
      state.currentPage -= 1;
      try {
        await loadVouchers();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    paginationEls.next()?.addEventListener("click", async () => {
      if (state.currentPage >= Math.max(state.pagination.total_pages, 1)) return;
      state.currentPage += 1;
      try {
        await loadVouchers();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    $("#voucherForm")?.addEventListener("submit", async (event) => {
      try {
        await submitForm(event);
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    $("#resetVoucherForm")?.addEventListener("click", () => {
      resetForm();
      Admin.setStatus("Đã khôi phục form voucher.");
    });

    $("#deleteVoucherBtn")?.addEventListener("click", async () => {
      try {
        await handleDelete();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    [
      "#voucherCode",
      "#voucherKind",
      "#voucherDiscountType",
      "#voucherDiscountValue",
      "#voucherMinOrderAmount",
      "#voucherCategoryId",
      "#voucherMaxDiscountAmount",
      "#voucherStartsAt",
      "#voucherEndsAt",
      "#voucherIsActive",
    ].forEach((selector) => {
      const element = $(selector);
      const eventName = element?.type === "checkbox" || element?.tagName === "SELECT" ? "change" : "input";
      element?.addEventListener(eventName, () => {
        if (selector === "#voucherCode") {
          $("#voucherCode").value = $("#voucherCode").value.toUpperCase().replace(/\s+/g, "");
        }
        if (selector === "#voucherDiscountType") {
          syncDiscountFieldState();
        }
        renderPreview();
      });
    });

    document.addEventListener("click", async (event) => {
      const editButton = event.target.closest('[data-action="edit-voucher"]');
      if (!editButton) return;

      try {
        await loadVoucherDetail(editButton.dataset.id);
        Admin.setStatus("Đã tải thông tin voucher.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
  };

  const init = async () => {
    Admin.initShell("vouchers");
    state.currentPageSize = normalizePageSize(paginationEls.pageSize()?.value);
    bindEvents();
    syncDiscountFieldState();
    resetForm();

    try {
      await Promise.all([loadCategories(), loadVouchers()]);
      renderPreview();
      Admin.setStatus("Đã tải danh sách voucher của sàn.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminVouchersPage.init();
