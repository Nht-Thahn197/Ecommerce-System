const authButtons = document.querySelector("#authButtons");
const userMenu = document.querySelector("#userMenu");
const userName = document.querySelector("#userName");
const logoutBtn = document.querySelector("#logoutBtn");
const avatarImg = document.querySelector(".user-avatar .avatar-img");
const avatarInitial = document.querySelector(".user-avatar .avatar-initial");
const sellerChannelLinks = Array.from(
  document.querySelectorAll('a[href="/ui/shop-register.html"]')
);

const customerStorageKeys = {
  userBase: "bambi_user_base",
  userToken: "bambi_user_token",
  userRefresh: "bambi_user_refresh",
  sellerBase: "bambi_seller_base",
  sellerToken: "bambi_seller_token",
  sellerRefresh: "bambi_seller_refresh",
};

const getLoginRedirect = () => {
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

const redirectToLogin = () => {
  window.location.href = getLoginRedirect();
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

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    clearAuth();
    hideUser();
    sellerChannelPromise = null;
    setSellerChannelLinks(SELLER_CHANNEL_FALLBACK);
    redirectToLogin();
  });
}

bindSellerChannelLinks();
fetchMe();
