const refs = {
  profileStatus: document.querySelector("#profileStatus"),
  profileName: document.querySelector("#profileName"),
  profileEmail: document.querySelector("#profileEmail"),
  profilePhone: document.querySelector("#profilePhone"),
  profileBirth: document.querySelector("#profileBirth"),
  avatarInput: document.querySelector("#avatarInput"),
  avatarButton: document.querySelector("#avatarButton"),
  avatarPreview: document.querySelector("#avatarPreview"),
  avatarLabel: document.querySelector("#avatarLabel"),
  saveProfile: document.querySelector("#saveProfile"),
  navLinks: [...document.querySelectorAll("[data-account-nav]")],
  panels: [...document.querySelectorAll("[data-account-panel]")],
  addressStatus: document.querySelector("#addressStatus"),
  addressList: document.querySelector("#addressList"),
  openAddressModalBtn: document.querySelector("#openAddressModalBtn"),
  addressModal: document.querySelector("#addressModal"),
  addressModalTitle: document.querySelector("#addressModalTitle"),
  addressModalStatus: document.querySelector("#addressModalStatus"),
  closeAddressModalBtn: document.querySelector("#closeAddressModalBtn"),
  cancelAddressBtn: document.querySelector("#cancelAddressBtn"),
  addressForm: document.querySelector("#addressForm"),
  addressContactName: document.querySelector("#addressContactName"),
  addressContactPhone: document.querySelector("#addressContactPhone"),
  addressProvince: document.querySelector("#addressProvince"),
  addressDistrict: document.querySelector("#addressDistrict"),
  addressWard: document.querySelector("#addressWard"),
  addressDetail: document.querySelector("#addressDetail"),
  addressIsDefault: document.querySelector("#addressIsDefault"),
  addressTypeButtons: [...document.querySelectorAll("[data-address-type]")],
  addressMapFrame: document.querySelector("#addressMapFrame"),
  addressMapEmpty: document.querySelector("#addressMapEmpty"),
  addressMapLink: document.querySelector("#addressMapLink"),
};

const StoreAuth = window.BambiStoreAuth;
const ADDRESS_STORAGE_PREFIX = "bambi_customer_addresses_v2";
const PROVINCE_TREE_CACHE_KEY = "bambi_vn_legacy_province_tree_v1";
const WARD_CACHE_PREFIX = "bambi_vn_legacy_wards_v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
const ADDRESS_API_BASE = "https://provinces.open-api.vn/api/v1";
const FALLBACK_REGION_LIBRARY = {
  "Hà Nội": { districts: { "Ba Đình": ["Điện Biên", "Kim Mã", "Liễu Giai", "Ngọc Hà", "Phúc Xá"], "Cầu Giấy": ["Dịch Vọng", "Dịch Vọng Hậu", "Mai Dịch", "Nghĩa Đô", "Yên Hòa"], "Hà Đông": ["Biên Giang", "Dương Nội", "Hà Cầu", "Kiến Hưng", "Mộ Lao", "Phú La", "Văn Quán", "Yên Nghĩa"], "Long Biên": ["Bồ Đề", "Gia Thụy", "Ngọc Lâm", "Ngọc Thụy", "Việt Hưng"], "Nam Từ Liêm": ["Cầu Diễn", "Mễ Trì", "Mỹ Đình 1", "Mỹ Đình 2", "Tây Mỗ"] } },
  "TP. Hồ Chí Minh": { districts: { "Quận 1": ["Bến Nghé", "Bến Thành", "Cầu Kho", "Đa Kao", "Nguyễn Cư Trinh"], "Quận 3": ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5"], "Quận 7": ["Bình Thuận", "Phú Mỹ", "Phú Thuận", "Tân Hưng", "Tân Kiểng"], "Bình Thạnh": ["Phường 11", "Phường 12", "Phường 13", "Phường 14", "Phường 25"], "Thủ Đức": ["An Khánh", "Bình Thọ", "Cát Lái", "Thảo Điền", "Trường Thọ"] } },
  "Đà Nẵng": { districts: { "Hải Châu": ["Bình Hiên", "Hải Châu 1", "Hải Châu 2", "Hòa Cường Bắc", "Hòa Cường Nam"], "Thanh Khê": ["An Khê", "Chính Gián", "Tam Thuận", "Tân Chính", "Thạc Gián"], "Sơn Trà": ["An Hải Bắc", "An Hải Đông", "Mân Thái", "Nại Hiên Đông", "Phước Mỹ"], "Ngũ Hành Sơn": ["Hòa Hải", "Hòa Quý", "Khuê Mỹ", "Mỹ An"] } },
  "Hải Phòng": { districts: { "Lê Chân": ["An Biên", "An Dương", "Cát Dài", "Dư Hàng", "Lam Sơn"], "Ngô Quyền": ["Cầu Đất", "Đằng Giang", "Đông Khê", "Lạc Viên", "Lê Lợi"], "Hải An": ["Cát Bi", "Đằng Hải", "Đằng Lâm", "Đông Hải 1", "Thành Tô"] } },
  "Cần Thơ": { districts: { "Ninh Kiều": ["An Bình", "An Cư", "An Hòa", "An Khánh", "Tân An"], "Bình Thủy": ["An Thới", "Bình Thủy", "Long Hòa", "Long Tuyền", "Thới An Đông"], "Cái Răng": ["Ba Láng", "Hưng Phú", "Hưng Thạnh", "Lê Bình", "Phú Thứ"] } },
  "An Giang": { districts: { "Long Xuyên": ["Bình Đức", "Bình Khánh", "Đông Xuyên", "Mỹ Bình", "Mỹ Hòa"], "Châu Đốc": ["Châu Phú A", "Châu Phú B", "Núi Sam", "Vĩnh Mỹ", "Vĩnh Nguơn"], "Tân Châu": ["Long Hưng", "Long Sơn", "Long Thạnh", "Long Châu", "Long Phú"] } },
  "Bình Dương": { districts: { "Thủ Dầu Một": ["Chánh Mỹ", "Định Hòa", "Hiệp An", "Hiệp Thành", "Phú Cường"], "Thuận An": ["An Phú", "Bình Chuẩn", "Lái Thiêu", "Thuận Giao", "Vĩnh Phú"], "Dĩ An": ["An Bình", "Bình An", "Đông Hòa", "Tân Bình", "Tân Đông Hiệp"] } },
  "Bắc Ninh": { districts: { "Bắc Ninh": ["Đại Phúc", "Hạp Lĩnh", "Kinh Bắc", "Ninh Xá", "Vệ An"], "Từ Sơn": ["Châu Khê", "Đình Bảng", "Đồng Kỵ", "Tân Hồng", "Trang Hạ"], "Quế Võ": ["Phố Mới", "Việt Hùng", "Bằng An", "Nhân Hòa", "Phù Lãng"] } },
};

const state = { currentUser: null, activeView: "profile", addresses: [], editingAddressId: null, mapTimer: 0, location: { source: "api", provinceTree: null, provinceTreePromise: null, wardCache: {}, wardPromises: {}, syncRequestId: 0 } };

const setStatus = (el, msg, type = "info") => {
  if (!el) return;
  if (!msg) { el.style.display = "none"; el.textContent = ""; el.className = "status"; return; }
  el.style.display = "block"; el.textContent = msg; el.className = `status ${type === "error" ? "error" : ""}`;
};
const setProfileStatus = (m, t) => setStatus(refs.profileStatus, m, t);
const setAddressStatus = (m, t) => setStatus(refs.addressStatus, m, t);
const setAddressModalStatus = (m, t) => setStatus(refs.addressModalStatus, m, t);
const escapeHtml = (v) => String(v || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const normalizeLookup = (v) => String(v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const readCache = (key) => { try { const raw = localStorage.getItem(key); if (!raw) return null; const parsed = JSON.parse(raw); if (!parsed?.timestamp || !parsed?.data) return null; return { data: parsed.data, source: parsed.source || "cache", fresh: Date.now() - Number(parsed.timestamp) < CACHE_TTL_MS }; } catch (_e) { return null; } };
const writeCache = (key, data, source = "api") => { try { localStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), source, data })); } catch (_e) {} };
const refreshCustomSelect = (select) => { if (!select) return; select.dispatchEvent(new Event("bambi:custom-select-sync")); window.BambiCustomSelect?.refreshSelect(select); };
const getGenderValue = () => document.querySelector('input[name="gender"]:checked')?.value || null;
const setGenderValue = (value) => {
  document.querySelectorAll('input[name="gender"]').forEach((input) => (input.checked = false));
  if (!value) return;
  const input = document.querySelector(`input[name="gender"][value="${value}"]`);
  if (input) input.checked = true;
};
const updateAvatarPreview = (url) => { if (!refs.avatarPreview) return; refs.avatarPreview.src = url || ""; refs.avatarPreview.style.display = url ? "block" : "none"; if (refs.avatarLabel) refs.avatarLabel.style.display = url ? "none" : "block"; };
const ensureAuth = () => (StoreAuth?.getToken() ? true : (StoreAuth?.redirectToLogin(), false));
const getViewFromHash = () => (window.location.hash === "#addresses" ? "addresses" : "profile");
const setActiveView = (view, syncHash = false) => {
  state.activeView = view === "addresses" ? "addresses" : "profile";
  refs.navLinks.forEach((link) => link.classList.toggle("active", link.dataset.accountNav === state.activeView));
  refs.panels.forEach((panel) => { panel.hidden = panel.dataset.accountPanel !== state.activeView; });
  if (syncHash) { const nextHash = state.activeView === "addresses" ? "#addresses" : "#profile"; if (window.location.hash !== nextHash) window.history.replaceState(null, "", nextHash); }
};
const getAddressStorageKey = () => `${ADDRESS_STORAGE_PREFIX}:${state.currentUser?.id || state.currentUser?.email || state.currentUser?.phone || "anonymous"}`;
const createAddressDraft = () => ({ id: "", contact_name: state.currentUser?.full_name || "", contact_phone: state.currentUser?.phone || "", province: "", province_code: "", district: "", district_code: "", ward: "", ward_code: "", detail: "", address_type: "home", is_default: state.addresses.length === 0 });
const generateAddressId = () => `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const ensureDefaultAddress = (items) => !items.length ? [] : items.map((item) => ({ ...item, is_default: item.id === (items.find((x) => x.is_default)?.id || items[0].id) }));
const loadAddresses = () => {
  if (!state.currentUser) return;
  try {
    const parsed = JSON.parse(localStorage.getItem(getAddressStorageKey()) || "[]");
    state.addresses = ensureDefaultAddress(Array.isArray(parsed) ? parsed.map((item) => ({ id: item.id || generateAddressId(), contact_name: item.contact_name || "", contact_phone: item.contact_phone || "", province: item.province || "", province_code: item.province_code || "", district: item.district || "", district_code: item.district_code || "", ward: item.ward || "", ward_code: item.ward_code || "", detail: item.detail || "", address_type: item.address_type === "office" ? "office" : "home", is_default: Boolean(item.is_default) })) : []);
  } catch (_e) { state.addresses = []; }
};
const persistAddresses = () => { if (state.currentUser) localStorage.setItem(getAddressStorageKey(), JSON.stringify(state.addresses)); };
const buildAddressText = (address = {}) => [address.detail, address.ward, address.district, address.province].filter(Boolean).join(", ");
const getAddressTypeLabel = (type) => (type === "office" ? "Văn phòng" : "Nhà riêng");
const getSelectedOptionMeta = (select) => { const option = select?.selectedOptions?.[0]; return { value: option?.value || "", code: option?.dataset.code || "", rawName: option?.dataset.rawName || option?.value || "", divisionType: option?.dataset.divisionType || "" }; };
const findOptionMatch = (options, code, value) => String(code || "").trim() ? (options.find((o) => String(o.code || "") === String(code || "").trim()) || null) : (normalizeLookup(value) ? options.find((o) => normalizeLookup(o.value) === normalizeLookup(value)) || null : null);
const populateSelect = (element, options, placeholder, selected = {}) => {
  if (!element) return;
  element.innerHTML = "";
  const base = new Option(placeholder, "");
  base.dataset.code = ""; base.dataset.rawName = ""; base.dataset.divisionType = "";
  element.append(base);
  options.forEach((option) => { const item = new Option(option.label || option.value, option.value); item.dataset.code = String(option.code || ""); item.dataset.rawName = option.rawName || option.value || ""; item.dataset.divisionType = option.divisionType || ""; element.append(item); });
  const matched = findOptionMatch(options, selected.code, selected.value);
  element.value = matched ? matched.value : "";
  refreshCustomSelect(element);
};
const setSelectLoadingState = (element, message) => { populateSelect(element, [], message, {}); element.disabled = true; refreshCustomSelect(element); };
const formatDivisionName = (name = "") => {
  let next = String(name || "").trim();
  if (!next) return "";
  if (next === "Thành phố Hồ Chí Minh") return "TP. Hồ Chí Minh";
  [/^Tỉnh\s+/i, /^Thành phố\s+/i, /^Quận\s+/i, /^Huyện\s+/i, /^Thị xã\s+/i, /^Thị trấn\s+/i, /^Phường\s+/i, /^Xã\s+/i].forEach((pattern) => { next = next.replace(pattern, ""); });
  return next.trim();
};
const transformWardList = (wards = []) => wards.map((ward) => ({ code: ward.code, value: formatDivisionName(ward.name), label: formatDivisionName(ward.name), rawName: ward.name || "", divisionType: ward.division_type || "" })).sort((a, b) => a.label.localeCompare(b.label, "vi"));
const transformProvinceTree = (items = []) => items.map((province) => ({ code: province.code, value: formatDivisionName(province.name), label: formatDivisionName(province.name), rawName: province.name || "", divisionType: province.division_type || "", districts: (province.districts || []).map((district) => ({ code: district.code, value: formatDivisionName(district.name), label: formatDivisionName(district.name), rawName: district.name || "", divisionType: district.division_type || "", wards: [] })).sort((a, b) => a.label.localeCompare(b.label, "vi")) })).sort((a, b) => a.label.localeCompare(b.label, "vi"));
const buildFallbackProvinceTree = () => Object.entries(FALLBACK_REGION_LIBRARY).map(([provinceName, province], pi) => ({ code: `fallback-p-${pi}`, value: provinceName, label: provinceName, rawName: provinceName, divisionType: "", districts: Object.entries(province.districts).map(([districtName, wards], di) => ({ code: `fallback-d-${pi}-${di}`, value: districtName, label: districtName, rawName: districtName, divisionType: "", wards: wards.map((wardName, wi) => ({ code: `fallback-w-${pi}-${di}-${wi}`, value: wardName, label: wardName, rawName: wardName, divisionType: "" })) })) }));
const fetchJson = async (url) => { const response = await fetch(url); if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`); return response.json(); };
const loadProvinceTree = async () => {
  if (state.location.provinceTree?.length) return state.location.provinceTree;
  if (state.location.provinceTreePromise) return state.location.provinceTreePromise;
  state.location.provinceTreePromise = (async () => {
    const cached = readCache(PROVINCE_TREE_CACHE_KEY);
    if (cached?.fresh) { state.location.source = cached.source || "cache"; state.location.provinceTree = cached.data; return cached.data; }
    try {
      const provinceTree = transformProvinceTree(await fetchJson(`${ADDRESS_API_BASE}/?depth=2`));
      state.location.source = "api"; state.location.provinceTree = provinceTree; writeCache(PROVINCE_TREE_CACHE_KEY, provinceTree, "api"); return provinceTree;
    } catch (_e) {
      if (cached?.data?.length) { state.location.source = "cache"; state.location.provinceTree = cached.data; return cached.data; }
      const fallback = buildFallbackProvinceTree(); state.location.source = "fallback"; state.location.provinceTree = fallback; return fallback;
    } finally { state.location.provinceTreePromise = null; }
  })();
  return state.location.provinceTreePromise;
};
const getDistrictOptions = (provinceCode, provinceValue) => (findOptionMatch(state.location.provinceTree || [], provinceCode, provinceValue)?.districts || []);
const getFallbackWards = (districtCode, districtValue) => {
  for (const province of state.location.provinceTree || []) {
    const district = province.districts?.find((item) => String(item.code || "") === String(districtCode || "") || normalizeLookup(item.value) === normalizeLookup(districtValue));
    if (district?.wards?.length) return district.wards;
  }
  return [];
};
const loadWards = async (districtCode, districtValue = "") => {
  const cacheKey = `${WARD_CACHE_PREFIX}:${districtCode || districtValue}`;
  if (districtCode && state.location.wardCache[districtCode]) return state.location.wardCache[districtCode];
  const cached = readCache(cacheKey);
  if (cached?.fresh && Array.isArray(cached.data)) { if (districtCode) state.location.wardCache[districtCode] = cached.data; return cached.data; }
  if (districtCode && state.location.wardPromises[districtCode]) return state.location.wardPromises[districtCode];
  if (!districtCode || String(districtCode).startsWith("fallback-")) return getFallbackWards(districtCode, districtValue);
  state.location.wardPromises[districtCode] = (async () => {
    try {
      const wards = transformWardList((await fetchJson(`${ADDRESS_API_BASE}/d/${districtCode}?depth=2`)).wards || []);
      state.location.wardCache[districtCode] = wards; writeCache(cacheKey, wards, "api"); return wards;
    } catch (_e) {
      if (cached?.data?.length) { state.location.wardCache[districtCode] = cached.data; return cached.data; }
      return getFallbackWards(districtCode, districtValue);
    } finally { delete state.location.wardPromises[districtCode]; }
  })();
  return state.location.wardPromises[districtCode];
};
const getGoogleMapsEmbedKey = () => String(window.BAMBI_GOOGLE_MAPS_EMBED_KEY || document.querySelector('meta[name="google-maps-embed-key"]')?.content || "").trim();
const getGoogleMapsEmbedUrl = (query) => getGoogleMapsEmbedKey() ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(getGoogleMapsEmbedKey())}&q=${encodeURIComponent(query)}` : `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
const getGoogleMapsSearchUrl = (query) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
const getAddressPreviewFromForm = () => ({ detail: refs.addressDetail.value.trim(), ward: getSelectedOptionMeta(refs.addressWard).value, district: getSelectedOptionMeta(refs.addressDistrict).value, province: getSelectedOptionMeta(refs.addressProvince).value });
const updateMapPreview = (address = getAddressPreviewFromForm()) => {
  if (!refs.addressMapFrame || !refs.addressMapEmpty || !refs.addressMapLink) return;
  const query = [address.detail, address.ward, address.district, address.province, "Việt Nam"].filter(Boolean).join(", ");
  const visible = Boolean(address.province && address.district);
  refs.addressMapEmpty.hidden = visible; refs.addressMapFrame.hidden = !visible; refs.addressMapLink.hidden = !visible;
  if (!visible) { refs.addressMapFrame.removeAttribute("src"); refs.addressMapLink.href = "https://www.google.com/maps"; return; }
  refs.addressMapFrame.src = getGoogleMapsEmbedUrl(query); refs.addressMapLink.href = getGoogleMapsSearchUrl(query);
};
const scheduleMapUpdate = () => { if (state.mapTimer) window.clearTimeout(state.mapTimer); state.mapTimer = window.setTimeout(() => updateMapPreview(), 220); };
const resetRegionSelects = () => { setSelectLoadingState(refs.addressProvince, "Chọn tỉnh/thành phố"); setSelectLoadingState(refs.addressDistrict, "Chọn quận/huyện"); setSelectLoadingState(refs.addressWard, "Chọn phường/xã"); };
const syncRegionFields = async ({ provinceCode = "", provinceValue = "", districtCode = "", districtValue = "", wardCode = "", wardValue = "" } = {}) => {
  const requestId = ++state.location.syncRequestId;
  setSelectLoadingState(refs.addressProvince, "Đang tải tỉnh/thành phố...");
  setSelectLoadingState(refs.addressDistrict, "Chọn quận/huyện");
  setSelectLoadingState(refs.addressWard, "Chọn phường/xã");
  try {
    const provinceTree = await loadProvinceTree();
    if (requestId !== state.location.syncRequestId) return;
    populateSelect(refs.addressProvince, provinceTree, "Chọn tỉnh/thành phố", { code: provinceCode, value: provinceValue }); refs.addressProvince.disabled = false; refreshCustomSelect(refs.addressProvince);
    if (state.location.source === "fallback") setAddressModalStatus("Không tải được dữ liệu địa giới đầy đủ từ API. Đang dùng dữ liệu dự phòng trong dự án.", "info"); else if (!refs.addressModalStatus.classList.contains("error")) setAddressModalStatus("");
    const province = getSelectedOptionMeta(refs.addressProvince);
    const districts = getDistrictOptions(province.code, province.value);
    populateSelect(refs.addressDistrict, districts, "Chọn quận/huyện", { code: districtCode, value: districtValue }); refs.addressDistrict.disabled = !districts.length; refreshCustomSelect(refs.addressDistrict);
    if (!districts.length) { populateSelect(refs.addressWard, [], "Chọn phường/xã", {}); refs.addressWard.disabled = true; refreshCustomSelect(refs.addressWard); updateMapPreview(); return; }
    const district = getSelectedOptionMeta(refs.addressDistrict);
    if (!district.code && !district.value) { populateSelect(refs.addressWard, [], "Chọn phường/xã", {}); refs.addressWard.disabled = true; refreshCustomSelect(refs.addressWard); updateMapPreview(); return; }
    setSelectLoadingState(refs.addressWard, "Đang tải phường/xã...");
    const wards = await loadWards(district.code, district.value);
    if (requestId !== state.location.syncRequestId) return;
    populateSelect(refs.addressWard, wards, wards.length ? "Chọn phường/xã" : "Không có phường/xã khả dụng", { code: wardCode, value: wardValue }); refs.addressWard.disabled = !wards.length; refreshCustomSelect(refs.addressWard); updateMapPreview();
  } catch (_e) {
    if (requestId !== state.location.syncRequestId) return;
    setAddressModalStatus("Không tải được dữ liệu hành chính. Vui lòng kiểm tra mạng rồi thử lại.", "error");
    resetRegionSelects(); updateMapPreview();
  }
};
const setAddressType = (type) => refs.addressTypeButtons.forEach((button) => button.classList.toggle("active", button.dataset.addressType === type));
const fillAddressForm = async (address) => {
  refs.addressContactName.value = address.contact_name || "";
  refs.addressContactPhone.value = address.contact_phone || "";
  refs.addressDetail.value = address.detail || "";
  refs.addressIsDefault.checked = Boolean(address.is_default);
  setAddressType(address.address_type || "home");
  await syncRegionFields({ provinceCode: address.province_code || "", provinceValue: address.province || "", districtCode: address.district_code || "", districtValue: address.district || "", wardCode: address.ward_code || "", wardValue: address.ward || "" });
};
const openAddressModal = async (addressId = "") => {
  const editingAddress = state.addresses.find((item) => item.id === addressId);
  state.editingAddressId = editingAddress?.id || null;
  refs.addressModalTitle.textContent = editingAddress ? "Cập nhật địa chỉ" : "Địa chỉ mới (dùng thông tin trước sắp nhập)";
  setAddressModalStatus("Đang tải dữ liệu khu vực..."); resetRegionSelects();
  refs.addressModal.hidden = false; refs.addressModal.setAttribute("aria-hidden", "false"); document.body.classList.add("account-modal-open");
  await fillAddressForm(editingAddress || createAddressDraft());
  if (state.location.source !== "fallback") setAddressModalStatus("");
  refs.addressContactName?.focus();
};
const closeAddressModal = () => { state.editingAddressId = null; setAddressModalStatus(""); refs.addressModal.hidden = true; refs.addressModal.setAttribute("aria-hidden", "true"); document.body.classList.remove("account-modal-open"); if (state.mapTimer) window.clearTimeout(state.mapTimer); };
const collectAddressForm = () => {
  const addressType = refs.addressTypeButtons.find((button) => button.classList.contains("active"))?.dataset.addressType || "home";
  const province = getSelectedOptionMeta(refs.addressProvince), district = getSelectedOptionMeta(refs.addressDistrict), ward = getSelectedOptionMeta(refs.addressWard);
  return { id: state.editingAddressId || generateAddressId(), contact_name: refs.addressContactName.value.trim(), contact_phone: refs.addressContactPhone.value.trim(), province: province.value, province_code: province.code, district: district.value, district_code: district.code, ward: ward.value, ward_code: ward.code, detail: refs.addressDetail.value.trim(), address_type: addressType, is_default: Boolean(refs.addressIsDefault.checked) };
};
const validateAddress = (address) => !address.contact_name ? "Vui lòng nhập họ và tên." : !address.contact_phone ? "Vui lòng nhập số điện thoại." : (!address.province || !address.district || !address.ward) ? "Vui lòng chọn đầy đủ tỉnh/thành phố, quận/huyện và phường/xã." : !address.detail ? "Vui lòng nhập địa chỉ cụ thể." : "";
const saveAddress = (event) => {
  event.preventDefault();
  if (!ensureAuth()) return;
  const next = collectAddressForm(), error = validateAddress(next);
  if (error) return setAddressModalStatus(error, "error");
  const exists = state.addresses.some((item) => item.id === next.id);
  const merged = exists ? state.addresses.map((item) => item.id === next.id ? next : item) : [...state.addresses, next];
  state.addresses = ensureDefaultAddress(next.is_default ? merged.map((item) => ({ ...item, is_default: item.id === next.id })) : merged);
  persistAddresses(); renderAddresses(); closeAddressModal(); setActiveView("addresses", true); setAddressStatus(exists ? "Đã cập nhật địa chỉ." : "Đã thêm địa chỉ mới.");
};
const setDefaultAddress = (addressId) => { state.addresses = state.addresses.map((item) => ({ ...item, is_default: item.id === addressId })); persistAddresses(); renderAddresses(); setAddressStatus("Đã đặt địa chỉ mặc định."); };
const renderAddresses = () => {
  if (!refs.addressList) return;
  if (!state.addresses.length) {
    refs.addressList.innerHTML = `<div class="address-empty-card"><strong>Bạn chưa có địa chỉ nào</strong><p>Thêm địa chỉ nhận hàng để bắt đầu mua sắm nhanh hơn.</p><button type="button" class="address-add-btn" data-address-trigger="create"><span aria-hidden="true">+</span><span>Thêm địa chỉ mới</span></button></div>`;
    return;
  }
  refs.addressList.innerHTML = state.addresses.map((address) => `<article class="address-card"><div class="address-card-main"><div class="address-card-head"><div class="address-card-contact"><strong>${escapeHtml(address.contact_name)}</strong><span class="address-card-divider">|</span><span>${escapeHtml(address.contact_phone)}</span></div><button type="button" class="address-link-btn" data-address-action="edit" data-address-id="${escapeHtml(address.id)}">Cập nhật</button></div><p class="address-card-text">${escapeHtml(buildAddressText(address))}</p><div class="address-card-tags">${address.is_default ? '<span class="address-tag is-default">Mặc định</span>' : ""}<span class="address-tag">${escapeHtml(getAddressTypeLabel(address.address_type))}</span></div></div><div class="address-card-actions">${address.is_default ? '<button type="button" class="address-secondary-btn" disabled>Địa chỉ mặc định</button>' : `<button type="button" class="address-secondary-btn" data-address-action="default" data-address-id="${escapeHtml(address.id)}">Thiết lập mặc định</button>`}</div></article>`).join("");
};
const fetchProfile = async () => {
  if (!ensureAuth()) return;
  try {
    const user = (await StoreAuth.apiFetch("/auth/me", {}, { redirectOn401: true })).user || {};
    state.currentUser = user;
    refs.profileName.value = user.full_name || "";
    refs.profileEmail.value = user.email || "";
    refs.profilePhone.value = user.phone || "";
    if (user.birth_date) {
      const date = new Date(user.birth_date);
      refs.profileBirth.value = Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
    } else {
      refs.profileBirth.value = "";
    }
    setGenderValue(user.gender || null);
    updateAvatarPreview(user.avatar_url || "");
    loadAddresses();
    renderAddresses();
  } catch (error) { setProfileStatus(error.message, "error"); }
};
const saveProfile = async () => {
  if (!ensureAuth()) return;
  setProfileStatus("");
  try {
    const payload = { email: refs.profileEmail.value.trim(), full_name: refs.profileName.value.trim() || null, phone: refs.profilePhone.value.trim() || null, gender: getGenderValue(), birth_date: refs.profileBirth.value || null };
    const data = await StoreAuth.apiFetch("/auth/me", { method: "PATCH", body: payload }, { redirectOn401: true });
    state.currentUser = data.user || state.currentUser; setProfileStatus("Đã lưu thông tin."); refs.profileEmail.value = data.user?.email || ""; refs.profilePhone.value = data.user?.phone || ""; setGenderValue(data.user?.gender || null); updateAvatarPreview(data.user?.avatar_url || "");
  } catch (error) { setProfileStatus(error.message, "error"); }
};
const handleAvatarUpload = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) return setProfileStatus("Vui lòng chọn ảnh hợp lệ.", "error");
  if (file.size > 1024 * 1024) return setProfileStatus("Ảnh vượt quá 1MB.", "error");
  const tempUrl = URL.createObjectURL(file); updateAvatarPreview(tempUrl);
  try {
    const formData = new FormData(); formData.append("avatar", file);
    const data = await StoreAuth.apiFetch("/auth/me/avatar", { method: "POST", body: formData }, { redirectOn401: true });
    updateAvatarPreview(data.user?.avatar_url || ""); setProfileStatus("Đã cập nhật ảnh.");
  } catch (error) { setProfileStatus(error.message, "error"); } finally { refs.avatarInput.value = ""; URL.revokeObjectURL(tempUrl); }
};

refs.navLinks.forEach((link) => link.addEventListener("click", (event) => { event.preventDefault(); setActiveView(link.dataset.accountNav, true); }));
window.addEventListener("hashchange", () => setActiveView(getViewFromHash()));
refs.saveProfile?.addEventListener("click", (event) => { event.preventDefault(); saveProfile(); });
refs.avatarButton?.addEventListener("click", (event) => { event.preventDefault(); refs.avatarInput?.click(); });
refs.avatarInput?.addEventListener("change", handleAvatarUpload);
refs.openAddressModalBtn?.addEventListener("click", () => { setAddressStatus(""); void openAddressModal(); });
refs.closeAddressModalBtn?.addEventListener("click", closeAddressModal);
refs.cancelAddressBtn?.addEventListener("click", closeAddressModal);
refs.addressModal?.addEventListener("click", (event) => { if (event.target === refs.addressModal) closeAddressModal(); });
refs.addressForm?.addEventListener("submit", saveAddress);
refs.addressProvince?.addEventListener("change", () => { const province = getSelectedOptionMeta(refs.addressProvince); void syncRegionFields({ provinceCode: province.code, provinceValue: province.value }); });
refs.addressDistrict?.addEventListener("change", () => { const province = getSelectedOptionMeta(refs.addressProvince), district = getSelectedOptionMeta(refs.addressDistrict); void syncRegionFields({ provinceCode: province.code, provinceValue: province.value, districtCode: district.code, districtValue: district.value }); });
refs.addressWard?.addEventListener("change", scheduleMapUpdate);
refs.addressDetail?.addEventListener("input", scheduleMapUpdate);
refs.addressTypeButtons.forEach((button) => button.addEventListener("click", () => setAddressType(button.dataset.addressType || "home")));
refs.addressList?.addEventListener("click", (event) => {
  const actionButton = event.target.closest("[data-address-action]");
  const createButton = event.target.closest("[data-address-trigger='create']");
  if (createButton) return setAddressStatus(""), void openAddressModal();
  if (!actionButton) return;
  const { addressAction, addressId } = actionButton.dataset;
  if (addressAction === "edit") return setAddressStatus(""), void openAddressModal(addressId);
  if (addressAction === "default" && addressId) setDefaultAddress(addressId);
});

resetRegionSelects();
updateMapPreview();
setActiveView(getViewFromHash());
setProfileStatus("");
setAddressStatus("");
fetchProfile();
