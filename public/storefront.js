(function () {
  const page = document.body?.dataset?.page || "";
  const homeCategoryCarousel = document.querySelector("#storeCategoryCarousel");
  const homeCategoryGrid = document.querySelector("#storeCategoryGrid");
  const homeCategoryStatus = document.querySelector("#storeCategoryStatus");
  const homeCategoryPrev = document.querySelector("#storeCategoryPrev");
  const homeCategoryNext = document.querySelector("#storeCategoryNext");
  const homeFeaturedGrid = document.querySelector("#storeFeaturedProducts");
  const homeFeaturedStatus = document.querySelector("#storeFeaturedStatus");
  const homeFeaturedEmpty = document.querySelector("#storeFeaturedEmpty");
  const catalogTitle = document.querySelector("#catalogTitle");
  const catalogDescription = document.querySelector("#catalogDescription");
  const catalogTrailLabel = document.querySelector("#catalogTrailLabel");
  const catalogChildLinks = document.querySelector("#catalogChildLinks");
  const catalogProductCount = document.querySelector("#catalogProductCount");
  const catalogBranchCount = document.querySelector("#catalogBranchCount");
  const catalogLeafCount = document.querySelector("#catalogLeafCount");
  const catalogSectionTitle = document.querySelector("#catalogSectionTitle");
  const catalogCountLabel = document.querySelector("#catalogCountLabel");
  const catalogStatus = document.querySelector("#catalogStatus");
  const catalogProductGrid = document.querySelector("#catalogProductGrid");
  const catalogEmpty = document.querySelector("#catalogEmpty");

  const categoryCarouselState = {
    roots: [],
    columns: 10,
    pageSize: 20,
    slideIndex: 0,
  };

  let categoryResizeFrame = 0;

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

  const getInitials = (value) => {
    const parts = String(value || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (!parts.length) return "BM";
    return parts.map((part) => part[0]?.toUpperCase() || "").join("");
  };

  const getSubtreeProductCount = (node) =>
    Number(node?.product_count || 0) +
    getChildren(node).reduce(
      (total, child) => total + getSubtreeProductCount(child),
      0
    );

  const getSubtreeNodeCount = (node) =>
    1 + getChildren(node).reduce((total, child) => total + getSubtreeNodeCount(child), 0);

  const getSubtreeLeafCount = (node) => {
    const children = getChildren(node);
    if (!children.length) return 1;
    return children.reduce((total, child) => total + getSubtreeLeafCount(child), 0);
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
      const branchCount = Math.max(0, getSubtreeNodeCount(selected) - 1);
      const leafCount = getSubtreeLeafCount(selected);
      const totalProducts = Number(productsPayload?.pagination?.total || 0);

      document.title = `${selected.name} - Bambi`;

      if (catalogTitle) catalogTitle.textContent = selected.name;
      if (catalogTrailLabel) catalogTrailLabel.textContent = breadcrumb;
      if (catalogDescription) {
        catalogDescription.textContent = `Đang hiển thị sản phẩm thuộc nhánh ${breadcrumb}.`;
      }
      if (catalogProductCount) catalogProductCount.textContent = String(totalProducts);
      if (catalogBranchCount) catalogBranchCount.textContent = String(branchCount);
      if (catalogLeafCount) catalogLeafCount.textContent = String(leafCount);
      if (catalogSectionTitle) {
        catalogSectionTitle.textContent = `Sản phẩm thuộc ${selected.name}`;
      }
      if (catalogCountLabel) {
        catalogCountLabel.textContent = `${totalProducts} sản phẩm`;
      }

      hideStatus(catalogStatus);
      renderChildLinks(selected);
      renderProducts(
        productsPayload.data || [],
        catalogProductGrid,
        catalogEmpty,
        "Chưa có sản phẩm đang bán trong danh mục này."
      );
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
    bindCategoryCarousel();
    loadHomePage();
  }

  if (page === "category") {
    loadCategoryPage();
  }
})();
