const AdminCategoriesPage = (() => {
  const Admin = window.BambiAdmin;
  const { $, escapeHtml, formatDateTime } = Admin;

  let categories = [];
  let currentQuery = "";

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

  const renderTable = () => {
    const filtered = getFilteredCategories();
    $("#categoryCountLabel").textContent = `${filtered.length} danh mục`;

    if (!filtered.length) {
      $("#categoriesTable").innerHTML =
        '<div class="empty-state">Chưa có danh mục phù hợp với bộ lọc hiện tại.</div>';
      return;
    }

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
            ${filtered
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
  };

  const applyFilter = () => {
    currentQuery = $("#categoryQuery").value.trim();
    renderTable();
  };

  const clearFilter = () => {
    currentQuery = "";
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
    $("#categoryQuery").addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      applyFilter();
    });
  };

  const init = async () => {
    Admin.initShell("categories");
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
