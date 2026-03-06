const AdminDashboard = (() => {
  const Admin = window.BambiAdmin;

  const renderMetrics = (counts = {}) => {
    const container = Admin.$("#overviewMetrics");
    const items = [
      ["Người dùng", counts.users ?? 0, "Tài khoản đang hoạt động trên sàn"],
      ["Shop", counts.shops ?? 0, "Tổng shop đã đăng ký"],
      ["Shop chờ duyệt", counts.shops_pending ?? 0, "Cần xử lý ngay"],
      ["Đơn hàng", counts.orders ?? 0, "Đã ghi nhận trong hệ thống"],
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

  const renderPills = (selector, items, className = "chip") => {
    const container = Admin.$(selector);
    if (!items || items.length === 0) {
      container.innerHTML = '<div class="empty-state">Chưa có dữ liệu.</div>';
      return;
    }

    container.innerHTML = items
      .map((item) => `<span class="${className}">${Admin.escapeHtml(item.status)}: ${Admin.escapeHtml(item.count)}</span>`)
      .join("");
  };

  const renderQueueSummary = (shops, returns, disputes) => {
    const container = Admin.$("#queueSummary");
    const cards = [
      ["Shop chờ duyệt", shops?.data?.length ?? 0, "Đi tới trang quản lý shop", "/ui/admin/shops.html"],
      ["Yêu cầu trả hàng", returns?.data?.length ?? 0, "Đi tới trang trả hàng", "/ui/admin/returns.html"],
      ["Tranh chấp mở", disputes?.data?.length ?? 0, "Đi tới trang tranh chấp", "/ui/admin/returns.html"],
    ];

    container.innerHTML = cards
      .map(
        ([label, value, note, href]) => `
          <article class="admin-card span-4">
            <div class="kicker">Hàng đợi xử lý</div>
            <div class="metric-strip" style="margin-top: 14px;">
              <div>
                <strong>${Admin.escapeHtml(value)}</strong>
                <div class="muted">${Admin.escapeHtml(label)}</div>
              </div>
              <span class="chip">Mới</span>
            </div>
            <div style="margin-top: 14px;">
              <a class="summary-link" href="${href}">${Admin.escapeHtml(note)}</a>
            </div>
          </article>
        `
      )
      .join("");
  };

  const renderRecentOrders = (orders) => {
    const container = Admin.$("#recentOrdersPreview");
    const data = orders?.data || [];

    if (data.length === 0) {
      container.innerHTML = '<div class="empty-state">Chưa có đơn hàng gần đây.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Tổng tiền</th>
              <th>Thanh toán</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
            </tr>
          </thead>
          <tbody>
            ${data
              .map(
                (order) => `
                  <tr>
                    <td>${Admin.escapeHtml(order.id)}</td>
                    <td>${Admin.escapeHtml(order.users?.full_name || order.users?.email || "-")}</td>
                    <td>${Admin.formatCurrency(order.total_amount)}</td>
                    <td><span class="chip blue">${Admin.escapeHtml(order.payment_status || "-")}</span></td>
                    <td><span class="chip gray">${Admin.escapeHtml(order.order_status || "-")}</span></td>
                    <td>${Admin.escapeHtml(Admin.formatDateTime(order.created_at))}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  const loadDashboard = async () => {
    const [overview, shops, returns, disputes, orders] = await Promise.all([
      Admin.apiFetch("/admin/overview"),
      Admin.apiFetch("/admin/shops/pending"),
      Admin.apiFetch("/returns/pending"),
      Admin.apiFetch("/returns/disputes"),
      Admin.apiFetch("/admin/orders/recent?limit=5"),
    ]);

    renderMetrics(overview.overview?.counts || {});
    renderPills("#orderStatus", overview.overview?.order_status || []);
    renderPills("#paymentStatus", overview.overview?.payment_status || [], "chip blue");
    renderQueueSummary(shops.shops, returns.returns, disputes.returns);
    renderRecentOrders(orders.orders);
  };

  const bindEvents = () => {
    Admin.$("#reloadDashboard")?.addEventListener("click", async () => {
      try {
        await loadDashboard();
        Admin.setStatus("Đã tải lại trang tổng quan.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
  };

  const init = async () => {
    Admin.initShell("dashboard");
    bindEvents();
    if (!Admin.hasToken()) {
      Admin.setStatus("B?n ch?a ??ng nh?p admin. H?y m? trang ??ng nh?p qu?n tr?.");
      return;
    }

    try {
      await loadDashboard();
      Admin.setStatus("Đã tải dữ liệu tổng quan.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminDashboard.init();
