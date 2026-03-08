const AdminCategoryFormPage = (() => {
  const Admin = window.BambiAdmin;
  const { $, escapeHtml, formatDateTime } = Admin;

  const params = new URLSearchParams(window.location.search);

  const parsePositiveInt = (value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  };

  const requestedCategoryId = parsePositiveInt(params.get("id"));
  const requestedParentId = parsePositiveInt(params.get("parent_id"));
  const isEditMode = requestedCategoryId !== null;

  let categories = [];
  let tree = [];
  let meta = {};
  let currentCategory = null;
  let categoriesById = new Map();
  let blockedParentIds = new Set();
  let parentOptions = [];

  const buildPathOption = (category) => {
    const prefix = "— ".repeat(category.depth || 0);
    return `${prefix}${category.breadcrumb || category.name}`;
  };

  const parentSelectEls = {
    root: () => $("#categoryParentSelect"),
    input: () => $("#categoryParentId"),
    trigger: () => $("#categoryParentTrigger"),
    label: () => $("#categoryParentLabel"),
    panel: () => $("#categoryParentPanel"),
    options: () => $("#categoryParentOptions"),
  };

  const collectBlockedParentIds = (categoryId) => {
    const childrenMap = new Map();
    categories.forEach((category) => {
      if (!category.parent_id) return;
      if (!childrenMap.has(category.parent_id)) {
        childrenMap.set(category.parent_id, []);
      }
      childrenMap.get(category.parent_id).push(category.id);
    });

    const blocked = new Set([categoryId]);
    const stack = [...(childrenMap.get(categoryId) || [])];

    while (stack.length) {
      const nextId = stack.pop();
      if (blocked.has(nextId)) continue;
      blocked.add(nextId);
      stack.push(...(childrenMap.get(nextId) || []));
    }

    return blocked;
  };

  const buildParentOptions = () => {
    return [
      {
        value: "",
        label: "Không có danh mục cha",
        note: "Tạo danh mục ở cấp gốc",
      },
      ...categories
        .filter((category) => !blockedParentIds.has(category.id))
        .map((category) => ({
          value: String(category.id),
          label: buildPathOption(category),
          note: category.breadcrumb,
        })),
    ];
  };

  const closeParentSelect = () => {
    const root = parentSelectEls.root();
    const trigger = parentSelectEls.trigger();
    const panel = parentSelectEls.panel();
    if (!root || !trigger || !panel) return;

    root.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
    panel.hidden = true;
  };

  const focusSelectedParentOption = () => {
    const input = parentSelectEls.input();
    const options = parentSelectEls.options();
    if (!input || !options) return;

    const selectedButton =
      Array.from(options.querySelectorAll(".custom-select-option")).find(
        (button) => button.dataset.value === input.value
      ) || options.querySelector(".custom-select-option");
    selectedButton?.focus();
  };

  const openParentSelect = () => {
    const root = parentSelectEls.root();
    const trigger = parentSelectEls.trigger();
    const panel = parentSelectEls.panel();
    if (!root || !trigger || !panel) return;

    root.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
    panel.hidden = false;
    window.requestAnimationFrame(focusSelectedParentOption);
  };

  const updateParentSelectState = () => {
    const input = parentSelectEls.input();
    const label = parentSelectEls.label();
    const options = parentSelectEls.options();
    if (!input || !label || !options) return;

    const selectedOption = parentOptions.find((option) => option.value === input.value) || parentOptions[0];
    label.textContent = selectedOption?.label || "Không có danh mục cha";

    Array.from(options.querySelectorAll(".custom-select-option")).forEach((button) => {
      const isSelected = button.dataset.value === input.value;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-selected", isSelected ? "true" : "false");
    });
  };

  const setParentValue = (value, { close = true } = {}) => {
    const input = parentSelectEls.input();
    if (!input) return;

    const normalized = parentOptions.some((option) => option.value === value) ? value : "";
    input.value = normalized;
    updateParentSelectState();

    if (close) {
      closeParentSelect();
      parentSelectEls.trigger()?.focus();
    }
  };

  const getSelectedParentId = () => parsePositiveInt($("#categoryParentId").value);

  const syncParentOptions = (selectedParentId = null) => {
    const optionsRoot = parentSelectEls.options();
    const nextValue = selectedParentId ? String(selectedParentId) : "";

    parentOptions = buildParentOptions();
    optionsRoot.innerHTML = parentOptions
      .map(
        (option, index) => `
          <button
            class="custom-select-option"
            id="categoryParentOption-${index}"
            type="button"
            role="option"
            data-value="${escapeHtml(option.value)}"
            aria-selected="false"
          >
            <span class="custom-select-option-label">${escapeHtml(option.label)}</span>
            <small class="custom-select-option-note">${escapeHtml(option.note)}</small>
          </button>
        `
      )
      .join("");

    setParentValue(nextValue, { close: false });
    closeParentSelect();
  };

  const buildPreviewPath = () => {
    const rawName = $("#categoryName").value.trim();

    if (isEditMode && !currentCategory && !rawName) {
      return "Đang tải đường dẫn danh mục...";
    }

    const fallbackName = currentCategory?.name || "Danh mục mới";
    const name = rawName || fallbackName;
    const parentId = getSelectedParentId();

    if (!name) {
      return "Điền tên danh mục để xem đường dẫn dự kiến.";
    }

    if (!parentId) {
      return `Đường dẫn dự kiến: ${name}`;
    }

    const parent = categoriesById.get(parentId);
    const prefix = parent?.breadcrumb || parent?.name || "Danh mục cha";
    return `Đường dẫn dự kiến: ${prefix} > ${name}`;
  };

  const renderPreview = () => {
    $("#categoryPathPreview").textContent = buildPreviewPath();
  };

  const renderMode = () => {
    const selection = $("#categoryFormSelection");
    const submitButton = $("#submitCategoryForm");
    const deleteButton = $("#deleteCategory");

    if (isEditMode) {
      document.title = `Chỉnh sửa danh mục${currentCategory ? ` #${currentCategory.id}` : ""} | Bambi`;
      $("#categoryFormBreadcrumb").textContent = `Trang quản trị / Quản lý danh mục / Chỉnh sửa #${requestedCategoryId}`;
      $("#categoryFormTitle").textContent = "Chỉnh sửa danh mục";
      $("#categoryFormDescription").textContent =
        "Cập nhật tên, chuyển nhánh cha hoặc xóa danh mục ngay trên trang thao tác riêng.";
      $("#categoryFormKicker").textContent = "Chỉnh sửa";
      $("#categoryFormHeading").textContent = currentCategory?.name || "Chỉnh sửa danh mục";
      $("#categoryFormHelp").textContent =
        "Trang này tách riêng phần thao tác để màn hình danh sách danh mục chỉ còn nhiệm vụ xem và lọc.";
      $("#categoryFormModeTag").textContent = "Đang chỉnh sửa";
      submitButton.textContent = "Lưu thay đổi";
      deleteButton.style.display = "";
      selection.textContent = currentCategory
        ? `#${currentCategory.id} • ${currentCategory.name}`
        : `#${requestedCategoryId}`;
      selection.className = "chip";
      return;
    }

    document.title = "Tạo danh mục | Bambi";
    $("#categoryFormBreadcrumb").textContent = "Trang quản trị / Quản lý danh mục / Tạo mới";
    $("#categoryFormTitle").textContent = "Tạo danh mục";
    $("#categoryFormDescription").textContent =
      "Thao tác thêm, sửa hoặc xóa được tách sang trang riêng để màn hình danh sách luôn gọn hơn.";
    $("#categoryFormKicker").textContent = "Tạo mới";
    $("#categoryFormHeading").textContent = "Điền thông tin danh mục";
    $("#categoryFormHelp").textContent =
      "Bạn có thể tạo danh mục gốc hoặc gắn danh mục vào một nhánh cha đã có sẵn.";
    $("#categoryFormModeTag").textContent = "Tạo mới";
    submitButton.textContent = "Tạo danh mục";
    deleteButton.style.display = "none";
    selection.textContent = "Chưa lưu";
    selection.className = "chip gray";
  };

  const renderContext = () => {
    const container = $("#categoryContext");
    const deleteButton = $("#deleteCategory");

    if (isEditMode && !currentCategory) {
      deleteButton.disabled = true;
      container.innerHTML = '<div class="empty-state">Đang tải thông tin danh mục...</div>';
      return;
    }

    if (isEditMode && currentCategory) {
      const deleteBlockedReason =
        currentCategory.children_count > 0
          ? "Danh mục đang có danh mục con nên chưa thể xóa."
          : currentCategory.product_count > 0
            ? "Danh mục đang được gán cho sản phẩm nên chưa thể xóa."
            : "Có thể xóa nếu bạn xác nhận thao tác này.";

      deleteButton.disabled =
        currentCategory.children_count > 0 || currentCategory.product_count > 0;

      container.innerHTML = `
        <article class="detail-info-card">
          <h3>Tóm tắt hiện tại</h3>
          <dl>
            <div>
              <dt>Đường dẫn</dt>
              <dd>${escapeHtml(currentCategory.breadcrumb)}</dd>
            </div>
            <div>
              <dt>Danh mục cha</dt>
              <dd>${escapeHtml(currentCategory.parent_name || "Không có")}</dd>
            </div>
            <div>
              <dt>Số danh mục con</dt>
              <dd>${escapeHtml(currentCategory.children_count)}</dd>
            </div>
            <div>
              <dt>Sản phẩm đang gán</dt>
              <dd>${escapeHtml(currentCategory.product_count)}</dd>
            </div>
            <div>
              <dt>Tạo lúc</dt>
              <dd>${escapeHtml(formatDateTime(currentCategory.created_at))}</dd>
            </div>
          </dl>
        </article>
        <article class="detail-info-card">
          <h3>Quy tắc xóa</h3>
          <dl>
            <div>
              <dt>Trạng thái</dt>
              <dd>${escapeHtml(deleteBlockedReason)}</dd>
            </div>
          </dl>
        </article>
      `;
      return;
    }

    deleteButton.disabled = true;
    container.innerHTML = `
      <article class="detail-info-card">
        <h3>Gợi ý cấu trúc</h3>
        <dl>
          <div>
            <dt>Danh mục gốc</dt>
            <dd>Dùng cho nhóm lớn như Thời trang nữ, Nhà cửa, Điện tử.</dd>
          </div>
          <div>
            <dt>Danh mục lá</dt>
            <dd>Chỉ danh mục cuối cùng mới nên gán trực tiếp cho sản phẩm.</dd>
          </div>
          <div>
            <dt>Đặt tên</dt>
            <dd>Giữ tên ngắn, rõ ràng và không lặp lại ý nghĩa của cấp cha.</dd>
          </div>
        </dl>
      </article>
      <article class="detail-info-card">
        <h3>Tổng quan hiện có</h3>
        <dl>
          <div>
            <dt>Tổng danh mục</dt>
            <dd>${escapeHtml(meta.total || 0)}</dd>
          </div>
          <div>
            <dt>Danh mục gốc</dt>
            <dd>${escapeHtml(meta.root_count || 0)}</dd>
          </div>
          <div>
            <dt>Danh mục lá</dt>
            <dd>${escapeHtml(meta.leaf_count || 0)}</dd>
          </div>
        </dl>
      </article>
    `;
  };

  const renderTreeNodes = (nodes, selectedParentId) => {
    if (!nodes.length) {
      return '<div class="empty-state">Chưa có dữ liệu cây danh mục.</div>';
    }

    return `
      <div class="category-tree">
        ${nodes
          .map((node) => {
            const classes = ["category-tree-item"];
            if (currentCategory?.id === node.id) classes.push("is-current");
            if (selectedParentId === node.id) classes.push("is-parent");

            const badges = [
              `<span class="chip ${node.is_leaf ? "blue" : "gray"}">${
                node.is_leaf ? "Lá" : "Cha"
              }</span>`,
            ];

            if (currentCategory?.id === node.id) {
              badges.push('<span class="chip">Đang sửa</span>');
            }

            if (selectedParentId === node.id) {
              badges.push('<span class="chip orange">Cha đã chọn</span>');
            }

            return `
              <div class="category-tree-node" style="--category-depth: ${node.depth};">
                <div class="${classes.join(" ")}">
                  <div>
                    <strong>${escapeHtml(node.name)}</strong>
                    <div class="muted">${escapeHtml(node.breadcrumb)}</div>
                  </div>
                  <div class="category-chip-row">
                    ${badges.join("")}
                  </div>
                </div>
                ${
                  node.children.length
                    ? `<div class="category-tree-children">${renderTreeNodes(
                        node.children,
                        selectedParentId
                      )}</div>`
                    : ""
                }
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  };

  const renderTree = () => {
    $("#categoryTree").innerHTML = renderTreeNodes(tree, getSelectedParentId());
  };

  const fillForm = () => {
    $("#categoryId").value = currentCategory ? String(currentCategory.id) : "";
    $("#categoryName").value = currentCategory?.name || "";
    syncParentOptions(currentCategory?.parent_id ?? requestedParentId);
    renderMode();
    renderContext();
    renderPreview();
    renderTree();
  };

  const loadData = async () => {
    const listRequest = Admin.apiFetch("/categories");

    let listPayload;
    let detailPayload = null;

    if (isEditMode) {
      [listPayload, detailPayload] = await Promise.all([
        listRequest,
        Admin.apiFetch(`/categories/${requestedCategoryId}`),
      ]);
    } else {
      listPayload = await listRequest;
    }

    categories = listPayload.data || [];
    tree = listPayload.tree || [];
    meta = listPayload.meta || {};
    categoriesById = new Map(categories.map((category) => [category.id, category]));
    currentCategory = detailPayload?.category || null;
    blockedParentIds = currentCategory ? collectBlockedParentIds(currentCategory.id) : new Set();

    fillForm();
  };

  const resetForm = () => {
    if (isEditMode) {
      fillForm();
      Admin.setStatus("Đã khôi phục dữ liệu ban đầu của danh mục.");
      return;
    }

    $("#categoryForm").reset();
    syncParentOptions(requestedParentId);
    renderMode();
    renderContext();
    renderPreview();
    renderTree();
    Admin.setStatus("Đã làm trống form tạo danh mục.");
  };

  const submitForm = async (event) => {
    event.preventDefault();

    const payload = {
      name: $("#categoryName").value.trim(),
      parent_id: getSelectedParentId(),
    };

    if (!payload.name) {
      Admin.setStatus("Tên danh mục là bắt buộc.", "error");
      return;
    }

    try {
      if (isEditMode) {
        await Admin.apiFetch(`/categories/${requestedCategoryId}`, {
          method: "PATCH",
          body: payload,
        });
        await loadData();
        Admin.setStatus("Đã cập nhật danh mục.");
        return;
      }

      await Admin.apiFetch("/categories", { method: "POST", body: payload });
      $("#categoryForm").reset();
      await loadData();
      Admin.setStatus("Đã tạo danh mục mới.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  const deleteCurrentCategory = async () => {
    if (!isEditMode || !currentCategory) {
      Admin.setStatus("Không có danh mục để xóa.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Xóa danh mục "${currentCategory.name}"? Hành động này chỉ thành công khi danh mục chưa có con và chưa gán sản phẩm.`
    );

    if (!confirmed) return;

    try {
      await Admin.apiFetch(`/categories/${requestedCategoryId}`, { method: "DELETE" });
      window.location.href = "/ui/admin/categories.html";
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  const bindActions = () => {
    $("#reloadCategoryForm").addEventListener("click", async () => {
      try {
        await loadData();
        Admin.setStatus("Đã tải lại dữ liệu danh mục.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    $("#categoryForm").addEventListener("submit", submitForm);
    $("#resetCategoryForm").addEventListener("click", resetForm);
    $("#deleteCategory").addEventListener("click", deleteCurrentCategory);

    $("#categoryName").addEventListener("input", renderPreview);

    parentSelectEls.trigger().addEventListener("click", () => {
      const root = parentSelectEls.root();
      if (root.classList.contains("is-open")) {
        closeParentSelect();
        return;
      }
      openParentSelect();
    });

    parentSelectEls.trigger().addEventListener("keydown", (event) => {
      if (!["Enter", " ", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      openParentSelect();
    });

    parentSelectEls.options().addEventListener("click", (event) => {
      const optionButton = event.target.closest(".custom-select-option");
      if (!optionButton) return;

      setParentValue(optionButton.dataset.value || "");
      renderPreview();
      renderTree();
    });

    parentSelectEls.options().addEventListener("keydown", (event) => {
      const optionButtons = Array.from(
        parentSelectEls.options().querySelectorAll(".custom-select-option")
      );
      const currentIndex = optionButtons.indexOf(document.activeElement);

      if (event.key === "Escape") {
        event.preventDefault();
        closeParentSelect();
        parentSelectEls.trigger().focus();
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        if (!optionButtons.length) return;

        const offset = event.key === "ArrowDown" ? 1 : -1;
        const nextIndex =
          currentIndex === -1
            ? 0
            : (currentIndex + offset + optionButtons.length) % optionButtons.length;
        optionButtons[nextIndex].focus();
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        const optionButton = document.activeElement.closest(".custom-select-option");
        if (!optionButton) return;
        event.preventDefault();
        setParentValue(optionButton.dataset.value || "");
        renderPreview();
        renderTree();
      }
    });

    document.addEventListener("click", (event) => {
      if (parentSelectEls.root().contains(event.target)) return;
      closeParentSelect();
    });
  };

  const init = async () => {
    Admin.initShell("categories");
    bindActions();
    renderMode();
    renderContext();
    renderPreview();
    renderTree();

    try {
      await loadData();
      Admin.setStatus(isEditMode ? "Đã tải dữ liệu danh mục cần chỉnh sửa." : "Đã mở form tạo danh mục.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminCategoryFormPage.init();
