(() => {
  const storageKeys = {
    base: "bambi_admin_base",
    token: "bambi_admin_token",
    refresh: "bambi_admin_refresh",
  };

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

  const hasToken = () => Boolean(readSettings().token);

  const apiFetch = async (path, options = {}) => {
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

  const initShell = (pageKey) => {
    bindSettings();
    $$('[data-page]').forEach((link) => {
      link.classList.toggle("active", link.dataset.page === pageKey);
    });
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
