(() => {
  const StoreAuth = window.BambiStoreAuth;

  const refs = {
    pageAlert: document.querySelector("#pageAlert"),
    loginGate: document.querySelector("#loginGate"),
    statusPanel: document.querySelector("#statusPanel"),
    welcomeScreen: document.querySelector("#welcomeScreen"),
    wizardScreen: document.querySelector("#wizardScreen"),
    startWizardBtn: document.querySelector("#startWizardBtn"),
    resumeDraftBtn: document.querySelector("#resumeDraftBtn"),
    prevStepBtn: document.querySelector("#prevStepBtn"),
    nextStepBtn: document.querySelector("#nextStepBtn"),
    submitWizardBtn: document.querySelector("#submitWizardBtn"),
    saveDraftBtn: document.querySelector("#saveDraftBtn"),
    refreshStatusBtn: document.querySelector("#refreshStatusBtn"),
    progressList: document.querySelector("#progressList"),
    summaryList: document.querySelector("#summaryList"),
    stepItems: Array.from(document.querySelectorAll(".step-item")),
    stepPanels: Array.from(document.querySelectorAll(".step-panel")),
    shopName: document.querySelector("#shopName"),
    shopNameCount: document.querySelector("#shopNameCount"),
    shopDescription: document.querySelector("#shopDescription"),
    contactEmail: document.querySelector("#contactEmail"),
    contactPhone: document.querySelector("#contactPhone"),
    pickupAddressTitle: document.querySelector("#pickupAddressTitle"),
    pickupAddressSummary: document.querySelector("#pickupAddressSummary"),
    bankName: document.querySelector("#bankName"),
    accountHolder: document.querySelector("#accountHolder"),
    accountNumber: document.querySelector("#accountNumber"),
    shipExpress: document.querySelector("#shipExpress"),
    shipStandard: document.querySelector("#shipStandard"),
    shipEconomy: document.querySelector("#shipEconomy"),
    shipSelfPickup: document.querySelector("#shipSelfPickup"),
    businessName: document.querySelector("#businessName"),
    taxCode: document.querySelector("#taxCode"),
    taxAddressTitle: document.querySelector("#taxAddressTitle"),
    taxAddressSummary: document.querySelector("#taxAddressSummary"),
    invoiceEmail: document.querySelector("#invoiceEmail"),
    identityNumber: document.querySelector("#identityNumber"),
    identityFullName: document.querySelector("#identityFullName"),
    identityConsent: document.querySelector("#identityConsent"),
    addressModal: document.querySelector("#addressModal"),
    addressModalTitle: document.querySelector("#addressModalTitle"),
    closeAddressModalBtn: document.querySelector("#closeAddressModalBtn"),
    cancelAddressBtn: document.querySelector("#cancelAddressBtn"),
    saveAddressBtn: document.querySelector("#saveAddressBtn"),
    addressContactName: document.querySelector("#addressContactName"),
    addressContactPhone: document.querySelector("#addressContactPhone"),
    addressRegionPreview: document.querySelector("#addressRegionPreview"),
    regionPickerPanel: document.querySelector("#regionPickerPanel"),
    regionStageBtns: Array.from(document.querySelectorAll(".region-stage-btn")),
    addressDetail: document.querySelector("#addressDetail"),
    mapPreviewLabel: document.querySelector("#mapPreviewLabel"),
    addressOpenButtons: Array.from(document.querySelectorAll("[data-open-address]")),
    uploadInputs: {
      business_license: document.querySelector("#businessLicenseInput"),
      identity_front: document.querySelector("#identityFrontInput"),
      identity_selfie: document.querySelector("#identitySelfieInput"),
      identity_extra: document.querySelector("#identityExtraInput"),
    },
    uploadLists: {
      business_license: document.querySelector("#businessLicenseList"),
      identity_front: document.querySelector("#identityFrontList"),
      identity_selfie: document.querySelector("#identitySelfieList"),
      identity_extra: document.querySelector("#identityExtraList"),
    },
  };

  if (!refs.welcomeScreen || !refs.wizardScreen || !refs.statusPanel) {
    return;
  }

  const DRAFT_KEY = "bambi_shop_wizard_draft_v2";
  const DOC_LABELS = {
    business_license: "Giấy phép kinh doanh",
    identity_front: "Giấy tờ mặt trước",
    identity_selfie: "Ảnh chân dung cầm giấy tờ",
    identity_extra: "Tài liệu bổ sung",
  };

  const PROVINCES = [
    "An Giang", "Bà Rịa - Vũng Tàu", "Bạc Liêu", "Bắc Giang", "Bắc Kạn",
    "Bắc Ninh", "Bến Tre", "Bình Dương", "Bình Định", "Bình Phước", "Bình Thuận",
    "Cà Mau", "Cần Thơ", "Cao Bằng", "Đà Nẵng", "Đắk Lắk", "Đắk Nông", "Điện Biên",
    "Đồng Nai", "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Nội", "Hà Tĩnh",
    "Hải Dương", "Hải Phòng", "Hậu Giang", "Hòa Bình", "Hưng Yên", "Khánh Hòa",
    "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn", "Lào Cai", "Long An",
    "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ", "Phú Yên",
    "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Ninh", "Quảng Trị", "Sóc Trăng",
    "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Thừa Thiên Huế",
    "Tiền Giang", "TP. Hồ Chí Minh", "Trà Vinh", "Tuyên Quang", "Vĩnh Long",
    "Vĩnh Phúc", "Yên Bái"
  ];

  const REGION_LIBRARY = {
    "Hà Nội": {
      districts: {
        "Ba Đình": ["Điện Biên", "Kim Mã", "Liễu Giai", "Ngọc Hà", "Phúc Xá"],
        "Cầu Giấy": ["Dịch Vọng", "Dịch Vọng Hậu", "Mai Dịch", "Nghĩa Đô", "Yên Hòa"],
        "Hà Đông": ["Biên Giang", "Dương Nội", "Hà Cầu", "Kiến Hưng", "Mộ Lao", "Phú La", "Phú Lương", "Quang Trung", "Văn Quán", "Yên Nghĩa"],
        "Long Biên": ["Bồ Đề", "Gia Thụy", "Ngọc Lâm", "Ngọc Thụy", "Phúc Đồng", "Việt Hưng"],
        "Nam Từ Liêm": ["Cầu Diễn", "Mễ Trì", "Mỹ Đình 1", "Mỹ Đình 2", "Phú Đô", "Tây Mỗ"],
      },
    },
    "TP. Hồ Chí Minh": {
      districts: {
        "Quận 1": ["Bến Nghé", "Bến Thành", "Cầu Kho", "Đa Kao", "Nguyễn Cư Trinh"],
        "Quận 3": ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5"],
        "Quận 7": ["Bình Thuận", "Phú Mỹ", "Phú Thuận", "Tân Hưng", "Tân Kiểng", "Tân Phong"],
        "Bình Thạnh": ["Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 15", "Phường 22", "Phường 25"],
        "Thành phố Thủ Đức": ["An Khánh", "An Lợi Đông", "Bình Thọ", "Cát Lái", "Hiệp Bình Chánh", "Linh Chiểu", "Linh Đông", "Thảo Điền", "Trường Thọ"],
      },
    },
    "Đà Nẵng": {
      districts: {
        "Hải Châu": ["Bình Hiên", "Hải Châu 1", "Hải Châu 2", "Hòa Cường Bắc", "Hòa Cường Nam"],
        "Thanh Khê": ["An Khê", "Chính Gián", "Tam Thuận", "Tân Chính", "Thạc Gián"],
        "Sơn Trà": ["An Hải Bắc", "An Hải Đông", "Mân Thái", "Nại Hiên Đông", "Phước Mỹ"],
        "Ngũ Hành Sơn": ["Hòa Hải", "Hòa Quý", "Khuê Mỹ", "Mỹ An"],
      },
    },
    "Hải Phòng": {
      districts: {
        "Lê Chân": ["An Biên", "An Dương", "Cát Dài", "Dư Hàng", "Lam Sơn", "Nghĩa Xá"],
        "Ngô Quyền": ["Cầu Đất", "Đằng Giang", "Đông Khê", "Lạc Viên", "Lê Lợi", "Máy Chai"],
        "Hải An": ["Cát Bi", "Đằng Hải", "Đằng Lâm", "Đông Hải 1", "Thành Tô", "Tràng Cát"],
      },
    },
    "Cần Thơ": {
      districts: {
        "Ninh Kiều": ["An Bình", "An Cư", "An Hòa", "An Khánh", "Tân An", "Xuân Khánh"],
        "Bình Thủy": ["An Thới", "Bình Thủy", "Long Hòa", "Long Tuyền", "Thới An Đông"],
        "Cái Răng": ["Ba Láng", "Hưng Phú", "Hưng Thạnh", "Lê Bình", "Phú Thứ", "Thường Thạnh"],
      },
    },
    "An Giang": {
      districts: {
        "Long Xuyên": ["Bình Đức", "Bình Khánh", "Đông Xuyên", "Mỹ Bình", "Mỹ Hòa", "Mỹ Phước"],
        "Châu Đốc": ["Châu Phú A", "Châu Phú B", "Núi Sam", "Vĩnh Mỹ", "Vĩnh Nguơn"],
        "Tân Châu": ["Long Hưng", "Long Sơn", "Long Thạnh", "Long Châu", "Long Phú"],
      },
    },
    "Bình Dương": {
      districts: {
        "Thủ Dầu Một": ["Chánh Mỹ", "Định Hòa", "Hiệp An", "Hiệp Thành", "Phú Cường", "Phú Hòa"],
        "Thuận An": ["An Phú", "Bình Chuẩn", "Lái Thiêu", "Thuận Giao", "Vĩnh Phú"],
        "Dĩ An": ["An Bình", "Bình An", "Đông Hòa", "Tân Bình", "Tân Đông Hiệp"],
      },
    },
    "Bắc Ninh": {
      districts: {
        "Bắc Ninh": ["Đại Phúc", "Hạp Lĩnh", "Khắc Niệm", "Kinh Bắc", "Ninh Xá", "Vệ An"],
        "Từ Sơn": ["Châu Khê", "Đình Bảng", "Đồng Kỵ", "Tân Hồng", "Trang Hạ"],
        "Quế Võ": ["Phố Mới", "Việt Hùng", "Bằng An", "Nhân Hòa", "Phù Lãng"],
      },
    },
  };

  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const emptyAddress = () => ({
    contact_name: "",
    contact_phone: "",
    province: "",
    district: "",
    ward: "",
    detail: "",
  });

  const createDefaultDraft = () => ({
    started: false,
    currentStep: 0,
    shopInfo: {
      name: "",
      description: "",
      contactEmail: "",
      contactPhone: "",
      pickupAddress: emptyAddress(),
      bankName: "",
      accountHolder: "",
      accountNumber: "",
    },
    shipping: {
      express: false,
      standard: true,
      economy: true,
      selfPickup: false,
    },
    tax: {
      businessType: "individual",
      businessName: "",
      invoiceEmail: "",
      taxCode: "",
      taxAddress: emptyAddress(),
    },
    identity: {
      identityType: "cccd",
      identityNumber: "",
      identityFullName: "",
      consent: false,
    },
    uploads: {
      business_license: [],
      identity_front: [],
      identity_selfie: [],
      identity_extra: [],
    },
    meta: {
      submittedAt: "",
    },
  });

  const getFileNameFromUrl = (url) => {
    if (!url) return "Tệp đã tải";
    try {
      const parsed = new URL(url, window.location.origin);
      return decodeURIComponent(parsed.pathname.split("/").pop() || "Tệp đã tải");
    } catch (_error) {
      return decodeURIComponent(String(url).split("/").pop() || "Tệp đã tải");
    }
  };

  const normalizeUploadItem = (file) => ({
    doc_url: file?.doc_url || "",
    original_name: file?.original_name || getFileNameFromUrl(file?.doc_url || ""),
    mime_type: file?.mime_type || "",
    size: Number(file?.size || 0),
  });

  const dedupeUploads = (files = []) => {
    const seen = new Set();
    return files.map(normalizeUploadItem).filter((file) => {
      const key = file.doc_url || `${file.original_name}-${file.size}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const mergeDraft = (stored = {}) => {
    const base = createDefaultDraft();
    const merged = {
      ...base,
      ...stored,
      shopInfo: {
        ...base.shopInfo,
        ...(stored.shopInfo || {}),
        pickupAddress: {
          ...base.shopInfo.pickupAddress,
          ...(stored.shopInfo?.pickupAddress || {}),
        },
      },
      shipping: {
        ...base.shipping,
        ...(stored.shipping || {}),
      },
      tax: {
        ...base.tax,
        ...(stored.tax || {}),
        taxAddress: {
          ...base.tax.taxAddress,
          ...(stored.tax?.taxAddress || {}),
        },
      },
      identity: {
        ...base.identity,
        ...(stored.identity || {}),
      },
      uploads: {
        ...base.uploads,
        ...(stored.uploads || {}),
      },
      meta: {
        ...base.meta,
        ...(stored.meta || {}),
      },
    };

    Object.keys(merged.uploads).forEach((key) => {
      merged.uploads[key] = dedupeUploads(merged.uploads[key]);
    });

    return merged;
  };

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return mergeDraft(raw ? JSON.parse(raw) : {});
    } catch (_error) {
      return createDefaultDraft();
    }
  };
  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return map[char] || char;
    });

  const formatDateTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("vi-VN");
  };

  const formatBytes = (size = 0) => {
    if (!size) return "";
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatBusinessType = (value) => {
    const map = {
      individual: "Cá nhân",
      household: "Hộ kinh doanh",
      company: "Công ty",
    };
    return map[value] || "Chưa chọn";
  };

  const formatIdentityType = (value) => {
    const map = {
      cccd: "Căn cước công dân",
      cmnd: "Chứng minh nhân dân",
      passport: "Hộ chiếu",
    };
    return map[value] || "Chưa chọn";
  };

  const buildAddressText = (address = {}) =>
    [address.detail, address.ward, address.district, address.province]
      .filter(Boolean)
      .join(", ");

  const buildAddressRegionText = (address = {}) =>
    [address.province, address.district, address.ward].filter(Boolean).join(" / ");

  const isAddressComplete = (address = {}) =>
    Boolean(
      address.contact_name &&
        address.contact_phone &&
        address.province &&
        address.district &&
        address.ward &&
        address.detail
    );

  const state = {
    draft: loadDraft(),
    currentStep: 0,
    user: null,
    shop: null,
    mode: "init",
    addressTarget: "pickup",
    addressForm: emptyAddress(),
    regionStage: "province",
  };

  const countUploadedFiles = () =>
    Object.values(state.draft.uploads).reduce((sum, files) => sum + files.length, 0);

  const hasAnyShipping = () => Object.values(state.draft.shipping).some(Boolean);

  const isStepComplete = (step) => {
    if (step === 0) {
      return Boolean(
        state.draft.shopInfo.name.trim() &&
          state.draft.shopInfo.contactEmail.trim() &&
          state.draft.shopInfo.contactPhone.trim() &&
          state.draft.shopInfo.bankName.trim() &&
          state.draft.shopInfo.accountHolder.trim() &&
          state.draft.shopInfo.accountNumber.trim() &&
          isAddressComplete(state.draft.shopInfo.pickupAddress)
      );
    }

    if (step === 1) {
      return hasAnyShipping();
    }

    if (step === 2) {
      const needsLicense = state.draft.tax.businessType !== "individual";
      return Boolean(
        state.draft.tax.businessName.trim() &&
          state.draft.tax.invoiceEmail.trim() &&
          isAddressComplete(state.draft.tax.taxAddress) &&
          (!needsLicense || state.draft.uploads.business_license.length)
      );
    }

    if (step === 3) {
      return Boolean(
        state.draft.identity.identityNumber.trim() &&
          state.draft.identity.identityFullName.trim() &&
          state.draft.uploads.identity_front.length &&
          state.draft.uploads.identity_selfie.length &&
          state.draft.identity.consent
      );
    }

    return Boolean(state.draft.meta.submittedAt);
  };

  const hasDraftContent = () =>
    Boolean(
      state.draft.shopInfo.name ||
        state.draft.shopInfo.description ||
        state.draft.shopInfo.contactPhone ||
        state.draft.tax.businessName ||
        state.draft.tax.taxCode ||
        state.draft.identity.identityNumber ||
        countUploadedFiles() ||
        state.draft.started
    );

  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft));
  };

  const updatePageAlert = (message = "", type = "info") => {
    if (!refs.pageAlert) return;
    if (!message) {
      refs.pageAlert.textContent = "";
      refs.pageAlert.classList.add("hidden");
      refs.pageAlert.classList.remove("error");
      return;
    }

    refs.pageAlert.textContent = message;
    refs.pageAlert.classList.remove("hidden");
    refs.pageAlert.classList.toggle("error", type === "error");
  };

  const getSelectedRadio = (name) =>
    document.querySelector(`input[name="${name}"]:checked`)?.value || "";

  const getAddressByTarget = (target) =>
    target === "tax" ? state.draft.tax.taxAddress : state.draft.shopInfo.pickupAddress;

  const setAddressByTarget = (target, value) => {
    if (target === "tax") {
      state.draft.tax.taxAddress = value;
      return;
    }
    state.draft.shopInfo.pickupAddress = value;
  };

  const prefillFromUser = () => {
    if (!state.user) return;

    if (!state.draft.shopInfo.contactEmail) {
      state.draft.shopInfo.contactEmail = state.user.email || "";
    }
    if (!state.draft.shopInfo.contactPhone) {
      state.draft.shopInfo.contactPhone = state.user.phone || "";
    }
    if (!state.draft.tax.invoiceEmail) {
      state.draft.tax.invoiceEmail = state.user.email || "";
    }
    if (!state.draft.identity.identityFullName) {
      state.draft.identity.identityFullName = state.user.full_name || "";
    }
  };

  const mergeShopIntoDraft = (shop) => {
    if (!shop) return;

    const merged = mergeDraft(state.draft);
    const onboarding = shop.onboarding_data || {};
    merged.started = true;
    merged.shopInfo.name = shop.name || merged.shopInfo.name;
    merged.shopInfo.description = shop.description || merged.shopInfo.description;
    merged.shopInfo.contactEmail =
      shop.contact_email || merged.shopInfo.contactEmail;
    merged.shopInfo.contactPhone =
      shop.contact_phone || merged.shopInfo.contactPhone;

    const address =
      shop.shop_addresses?.find((item) => item.address_type === "pickup") ||
      shop.shop_addresses?.[0];
    if (address) {
      merged.shopInfo.pickupAddress = {
        ...merged.shopInfo.pickupAddress,
        contact_name:
          address.contact_name || merged.shopInfo.pickupAddress.contact_name,
        contact_phone:
          address.contact_phone || merged.shopInfo.pickupAddress.contact_phone,
        province: address.province || merged.shopInfo.pickupAddress.province,
        district: address.district || merged.shopInfo.pickupAddress.district,
        ward: address.ward || merged.shopInfo.pickupAddress.ward,
        detail: address.detail || merged.shopInfo.pickupAddress.detail,
      };
    }

    const taxAddress =
      shop.shop_addresses?.find((item) => item.address_type === "tax") ||
      onboarding.tax_address;
    if (taxAddress) {
      merged.tax.taxAddress = {
        ...merged.tax.taxAddress,
        contact_name:
          taxAddress.contact_name || merged.tax.taxAddress.contact_name,
        contact_phone:
          taxAddress.contact_phone || merged.tax.taxAddress.contact_phone,
        province: taxAddress.province || merged.tax.taxAddress.province,
        district: taxAddress.district || merged.tax.taxAddress.district,
        ward: taxAddress.ward || merged.tax.taxAddress.ward,
        detail: taxAddress.detail || merged.tax.taxAddress.detail,
      };
    }

    const payment = shop.shop_payment_accounts?.[0];
    if (payment) {
      merged.shopInfo.bankName = payment.bank_name || merged.shopInfo.bankName;
      merged.shopInfo.accountHolder = payment.account_holder || merged.shopInfo.accountHolder;
      merged.shopInfo.accountNumber = payment.account_number || merged.shopInfo.accountNumber;
    }

    merged.shipping = {
      ...merged.shipping,
      ...(onboarding.shipping_config || {}),
    };
    merged.tax = {
      ...merged.tax,
      businessType:
        onboarding.tax_info?.business_type || merged.tax.businessType,
      businessName:
        onboarding.tax_info?.business_name || merged.tax.businessName,
      invoiceEmail:
        onboarding.tax_info?.invoice_email || merged.tax.invoiceEmail,
      taxCode: onboarding.tax_info?.tax_code || merged.tax.taxCode,
    };
    merged.identity = {
      ...merged.identity,
      identityType:
        onboarding.identity_info?.identity_type || merged.identity.identityType,
      identityNumber:
        onboarding.identity_info?.identity_number ||
        merged.identity.identityNumber,
      identityFullName:
        onboarding.identity_info?.identity_full_name ||
        merged.identity.identityFullName,
      consent:
        typeof onboarding.identity_info?.consent === "boolean"
          ? onboarding.identity_info.consent
          : merged.identity.consent,
    };

    const uploaded = {
      business_license: [],
      identity_front: [],
      identity_selfie: [],
      identity_extra: [],
    };

    (shop.shop_documents || []).forEach((doc) => {
      const docType = uploaded[doc.doc_type] ? doc.doc_type : "identity_extra";
      uploaded[docType].push(normalizeUploadItem(doc));
    });

    Object.keys(uploaded).forEach((key) => {
      merged.uploads[key] = dedupeUploads([...(merged.uploads[key] || []), ...uploaded[key]]);
    });

    state.draft = merged;
    saveDraft();
  };

  const syncDraftFromForm = () => {
    state.draft.shopInfo.name = refs.shopName?.value.trim() || "";
    state.draft.shopInfo.description = refs.shopDescription?.value.trim() || "";
    state.draft.shopInfo.contactEmail = refs.contactEmail?.value.trim() || "";
    state.draft.shopInfo.contactPhone = refs.contactPhone?.value.trim() || "";
    state.draft.shopInfo.bankName = refs.bankName?.value.trim() || "";
    state.draft.shopInfo.accountHolder = refs.accountHolder?.value.trim() || "";
    state.draft.shopInfo.accountNumber = refs.accountNumber?.value.trim() || "";

    state.draft.shipping.express = Boolean(refs.shipExpress?.checked);
    state.draft.shipping.standard = Boolean(refs.shipStandard?.checked);
    state.draft.shipping.economy = Boolean(refs.shipEconomy?.checked);
    state.draft.shipping.selfPickup = Boolean(refs.shipSelfPickup?.checked);

    state.draft.tax.businessType = getSelectedRadio("businessType") || "individual";
    state.draft.tax.businessName = refs.businessName?.value.trim() || "";
    state.draft.tax.taxCode = refs.taxCode?.value.trim() || "";
    state.draft.tax.invoiceEmail = refs.invoiceEmail?.value.trim() || "";

    state.draft.identity.identityType = getSelectedRadio("identityType") || "cccd";
    state.draft.identity.identityNumber = refs.identityNumber?.value.trim() || "";
    state.draft.identity.identityFullName = refs.identityFullName?.value.trim() || "";
    state.draft.identity.consent = Boolean(refs.identityConsent?.checked);

    state.draft.started = true;
    state.draft.currentStep = state.currentStep;
  };

  const updateNameCount = () => {
    if (refs.shopNameCount) {
      const value = refs.shopName?.value || "";
      refs.shopNameCount.textContent = `${value.length}/30`;
    }
  };

  const renderChoiceGroups = () => {
    document.querySelectorAll(".choice-chip").forEach((chip) => {
      const input = chip.querySelector("input");
      chip.classList.toggle("active", Boolean(input?.checked));
    });
  };

  const renderAddressCards = () => {
    const pickup = state.draft.shopInfo.pickupAddress;
    if (isAddressComplete(pickup)) {
      refs.pickupAddressTitle.textContent = `${pickup.contact_name} · ${pickup.contact_phone}`;
      refs.pickupAddressSummary.textContent = buildAddressText(pickup);
      refs.pickupAddressSummary.classList.remove("address-empty");
    } else {
      refs.pickupAddressTitle.textContent = "Chưa có địa chỉ lấy hàng";
      refs.pickupAddressSummary.textContent = "Thêm địa chỉ để hệ thống và đội vận chuyển biết nơi lấy hàng mặc định.";
      refs.pickupAddressSummary.classList.add("address-empty");
    }

    const taxAddress = state.draft.tax.taxAddress;
    if (isAddressComplete(taxAddress)) {
      refs.taxAddressTitle.textContent = `${taxAddress.contact_name} · ${taxAddress.contact_phone}`;
      refs.taxAddressSummary.textContent = buildAddressText(taxAddress);
      refs.taxAddressSummary.classList.remove("address-empty");
    } else {
      refs.taxAddressTitle.textContent = "Chưa có địa chỉ đăng ký thuế";
      refs.taxAddressSummary.textContent = "Dùng địa chỉ đăng ký kinh doanh hoặc địa chỉ cá nhân phù hợp với hồ sơ thuế.";
      refs.taxAddressSummary.classList.add("address-empty");
    }
  };
  const renderUploads = (docType) => {
    const container = refs.uploadLists[docType];
    if (!container) return;

    const files = state.draft.uploads[docType] || [];
    if (!files.length) {
      container.innerHTML = '<div class="upload-item"><div><strong>Chưa có tệp nào</strong><span>Hệ thống sẽ hiển thị các file đã tải lên tại đây.</span></div></div>';
      return;
    }

    container.innerHTML = files
      .map(
        (file, index) => `
          <div class="upload-item">
            <div>
              <a href="${escapeHtml(file.doc_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
          file.original_name || getFileNameFromUrl(file.doc_url)
        )}</a>
              <span>${escapeHtml(file.mime_type || DOC_LABELS[docType] || "Tài liệu")}${
          file.size ? ` · ${escapeHtml(formatBytes(file.size))}` : ""
        }</span>
            </div>
            <button class="upload-remove" type="button" data-remove-upload="${docType}" data-index="${index}">Xóa</button>
          </div>
        `
      )
      .join("");
  };

  const renderAllUploads = () => {
    Object.keys(refs.uploadLists).forEach(renderUploads);
  };

  const renderProgress = () => {
    if (!refs.progressList) return;

    const steps = [
      {
        title: "Thông tin shop",
        sub: isStepComplete(0) ? "Đã đủ thông tin cơ bản" : "Thiếu tên shop, địa chỉ hoặc tài khoản nhận tiền",
      },
      {
        title: "Cài đặt vận chuyển",
        sub: hasAnyShipping() ? "Đã chọn phương thức giao hàng" : "Cần bật ít nhất một phương thức",
      },
      {
        title: "Thông tin thuế",
        sub: isStepComplete(2) ? "Đã có hồ sơ thuế cơ bản" : "Thiếu loại hình, địa chỉ hoặc email hóa đơn",
      },
      {
        title: "Thông tin định danh",
        sub: isStepComplete(3) ? "Đã có giấy tờ định danh" : "Thiếu giấy tờ hoặc xác nhận cuối cùng",
      },
    ];

    refs.progressList.innerHTML = steps
      .map((step, index) => {
        const statusClass = index === state.currentStep && state.mode === "wizard"
          ? "active"
          : isStepComplete(index)
          ? "done"
          : "";

        return `
          <div class="progress-item ${statusClass}">
            <span class="progress-dot"></span>
            <div class="progress-copy">
              <strong>${escapeHtml(step.title)}</strong>
              <span>${escapeHtml(step.sub)}</span>
            </div>
          </div>
        `;
      })
      .join("");
  };

  const renderSummary = () => {
    if (!refs.summaryList) return;

    const selectedShipping = Object.entries(state.draft.shipping)
      .filter(([, enabled]) => enabled)
      .map(([key]) => {
        const map = {
          express: "Hỏa tốc",
          standard: "Nhanh",
          economy: "Tiết kiệm",
          selfPickup: "Tự vận chuyển",
        };
        return map[key] || key;
      })
      .join(", ");

    const summaryItems = [
      ["Tên shop", state.draft.shopInfo.name || "Chưa nhập"],
      ["Địa chỉ lấy hàng", buildAddressText(state.draft.shopInfo.pickupAddress) || "Chưa có"],
      ["Vận chuyển", selectedShipping || "Chưa chọn"],
      ["Loại hình thuế", formatBusinessType(state.draft.tax.businessType)],
      ["Định danh", formatIdentityType(state.draft.identity.identityType)],
      ["Tệp đã tải", `${countUploadedFiles()} tệp`],
    ];

    refs.summaryList.innerHTML = summaryItems
      .map(
        ([label, value]) => `
          <div class="summary-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `
      )
      .join("");
  };

  const fillFormFromDraft = () => {
    refs.shopName.value = state.draft.shopInfo.name;
    refs.shopDescription.value = state.draft.shopInfo.description;
    refs.contactEmail.value = state.draft.shopInfo.contactEmail;
    refs.contactPhone.value = state.draft.shopInfo.contactPhone;
    refs.bankName.value = state.draft.shopInfo.bankName;
    refs.accountHolder.value = state.draft.shopInfo.accountHolder;
    refs.accountNumber.value = state.draft.shopInfo.accountNumber;

    refs.shipExpress.checked = state.draft.shipping.express;
    refs.shipStandard.checked = state.draft.shipping.standard;
    refs.shipEconomy.checked = state.draft.shipping.economy;
    refs.shipSelfPickup.checked = state.draft.shipping.selfPickup;

    document.querySelectorAll('input[name="businessType"]').forEach((node) => {
      node.checked = node.value === state.draft.tax.businessType;
    });
    document.querySelectorAll('input[name="identityType"]').forEach((node) => {
      node.checked = node.value === state.draft.identity.identityType;
    });

    refs.businessName.value = state.draft.tax.businessName;
    refs.taxCode.value = state.draft.tax.taxCode;
    refs.invoiceEmail.value = state.draft.tax.invoiceEmail;
    refs.identityNumber.value = state.draft.identity.identityNumber;
    refs.identityFullName.value = state.draft.identity.identityFullName;
    refs.identityConsent.checked = state.draft.identity.consent;

    updateNameCount();
    renderChoiceGroups();
    renderAddressCards();
    renderAllUploads();
  };

  const renderWelcome = () => {
    refs.resumeDraftBtn.classList.toggle("hidden", !hasDraftContent());
  };

  const renderStatusPanel = () => {
    if (!state.shop) return;

    const status = state.shop.status || "pending";
    const address =
      state.shop.shop_addresses?.find((item) => item.address_type === "pickup") ||
      state.shop.shop_addresses?.[0] ||
      state.draft.shopInfo.pickupAddress;
    const payment = state.shop.shop_payment_accounts?.[0] || {};
    const docCount = state.shop.shop_documents?.length || countUploadedFiles();

    const titleMap = {
      pending: "Hồ sơ shop đang chờ duyệt",
      approved: "Shop của bạn đã được duyệt",
      rejected: "Hồ sơ shop cần bổ sung lại",
    };

    const descMap = {
      pending: "Đội vận hành đang kiểm tra hồ sơ. Bạn chưa cần làm thêm gì ở bước này, chỉ cần chờ phản hồi hoặc kiểm tra email thông báo.",
      approved: "Hồ sơ đã qua duyệt. Bạn có thể vào khu vực Seller để thêm sản phẩm và bắt đầu bán hàng.",
      rejected: `Hồ sơ trước đó chưa đạt yêu cầu.${state.shop.rejected_reason ? ` Lý do: ${state.shop.rejected_reason}` : ""} Bạn có thể mở lại wizard để sửa và nộp lại.`,
    };

    refs.statusPanel.innerHTML = `
      <span class="state-badge ${escapeHtml(status)}">${escapeHtml(
      status === "approved" ? "Đã duyệt" : status === "rejected" ? "Bị từ chối" : "Đang chờ duyệt"
    )}</span>
      <h1>${escapeHtml(titleMap[status] || "Trạng thái hồ sơ shop")}</h1>
      <p>${escapeHtml(descMap[status] || "")}</p>
      <div class="state-meta">
        <div class="meta-card"><span>Tên shop</span><strong>${escapeHtml(state.shop.name || "-")}</strong></div>
        <div class="meta-card"><span>Ngày gửi hồ sơ</span><strong>${escapeHtml(formatDateTime(state.shop.created_at))}</strong></div>
        <div class="meta-card"><span>Địa chỉ lấy hàng</span><strong>${escapeHtml(buildAddressText(address) || "Chưa có")}</strong></div>
        <div class="meta-card"><span>Tài khoản nhận tiền</span><strong>${escapeHtml(
          [payment.bank_name, payment.account_holder, payment.account_number].filter(Boolean).join(" · ") || "Chưa có"
        )}</strong></div>
        <div class="meta-card"><span>Số giấy tờ đã tải</span><strong>${escapeHtml(String(docCount))}</strong></div>
        <div class="meta-card"><span>Thông tin bổ sung</span><strong>${escapeHtml(
          state.shop.rejected_reason || "Một số thông tin nâng cao đang được giữ trong nháp trên trình duyệt hiện tại."
        )}</strong></div>
      </div>
      <div class="state-actions">
        ${status === "approved" ? '<a class="primary-btn" href="/ui/seller/">Vào Seller Studio</a>' : ""}
        ${status === "rejected" ? '<button type="button" class="primary-btn" data-status-action="edit">Chỉnh sửa và nộp lại</button>' : ""}
        <a class="ghost-btn" href="/ui/">Quay lại trang chủ</a>
      </div>
    `;
  };

  const setMode = (mode) => {
    state.mode = mode;
    refs.loginGate.classList.toggle("hidden", mode !== "login");
    refs.statusPanel.classList.toggle("hidden", mode !== "status");
    refs.welcomeScreen.classList.toggle("hidden", mode !== "welcome");
    refs.wizardScreen.classList.toggle("hidden", mode !== "wizard");
  };

  const renderStepState = () => {
    refs.stepItems.forEach((item) => {
      const step = Number(item.dataset.step);
      item.classList.toggle("active", step === state.currentStep);
      item.classList.toggle("completed", step < state.currentStep);
    });

    refs.stepPanels.forEach((panel) => {
      panel.classList.toggle("active", Number(panel.dataset.stepPanel) === state.currentStep);
    });

    const isCompleteScreen = state.currentStep === 4;
    refs.prevStepBtn.classList.toggle("hidden", state.currentStep === 0 || isCompleteScreen);
    refs.saveDraftBtn.classList.toggle("hidden", isCompleteScreen);
    refs.nextStepBtn.classList.toggle("hidden", state.currentStep >= 3 || isCompleteScreen);
    refs.submitWizardBtn.classList.toggle("hidden", state.currentStep !== 3);
  };

  const renderAll = () => {
    fillFormFromDraft();
    renderWelcome();
    renderProgress();
    renderSummary();
    renderStepState();
    if (state.mode === "status") {
      renderStatusPanel();
    }
  };

  const openWizard = (step = 0) => {
    state.currentStep = Math.max(0, Math.min(4, step));
    state.draft.started = true;
    state.draft.currentStep = state.currentStep;
    saveDraft();
    setMode("wizard");
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateStep = (step) => {
    syncDraftFromForm();

    if (step === 0) {
      if (!state.draft.shopInfo.name) throw new Error("Bạn chưa nhập tên shop.");
      if (!isAddressComplete(state.draft.shopInfo.pickupAddress)) throw new Error("Bạn chưa hoàn tất địa chỉ lấy hàng.");
      if (!state.draft.shopInfo.contactEmail) throw new Error("Bạn chưa có email liên hệ.");
      if (!state.draft.shopInfo.contactPhone) throw new Error("Bạn chưa nhập số điện thoại liên hệ.");
      if (!state.draft.shopInfo.bankName || !state.draft.shopInfo.accountHolder || !state.draft.shopInfo.accountNumber) {
        throw new Error("Bạn cần điền đầy đủ thông tin tài khoản ngân hàng nhận tiền.");
      }
    }

    if (step === 1 && !hasAnyShipping()) {
      throw new Error("Hãy bật ít nhất một phương thức vận chuyển.");
    }

    if (step === 2) {
      if (!state.draft.tax.businessName) throw new Error("Bạn chưa nhập tên pháp lý hoặc tên đơn vị kinh doanh.");
      if (!isAddressComplete(state.draft.tax.taxAddress)) throw new Error("Bạn chưa hoàn tất địa chỉ đăng ký thuế.");
      if (!state.draft.tax.invoiceEmail) throw new Error("Bạn chưa nhập email nhận hóa đơn.");
      if (state.draft.tax.businessType !== "individual" && !state.draft.uploads.business_license.length) {
        throw new Error("Loại hình này cần tải lên giấy phép kinh doanh.");
      }
    }

    if (step === 3) {
      if (!state.draft.identity.identityNumber) throw new Error("Bạn chưa nhập số giấy tờ định danh.");
      if (!state.draft.identity.identityFullName) throw new Error("Bạn chưa nhập họ tên theo giấy tờ.");
      if (!state.draft.uploads.identity_front.length) throw new Error("Bạn cần tải lên ít nhất một file giấy tờ mặt trước.");
      if (!state.draft.uploads.identity_selfie.length) throw new Error("Bạn cần tải lên ảnh chân dung cầm giấy tờ.");
      if (!state.draft.identity.consent) throw new Error("Bạn cần xác nhận trước khi gửi hồ sơ.");
    }

    saveDraft();
  };
  const flattenDocuments = () =>
    Object.entries(state.draft.uploads).flatMap(([docType, files]) =>
      files
        .filter((file) => file.doc_url)
        .map((file) => ({ doc_type: docType, doc_url: file.doc_url }))
    );

  const buildRegisterPayload = () => ({
    name: state.draft.shopInfo.name,
    description: state.draft.shopInfo.description || null,
    contact_email: state.draft.shopInfo.contactEmail || null,
    contact_phone: state.draft.shopInfo.contactPhone || null,
    address: {
      province: state.draft.shopInfo.pickupAddress.province,
      district: state.draft.shopInfo.pickupAddress.district,
      ward: state.draft.shopInfo.pickupAddress.ward,
      detail: state.draft.shopInfo.pickupAddress.detail,
    },
    pickup_address: { ...state.draft.shopInfo.pickupAddress },
    tax_address: { ...state.draft.tax.taxAddress },
    payment_account: {
      bank_name: state.draft.shopInfo.bankName,
      account_holder: state.draft.shopInfo.accountHolder,
      account_number: state.draft.shopInfo.accountNumber,
    },
    shipping_config: { ...state.draft.shipping },
    tax_info: {
      business_type: state.draft.tax.businessType,
      business_name: state.draft.tax.businessName,
      invoice_email: state.draft.tax.invoiceEmail,
      tax_code: state.draft.tax.taxCode,
    },
    identity_info: {
      identity_type: state.draft.identity.identityType,
      identity_number: state.draft.identity.identityNumber,
      identity_full_name: state.draft.identity.identityFullName,
      consent: state.draft.identity.consent,
    },
    documents: flattenDocuments(),
  });

  const handleNextStep = () => {
    try {
      updatePageAlert();
      validateStep(state.currentStep);
      state.currentStep += 1;
      state.draft.currentStep = state.currentStep;
      saveDraft();
      renderAll();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      updatePageAlert(error.message || "Không thể chuyển bước.", "error");
    }
  };

  const handlePrevStep = () => {
    if (state.currentStep <= 0) return;
    syncDraftFromForm();
    state.currentStep -= 1;
    state.draft.currentStep = state.currentStep;
    saveDraft();
    renderAll();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveDraft = () => {
    syncDraftFromForm();
    saveDraft();
    renderAll();
    updatePageAlert("Đã lưu nháp hồ sơ trên trình duyệt này.");
  };

  const handleSubmit = async () => {
    try {
      updatePageAlert();
      validateStep(3);
      refs.submitWizardBtn.disabled = true;
      refs.submitWizardBtn.textContent = "Đang gửi hồ sơ...";

      const payload = buildRegisterPayload();
      const response = await StoreAuth.apiFetch(
        "/shops/register",
        { method: "POST", body: payload },
        { redirectOn401: true }
      );

      state.shop = response.shop || null;
      state.draft.meta.submittedAt = new Date().toISOString();
      state.currentStep = 4;
      state.draft.currentStep = 4;
      saveDraft();
      renderAll();
      updatePageAlert("Hồ sơ shop đã được gửi thành công. Hệ thống đang chờ duyệt.");
    } catch (error) {
      updatePageAlert(error.message || "Không thể gửi hồ sơ shop.", "error");
    } finally {
      refs.submitWizardBtn.disabled = false;
      refs.submitWizardBtn.textContent = "Hoàn tất";
    }
  };

  const uploadFiles = async (docType, files) => {
    if (!files.length) return;

    const input = refs.uploadInputs[docType];
    if (input) input.disabled = true;

    try {
      updatePageAlert(`Đang tải ${files.length} file cho mục ${DOC_LABELS[docType]}...`);
      const formData = new FormData();
      files.forEach((file) => formData.append("documents", file));

      const payload = await StoreAuth.apiFetch(
        "/shops/documents/upload",
        { method: "POST", body: formData },
        { redirectOn401: true }
      );

      const uploadedFiles = Array.isArray(payload.documents)
        ? payload.documents.map(normalizeUploadItem)
        : [];

      state.draft.uploads[docType] = dedupeUploads([
        ...(state.draft.uploads[docType] || []),
        ...uploadedFiles,
      ]);
      saveDraft();
      renderUploads(docType);
      renderSummary();
      updatePageAlert(`Đã tải thành công ${uploadedFiles.length} file cho mục ${DOC_LABELS[docType]}.`);
    } catch (error) {
      updatePageAlert(error.message || "Không thể tải file lên server.", "error");
    } finally {
      if (input) {
        input.disabled = false;
        input.value = "";
      }
    }
  };

  const openAddressModal = (target) => {
    state.addressTarget = target;
    state.addressForm = deepClone(getAddressByTarget(target));
    state.regionStage = !state.addressForm.province
      ? "province"
      : !state.addressForm.district
      ? "district"
      : !state.addressForm.ward
      ? "ward"
      : "province";

    refs.addressModalTitle.textContent =
      target === "tax" ? "Địa chỉ đăng ký thuế" : "Địa chỉ lấy hàng";

    refs.addressContactName.value = state.addressForm.contact_name || "";
    refs.addressContactPhone.value = state.addressForm.contact_phone || "";
    refs.addressDetail.value = state.addressForm.detail || "";

    renderAddressModalState();
    refs.addressModal.classList.remove("hidden");
    refs.addressModal.setAttribute("aria-hidden", "false");
  };

  const closeAddressModal = () => {
    refs.addressModal.classList.add("hidden");
    refs.addressModal.setAttribute("aria-hidden", "true");
  };

  const renderAddressModalState = () => {
    refs.addressRegionPreview.textContent =
      buildAddressRegionText(state.addressForm) || "Chưa chọn khu vực";
    refs.mapPreviewLabel.textContent =
      buildAddressText(state.addressForm) ||
      "Địa chỉ sẽ xuất hiện tại đây sau khi bạn chọn khu vực và nhập chi tiết.";

    refs.regionStageBtns.forEach((button) => {
      button.classList.toggle("active", button.dataset.regionStage === state.regionStage);
    });

    renderRegionPanel();
  };

  const renderRegionPanel = () => {
    let options = [];
    let manualLabel = "";
    let manualValue = "";
    let emptyMessage = "";

    if (state.regionStage === "province") {
      options = PROVINCES;
    }

    if (state.regionStage === "district") {
      if (!state.addressForm.province) {
        emptyMessage = "Hãy chọn tỉnh/thành phố trước.";
      } else {
        options = Object.keys(REGION_LIBRARY[state.addressForm.province]?.districts || {});
        manualLabel = "Nhập quận/huyện nếu chưa có trong danh sách";
        manualValue = state.addressForm.district || "";
      }
    }

    if (state.regionStage === "ward") {
      if (!state.addressForm.district) {
        emptyMessage = "Hãy chọn quận/huyện trước.";
      } else {
        options = REGION_LIBRARY[state.addressForm.province]?.districts?.[state.addressForm.district] || [];
        manualLabel = "Nhập phường/xã nếu chưa có trong danh sách";
        manualValue = state.addressForm.ward || "";
      }
    }

    if (emptyMessage) {
      refs.regionPickerPanel.innerHTML = `<div class="manual-wrap"><p class="field-help">${escapeHtml(emptyMessage)}</p></div>`;
      return;
    }

    const listHtml = options.length
      ? `
          <div class="region-list">
            ${options
              .map((option) => {
                const active = state.regionStage === "province"
                  ? state.addressForm.province === option
                  : state.regionStage === "district"
                  ? state.addressForm.district === option
                  : state.addressForm.ward === option;

                return `<button type="button" class="region-option ${active ? "active" : ""}" data-region-option="${escapeHtml(option)}">${escapeHtml(option)}</button>`;
              })
              .join("")}
          </div>
        `
      : "";

    const manualHtml =
      state.regionStage === "province"
        ? ""
        : `
          <div class="manual-wrap">
            <label class="field-help">${escapeHtml(manualLabel)}</label>
            <input id="manualRegionInput" class="manual-input" type="text" value="${escapeHtml(manualValue)}" placeholder="${state.regionStage === "district" ? "Nhập quận/huyện" : "Nhập phường/xã"}" />
            <button type="button" class="secondary-btn" data-use-manual-region>${state.regionStage === "district" ? "Dùng quận/huyện này" : "Dùng phường/xã này"}</button>
          </div>
        `;

    refs.regionPickerPanel.innerHTML = `${listHtml}${manualHtml}`;
  };

  const saveAddressFromModal = () => {
    state.addressForm.contact_name = refs.addressContactName.value.trim();
    state.addressForm.contact_phone = refs.addressContactPhone.value.trim();
    state.addressForm.detail = refs.addressDetail.value.trim();

    if (!isAddressComplete(state.addressForm)) {
      updatePageAlert("Bạn cần điền đủ họ tên, số điện thoại, khu vực và địa chỉ chi tiết.", "error");
      return;
    }

    setAddressByTarget(state.addressTarget, deepClone(state.addressForm));
    saveDraft();
    renderAddressCards();
    renderSummary();
    updatePageAlert("Đã lưu địa chỉ vào hồ sơ nháp.");
    closeAddressModal();
  };

  const handleRegionOptionClick = (value) => {
    if (state.regionStage === "province") {
      state.addressForm.province = value;
      state.addressForm.district = "";
      state.addressForm.ward = "";
      state.regionStage = "district";
    } else if (state.regionStage === "district") {
      state.addressForm.district = value;
      state.addressForm.ward = "";
      state.regionStage = "ward";
    } else {
      state.addressForm.ward = value;
    }

    renderAddressModalState();
  };

  const handleManualRegionUse = () => {
    const input = document.querySelector("#manualRegionInput");
    const value = input?.value.trim();
    if (!value) {
      updatePageAlert("Bạn chưa nhập giá trị khu vực thủ công.", "error");
      return;
    }

    if (state.regionStage === "district") {
      state.addressForm.district = value;
      state.addressForm.ward = "";
      state.regionStage = "ward";
    } else if (state.regionStage === "ward") {
      state.addressForm.ward = value;
    }

    renderAddressModalState();
  };

  const handleRefreshStatus = async () => {
    updatePageAlert();
    try {
      const payload = await StoreAuth.apiFetch("/shops/me", {}, { redirectOn401: true });
      const shop = payload.shops?.data?.[0] || null;
      if (!shop) {
        updatePageAlert("Hệ thống chưa tìm thấy hồ sơ trên server. Bạn có thể thử lại sau vài giây.", "error");
        return;
      }

      state.shop = shop;
      mergeShopIntoDraft(shop);
      setMode("status");
      renderAll();
      updatePageAlert("Đã tải lại trạng thái hồ sơ shop.");
    } catch (error) {
      updatePageAlert(error.message || "Không thể tải trạng thái hồ sơ.", "error");
    }
  };
  const bindEvents = () => {
    refs.startWizardBtn?.addEventListener("click", () => {
      updatePageAlert();
      openWizard(Math.min(state.draft.currentStep || 0, 3));
    });

    refs.resumeDraftBtn?.addEventListener("click", () => {
      updatePageAlert();
      openWizard(Math.min(state.draft.currentStep || 0, 3));
    });

    refs.prevStepBtn?.addEventListener("click", handlePrevStep);
    refs.nextStepBtn?.addEventListener("click", handleNextStep);
    refs.saveDraftBtn?.addEventListener("click", handleSaveDraft);
    refs.submitWizardBtn?.addEventListener("click", handleSubmit);
    refs.refreshStatusBtn?.addEventListener("click", handleRefreshStatus);

    refs.shopName?.addEventListener("input", () => {
      syncDraftFromForm();
      updateNameCount();
      saveDraft();
      renderSummary();
      renderProgress();
    });

    [
      refs.shopDescription,
      refs.contactPhone,
      refs.bankName,
      refs.accountHolder,
      refs.accountNumber,
      refs.businessName,
      refs.taxCode,
      refs.invoiceEmail,
      refs.identityNumber,
      refs.identityFullName,
      refs.contactEmail,
    ].forEach((input) => {
      input?.addEventListener("input", () => {
        syncDraftFromForm();
        saveDraft();
        renderSummary();
        renderProgress();
      });
    });

    [
      refs.shipExpress,
      refs.shipStandard,
      refs.shipEconomy,
      refs.shipSelfPickup,
      refs.identityConsent,
    ].forEach((input) => {
      input?.addEventListener("change", () => {
        syncDraftFromForm();
        saveDraft();
        renderSummary();
        renderProgress();
      });
    });

    document
      .querySelectorAll('input[name="businessType"], input[name="identityType"]')
      .forEach((input) => {
        input.addEventListener("change", () => {
          syncDraftFromForm();
          saveDraft();
          renderChoiceGroups();
          renderSummary();
          renderProgress();
        });
      });

    refs.addressOpenButtons.forEach((button) => {
      button.addEventListener("click", () => {
        updatePageAlert();
        openAddressModal(button.dataset.openAddress || "pickup");
      });
    });

    refs.closeAddressModalBtn?.addEventListener("click", closeAddressModal);
    refs.cancelAddressBtn?.addEventListener("click", closeAddressModal);
    refs.saveAddressBtn?.addEventListener("click", saveAddressFromModal);

    refs.addressModal?.addEventListener("click", (event) => {
      if (event.target === refs.addressModal) {
        closeAddressModal();
      }
    });

    refs.regionStageBtns.forEach((button) => {
      button.addEventListener("click", () => {
        const nextStage = button.dataset.regionStage;
        if (nextStage === "district" && !state.addressForm.province) {
          updatePageAlert("Hãy chọn tỉnh/thành phố trước.", "error");
          return;
        }
        if (nextStage === "ward" && !state.addressForm.district) {
          updatePageAlert("Hãy chọn quận/huyện trước.", "error");
          return;
        }

        state.regionStage = nextStage;
        renderAddressModalState();
      });
    });

    refs.regionPickerPanel?.addEventListener("click", (event) => {
      const regionButton = event.target.closest("[data-region-option]");
      if (regionButton) {
        handleRegionOptionClick(regionButton.dataset.regionOption || "");
        return;
      }

      if (event.target.closest("[data-use-manual-region]")) {
        handleManualRegionUse();
      }
    });

    refs.addressContactName?.addEventListener("input", () => {
      state.addressForm.contact_name = refs.addressContactName.value;
    });
    refs.addressContactPhone?.addEventListener("input", () => {
      state.addressForm.contact_phone = refs.addressContactPhone.value;
    });
    refs.addressDetail?.addEventListener("input", () => {
      state.addressForm.detail = refs.addressDetail.value;
      renderAddressModalState();
    });

    Object.entries(refs.uploadInputs).forEach(([docType, input]) => {
      input?.addEventListener("change", async (event) => {
        const files = Array.from(event.target.files || []);
        if (!files.length) return;
        await uploadFiles(docType, files);
      });
    });

    document.addEventListener("click", (event) => {
      const removeUpload = event.target.closest("[data-remove-upload]");
      if (removeUpload) {
        const docType = removeUpload.dataset.removeUpload;
        const index = Number(removeUpload.dataset.index);
        state.draft.uploads[docType] = (state.draft.uploads[docType] || []).filter(
          (_file, fileIndex) => fileIndex !== index
        );
        saveDraft();
        renderUploads(docType);
        renderSummary();
        renderProgress();
        return;
      }

      const statusAction = event.target.closest("[data-status-action='edit']");
      if (statusAction) {
        openWizard(0);
      }
    });
  };

  const init = async () => {
    bindEvents();
    renderAll();

    if (!StoreAuth?.getToken?.()) {
      setMode("login");
      renderAll();
      return;
    }

    try {
      const mePayload = await StoreAuth.apiFetch("/auth/me", {}, { redirectOn401: true });
      state.user = mePayload.user || null;
      prefillFromUser();
      saveDraft();
    } catch (error) {
      setMode("welcome");
      updatePageAlert(
        error.message || "Không thể tải thông tin tài khoản hiện tại.",
        "error"
      );
      renderAll();
      return;
    }

    try {
      const shopPayload = await StoreAuth.apiFetch("/shops/me", {}, { redirectOn401: true });
      state.shop = shopPayload.shops?.data?.[0] || null;
      if (state.shop) {
        mergeShopIntoDraft(state.shop);
      }
    } catch (error) {
      updatePageAlert(error.message || "Không thể tải trạng thái hồ sơ shop.", "error");
    }

    if (state.shop) {
      setMode("status");
    } else {
      setMode("welcome");
    }

    if (state.draft.currentStep >= 4) {
      state.draft.currentStep = 0;
    }

    renderAll();
  };

  init();
})();
