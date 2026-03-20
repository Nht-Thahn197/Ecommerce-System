const authButtons = document.querySelector("#authButtons");
const userMenu = document.querySelector("#userMenu");
const userName = document.querySelector("#userName");
const logoutBtn = document.querySelector("#logoutBtn");
const avatarImg = document.querySelector(".user-avatar .avatar-img");
const avatarInitial = document.querySelector(".user-avatar .avatar-initial");
const cartCountBadges = Array.from(document.querySelectorAll("[data-cart-count]"));
const sellerChannelLinks = Array.from(
  document.querySelectorAll('a[href="/ui/shop-register.html"]')
);
const searchWrap = document.querySelector(".search-wrap");
const searchInput = searchWrap?.querySelector("input");
const searchButton = searchWrap?.querySelector("button");
const notificationMenu = document.querySelector("[data-topbar-notification]");
const notificationTrigger = notificationMenu?.querySelector(
  "[data-topbar-notification-trigger]"
);
const notificationBadge = notificationMenu?.querySelector(
  "[data-topbar-notification-badge]"
);
const notificationStatus = notificationMenu?.querySelector(
  "[data-topbar-notification-status]"
);
const notificationList = notificationMenu?.querySelector(
  "[data-topbar-notification-list]"
);

const customerStorageKeys = {
  userBase: "bambi_user_base",
  userToken: "bambi_user_token",
  userRefresh: "bambi_user_refresh",
  sellerBase: "bambi_seller_base",
  sellerToken: "bambi_seller_token",
  sellerRefresh: "bambi_seller_refresh",
};

const TOPBAR_NOTIFICATION_URL = "/ui/account.html#notifications";
const TOPBAR_NOTIFICATION_LIMIT = 5;
const TOPBAR_NOTIFICATION_STALE_MS = 30_000;
const STORE_SEARCH_RESULTS_URL = "/ui/category.html";

const getLoginRedirect = ({ preserveNext = true } = {}) => {
  if (!preserveNext) {
    return "/ui/login.html";
  }

  const next = `${window.location.pathname}${window.location.search}`;
  return `/ui/login.html?next=${encodeURIComponent(next)}`;
};

const SELLER_CHANNEL_FALLBACK = "/ui/shop-register.html";
const SELLER_CHANNEL_TARGET = "/ui/seller/";

const getSessionCandidates = () => [
  {
    source: "user",
    base:
      localStorage.getItem(customerStorageKeys.userBase) || window.location.origin,
    token: localStorage.getItem(customerStorageKeys.userToken) || "",
    refresh: localStorage.getItem(customerStorageKeys.userRefresh) || "",
  },
  {
    source: "seller",
    base:
      localStorage.getItem(customerStorageKeys.sellerBase) ||
      localStorage.getItem(customerStorageKeys.userBase) ||
      window.location.origin,
    token: localStorage.getItem(customerStorageKeys.sellerToken) || "",
    refresh:
      localStorage.getItem(customerStorageKeys.sellerRefresh) ||
      localStorage.getItem(customerStorageKeys.userRefresh) ||
      "",
  },
];

const getActiveSession = () =>
  getSessionCandidates().find((session) => session.token) || {
    source: "user",
    base: window.location.origin,
    token: "",
    refresh: "",
  };

const getToken = () => getActiveSession().token;

const escapeTopbarHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatTopbarNotificationDateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(",", "");
};

const getSearchResultsHref = (query) => {
  const params = new URLSearchParams();
  params.set("q", query);
  return `${STORE_SEARCH_RESULTS_URL}?${params.toString()}`;
};

const setAvatar = (name, url) => {
  if (avatarImg) {
    avatarImg.src = url || "";
    avatarImg.style.display = url ? "block" : "none";
  }

  if (avatarInitial) {
    const initial = name?.trim()?.[0]?.toUpperCase() || "U";
    avatarInitial.textContent = initial;
    avatarInitial.style.display = url ? "none" : "grid";
  }
};

const showUser = (name, avatarUrl) => {
  if (!authButtons || !userMenu) return;
  authButtons.classList.add("hidden");
  userMenu.style.display = "inline-flex";
  if (userName && name) userName.textContent = name;
  setAvatar(name, avatarUrl);
};

const hideUser = () => {
  resetTopbarNotifications({ authenticated: false });
  if (!authButtons || !userMenu) return;
  authButtons.classList.remove("hidden");
  userMenu.style.display = "none";
};

const clearAuth = () => {
  localStorage.removeItem(customerStorageKeys.userToken);
  localStorage.removeItem(customerStorageKeys.userRefresh);
  localStorage.removeItem(customerStorageKeys.userBase);
  localStorage.removeItem(customerStorageKeys.sellerToken);
  localStorage.removeItem(customerStorageKeys.sellerRefresh);
  localStorage.removeItem(customerStorageKeys.sellerBase);
  sellerChannelPromise = null;
  cartCountPromise = null;
  setCartCount(0, false);
  resetTopbarNotifications({ authenticated: false });
};

const saveSession = (source, token, refreshToken) => {
  const isSeller = source === "seller";
  const baseKey = isSeller
    ? customerStorageKeys.sellerBase
    : customerStorageKeys.userBase;
  const tokenKey = isSeller
    ? customerStorageKeys.sellerToken
    : customerStorageKeys.userToken;
  const refreshKey = isSeller
    ? customerStorageKeys.sellerRefresh
    : customerStorageKeys.userRefresh;

  localStorage.setItem(baseKey, window.location.origin);
  localStorage.setItem(tokenKey, token);
  localStorage.setItem(refreshKey, refreshToken);
};

const parseResponsePayload = async (response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (_error) {
    return { message: text };
  }
};

let refreshPromise = null;
let sellerChannelPromise = null;
let cartCountPromise = null;
let topbarNotificationPromise = null;
let topbarNotificationLoaded = false;
let topbarNotificationFetchedAt = 0;
let topbarNotificationState = {
  items: [],
  unreadCount: 0,
};

const setCartCount = (count, authenticated = true) => {
  const total = Math.max(0, Number(count) || 0);
  const label = total > 99 ? "99+" : String(total);

  cartCountBadges.forEach((badge) => {
    badge.textContent = label;
    badge.hidden = !authenticated;
    badge.setAttribute("aria-label", `${total} sản phẩm trong giỏ hàng`);
  });
};

const setTopbarNotificationExpanded = (expanded) => {
  if (!notificationMenu || !notificationTrigger) return;

  notificationMenu.classList.toggle("is-open", expanded);
  notificationTrigger.setAttribute("aria-expanded", expanded ? "true" : "false");
};

const setTopbarNotificationStatus = (message, { error = false } = {}) => {
  if (!notificationStatus) return;

  notificationStatus.hidden = !message;
  notificationStatus.textContent = message || "";
  notificationStatus.classList.toggle("is-error", Boolean(message && error));
};

const renderTopbarNotificationBadge = (
  count,
  authenticated = Boolean(getToken())
) => {
  if (!notificationBadge) return;

  const total = Math.max(0, Number(count) || 0);
  notificationBadge.hidden = !authenticated || total === 0;
  notificationBadge.textContent = total > 99 ? "99+" : String(total);

  if (authenticated) {
    notificationBadge.setAttribute("aria-label", `${total} thông báo chưa đọc`);
  } else {
    notificationBadge.removeAttribute("aria-label");
  }
};

const renderTopbarNotificationPlaceholder = (message) => {
  if (!notificationList) return;

  notificationList.innerHTML = `<div class="topbar-notification-placeholder">${escapeTopbarHtml(message)}</div>`;
};

const renderTopbarNotifications = ({ authenticated = Boolean(getToken()) } = {}) => {
  if (!notificationList) return;

  setTopbarNotificationStatus("");
  renderTopbarNotificationBadge(topbarNotificationState.unreadCount, authenticated);

  if (!authenticated) {
    renderTopbarNotificationPlaceholder("Đăng nhập để xem thông báo mới.");
    return;
  }

  if (!topbarNotificationState.items.length) {
    renderTopbarNotificationPlaceholder("Bạn chưa có thông báo mới.");
    return;
  }

  notificationList.innerHTML = topbarNotificationState.items
    .map((notification) => {
      const title = escapeTopbarHtml(notification?.title || "Thông báo đơn hàng");
      const message = escapeTopbarHtml(notification?.message || "");
      const createdAt = escapeTopbarHtml(
        formatTopbarNotificationDateTime(notification?.created_at) || "Mới đây"
      );
      const imageMarkup = notification?.image_url
        ? `<img src="${escapeTopbarHtml(notification.image_url)}" alt="${title}" loading="lazy" />`
        : '<span class="topbar-notification-thumb-fallback" aria-hidden="true">🔔</span>';

      return `<a class="topbar-notification-item ${notification?.is_read ? "" : "is-unread"}" href="${TOPBAR_NOTIFICATION_URL}"><div class="topbar-notification-thumb">${imageMarkup}</div><div class="topbar-notification-content"><div class="topbar-notification-title-row"><strong class="topbar-notification-title">${title}</strong>${notification?.is_read ? "" : '<span class="topbar-notification-dot" aria-label="Chưa đọc"></span>'}</div><p class="topbar-notification-copy">${message}</p><div class="topbar-notification-meta">${createdAt}</div></div></a>`;
    })
    .join("");
};

const resetTopbarNotifications = ({
  authenticated = Boolean(getToken()),
} = {}) => {
  topbarNotificationLoaded = false;
  topbarNotificationFetchedAt = 0;
  topbarNotificationState = { items: [], unreadCount: 0 };
  topbarNotificationPromise = null;

  setTopbarNotificationExpanded(false);
  setTopbarNotificationStatus("");
  renderTopbarNotificationBadge(0, authenticated);
  renderTopbarNotificationPlaceholder(
    authenticated
      ? "Di chuột để xem thông báo mới."
      : "Đăng nhập để xem thông báo mới."
  );
};

const loadTopbarNotifications = async ({ force = false } = {}) => {
  if (!notificationMenu || !notificationList) return null;

  if (!getToken()) {
    resetTopbarNotifications({ authenticated: false });
    return null;
  }

  const isStale =
    !topbarNotificationFetchedAt ||
    Date.now() - topbarNotificationFetchedAt > TOPBAR_NOTIFICATION_STALE_MS;

  if (!force && topbarNotificationLoaded && !isStale) {
    return topbarNotificationState;
  }

  if (topbarNotificationPromise) {
    return topbarNotificationPromise;
  }

  setTopbarNotificationStatus("");
  renderTopbarNotificationPlaceholder("Đang tải thông báo...");

  topbarNotificationPromise = (async () => {
    try {
      const response = await apiFetch(
        `/notifications?limit=${TOPBAR_NOTIFICATION_LIMIT}`,
        {},
        { redirectOn401: false }
      );
      const payload = response?.notifications || {};

      topbarNotificationState = {
        items: Array.isArray(payload.data) ? payload.data : [],
        unreadCount: Number(payload.summary?.unread_count || 0),
      };
      topbarNotificationLoaded = true;
      topbarNotificationFetchedAt = Date.now();
      renderTopbarNotifications({ authenticated: true });
      return topbarNotificationState;
    } catch (error) {
      topbarNotificationLoaded = false;
      topbarNotificationState = { items: [], unreadCount: 0 };
      renderTopbarNotificationBadge(0, Boolean(getToken()));
      renderTopbarNotificationPlaceholder("Chưa tải được danh sách thông báo.");
      setTopbarNotificationStatus(
        error?.message || "Không tải được thông báo.",
        { error: true }
      );
      return null;
    } finally {
      topbarNotificationPromise = null;
    }
  })();

  return topbarNotificationPromise;
};

const bindTopbarNotifications = () => {
  if (!notificationMenu || !notificationTrigger) return;

  notificationTrigger.setAttribute("aria-haspopup", "true");
  notificationTrigger.setAttribute("aria-expanded", "false");
  resetTopbarNotifications({ authenticated: Boolean(getToken()) });

  const openMenu = () => {
    setTopbarNotificationExpanded(true);
    void loadTopbarNotifications();
  };
  const closeMenu = () => setTopbarNotificationExpanded(false);

  notificationMenu.addEventListener("mouseenter", openMenu);
  notificationMenu.addEventListener("mouseleave", closeMenu);
  notificationMenu.addEventListener("focusin", openMenu);
  notificationMenu.addEventListener("focusout", (event) => {
    if (notificationMenu.contains(event.relatedTarget)) return;
    closeMenu();
  });
  notificationMenu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeMenu();
    notificationTrigger.blur();
  });
};

const bindStoreSearch = () => {
  if (!searchWrap || !searchInput || !searchButton) return;

  const currentQuery = new URLSearchParams(window.location.search).get("q") || "";
  if (currentQuery && !searchInput.value.trim()) {
    searchInput.value = currentQuery;
  }

  const submitSearch = () => {
    const query = searchInput.value.trim();
    if (!query) {
      searchInput.focus();
      return;
    }

    window.location.href = getSearchResultsHref(query);
  };

  searchButton.addEventListener("click", submitSearch);
  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitSearch();
  });
};

const emitCartChanged = () => {
  window.dispatchEvent(new Event("bambi:cart-changed"));
};

const refreshCartCount = async () => {
  if (!cartCountBadges.length) {
    return { total_quantity: 0, total_amount: 0 };
  }

  if (!getToken()) {
    setCartCount(0, false);
    return { total_quantity: 0, total_amount: 0 };
  }

  if (cartCountPromise) {
    return cartCountPromise;
  }

  cartCountPromise = (async () => {
    try {
      const payload = await apiFetch("/cart", {}, { redirectOn401: false });
      const summary = payload?.summary || {};
      setCartCount(summary.total_quantity || 0, true);
      return {
        total_quantity: Number(summary.total_quantity || 0),
        total_amount: Number(summary.total_amount || 0),
      };
    } catch (_error) {
      setCartCount(0, true);
      return { total_quantity: 0, total_amount: 0 };
    }
  })();

  try {
    return await cartCountPromise;
  } finally {
    cartCountPromise = null;
  }
};

const refreshSession = async (preferredSource) => {
  if (refreshPromise) {
    return refreshPromise;
  }

  const sessions = getSessionCandidates();
  const session =
    sessions.find(
      (candidate) => candidate.source === preferredSource && candidate.refresh
    ) || sessions.find((candidate) => candidate.refresh);

  if (!session?.refresh) {
    throw new Error("Không có refresh token.");
  }

  refreshPromise = (async () => {
    const response = await fetch(`${session.base}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh }),
    });

    const payload = await parseResponsePayload(response);

    if (!response.ok || !payload.token || !payload.refresh_token) {
      throw new Error(payload.message || "Không thể làm mới phiên đăng nhập.");
    }

    saveSession(session.source, payload.token, payload.refresh_token);

    return {
      source: session.source,
      token: payload.token,
      refresh_token: payload.refresh_token,
      base: session.base,
    };
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

const redirectToLogin = (options) => {
  window.location.href = getLoginRedirect(options);
};

const apiFetch = async (path, options = {}, config = {}) => {
  const { redirectOn401 = false, retryOn401 = true } = config;
  const session = getActiveSession();
  const headers = { ...(options.headers || {}) };
  let body = options.body;

  if (body && typeof body !== "string" && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(body);
  }

  if (session.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const response = await fetch(`${session.base}${path}`, {
    ...options,
    headers,
    body,
  });

  const payload = await parseResponsePayload(response);

  if (
    response.status === 401 &&
    retryOn401 &&
    path !== "/auth/refresh" &&
    session.token
  ) {
    try {
      const refreshed = await refreshSession(session.source);
      const retryHeaders = { ...(options.headers || {}) };
      let retryBody = options.body;

      if (
        retryBody &&
        typeof retryBody !== "string" &&
        !(retryBody instanceof FormData)
      ) {
        retryHeaders["Content-Type"] = "application/json";
        retryBody = JSON.stringify(retryBody);
      }

      retryHeaders.Authorization = `Bearer ${refreshed.token}`;

      const retryResponse = await fetch(`${refreshed.base}${path}`, {
        ...options,
        headers: retryHeaders,
        body: retryBody,
      });
      const retryPayload = await parseResponsePayload(retryResponse);

      if (!retryResponse.ok) {
        throw new Error(retryPayload.message || "Không thể tải dữ liệu.");
      }

      return retryPayload;
    } catch (_error) {
      clearAuth();
      hideUser();
      if (redirectOn401) {
        redirectToLogin();
      }
      throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    }
  }

  if (!response.ok) {
    throw new Error(payload.message || "Không thể tải dữ liệu.");
  }

  return payload;
};

const fetchMe = async () => {
  const token = getToken();
  if (!token) {
    hideUser();
    return;
  }

  try {
    const payload = await apiFetch("/auth/me", {}, { redirectOn401: false });
    const displayName =
      payload.user?.full_name || payload.user?.email || "Tài khoản";
    showUser(displayName, payload.user?.avatar_url || "");
  } catch (_error) {
    hideUser();
  }
};

const setSellerChannelLinks = (href) => {
  sellerChannelLinks.forEach((link) => {
    link.href = href;
  });
};

const resolveSellerChannelTarget = async () => {
  if (!getToken()) {
    return SELLER_CHANNEL_FALLBACK;
  }

  if (!sellerChannelPromise) {
    sellerChannelPromise = (async () => {
      try {
        const payload = await apiFetch("/shops/me", {}, { redirectOn401: false });
        const shops = payload.shops?.data || [];
        const approvedShop = shops.find((shop) => shop?.status === "approved");
        return approvedShop ? SELLER_CHANNEL_TARGET : SELLER_CHANNEL_FALLBACK;
      } catch (_error) {
        return SELLER_CHANNEL_FALLBACK;
      }
    })();
  }

  return sellerChannelPromise;
};

const bindSellerChannelLinks = () => {
  if (!sellerChannelLinks.length) return;

  setSellerChannelLinks(SELLER_CHANNEL_FALLBACK);

  sellerChannelLinks.forEach((link) => {
    link.addEventListener("click", async (event) => {
      if (!getToken()) return;

      event.preventDefault();

      const target = await resolveSellerChannelTarget();
      setSellerChannelLinks(target);
      window.location.href = target;
    });
  });

  if (!getToken()) return;

  resolveSellerChannelTarget().then((target) => {
    setSellerChannelLinks(target);
  });
};

window.BambiStoreAuth = {
  getToken,
  clearAuth,
  redirectToLogin,
  refreshSession,
  apiFetch,
  resolveSellerChannelTarget,
};

window.BambiStoreCart = {
  emitChange: emitCartChanged,
  refreshCount: refreshCartCount,
};

window.addEventListener("bambi:cart-changed", () => {
  refreshCartCount();
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    clearAuth();
    hideUser();
    sellerChannelPromise = null;
    setSellerChannelLinks(SELLER_CHANNEL_FALLBACK);
    redirectToLogin({ preserveNext: false });
  });
}

bindSellerChannelLinks();
bindTopbarNotifications();
bindStoreSearch();
fetchMe();
refreshCartCount();
