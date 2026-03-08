const profileStatus = document.querySelector("#profileStatus");
const profileName = document.querySelector("#profileName");
const profileEmail = document.querySelector("#profileEmail");
const profilePhone = document.querySelector("#profilePhone");
const profileBirth = document.querySelector("#profileBirth");
const avatarInput = document.querySelector("#avatarInput");
const avatarButton = document.querySelector("#avatarButton");
const avatarPreview = document.querySelector("#avatarPreview");
const avatarLabel = document.querySelector("#avatarLabel");
const saveBtn = document.querySelector("#saveProfile");

const StoreAuth = window.BambiStoreAuth;

const setStatus = (message, type = "info") => {
  if (!profileStatus) return;

  if (!message) {
    profileStatus.style.display = "none";
    profileStatus.textContent = "";
    profileStatus.className = "status";
    return;
  }

  profileStatus.style.display = "block";
  profileStatus.textContent = message;
  profileStatus.className = `status ${type === "error" ? "error" : ""}`;
};

const getGenderValue = () => {
  const selected = document.querySelector('input[name="gender"]:checked');
  return selected ? selected.value : null;
};

const setGenderValue = (value) => {
  document
    .querySelectorAll('input[name="gender"]')
    .forEach((input) => (input.checked = false));

  if (!value) return;

  const input = document.querySelector(`input[name="gender"][value="${value}"]`);
  if (input) input.checked = true;
};

const updateAvatarPreview = (avatarUrl) => {
  if (!avatarPreview) return;

  avatarPreview.src = avatarUrl || "";
  avatarPreview.style.display = avatarUrl ? "block" : "none";

  if (avatarLabel) {
    avatarLabel.style.display = avatarUrl ? "none" : "block";
  }
};

const ensureAuth = () => {
  if (StoreAuth?.getToken()) return true;
  StoreAuth?.redirectToLogin();
  return false;
};

const fetchProfile = async () => {
  if (!ensureAuth()) return;

  try {
    const payload = await StoreAuth.apiFetch(
      "/auth/me",
      {},
      { redirectOn401: true }
    );
    const user = payload.user || {};

    profileName.value = user.full_name || "";
    profileEmail.value = user.email || "";
    profilePhone.value = user.phone || "";

    if (profileBirth) {
      if (user.birth_date) {
        const date = new Date(user.birth_date);
        profileBirth.value = Number.isNaN(date.getTime())
          ? ""
          : date.toISOString().slice(0, 10);
      } else {
        profileBirth.value = "";
      }
    }

    setGenderValue(user.gender || null);
    updateAvatarPreview(user.avatar_url || "");
  } catch (error) {
    setStatus(error.message, "error");
  }
};

const saveProfile = async () => {
  if (!ensureAuth()) return;

  setStatus("");

  try {
    const payload = {
      email: profileEmail.value.trim(),
      full_name: profileName.value.trim() || null,
      phone: profilePhone.value.trim() || null,
      gender: getGenderValue(),
      birth_date: profileBirth.value || null,
    };

    const data = await StoreAuth.apiFetch(
      "/auth/me",
      {
        method: "PATCH",
        body: payload,
      },
      { redirectOn401: true }
    );

    setStatus("Đã lưu thông tin.");
    profileEmail.value = data.user?.email || "";
    profilePhone.value = data.user?.phone || "";
    setGenderValue(data.user?.gender || null);
    updateAvatarPreview(data.user?.avatar_url || "");
  } catch (error) {
    setStatus(error.message, "error");
  }
};

if (saveBtn) {
  saveBtn.addEventListener("click", (event) => {
    event.preventDefault();
    saveProfile();
  });
}

if (avatarButton && avatarInput) {
  avatarButton.addEventListener("click", (event) => {
    event.preventDefault();
    avatarInput.click();
  });
}

if (avatarInput) {
  avatarInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("Vui lòng chọn ảnh hợp lệ.", "error");
      return;
    }

    if (file.size > 1024 * 1024) {
      setStatus("Ảnh vượt quá 1MB.", "error");
      return;
    }

    const tempUrl = URL.createObjectURL(file);
    updateAvatarPreview(tempUrl);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const data = await StoreAuth.apiFetch(
        "/auth/me/avatar",
        {
          method: "POST",
          body: formData,
        },
        { redirectOn401: true }
      );

      updateAvatarPreview(data.user?.avatar_url || "");
      setStatus("Đã cập nhật ảnh.");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      avatarInput.value = "";
      URL.revokeObjectURL(tempUrl);
    }
  });
}

fetchProfile();
