(function () {
  const page = document.body?.dataset?.page || "";
  const homeCategoryCarousel = document.querySelector("#storeCategoryCarousel");
  const homeCategoryGrid = document.querySelector("#storeCategoryGrid");
  const homeCategoryStatus = document.querySelector("#storeCategoryStatus");
  const homeCategoryPrev = document.querySelector("#storeCategoryPrev");
  const homeCategoryNext = document.querySelector("#storeCategoryNext");
  const homeHeroSlider = document.querySelector("[data-hero-slider]");
  const homeHeroSliderTrack = document.querySelector("[data-hero-slider-track]");
  const homeHeroSliderDots = Array.from(
    document.querySelectorAll("[data-hero-slide-to]")
  );
  const homeHeroSliderArrows = Array.from(
    document.querySelectorAll("[data-hero-slide-nav]")
  );
  const homeHeroSliderSlides = Array.from(
    document.querySelectorAll(".hero-slider-slide")
  );
  const homeFeaturedGrid = document.querySelector("#storeFeaturedProducts");
  const homeFeaturedStatus = document.querySelector("#storeFeaturedStatus");
  const homeFeaturedEmpty = document.querySelector("#storeFeaturedEmpty");
  const catalogTitle = document.querySelector("#catalogTitle");
  const catalogDescription = document.querySelector("#catalogDescription");
  const catalogTrailLabel = document.querySelector("#catalogTrailLabel");
  const catalogChildLinks = document.querySelector("#catalogChildLinks");
  const catalogSectionTitle = document.querySelector("#catalogSectionTitle");
  const catalogStatus = document.querySelector("#catalogStatus");
  const catalogProductGrid = document.querySelector("#catalogProductGrid");
  const catalogEmpty = document.querySelector("#catalogEmpty");
  const catalogPriceMinInput = document.querySelector("#catalogPriceMin");
  const catalogPriceMaxInput = document.querySelector("#catalogPriceMax");
  const catalogApplyFiltersBtn = document.querySelector("#catalogApplyFilters");
  const catalogConditionInputs = Array.from(
    document.querySelectorAll("[data-catalog-condition]")
  );
  const catalogRatingButtons = Array.from(
    document.querySelectorAll("[data-catalog-rating]")
  );

  const categoryCarouselState = {
    roots: [],
    columns: 10,
    pageSize: 20,
    slideIndex: 0,
  };

  const catalogState = {
    allProducts: [],
    filteredProducts: [],
    context: "category",
    query: "",
    reviewSummaryById: new Map(),
    reviewsLoaded: false,
    reviewLoadPromise: null,
    filters: {
      minPrice: null,
      maxPrice: null,
      minRating: 0,
      conditions: new Set(),
    },
  };

  let categoryResizeFrame = 0;
  let heroSliderTimer = 0;

  const CONDITION_LABELS = {
    new: "Mới",
    like_new: "Như mới",
    used: "Đã dùng",
  };

  const formatCurrency = (value) => {
    const amount = Number(value);
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
  };

  const escapeHtml = (value) =>
    String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const fetchJson = async (path) => {
    const response = await fetch(path);
    const text = await response.text();
    let payload = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch (_error) {
      payload = { message: text };
    }

    if (!response.ok) {
      throw new Error(payload.message || "Không thể tải dữ liệu.");
    }

    return payload;
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

  const getCategoryHref = (id) => `/ui/category.html?id=${encodeURIComponent(id)}`;
  const getProductHref = (id) => `/ui/product.html?id=${encodeURIComponent(id)}`;

  const getChildren = (node) => (Array.isArray(node?.children) ? node.children : []);

  const getProductImage = (product) => {
    if (product?.cover_image_url) return product.cover_image_url;
    if (Array.isArray(product?.media_gallery) && product.media_gallery.length) {
      return product.media_gallery[0];
    }
    return "";
  };

  const getProductPrice = (product) => {
    const prices = Array.isArray(product?.product_variants)
      ? product.product_variants
          .map((variant) => Number(variant?.price))
          .filter(Number.isFinite)
      : [];
    return prices.length ? Math.min(...prices) : 0;
  };

  const parseOptionalNumber = (value) => {
    const text = String(value ?? "").trim();
    if (!text) return null;

    const amount = Number(text);
    return Number.isFinite(amount) ? amount : Number.NaN;
  };

  const getCatalogReviewSummary = (productId) =>
    catalogState.reviewSummaryById.get(String(productId)) || {
      total_reviews: 0,
      average_rating: 0,
    };

  const getCatalogProductRating = (product) =>
    Number(
      product?.average_rating ??
        product?.rating_average ??
        getCatalogReviewSummary(product?.id).average_rating ??
        0
    ) || 0;

  const hasActiveCatalogFilters = () =>
    catalogState.filters.minPrice !== null ||
    catalogState.filters.maxPrice !== null ||
    catalogState.filters.minRating > 0 ||
    catalogState.filters.conditions.size > 0;

  const getInitials = (value) => {
    const parts = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) return "BM";
    return parts.map((part) => part[0]?.toUpperCase() || "").join("");
  };

  const findCategoryNode = (nodes, id, trail = []) => {
    for (const node of Array.isArray(nodes) ? nodes : []) {
      const nextTrail = [...trail, node];
      if (String(node?.id) === String(id)) {
        return { node, trail: nextTrail };
      }

      const nested = findCategoryNode(getChildren(node), id, nextTrail);
      if (nested) return nested;
    }

    return null;
  };

  const chunkItems = (items, size) => {
    const chunks = [];

    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }

    return chunks;
  };

  const getCategoryColumns = () => {
    const width = homeCategoryCarousel?.clientWidth || window.innerWidth;

    if (width >= 1160) return 10;
    if (width >= 980) return 8;
    if (width >= 780) return 6;
    if (width >= 620) return 4;
    return 3;
  };

  const getCategorySlidesCount = () =>
    Math.ceil(categoryCarouselState.roots.length / categoryCarouselState.pageSize);

  const getHeroSlidesCount = () =>
    homeHeroSliderTrack ? homeHeroSliderTrack.children.length : 0;

  const syncHeroSlider = (nextIndex, { animate = true } = {}) => {
    if (!homeHeroSlider || !homeHeroSliderTrack) return;

    const slideCount = getHeroSlidesCount();
    if (!slideCount) return;

    const safeIndex = ((Number(nextIndex) % slideCount) + slideCount) % slideCount;
    homeHeroSliderTrack.style.transition = animate
      ? "transform 560ms cubic-bezier(0.22, 1, 0.36, 1)"
      : "none";
    homeHeroSliderTrack.style.transform = `translateX(-${safeIndex * 100}%)`;
    homeHeroSlider.dataset.activeIndex = String(safeIndex);

    homeHeroSliderSlides.forEach((slide, index) => {
      const active = index === safeIndex;
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      slide.tabIndex = active ? 0 : -1;
    });

    homeHeroSliderDots.forEach((button, index) => {
      const active = index === safeIndex;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  };

  const stopHeroSlider = () => {
    if (!heroSliderTimer) return;
    window.clearInterval(heroSliderTimer);
    heroSliderTimer = 0;
  };

  const startHeroSlider = () => {
    if (!homeHeroSlider || !homeHeroSliderTrack) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (getHeroSlidesCount() <= 1) return;

    stopHeroSlider();
    heroSliderTimer = window.setInterval(() => {
      const currentIndex = Number(homeHeroSlider.dataset.activeIndex || 0);
      syncHeroSlider(currentIndex + 1);
    }, 3000);
  };

  const releaseHeroSliderControlFocus = (button, event) => {
    if (!button || !event || event.detail === 0) return;

    window.requestAnimationFrame(() => {
      if (document.activeElement === button) {
        button.blur();
      }
    });
  };

  const bindHeroSlider = () => {
    if (!homeHeroSlider || !homeHeroSliderTrack) return;
    if (homeHeroSlider.dataset.bound === "true") return;

    homeHeroSlider.dataset.bound = "true";
    syncHeroSlider(0, { animate: false });

    homeHeroSliderDots.forEach((button) => {
      button.addEventListener("click", (event) => {
        const nextIndex = Number(button.dataset.heroSlideTo || 0);
        syncHeroSlider(nextIndex);
        startHeroSlider();
        releaseHeroSliderControlFocus(button, event);
      });
    });

    homeHeroSliderArrows.forEach((button) => {
      button.addEventListener("click", (event) => {
        const delta = Number(button.dataset.heroSlideNav || 0);
        const currentIndex = Number(homeHeroSlider.dataset.activeIndex || 0);
        if (!delta) return;
        syncHeroSlider(currentIndex + delta);
        startHeroSlider();
        releaseHeroSliderControlFocus(button, event);
      });
    });

    homeHeroSlider.addEventListener("focusin", stopHeroSlider);
    homeHeroSlider.addEventListener("focusout", () => {
      window.setTimeout(() => {
        if (!homeHeroSlider.contains(document.activeElement)) {
          startHeroSlider();
        }
      }, 0);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopHeroSlider();
      } else {
        startHeroSlider();
      }
    });

    startHeroSlider();
  };

  const syncCategoryCarousel = () => {
    if (!homeCategoryGrid) return;

    const slideCount = getCategorySlidesCount();
    const maxSlideIndex = Math.max(0, slideCount - 1);
    categoryCarouselState.slideIndex = Math.min(
      Math.max(categoryCarouselState.slideIndex, 0),
      maxSlideIndex
    );

    homeCategoryGrid.style.transform = `translateX(-${categoryCarouselState.slideIndex * 100}%)`;

    if (homeCategoryPrev) {
      homeCategoryPrev.hidden =
        slideCount <= 1 || categoryCarouselState.slideIndex <= 0;
    }

    if (homeCategoryNext) {
      homeCategoryNext.hidden =
        slideCount <= 1 || categoryCarouselState.slideIndex >= maxSlideIndex;
    }
  };

  const renderCategoryCards = (roots, { preserveAnchor = false } = {}) => {
    if (!homeCategoryGrid || !homeCategoryCarousel) return;

    categoryCarouselState.roots = Array.isArray(roots) ? roots : [];

    if (!categoryCarouselState.roots.length) {
      homeCategoryGrid.innerHTML = "";
      homeCategoryCarousel.hidden = true;
      showStatus(homeCategoryStatus, "Chưa có danh mục gốc nào để hiển thị.");
      return;
    }

    const currentStartIndex = preserveAnchor
      ? categoryCarouselState.slideIndex * categoryCarouselState.pageSize
      : 0;
    const columns = getCategoryColumns();
    const pageSize = columns * 2;
    const slides = chunkItems(categoryCarouselState.roots, pageSize);

    categoryCarouselState.columns = columns;
    categoryCarouselState.pageSize = pageSize;
    categoryCarouselState.slideIndex = preserveAnchor
      ? Math.floor(currentStartIndex / pageSize)
      : 0;

    hideStatus(homeCategoryStatus);
    homeCategoryCarousel.hidden = false;
    homeCategoryGrid.innerHTML = slides
      .map(
        (slide) => `
          <div class="category-slide" style="--category-columns: ${columns};">
            ${slide
              .map(
                (node) => `
                  <a class="category-card category-link" href="${getCategoryHref(node.id)}">
                    <div class="category-icon">${escapeHtml(getInitials(node.name))}</div>
                    <div class="category-name">${escapeHtml(node.name)}</div>
                  </a>
                `
              )
              .join("")}
          </div>
        `
      )
      .join("");

    syncCategoryCarousel();
  };

  const renderProducts = (products, target, emptyElement, emptyMessage) => {
    if (!target) return;

    if (!Array.isArray(products) || !products.length) {
      target.innerHTML = "";
      if (emptyElement) {
        emptyElement.hidden = false;
        emptyElement.textContent = emptyMessage;
      }
      return;
    }

    if (emptyElement) {
      emptyElement.hidden = true;
    }

    target.innerHTML = products
      .map((product) => {
        const imageUrl = getProductImage(product);
        const price = getProductPrice(product);
        const shopName = product?.shops?.name || "Shop Bambi";
        const conditionLabel =
          CONDITION_LABELS[product?.condition] || CONDITION_LABELS.new;

        return `
          <a class="product-card-link" href="${getProductHref(product?.id || "")}">
            <article class="product-card">
            <div class="badge">${escapeHtml(conditionLabel)}</div>
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
              <div class="product-shop">${escapeHtml(shopName)}</div>
            </div>
            </article>
          </a>
        `;
      })
      .join("");
  };

  const renderChildLinks = (node) => {
    if (!catalogChildLinks) return;

    const children = getChildren(node);

    if (!children.length) {
      catalogChildLinks.innerHTML = `
        <a class="catalog-chip active" href="${getCategoryHref(node.id)}">Đang xem ${escapeHtml(
          node.name
        )}</a>
      `;
      return;
    }

    catalogChildLinks.innerHTML = [
      `<a class="catalog-chip active" href="${getCategoryHref(node.id)}">Tất cả trong ${escapeHtml(
        node.name
      )}</a>`,
      ...children.map(
        (child) =>
          `<a class="catalog-chip" href="${getCategoryHref(child.id)}">${escapeHtml(
            child.name
          )}</a>`
      ),
    ].join("");
  };

  const syncCatalogRatingButtons = () => {
    catalogRatingButtons.forEach((button) => {
      const isActive =
        Number(button.dataset.catalogRating || 0) === catalogState.filters.minRating;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  };

  const renderCatalogProducts = (products) => {
    const filteredProducts = Array.isArray(products) ? products : [];

    catalogState.filteredProducts = filteredProducts;

    renderProducts(
      filteredProducts,
      catalogProductGrid,
      catalogEmpty,
      hasActiveCatalogFilters()
        ? "Không có sản phẩm phù hợp với bộ lọc hiện tại."
        : catalogState.context === "search"
          ? `Không tìm thấy sản phẩm phù hợp với "${catalogState.query}".`
          : "Chưa có sản phẩm đang bán trong danh mục này."
    );
  };

  const ensureCatalogReviewSummaries = async () => {
    if (catalogState.reviewsLoaded) return;
    if (catalogState.reviewLoadPromise) {
      await catalogState.reviewLoadPromise;
      return;
    }

    const productIds = Array.from(
      new Set(
        catalogState.allProducts
          .map((product) => String(product?.id || ""))
          .filter(Boolean)
      )
    );

    if (!productIds.length) {
      catalogState.reviewsLoaded = true;
      return;
    }

    catalogState.reviewLoadPromise = (async () => {
      showStatus(catalogStatus, "Đang tải đánh giá sản phẩm...");

      const results = await Promise.allSettled(
        productIds.map(async (productId) => ({
          productId,
          payload: await fetchJson(
            `/reviews?product_id=${encodeURIComponent(productId)}&page=1&limit=1`
          ),
        }))
      );

      let successCount = 0;

      results.forEach((result) => {
        if (result.status !== "fulfilled") return;
        successCount += 1;
        catalogState.reviewSummaryById.set(
          result.value.productId,
          result.value.payload?.summary || {
            total_reviews: 0,
            average_rating: 0,
          }
        );
      });

      if (!successCount) {
        throw new Error("Không thể tải đánh giá sản phẩm để lọc.");
      }

      catalogState.reviewsLoaded = true;
      hideStatus(catalogStatus);
    })();

    try {
      await catalogState.reviewLoadPromise;
    } finally {
      catalogState.reviewLoadPromise = null;
    }
  };

  const applyCatalogFilters = async () => {
    if (catalogState.filters.minRating > 0) {
      await ensureCatalogReviewSummaries();
    }

    const filteredProducts = catalogState.allProducts.filter((product) => {
      const price = getProductPrice(product);
      const condition = String(product?.condition || "");
      const rating = getCatalogProductRating(product);

      if (
        catalogState.filters.minPrice !== null &&
        (!Number.isFinite(price) || price < catalogState.filters.minPrice)
      ) {
        return false;
      }

      if (
        catalogState.filters.maxPrice !== null &&
        (!Number.isFinite(price) || price > catalogState.filters.maxPrice)
      ) {
        return false;
      }

      if (
        catalogState.filters.conditions.size > 0 &&
        !catalogState.filters.conditions.has(condition)
      ) {
        return false;
      }

      if (
        catalogState.filters.minRating > 0 &&
        (!Number.isFinite(rating) || rating < catalogState.filters.minRating)
      ) {
        return false;
      }

      return true;
    });

    syncCatalogRatingButtons();
    hideStatus(catalogStatus);
    renderCatalogProducts(filteredProducts);
  };

  const bindCatalogFilters = () => {
    if (!catalogApplyFiltersBtn || catalogApplyFiltersBtn.dataset.bound === "true") {
      return;
    }

    catalogApplyFiltersBtn.dataset.bound = "true";

    catalogApplyFiltersBtn.addEventListener("click", async () => {
      const minPrice = parseOptionalNumber(catalogPriceMinInput?.value);
      const maxPrice = parseOptionalNumber(catalogPriceMaxInput?.value);

      if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) {
        showStatus(catalogStatus, "Khoảng giá không hợp lệ.", true);
        return;
      }

      if (
        (minPrice !== null && Number.isFinite(minPrice) && minPrice < 0) ||
        (maxPrice !== null && Number.isFinite(maxPrice) && maxPrice < 0)
      ) {
        showStatus(catalogStatus, "Giá lọc phải lớn hơn hoặc bằng 0.", true);
        return;
      }

      if (
        minPrice !== null &&
        maxPrice !== null &&
        Number.isFinite(minPrice) &&
        Number.isFinite(maxPrice) &&
        minPrice > maxPrice
      ) {
        showStatus(catalogStatus, "Giá từ phải nhỏ hơn hoặc bằng giá đến.", true);
        return;
      }

      catalogState.filters.minPrice = minPrice;
      catalogState.filters.maxPrice = maxPrice;

      try {
        await applyCatalogFilters();
      } catch (error) {
        showStatus(
          catalogStatus,
          error instanceof Error ? error.message : "Không thể áp dụng bộ lọc.",
          true
        );
      }
    });

    [catalogPriceMinInput, catalogPriceMaxInput].forEach((input) => {
      input?.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        catalogApplyFiltersBtn.click();
      });
    });

    catalogConditionInputs.forEach((input) => {
      input.addEventListener("change", async () => {
        catalogState.filters.conditions = new Set(
          catalogConditionInputs
            .filter((item) => item.checked)
            .map((item) => String(item.value || ""))
        );

        try {
          await applyCatalogFilters();
        } catch (error) {
          showStatus(
            catalogStatus,
            error instanceof Error ? error.message : "Không thể áp dụng bộ lọc.",
            true
          );
        }
      });
    });

    catalogRatingButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        const nextRating = Number(button.dataset.catalogRating || 0);
        catalogState.filters.minRating =
          catalogState.filters.minRating === nextRating ? 0 : nextRating;

        try {
          await applyCatalogFilters();
        } catch (error) {
          showStatus(
            catalogStatus,
            error instanceof Error ? error.message : "Không thể áp dụng bộ lọc.",
            true
          );
        }
      });
    });
  };

  const bindCategoryCarousel = () => {
    if (!homeCategoryCarousel || homeCategoryCarousel.dataset.bound === "true") return;

    homeCategoryCarousel.dataset.bound = "true";

    homeCategoryPrev?.addEventListener("click", () => {
      if (categoryCarouselState.slideIndex <= 0) return;
      categoryCarouselState.slideIndex -= 1;
      syncCategoryCarousel();
    });

    homeCategoryNext?.addEventListener("click", () => {
      if (categoryCarouselState.slideIndex >= getCategorySlidesCount() - 1) return;
      categoryCarouselState.slideIndex += 1;
      syncCategoryCarousel();
    });

    window.addEventListener("resize", () => {
      if (!categoryCarouselState.roots.length) return;

      if (categoryResizeFrame) {
        window.cancelAnimationFrame(categoryResizeFrame);
      }

      categoryResizeFrame = window.requestAnimationFrame(() => {
        categoryResizeFrame = 0;
        const nextColumns = getCategoryColumns();
        if (nextColumns === categoryCarouselState.columns) return;
        renderCategoryCards(categoryCarouselState.roots, { preserveAnchor: true });
      });
    });
  };

  const loadHomePage = async () => {
    try {
      const [categoriesPayload, productsPayload] = await Promise.all([
        fetchJson("/categories"),
        fetchJson("/products?status=active&limit=6"),
      ]);

      renderCategoryCards(categoriesPayload.tree || []);
      hideStatus(homeFeaturedStatus);
      renderProducts(
        productsPayload.data || [],
        homeFeaturedGrid,
        homeFeaturedEmpty,
        "Chưa có sản phẩm nào đang hiển thị trên Bambi."
      );
    } catch (error) {
      if (homeCategoryGrid) {
        homeCategoryGrid.innerHTML = "";
      }
      if (homeCategoryCarousel) {
        homeCategoryCarousel.hidden = true;
      }
      showStatus(
        homeCategoryStatus,
        error instanceof Error ? error.message : "Không thể tải danh mục.",
        true
      );

      if (homeFeaturedGrid) homeFeaturedGrid.innerHTML = "";
      showStatus(
        homeFeaturedStatus,
        error instanceof Error ? error.message : "Không thể tải storefront.",
        true
      );
    }
  };

  const loadCategoryPage = async () => {
    const params = new URLSearchParams(window.location.search);
    const categoryId = params.get("id");
    const query = params.get("q")?.trim() || "";

    if (query) {
      try {
        const productsPayload = await fetchJson(
          `/products?status=active&q=${encodeURIComponent(query)}&limit=100`
        );

        document.title = `Kết quả tìm kiếm: ${query} - Bambi`;
        catalogState.context = "search";
        catalogState.query = query;
        catalogState.allProducts = Array.isArray(productsPayload?.data)
          ? productsPayload.data
          : [];
        catalogState.reviewSummaryById = new Map();
        catalogState.reviewsLoaded = false;
        catalogState.reviewLoadPromise = null;

        if (catalogTitle) catalogTitle.textContent = `Kết quả cho "${query}"`;
        if (catalogTrailLabel) catalogTrailLabel.textContent = "Tìm kiếm";
        if (catalogDescription) {
          catalogDescription.textContent =
            "Đang hiển thị các sản phẩm khớp với từ khóa bạn vừa nhập.";
        }
        if (catalogSectionTitle) {
          catalogSectionTitle.textContent = `Sản phẩm liên quan đến "${query}"`;
        }
        if (catalogChildLinks) {
          catalogChildLinks.innerHTML = `<span class="catalog-chip active">Từ khóa: ${escapeHtml(
            query
          )}</span>`;
        }

        hideStatus(catalogStatus);
        syncCatalogRatingButtons();
        renderCatalogProducts(catalogState.allProducts);
      } catch (error) {
        if (catalogProductGrid) catalogProductGrid.innerHTML = "";
        showStatus(
          catalogStatus,
          error instanceof Error ? error.message : "Không thể tìm kiếm sản phẩm.",
          true
        );
        if (catalogEmpty) {
          catalogEmpty.hidden = false;
          catalogEmpty.textContent = `Không thể hiển thị kết quả cho "${query}".`;
        }
      }
      return;
    }

    if (!categoryId) {
      showStatus(catalogStatus, "Thiếu mã danh mục để tải sản phẩm.", true);
      if (catalogEmpty) {
        catalogEmpty.hidden = false;
        catalogEmpty.textContent = "Hãy quay lại trang chủ và chọn một danh mục.";
      }
      return;
    }

    try {
      const categoriesPayload = await fetchJson("/categories");
      const match = findCategoryNode(categoriesPayload.tree || [], categoryId);

      if (!match?.node) {
        throw new Error("Danh mục không tồn tại hoặc đã bị xóa.");
      }

      const productsPayload = await fetchJson(
        `/products?status=active&category_id=${encodeURIComponent(
          categoryId
        )}&include_descendants=1&limit=100`
      );

      const selected = match.node;
      const breadcrumb = match.trail.map((item) => item.name).join(" / ");
      document.title = `${selected.name} - Bambi`;

      if (catalogTitle) catalogTitle.textContent = selected.name;
      if (catalogTrailLabel) catalogTrailLabel.textContent = breadcrumb;
      if (catalogDescription) {
        catalogDescription.textContent = `Đang hiển thị sản phẩm thuộc nhánh ${breadcrumb}.`;
      }
      if (catalogSectionTitle) {
        catalogSectionTitle.textContent = `Sản phẩm thuộc ${selected.name}`;
      }

      catalogState.context = "category";
      catalogState.query = "";
      catalogState.allProducts = Array.isArray(productsPayload?.data)
        ? productsPayload.data
        : [];
      catalogState.reviewSummaryById = new Map();
      catalogState.reviewsLoaded = false;
      catalogState.reviewLoadPromise = null;

      hideStatus(catalogStatus);
      renderChildLinks(selected);
      syncCatalogRatingButtons();
      renderCatalogProducts(catalogState.allProducts);
    } catch (error) {
      if (catalogProductGrid) catalogProductGrid.innerHTML = "";
      showStatus(
        catalogStatus,
        error instanceof Error ? error.message : "Không thể tải danh mục.",
        true
      );
      if (catalogEmpty) {
        catalogEmpty.hidden = false;
        catalogEmpty.textContent = "Không thể hiển thị sản phẩm của danh mục này.";
      }
    }
  };

  if (page === "home") {
    bindHeroSlider();
    bindCategoryCarousel();
    loadHomePage();
  }

  if (page === "category") {
    bindCatalogFilters();
    loadCategoryPage();
  }
})();
