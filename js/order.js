(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    const { config, helpers } = window.AIV;
    await window.AIV.productsReady;

    const productContainer = document.querySelector("[data-order-products]");
    const customerForm = document.querySelector("#customer-form");
    const confirmationForm = document.querySelector("#confirmation-form");
    const reviewPanel = document.querySelector("[data-payment-step]");
    const confirmButton = document.querySelector("[data-confirm-order]");
    const editButton = document.querySelector("[data-edit-order]");
    const customerStatusBox = document.querySelector("[data-customer-status]");
    const orderStatusBox = document.querySelector("[data-order-status]");
    const successPanel = document.querySelector("[data-success-panel]");
    const nextButton = document.querySelector("[data-next-review]");
    const sdmsFileInput = document.querySelector("#sdms-screenshot");
    const paymentFileInput = document.querySelector("#payment-screenshot");

    if (!productContainer || !customerForm || !confirmationForm || !reviewPanel || !confirmButton || !editButton) {
      console.error("The order page is missing required elements.");
      return;
    }

    document.title = `Place Order | ${config.company.shortName}`;

    const state = {
      orderProducts: [],
      quantities: new Map(),
      rows: new Map(),
      customer: null,
      files: { sdms: null },
      submitting: false,
      requestToken: "",
      responseTimer: null,
      hasQuantityInteraction: false
    };

    function setStatus(box, message, type = "info") {
      if (!box) return;
      box.textContent = message;
      box.className = `status-message status-message--${type}`;
      box.hidden = false;
      box.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function hideStatus(box) {
      if (!box) return;
      box.hidden = true;
      box.textContent = "";
    }

    function buildOrderProducts() {
      const seenCodes = new Set();
      return window.AIV.products
        .filter((product) => product.active && product.orderEnabled)
        .filter((product) => {
          const code = product.productCode.trim().toUpperCase();
          if (!code || seenCodes.has(code)) return false;
          seenCodes.add(code);
          return true;
        })
        .map((product, index) => ({
          product,
          orderKey: `${product.catalogKey || product.id}::order-${index}`
        }));
    }

    function selectedItems() {
      return state.orderProducts
        .map(({ product, orderKey }) => {
          const bundles = Number(state.quantities.get(orderKey) || 0);
          const totalUnits = bundles * product.bundleQuantity;
          return {
            product,
            orderKey,
            bundles,
            totalUnits,
            lineTotal: totalUnits * product.priceInclGst
          };
        })
        .filter((item) => item.bundles > 0);
    }

    function totals() {
      const items = selectedItems();
      return {
        items,
        productLines: items.length,
        bundles: items.reduce((sum, item) => sum + item.bundles, 0),
        units: items.reduce((sum, item) => sum + item.totalUnits, 0),
        total: items.reduce((sum, item) => sum + item.lineTotal, 0),
        shippingIncluded: items.length > 0 && items.every((item) => item.product.shippingIncluded)
      };
    }

    function updateTotals() {
      const value = totals();
      document.querySelectorAll("[data-total-product-lines]").forEach((element) => {
        element.textContent = String(value.productLines);
      });
      document.querySelectorAll("[data-total-bundles]").forEach((element) => {
        element.textContent = String(value.bundles);
      });
      document.querySelectorAll("[data-total-units]").forEach((element) => {
        element.textContent = String(value.units);
      });
      document.querySelectorAll("[data-order-total]").forEach((element) => {
        element.textContent = helpers.formatMoney(value.total);
      });
      document.querySelectorAll("[data-shipping-status]").forEach((element) => {
        element.textContent = value.shippingIncluded ? "Included" : "As applicable";
      });

      state.orderProducts.forEach(({ product, orderKey }) => {
        const rowInfo = state.rows.get(orderKey);
        if (!rowInfo) return;
        const bundles = Number(state.quantities.get(orderKey) || 0);
        rowInfo.lineTotal.textContent = helpers.formatMoney(
          bundles * product.bundleQuantity * product.priceInclGst
        );
      });
    }

    function setQuantity(entry, requestedBundles, options = {}) {
      const { product, orderKey } = entry;
      let bundles = Math.floor(Number(requestedBundles));
      if (!Number.isFinite(bundles)) bundles = 0;
      bundles = Math.max(0, Math.min(999, bundles));
      if (bundles > 0 && bundles < product.minimumBundles) bundles = product.minimumBundles;

      state.quantities.set(orderKey, bundles);
      const rowInfo = state.rows.get(orderKey);
      if (rowInfo && rowInfo.input.value !== String(bundles)) {
        rowInfo.input.value = String(bundles);
      }

      if (options.userInitiated) {
        state.hasQuantityInteraction = true;
        state.requestToken = "";
      }
      updateTotals();
    }

    function renderProductSelector({ preserveSelection = false } = {}) {
      const previousByCode = new Map();
      if (preserveSelection) {
        selectedItems().forEach(({ product, bundles }) => {
          previousByCode.set(product.productCode.toUpperCase(), bundles);
        });
      }

      state.orderProducts = buildOrderProducts();
      state.quantities.clear();
      state.rows.clear();
      productContainer.innerHTML = "";

      if (!state.orderProducts.length) {
        productContainer.innerHTML = `<div class="empty-state"><h3>No products are currently enabled for online orders</h3><p>Please contact AIV on WhatsApp.</p></div>`;
        if (nextButton) nextButton.disabled = true;
        updateTotals();
        return;
      }
      if (nextButton) nextButton.disabled = false;

      state.orderProducts.forEach((entry) => {
        const { product, orderKey } = entry;
        const bundlePrice = product.bundleQuantity * product.priceInclGst;
        const row = document.createElement("article");
        row.className = "order-product-row";
        row.dataset.orderKey = orderKey;
        row.dataset.productCode = product.productCode;
        row.innerHTML = `
          <img class="order-product-row__image" src="${helpers.escapeHtml(product.image)}" alt="${helpers.escapeHtml(product.name)}" loading="lazy" width="112" height="96">
          <div class="order-product-row__details">
            <h3>${helpers.escapeHtml(product.name)}</h3>
            <p>${helpers.formatMoney(product.priceInclGst)} per ${helpers.escapeHtml(product.unit)} · ${product.gstRate}% GST included${product.shippingIncluded ? " · shipping included" : ""}</p>
            <small>Product Code: ${helpers.escapeHtml(product.productCode)}${product.sapCode ? ` · SAP Code: ${helpers.escapeHtml(product.sapCode)}` : ""}<br>${product.bundleQuantity} ${helpers.escapeHtml(helpers.unitLabel(product, product.bundleQuantity))} per bundle · minimum ${product.minimumQuantity} · ${helpers.formatMoney(bundlePrice)} per bundle</small>
          </div>
          <div class="quantity-control" role="group" aria-label="Bundle quantity for ${helpers.escapeHtml(product.name)}">
            <button type="button" data-decrement aria-label="Decrease ${helpers.escapeHtml(product.name)} bundles">−</button>
            <input type="number" min="0" max="999" step="1" value="0" inputmode="numeric" data-quantity aria-label="Number of bundles for ${helpers.escapeHtml(product.name)}">
            <button type="button" data-increment aria-label="Increase ${helpers.escapeHtml(product.name)} bundles">+</button>
          </div>
          <strong class="order-pack__line-total" data-line-total>${helpers.formatMoney(0)}</strong>`;
        productContainer.appendChild(row);

        const input = row.querySelector("[data-quantity]");
        const lineTotal = row.querySelector("[data-line-total]");
        state.rows.set(orderKey, { row, input, lineTotal });
        state.quantities.set(orderKey, 0);

        row.querySelector("[data-increment]").addEventListener("click", () => {
          const current = Number(state.quantities.get(orderKey) || 0);
          setQuantity(entry, current === 0 ? product.minimumBundles : current + 1, { userInitiated: true });
        });
        row.querySelector("[data-decrement]").addEventListener("click", () => {
          const current = Number(state.quantities.get(orderKey) || 0);
          setQuantity(entry, current <= product.minimumBundles ? 0 : current - 1, { userInitiated: true });
        });
        input.addEventListener("change", () => {
          setQuantity(entry, input.value, { userInitiated: true });
        });
        input.addEventListener("blur", () => {
          setQuantity(entry, input.value, { userInitiated: true });
        });

        const preserved = previousByCode.get(product.productCode.toUpperCase());
        if (preserved) setQuantity(entry, preserved);
      });

      if (!preserveSelection) {
        const requested = helpers.findProduct(new URLSearchParams(window.location.search).get("product"));
        if (requested?.orderEnabled) {
          const requestedEntry = state.orderProducts.find(({ product }) =>
            product.productCode.toUpperCase() === requested.productCode.toUpperCase()
          );
          if (requestedEntry) setQuantity(requestedEntry, requested.minimumBundles);
        }
      }
      updateTotals();
    }

    function populatePaymentDetails() {
      const payment = config.payment;
      const values = [
        ["[data-bank-account-name]", payment.accountName],
        ["[data-bank-name]", payment.bankName],
        ["[data-bank-account-number]", payment.accountNumber],
        ["[data-bank-ifsc]", payment.ifsc],
        ["[data-bank-branch]", payment.branch],
        ["[data-payment-instructions]", payment.instructions]
      ];
      values.forEach(([selector, value]) => {
        document.querySelectorAll(selector).forEach((element) => {
          element.textContent = value;
        });
      });
    }

    function renderReview() {
      const value = totals();
      const reviewItems = document.querySelector("[data-review-items]");
      if (reviewItems) {
        reviewItems.innerHTML = value.items.map(({ product, bundles, totalUnits, lineTotal }) => `
          <div class="review-item-block">
            <div class="review-line"><span>${helpers.escapeHtml(product.name)}</span><strong>${helpers.formatMoney(lineTotal)}</strong></div>
            <small>Product Code: ${helpers.escapeHtml(product.productCode)}${product.sapCode ? ` · SAP Code: ${helpers.escapeHtml(product.sapCode)}` : ""} · ${bundles} bundle(s) · ${totalUnits} ${helpers.escapeHtml(helpers.unitLabel(product, totalUnits))}</small>
          </div>`).join("");
      }
      const orderId = document.querySelector("[data-order-id]");
      if (orderId) orderId.textContent = "Generated after confirmation";
    }

    function validateGstin(value) {
      return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.trim().toUpperCase());
    }

    function validateFile(file, required) {
      if (!file) return required ? "Please upload the required payment screenshot." : "";
      if (file.size > 5 * 1024 * 1024) return "Each upload must be 5 MB or smaller.";
      if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
        return "Only JPG, PNG or PDF files are accepted.";
      }
      return "";
    }

    function fileToPayload(file) {
      if (!file) return Promise.resolve(null);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({
          name: file.name,
          mimeType: file.type,
          data: String(reader.result).split(",")[1] || ""
        });
        reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
        reader.readAsDataURL(file);
      });
    }

    customerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      hideStatus(customerStatusBox);
      hideStatus(orderStatusBox);
      if (successPanel) successPanel.hidden = true;

      if (!selectedItems().length) {
        setStatus(customerStatusBox, "Please select at least one product bundle.", "error");
        return;
      }
      if (!customerForm.reportValidity()) {
        setStatus(customerStatusBox, "Please complete all mandatory customer fields.", "error");
        return;
      }

      const formData = new FormData(customerForm);
      const data = Object.fromEntries(formData.entries());
      delete data.sdmsScreenshot;
      data.phone = String(data.phone || "").replace(/\D/g, "");
      data.gstin = String(data.gstin || "").trim().toUpperCase();
      data.sdmsPortalNumber = String(data.sdmsPortalNumber || "").trim();

      if (!/^[6-9][0-9]{9}$/.test(data.phone)) {
        setStatus(customerStatusBox, "Enter a valid 10-digit Indian mobile number.", "error");
        return;
      }
      if (!validateGstin(data.gstin)) {
        setStatus(customerStatusBox, "Enter a valid 15-character GSTIN.", "error");
        return;
      }
      if (!data.sdmsPortalNumber) {
        setStatus(customerStatusBox, "Enter the SDMS Portal Number.", "error");
        return;
      }

      const sdmsFile = sdmsFileInput?.files?.[0] || null;
      const fileError = validateFile(sdmsFile, false);
      if (fileError) {
        setStatus(customerStatusBox, fileError, "error");
        return;
      }

      state.customer = data;
      state.files.sdms = sdmsFile;
      state.requestToken = "";
      renderReview();
      populatePaymentDetails();
      reviewPanel.hidden = false;
      customerForm.hidden = true;
      reviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    editButton.addEventListener("click", () => {
      if (state.submitting) return;
      state.requestToken = "";
      reviewPanel.hidden = true;
      customerForm.hidden = false;
      customerForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    confirmationForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      hideStatus(orderStatusBox);

      if (!state.customer) {
        setStatus(orderStatusBox, "Please complete the customer details first.", "error");
        return;
      }
      if (!confirmationForm.reportValidity()) {
        setStatus(orderStatusBox, "Please upload payment proof and confirm the declaration.", "error");
        return;
      }

      const paymentFile = paymentFileInput?.files?.[0] || null;
      const paymentError = validateFile(paymentFile, true);
      if (paymentError) {
        setStatus(orderStatusBox, paymentError, "error");
        return;
      }
      if (state.submitting) return;

      state.submitting = true;
      confirmButton.disabled = true;
      confirmButton.textContent = "Confirming order…";
      if (!state.requestToken) {
        state.requestToken = `AIV-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }

      try {
        const [sdmsUpload, paymentUpload] = await Promise.all([
          fileToPayload(state.files.sdms),
          fileToPayload(paymentFile)
        ]);
        const payload = {
          requestToken: state.requestToken,
          customer: state.customer,
          items: selectedItems().map(({ product, bundles }) => ({
            productCode: product.productCode,
            bundles
          })),
          uploads: { sdms: sdmsUpload, payment: paymentUpload }
        };
        submitPayload(payload);
      } catch (error) {
        state.submitting = false;
        confirmButton.disabled = false;
        confirmButton.textContent = "Confirm order and generate reference";
        setStatus(orderStatusBox, error.message || "The files could not be prepared.", "error");
      }
    });

    function submitPayload(payload) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = config.order.endpoint;
      form.target = "aiv-order-target";
      form.hidden = true;

      const input = document.createElement("input");
      input.name = "payload";
      input.value = JSON.stringify(payload);
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      form.remove();

      window.clearTimeout(state.responseTimer);
      state.responseTimer = window.setTimeout(() => {
        if (!state.submitting) return;
        state.submitting = false;
        confirmButton.disabled = false;
        confirmButton.textContent = "Confirm order and generate reference";
        setStatus(orderStatusBox, "The order service did not respond. Please retry once or contact AIV on WhatsApp.", "error");
      }, Number(config.order.responseTimeoutMs || 60000));
    }

    window.addEventListener("message", (event) => {
      const response = event.data;
      if (!response || response.source !== "aiv-order-receiver" || response.requestToken !== state.requestToken) return;

      window.clearTimeout(state.responseTimer);
      state.responseTimer = null;
      state.submitting = false;
      confirmButton.disabled = true;

      if (!response.ok) {
        confirmButton.disabled = false;
        confirmButton.textContent = "Confirm order and generate reference";
        setStatus(orderStatusBox, response.error || "The order could not be recorded.", "error");
        return;
      }

      confirmButton.textContent = "Order confirmed";
      setStatus(orderStatusBox, `Order ${response.orderId} has been recorded successfully.`, "success");
      const successOrderId = document.querySelector("[data-success-order-id]");
      const successTotal = document.querySelector("[data-success-total]");
      const share = document.querySelector("[data-success-whatsapp]");
      if (successOrderId) successOrderId.textContent = response.orderId;
      if (successTotal) successTotal.textContent = helpers.formatMoney(response.total);
      if (share) {
        share.href = helpers.whatsappUrl(
          `Hi AIV, my order reference is ${response.orderId}. SDMS Portal Number: ${state.customer.sdmsPortalNumber}. Total paid: ${helpers.formatMoney(response.total)}.`
        );
      }
      if (successPanel) {
        successPanel.hidden = false;
        successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });

    renderProductSelector();
    populatePaymentDetails();

    window.addEventListener("aiv:products-updated", () => {
      if (!state.hasQuantityInteraction && !customerForm.hidden && !state.submitting) {
        renderProductSelector({ preserveSelection: true });
      }
    }, { once: true });
  });
})();
