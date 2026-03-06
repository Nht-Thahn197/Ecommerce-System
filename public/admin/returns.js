const AdminReturnsPage = (() => {
  const Admin = window.BambiAdmin;
  let pendingReturns = [];
  let pendingDisputes = [];

  const renderStats = () => {
    Admin.$("#returnStats").innerHTML = [
      ["Trả hàng chờ duyệt", pendingReturns.length, "Yêu cầu cần phản hồi"],
      ["Tranh chấp mở", pendingDisputes.length, "Cần ra quyết định"],
      ["Tổng hồ sơ đang xử lý", pendingReturns.length + pendingDisputes.length, "Bao gồm toàn bộ case mở"],
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
  };

  const renderReturnsTable = (list) => {
    const container = Admin.$("#returnsTable");
    if (!list.length) {
      container.innerHTML = '<div class="empty-state">Không có yêu cầu trả hàng nào khớp bộ lọc.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Mã trả hàng</th>
              <th>Lý do</th>
              <th>Mã mục đơn</th>
              <th>Khách hàng</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (ret) => `
                  <tr>
                    <td>${Admin.escapeHtml(ret.id)}</td>
                    <td>${Admin.escapeHtml(ret.reason || "-")}</td>
                    <td>${Admin.escapeHtml(ret.order_items?.id || "-")}</td>
                    <td>${Admin.escapeHtml(ret.order_items?.orders?.users?.full_name || ret.order_items?.orders?.user_id || "-")}</td>
                    <td>${Admin.escapeHtml(Admin.formatDateTime(ret.created_at))}</td>
                    <td class="actions">
                      <button class="btn" data-action="approve-return" data-id="${Admin.escapeHtml(ret.id)}">Duyệt</button>
                      <button class="btn danger" data-action="reject-return" data-id="${Admin.escapeHtml(ret.id)}">Từ chối</button>
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

  const renderDisputesTable = (list) => {
    const container = Admin.$("#disputesTable");
    if (!list.length) {
      container.innerHTML = '<div class="empty-state">Không có tranh chấp nào khớp bộ lọc.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Mã trả hàng</th>
              <th>Lý do tranh chấp</th>
              <th>Mã mục đơn</th>
              <th>Ngày tạo</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (ret) => `
                  <tr>
                    <td>${Admin.escapeHtml(ret.id)}</td>
                    <td>${Admin.escapeHtml(ret.dispute_reason || "-")}</td>
                    <td>${Admin.escapeHtml(ret.order_items?.id || "-")}</td>
                    <td>${Admin.escapeHtml(Admin.formatDateTime(ret.updated_at || ret.created_at))}</td>
                    <td class="actions">
                      <button class="btn" data-action="approve-dispute" data-id="${Admin.escapeHtml(ret.id)}">Duyệt</button>
                      <button class="btn danger" data-action="reject-dispute" data-id="${Admin.escapeHtml(ret.id)}">Từ chối</button>
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
    const query = Admin.$("#returnQuery").value.trim().toLowerCase();
    const match = (item) =>
      [item.id, item.reason, item.dispute_reason, item.order_items?.id, item.order_items?.orders?.user_id]
        .join(" ")
        .toLowerCase()
        .includes(query);

    const filteredReturns = pendingReturns.filter(match);
    const filteredDisputes = pendingDisputes.filter(match);
    renderReturnsTable(filteredReturns);
    renderDisputesTable(filteredDisputes);
    Admin.$("#returnCountLabel").textContent = `${filteredReturns.length} trả hàng / ${filteredDisputes.length} tranh chấp`;
  };

  const loadData = async () => {
    const [returnsPayload, disputesPayload] = await Promise.all([
      Admin.apiFetch("/returns/pending"),
      Admin.apiFetch("/returns/disputes"),
    ]);

    pendingReturns = returnsPayload.returns?.data || [];
    pendingDisputes = disputesPayload.returns?.data || [];
    renderStats();
    applyFilter();
  };

  const bindActions = () => {
    Admin.$("#returnsTable")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const id = button.dataset.id;

      try {
        if (button.dataset.action === "approve-return") {
          await Admin.apiFetch(`/returns/${id}`, { method: "PATCH", body: { status: "approved" } });
          Admin.setStatus("Đã duyệt yêu cầu trả hàng.");
        }

        if (button.dataset.action === "reject-return") {
          const rejected_reason = prompt("Lý do từ chối yêu cầu trả hàng?") || "Không đủ điều kiện hoàn trả";
          await Admin.apiFetch(`/returns/${id}`, {
            method: "PATCH",
            body: { status: "rejected", rejected_reason },
          });
          Admin.setStatus("Đã từ chối yêu cầu trả hàng.");
        }

        await loadData();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });

    Admin.$("#disputesTable")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const id = button.dataset.id;

      try {
        if (button.dataset.action === "approve-dispute") {
          const resolution = prompt("Ghi chú xử lý tranh chấp?") || "Chấp nhận tranh chấp";
          await Admin.apiFetch(`/returns/${id}/dispute`, {
            method: "PATCH",
            body: { action: "approve", resolution },
          });
          Admin.setStatus("Đã duyệt tranh chấp.");
        }

        if (button.dataset.action === "reject-dispute") {
          const resolution = prompt("Ghi chú từ chối tranh chấp?") || "Từ chối tranh chấp";
          await Admin.apiFetch(`/returns/${id}/dispute`, {
            method: "PATCH",
            body: { action: "reject", resolution },
          });
          Admin.setStatus("Đã từ chối tranh chấp.");
        }

        await loadData();
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
  };

  const bindToolbar = () => {
    Admin.$("#applyReturnFilter")?.addEventListener("click", applyFilter);
    Admin.$("#reloadReturns")?.addEventListener("click", async () => {
      try {
        await loadData();
        Admin.setStatus("Đã tải lại dữ liệu trả hàng và tranh chấp.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
    Admin.$("#clearReturnFilter")?.addEventListener("click", () => {
      Admin.$("#returnQuery").value = "";
      applyFilter();
    });
    Admin.$("#returnQuery")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyFilter();
      }
    });
  };

  const init = async () => {
    Admin.initShell("returns");
    bindToolbar();
    bindActions();
    if (!Admin.hasToken()) {
      Admin.setStatus("B?n ch?a ??ng nh?p admin. H?y m? trang ??ng nh?p qu?n tr? ?? x? l? tr? h?ng v? tranh ch?p.");
      return;
    }

    try {
      await loadData();
      Admin.setStatus("Đã tải dữ liệu trả hàng và tranh chấp.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminReturnsPage.init();
