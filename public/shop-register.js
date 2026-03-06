(() => {
  const shopForm = document.querySelector("#shopForm");
  const shopSummary = document.querySelector("#shopSummary");
  const pageStatus = document.querySelector("#pageStatus");
  const addDocumentBtn = document.querySelector("#addDocumentBtn");
  const documentList = document.querySelector("#documentList");
  const formCard = document.querySelector(".seller-form-card");
  const formTitle = document.querySelector("#shopFormTitle");
  const formIntro = document.querySelector("#shopFormIntro");
  const submitShopBtn = document.querySelector("#submitShopBtn");

  if (!shopForm || !shopSummary || !documentList) {
    return;
  }

  const docTypeOptions = [
    { value: "cccd", label: "CCCD / CMND" },
    { value: "business_license", label: "Giấy phép kinh doanh" },
    { value: "bank_proof", label: "Xác nhận tài khoản ngân hàng" },
    { value: "tax_code", label: "Mã số thuế / hộ kinh doanh" },
    { value: "other", label: "Khác" },
  ];

  const defaultDocumentTypes = ["cccd", "business_license"];
  const statusMap = {
    pending: "Đang chờ duyệt",
    approved: "Đã được duyệt",
    rejected: "Bị từ chối",
  };

  let currentShopStatus = null;

  const inputs = {
    name: document.querySelector("#shopName"),
    description: document.querySelector("#shopDescription"),
    province: document.querySelector("#province"),
    district: document.querySelector("#district"),
    ward: document.querySelector("#ward"),
    detail: document.querySelector("#detailAddress"),
    bankName: document.querySelector("#bankName"),
    accountHolder: document.querySelector("#accountHolder"),
    accountNumber: document.querySelector("#accountNumber"),
  };

  const getAuthToken = () =>
    localStorage.getItem("bambi_user_token") ||
    localStorage.getItem("bambi_seller_token") ||
    "";

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return entities[char] || char;
    });

  const setPageStatus = (message, type = "info") => {
    if (!pageStatus) return;

    if (!message) {
      pageStatus.classList.add("hidden");
      pageStatus.textContent = "";
      pageStatus.classList.remove("error");
      return;
    }

    pageStatus.textContent = message;
    pageStatus.classList.remove("hidden");
    pageStatus.classList.toggle("error", type === "error");
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("vi-VN");
  };

  const formatBytes = (value = 0) => {
    if (!value) return "";
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileNameFromUrl = (url) => {
    if (!url) return "Tệp đã tải";
    try {
      const parsed = new URL(url, window.location.origin);
      return decodeURIComponent(
        parsed.pathname.split("/").filter(Boolean).pop() || "Tệp đã tải"
      );
    } catch (_error) {
      const raw = String(url).split("/").pop();
      return raw ? decodeURIComponent(raw) : "Tệp đã tải";
    }
  };

  const apiFetch = async (path, options = {}) => {
    const headers = { ...(options.headers || {}) };
    let body = options.body;
    const token = getAuthToken();

    if (body && typeof body !== "string" && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(path, {
      ...options,
      headers,
      body,
    });

    const text = await response.text();
    let payload = {};

    try {
      payload = text ? JSON.parse(text) : {};
    } catch (_error) {
      payload = {
        message: text.includes("Cannot POST /shops/documents/upload")
          ? "Server hiện tại chưa nhận route upload giấy tờ. Hãy khởi động lại server rồi thử lại."
          : text,
      };
    }

    if (!response.ok) {
      throw new Error(payload.message || "Không thể xử lý yêu cầu.");
    }

    return payload;
  };

  const buildUploadedFile = (file) => ({
    doc_url: file.doc_url,
    original_name: file.original_name || getFileNameFromUrl(file.doc_url),
    mime_type: file.mime_type || "",
    size: file.size || 0,
  });

  const groupDocumentsByType = (documents = []) => {
    const grouped = new Map();

    documents.forEach((doc) => {
      const docType = doc.doc_type || "other";
      if (!grouped.has(docType)) {
        grouped.set(docType, []);
      }

      grouped.get(docType).push(buildUploadedFile(doc));
    });

    return Array.from(grouped.entries()).map(([doc_type, files]) => ({
      doc_type,
      files,
    }));
  };

  const getDocumentTypeLabel = (value) =>
    docTypeOptions.find((item) => item.value === value)?.label || "Khác";

  const setFormMode = (mode) => {
    if (!formCard) return;

    if (mode === "hidden") {
      formCard.classList.add("hidden");
      return;
    }

    formCard.classList.remove("hidden");

    if (mode === "rejected") {
      if (formTitle) {
        formTitle.textContent = "Chỉnh sửa và nộp lại hồ sơ shop";
      }
      if (formIntro) {
        formIntro.textContent =
          "Hồ sơ trước đó đã bị từ chối. Cập nhật lại thông tin, tải lên giấy tờ mới nếu cần rồi nộp lại.";
      }
      if (submitShopBtn) {
        submitShopBtn.textContent = "Nộp lại hồ sơ shop";
      }
      return;
    }

    if (formTitle) {
      formTitle.textContent = "Đăng ký shop mới";
    }
    if (formIntro) {
      formIntro.textContent =
        "Điền đầy đủ thông tin để hồ sơ của bạn có thể được duyệt nhanh hơn.";
    }
    if (submitShopBtn) {
      submitShopBtn.textContent = "Gửi hồ sơ shop";
    }
  };

  const setInputValue = (input, value) => {
    if (input) {
      input.value = value || "";
    }
  };

  const clearDocumentRows = () => {
    documentList.innerHTML = "";
  };

  const createEmptyFileChip = (message, className = "") => {
    const item = document.createElement("div");
    item.className = `doc-file-chip empty ${className}`.trim();
    item.textContent = message;
    return item;
  };

  const renderSelectedFiles = (row) => {
    const container = row.querySelector(".selected-files");
    const fileInput = row.querySelector(".doc-file");
    const files = Array.from(fileInput?.files || []);

    if (!container) return;
    container.innerHTML = "";

    if (!files.length) {
      container.appendChild(createEmptyFileChip("Chưa chọn tệp.", "pending"));
      return;
    }

    files.forEach((file) => {
      const item = document.createElement("div");
      item.className = "doc-file-chip pending";

      const name = document.createElement("strong");
      name.textContent = file.name;

      const meta = document.createElement("span");
      meta.textContent = formatBytes(file.size) || "Tệp mới chọn";

      item.append(name, meta);
      container.appendChild(item);
    });
  };

  const renderUploadedFiles = (row) => {
    const container = row.querySelector(".uploaded-files");
    const uploadedFiles = row._uploadedFiles || [];

    if (!container) return;
    container.innerHTML = "";

    if (!uploadedFiles.length) {
      container.appendChild(
        createEmptyFileChip("Chưa có tệp đã tải lên.", "uploaded")
      );
      return;
    }

    uploadedFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "doc-file-chip uploaded";

      const info = document.createElement("div");

      const link = document.createElement("a");
      link.href = file.doc_url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = file.original_name || getFileNameFromUrl(file.doc_url);

      const meta = document.createElement("span");
      const metaParts = [];

      if (file.mime_type) {
        metaParts.push(file.mime_type);
      }
      if (file.size) {
        metaParts.push(formatBytes(file.size));
      }
      meta.textContent = metaParts.join(" · ") || "Đã tải lên";

      info.append(link, meta);

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "remove-uploaded-file";
      removeBtn.dataset.index = String(index);
      removeBtn.textContent = "Xóa";

      item.append(info, removeBtn);
      container.appendChild(item);
    });
  };

  const setDocumentStatus = (row, message, type = "info") => {
    const statusNode = row.querySelector(".doc-status");
    if (!statusNode) return;

    statusNode.textContent = message;
    statusNode.classList.toggle("error", type === "error");
  };

  const createDocumentRow = ({ doc_type = "other", files = [] } = {}) => {
    const wrapper = document.createElement("div");
    wrapper.className = "doc-item";
    wrapper._uploadedFiles = files.map(buildUploadedFile);

    wrapper.innerHTML = `
      <select class="doc-type">
        ${docTypeOptions
          .map(
            (option) =>
              `<option value="${option.value}">${escapeHtml(option.label)}</option>`
          )
          .join("")}
      </select>
      <div class="doc-upload-panel">
        <input class="doc-file" type="file" accept=".jpg,.jpeg,.png,.pdf" multiple />
        <div class="doc-upload-actions">
          <span class="doc-status">Chưa có tệp nào.</span>
        </div>
        <div class="doc-files-group">
          <div class="doc-files-title">Tệp đã chọn</div>
          <div class="doc-files selected-files"></div>
        </div>
        <div class="doc-files-group">
          <div class="doc-files-title">Tệp đã tải lên</div>
          <div class="doc-files uploaded-files"></div>
        </div>
      </div>
      <button type="button" class="remove-doc">Xóa</button>
    `;

    const typeSelect = wrapper.querySelector(".doc-type");
    if (typeSelect) {
      typeSelect.value = doc_type;
    }

    renderSelectedFiles(wrapper);
    renderUploadedFiles(wrapper);
    setDocumentStatus(
      wrapper,
      wrapper._uploadedFiles.length
        ? `Đã có ${wrapper._uploadedFiles.length} tệp đã tải lên.`
        : "Chưa có tệp nào."
    );

    documentList.appendChild(wrapper);
    return wrapper;
  };

  const addDefaultDocumentRows = () => {
    defaultDocumentTypes.forEach((docType) => createDocumentRow({ doc_type: docType }));
  };

  const resetFormFields = () => {
    shopForm.reset();
    setInputValue(inputs.name, "");
    setInputValue(inputs.description, "");
    setInputValue(inputs.province, "");
    setInputValue(inputs.district, "");
    setInputValue(inputs.ward, "");
    setInputValue(inputs.detail, "");
    setInputValue(inputs.bankName, "");
    setInputValue(inputs.accountHolder, "");
    setInputValue(inputs.accountNumber, "");
    clearDocumentRows();
    addDefaultDocumentRows();
  };

  const fillForm = (shop) => {
    setInputValue(inputs.name, shop.name);
    setInputValue(inputs.description, shop.description);

    const address = shop.shop_addresses?.[0];
    setInputValue(inputs.province, address?.province);
    setInputValue(inputs.district, address?.district);
    setInputValue(inputs.ward, address?.ward);
    setInputValue(inputs.detail, address?.detail);

    const payment = shop.shop_payment_accounts?.[0];
    setInputValue(inputs.bankName, payment?.bank_name);
    setInputValue(inputs.accountHolder, payment?.account_holder);
    setInputValue(inputs.accountNumber, payment?.account_number);
  };

  const populateDocuments = (shop) => {
    clearDocumentRows();

    const groupedDocuments = groupDocumentsByType(shop.shop_documents || []);
    if (!groupedDocuments.length) {
      addDefaultDocumentRows();
      return;
    }

    groupedDocuments.forEach((group) => createDocumentRow(group));
  };

  const buildSummaryMeta = (shop) => {
    const address = shop.shop_addresses?.[0];
    const payment = shop.shop_payment_accounts?.[0];
    const groupedDocuments = groupDocumentsByType(shop.shop_documents || []);
    const documentsText = groupedDocuments.length
      ? groupedDocuments
          .map(
            (group) =>
              `${escapeHtml(getDocumentTypeLabel(group.doc_type))} (${group.files.length})`
          )
          .join(" · ")
      : "Chưa có";

    return `
      <div>
        <span>Tên shop</span>
        <strong>${escapeHtml(shop.name || "-")}</strong>
      </div>
      <div>
        <span>Ngày gửi hồ sơ</span>
        ${escapeHtml(formatDate(shop.created_at))}
      </div>
      <div>
        <span>Địa chỉ vận hành</span>
        ${escapeHtml(
          address
            ? [address.detail, address.ward, address.district, address.province]
                .filter(Boolean)
                .join(", ")
            : "Chưa có"
        )}
      </div>
      <div>
        <span>Tài khoản nhận tiền</span>
        ${escapeHtml(
          payment
            ? [payment.bank_name, payment.account_holder, payment.account_number]
                .filter(Boolean)
                .join(" · ")
            : "Chưa có"
        )}
      </div>
      <div>
        <span>Giấy tờ đã nộp</span>
        ${documentsText}
      </div>
      ${
        shop.rejected_reason
          ? `
            <div>
              <span>Lý do từ chối</span>
              ${escapeHtml(shop.rejected_reason)}
            </div>
          `
          : ""
      }
    `;
  };

  const renderLoginRequired = () => {
    currentShopStatus = null;
    setFormMode("hidden");
    shopSummary.innerHTML = `
      <div class="summary-state">
        <span class="status-pill rejected">Cần đăng nhập</span>
        <p style="margin: 12px 0 0; color: var(--muted);">
          Bạn cần đăng nhập tài khoản mua hàng trước khi gửi hồ sơ đăng ký shop.
        </p>
      </div>
      <div class="summary-actions">
        <a class="primary-link" href="/ui/login.html">Đăng nhập để tiếp tục</a>
        <a class="ghost-link" href="/ui/">Quay lại trang chủ</a>
      </div>
    `;
  };

  const renderEmptyShop = () => {
    currentShopStatus = null;
    setFormMode("new");
    resetFormFields();

    shopSummary.innerHTML = `
      <div class="summary-state">
        <span class="status-pill pending">Chưa có hồ sơ</span>
        <p style="margin: 12px 0 0; color: var(--muted);">
          Tài khoản của bạn chưa đăng ký shop. Điền biểu mẫu bên phải để bắt đầu.
        </p>
      </div>
      <div class="summary-meta">
        <div>
          <span>Gợi ý</span>
          Chuẩn bị sẵn tên shop, địa chỉ vận hành, tài khoản nhận tiền và giấy tờ xác minh để gửi hồ sơ nhanh hơn.
        </div>
        <div>
          <span>Lưu ý</span>
          Mỗi tài khoản chỉ có một hồ sơ shop đang hoạt động. Nếu hồ sơ bị từ chối, bạn có thể sửa rồi nộp lại trên chính trang này.
        </div>
      </div>
    `;
  };

  const renderExistingShop = (shop) => {
    currentShopStatus = shop.status || null;
    const safeStatusClass =
      shop.status === "approved" || shop.status === "rejected" ? shop.status : "pending";

    shopSummary.innerHTML = `
      <div class="summary-state">
        <span class="status-pill ${safeStatusClass}">${escapeHtml(
          statusMap[shop.status] || shop.status || "Không xác định"
        )}</span>
        <p style="margin: 12px 0 0; color: var(--muted);">
          ${
            shop.status === "rejected"
              ? "Hồ sơ shop đã bị từ chối. Bạn có thể chỉnh sửa và nộp lại ngay bên phải."
              : "Hồ sơ shop của bạn đã tồn tại trên hệ thống. Dưới đây là trạng thái hiện tại."
          }
        </p>
      </div>
      <div class="summary-meta">
        ${buildSummaryMeta(shop)}
      </div>
      <div class="summary-actions">
        ${
          shop.status === "approved"
            ? `<a class="primary-link" href="/ui/seller/">Vào Seller Studio</a>`
            : ""
        }
        ${
          shop.status === "rejected"
            ? `<a class="primary-link" href="#shopForm">Chỉnh sửa hồ sơ</a>`
            : ""
        }
        <a class="ghost-link" href="/ui/">Quay lại trang chủ</a>
      </div>
    `;

    if (shop.status === "rejected") {
      setFormMode("rejected");
      fillForm(shop);
      populateDocuments(shop);
      return;
    }

    setFormMode("hidden");
  };

  const uploadDocumentFiles = async (row) => {
    const fileInput = row.querySelector(".doc-file");
    const files = Array.from(fileInput?.files || []);

    if (!files.length) {
      throw new Error("Hãy chọn ít nhất một tệp để tải lên.");
    }

    const formData = new FormData();
    files.forEach((file) => formData.append("documents", file));

    if (fileInput) {
      fileInput.disabled = true;
    }

    setDocumentStatus(row, `Đang tải ${files.length} tệp lên server...`);

    try {
      const payload = await apiFetch("/shops/documents/upload", {
        method: "POST",
        body: formData,
      });

      const uploadedFiles = Array.isArray(payload.documents)
        ? payload.documents.map(buildUploadedFile)
        : [];

      if (!uploadedFiles.length) {
        throw new Error("Server không trả về tệp đã tải lên.");
      }

      row._uploadedFiles = [...(row._uploadedFiles || []), ...uploadedFiles];
      fileInput.value = "";
      renderSelectedFiles(row);
      renderUploadedFiles(row);
      setDocumentStatus(row, `Đã tải lên ${uploadedFiles.length} tệp thành công.`);
    } finally {
      if (fileInput) {
        fileInput.disabled = false;
      }
    }
  };

  const collectDocuments = () => {
    const rows = Array.from(documentList.querySelectorAll(".doc-item"));

    if (!rows.length) {
      throw new Error("Hãy thêm ít nhất một loại giấy tờ.");
    }

    const documents = [];

    rows.forEach((row) => {
      const fileInput = row.querySelector(".doc-file");
      const pendingFiles = Array.from(fileInput?.files || []);
      if (pendingFiles.length) {
        throw new Error(
          "Có tệp đã chọn nhưng chưa bấm \"Tải file\". Hãy tải hết giấy tờ lên trước khi gửi hồ sơ."
        );
      }

      const docType = row.querySelector(".doc-type")?.value || "other";
      const uploadedFiles = row._uploadedFiles || [];

      uploadedFiles.forEach((file) => {
        if (file.doc_url) {
          documents.push({
            doc_type: docType,
            doc_url: file.doc_url,
          });
        }
      });
    });

    if (!documents.length) {
      throw new Error("Hãy tải lên ít nhất một tệp giấy tờ xác minh.");
    }

    return documents;
  };

  const loadShopState = async () => {
    const token = getAuthToken();

    if (!token) {
      renderLoginRequired();
      return;
    }

    try {
      const payload = await apiFetch("/shops/me");
      const shop = payload.shops?.data?.[0];

      if (!shop) {
        renderEmptyShop();
        return;
      }

      renderExistingShop(shop);
    } catch (error) {
      renderEmptyShop();
      setPageStatus(error.message || "Không thể tải trạng thái hồ sơ shop.", "error");
    }
  };

  const bindEvents = () => {
    addDocumentBtn?.addEventListener("click", () => {
      createDocumentRow();
    });

    documentList.addEventListener("change", (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const fileInput = event.target.closest(".doc-file");
      if (!fileInput) return;

      const row = fileInput.closest(".doc-item");
      if (!row) return;

      const selectedFiles = Array.from(fileInput.files || []);
      renderSelectedFiles(row);

      if (!selectedFiles.length) {
        setDocumentStatus(row, "Chưa có tệp nào.");
        return;
      }

      setDocumentStatus(
        row,
        `Đã chọn ${selectedFiles.length} tệp. Hệ thống đang tải lên...`
      );

      uploadDocumentFiles(row)
        .then(() => {
          setPageStatus("Đã tải giấy tờ lên server.");
        })
        .catch((error) => {
          const message = error.message || "Không thể tải giấy tờ.";
          setDocumentStatus(row, message, "error");
          setPageStatus(message, "error");
        });
    });

    documentList.addEventListener("click", async (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      const target = event.target;

      const removeFileButton = target.closest(".remove-uploaded-file");
      if (removeFileButton) {
        const row = removeFileButton.closest(".doc-item");
        if (!row) return;

        const fileIndex = Number(removeFileButton.dataset.index);
        row._uploadedFiles = (row._uploadedFiles || []).filter(
          (_file, index) => index !== fileIndex
        );
        renderUploadedFiles(row);
        setDocumentStatus(
          row,
          row._uploadedFiles.length
            ? `Còn ${row._uploadedFiles.length} tệp đã tải lên.`
            : "Chưa có tệp nào."
        );
        return;
      }

      const removeRowButton = target.closest(".remove-doc");
      if (removeRowButton) {
        const row = removeRowButton.closest(".doc-item");
        if (!row) return;

        row.remove();
        if (!documentList.children.length) {
          createDocumentRow();
        }
      }
    });

    shopForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setPageStatus("");

      try {
        const documents = collectDocuments();
        const payload = {
          name: inputs.name?.value.trim() || "",
          description: inputs.description?.value.trim() || "",
          address: {
            province: inputs.province?.value.trim() || "",
            district: inputs.district?.value.trim() || "",
            ward: inputs.ward?.value.trim() || "",
            detail: inputs.detail?.value.trim() || "",
          },
          payment_account: {
            bank_name: inputs.bankName?.value.trim() || "",
            account_holder: inputs.accountHolder?.value.trim() || "",
            account_number: inputs.accountNumber?.value.trim() || "",
          },
          documents,
        };

        await apiFetch("/shops/register", {
          method: "POST",
          body: payload,
        });

        setPageStatus(
          currentShopStatus === "rejected"
            ? "Hồ sơ shop đã được nộp lại. Admin sẽ xem xét lại trong vòng sớm nhất."
            : "Hồ sơ shop đã được gửi. Admin sẽ xem xét và phản hồi sớm."
        );

        await loadShopState();
      } catch (error) {
        setPageStatus(error.message || "Không thể gửi hồ sơ shop.", "error");
      }
    });
  };

  bindEvents();
  loadShopState();
})();
