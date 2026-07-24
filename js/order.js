(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    const { config, helpers } = window.AIV;
    await window.AIV.productsReady;

    const state = { quantities: new Map(), customer: null, submitting: false, requestToken: "", files: {} };
    const products = window.AIV.products.filter((product) => product.active && product.orderEnabled);
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

    document.title = `Place Order | ${config.company.shortName}`;

    function setStatus(box, message, type = "info") {
      if (!box) return;
      box.textContent = message;
      box.className = `status-message status-message--${type}`;
      box.hidden = false;
      box.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    function hideStatus(box) { if (box) { box.hidden = true; box.textContent = ""; } }

    function selectedItems() {
      return products.map((product) => {
        const bundles = Number(state.quantities.get(product.id) || 0);
        const totalUnits = bundles * product.bundleQuantity;
        return { product, bundles, totalUnits, lineTotal: totalUnits * product.priceInclGst };
      }).filter((item) => item.bundles > 0);
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

    function setQuantity(product, requestedBundles) {
      let bundles = Math.max(0, Math.min(999, Math.floor(Number(requestedBundles) || 0)));
      if (bundles > 0 && bundles < product.minimumBundles) bundles = product.minimumBundles;
      state.quantities.set(product.id, bundles);
      const input = productContainer.querySelector(`[data-product-id="${CSS.escape(product.id)}"] [data-quantity]`);
      if (input) input.value = String(bundles);
      updateTotals();
    }

    function updateTotals() {
      const value = totals();
      document.querySelectorAll("[data-total-product-lines]").forEach((el) => el.textContent = String(value.productLines));
      document.querySelectorAll("[data-total-bundles]").forEach((el) => el.textContent = String(value.bundles));
      document.querySelectorAll("[data-total-units]").forEach((el) => el.textContent = String(value.units));
      document.querySelectorAll("[data-order-total]").forEach((el) => el.textContent = helpers.formatMoney(value.total));
      document.querySelectorAll("[data-shipping-status]").forEach((el) => el.textContent = value.shippingIncluded ? "Included" : "As applicable");
      products.forEach((product) => {
        const row = productContainer.querySelector(`[data-product-id="${CSS.escape(product.id)}"]`);
        if (row) row.querySelector("[data-line-total]").textContent = helpers.formatMoney((state.quantities.get(product.id) || 0) * product.bundleQuantity * product.priceInclGst);
      });
    }

    function renderProductSelector() {
      productContainer.innerHTML = "";
      if (!products.length) {
        productContainer.innerHTML = `<div class="empty-state"><h3>No products are currently enabled for online orders</h3><p>Please contact AIV on WhatsApp.</p></div>`;
        nextButton.disabled = true;
        return;
      }
      products.forEach((product) => {
        state.quantities.set(product.id, 0);
        const bundlePrice = product.bundleQuantity * product.priceInclGst;
        const row = document.createElement("article");
        row.className = "order-product-row";
        row.dataset.productId = product.id;
        row.innerHTML = `
          <img class="order-product-row__image" src="${helpers.escapeHtml(product.image)}" alt="${helpers.escapeHtml(product.name)}" loading="lazy">
          <div class="order-product-row__details">
            <h3>${helpers.escapeHtml(product.name)}</h3>
            <p>${helpers.formatMoney(product.priceInclGst)} per ${helpers.escapeHtml(product.unit)} · ${product.gstRate}% GST included${product.shippingIncluded ? " · shipping included" : ""}</p>
            <small>Product Code: ${helpers.escapeHtml(product.productCode)}${product.sapCode ? ` · SAP Code: ${helpers.escapeHtml(product.sapCode)}` : ""}<br>${product.bundleQuantity} ${helpers.escapeHtml(helpers.unitLabel(product, product.bundleQuantity))} per bundle · minimum ${product.minimumQuantity} · ${helpers.formatMoney(bundlePrice)} per bundle</small>
          </div>
          <div class="quantity-control">
            <button type="button" data-decrement aria-label="Decrease bundles">−</button>
            <input type="number" min="0" max="999" step="1" value="0" inputmode="numeric" data-quantity aria-label="Number of bundles">
            <button type="button" data-increment aria-label="Increase bundles">+</button>
          </div>
          <strong class="order-pack__line-total" data-line-total>${helpers.formatMoney(0)}</strong>`;
        productContainer.appendChild(row);
        const input = row.querySelector("[data-quantity]");
        row.querySelector("[data-increment]").addEventListener("click", () => {
          const current = Number(state.quantities.get(product.id) || 0);
          setQuantity(product, current === 0 ? product.minimumBundles : current + 1);
        });
        row.querySelector("[data-decrement]").addEventListener("click", () => {
          const current = Number(state.quantities.get(product.id) || 0);
          setQuantity(product, current <= product.minimumBundles ? 0 : current - 1);
        });
        input.addEventListener("change", () => setQuantity(product, input.value));
      });
      const requested = helpers.findProduct(new URLSearchParams(location.search).get("product"));
      if (requested?.orderEnabled) setQuantity(requested, requested.minimumBundles);
      updateTotals();
    }

    function populatePaymentDetails() {
      const payment = config.payment;
      document.querySelector("[data-bank-account-name]").textContent = payment.accountName;
      document.querySelector("[data-bank-name]").textContent = payment.bankName;
      document.querySelector("[data-bank-account-number]").textContent = payment.accountNumber;
      document.querySelector("[data-bank-ifsc]").textContent = payment.ifsc;
      document.querySelector("[data-bank-branch]").textContent = payment.branch;
      document.querySelector("[data-payment-instructions]").textContent = payment.instructions;
    }

    function renderReview() {
      const value = totals();
      document.querySelector("[data-review-items]").innerHTML = value.items.map(({ product, bundles, totalUnits, lineTotal }) => `
        <div class="review-item-block"><div class="review-line"><span>${helpers.escapeHtml(product.name)}</span><strong>${helpers.formatMoney(lineTotal)}</strong></div><small>Product Code: ${helpers.escapeHtml(product.productCode)}${product.sapCode ? ` · SAP Code: ${helpers.escapeHtml(product.sapCode)}` : ""} · ${bundles} bundle(s) · ${totalUnits} ${helpers.escapeHtml(helpers.unitLabel(product, totalUnits))}</small></div>`).join("");
      document.querySelector("[data-order-id]").textContent = "Generated after confirmation";
    }

    function validateGstin(value) { return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.trim().toUpperCase()); }
    function validateFile(file, required) {
      if (!file) return required ? "Please upload the required file." : "";
      if (file.size > 5 * 1024 * 1024) return "Each upload must be 5 MB or smaller.";
      if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) return "Only JPG, PNG or PDF files are accepted.";
      return "";
    }
    function fileToPayload(file) {
      if (!file) return Promise.resolve(null);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, mimeType: file.type, data: String(reader.result).split(",")[1] || "" });
        reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
        reader.readAsDataURL(file);
      });
    }

    customerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      hideStatus(customerStatusBox); hideStatus(orderStatusBox); successPanel.hidden = true;
      if (!selectedItems().length) { setStatus(customerStatusBox, "Please select at least one product bundle.", "error"); return; }
      if (!customerForm.reportValidity()) { setStatus(customerStatusBox, "Please complete all mandatory customer fields.", "error"); return; }
      const data = Object.fromEntries(new FormData(customerForm).entries());
      delete data.sdmsScreenshot;
      data.phone = String(data.phone || "").replace(/\D/g, "");
      data.gstin = String(data.gstin || "").trim().toUpperCase();
      if (!/^[6-9][0-9]{9}$/.test(data.phone)) { setStatus(customerStatusBox, "Enter a valid 10-digit Indian mobile number.", "error"); return; }
      if (!validateGstin(data.gstin)) { setStatus(customerStatusBox, "Enter a valid 15-character GSTIN.", "error"); return; }
      const sdmsFile = document.querySelector("#sdms-screenshot").files[0];
      const fileError = validateFile(sdmsFile, false);
      if (fileError) { setStatus(customerStatusBox, fileError, "error"); return; }
      state.customer = data;
      state.files.sdms = sdmsFile || null;
      renderReview(); populatePaymentDetails(); reviewPanel.hidden = false; customerForm.hidden = true;
      reviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    editButton.addEventListener("click", () => { reviewPanel.hidden = true; customerForm.hidden = false; customerForm.scrollIntoView({ behavior: "smooth", block: "start" }); });

    confirmationForm.addEventListener("submit", async (event) => {
      event.preventDefault(); hideStatus(orderStatusBox);
      if (!confirmationForm.reportValidity()) { setStatus(orderStatusBox, "Please upload payment proof and confirm the declaration.", "error"); return; }
      const paymentFile = document.querySelector("#payment-screenshot").files[0];
      const paymentError = validateFile(paymentFile, true);
      if (paymentError) { setStatus(orderStatusBox, paymentError, "error"); return; }
      if (state.submitting) return;
      state.submitting = true; confirmButton.disabled = true; confirmButton.textContent = "Confirming order…";
      state.requestToken = state.requestToken || `AIV-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      try {
        const [sdmsUpload, paymentUpload] = await Promise.all([fileToPayload(state.files.sdms), fileToPayload(paymentFile)]);
        const payload = {
          requestToken: state.requestToken,
          customer: state.customer,
          items: selectedItems().map(({ product, bundles }) => ({ productCode: product.productCode, bundles })),
          uploads: { sdms: sdmsUpload, payment: paymentUpload }
        };
        submitPayload(payload);
      } catch (error) {
        state.submitting = false; confirmButton.disabled = false; confirmButton.textContent = "Confirm order and generate reference";
        setStatus(orderStatusBox, error.message || "The files could not be prepared.", "error");
      }
    });

    function submitPayload(payload) {
      const form = document.createElement("form");
      form.method = "POST"; form.action = config.order.endpoint; form.target = "aiv-order-target"; form.hidden = true;
      const input = document.createElement("input"); input.name = "payload"; input.value = JSON.stringify(payload); form.appendChild(input);
      document.body.appendChild(form); form.submit(); form.remove();
      window.setTimeout(() => {
        if (state.submitting) { state.submitting = false; confirmButton.disabled = false; confirmButton.textContent = "Confirm order and generate reference"; setStatus(orderStatusBox, "The order service did not respond. Please retry once or contact AIV on WhatsApp.", "error"); }
      }, config.order.responseTimeoutMs || 60000);
    }

    window.addEventListener("message", (event) => {
      const response = event.data;
      if (!response || response.source !== "aiv-order-receiver" || response.requestToken !== state.requestToken) return;
      state.submitting = false; confirmButton.disabled = true;
      if (!response.ok) { confirmButton.disabled = false; confirmButton.textContent = "Confirm order and generate reference"; setStatus(orderStatusBox, response.error || "The order could not be recorded.", "error"); return; }
      confirmButton.textContent = "Order confirmed";
      setStatus(orderStatusBox, `Order ${response.orderId} has been recorded successfully.`, "success");
      document.querySelector("[data-success-order-id]").textContent = response.orderId;
      document.querySelector("[data-success-total]").textContent = helpers.formatMoney(response.total);
      const share = document.querySelector("[data-success-whatsapp]");
      share.href = helpers.whatsappUrl(`Hi AIV, my order reference is ${response.orderId}. SDMS Portal Number: ${state.customer.sdmsPortalNumber}. Total paid: ${helpers.formatMoney(response.total)}.`);
      successPanel.hidden = false;
      successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    renderProductSelector(); populatePaymentDetails();
  });
})();
