const AdminOrdersPage = (() => {
  const Admin = window.BambiAdmin;
  let orders = [];
  let overview = null;

  const renderStats = () => {
    const counts = overview?.overview?.counts || {};
    Admin.$("#orderStats").innerHTML = [
      ["Tổng đơn hàng", counts.orders ?? 0, "Theo dữ liệu tổng quan"],
      ["Đang hiển thị", orders.length, "Dựa trên giới hạn hiện tại"],
      ["Đánh giá", counts.reviews ?? 0, "Số lượt đánh giá sản phẩm"],
    ]
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

    const orderStatus = overview?.overview?.order_status || [];
    const paymentStatus = overview?.overview?.payment_status || [];

    Admin.$("#orderStatusBar").innerHTML = orderStatus.length
      ? orderStatus.map((item) => `<span class="chip gray">${Admin.escapeHtml(item.status)}: ${Admin.escapeHtml(item.count)}</span>`).join("")
      : '<div class="empty-state">Chưa có dữ liệu trạng thái đơn.</div>';

    Admin.$("#paymentStatusBar").innerHTML = paymentStatus.length
      ? paymentStatus.map((item) => `<span class="chip blue">${Admin.escapeHtml(item.status)}: ${Admin.escapeHtml(item.count)}</span>`).join("")
      : '<div class="empty-state">Chưa có dữ liệu thanh toán.</div>';
  };

  const renderTable = (list) => {
    const container = Admin.$("#ordersTable");
    if (!list.length) {
      container.innerHTML = '<div class="empty-state">Không có đơn hàng nào khớp bộ lọc.</div>';
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
              <th>Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            ${list
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

  const applyFilter = () => {
    const query = Admin.$("#orderQuery").value.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      const haystack = [
        order.id,
        order.users?.full_name,
        order.users?.email,
        order.payment_status,
        order.order_status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    renderTable(filtered);
    Admin.$("#orderCountLabel").textContent = `${filtered.length} đơn hàng`;
  };

  const loadData = async () => {
    const limit = Number(Admin.$("#ordersLimit").value || 10);
    const [overviewPayload, ordersPayload] = await Promise.all([
      Admin.apiFetch("/admin/overview"),
      Admin.apiFetch(`/admin/orders/recent?limit=${limit}`),
    ]);

    overview = overviewPayload;
    orders = ordersPayload.orders?.data || [];
    renderStats();
    applyFilter();
  };

  const bindToolbar = () => {
    Admin.$("#applyOrderFilter")?.addEventListener("click", applyFilter);
    Admin.$("#reloadOrders")?.addEventListener("click", async () => {
      try {
        await loadData();
        Admin.setStatus("Đã tải lại danh sách đơn hàng.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
    Admin.$("#clearOrderFilter")?.addEventListener("click", () => {
      Admin.$("#orderQuery").value = "";
      applyFilter();
    });
    Admin.$("#orderQuery")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyFilter();
      }
    });
  };

  const init = async () => {
    Admin.initShell("orders");
    bindToolbar();
    if (!Admin.hasToken()) {
      Admin.setStatus("B?n ch?a ??ng nh?p admin. H?y m? trang ??ng nh?p qu?n tr? ?? xem ??n h?ng.");
      return;
    }

    try {
      await loadData();
      Admin.setStatus("Đã tải danh sách đơn hàng gần đây.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminOrdersPage.init();
