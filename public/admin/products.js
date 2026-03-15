const AdminProductsPage = (() => {
  const Admin = window.BambiAdmin;
  let products = [];
  let summary = { total: 0, by_status: {} };

  const STATUS_META = {
    active: { label: "Đang hiển thị", className: "" },
    pending: { label: "Chờ duyệt", className: "orange" },
    rejected: { label: "Chưa được đăng", className: "gray" },
    locked: { label: "Bị khóa", className: "gray" },
    inactive: { label: "Đang ẩn", className: "gray" },
  };

  const getStatusMeta = (status) =>
    STATUS_META[status] || { label: status || "Không rõ", className: "gray" };

  const getProductPrice = (product) => {
    const prices = (product?.product_variants || [])
      .map((variant) => Number(variant?.price))
      .filter(Number.isFinite);
    if (!prices.length) return 0;
    return Math.min(...prices);
  };

  const getProductStock = (product) =>
    (product?.product_variants || []).reduce((total, variant) => {
      const stock = Number(variant?.stock);
      return total + (Number.isFinite(stock) ? stock : 0);
    }, 0);

  const renderStats = () => {
    const counts = summary?.by_status || {};
    const items = [
      ["Tổng sản phẩm", summary?.total || 0, "Toàn bộ sản phẩm trên sàn"],
      ["Chờ duyệt", counts.pending || 0, "Đang chờ admin duyệt"],
      ["Chưa được đăng", counts.rejected || 0, "Đã bị từ chối"],
      ["Đang hiển thị", counts.active || 0, "Sản phẩm đã duyệt"],
      ["Bị khóa", counts.locked || 0, "Bị khóa do vi phạm"],
      ["Đang ẩn", counts.inactive || 0, "Shop tự ẩn sản phẩm"],
    ];

    Admin.$("#productStats").innerHTML = items
      .map(
        ([label, value, note]) => `
          <article class="stat-card">
            <span>${Admin.escapeHtml(label)}</span>
            <strong>${Admin.escapeHtml(value)}</strong>
            <small>${Admin.escapeHtml(note)}</small>
          </article>
        `
      )
      .join("");

    Admin.$("#productStatusBar").innerHTML = Object.keys(STATUS_META)
      .map((status) => {
        const meta = getStatusMeta(status);
        const count = counts[status] || 0;
        return `<span class="chip ${Admin.escapeHtml(meta.className)}">${Admin.escapeHtml(
          meta.label
        )}: ${Admin.escapeHtml(count)}</span>`;
      })
      .join("");
  };

  const buildActionButtons = (product) => {
    const status = product?.status || "";
    if (status === "pending") {
      return `
        <button class="btn" data-action="approve-product" data-id="${Admin.escapeHtml(product.id)}" data-next-status="active">Duyệt</button>
        <button class="btn danger" data-action="reject-product" data-id="${Admin.escapeHtml(product.id)}" data-next-status="rejected">Từ chối</button>
      `;
    }

    if (status === "rejected") {
      return `
        <button class="btn" data-action="approve-product" data-id="${Admin.escapeHtml(product.id)}" data-next-status="active">Duyệt lại</button>
      `;
    }

    if (status === "active") {
      return `
        <button class="btn danger" data-action="lock-product" data-id="${Admin.escapeHtml(product.id)}" data-next-status="locked">Khóa</button>
      `;
    }

    if (status === "locked") {
      return `
        <button class="btn ghost" data-action="unlock-product" data-id="${Admin.escapeHtml(product.id)}" data-next-status="active">Mở khóa</button>
      `;
    }

    return '<span class="muted">Không có hành động</span>';
  };

  const renderTable = (list) => {
    const container = Admin.$("#productsTable");
    if (!list.length) {
      container.innerHTML = '<div class="empty-state">Không có sản phẩm nào khớp bộ lọc.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Sản phẩm</th>
              <th>Shop</th>
              <th>Trạng thái</th>
              <th>Giá</th>
              <th>Kho</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map((product) => {
                const statusMeta = getStatusMeta(product.status);
                const price = getProductPrice(product);
                const stock = getProductStock(product);
                return `
                  <tr>
                    <td>
                      <strong>${Admin.escapeHtml(product.name || "-")}</strong><br />
                      <span class="muted">#${Admin.escapeHtml(product.id)}</span><br />
                      <span class="muted">${Admin.escapeHtml(
                        product.categories?.name || "-"
                      )}</span>
                    </td>
                    <td>
                      ${Admin.escapeHtml(product.shops?.name || "-")}<br />
                      <span class="muted">${Admin.escapeHtml(product.shop_id || "-")}</span>
                    </td>
                    <td><span class="chip ${Admin.escapeHtml(statusMeta.className)}">${Admin.escapeHtml(statusMeta.label)}</span></td>
                    <td>${Admin.escapeHtml(Admin.formatCurrency(price))}</td>
                    <td>${Admin.escapeHtml(stock)}</td>
                    <td>${Admin.escapeHtml(Admin.formatDateTime(product.created_at))}</td>
                    <td>
                      <div class="actions">
                        ${buildActionButtons(product)}
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  const loadData = async () => {
    const query = Admin.$("#productQuery").value.trim();
    const status = Admin.$("#productStatusFilter").value || "all";
    const limit = Number(Admin.$("#productsLimit").value || 100);

    const params = new URLSearchParams({
      limit: String(limit),
      status,
    });
    if (query) params.set("q", query);

    const payload = await Admin.apiFetch(`/admin/products?${params.toString()}`);

    products = payload.products?.data || [];
    summary = payload.products?.summary || { total: 0, by_status: {} };
    renderStats();
    renderTable(products);
    Admin.$("#productCountLabel").textContent = `${products.length} sản phẩm`;
  };

  const bindToolbar = () => {
    Admin.$("#applyProductFilter")?.addEventListener("click", async () => {
      try {
        await loadData();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
    Admin.$("#clearProductFilter")?.addEventListener("click", async () => {
      Admin.$("#productQuery").value = "";
      Admin.$("#productStatusFilter").value = "all";
      Admin.$("#productsLimit").value = "100";
      try {
        await loadData();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
    Admin.$("#reloadProducts")?.addEventListener("click", async () => {
      try {
        await loadData();
        Admin.setStatus("Đã tải lại danh sách sản phẩm.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
    Admin.$("#productQuery")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        Admin.$("#applyProductFilter")?.click();
      }
    });
  };

  const bindActions = () => {
    Admin.$("#productsTable")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = button.dataset.id;
      const nextStatus = button.dataset.nextStatus;
      if (!id || !nextStatus) return;

      const action = button.dataset.action || "";
      const confirmMessages = {
        "reject-product": "Từ chối sản phẩm này?",
        "lock-product": "Khóa sản phẩm này vì vi phạm?",
      };
      const confirmMessage = confirmMessages[action];
      if (confirmMessage && !window.confirm(confirmMessage)) {
        return;
      }

      try {
        button.disabled = true;
        await Admin.apiFetch(`/admin/products/${id}/status`, {
          method: "PATCH",
          body: { status: nextStatus },
        });
        const successMessage = {
          "approve-product": "Đã duyệt sản phẩm.",
          "reject-product": "Đã từ chối sản phẩm.",
          "lock-product": "Đã khóa sản phẩm.",
          "unlock-product": "Đã mở khóa sản phẩm.",
        }[action];
        Admin.setStatus(successMessage || "Đã cập nhật trạng thái sản phẩm.");
        await loadData();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      } finally {
        button.disabled = false;
      }
    });
  };

  const init = async () => {
    Admin.initShell("products");
    bindToolbar();
    bindActions();
    if (!Admin.hasToken()) {
      Admin.setStatus("B?n ch?a ??ng nh?p admin. H?y m? trang ??ng nh?p qu?n tr? ?? qu?n l? s?n ph?m.");
      return;
    }

    try {
      await loadData();
      Admin.setStatus("Đã tải danh sách sản phẩm.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminProductsPage.init();
