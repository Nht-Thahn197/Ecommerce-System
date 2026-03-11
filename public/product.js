(function () {
  const els = {
    breadcrumb: document.querySelector("#productBreadcrumb"),
    pageStatus: document.querySelector("#productPageStatus"),
    shell: document.querySelector("#productShell"),
    mediaMain: document.querySelector("#productMediaMain"),
    mediaThumbs: document.querySelector("#productMediaThumbs"),
    mediaPrev: document.querySelector("#productMediaPrev"),
    mediaNext: document.querySelector("#productMediaNext"),
    badges: document.querySelector("#productBadges"),
    title: document.querySelector("#productTitle"),
    averageRating: document.querySelector("#productAverageRating"),
    stars: document.querySelector("#productStars"),
    reviewCount: document.querySelector("#productReviewCount"),
    soldCount: document.querySelector("#productSoldCount"),
    price: document.querySelector("#productPrice"),
    priceHint: document.querySelector("#productPriceHint"),
    voucherChips: document.querySelector("#productVoucherChips"),
    currentVariantLabel: document.querySelector("#productCurrentVariantLabel"),
    variantOptions: document.querySelector("#productVariantOptions"),
    qtyInput: document.querySelector("#qtyInput"),
    qtyDecreaseBtn: document.querySelector("#qtyDecreaseBtn"),
    qtyIncreaseBtn: document.querySelector("#qtyIncreaseBtn"),
    addToCartBtn: document.querySelector("#addToCartBtn"),
    buyNowBtn: document.querySelector("#buyNowBtn"),
    actionStatus: document.querySelector("#productActionStatus"),
    shopAvatar: document.querySelector("#shopAvatar"),
    shopName: document.querySelector("#shopName"),
    shopDescription: document.querySelector("#shopDescription"),
    shopProductCount: document.querySelector("#shopProductCount"),
    shopCategoryName: document.querySelector("#shopCategoryName"),
    specs: document.querySelector("#productSpecs"),
    description: document.querySelector("#productDescription"),
    reviewAverageLabel: document.querySelector("#reviewAverageLabel"),
    reviewSummaryCount: document.querySelector("#reviewSummaryCount"),
    reviewList: document.querySelector("#reviewList"),
    reviewEmpty: document.querySelector("#reviewEmpty"),
    reviewPagination: document.querySelector("#reviewPagination"),
    relatedCountLabel: document.querySelector("#relatedCountLabel"),
    relatedProducts: document.querySelector("#relatedProducts"),
    relatedPrev: document.querySelector("#relatedProductsPrev"),
    relatedNext: document.querySelector("#relatedProductsNext"),
    relatedEmpty: document.querySelector("#relatedEmpty"),
  };

  const state = {
    product: null,
    media: [],
    activeMediaIndex: 0,
    thumbStartIndex: 0,
    selectedVariantId: "",
    selectedVariantOptions: [],
    quantity: 1,
    relatedProducts: [],
    shopSummary: null,
    shopProductTotal: 0,
    reviewsPage: 1,
  };

  const CONDITION_LABELS = {
    new: "Mới",
    like_new: "Như mới",
    used: "Đã dùng",
  };

  const MAX_CART_QUANTITY = 99;
  const DESKTOP_MEDIA_THUMBS_PER_VIEW = 5;
  const MOBILE_MEDIA_THUMBS_PER_VIEW = 4;
  const RELATED_CAROUSEL_EDGE_THRESHOLD = 6;
  let relatedCarouselFrame = 0;

  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const formatCurrency = (value) => {
    const amount = Number(value);
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
  };

  const formatCompactNumber = (value) => {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return "0";
    return new Intl.NumberFormat("vi-VN", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const formatDate = (value) => {
    if (!value) return "Chưa cập nhật";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const showStatus = (element, message, error = false) => {
    if (!element) return;
    element.hidden = false;
    element.textContent = message;
    element.classList.toggle("error", Boolean(error));
  };

  const hideStatus = (element) => {
    if (!element) return;
    element.hidden = true;
    element.textContent = "";
    element.classList.remove("error");
  };

  const parsePayload = async (response) => {
    const text = await response.text();

    try {
      return text ? JSON.parse(text) : {};
    } catch (_error) {
      return { message: text };
    }
  };

  const fetchJson = async (path) => {
    const response = await fetch(path);
    const payload = await parsePayload(response);

    if (!response.ok) {
      throw new Error(payload.message || "Không thể tải dữ liệu.");
    }

    return payload;
  };

  const getProductHref = (productId) =>
    `/ui/product.html?id=${encodeURIComponent(productId)}`;

  const getInitials = (value) => {
    const parts = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) return "BM";
    return parts.map((part) => part[0]?.toUpperCase() || "").join("");
  };

  const getProductImage = (product) => {
    if (product?.cover_image_url) return product.cover_image_url;
    if (Array.isArray(product?.media_gallery) && product.media_gallery.length) {
      return product.media_gallery[0];
    }
    return "";
  };

  const getVariantPrice = (variant) => {
    const price = Number(variant?.price);
    return Number.isFinite(price) ? price : 0;
  };

  const getProductPrice = (product) => {
    const prices = Array.isArray(product?.product_variants)
      ? product.product_variants
          .map((variant) => getVariantPrice(variant))
          .filter((price) => price > 0)
      : [];

    return prices.length ? Math.min(...prices) : 0;
  };

  const getProductPriceRange = (product = state.product) => {
    const prices = getProductVariants(product)
      .map((variant) => getVariantPrice(variant))
      .filter((price) => price > 0);

    if (!prices.length) {
      return { min: 0, max: 0 };
    }

    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  };

  const getProductVariants = (product = state.product) =>
    Array.isArray(product?.product_variants)
      ? product.product_variants.filter((variant) => Boolean(variant?.id))
      : [];

  const getVariantGroups = (product = state.product) =>
    (Array.isArray(product?.variant_config) ? product.variant_config : [])
      .map((group) => ({
        name: String(group?.name || "").trim(),
        options: Array.from(
          new Set(
            (Array.isArray(group?.options) ? group.options : [])
              .map((option) => String(option || "").trim())
              .filter(Boolean)
          )
        ),
      }))
      .filter((group) => group.name && group.options.length)
      .slice(0, 2);

  const usesGroupedVariants = (product = state.product) =>
    getVariantGroups(product).length > 0;

  const getVariantOptionValues = (variant, product = state.product) => {
    const groupCount = getVariantGroups(product).length;
    const values = Array.isArray(variant?.option_values)
      ? variant.option_values.map((value) => String(value || "").trim()).filter(Boolean)
      : [];

    return groupCount ? values.slice(0, groupCount) : values;
  };

  const getVariantLabel = (variant, product = state.product) => {
    const optionValues = getVariantOptionValues(variant, product);
    if (optionValues.length) {
      return optionValues.join(" / ");
    }

    const sku = String(variant?.sku || "").trim();
    return sku || "Biến thể mặc định";
  };

  const getSelectedOptionValues = (product = state.product) => {
    const groups = getVariantGroups(product);
    return groups.map((_, index) =>
      String(state.selectedVariantOptions?.[index] || "").trim()
    );
  };

  const isSelectionComplete = (product = state.product) => {
    const groups = getVariantGroups(product);
    if (!groups.length) return Boolean(state.selectedVariantId);
    const selections = getSelectedOptionValues(product);
    return groups.every((_, index) => Boolean(selections[index]));
  };

  const matchesSelections = (variant, selections, product = state.product) => {
    const optionValues = getVariantOptionValues(variant, product);
    const groups = getVariantGroups(product);

    if (!groups.length || optionValues.length !== groups.length) {
      return false;
    }

    return selections.every(
      (selection, index) => !selection || optionValues[index] === selection
    );
  };

  const findVariantBySelections = (selections, product = state.product) =>
    getProductVariants(product).find((variant) =>
      matchesSelections(variant, selections, product)
    ) || null;

  const getVariantSelectionPrompt = (product = state.product) =>
    usesGroupedVariants(product)
      ? "Vui lòng chọn đủ phân loại"
      : "Vui lòng chọn phân loại";

  const requiresVariantSelection = (product = state.product) =>
    getProductVariants(product).length > 1;

  const applyDefaultVariantSelection = (product = state.product) => {
    const variants = getProductVariants(product);
    const groups = getVariantGroups(product);
    const defaultVariant =
      variants.find((variant) => getVariantStock(variant) > 0) || variants[0] || null;

    if (!requiresVariantSelection(product)) {
      state.selectedVariantId = defaultVariant?.id || "";
      state.selectedVariantOptions = defaultVariant
        ? getVariantOptionValues(defaultVariant, product)
        : groups.map(() => "");
      return;
    }

    state.selectedVariantId = "";
    state.selectedVariantOptions = groups.map(() => "");
  };

  const getSelectedVariant = (product = state.product) => {
    const variants = getProductVariants(product);
    if (!variants.length) return null;

    const selectedVariant =
      variants.find(
        (variant) => String(variant?.id) === String(state.selectedVariantId)
      ) || null;

    if (selectedVariant) return selectedVariant;

    if (usesGroupedVariants(product)) {
      if (!isSelectionComplete(product)) {
        return requiresVariantSelection(product) ? null : variants[0] || null;
      }

      return findVariantBySelections(getSelectedOptionValues(product), product);
    }

    return requiresVariantSelection(product) ? null : variants[0] || null;
  };

  const getVariantStock = (variant) => {
    const stock = Number(variant?.stock);
    return Number.isFinite(stock) && stock >= 0 ? Math.floor(stock) : 0;
  };

  const clampQuantity = (value, max) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 1;
    const upper = Math.max(1, Math.min(MAX_CART_QUANTITY, Number(max) || 1));
    return Math.max(1, Math.min(upper, Math.floor(numeric)));
  };

  const getMediaThumbsPerView = () =>
    window.matchMedia("(max-width: 720px)").matches
      ? MOBILE_MEDIA_THUMBS_PER_VIEW
      : DESKTOP_MEDIA_THUMBS_PER_VIEW;

  const clampThumbStartIndex = (value) => {
    const perView = getMediaThumbsPerView();
    const maxStart = Math.max(0, state.media.length - perView);
    const numeric = Number(value);
    const safeValue = Number.isFinite(numeric) ? Math.floor(numeric) : 0;
    return Math.max(0, Math.min(maxStart, safeValue));
  };

  const keepActiveMediaVisible = () => {
    const perView = getMediaThumbsPerView();
    const visibleEnd = state.thumbStartIndex + perView - 1;

    if (state.activeMediaIndex < state.thumbStartIndex) {
      state.thumbStartIndex = state.activeMediaIndex;
    } else if (state.activeMediaIndex > visibleEnd) {
      state.thumbStartIndex = state.activeMediaIndex - perView + 1;
    }

    state.thumbStartIndex = clampThumbStartIndex(state.thumbStartIndex);
  };

  const buildMediaItems = (product) => {
    const uniqueUrls = new Set();
    const items = [];

    const pushImage = (url, label) => {
      const safeUrl = String(url || "").trim();
      if (!safeUrl || uniqueUrls.has(`image:${safeUrl}`)) return;
      uniqueUrls.add(`image:${safeUrl}`);
      items.push({ type: "image", url: safeUrl, label });
    };

    const pushVideo = (url) => {
      const safeUrl = String(url || "").trim();
      if (!safeUrl || uniqueUrls.has(`video:${safeUrl}`)) return;
      uniqueUrls.add(`video:${safeUrl}`);
      items.push({ type: "video", url: safeUrl, label: "Video" });
    };

    pushVideo(product?.video_url);

    pushImage(product?.cover_image_url, "Ảnh bìa");

    (Array.isArray(product?.media_gallery) ? product.media_gallery : []).forEach(
      (url, index) => {
        pushImage(url, `Ảnh ${index + 1}`);
      }
    );

    return items;
  };

  const buildVoucherChips = (price) => {
    if (price >= 100000) {
      return ["Giảm 10k", "Giảm 10%", "Freeship 0đ"];
    }

    if (price >= 70000) {
      return ["Giảm 5k", "Freeship 0đ", "Mua 2 giảm 5%"];
    }

    return ["Giảm 3k", "Voucher shop", "Ưu đãi thành viên"];
  };

  const renderStars = (rating) => {
    const rounded = Math.round(Number(rating) || 0);
    return Array.from({ length: 5 }, (_, index) => {
      const active = index < rounded;
      return `<span class="${active ? "active" : ""}">★</span>`;
    }).join("");
  };

  const renderBreadcrumb = (trail, product) => {
    if (!els.breadcrumb) return;

    const categoryTrail = (Array.isArray(trail) ? trail : []).map(
      (item) =>
        `<a href="/ui/category.html?id=${encodeURIComponent(item.id)}">${escapeHtml(
          item.name
        )}</a>`
    );

    const parts = [
      `<a href="/ui/">Trang chủ</a>`,
      ...categoryTrail,
      `<span>${escapeHtml(product?.name || "Chi tiết sản phẩm")}</span>`,
    ];

    els.breadcrumb.innerHTML = parts
      .map((item, index) =>
        index === 0 ? item : `<span>/</span>${item}`
      )
      .join("");
  };

  const updateMediaThumbCarousel = () => {
    if (!els.mediaThumbs) return;

    const perView = getMediaThumbsPerView();
    const maxStart = Math.max(0, state.media.length - perView);
    state.thumbStartIndex = clampThumbStartIndex(state.thumbStartIndex);

    const firstThumb = els.mediaThumbs.querySelector(".product-media-thumb");
    const thumbsStyle = window.getComputedStyle(els.mediaThumbs);
    const gap =
      Number.parseFloat(thumbsStyle.columnGap || thumbsStyle.gap || "0") || 0;
    const thumbWidth = firstThumb ? firstThumb.getBoundingClientRect().width : 0;
    const offset = (thumbWidth + gap) * state.thumbStartIndex;

    els.mediaThumbs.style.transform = `translateX(-${offset}px)`;

    if (els.mediaPrev) {
      els.mediaPrev.hidden = state.thumbStartIndex <= 0 || state.media.length <= perView;
    }

    if (els.mediaNext) {
      els.mediaNext.hidden =
        state.thumbStartIndex >= maxStart || state.media.length <= perView;
    }
  };

  const updateRelatedCarouselControls = () => {
    if (!els.relatedProducts) return;

    const maxScrollLeft = Math.max(
      0,
      els.relatedProducts.scrollWidth - els.relatedProducts.clientWidth
    );
    const currentScrollLeft = Math.max(0, els.relatedProducts.scrollLeft);
    const hasOverflow = maxScrollLeft > RELATED_CAROUSEL_EDGE_THRESHOLD;
    const isAtStart = currentScrollLeft <= RELATED_CAROUSEL_EDGE_THRESHOLD;
    const isAtEnd =
      currentScrollLeft >= maxScrollLeft - RELATED_CAROUSEL_EDGE_THRESHOLD;

    if (els.relatedPrev) {
      els.relatedPrev.hidden = !hasOverflow || isAtStart;
    }

    if (els.relatedNext) {
      els.relatedNext.hidden = !hasOverflow || isAtEnd;
    }
  };

  const scheduleRelatedCarouselControls = () => {
    if (relatedCarouselFrame) {
      window.cancelAnimationFrame(relatedCarouselFrame);
    }

    relatedCarouselFrame = window.requestAnimationFrame(() => {
      relatedCarouselFrame = 0;
      updateRelatedCarouselControls();
    });
  };

  const scrollRelatedProducts = (direction) => {
    if (!els.relatedProducts) return;

    const distance = Math.max(els.relatedProducts.clientWidth, 1);

    els.relatedProducts.scrollBy({
      left: distance * direction,
      behavior: "smooth",
    });
  };

  const fitActiveVideo = () => {
    if (!els.mediaMain) return;

    const stage = els.mediaMain.querySelector(".product-video-stage");
    const frame = els.mediaMain.querySelector(".product-media-frame-video");
    const video = els.mediaMain.querySelector(".product-video-object");

    if (
      !(stage instanceof HTMLElement) ||
      !(frame instanceof HTMLElement) ||
      !(video instanceof HTMLVideoElement)
    ) {
      return;
    }

    const applyFit = () => {
      const videoWidth = Number(video.videoWidth || 0);
      const videoHeight = Number(video.videoHeight || 0);
      const frameWidth = Math.max(frame.clientWidth, 1);
      const frameHeight = Math.max(frame.clientHeight, 1);
      const isPortrait = videoHeight > videoWidth;
      const inset = isPortrait ? 12 : 15;
      const stageSize = Math.max(
        1,
        Math.min(frameWidth - 28, frameHeight - inset)
      );

      stage.style.width = `${stageSize}px`;
      stage.style.height = `${stageSize}px`;
      video.style.width = "auto";
      video.style.height = "100%";
    };

    window.requestAnimationFrame(applyFit);
    video.addEventListener("loadedmetadata", applyFit, { once: true });
    video.addEventListener("loadeddata", applyFit, { once: true });
  };

  const renderMedia = () => {
    if (!els.mediaMain || !els.mediaThumbs) return;

    const activeItem = state.media[state.activeMediaIndex] || null;

    if (!activeItem) {
      els.mediaMain.classList.remove("is-video");
      els.mediaMain.innerHTML = `
        <div class="product-media-empty">
          Chưa có ảnh hoặc video cho sản phẩm này.
        </div>
      `;
      els.mediaThumbs.innerHTML = "";
      els.mediaThumbs.style.transform = "";
      if (els.mediaPrev) els.mediaPrev.hidden = true;
      if (els.mediaNext) els.mediaNext.hidden = true;
      return;
    }

    keepActiveMediaVisible();
    els.mediaMain.classList.toggle("is-video", activeItem.type === "video");

    els.mediaMain.innerHTML =
      activeItem.type === "video"
        ? `
          <div class="product-media-frame product-media-frame-video">
            <div class="product-video-stage">
              <video
                class="product-media-object product-video-object"
                controls
                playsinline
                preload="metadata"
              >
              <source src="${escapeHtml(activeItem.url)}" />
              </video>
            </div>
          </div>
        `
        : `
          <div class="product-media-frame product-media-frame-image" style="background-image: url('${escapeHtml(activeItem.url)}');" aria-label="${escapeHtml(state.product?.name || "Sáº£n pháº©m")}" role="img">
            <img
              class="product-media-object"
            src="${escapeHtml(activeItem.url)}"
            alt="${escapeHtml(state.product?.name || "Sản phẩm")}"
            />
          </div>
        `;

    els.mediaThumbs.innerHTML = state.media
      .map((item, index) => {
        const activeClass = index === state.activeMediaIndex ? "active" : "";
        return `
          <button
            class="product-media-thumb ${activeClass}"
            type="button"
            data-media-index="${index}"
            aria-label="${escapeHtml(item.label || "Media sản phẩm")}"
          >
            ${
              item.type === "video"
                ? `<video muted playsinline preload="metadata"><source src="${escapeHtml(
                    item.url
                  )}" /></video>`
                : `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(
                    item.label || "Ảnh sản phẩm"
                  )}" loading="lazy" />`
            }
            ${
              item.type === "video"
                ? `<span class="product-media-thumb-label">Video</span>`
                : ""
            }
          </button>
        `;
      })
      .join("");

    updateMediaThumbCarousel();

    if (activeItem.type === "video") {
      fitActiveVideo();
    }
  };

  const renderPriceAndVouchers = (variant) => {
    const priceRange = getProductPriceRange(state.product);
    const basePrice = variant ? getVariantPrice(variant) : priceRange.min;
    if (els.price) {
      els.price.textContent =
        !variant && priceRange.max > priceRange.min
          ? `${formatCurrency(priceRange.min)} ~ ${formatCurrency(priceRange.max)}`
          : formatCurrency(basePrice);
    }
    if (els.priceHint) {
      els.priceHint.textContent =
        requiresVariantSelection() && !variant
          ? `${getVariantSelectionPrompt()} để xác định giá và tồn kho.`
          : basePrice > 0
            ? "Giá đang áp dụng cho lựa chọn hiện tại"
            : "Shop chưa cập nhật giá";
    }
    if (els.voucherChips) {
      els.voucherChips.innerHTML = buildVoucherChips(basePrice)
        .map((chip) => `<span class="voucher-chip">${escapeHtml(chip)}</span>`)
        .join("");
    }
  };

  const renderBadges = () => {
    if (!els.badges || !state.product) return;

    const badges = [
      {
        label:
          CONDITION_LABELS[state.product?.condition] || CONDITION_LABELS.new,
        className: "primary",
      },
    ];

    if (state.product?.categories?.name) {
      badges.push({
        label: state.product.categories.name,
        className: "ghost",
      });
    }

    if (state.product?.video_url) {
      badges.push({
        label: "Có video",
        className: "ghost",
      });
    }

    els.badges.innerHTML = badges
      .map(
        (badge) =>
          `<span class="detail-badge ${badge.className}">${escapeHtml(
            badge.label
          )}</span>`
      )
      .join("");
  };

  const renderSelectedVariant = () => {
    const variant = getSelectedVariant();
    const stock = getVariantStock(variant);
    const needsVariantChoice = requiresVariantSelection();
    const hasVariant = Boolean(variant?.id);
    const hasStock = stock > 0;
    const canBuy = hasStock && (hasVariant || !needsVariantChoice);

    if (els.currentVariantLabel) {
      els.currentVariantLabel.textContent = hasVariant
        ? variant?.sku || "Biến thể mặc định"
        : needsVariantChoice
          ? getVariantSelectionPrompt()
          : getProductVariants().length
            ? "Biến thể mặc định"
            : "Không có phân loại";
      if (hasVariant) {
        els.currentVariantLabel.textContent = getVariantLabel(variant);
      }
    }

    if (els.soldCount) {
      els.soldCount.textContent =
        needsVariantChoice && !hasVariant
          ? "Chọn loại"
          : hasStock
            ? "Còn hàng"
            : "Hết hàng";
    }

    state.quantity = clampQuantity(state.quantity, hasStock ? stock : 1);

    if (els.qtyInput) {
      els.qtyInput.value = String(state.quantity);
      els.qtyInput.max = String(Math.max(1, Math.min(stock || 1, MAX_CART_QUANTITY)));
      els.qtyInput.disabled = !canBuy;
    }

    if (els.qtyDecreaseBtn) {
      els.qtyDecreaseBtn.disabled = !canBuy || state.quantity <= 1;
    }

    if (els.qtyIncreaseBtn) {
      els.qtyIncreaseBtn.disabled =
        !canBuy ||
        state.quantity >= Math.min(stock || 1, MAX_CART_QUANTITY);
    }

    if (els.addToCartBtn) {
      els.addToCartBtn.disabled = !canBuy;
    }

    if (els.buyNowBtn) {
      els.buyNowBtn.disabled = !canBuy;
    }

    renderPriceAndVouchers(variant);
  };

  const getOptionAvailability = (groupIndex, optionValue, product = state.product) => {
    const selections = getSelectedOptionValues(product);
    const nextSelections = [...selections];
    nextSelections[groupIndex] = optionValue;
    const matchingVariants = getProductVariants(product).filter((variant) =>
      matchesSelections(variant, nextSelections, product)
    );

    return {
      exists: matchingVariants.length > 0,
      inStock: matchingVariants.some((variant) => getVariantStock(variant) > 0),
    };
  };

  const renderVariantOptions = () => {
    if (!els.variantOptions || !state.product) return;

    const variants = getProductVariants();
    const groups = getVariantGroups();
    const variantBlock = els.variantOptions.closest(".product-picker-block");
    const showVariantPicker = requiresVariantSelection();
    els.variantOptions.classList.toggle(
      "has-groups",
      groups.length > 0 && showVariantPicker
    );

    if (variantBlock) {
      variantBlock.hidden = !showVariantPicker;
      variantBlock.style.display = showVariantPicker ? "" : "none";
    }

    if (!variants.length) {
      els.variantOptions.innerHTML = "";
      state.selectedVariantId = "";
      state.selectedVariantOptions = [];
      renderSelectedVariant();
      return;
    }

    if (!showVariantPicker) {
      els.variantOptions.innerHTML = "";
      renderSelectedVariant();
      return;
    }

    if (groups.length) {
      const selections = getSelectedOptionValues();
      els.variantOptions.innerHTML = groups
        .map((group, groupIndex) => {
          const selectedValue = selections[groupIndex] || "";
          const previousSelectionsFilled = selections
            .slice(0, groupIndex)
            .every(Boolean);
          const isLocked = groupIndex > 0 && !previousSelectionsFilled;
          const visibleOptions =
            groupIndex > 0 && previousSelectionsFilled
              ? group.options.filter((optionValue) =>
                  getOptionAvailability(groupIndex, optionValue).exists
                )
              : group.options;

          return `
            <section class="product-variant-group ${isLocked ? "is-disabled" : ""}">
              <div class="product-variant-group-head">
                <strong>${escapeHtml(group.name)}</strong>
                <span>${escapeHtml(selectedValue || "Chưa chọn")}</span>
              </div>
              ${
                isLocked
                  ? `<div class="product-variant-group-empty">Chọn ${escapeHtml(
                      groups[groupIndex - 1]?.name || "phân loại"
                    )} trước</div>`
                  : `<div class="variant-chip-list">`
              }
                ${isLocked ? "" : visibleOptions
                  .map((optionValue) => {
                    const active = selectedValue === optionValue ? "active" : "";
                    const availability = getOptionAvailability(groupIndex, optionValue);
                    const stateLabel = availability.inStock ? "Có thể chọn" : "Hết hàng";
                    return `
                      <button
                        class="variant-chip ${active} ${availability.inStock ? "" : "soldout"}"
                        type="button"
                        data-option-group="${groupIndex}"
                        data-option-value="${escapeHtml(optionValue)}"
                        ${availability.exists ? "" : "disabled"}
                      >
                        <strong>${escapeHtml(optionValue)}</strong>
                        <span>${escapeHtml(stateLabel)}</span>
                      </button>
                    `;
                  })
                  .join("")}
              ${isLocked ? "" : "</div>"}
            </section>
          `;
        })
        .join("");

      renderSelectedVariant();
      return;
    }

    els.variantOptions.innerHTML = variants
      .map((variant, index) => {
        const stock = getVariantStock(variant);
        const active =
          String(variant?.id) === String(state.selectedVariantId) ? "active" : "";
        const label = variant?.sku || `Biến thể ${index + 1}`;
        return `
          <button
            class="variant-chip ${active}"
            type="button"
            data-variant-id="${escapeHtml(variant?.id || "")}"
            ${stock <= 0 ? "disabled" : ""}
          >
            <strong>${escapeHtml(getVariantLabel(variant) || label)}</strong>
            <span>${escapeHtml(formatCurrency(getVariantPrice(variant)))}</span>
          </button>
        `;
      })
      .join("");

    renderSelectedVariant();
  };

  const renderShopSummary = () => {
    if (!state.product) return;

    const shopName = state.product?.shops?.name || "Shop Bambi";
    const shopAvatarUrl =
      state.product?.shops?.avatar_url || state.shopSummary?.avatar_url || "";

    if (els.shopAvatar) {
      els.shopAvatar.classList.toggle("has-image", Boolean(shopAvatarUrl));
      els.shopAvatar.innerHTML = shopAvatarUrl
        ? `<img src="${escapeHtml(shopAvatarUrl)}" alt="${escapeHtml(shopName)}" />`
        : `<span>${escapeHtml(getInitials(shopName))}</span>`;
    }

    if (els.shopName) {
      els.shopName.textContent = shopName;
    }

    if (els.shopDescription) {
      els.shopDescription.textContent =
        state.shopSummary?.description?.trim() ||
        "Shop đang đồng bộ thông tin mô tả và dịch vụ hỗ trợ cho khách hàng.";
    }

    if (els.shopProductCount) {
      const total = Number(state.shopProductTotal || state.relatedProducts.length + 1);
      els.shopProductCount.textContent = formatCompactNumber(total);
    }

    if (els.shopCategoryName) {
      els.shopCategoryName.textContent =
        state.product?.categories?.name || "Đang cập nhật";
    }
  };

  const renderSpecs = () => {
    if (!els.specs || !state.product) return;

    const variant = getSelectedVariant();
    const needsVariantChoice = requiresVariantSelection();
    const variantPending = needsVariantChoice && !variant?.id;
    const specs = [
      ["Danh mục", state.product?.categories?.name || "Chưa phân loại"],
      ["Shop", state.product?.shops?.name || "Shop Bambi"],
      [
        "Tình trạng",
        CONDITION_LABELS[state.product?.condition] || CONDITION_LABELS.new,
      ],
      [
        "Phân loại",
        variantPending ? getVariantSelectionPrompt() : getVariantLabel(variant) || "Biến thể mặc định",
      ],
      ["GTIN", state.product?.gtin || "Chưa cập nhật"],
      [
        "Kích thước",
        [state.product?.length_cm, state.product?.width_cm, state.product?.height_cm]
          .every((value) => Number(value) > 0)
          ? `${state.product.length_cm} x ${state.product.width_cm} x ${state.product.height_cm} cm`
          : "Chưa cập nhật",
      ],
      [
        "Khối lượng",
        variantPending
          ? getVariantSelectionPrompt()
          : Number(variant?.weight) > 0
            ? `${Number(variant.weight)} g`
            : "Chưa cập nhật",
      ],
      ["Ngày đăng", formatDate(state.product?.created_at)],
      [
        "Tình trạng kho",
        variantPending
          ? getVariantSelectionPrompt()
          : getVariantStock(variant) > 0
            ? "Còn hàng"
            : "Tạm hết hàng",
      ],
    ];

    els.specs.innerHTML = specs
      .map(
        ([label, value]) =>
          `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`
      )
      .join("");
  };

  const renderDescription = () => {
    if (!els.description || !state.product) return;
    els.description.textContent =
      state.product?.description?.trim() ||
      "Shop chưa cập nhật mô tả chi tiết cho sản phẩm này.";
  };

  const renderMeta = (reviewSummary) => {
    if (!state.product) return;

    const totalReviews = Number(reviewSummary?.total_reviews || 0);
    const averageRating = Number(reviewSummary?.average_rating || 0);
    const variant = getSelectedVariant();
    const stock = getVariantStock(variant);
    const variantPending = requiresVariantSelection() && !variant?.id;

    if (els.title) {
      els.title.textContent = state.product?.name || "Chi tiết sản phẩm";
    }

    if (els.averageRating) {
      els.averageRating.textContent = averageRating.toFixed(1);
    }

    if (els.stars) {
      els.stars.innerHTML = renderStars(averageRating);
    }

    if (els.reviewCount) {
      els.reviewCount.textContent = formatCompactNumber(totalReviews);
    }

    if (els.soldCount) {
      els.soldCount.textContent = variantPending
        ? "Chon loai"
        : stock > 0
          ? "Còn hàng"
          : "Hết hàng";
    }

    if (els.reviewAverageLabel) {
      els.reviewAverageLabel.textContent = averageRating.toFixed(1);
    }

    if (els.reviewSummaryCount) {
      els.reviewSummaryCount.textContent = `${formatCompactNumber(totalReviews)} đánh giá`;
    }
  };

  const renderReviewList = (payload) => {
    if (!els.reviewList || !els.reviewEmpty || !els.reviewPagination) return;

    const reviews = Array.isArray(payload?.data) ? payload.data : [];
    const summary = payload?.summary || {};
    const pagination = payload?.pagination || {};

    renderMeta(summary);

    if (!reviews.length) {
      els.reviewList.innerHTML = "";
      els.reviewEmpty.hidden = false;
      els.reviewPagination.innerHTML = "";
      return;
    }

    els.reviewEmpty.hidden = true;
    els.reviewList.innerHTML = reviews
      .map((review) => {
        const reviewRating = Number(review?.rating || 0);
        const author = review?.users?.full_name || "Người mua Bambi";
        const comment = review?.comment?.trim() || "Người mua chưa để lại nhận xét chi tiết.";

        return `
          <article class="review-item">
            <div class="review-item-header">
              <div class="review-author">
                <strong>${escapeHtml(author)}</strong>
                <span>${escapeHtml(formatDate(review?.created_at))}</span>
              </div>
              <div class="rating-stars">${renderStars(reviewRating)}</div>
            </div>
            <p class="review-comment">${escapeHtml(comment)}</p>
          </article>
        `;
      })
      .join("");

    const totalPages = Math.max(1, Number(pagination?.total_pages || 1));
    const currentPage = Math.max(1, Number(pagination?.page || 1));

    if (totalPages <= 1) {
      els.reviewPagination.innerHTML = "";
      return;
    }

    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    els.reviewPagination.innerHTML = pages
      .map(
        (page) => `
          <button
            class="review-page-btn ${page === currentPage ? "active" : ""}"
            type="button"
            data-review-page="${page}"
          >
            ${page}
          </button>
        `
      )
      .join("");
  };

  const renderRelatedProducts = () => {
    if (!els.relatedProducts || !els.relatedEmpty || !els.relatedCountLabel) return;

    if (!state.relatedProducts.length) {
      els.relatedProducts.innerHTML = "";
      els.relatedProducts.scrollLeft = 0;
      els.relatedEmpty.hidden = false;
      if (els.relatedPrev) {
        els.relatedPrev.hidden = true;
      }
      if (els.relatedNext) {
        els.relatedNext.hidden = true;
      }
      els.relatedCountLabel.textContent = "0 sản phẩm";
      return;
    }

    els.relatedEmpty.hidden = true;
    els.relatedCountLabel.textContent = `${state.relatedProducts.length} sản phẩm`;
    els.relatedProducts.innerHTML = state.relatedProducts
      .map((product) => {
        const imageUrl = getProductImage(product);
        const price = getProductPrice(product);
        return `
          <a class="product-card-link" href="${getProductHref(product.id)}">
            <article class="product-card">
              <div class="badge">${escapeHtml(
                CONDITION_LABELS[product?.condition] || CONDITION_LABELS.new
              )}</div>
              <div class="product-thumb ${imageUrl ? "has-image" : ""}">
                ${
                  imageUrl
                    ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(
                        product?.name || "Sản phẩm"
                      )}" loading="lazy" />`
                    : `<span>${escapeHtml(getInitials(product?.name || "SP"))}</span>`
                }
              </div>
              <div class="product-body">
                <div class="product-title">${escapeHtml(product?.name || "Sản phẩm")}</div>
                <div class="price">${escapeHtml(formatCurrency(price))}</div>
                <div class="product-shop">${escapeHtml(
                  product?.shops?.name || state.product?.shops?.name || "Shop Bambi"
                )}</div>
              </div>
            </article>
          </a>
        `;
      })
      .join("");
    els.relatedProducts.scrollLeft = 0;
    scheduleRelatedCarouselControls();
  };

  const renderPage = (reviewPayload) => {
    renderBadges();
    renderMedia();
    renderVariantOptions();
    renderShopSummary();
    renderSpecs();
    renderDescription();
    renderReviewList(reviewPayload);
    renderRelatedProducts();
    hideStatus(els.pageStatus);
    if (els.shell) {
      els.shell.hidden = false;
    }
    window.requestAnimationFrame(() => {
      fitActiveVideo();
    });
    document.title = `${state.product?.name || "Chi tiết sản phẩm"} | Bambi`;
  };

  const findCategoryTrail = (nodes, targetId, trail = []) => {
    for (const node of Array.isArray(nodes) ? nodes : []) {
      const nextTrail = [...trail, node];
      if (String(node?.id) === String(targetId)) {
        return nextTrail;
      }

      const childTrail = findCategoryTrail(node?.children || [], targetId, nextTrail);
      if (childTrail) return childTrail;
    }

    return null;
  };

  const loadReviews = async (page = 1) => {
    if (!state.product?.id) return;
    state.reviewsPage = page;
    const payload = await fetchJson(
      `/reviews?product_id=${encodeURIComponent(state.product.id)}&page=${page}&limit=6`
    );
    renderReviewList(payload);
  };

  const resolveProductId = async () => {
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get("id");
    if (queryId) return queryId;

    const payload = await fetchJson("/products?status=active&limit=1");
    const fallback = payload?.data?.[0]?.id;

    if (!fallback) {
      throw new Error("Chưa có sản phẩm nào đang hoạt động để hiển thị.");
    }

    params.set("id", fallback);
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", nextUrl);

    return fallback;
  };

  const loadProductPage = async () => {
    try {
      showStatus(els.pageStatus, "Đang tải chi tiết sản phẩm...");
      if (els.shell) {
        els.shell.hidden = true;
      }

      const productId = await resolveProductId();
      const productPayload = await fetchJson(`/products/${encodeURIComponent(productId)}`);
      const product = productPayload?.product;

      if (!product?.id) {
        throw new Error("Không tìm thấy sản phẩm.");
      }

      state.product = product;
      state.media = buildMediaItems(product);
      state.activeMediaIndex = 0;
      state.thumbStartIndex = 0;
      applyDefaultVariantSelection(product);
      state.quantity = 1;

      const [categoriesResult, reviewResult, relatedResult, shopsResult] =
        await Promise.allSettled([
          fetchJson("/categories"),
          fetchJson(
            `/reviews?product_id=${encodeURIComponent(product.id)}&page=1&limit=6`
          ),
          product?.shop_id
            ? fetchJson(
                `/products?status=active&shop_id=${encodeURIComponent(
                  product.shop_id
                )}&limit=100`
              )
            : Promise.resolve({ data: [], pagination: { total: 0 } }),
          fetchJson("/shops?limit=100"),
        ]);

      const categoriesPayload =
        categoriesResult.status === "fulfilled" ? categoriesResult.value : { tree: [] };
      const reviewPayload =
        reviewResult.status === "fulfilled"
          ? reviewResult.value
          : {
              data: [],
              pagination: { page: 1, total_pages: 1, total: 0 },
              summary: { total_reviews: 0, average_rating: 0 },
            };
      const relatedPayload =
        relatedResult.status === "fulfilled"
          ? relatedResult.value
          : { data: [], pagination: { total: 0 } };
      const shopsPayload =
        shopsResult.status === "fulfilled" ? shopsResult.value : { shops: { data: [] } };

      const trail =
        findCategoryTrail(categoriesPayload?.tree || [], product?.category_id) || [];
      renderBreadcrumb(trail, product);

      state.relatedProducts = (relatedPayload?.data || []).filter(
        (item) => String(item?.id) !== String(product.id)
      );
      state.shopProductTotal = Number(relatedPayload?.pagination?.total || 0);
      state.shopSummary = (shopsPayload?.shops?.data || []).find(
        (shop) => String(shop?.id) === String(product?.shop_id)
      ) || null;

      renderPage(reviewPayload);
    } catch (error) {
      if (els.shell) {
        els.shell.hidden = true;
      }
      showStatus(
        els.pageStatus,
        error instanceof Error ? error.message : "Không thể tải trang sản phẩm.",
        true
      );
    }
  };

  const withCartAction = async (mode) => {
    const variant = getSelectedVariant();
    if (!variant?.id) {
      if (requiresVariantSelection()) {
        showStatus(
          els.actionStatus,
          `${getVariantSelectionPrompt()} trước khi mua hàng.`,
          true
        );
      }
      return;
    }

    const auth = window.BambiStoreAuth || {};
    const token = typeof auth.getToken === "function" ? auth.getToken() : "";

    if (!token) {
      if (typeof auth.redirectToLogin === "function") {
        auth.redirectToLogin();
        return;
      }
      window.location.href = `/ui/login.html?next=${encodeURIComponent(
        `${window.location.pathname}${window.location.search}`
      )}`;
      return;
    }

    if (typeof auth.apiFetch !== "function") {
      showStatus(
        els.actionStatus,
        "Không thể kết nối chức năng giỏ hàng ở trình duyệt hiện tại.",
        true
      );
      return;
    }

    const buttons = [els.addToCartBtn, els.buyNowBtn].filter(Boolean);
    buttons.forEach((button) => {
      button.disabled = true;
    });

    try {
      hideStatus(els.actionStatus);
      await auth.apiFetch(
        "/cart/items",
        {
          method: "POST",
          body: {
            product_variant_id: variant.id,
            quantity: state.quantity,
          },
        },
        { redirectOn401: true }
      );

      if (window.BambiStoreCart?.emitChange) {
        window.BambiStoreCart.emitChange();
      }

      showStatus(
        els.actionStatus,
        mode === "buy"
          ? "Đã thêm sản phẩm vào giỏ hàng. Giao diện thanh toán đang được hoàn thiện."
          : "Đã thêm sản phẩm vào giỏ hàng.",
        false
      );
    } catch (error) {
      showStatus(
        els.actionStatus,
        error instanceof Error ? error.message : "Không thể thêm vào giỏ hàng.",
        true
      );
    } finally {
      renderSelectedVariant();
    }
  };

  const bindEvents = () => {
    els.mediaThumbs?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-media-index]");
      if (!button) return;
      state.activeMediaIndex = Number(button.dataset.mediaIndex || 0);
      keepActiveMediaVisible();
      renderMedia();
    });

    els.mediaPrev?.addEventListener("click", () => {
      state.thumbStartIndex = clampThumbStartIndex(state.thumbStartIndex - 1);
      updateMediaThumbCarousel();
    });

    els.mediaNext?.addEventListener("click", () => {
      state.thumbStartIndex = clampThumbStartIndex(state.thumbStartIndex + 1);
      updateMediaThumbCarousel();
    });

    els.relatedPrev?.addEventListener("click", () => {
      scrollRelatedProducts(-1);
    });

    els.relatedNext?.addEventListener("click", () => {
      scrollRelatedProducts(1);
    });

    els.relatedProducts?.addEventListener(
      "scroll",
      () => {
        scheduleRelatedCarouselControls();
      },
      { passive: true }
    );

    els.variantOptions?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-variant-id], [data-option-group]");
      if (!button) return;

      if (button.dataset.optionGroup !== undefined) {
        const groupIndex = Number(button.dataset.optionGroup || -1);
        const optionValue = String(button.dataset.optionValue || "").trim();
        if (!Number.isFinite(groupIndex) || groupIndex < 0 || !optionValue) return;

        const selections = getSelectedOptionValues();
        selections[groupIndex] = optionValue;

        const groups = getVariantGroups();
        groups.forEach((_, index) => {
          if (index === groupIndex || !selections[index]) return;
          const stillValid = getProductVariants().some((variant) =>
            matchesSelections(variant, selections, state.product)
          );
          if (!stillValid) {
            selections[index] = "";
          }
        });

        state.selectedVariantOptions = selections;
        state.selectedVariantId =
          isSelectionComplete() ? findVariantBySelections(selections)?.id || "" : "";
      } else {
        state.selectedVariantId = button.dataset.variantId || "";
        const selectedVariant = getProductVariants().find(
          (variant) => String(variant?.id) === String(state.selectedVariantId)
        );
        state.selectedVariantOptions = selectedVariant
          ? getVariantOptionValues(selectedVariant)
          : [];
      }

      state.quantity = 1;
      hideStatus(els.actionStatus);
      renderVariantOptions();
      renderSpecs();
    });

    els.qtyDecreaseBtn?.addEventListener("click", () => {
      const stock = getVariantStock(getSelectedVariant());
      state.quantity = clampQuantity(state.quantity - 1, stock || 1);
      renderSelectedVariant();
    });

    els.qtyIncreaseBtn?.addEventListener("click", () => {
      const stock = getVariantStock(getSelectedVariant());
      state.quantity = clampQuantity(state.quantity + 1, stock || 1);
      renderSelectedVariant();
    });

    els.qtyInput?.addEventListener("input", (event) => {
      const stock = getVariantStock(getSelectedVariant());
      state.quantity = clampQuantity(event.target.value, stock || 1);
      renderSelectedVariant();
    });

    els.addToCartBtn?.addEventListener("click", () => {
      withCartAction("cart");
    });

    els.buyNowBtn?.addEventListener("click", () => {
      withCartAction("buy");
    });

    els.reviewPagination?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-review-page]");
      if (!button) return;
      const nextPage = Number(button.dataset.reviewPage || 1);
      if (!Number.isFinite(nextPage) || nextPage === state.reviewsPage) return;
      loadReviews(nextPage).catch((error) => {
        showStatus(
          els.actionStatus,
          error instanceof Error ? error.message : "Không thể tải đánh giá.",
          true
        );
      });
    });

    window.addEventListener("resize", () => {
      updateMediaThumbCarousel();
      scheduleRelatedCarouselControls();
      fitActiveVideo();
    });
  };

  bindEvents();
  loadProductPage();
})();
