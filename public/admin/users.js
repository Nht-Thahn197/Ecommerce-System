const AdminUsersPage = (() => {
  const Admin = window.BambiAdmin;
  const ROLE_META = {
    admin: { label: "Admin", className: "orange" },
    staff: { label: "Staff", className: "blue" },
    customer: { label: "Customer", className: "gray" },
  };
  const STATUS_META = {
    active: { label: "Hoạt động", className: "green" },
    locked: { label: "Bị khóa", className: "gray" },
    inactive: { label: "Ngưng hoạt động", className: "gray" },
  };

  let users = [];
  let currentUser = null;
  let draftStatus = "active";
  let selectedUser = null;

  const $ = (selector) => Admin.$(selector);

  const normalizeStatus = (status) =>
    String(status || "").trim().toLowerCase() === "active" ? "active" : "locked";

  const getRoleMeta = (role) =>
    ROLE_META[String(role || "").trim().toLowerCase()] || ROLE_META.customer;

  const getStatusMeta = (status) =>
    STATUS_META[String(status || "").trim().toLowerCase()] || STATUS_META.locked;

  const isAdminViewer = () => currentUser?.role === "admin";

  const isEditingSelf = () =>
    Boolean(currentUser?.id && selectedUser?.id && currentUser.id === selectedUser.id);

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("vi-VN");
  };

  const refreshRoleSelect = () => {
    const select = $("#userRoleInput");
    if (!select) return;
    window.BambiCustomSelect?.refreshSelect(select);
  };

  const setModalStatus = (message, type = "info") => {
    const statusEl = $("#userModalStatus");
    if (!statusEl) return;

    if (!message) {
      statusEl.style.display = "none";
      statusEl.textContent = "";
      statusEl.className = "status";
      return;
    }

    statusEl.style.display = "block";
    statusEl.textContent = message;
    statusEl.className = `status${type === "error" ? " error" : ""}`;
  };

  const setUserSaving = (saving) => {
    const saveButton = $("#saveUserBtn");
    const lockButton = $("#toggleUserStatusBtn");

    if (saveButton) {
      saveButton.disabled = Boolean(saving) || !isAdminViewer() || isEditingSelf();
      saveButton.textContent = saving ? "Đang lưu..." : "Lưu cập nhật";
    }

    if (lockButton) {
      lockButton.disabled = Boolean(saving) || !isAdminViewer() || isEditingSelf();
    }
  };

  const renderPermissionNote = () => {
    const note = $("#userPermissionNote");
    if (!note) return;

    note.textContent = isAdminViewer()
      ? "Admin có thể mở form cập nhật để đổi vai trò customer, staff hoặc admin và khóa tài khoản vi phạm."
      : "Tài khoản staff chỉ có quyền xem danh sách người dùng. Thao tác đổi vai trò và khóa tài khoản chỉ dành cho admin.";
  };

  const renderStats = () => {
    const total = users.length;
    const admins = users.filter((user) => String(user.role || "").toLowerCase() === "admin").length;
    const staff = users.filter((user) => String(user.role || "").toLowerCase() === "staff").length;
    const customers = users.filter((user) => String(user.role || "").toLowerCase() === "customer").length;
    const locked = users.filter((user) => normalizeStatus(user.status) !== "active").length;

    $("#userStats").innerHTML = [
      ["Tổng người dùng", total, "Tất cả tài khoản trong hệ thống"],
      ["Admin", admins, "Tài khoản quản trị cấp cao"],
      ["Staff", staff, "Tài khoản nội bộ được vào trang quản trị"],
      ["Customer", customers, "Tài khoản mua bán thông thường"],
      ["Bị khóa", locked, "Tài khoản đang bị giới hạn truy cập"],
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

  const buildActionCell = (user) => {
    if (!isAdminViewer()) {
      return '<span class="muted">Chỉ admin được cập nhật</span>';
    }

    return `
      <button class="btn ghost" type="button" data-action="edit-user" data-id="${Admin.escapeHtml(
        user.id
      )}">
        Cập nhật
      </button>
    `;
  };

  const renderTable = (list) => {
    const container = $("#usersTable");

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
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            ${list
              .map((user) => {
                const roleMeta = getRoleMeta(user.role);
                const statusMeta = getStatusMeta(user.status);

                return `
                  <tr>
                    <td>${Admin.escapeHtml(user.id)}</td>
                    <td>${Admin.escapeHtml(user.full_name || "-")}</td>
                    <td>${Admin.escapeHtml(user.email || "-")}</td>
                    <td>${Admin.escapeHtml(user.phone || "-")}</td>
                    <td><span class="chip ${Admin.escapeHtml(roleMeta.className)}">${Admin.escapeHtml(
                      roleMeta.label
                    )}</span></td>
                    <td><span class="chip ${Admin.escapeHtml(statusMeta.className)}">${Admin.escapeHtml(
                      statusMeta.label
                    )}</span></td>
                    <td>${Admin.escapeHtml(Admin.formatDateTime(user.created_at))}</td>
                    <td><div class="actions">${buildActionCell(user)}</div></td>
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
    const query = $("#userQuery").value.trim().toLowerCase();
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
    $("#userCountLabel").textContent = `${filtered.length} người dùng`;
  };

  const closeModal = () => {
    const modal = $("#userModal");
    if (!modal) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("account-modal-open");
    selectedUser = null;
    setModalStatus("");
  };

  const updateStatusBlock = () => {
    const statusChip = $("#userStatusChip");
    const toggleButton = $("#toggleUserStatusBtn");
    const statusNote = $("#userStatusNote");
    const selfGuardNote = $("#userSelfGuardNote");
    const readOnlyNote = $("#userReadOnlyNote");
    const roleInput = $("#userRoleInput");
    const selfEditing = isEditingSelf();
    const adminViewer = isAdminViewer();
    const statusMeta = getStatusMeta(draftStatus);

    if (statusChip) {
      statusChip.className = `chip ${statusMeta.className}`;
      statusChip.textContent = statusMeta.label;
    }

    if (toggleButton) {
      toggleButton.textContent =
        draftStatus === "active" ? "Khóa tài khoản" : "Mở khóa tài khoản";
      toggleButton.className =
        draftStatus === "active" ? "btn danger" : "btn ghost";
      toggleButton.disabled = !adminViewer || selfEditing;
    }

    if (statusNote) {
      statusNote.textContent =
        draftStatus === "active"
          ? "Tài khoản đang hoạt động bình thường trên hệ thống."
          : "Tài khoản bị khóa sẽ không thể đăng nhập hoặc tiếp tục dùng phiên đã mở.";
    }

    if (selfGuardNote) {
      selfGuardNote.style.display = selfEditing ? "block" : "none";
      selfGuardNote.textContent = selfEditing
        ? "Không thể tự hạ quyền hoặc tự khóa chính tài khoản đang đăng nhập."
        : "";
    }

    if (readOnlyNote) {
      readOnlyNote.style.display = adminViewer ? "none" : "block";
      readOnlyNote.textContent = adminViewer
        ? ""
        : "Tài khoản staff chỉ xem được thông tin. Không thể lưu thay đổi quyền hoặc trạng thái.";
    }

    if (roleInput) {
      roleInput.disabled = !adminViewer || selfEditing;
      refreshRoleSelect();
    }

    setUserSaving(false);
  };

  const fillForm = (user) => {
    $("#userIdField").value = user.id || "";
    $("#userNameField").value = user.full_name || "";
    $("#userEmailField").value = user.email || "";
    $("#userPhoneField").value = user.phone || "";
    $("#userBirthDateField").value = formatDate(user.birth_date);
    $("#userCreatedAtField").value = Admin.formatDateTime(user.created_at);
    $("#userUpdatedAtField").value = Admin.formatDateTime(user.updated_at);
    $("#userRoleInput").value = String(user.role || "customer").toLowerCase();
    draftStatus = normalizeStatus(user.status);
    refreshRoleSelect();
    updateStatusBlock();
  };

  const openModal = async (userId) => {
    const modal = $("#userModal");
    if (!modal) return;

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("account-modal-open");
    setModalStatus("Đang tải thông tin người dùng...");

    try {
      const payload = await Admin.apiFetch(`/admin/users/${encodeURIComponent(userId)}`);
      selectedUser = payload.user || null;

      if (!selectedUser?.id) {
        throw new Error("Không tải được thông tin người dùng.");
      }

      fillForm(selectedUser);
      setModalStatus("");
      $("#userRoleInput")?.focus();
    } catch (error) {
      setModalStatus(error.message, "error");
    }
  };

  const loadCurrentUser = async () => {
    const payload = await Admin.apiFetch("/auth/me");
    currentUser = payload.user || null;
    renderPermissionNote();
  };

  const loadUsers = async () => {
    const payload = await Admin.apiFetch("/admin/users");
    users = Array.isArray(payload.users) ? payload.users : [];
    renderStats();
    applyFilter();
  };

  const saveUser = async (event) => {
    event.preventDefault();

    if (!selectedUser?.id || !isAdminViewer()) {
      return;
    }

    const role = $("#userRoleInput").value || "customer";

    try {
      setModalStatus("");
      setUserSaving(true);
      const payload = await Admin.apiFetch(
        `/admin/users/${encodeURIComponent(selectedUser.id)}`,
        {
          method: "PATCH",
          body: {
            role,
            status: draftStatus,
          },
        }
      );

      selectedUser = payload.user || selectedUser;
      closeModal();
      await loadUsers();
      Admin.setStatus("Đã cập nhật role và trạng thái tài khoản.");
    } catch (error) {
      setModalStatus(error.message, "error");
    } finally {
      setUserSaving(false);
    }
  };

  const bindToolbar = () => {
    $("#applyUserFilter")?.addEventListener("click", applyFilter);
    $("#reloadUsers")?.addEventListener("click", async () => {
      try {
        await loadUsers();
        Admin.setStatus("Đã tải lại danh sách người dùng.");
      } catch (error) {
        Admin.setStatus(error.message, "error");
      }
    });
    $("#clearUserFilter")?.addEventListener("click", () => {
      $("#userQuery").value = "";
      applyFilter();
    });
    $("#userQuery")?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applyFilter();
      }
    });
  };

  const bindActions = () => {
    $("#usersTable")?.addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action='edit-user']");
      if (!button) return;
      await openModal(button.dataset.id || "");
    });

    $("#closeUserModal")?.addEventListener("click", closeModal);
    $("[data-close-user-modal]")?.addEventListener("click", closeModal);
    $("#toggleUserStatusBtn")?.addEventListener("click", () => {
      if (!isAdminViewer() || isEditingSelf()) return;
      draftStatus = draftStatus === "active" ? "locked" : "active";
      updateStatusBlock();
    });
    $("#userForm")?.addEventListener("submit", saveUser);
  };

  const init = async () => {
    Admin.initShell("users");
    bindToolbar();
    bindActions();
    if (!Admin.hasToken()) {
      Admin.setStatus("Bạn chưa đăng nhập admin. Hãy mở trang đăng nhập quản trị để quản lý người dùng.");
      return;
    }

    try {
      await loadCurrentUser();
      await loadUsers();
      Admin.setStatus(
        isAdminViewer()
          ? "Đã tải danh sách người dùng."
          : "Đã tải danh sách người dùng. Tài khoản staff chỉ có quyền xem."
      );
    } catch (error) {
      Admin.setStatus(error.message, "error");
    }
  };

  return { init };
})();

AdminUsersPage.init();
