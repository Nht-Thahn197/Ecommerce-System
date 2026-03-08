const AdminShopsPage = (() => {
  const Admin = window.BambiAdmin;
  let shopData = [];
  let counts = {};

  const renderStats = () => {
    const container = Admin.$("#shopStats");
    const items = [
      ["Tổng shop", counts.shops ?? 0, "Tổng shop đã đăng ký"],
      ["Đã duyệt", counts.shops_approved ?? 0, "Đang hoạt động trên sàn"],
      ["Chờ duyệt", shopData.length, "Cần xử lý trong hàng đợi"],
    ];

    container.innerHTML = items
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
  };

  const renderTable = (list) => {
    const container = Admin.$("#shopsTable");

    if (!list.length) {
      container.innerHTML = '<div class="empty-state">Không có shop nào khớp bộ lọc.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Shop</th>
              <th>Chủ shop</th>
              <th>Trạng thái</th>
              <th>Liên hệ</th>
              <th>Tạo lúc</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (shop) => `
                  <tr>
                    <td>
                      <strong>${Admin.escapeHtml(shop.name || "-")}</strong><br />
                      <span class="muted">${Admin.escapeHtml(shop.id)}</span>
                    </td>
                    <td>
                      ${Admin.escapeHtml(shop.users?.full_name || "-")}<br />
                      <span class="muted">${Admin.escapeHtml(shop.users?.email || "-")}</span><br />
                      <span class="muted">${Admin.escapeHtml(shop.users?.phone || "-")}</span>
                    </td>
                    <td><span class="chip gray">${Admin.escapeHtml(shop.status || "pending")}</span></td>
                    <td>
                      ${Admin.escapeHtml(shop.contact_email || shop.users?.email || "-")}<br />
                      <span class="muted">${Admin.escapeHtml(shop.contact_phone || shop.users?.phone || "-")}</span>
                    </td>
                    <td>${Admin.escapeHtml(Admin.formatDateTime(shop.created_at))}</td>
                    <td class="actions">
                      <a class="btn ghost" href="/ui/admin/shop-detail.html?id=${Admin.escapeHtml(shop.id)}">Chi tiết</a>
                      <button class="btn" data-action="approve-shop" data-id="${Admin.escapeHtml(shop.id)}">Duyệt</button>
                      <button class="btn danger" data-action="reject-shop" data-id="${Admin.escapeHtml(shop.id)}">Từ chối</button>
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
    const query = Admin.$("#shopQuery").value.trim().toLowerCase();
    const filtered = shopData.filter((shop) => {
      const haystack = [
        shop.name,
        shop.id,
        shop.status,
        shop.contact_email,
        shop.contact_phone,
        shop.users?.full_name,
        shop.users?.email,
        shop.users?.phone,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    renderTable(filtered);
    Admin.$("#shopCountLabel").textContent = `${filtered.length} shop`;
  };

  const loadData = async () => {
    const [overview, pending] = await Promise.all([
      Admin.apiFetch("/admin/overview"),
      Admin.apiFetch("/admin/shops/pending"),
    ]);

    counts = overview.overview?.counts || {};
    shopData = pending.shops?.data || [];
    renderStats();
    applyFilter();
  };

  const bindActions = () => {
    Admin.$("#shopsTable")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = button.dataset.id;
      try {
        if (button.dataset.action === "approve-shop") {
          await Admin.apiFetch(`/shops/${id}/status`, { method: "PATCH", body: { status: "approved" } });
          Admin.setStatus("Đã duyệt shop.");
        }

        if (button.dataset.action === "reject-shop") {
          const rejected_reason = prompt("Lý do từ chối shop?") || "Không đạt điều kiện duyệt";
          await Admin.apiFetch(`/shops/${id}/status`, {
            method: "PATCH",
            body: { status: "rejected", rejected_reason },
          });
          Admin.setStatus("Đã từ chối shop.");
        }

        await loadData();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
  };

  const bindToolbar = () => {
    Admin.$("#applyShopFilter")?.addEventListener("click", applyFilter);
    Admin.$("#reloadShops")?.addEventListener("click", async () => {
      try {
        await loadData();
        Admin.setStatus("Đã tải lại danh sách shop.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
    Admin.$("#clearShopFilter")?.addEventListener("click", () => {
      Admin.$("#shopQuery").value = "";
      applyFilter();
    });
    Admin.$("#shopQuery")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyFilter();
      }
    });
  };

  const init = async () => {
    Admin.initShell("shops");
    bindToolbar();
    bindActions();
    if (!Admin.hasToken()) {
      Admin.setStatus("B?n ch?a ??ng nh?p admin. H?y m? trang ??ng nh?p qu?n tr? ?? qu?n l? shop.");
      return;
    }

    try {
      await loadData();
      Admin.setStatus("Đã tải danh sách shop chờ duyệt.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminShopsPage.init();
