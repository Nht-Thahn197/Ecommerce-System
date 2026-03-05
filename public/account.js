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

const token =
  localStorage.getItem("bambi_user_token") ||
  localStorage.getItem("bambi_seller_token");

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

let avatarFile = null;

const getGenderValue = () => {
  const selected = document.querySelector('input[name="gender"]:checked');
  return selected ? selected.value : null;
};

const setGenderValue = (value) => {
  if (!value) return;
  const input = document.querySelector(`input[name="gender"][value="${value}"]`);
  if (input) input.checked = true;
};

const fetchProfile = async () => {
  if (!token) {
    window.location.href = "/ui/login.html";
    return;
  }
  try {
    const response = await fetch("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      window.location.href = "/ui/login.html";
      return;
    }
    const payload = await response.json();
    const user = payload.user || {};
    profileName.value = user.full_name || "";
    profileEmail.value = user.email || "";
    profilePhone.value = user.phone || "";
    if (profileBirth && user.birth_date) {
      const date = new Date(user.birth_date);
      if (!Number.isNaN(date.getTime())) {
        profileBirth.value = date.toISOString().slice(0, 10);
      }
    }
    if (user.gender) setGenderValue(user.gender);
    if (user.avatar_url && avatarPreview) {
      avatarPreview.src = user.avatar_url;
      avatarPreview.style.display = "block";
      if (avatarLabel) avatarLabel.style.display = "none";
    } else if (avatarPreview) {
      avatarPreview.style.display = "none";
      if (avatarLabel) avatarLabel.style.display = "block";
    }
  } catch (error) {
    window.location.href = "/ui/login.html";
  }
};

const saveProfile = async () => {
  if (!token) return;
  setStatus("");
  const payload = {
    email: profileEmail.value.trim(),
    full_name: profileName.value.trim() || null,
    phone: profilePhone.value.trim() || null,
    gender: getGenderValue(),
    birth_date: profileBirth.value || null,
  };
  try {
    const response = await fetch("/auth/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Cập nhật thất bại");
    }
    setStatus("Đã lưu thông tin.");
    profileEmail.value = data.user.email || "";
    profilePhone.value = data.user.phone || "";
    setGenderValue(data.user.gender);
    if (data.user.avatar_url && avatarPreview) {
      avatarPreview.src = data.user.avatar_url;
      avatarPreview.style.display = "block";
      if (avatarLabel) avatarLabel.style.display = "none";
    }
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
  avatarInput.addEventListener("change", (event) => {
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
    avatarFile = file;
    const tempUrl = URL.createObjectURL(file);
    if (avatarPreview) {
      avatarPreview.src = tempUrl;
      avatarPreview.style.display = "block";
      if (avatarLabel) avatarLabel.style.display = "none";
    }

    const uploadAvatar = async () => {
      if (!token) return;
      const formData = new FormData();
      formData.append("avatar", avatarFile);
      try {
        const response = await fetch("/auth/me/avatar", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Upload thất bại");
        }
        if (data.user?.avatar_url && avatarPreview) {
          avatarPreview.src = data.user.avatar_url;
        }
        setStatus("Đã cập nhật ảnh.");
      } catch (error) {
        setStatus(error.message, "error");
      }
    };

    uploadAvatar();
  });
}

fetchProfile();
