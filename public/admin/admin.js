(() => {
  const storageKeys = {
    base: "bambi_admin_base",
    token: "bambi_admin_token",
    refresh: "bambi_admin_refresh",
  };

  const accountState = {
    user: null,
    loadingPromise: null,
  };

  let refreshPromise = null;
  let redirectingToLogin = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("vi-VN");
  };

  const formatCurrency = (value) => {
    const amount = Number(value);
    if (Number.isNaN(amount)) return escapeHtml(value ?? 0);
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const setStatus = (message, type = "info") => {
    const statusEl = $("#status");
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

  const setInlineStatus = (target, message, type = "info") => {
    const statusEl = typeof target === "string" ? $(target) : target;
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

  const readSettings = () => {
    const baseFromStorage = localStorage.getItem(storageKeys.base) || window.location.origin;
    const tokenFromStorage = localStorage.getItem(storageKeys.token) || "";
    const baseInput = $("#baseUrl");
    const tokenInput = $("#token");

    const base = (baseInput?.value.trim() || baseFromStorage).replace(/\/$/, "");
    const token = tokenInput?.value.trim() || tokenFromStorage;

    return { base, token };
  };

  const persistSettings = () => {
    const { base, token } = readSettings();
    localStorage.setItem(storageKeys.base, base);
    localStorage.setItem(storageKeys.token, token);
    return { base, token };
  };

  const clearSettings = () => {
    localStorage.removeItem(storageKeys.base);
    localStorage.removeItem(storageKeys.token);
    localStorage.removeItem(storageKeys.refresh);
    const baseInput = $("#baseUrl");
    const tokenInput = $("#token");
    if (baseInput) baseInput.value = window.location.origin;
    if (tokenInput) tokenInput.value = "";
  };

  const getLoginRedirect = () => {
    const next = `${window.location.pathname}${window.location.search}`;
    return `/ui/admin/login.html?next=${encodeURIComponent(next)}`;
  };

  const redirectToLogin = () => {
    if (redirectingToLogin) return;
    redirectingToLogin = true;
    window.location.href = getLoginRedirect();
  };

  const refreshSession = async () => {
    if (refreshPromise) {
      return refreshPromise;
    }

    const base = localStorage.getItem(storageKeys.base) || window.location.origin;
    const refreshToken = localStorage.getItem(storageKeys.refresh) || "";

    if (!refreshToken) {
      throw new Error("Không có refresh token.");
    }

    refreshPromise = (async () => {
      const response = await fetch(`${base}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const text = await response.text();
      let payload;

      try {
        payload = text ? JSON.parse(text) : {};
      } catch (_error) {
        payload = { message: text };
      }

      if (!response.ok || !payload.token || !payload.refresh_token) {
        throw new Error(payload.message || "Không thể làm mới phiên đăng nhập.");
      }

      localStorage.setItem(storageKeys.base, base);
      localStorage.setItem(storageKeys.token, payload.token);
      localStorage.setItem(storageKeys.refresh, payload.refresh_token);

      const tokenInput = $("#token");
      if (tokenInput) {
        tokenInput.value = payload.token;
      }

      return { base, token: payload.token };
    })();

    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  };

  const hasToken = () => Boolean(readSettings().token);

  const apiFetch = async (path, options = {}, retryOn401 = true) => {
    const { base, token } = readSettings();
    const headers = { ...(options.headers || {}) };
    let body = options.body;

    if (body && !(body instanceof FormData) && typeof body !== "string") {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
      body = JSON.stringify(body);
    }

    if (body && typeof body === "string" && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(base + path, {
      ...options,
      headers,
      body,
    });

    const text = await response.text();
    let payload;

    try {
      payload = text ? JSON.parse(text) : {};
    } catch (_error) {
      payload = { message: text };
    }

    if (response.status === 401 && retryOn401 && token) {
      try {
        const refreshed = await refreshSession();
        return apiFetch(
          path,
          {
            ...options,
            headers: {
              ...(options.headers || {}),
              Authorization: `Bearer ${refreshed.token}`,
            },
          },
          false
        );
      } catch (_error) {
        clearSettings();
        setStatus("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.", "error");
        redirectToLogin();
        throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }
    }

    if (!response.ok) {
      throw new Error(payload.message || "Không thể tải dữ liệu.");
    }

    return payload;
  };

  const bindSettings = () => {
    if (document.body.dataset.adminSettingsBound === "true") return;
    document.body.dataset.adminSettingsBound = "true";

    const baseInput = $("#baseUrl");
    const tokenInput = $("#token");
    if (baseInput) baseInput.value = localStorage.getItem(storageKeys.base) || window.location.origin;
    if (tokenInput) tokenInput.value = localStorage.getItem(storageKeys.token) || "";

    $("#saveSettings")?.addEventListener("click", () => {
      persistSettings();
      setStatus("Đã lưu cấu hình kết nối quản trị.");
    });

    $("#clearSettings")?.addEventListener("click", () => {
      clearSettings();
      setStatus("Đã xoá cấu hình kết nối.");
    });

    $("#logoutAdmin")?.addEventListener("click", () => {
      clearSettings();
      window.location.href = "/ui/admin/login.html";
    });
  };

  const ensureVoucherNavLink = () => {
    $$(".admin-nav").forEach((nav) => {
      if (!nav || nav.querySelector('[data-page="vouchers"]')) return;

      const link = document.createElement("a");
      link.className = "admin-nav-link";
      link.href = "/ui/admin/vouchers.html";
      link.dataset.page = "vouchers";
      link.innerHTML = `
        <span class="admin-nav-icon">MG</span>
        <span class="admin-nav-copy">
          <strong>Quản lý mã giảm giá</strong>
          <span>Voucher toàn sàn</span>
        </span>
      `;

      const productsLink = nav.querySelector('[data-page="products"]');
      if (productsLink?.nextSibling) {
        nav.insertBefore(link, productsLink.nextSibling);
        return;
      }

      nav.appendChild(link);
    });
  };

  const formatBirthInputValue = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const getAccountDisplayName = (user) =>
    user?.full_name?.trim() || user?.email || "Tài khoản quản trị";

  const getAccountInitial = (user) =>
    getAccountDisplayName(user).trim().charAt(0).toUpperCase() || "A";

  const getRoleMeta = (role) => {
    const normalized = String(role || "").trim().toLowerCase();
    if (normalized === "admin") {
      return { label: "Admin", className: "orange" };
    }
    if (normalized === "staff") {
      return { label: "Staff", className: "blue" };
    }
    return { label: "Customer", className: "gray" };
  };

  const getStatusMeta = (status) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "active") {
      return { label: "Hoạt động", className: "green" };
    }
    if (normalized === "locked") {
      return { label: "Bị khóa", className: "gray" };
    }
    return { label: "Ngưng hoạt động", className: "gray" };
  };

  const setGenderValue = (value) => {
    $$('input[name="adminAccountGender"]').forEach((input) => {
      input.checked = input.value === value;
    });
  };

  const getGenderValue = () =>
    $('input[name="adminAccountGender"]:checked')?.value || null;

  const ensureAccountSection = () => {
    const sidebar = $(".admin-sidebar");
    if (!sidebar) return;

    if (!$("#adminAccountSection")) {
      const section = document.createElement("section");
      section.className = "admin-sidebar-section admin-account-section";
      section.id = "adminAccountSection";
      section.innerHTML = `
        <p class="admin-account-label">Tài khoản</p>
        <article class="admin-account-summary-card">
          <div class="admin-account-summary-head">
            <div class="admin-account-avatar" data-admin-account-avatar>
              <span class="admin-account-avatar-fallback" data-admin-account-avatar-fallback>A</span>
              <img class="admin-account-avatar-image" data-admin-account-avatar-image alt="Ảnh đại diện quản trị" />
            </div>
            <div class="admin-account-copy">
              <strong data-admin-account-name>Tài khoản quản trị</strong>
              <span data-admin-account-email>Đang tải...</span>
            </div>
          </div>
          <div class="admin-account-chip-row">
            <span class="chip orange" data-admin-account-role>Admin</span>
            <span class="chip green" data-admin-account-status>Hoạt động</span>
          </div>
          <button class="btn ghost admin-account-open-btn" id="openAdminAccountModal" type="button">
            Cập nhật
          </button>
        </article>
      `;

      const sidebarFoot = $(".admin-sidebar-foot", sidebar);
      if (sidebarFoot) {
        sidebar.insertBefore(section, sidebarFoot);
      } else {
        sidebar.appendChild(section);
      }
    }

    if (!$("#adminAccountModal")) {
      document.body.insertAdjacentHTML(
        "beforeend",
        `
          <div class="admin-modal admin-account-modal" id="adminAccountModal" hidden aria-hidden="true">
            <button
              class="admin-modal-backdrop"
              type="button"
              data-admin-account-close
              aria-label="Đóng cập nhật tài khoản"
            ></button>
            <div
              class="admin-modal-dialog admin-account-modal-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="adminAccountModalTitle"
            >
              <div class="admin-section-head">
                <div>
                  <div class="kicker">Tài khoản</div>
                  <h2 id="adminAccountModalTitle">Cập nhật tài khoản quản trị</h2>
                  <p>Chỉnh ảnh đại diện, họ tên, ngày sinh, giới tính và đổi mật khẩu.</p>
                </div>
                <button class="btn ghost" id="closeAdminAccountModal" type="button">Đóng</button>
              </div>

              <div class="admin-account-modal-grid">
                <section class="admin-account-panel-card">
                  <div class="admin-account-hero">
                    <div class="admin-account-avatar is-large" data-admin-account-avatar>
                      <span class="admin-account-avatar-fallback" data-admin-account-avatar-fallback>A</span>
                      <img class="admin-account-avatar-image" data-admin-account-avatar-image alt="Ảnh đại diện quản trị" />
                    </div>
                    <div class="admin-account-hero-text">
                      <strong data-admin-account-name>Tài khoản quản trị</strong>
                      <p data-admin-account-email>Đang tải...</p>
                    </div>
                  </div>

                  <input id="adminAccountAvatarInput" type="file" accept="image/jpeg,image/png,image/jpg" hidden />
                  <button class="btn ghost" id="adminAccountAvatarButton" type="button">
                    Cập nhật ảnh
                  </button>
                  <p class="note">Dung lượng tối đa 1 MB. Định dạng hỗ trợ: JPG, PNG.</p>
                  <div id="adminAccountAvatarStatus" class="status" style="display: none"></div>

                  <div class="admin-account-meta-grid">
                    <div class="field">
                      <label>Email đăng nhập</label>
                      <input id="adminAccountEmailInput" class="input admin-account-readonly" readonly />
                    </div>
                    <div class="admin-account-chip-row">
                      <span class="chip orange" data-admin-account-role>Admin</span>
                      <span class="chip green" data-admin-account-status>Hoạt động</span>
                    </div>
                  </div>
                </section>

                <section class="admin-account-panel-card">
                  <form id="adminAccountProfileForm" class="admin-account-form">
                    <div class="field">
                      <label>Họ tên</label>
                      <input id="adminAccountNameInput" class="input" placeholder="Nhập họ tên" />
                    </div>
                    <div class="field">
                      <label>Ngày sinh</label>
                      <input id="adminAccountBirthInput" class="input" type="date" />
                    </div>
                    <div class="field">
                      <label>Giới tính</label>
                      <div class="admin-account-radio-group">
                        <label class="admin-account-radio">
                          <input type="radio" name="adminAccountGender" value="male" />
                          <span>Nam</span>
                        </label>
                        <label class="admin-account-radio">
                          <input type="radio" name="adminAccountGender" value="female" />
                          <span>Nữ</span>
                        </label>
                        <label class="admin-account-radio">
                          <input type="radio" name="adminAccountGender" value="other" />
                          <span>Khác</span>
                        </label>
                      </div>
                    </div>
                    <div class="stack-actions">
                      <button class="btn" id="saveAdminAccountProfile" type="submit">Lưu thông tin</button>
                    </div>
                    <div id="adminAccountProfileStatus" class="status" style="display: none"></div>
                  </form>
                </section>
              </div>

              <div class="divider"></div>

              <section class="admin-account-password-card">
                <div>
                  <h3>Đổi mật khẩu</h3>
                  <p class="muted">Nhập mật khẩu hiện tại trước khi đặt mật khẩu mới cho tài khoản quản trị.</p>
                </div>
                <form id="adminAccountPasswordForm" class="admin-account-password-form">
                  <div class="admin-account-password-grid">
                    <div class="field">
                      <label>Mật khẩu hiện tại</label>
                      <input
                        id="adminCurrentPassword"
                        class="input"
                        type="password"
                        autocomplete="current-password"
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                    </div>
                    <div class="field">
                      <label>Mật khẩu mới</label>
                      <input
                        id="adminNewPassword"
                        class="input"
                        type="password"
                        autocomplete="new-password"
                        placeholder="Nhập mật khẩu mới"
                      />
                    </div>
                    <div class="field">
                      <label>Xác nhận mật khẩu mới</label>
                      <input
                        id="adminConfirmPassword"
                        class="input"
                        type="password"
                        autocomplete="new-password"
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </div>
                  </div>
                  <div class="stack-actions">
                    <button class="btn" id="saveAdminAccountPassword" type="submit">Cập nhật mật khẩu</button>
                  </div>
                  <div id="adminAccountPasswordStatus" class="status" style="display: none"></div>
                </form>
              </section>
            </div>
          </div>
        `
      );
    }
  };

  const renderAccountUser = (user) => {
    if (!user) return;

    accountState.user = user;

    const displayName = getAccountDisplayName(user);
    const email = user.email || "-";
    const roleMeta = getRoleMeta(user.role);
    const statusMeta = getStatusMeta(user.status);
    const avatarUrl = user.avatar_url || "";
    const initial = getAccountInitial(user);

    $$("[data-admin-account-name]").forEach((element) => {
      element.textContent = displayName;
    });

    $$("[data-admin-account-email]").forEach((element) => {
      element.textContent = email;
    });

    $$("[data-admin-account-role]").forEach((element) => {
      element.className = `chip ${roleMeta.className}`;
      element.textContent = roleMeta.label;
    });

    $$("[data-admin-account-status]").forEach((element) => {
      element.className = `chip ${statusMeta.className}`;
      element.textContent = statusMeta.label;
    });

    $$("[data-admin-account-avatar]").forEach((container) => {
      const image = $("[data-admin-account-avatar-image]", container);
      const fallback = $("[data-admin-account-avatar-fallback]", container);

      if (image) {
        image.src = avatarUrl;
        image.style.display = avatarUrl ? "block" : "none";
      }

      if (fallback) {
        fallback.textContent = initial;
        fallback.style.display = avatarUrl ? "none" : "grid";
      }
    });

    if ($("#adminAccountNameInput")) {
      $("#adminAccountNameInput").value = user.full_name || "";
    }
    if ($("#adminAccountEmailInput")) {
      $("#adminAccountEmailInput").value = email;
    }
    if ($("#adminAccountBirthInput")) {
      $("#adminAccountBirthInput").value = formatBirthInputValue(user.birth_date);
    }

    setGenderValue(user.gender || null);
  };

  const loadAccountUser = async (force = false) => {
    if (!force && accountState.user) {
      return accountState.user;
    }

    if (accountState.loadingPromise) {
      return accountState.loadingPromise;
    }

    accountState.loadingPromise = (async () => {
      const payload = await apiFetch("/auth/me");
      if (!payload?.user) {
        throw new Error("Không tải được thông tin tài khoản quản trị.");
      }
      renderAccountUser(payload.user);
      return payload.user;
    })();

    try {
      return await accountState.loadingPromise;
    } finally {
      accountState.loadingPromise = null;
    }
  };

  const clearPasswordForm = () => {
    if ($("#adminCurrentPassword")) $("#adminCurrentPassword").value = "";
    if ($("#adminNewPassword")) $("#adminNewPassword").value = "";
    if ($("#adminConfirmPassword")) $("#adminConfirmPassword").value = "";
  };

  const setProfileSaving = (saving) => {
    const button = $("#saveAdminAccountProfile");
    if (!button) return;
    button.disabled = Boolean(saving);
    button.textContent = saving ? "Đang lưu..." : "Lưu thông tin";
  };

  const setPasswordSaving = (saving) => {
    const button = $("#saveAdminAccountPassword");
    if (!button) return;
    button.disabled = Boolean(saving);
    button.textContent = saving ? "Đang cập nhật..." : "Cập nhật mật khẩu";
  };

  const setAvatarSaving = (saving) => {
    const button = $("#adminAccountAvatarButton");
    if (!button) return;
    button.disabled = Boolean(saving);
    button.textContent = saving ? "Đang tải ảnh..." : "Cập nhật ảnh";
  };

  const openAccountModal = async () => {
    ensureAccountSection();

    const modal = $("#adminAccountModal");
    if (!modal) return;

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("admin-modal-open");
    clearPasswordForm();
    setInlineStatus("#adminAccountProfileStatus", "");
    setInlineStatus("#adminAccountPasswordStatus", "");
    setInlineStatus("#adminAccountAvatarStatus", "");

    try {
      await loadAccountUser(true);
    } catch (error) {
      setInlineStatus("#adminAccountProfileStatus", error.message, "error");
    }
  };

  const closeAccountModal = () => {
    const modal = $("#adminAccountModal");
    if (!modal) return;

    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("admin-modal-open");
    setInlineStatus("#adminAccountProfileStatus", "");
    setInlineStatus("#adminAccountPasswordStatus", "");
    setInlineStatus("#adminAccountAvatarStatus", "");
    clearPasswordForm();
  };

  const saveAccountProfile = async (event) => {
    event.preventDefault();
    setInlineStatus("#adminAccountProfileStatus", "");

    try {
      setProfileSaving(true);

      const payload = await apiFetch("/auth/me", {
        method: "PATCH",
        body: {
          full_name: $("#adminAccountNameInput")?.value.trim() || null,
          gender: getGenderValue(),
          birth_date: $("#adminAccountBirthInput")?.value || null,
        },
      });

      renderAccountUser(payload.user || accountState.user);
      setInlineStatus("#adminAccountProfileStatus", "Đã cập nhật thông tin tài khoản.");
      setStatus("Đã cập nhật thông tin tài khoản quản trị.");
    } catch (error) {
      setInlineStatus("#adminAccountProfileStatus", error.message, "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const saveAccountPassword = async (event) => {
    event.preventDefault();
    setInlineStatus("#adminAccountPasswordStatus", "");

    const currentPassword = $("#adminCurrentPassword")?.value || "";
    const newPassword = $("#adminNewPassword")?.value || "";
    const confirmPassword = $("#adminConfirmPassword")?.value || "";

    if (!currentPassword || !newPassword || !confirmPassword) {
      setInlineStatus(
        "#adminAccountPasswordStatus",
        "Vui lòng nhập đầy đủ mật khẩu hiện tại, mật khẩu mới và xác nhận mật khẩu mới.",
        "error"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setInlineStatus(
        "#adminAccountPasswordStatus",
        "Xác nhận mật khẩu mới không khớp.",
        "error"
      );
      return;
    }

    if (newPassword.length < 6) {
      setInlineStatus(
        "#adminAccountPasswordStatus",
        "Mật khẩu mới phải có ít nhất 6 ký tự.",
        "error"
      );
      return;
    }

    try {
      setPasswordSaving(true);

      const payload = await apiFetch("/auth/me/password", {
        method: "PATCH",
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
      });

      localStorage.removeItem(storageKeys.refresh);
      clearPasswordForm();
      setInlineStatus(
        "#adminAccountPasswordStatus",
        payload?.message || "Đã cập nhật mật khẩu. Nếu được yêu cầu, hãy đăng nhập lại."
      );
      setStatus("Đã cập nhật mật khẩu tài khoản quản trị.");
    } catch (error) {
      setInlineStatus("#adminAccountPasswordStatus", error.message, "error");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleAvatarSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setInlineStatus("#adminAccountAvatarStatus", "Vui lòng chọn ảnh hợp lệ.", "error");
      event.target.value = "";
      return;
    }

    if (file.size > 1024 * 1024) {
      setInlineStatus("#adminAccountAvatarStatus", "Ảnh vượt quá 1 MB.", "error");
      event.target.value = "";
      return;
    }

    try {
      setAvatarSaving(true);
      setInlineStatus("#adminAccountAvatarStatus", "Đang tải ảnh lên...");

      const formData = new FormData();
      formData.append("avatar", file);

      const payload = await apiFetch("/auth/me/avatar", {
        method: "POST",
        body: formData,
      });

      renderAccountUser(payload.user || accountState.user);
      setInlineStatus("#adminAccountAvatarStatus", "Đã cập nhật ảnh đại diện.");
      setStatus("Đã cập nhật ảnh đại diện quản trị.");
    } catch (error) {
      setInlineStatus("#adminAccountAvatarStatus", error.message, "error");
    } finally {
      setAvatarSaving(false);
      event.target.value = "";
    }
  };

  const bindAccountUi = () => {
    ensureAccountSection();
    if (document.body.dataset.adminAccountBound === "true") return;
    document.body.dataset.adminAccountBound = "true";

    $("#openAdminAccountModal")?.addEventListener("click", () => {
      void openAccountModal();
    });
    $("#closeAdminAccountModal")?.addEventListener("click", closeAccountModal);
    $("[data-admin-account-close]")?.addEventListener("click", closeAccountModal);
    $("#adminAccountProfileForm")?.addEventListener("submit", saveAccountProfile);
    $("#adminAccountPasswordForm")?.addEventListener("submit", saveAccountPassword);
    $("#adminAccountAvatarButton")?.addEventListener("click", () => {
      $("#adminAccountAvatarInput")?.click();
    });
    $("#adminAccountAvatarInput")?.addEventListener("change", handleAvatarSelected);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !$("#adminAccountModal")?.hidden) {
        closeAccountModal();
      }
    });
  };

  const bootAccountUi = () => {
    if (!hasToken()) return;
    ensureAccountSection();
    bindAccountUi();
    void loadAccountUser().catch((error) => {
      setStatus(error.message, "error");
    });
  };

  const initShell = (pageKey) => {
    bindSettings();
    ensureVoucherNavLink();
    if (!hasToken()) {
      redirectToLogin();
      return;
    }

    $$("[data-page]").forEach((link) => {
      link.classList.toggle("active", link.dataset.page === pageKey);
    });

    bootAccountUi();
  };

  window.BambiAdmin = {
    $,
    $$,
    escapeHtml,
    formatDateTime,
    formatCurrency,
    setStatus,
    readSettings,
    persistSettings,
    clearSettings,
    hasToken,
    apiFetch,
    initShell,
  };
})();
