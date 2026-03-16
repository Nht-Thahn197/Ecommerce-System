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
    addressModalStatus: document.querySelector("#addressModalStatus"),
    regionPickerPanel: document.querySelector("#regionPickerPanel"),
    regionStageBtns: Array.from(document.querySelectorAll(".region-stage-btn")),
    addressDetail: document.querySelector("#addressDetail"),
    mapPreviewLabel: document.querySelector("#mapPreviewLabel"),
    addressMapFrame: document.querySelector("#addressMapFrame"),
    addressMapEmpty: document.querySelector("#addressMapEmpty"),
    addressMapLink: document.querySelector("#addressMapLink"),
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

  const LEGACY_DRAFT_KEY = "bambi_shop_wizard_draft_v2";
  const DRAFT_KEY_PREFIX = "bambi_shop_wizard_draft_v3";
  const DOC_LABELS = {
    business_license: "Giấy phép kinh doanh",
    identity_front: "Giấy tờ mặt trước",
    identity_selfie: "Ảnh chân dung cầm giấy tờ",
    identity_extra: "Tài liệu bổ sung",
  };

  const PROVINCE_FALLBACKS = [
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
  const PROVINCE_TREE_CACHE_KEY = "bambi_shop_province_tree_v1";
  const WARD_CACHE_PREFIX = "bambi_shop_ward_tree_v1";
  const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
  const ADDRESS_API_BASE = "https://provinces.open-api.vn/api/v1";

  const deepClone = (value) => JSON.parse(JSON.stringify(value));
  const emptyAddress = () => ({
    contact_name: "",
    contact_phone: "",
    province: "",
    province_code: "",
    district: "",
    district_code: "",
    ward: "",
    ward_code: "",
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
      ownerUserId: "",
      submittedAt: "",
    },
  });

  const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
  const getDraftKey = (userId) => `${DRAFT_KEY_PREFIX}:${userId}`;

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

  const readStoredDraft = (key) => {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  };

  const bindDraftToUser = (draft, userId) =>
    mergeDraft({
      ...draft,
      meta: {
        ...(draft?.meta || {}),
        ownerUserId: userId,
      },
    });

  const canUseLegacyDraftForUser = (draft, user) => {
    const userEmail = normalizeEmail(user?.email);
    if (!userEmail) return false;

    const draftEmails = [
      draft?.shopInfo?.contactEmail,
      draft?.tax?.invoiceEmail,
    ]
      .map(normalizeEmail)
      .filter(Boolean);

    return draftEmails.includes(userEmail);
  };

  const loadDraftForUser = (user) => {
    const userId = user?.id;
    if (!userId) return createDefaultDraft();

    const scopedDraft = readStoredDraft(getDraftKey(userId));
    if (scopedDraft) {
      return bindDraftToUser(scopedDraft, userId);
    }

    const legacyDraft = readStoredDraft(LEGACY_DRAFT_KEY);
    if (legacyDraft && canUseLegacyDraftForUser(legacyDraft, user)) {
      const migratedDraft = bindDraftToUser(legacyDraft, userId);
      localStorage.setItem(getDraftKey(userId), JSON.stringify(migratedDraft));
      localStorage.removeItem(LEGACY_DRAFT_KEY);
      return migratedDraft;
    }

    localStorage.removeItem(LEGACY_DRAFT_KEY);
    return bindDraftToUser(createDefaultDraft(), userId);
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

  const normalizeLookup = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const readCache = (key) => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.timestamp || !Array.isArray(parsed?.data)) return null;
      return {
        data: parsed.data,
        fresh: Date.now() - Number(parsed.timestamp) < CACHE_TTL_MS,
      };
    } catch (_error) {
      return null;
    }
  };

  const writeCache = (key, data) => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          timestamp: Date.now(),
          data,
        })
      );
    } catch (_error) {
      // Ignore cache write failures.
    }
  };

  const formatDivisionName = (name = "") => {
    let next = String(name || "").trim();
    if (!next) return "";
    if (next === "Thành phố Hồ Chí Minh") return "TP. Hồ Chí Minh";
    [
      /^Tỉnh\s+/i,
      /^Thành phố\s+/i,
      /^Quận\s+/i,
      /^Huyện\s+/i,
      /^Thị xã\s+/i,
      /^Thị trấn\s+/i,
      /^Phường\s+/i,
      /^Xã\s+/i,
    ].forEach((pattern) => {
      next = next.replace(pattern, "");
    });
    return next.trim();
  };

  const buildFallbackProvinceTree = () =>
    PROVINCE_FALLBACKS.map((province, index) => ({
      code: `fallback-p-${index}`,
      value: province,
      label: province,
      rawName: province,
      districts: [],
    }));

  const transformWardList = (wards = []) =>
    wards
      .map((ward) => ({
        code: String(ward.code || ""),
        value: formatDivisionName(ward.name),
        label: formatDivisionName(ward.name),
        rawName: ward.name || "",
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"));

  const transformProvinceTree = (items = []) =>
    items
      .map((province) => ({
        code: String(province.code || ""),
        value: formatDivisionName(province.name),
        label: formatDivisionName(province.name),
        rawName: province.name || "",
        districts: (province.districts || [])
          .map((district) => ({
            code: String(district.code || ""),
            value: formatDivisionName(district.name),
            label: formatDivisionName(district.name),
            rawName: district.name || "",
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "vi")),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "vi"));

  const fetchJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }
    return response.json();
  };

  const findRegionOption = (options = [], code = "", value = "") =>
    String(code || "").trim()
      ? options.find((item) => String(item.code || "") === String(code || "").trim()) || null
      : normalizeLookup(value)
      ? options.find((item) => normalizeLookup(item.value) === normalizeLookup(value)) || null
      : null;

  const getGoogleMapsEmbedKey = () =>
    String(
      window.BAMBI_GOOGLE_MAPS_EMBED_KEY ||
        document.querySelector('meta[name="google-maps-embed-key"]')?.content ||
        ""
    ).trim();

  const getGoogleMapsEmbedUrl = (query) =>
    getGoogleMapsEmbedKey()
      ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
          getGoogleMapsEmbedKey()
        )}&q=${encodeURIComponent(query)}`
      : `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;

  const getGoogleMapsSearchUrl = (query) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

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
    draft: createDefaultDraft(),
    currentStep: 0,
    user: null,
    shop: null,
    mode: "init",
    addressTarget: "pickup",
    addressForm: emptyAddress(),
    regionStage: "province",
    regionRequestId: 0,
    mapTimer: 0,
    location: {
      provinceTree: null,
      provinceTreePromise: null,
      wardCache: {},
      wardPromises: {},
      source: "unknown",
    },
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
    const userId = state.user?.id;
    if (!userId) return;

    state.draft = bindDraftToUser(state.draft, userId);
    localStorage.setItem(getDraftKey(userId), JSON.stringify(state.draft));
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

  const updateAddressModalStatus = (message = "", type = "info") => {
    if (!refs.addressModalStatus) return;
    if (!message) {
      refs.addressModalStatus.textContent = "";
      refs.addressModalStatus.classList.add("hidden");
      refs.addressModalStatus.classList.remove("error");
      return;
    }

    refs.addressModalStatus.textContent = message;
    refs.addressModalStatus.classList.remove("hidden");
    refs.addressModalStatus.classList.toggle("error", type === "error");
  };

  const resetAddressMapPreview = (message) => {
    if (refs.mapPreviewLabel) {
      refs.mapPreviewLabel.textContent =
        message || "Chọn khu vực và nhập địa chỉ chi tiết để xem bản đồ thật từ Google Maps.";
    }
    if (refs.addressMapFrame) {
      refs.addressMapFrame.hidden = true;
      refs.addressMapFrame.removeAttribute("src");
    }
    if (refs.addressMapEmpty) {
      refs.addressMapEmpty.hidden = false;
    }
    if (refs.addressMapLink) {
      refs.addressMapLink.hidden = true;
      refs.addressMapLink.href = "https://www.google.com/maps";
    }
  };

  const updateAddressMapPreview = (address = state.addressForm) => {
    const previewText =
      buildAddressText(address) ||
      "Chọn khu vực và nhập địa chỉ chi tiết để xem bản đồ thật từ Google Maps.";
    if (refs.mapPreviewLabel) {
      refs.mapPreviewLabel.textContent = previewText;
    }

    if (!refs.addressMapFrame || !refs.addressMapEmpty || !refs.addressMapLink) return;

    const query = [address.detail, address.ward, address.district, address.province, "Việt Nam"]
      .filter(Boolean)
      .join(", ");
    const visible = Boolean(address.province && address.district && address.detail);

    refs.addressMapEmpty.hidden = visible;
    refs.addressMapFrame.hidden = !visible;
    refs.addressMapLink.hidden = !visible;

    if (!visible) {
      refs.addressMapFrame.removeAttribute("src");
      refs.addressMapLink.href = "https://www.google.com/maps";
      return;
    }

    refs.addressMapFrame.src = getGoogleMapsEmbedUrl(query);
    refs.addressMapLink.href = getGoogleMapsSearchUrl(query);
  };

  const scheduleAddressMapUpdate = () => {
    if (state.mapTimer) {
      window.clearTimeout(state.mapTimer);
    }
    state.mapTimer = window.setTimeout(() => {
      updateAddressMapPreview();
    }, 180);
  };

  const loadProvinceTree = async () => {
    if (state.location.provinceTree?.length) {
      return state.location.provinceTree;
    }

    if (state.location.provinceTreePromise) {
      return state.location.provinceTreePromise;
    }

    state.location.provinceTreePromise = (async () => {
      const cached = readCache(PROVINCE_TREE_CACHE_KEY);
      if (cached?.fresh) {
        state.location.source = "cache";
        state.location.provinceTree = cached.data;
        return cached.data;
      }

      try {
        const provinceTree = transformProvinceTree(
          await fetchJson(`${ADDRESS_API_BASE}/?depth=2`)
        );
        state.location.source = "api";
        state.location.provinceTree = provinceTree;
        writeCache(PROVINCE_TREE_CACHE_KEY, provinceTree);
        return provinceTree;
      } catch (_error) {
        if (cached?.data?.length) {
          state.location.source = "cache";
          state.location.provinceTree = cached.data;
          return cached.data;
        }

        const fallback = buildFallbackProvinceTree();
        state.location.source = "fallback";
        state.location.provinceTree = fallback;
        return fallback;
      } finally {
        state.location.provinceTreePromise = null;
      }
    })();

    return state.location.provinceTreePromise;
  };

  const getDistrictOptions = (provinceCode, provinceValue) =>
    findRegionOption(state.location.provinceTree || [], provinceCode, provinceValue)?.districts || [];

  const loadWards = async (districtCode, districtValue = "") => {
    const cacheKey = `${WARD_CACHE_PREFIX}:${districtCode || districtValue}`;
    if (districtCode && state.location.wardCache[districtCode]) {
      return state.location.wardCache[districtCode];
    }

    const cached = readCache(cacheKey);
    if (cached?.fresh) {
      if (districtCode) {
        state.location.wardCache[districtCode] = cached.data;
      }
      return cached.data;
    }

    if (!districtCode || String(districtCode).startsWith("fallback-")) {
      return cached?.data || [];
    }

    if (state.location.wardPromises[districtCode]) {
      return state.location.wardPromises[districtCode];
    }

    state.location.wardPromises[districtCode] = (async () => {
      try {
        const data = await fetchJson(`${ADDRESS_API_BASE}/d/${districtCode}?depth=2`);
        const wards = transformWardList(data?.wards || []);
        state.location.wardCache[districtCode] = wards;
        writeCache(cacheKey, wards);
        return wards;
      } catch (_error) {
        if (cached?.data?.length) {
          state.location.wardCache[districtCode] = cached.data;
          return cached.data;
        }
        return [];
      } finally {
        delete state.location.wardPromises[districtCode];
      }
    })();

    return state.location.wardPromises[districtCode];
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
        province_code: "",
        district: address.district || merged.shopInfo.pickupAddress.district,
        district_code: "",
        ward: address.ward || merged.shopInfo.pickupAddress.ward,
        ward_code: "",
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
        province_code: "",
        district: taxAddress.district || merged.tax.taxAddress.district,
        district_code: "",
        ward: taxAddress.ward || merged.tax.taxAddress.ward,
        ward_code: "",
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

  const openAddressModal = async (target) => {
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

    updateAddressModalStatus("Đang tải dữ liệu khu vực...");
    resetAddressMapPreview();
    refs.addressModal.classList.remove("hidden");
    refs.addressModal.setAttribute("aria-hidden", "false");
    await renderAddressModalState();
  };

  const closeAddressModal = () => {
    if (state.mapTimer) {
      window.clearTimeout(state.mapTimer);
      state.mapTimer = 0;
    }
    updateAddressModalStatus();
    refs.addressModal.classList.add("hidden");
    refs.addressModal.setAttribute("aria-hidden", "true");
  };

  const renderAddressModalState = async () => {
    refs.addressRegionPreview.textContent =
      buildAddressRegionText(state.addressForm) || "Chưa chọn khu vực";

    refs.regionStageBtns.forEach((button) => {
      button.classList.toggle("active", button.dataset.regionStage === state.regionStage);
    });

    updateAddressMapPreview(state.addressForm);
    await renderRegionPanel();
  };

  const renderRegionPanel = async () => {
    const requestId = ++state.regionRequestId;
    refs.regionPickerPanel.innerHTML =
      '<div class="region-loading"><p class="field-help">Đang tải danh sách khu vực...</p></div>';

    let options = [];
    let manualLabel = "";
    let manualValue = "";
    let emptyMessage = "";

    const provinceTree = await loadProvinceTree();
    if (requestId !== state.regionRequestId) return;

    if (state.location.source === "fallback") {
      updateAddressModalStatus(
        "Không tải được dữ liệu địa giới đầy đủ từ API. Bạn vẫn có thể chọn tỉnh/thành phố và nhập quận/huyện, phường/xã thủ công.",
        "info"
      );
    } else {
      updateAddressModalStatus();
    }

    if (state.regionStage === "province") {
      options = provinceTree;
    }

    if (state.regionStage === "district") {
      if (!state.addressForm.province) {
        emptyMessage = "Hãy chọn tỉnh/thành phố trước.";
      } else {
        options = getDistrictOptions(
          state.addressForm.province_code,
          state.addressForm.province
        );
        manualLabel = options.length
          ? "Không thấy quận/huyện phù hợp? Nhập thủ công bên dưới"
          : "API chưa trả về quận/huyện cho tỉnh này. Bạn có thể nhập thủ công.";
        manualValue = state.addressForm.district || "";
      }
    }

    if (state.regionStage === "ward") {
      if (!state.addressForm.district) {
        emptyMessage = "Hãy chọn quận/huyện trước.";
      } else {
        options = await loadWards(
          state.addressForm.district_code,
          state.addressForm.district
        );
        if (requestId !== state.regionRequestId) return;
        manualLabel = options.length
          ? "Không thấy phường/xã phù hợp? Nhập thủ công bên dưới"
          : "API chưa trả về phường/xã cho quận/huyện này. Bạn có thể nhập thủ công.";
        manualValue = state.addressForm.ward || "";
      }
    }

    if (emptyMessage) {
      refs.regionPickerPanel.innerHTML = `<div class="region-empty-state"><p class="field-help">${escapeHtml(
        emptyMessage
      )}</p></div>`;
      return;
    }

    const listHtml = options.length
      ? `
          <div class="region-list">
            ${options
              .map((option) => {
                const active =
                  state.regionStage === "province"
                    ? Boolean(
                        option.code && state.addressForm.province_code
                          ? state.addressForm.province_code === option.code
                          : normalizeLookup(state.addressForm.province) ===
                            normalizeLookup(option.value)
                      )
                    : state.regionStage === "district"
                    ? Boolean(
                        option.code && state.addressForm.district_code
                          ? state.addressForm.district_code === option.code
                          : normalizeLookup(state.addressForm.district) ===
                            normalizeLookup(option.value)
                      )
                    : Boolean(
                        option.code && state.addressForm.ward_code
                          ? state.addressForm.ward_code === option.code
                          : normalizeLookup(state.addressForm.ward) ===
                            normalizeLookup(option.value)
                      );

                return `<button type="button" class="region-option ${active ? "active" : ""}" data-region-code="${escapeHtml(
                  option.code || ""
                )}" data-region-value="${escapeHtml(option.value)}">${escapeHtml(
                  option.label || option.value
                )}</button>`;
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
            <input id="manualRegionInput" class="manual-input" type="text" value="${escapeHtml(
              manualValue
            )}" placeholder="${
              state.regionStage === "district" ? "Nhập quận/huyện" : "Nhập phường/xã"
            }" />
            <button type="button" class="secondary-btn" data-use-manual-region>${
              state.regionStage === "district" ? "Dùng quận/huyện này" : "Dùng phường/xã này"
            }</button>
          </div>
        `;

    refs.regionPickerPanel.innerHTML =
      listHtml || manualHtml
        ? `${listHtml}${manualHtml}`
        : '<div class="region-empty-state"><p class="field-help">Chưa có dữ liệu khu vực phù hợp.</p></div>';
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

  const handleRegionOptionClick = (code, value) => {
    if (state.regionStage === "province") {
      state.addressForm.province = value;
      state.addressForm.province_code = code || "";
      state.addressForm.district = "";
      state.addressForm.district_code = "";
      state.addressForm.ward = "";
      state.addressForm.ward_code = "";
      state.regionStage = "district";
    } else if (state.regionStage === "district") {
      state.addressForm.district = value;
      state.addressForm.district_code = code || "";
      state.addressForm.ward = "";
      state.addressForm.ward_code = "";
      state.regionStage = "ward";
    } else {
      state.addressForm.ward = value;
      state.addressForm.ward_code = code || "";
    }

    void renderAddressModalState();
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
      state.addressForm.district_code = "";
      state.addressForm.ward = "";
      state.addressForm.ward_code = "";
      state.regionStage = "ward";
    } else if (state.regionStage === "ward") {
      state.addressForm.ward = value;
      state.addressForm.ward_code = "";
    }

    void renderAddressModalState();
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
        void openAddressModal(button.dataset.openAddress || "pickup");
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
        void renderAddressModalState();
      });
    });

    refs.regionPickerPanel?.addEventListener("click", (event) => {
      const regionButton = event.target.closest("[data-region-value]");
      if (regionButton) {
        handleRegionOptionClick(
          regionButton.dataset.regionCode || "",
          regionButton.dataset.regionValue || ""
        );
        return;
      }

      if (event.target.closest("[data-use-manual-region]")) {
        handleManualRegionUse();
      }
    });

    refs.regionPickerPanel?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.target.id !== "manualRegionInput") return;
      event.preventDefault();
      handleManualRegionUse();
    });

    refs.addressContactName?.addEventListener("input", () => {
      state.addressForm.contact_name = refs.addressContactName.value;
    });
    refs.addressContactPhone?.addEventListener("input", () => {
      state.addressForm.contact_phone = refs.addressContactPhone.value;
    });
    refs.addressDetail?.addEventListener("input", () => {
      state.addressForm.detail = refs.addressDetail.value;
      scheduleAddressMapUpdate();
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
      state.draft = loadDraftForUser(state.user);
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
      const shops = shopPayload.shops?.data || [];
      state.shop = shops.find((shop) => shop?.status === "approved") || shops[0] || null;
      if (state.shop) {
        mergeShopIntoDraft(state.shop);
        if (state.shop.status === "approved") {
          window.location.href = "/ui/seller/";
          return;
        }
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
