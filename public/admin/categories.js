const AdminCategoriesPage = (() => {
  const Admin = window.BambiAdmin;
  const { $, escapeHtml, formatDateTime } = Admin;

  const pageSizeOptions = [20, 25, 30];

  let categories = [];
  let currentQuery = "";
  let currentPage = 1;
  let currentPageSize = 25;

  const getCreateChildHref = (categoryId) =>
    `/ui/admin/category-form.html?mode=create&parent_id=${encodeURIComponent(categoryId)}`;

  const paginationEls = {
    shell: () => $("#categoriesPagination"),
    summary: () => $("#categoriesPaginationSummary"),
    pageSize: () => $("#categoryPageSize"),
    prev: () => $("#categoryPrevPage"),
    next: () => $("#categoryNextPage"),
    label: () => $("#categoryPageLabel"),
  };

  const clampPage = (page, totalPages) =>
    Math.min(Math.max(page, 1), Math.max(totalPages, 1));

  const normalizePageSize = (value) =>
    pageSizeOptions.includes(Number(value)) ? Number(value) : 25;

  const renderStats = (meta) => {
    const stats = [
      {
        label: "Tổng danh mục",
        value: meta?.total || 0,
        note: "Bao gồm cả danh mục cha và danh mục lá",
      },
      {
        label: "Danh mục gốc",
        value: meta?.root_count || 0,
        note: "Các danh mục ở cấp đầu tiên",
      },
      {
        label: "Danh mục lá",
        value: meta?.leaf_count || 0,
        note: "Các danh mục người bán được chọn khi đăng sản phẩm",
      },
    ];

    $("#categoryStats").innerHTML = stats
      .map(
        (item) => `
          <article class="stat-card">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
            <small>${escapeHtml(item.note)}</small>
          </article>
        `
      )
      .join("");
  };

  const getFilteredCategories = () => {
    const keyword = currentQuery.trim().toLowerCase();
    if (!keyword) return categories;

    return categories.filter((category) => {
      const haystack = [category.name, category.breadcrumb, String(category.id)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  };

  const renderPagination = ({ totalItems, startIndex = 0, endIndex = 0, totalPages = 1 }) => {
    const shell = paginationEls.shell();
    const summary = paginationEls.summary();
    const pageSize = paginationEls.pageSize();
    const prevButton = paginationEls.prev();
    const nextButton = paginationEls.next();
    const label = paginationEls.label();

    if (!shell || !summary || !pageSize || !prevButton || !nextButton || !label) return;

    if (!totalItems) {
      shell.hidden = true;
      return;
    }

    shell.hidden = false;
    summary.textContent = `Hiển thị ${startIndex + 1}-${endIndex} trong ${totalItems} danh mục`;
    pageSize.value = String(currentPageSize);
    label.textContent = `Trang ${currentPage}/${totalPages}`;
    prevButton.disabled = currentPage <= 1;
    nextButton.disabled = currentPage >= totalPages;
  };

  const renderTable = () => {
    const filtered = getFilteredCategories();
    $("#categoryCountLabel").textContent = `${filtered.length} danh mục`;

    if (!filtered.length) {
      $("#categoriesTable").innerHTML =
        '<div class="empty-state">Chưa có danh mục phù hợp với bộ lọc hiện tại.</div>';
      renderPagination({ totalItems: 0 });
      return;
    }

    const totalPages = Math.ceil(filtered.length / currentPageSize);
    currentPage = clampPage(currentPage, totalPages);

    const startIndex = (currentPage - 1) * currentPageSize;
    const visibleCategories = filtered.slice(startIndex, startIndex + currentPageSize);

    $("#categoriesTable").innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Danh mục</th>
              <th>Cha</th>
              <th>Sản phẩm</th>
              <th>Cấp con</th>
              <th>Tạo lúc</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${visibleCategories
              .map(
                (category) => `
                  <tr>
                    <td>
                      <strong>${escapeHtml(category.name)}</strong><br />
                      <span class="muted">#${category.id} • ${escapeHtml(category.breadcrumb)}</span>
                      <div class="category-chip-row">
                        <span class="chip ${category.is_leaf ? "blue" : "gray"}">
                          ${category.is_leaf ? "Danh mục lá" : "Danh mục cha"}
                        </span>
                      </div>
                    </td>
                    <td>${escapeHtml(category.parent_name || "-")}</td>
                    <td>${escapeHtml(category.product_count)}</td>
                    <td>${escapeHtml(category.children_count)}</td>
                    <td>${escapeHtml(formatDateTime(category.created_at))}</td>
                    <td class="actions">
                      <a class="btn secondary" href="${getCreateChildHref(category.id)}">Thêm con</a>
                      <a class="btn ghost" href="/ui/admin/category-form.html?id=${category.id}">Sửa</a>
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;

    renderPagination({
      totalItems: filtered.length,
      startIndex,
      endIndex: startIndex + visibleCategories.length,
      totalPages,
    });
  };

  const applyFilter = () => {
    currentQuery = $("#categoryQuery").value.trim();
    currentPage = 1;
    renderTable();
  };

  const clearFilter = () => {
    currentQuery = "";
    currentPage = 1;
    $("#categoryQuery").value = "";
    renderTable();
  };

  const loadData = async () => {
    const payload = await Admin.apiFetch("/categories");
    categories = payload.data || [];

    renderStats(payload.meta || {});
    renderTable();
  };

  const bindActions = () => {
    $("#reloadCategories").addEventListener("click", async () => {
      try {
        await loadData();
        Admin.setStatus("Đã tải lại cây danh mục.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    $("#applyCategoryFilter").addEventListener("click", applyFilter);
    $("#clearCategoryFilter").addEventListener("click", clearFilter);
    $("#categoryQuery").addEventListener("input", applyFilter);
    $("#categoryQuery").addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      applyFilter();
    });

    paginationEls.pageSize()?.addEventListener("change", (event) => {
      currentPageSize = normalizePageSize(event.target.value);
      currentPage = 1;
      renderTable();
    });

    paginationEls.prev()?.addEventListener("click", () => {
      currentPage -= 1;
      renderTable();
    });

    paginationEls.next()?.addEventListener("click", () => {
      currentPage += 1;
      renderTable();
    });
  };

  const init = async () => {
    Admin.initShell("categories");
    currentPageSize = normalizePageSize(paginationEls.pageSize()?.value);
    bindActions();

    try {
      await loadData();
      Admin.setStatus("Đã tải danh mục sản phẩm.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminCategoriesPage.init();
