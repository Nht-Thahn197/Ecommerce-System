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
    variantMeta: document.querySelector("#productVariantMeta"),
    stockText: document.querySelector("#productStockText"),
    qtyInput: document.querySelector("#qtyInput"),
    qtyHint: document.querySelector("#productQtyHint"),
    qtyDecreaseBtn: document.querySelector("#qtyDecreaseBtn"),
    qtyIncreaseBtn: document.querySelector("#qtyIncreaseBtn"),
    addToCartBtn: document.querySelector("#addToCartBtn"),
    buyNowBtn: document.querySelector("#buyNowBtn"),
    actionStatus: document.querySelector("#productActionStatus"),
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
    relatedEmpty: document.querySelector("#relatedEmpty"),
  };

  const state = {
    product: null,
    media: [],
    activeMediaIndex: 0,
    thumbStartIndex: 0,
    selectedVariantId: "",
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

  const getSelectedVariant = () =>
    (state.product?.product_variants || []).find(
      (variant) => String(variant?.id) === String(state.selectedVariantId)
    ) || state.product?.product_variants?.[0] || null;

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

  const fitActiveVideo = () => {
    if (!els.mediaMain) return;

    const frame = els.mediaMain.querySelector(".product-media-frame-video");
    const stage = els.mediaMain.querySelector(".product-video-stage");
    const video = els.mediaMain.querySelector(".product-video-object");

    if (
      !(frame instanceof HTMLElement) ||
      !(stage instanceof HTMLElement) ||
      !(video instanceof HTMLVideoElement)
    ) {
      return;
    }

    const applyFit = () => {
      const videoWidth = Number(video.videoWidth || 0);
      const videoHeight = Number(video.videoHeight || 0);

      if (!videoWidth || !videoHeight) return;

      const frameStyle = window.getComputedStyle(frame);
      const innerWidth =
        frame.clientWidth -
        (Number.parseFloat(frameStyle.paddingLeft || "0") || 0) -
        (Number.parseFloat(frameStyle.paddingRight || "0") || 0);
      const innerHeight =
        frame.clientHeight -
        (Number.parseFloat(frameStyle.paddingTop || "0") || 0) -
        (Number.parseFloat(frameStyle.paddingBottom || "0") || 0);

      if (!innerWidth || !innerHeight) return;

      let fittedHeight = innerHeight;
      let fittedWidth = fittedHeight * (videoWidth / videoHeight);

      if (fittedWidth > innerWidth) {
        fittedWidth = innerWidth;
        fittedHeight = fittedWidth * (videoHeight / videoWidth);
      }

      const videoScale =
        Number.parseFloat(
          window
            .getComputedStyle(document.body)
            .getPropertyValue("--product-video-scale")
        ) || 0.93;

      fittedWidth *= videoScale;
      fittedHeight *= videoScale;

      stage.style.aspectRatio = "";
      stage.style.width = `${Math.floor(fittedWidth)}px`;
      stage.style.height = `${Math.floor(fittedHeight)}px`;
      video.style.width = "100%";
      video.style.height = "100%";
    };

    if (video.readyState >= 1 && video.videoWidth && video.videoHeight) {
      window.requestAnimationFrame(applyFit);
      window.setTimeout(applyFit, 80);
      window.setTimeout(applyFit, 260);
      return;
    }

    video.addEventListener("loadedmetadata", applyFit, { once: true });
    video.addEventListener("loadeddata", applyFit, { once: true });
    video.addEventListener("canplay", applyFit, { once: true });
    window.setTimeout(applyFit, 120);
    window.setTimeout(applyFit, 420);
    window.setTimeout(applyFit, 1000);
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
              <video class="product-media-object product-video-object" controls playsinline preload="metadata">
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
    const basePrice = variant ? getVariantPrice(variant) : getProductPrice(state.product);
    if (els.price) {
      els.price.textContent = formatCurrency(basePrice);
    }
    if (els.priceHint) {
      els.priceHint.textContent =
        basePrice > 0 ? "Giá đang áp dụng cho lựa chọn hiện tại" : "Shop chưa cập nhật giá";
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
    const hasVariant = Boolean(variant?.id);
    const hasStock = stock > 0;

    if (els.currentVariantLabel) {
      els.currentVariantLabel.textContent = hasVariant
        ? variant?.sku || "Biến thể mặc định"
        : "Chưa có biến thể";
    }

    if (els.variantMeta) {
      const pieces = [];
      if (hasVariant) {
        pieces.push(`SKU: ${variant?.sku || "Đang cập nhật"}`);
        if (Number(variant?.weight) > 0) {
          pieces.push(`Khối lượng: ${Number(variant.weight)}g`);
        }
        pieces.push(hasStock ? `Còn ${stock} sản phẩm` : "Tạm hết hàng");
      } else {
        pieces.push("Sản phẩm chưa có biến thể sẵn sàng bán.");
      }
      els.variantMeta.textContent = pieces.join(" • ");
    }

    if (els.stockText) {
      els.stockText.textContent = hasVariant
        ? hasStock
          ? `${formatCompactNumber(stock)} sản phẩm sẵn kho`
          : "Hết hàng"
        : "Chưa có biến thể";
    }

    if (els.soldCount) {
      els.soldCount.textContent = hasStock ? "Còn hàng" : "Hết hàng";
    }

    state.quantity = clampQuantity(state.quantity, hasStock ? stock : 1);

    if (els.qtyInput) {
      els.qtyInput.value = String(state.quantity);
      els.qtyInput.max = String(Math.max(1, Math.min(stock || 1, MAX_CART_QUANTITY)));
      els.qtyInput.disabled = !hasVariant || !hasStock;
    }

    if (els.qtyHint) {
      els.qtyHint.textContent = hasVariant
        ? hasStock
          ? `Có thể mua tối đa ${Math.min(stock, MAX_CART_QUANTITY)} sản phẩm`
          : "Biến thể này đang hết hàng"
        : "Chọn biến thể khi shop cập nhật";
    }

    if (els.qtyDecreaseBtn) {
      els.qtyDecreaseBtn.disabled = !hasVariant || !hasStock || state.quantity <= 1;
    }

    if (els.qtyIncreaseBtn) {
      els.qtyIncreaseBtn.disabled =
        !hasVariant ||
        !hasStock ||
        state.quantity >= Math.min(stock || 1, MAX_CART_QUANTITY);
    }

    if (els.addToCartBtn) {
      els.addToCartBtn.disabled = !hasVariant || !hasStock;
    }

    if (els.buyNowBtn) {
      els.buyNowBtn.disabled = !hasVariant || !hasStock;
    }

    renderPriceAndVouchers(variant);
  };

  const renderVariantOptions = () => {
    if (!els.variantOptions || !state.product) return;

    const variants = Array.isArray(state.product.product_variants)
      ? state.product.product_variants
      : [];

    if (!variants.length) {
      els.variantOptions.innerHTML = `
        <button class="variant-chip" type="button" disabled>
          <strong>Chưa mở bán</strong>
          <span>Shop đang cập nhật biến thể</span>
        </button>
      `;
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
            <strong>${escapeHtml(label)}</strong>
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
    const specs = [
      ["Danh mục", state.product?.categories?.name || "Chưa phân loại"],
      ["Shop", state.product?.shops?.name || "Shop Bambi"],
      [
        "Tình trạng",
        CONDITION_LABELS[state.product?.condition] || CONDITION_LABELS.new,
      ],
      ["SKU", variant?.sku || "Chưa cập nhật"],
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
        Number(variant?.weight) > 0 ? `${Number(variant.weight)} g` : "Chưa cập nhật",
      ],
      ["Ngày đăng", formatDate(state.product?.created_at)],
      [
        "Tình trạng kho",
        getVariantStock(variant) > 0 ? "Còn hàng" : "Tạm hết hàng",
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
      els.soldCount.textContent = stock > 0 ? "Còn hàng" : "Hết hàng";
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
      els.relatedEmpty.hidden = false;
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
      state.selectedVariantId =
        product?.product_variants?.find((variant) => getVariantStock(variant) > 0)?.id ||
        product?.product_variants?.[0]?.id ||
        "";
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
                )}&limit=12`
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
    if (!variant?.id) return;

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

    els.variantOptions?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-variant-id]");
      if (!button) return;
      state.selectedVariantId = button.dataset.variantId || "";
      state.quantity = 1;
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
      fitActiveVideo();
    });
  };

  bindEvents();
  loadProductPage();
})();
