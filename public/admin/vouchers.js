const AdminVouchersPage = (() => {
  const Admin = window.BambiAdmin;
  const { $, escapeHtml, formatCurrency, formatDateTime } = Admin;

  const pageSizeOptions = [10, 15, 20];
  const datetimePickers = new Map();
  let activeDatetimePicker = null;

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

  const shiftMonth = (date, offset) => new Date(date.getFullYear(), date.getMonth() + offset, 1);

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
      ? formatDateTime(picker.input.value)
      : "Chọn ngày và giờ";
  };

  const syncDatetimePickerControls = (picker) => {
    const fallbackValue = toDatetimeLocalValue(new Date());
    const parsed = parseDatetimeLocalValue(picker.input.value) || parseDatetimeLocalValue(fallbackValue);
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
      const input = inputId ? $(`#${inputId}`) : root.querySelector('input[type="datetime-local"]');
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
                    <td class="voucher-state-cell"><span class="chip ${escapeHtml(stateMeta.className)}">${escapeHtml(
                      stateMeta.label
                    )}</span></td>
                    <td class="actions voucher-action-cell">
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
    syncAllDatetimePickers();
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
    syncAllDatetimePickers();
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
    if (!payload.starts_at || !payload.ends_at) {
      throw new Error("Hãy chọn thời gian bắt đầu và kết thúc.");
    }

    if (new Date(payload.ends_at) < new Date(payload.starts_at)) {
      throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu.");
    }

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
      if (activeDatetimePicker && !activeDatetimePicker.root.contains(event.target)) {
        closeDatetimePicker(activeDatetimePicker);
      }

      const editButton = event.target.closest('[data-action="edit-voucher"]');
      if (!editButton) return;

      try {
        await loadVoucherDetail(editButton.dataset.id);
        Admin.setStatus("Đã tải thông tin voucher.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !activeDatetimePicker) return;
      const currentPicker = activeDatetimePicker;
      closeDatetimePicker(currentPicker);
      currentPicker.trigger?.focus();
    });
  };

  const init = async () => {
    Admin.initShell("vouchers");
    state.currentPageSize = normalizePageSize(paginationEls.pageSize()?.value);
    initDatetimePickers();
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
