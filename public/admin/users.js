const AdminUsersPage = (() => {
  const Admin = window.BambiAdmin;
  let users = [];

  const renderStats = () => {
    const total = users.length;
    const admins = users.filter((user) => user.role === "admin").length;
    const customers = users.filter((user) => user.role === "customer").length;
    const active = users.filter((user) => user.status !== "inactive").length;

    Admin.$("#userStats").innerHTML = [
      ["Tổng người dùng", total, "Tất cả tài khoản"],
      ["Quản trị viên", admins, "Tài khoản nội bộ"],
      ["Khách hàng", customers, "Tài khoản mua bán"],
      ["Đang hoạt động", active, "Không bị khoá"],
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

  const renderTable = (list) => {
    const container = Admin.$("#usersTable");

    if (!list.length) {
      container.innerHTML = '<div class="empty-state">Không có người dùng nào khớp bộ lọc.</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Mã người dùng</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map(
                (user) => `
                  <tr>
                    <td>${Admin.escapeHtml(user.id)}</td>
                    <td>${Admin.escapeHtml(user.full_name || "-")}</td>
                    <td>${Admin.escapeHtml(user.email || "-")}</td>
                    <td>${Admin.escapeHtml(user.phone || "-")}</td>
                    <td><span class="chip blue">${Admin.escapeHtml(user.role || "customer")}</span></td>
                    <td><span class="chip gray">${Admin.escapeHtml(user.status || "active")}</span></td>
                    <td>${Admin.escapeHtml(Admin.formatDateTime(user.created_at))}</td>
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
    const query = Admin.$("#userQuery").value.trim().toLowerCase();
    const filtered = users.filter((user) => {
      const haystack = [
        user.id,
        user.full_name,
        user.email,
        user.phone,
        user.role,
        user.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    renderTable(filtered);
    Admin.$("#userCountLabel").textContent = `${filtered.length} người dùng`;
  };

  const loadUsers = async () => {
    const payload = await Admin.apiFetch("/users");
    users = Array.isArray(payload) ? payload : [];
    renderStats();
    applyFilter();
  };

  const bindToolbar = () => {
    Admin.$("#applyUserFilter")?.addEventListener("click", applyFilter);
    Admin.$("#reloadUsers")?.addEventListener("click", async () => {
      try {
        await loadUsers();
        Admin.setStatus("Đã tải lại danh sách người dùng.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
    Admin.$("#clearUserFilter")?.addEventListener("click", () => {
      Admin.$("#userQuery").value = "";
      applyFilter();
    });
    Admin.$("#userQuery")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyFilter();
      }
    });
  };

  const init = async () => {
    Admin.initShell("users");
    bindToolbar();
    if (!Admin.hasToken()) {
      Admin.setStatus("B?n ch?a ??ng nh?p admin. H?y m? trang ??ng nh?p qu?n tr? ?? qu?n l? ng??i d?ng.");
      return;
    }

    try {
      await loadUsers();
      Admin.setStatus("Đã tải danh sách người dùng.");
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminUsersPage.init();
