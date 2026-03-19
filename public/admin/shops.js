const AdminShopsPage = (() => {
  const Admin = window.BambiAdmin;
  let shopData = [];
  let counts = {};
  let revenueSummary = {};
  let revenueRequests = [];

  const maskAccountNumber = (value) => {
    const raw = String(value || "").replace(/\s+/g, "");
    if (!raw) return "-";
    return raw.length <= 4 ? raw : `**** ${raw.slice(-4)}`;
  };

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

  const renderRevenueStats = () => {
    const container = Admin.$("#shopRevenueStats");
    const items = [
      [
        "Doanh thu gross",
        Admin.formatCurrency(revenueSummary.payout_gross ?? 0),
        "Tổng giá trị đơn đã hoàn tất của shop",
      ],
      [
        "Phí sàn 30%",
        Admin.formatCurrency(revenueSummary.platform_fees ?? 0),
        "Phần Bambi giữ lại từ doanh thu shop",
      ],
      [
        "Đã cộng vào ví",
        Admin.formatCurrency(revenueSummary.payout_net ?? 0),
        "Số tiền seller đã được ghi nhận vào ví Bambi",
      ],
      [
        "Yêu cầu chờ duyệt",
        revenueSummary.pending_requests ?? 0,
        "Số yêu cầu rút tiền đang chờ admin xử lý",
      ],
      [
        "Tiền chờ duyệt",
        Admin.formatCurrency(revenueSummary.pending_amount ?? 0),
        "Tổng số tiền đang chờ admin duyệt rút",
      ],
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
                    <td>
                      <div class="actions">
                        <a class="btn ghost" href="/ui/admin/shop-detail.html?id=${Admin.escapeHtml(shop.id)}">Chi tiết</a>
                        <button class="btn" data-action="approve-shop" data-id="${Admin.escapeHtml(shop.id)}">Duyệt</button>
                        <button class="btn danger" data-action="reject-shop" data-id="${Admin.escapeHtml(shop.id)}">Từ chối</button>
                      </div>
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

  const renderRevenueTable = (list) => {
    const container = Admin.$("#shopRevenueTable");

    if (!list.length) {
      container.innerHTML =
        '<div class="empty-state">Không có yêu cầu rút tiền nào khớp bộ lọc.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Shop</th>
              <th>Chủ shop</th>
              <th>Yêu cầu rút</th>
              <th>Tài khoản nhận tiền</th>
              <th>Số dư ví</th>
              <th>Tạo lúc</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map((request) => {
                const bank = request.bank_account;
                const bankLabel = bank?.bank_name
                  ? `${bank.bank_name} · ${maskAccountNumber(bank.account_number)}`
                  : "Chưa có tài khoản ngân hàng";

                return `
                  <tr>
                    <td>
                      <strong>${Admin.escapeHtml(request.shop?.name || "-")}</strong><br />
                      <span class="muted">${Admin.escapeHtml(request.shop?.id || "-")}</span>
                    </td>
                    <td>
                      ${Admin.escapeHtml(request.seller?.full_name || "-")}<br />
                      <span class="muted">${Admin.escapeHtml(request.seller?.email || "-")}</span><br />
                      <span class="muted">${Admin.escapeHtml(request.seller?.phone || "-")}</span>
                    </td>
                    <td>
                      <strong>${Admin.escapeHtml(Admin.formatCurrency(request.amount || 0))}</strong><br />
                      <span class="chip orange">Chờ duyệt</span>
                    </td>
                    <td>
                      ${Admin.escapeHtml(bankLabel)}<br />
                      <span class="muted">${Admin.escapeHtml(bank?.account_holder || "-")}</span>
                    </td>
                    <td>${Admin.escapeHtml(Admin.formatCurrency(request.wallet?.balance || 0))}</td>
                    <td>${Admin.escapeHtml(Admin.formatDateTime(request.created_at))}</td>
                    <td>
                      <div class="actions">
                        <button
                          class="btn"
                          data-action="approve-withdraw"
                          data-id="${Admin.escapeHtml(request.id)}"
                        >
                          Duyệt rút
                        </button>
                        <button
                          class="btn danger"
                          data-action="reject-withdraw"
                          data-id="${Admin.escapeHtml(request.id)}"
                        >
                          Từ chối
                        </button>
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

  const applyRevenueFilter = () => {
    const query = Admin.$("#shopRevenueQuery").value.trim().toLowerCase();
    const filtered = revenueRequests.filter((request) => {
      const haystack = [
        request.shop?.name,
        request.shop?.id,
        request.seller?.full_name,
        request.seller?.email,
        request.seller?.phone,
        request.bank_account?.bank_name,
        request.bank_account?.account_holder,
        request.bank_account?.account_number,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    renderRevenueTable(filtered);
    Admin.$("#revenueRequestCountLabel").textContent = `${filtered.length} yêu cầu`;
  };

  const loadData = async () => {
    const [overview, pending, revenue] = await Promise.all([
      Admin.apiFetch("/admin/overview"),
      Admin.apiFetch("/admin/shops/pending"),
      Admin.apiFetch("/admin/shops/revenue/withdraw-requests?limit=100"),
    ]);

    counts = overview.overview?.counts || {};
    shopData = pending.shops?.data || [];
    revenueSummary = revenue.revenue?.summary || {};
    revenueRequests = revenue.revenue?.requests?.data || [];

    renderStats();
    renderRevenueStats();
    applyFilter();
    applyRevenueFilter();
  };

  const bindActions = () => {
    Admin.$("#shopsTable")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = button.dataset.id;
      try {
        if (button.dataset.action === "approve-shop") {
          await Admin.apiFetch(`/shops/${id}/status`, {
            method: "PATCH",
            body: { status: "approved" },
          });
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

    Admin.$("#shopRevenueTable")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = button.dataset.id;

      try {
        if (button.dataset.action === "approve-withdraw") {
          const confirmed = window.confirm("Duyệt yêu cầu rút tiền này?");
          if (!confirmed) return;
          await Admin.apiFetch(`/admin/shops/revenue/withdraw-requests/${id}`, {
            method: "PATCH",
            body: { action: "approve" },
          });
          Admin.setStatus("Đã duyệt yêu cầu rút tiền.");
        }

        if (button.dataset.action === "reject-withdraw") {
          const confirmed = window.confirm("Từ chối yêu cầu rút tiền này?");
          if (!confirmed) return;
          await Admin.apiFetch(`/admin/shops/revenue/withdraw-requests/${id}`, {
            method: "PATCH",
            body: { action: "reject" },
          });
          Admin.setStatus("Đã từ chối yêu cầu rút tiền.");
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

    Admin.$("#applyRevenueFilter")?.addEventListener("click", applyRevenueFilter);
    Admin.$("#reloadRevenueRequests")?.addEventListener("click", async () => {
      try {
        await loadData();
        Admin.setStatus("Đã tải lại yêu cầu rút tiền.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
    Admin.$("#clearRevenueFilter")?.addEventListener("click", () => {
      Admin.$("#shopRevenueQuery").value = "";
      applyRevenueFilter();
    });
    Admin.$("#shopRevenueQuery")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyRevenueFilter();
      }
    });
  };

  const init = async () => {
    Admin.initShell("shops");
    bindToolbar();
    bindActions();
    if (!Admin.hasToken()) {
      Admin.setStatus("Bạn chưa đăng nhập admin. Hãy mở trang đăng nhập quản trị để quản lý shop.");
      return;
    }

    try {
      await loadData();
      Admin.setStatus("Đã tải danh sách shop và yêu cầu rút tiền.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminShopsPage.init();
