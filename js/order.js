(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    const { config, helpers } = window.AIV;
    await window.AIV.productsReady;

    const state = {
      quantities: new Map(),
      customer: null,
      submitting: false,
      requestToken: ""
    };

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
    const targetFrame = document.querySelector("#aiv-order-target");
    const nextButton = document.querySelector("[data-next-review]");

    document.title = `Place Order | ${config.company.shortName}`;

    function setStatus(box, message, type = "info") {
      if (!box) return;
      box.textContent = message;
      box.className = `status-message status-message--${type}`;
      box.hidden = false;
      box.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function hideStatus(box) {
      if (!box) return;
      box.hidden = true;
      box.textContent = "";
    }

    function selectedItems() {
      return products
        .map((product) => {
          const bundles = Number(state.quantities.get(product.id) || 0);
          const totalUnits = bundles * product.bundleQuantity;
          const lineTotal = totalUnits * product.priceInclGst;
          return { product, bundles, totalUnits, lineTotal };
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
      document.querySelectorAll("[data-total-product-lines]").forEach((element) => (element.textContent = String(value.productLines)));
      document.querySelectorAll("[data-total-bundles]").forEach((element) => (element.textContent = String(value.bundles)));
      document.querySelectorAll("[data-total-units]").forEach((element) => (element.textContent = String(value.units)));
      document.querySelectorAll("[data-order-total]").forEach((element) => (element.textContent = helpers.formatMoney(value.total)));
      document.querySelectorAll("[data-shipping-status]").forEach((element) => (element.textContent = value.shippingIncluded ? "Included" : "As applicable"));

      products.forEach((product) => {
        const bundles = Number(state.quantities.get(product.id) || 0);
        const lineTotal = bundles * product.bundleQuantity * product.priceInclGst;
        const row = productContainer.querySelector(`[data-product-id="${CSS.escape(product.id)}"]`);
        if (row) row.querySelector("[data-line-total]").textContent = helpers.formatMoney(lineTotal);
      });
    }

    function renderProductSelector() {
      productContainer.innerHTML = "";
      if (!products.length) {
        productContainer.innerHTML = `<div class="empty-state"><h3>No products are currently enabled for online orders</h3><p>Please contact AIV on WhatsApp for current availability.</p><a class="button button--outline" href="${helpers.whatsappUrl()}" target="_blank" rel="noopener noreferrer">WhatsApp AIV</a></div>`;
        nextButton.disabled = true;
        return;
      }

      products.forEach((product) => {
        state.quantities.set(product.id, 0);
        const bundlePrice = product.bundleQuantity * product.priceInclGst;
        const codeMarkup = [
          product.productCode ? `<span><b>Product Code</b> ${helpers.escapeHtml(product.productCode)}</span>` : "",
          product.sapCode ? `<span><b>SAP Code</b> ${helpers.escapeHtml(product.sapCode)}</span>` : ""
        ].filter(Boolean).join("");

        const row = document.createElement("article");
        row.className = "order-product-row";
        row.dataset.productId = product.id;
        row.innerHTML = `
          <img class="order-product-row__image" src="${helpers.escapeHtml(product.image)}" alt="${helpers.escapeHtml(product.name)}" loading="lazy">
          <div class="order-product-row__details">
            <h3>${helpers.escapeHtml(product.name)}</h3>
            ${codeMarkup ? `<div class="product-code-row">${codeMarkup}</div>` : ""}
            <p>${helpers.formatMoney(product.priceInclGst)} per ${helpers.escapeHtml(product.unit)} · ${product.gstRate > 0 ? `${product.gstRate}% GST included` : "final price"}${product.shippingIncluded ? " · shipping included" : ""}</p>
            <small>${product.bundleQuantity} ${helpers.escapeHtml(helpers.unitLabel(product, product.bundleQuantity))} per bundle · minimum ${product.minimumQuantity} ${helpers.escapeHtml(helpers.unitLabel(product, product.minimumQuantity))} · ${helpers.formatMoney(bundlePrice)} per bundle</small>
          </div>
          <div class="quantity-control" aria-label="Number of bundles for ${helpers.escapeHtml(product.name)}">
            <button type="button" data-decrement aria-label="Decrease quantity">−</button>
            <input type="number" min="0" max="999" step="1" value="0" inputmode="numeric" data-quantity aria-label="Bundle quantity">
            <button type="button" data-increment aria-label="Increase quantity">+</button>
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
        input.addEventListener("input", () => {
          const value = Math.max(0, Math.min(999, Math.floor(Number(input.value) || 0)));
          state.quantities.set(product.id, value);
          updateTotals();
        });
      });

      const requested = new URLSearchParams(window.location.search).get("product");
      const requestedProduct = helpers.findProduct(requested);
      if (requestedProduct?.orderEnabled) setQuantity(requestedProduct, requestedProduct.minimumBundles);
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
      const list = document.querySelector("[data-review-items]");
      list.innerHTML = value.items.map(({ product, bundles, totalUnits, lineTotal }) => `
        <div class="review-item-block">
          <div class="review-line"><span>${helpers.escapeHtml(product.name)}</span><strong>${helpers.formatMoney(lineTotal)}</strong></div>
          <small>${product.productCode ? `Product Code: ${helpers.escapeHtml(product.productCode)} · ` : ""}${product.sapCode ? `SAP Code: ${helpers.escapeHtml(product.sapCode)} · ` : ""}${bundles} bundle(s) · ${totalUnits} ${helpers.escapeHtml(helpers.unitLabel(product, totalUnits))}</small>
        </div>`).join("");
      document.querySelector("[data-order-id]").textContent = "Generated after confirmation";
    }

    function validateGstin(value) {
      return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.trim().toUpperCase());
    }

    customerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      hideStatus(customerStatusBox);
      hideStatus(orderStatusBox);
      successPanel.hidden = true;

      if (!selectedItems().length) {
        setStatus(customerStatusBox, "Please select at least one product bundle.", "error");
        productContainer.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const invalidQuantity = selectedItems().find(({ product, totalUnits }) => totalUnits < product.minimumQuantity);
      if (invalidQuantity) {
        setStatus(customerStatusBox, `The minimum quantity for ${invalidQuantity.product.name} is ${invalidQuantity.product.minimumQuantity}.`, "error");
        return;
      }

      if (!customerForm.checkValidity()) {
        const firstInvalid = customerForm.querySelector(":invalid");
        setStatus(customerStatusBox, "Please complete all mandatory fields marked with an asterisk.", "error");
        customerForm.reportValidity();
        firstInvalid?.focus();
        return;
      }

      const formData = new FormData(customerForm);
      const customer = Object.fromEntries(formData.entries());
      customer.gstin = String(customer.gstin || "").trim().toUpperCase();
      customer.phone = String(customer.phone || "").replace(/\D/g, "");
      customer.email = String(customer.email || "").trim();

      if (!/^[6-9][0-9]{9}$/.test(customer.phone)) {
        setStatus(customerStatusBox, "Please enter a valid 10-digit Indian mobile number.", "error");
        document.querySelector("#phone")?.focus();
        return;
      }
      if (!validateGstin(customer.gstin)) {
        setStatus(customerStatusBox, "Please enter a valid 15-character GSTIN.", "error");
        document.querySelector("#gstin")?.focus();
        return;
      }

      state.customer = customer;
      renderReview();
      reviewPanel.hidden = false;
      reviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    editButton.addEventListener("click", () => {
      reviewPanel.hidden = true;
      hideStatus(orderStatusBox);
      customerForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    function buildPayload() {
      state.requestToken = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      return {
        version: 3,
        requestToken: state.requestToken,
        submittedAt: new Date().toISOString(),
        items: selectedItems().map(({ product, bundles }) => ({
          productCode: product.productCode,
          bundles
        })),
        customer: state.customer
      };
    }

    function submitToAppsScript(payload) {
      return new Promise((resolve, reject) => {
        if (!config.order.endpoint) {
          reject(new Error("Online order confirmation is temporarily unavailable. Please contact AIV on WhatsApp."));
          return;
        }

        let completed = false;
        const timeout = window.setTimeout(() => {
          if (completed) return;
          completed = true;
          window.removeEventListener("message", onMessage);
          reject(new Error("The order service did not respond. Please retry once or contact AIV on WhatsApp."));
        }, config.order.responseTimeoutMs || 25000);

        function cleanup() {
          window.clearTimeout(timeout);
          window.removeEventListener("message", onMessage);
        }

        function onMessage(event) {
          const data = event.data;
          if (!data || data.source !== "aiv-order-receiver" || data.requestToken !== payload.requestToken) return;
          if (completed) return;
          completed = true;
          cleanup();
          if (data.ok) resolve(data);
          else reject(new Error(data.error || "The order could not be recorded."));
        }

        window.addEventListener("message", onMessage);
        const form = document.createElement("form");
        form.method = "POST";
        form.action = config.order.endpoint;
        form.target = targetFrame.name;
        form.hidden = true;
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "payload";
        input.value = JSON.stringify(payload);
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        form.remove();
      });
    }

    confirmationForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (state.submitting) return;
      if (!state.customer || !selectedItems().length) {
        setStatus(orderStatusBox, "Please complete the product and customer details first.", "error");
        return;
      }
      if (!confirmationForm.checkValidity()) {
        confirmationForm.reportValidity();
        return;
      }

      state.submitting = true;
      confirmButton.disabled = true;
      confirmButton.textContent = "Confirming order…";
      hideStatus(orderStatusBox);

      try {
        const response = await submitToAppsScript(buildPayload());
        const value = totals();
        document.querySelector("[data-order-id]").textContent = response.orderId;
        document.querySelector("[data-success-order-id]").textContent = response.orderId;
        document.querySelector("[data-success-total]").textContent = helpers.formatMoney(response.total || value.total);
        successPanel.hidden = false;
        customerForm.querySelectorAll("input, textarea, button").forEach((element) => (element.disabled = true));
        confirmationForm.querySelectorAll("input, button").forEach((element) => (element.disabled = true));
        setStatus(orderStatusBox, `Order ${response.orderId} has been recorded successfully.`, "success");

        const itemLines = value.items.map(({ product, bundles, totalUnits }) =>
          `${product.name}: ${bundles} bundle(s), ${totalUnits} ${helpers.unitLabel(product, totalUnits)}`
        );
        const whatsappMessage = [
          "Hi, my AIV order has been recorded.",
          `Order Reference: ${response.orderId}`,
          ...itemLines,
          `Total payable: ${helpers.formatMoney(response.total || value.total)}`
        ].join("\n");
        document.querySelector("[data-success-whatsapp]").href = helpers.whatsappUrl(whatsappMessage);
      } catch (error) {
        console.error(error);
        setStatus(orderStatusBox, error.message || "The order could not be recorded. Please try again.", "error");
        confirmButton.disabled = false;
        confirmButton.textContent = "Confirm order and generate reference";
        state.submitting = false;
      }
    });

    renderProductSelector();
    populatePaymentDetails();
    updateTotals();
  });
})();
