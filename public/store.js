const authButtons = document.querySelector("#authButtons");
const userMenu = document.querySelector("#userMenu");
const userName = document.querySelector("#userName");
const logoutBtn = document.querySelector("#logoutBtn");
const avatarImg = document.querySelector(".user-avatar .avatar-img");
const avatarInitial = document.querySelector(".user-avatar .avatar-initial");

const getToken = () =>
  localStorage.getItem("bambi_user_token") ||
  localStorage.getItem("bambi_seller_token") ||
  "";

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
  localStorage.removeItem("bambi_user_token");
  localStorage.removeItem("bambi_user_refresh");
  localStorage.removeItem("bambi_user_base");
  localStorage.removeItem("bambi_seller_token");
  localStorage.removeItem("bambi_seller_base");
};

const fetchMe = async () => {
  const token = getToken();
  if (!token) {
    hideUser();
    return;
  }
  try {
    const response = await fetch("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      hideUser();
      return;
    }
    const payload = await response.json();
    const displayName = payload.user?.full_name || payload.user?.email || "Tài khoản";
    showUser(displayName, payload.user?.avatar_url || "");
  } catch (error) {
    hideUser();
  }
};

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    clearAuth();
    hideUser();
    window.location.href = "/ui/login.html";
  });
}

fetchMe();
