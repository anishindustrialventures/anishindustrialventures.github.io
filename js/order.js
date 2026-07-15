(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const { config, helpers } = window.AIV;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("product");
    const product = config.products.find((item) => item.id === productId) || helpers.activeProduct();
    const pack = product.packs[0];

    const state = {
      product,
      bundleQuantity: 0,
      customer: null,
      submitting: false,
      requestToken: ""
    };

    const packContainer = document.querySelector("[data-order-packs]");
    const customerForm = document.querySelector("#customer-form");
    const confirmationForm = document.querySelector("#confirmation-form");
    const reviewPanel = document.querySelector("[data-payment-step]");
    const confirmButton = document.querySelector("[data-confirm-order]");
    const editButton = document.querySelector("[data-edit-order]");
    const customerStatusBox = document.querySelector("[data-customer-status]");
    const orderStatusBox = document.querySelector("[data-order-status]");
    const successPanel = document.querySelector("[data-success-panel]");
    const targetFrame = document.querySelector("#aiv-order-target");

    document.title = `Place Order | ${config.company.shortName}`;
    document.querySelector("[data-order-product-name]").textContent = product.name;
    document.querySelectorAll("[data-unit-price]").forEach((element) => (element.textContent = helpers.formatMoney(product.pricePerUnit)));
    document.querySelectorAll("[data-unit-mrp]").forEach((element) => (element.textContent = helpers.formatMoney(product.mrpPerUnit)));

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

    function totals() {
      const bundles = Number(state.bundleQuantity || 0);
      const pieces = bundles * pack.pieces;
      const inclusiveTotal = pieces * product.pricePerUnit;
      return {
        bundles,
        pieces,
        inclusiveTotal,
        unitPrice: product.pricePerUnit,
        mrpPerUnit: product.mrpPerUnit,
        gstRate: config.order.gstRate,
        shippingIncluded: config.order.shippingIncluded
      };
    }

    function updateTotals() {
      const value = totals();
      document.querySelectorAll("[data-total-bundles]").forEach((element) => (element.textContent = String(value.bundles)));
      document.querySelectorAll("[data-total-pieces]").forEach((element) => (element.textContent = String(value.pieces)));
      document.querySelectorAll("[data-order-total]").forEach((element) => (element.textContent = helpers.formatMoney(value.inclusiveTotal)));
      document.querySelectorAll("[data-pack-line]").forEach((element) => (element.textContent = helpers.formatMoney(value.inclusiveTotal)));
    }

    function renderPackSelector() {
      const bundlePrice = pack.pieces * product.pricePerUnit;
      const row = document.createElement("article");
      row.className = "order-pack order-pack--single";
      row.innerHTML = `
        <div class="order-pack__main">
          <span class="order-pack__pieces">${pack.pieces}</span>
          <div>
            <h3>${pack.label}</h3>
            <p>${helpers.formatMoney(bundlePrice)} per bundle · GST and shipping included</p>
          </div>
        </div>
        <div class="quantity-control" aria-label="Number of ${pack.label}s">
          <button type="button" data-decrement aria-label="Decrease bundle quantity">−</button>
          <input type="number" min="0" max="999" step="1" value="0" inputmode="numeric" data-quantity aria-label="Bundle quantity">
          <button type="button" data-increment aria-label="Increase bundle quantity">+</button>
        </div>
        <strong class="order-pack__line-total" data-pack-line>${helpers.formatMoney(0)}</strong>
      `;
      packContainer.appendChild(row);

      const input = row.querySelector("[data-quantity]");
      row.addEventListener("click", (event) => {
        if (event.target.closest("[data-increment]")) state.bundleQuantity = Math.min(999, state.bundleQuantity + 1);
        if (event.target.closest("[data-decrement]")) state.bundleQuantity = Math.max(0, state.bundleQuantity - 1);
        input.value = state.bundleQuantity;
        updateTotals();
      });

      input.addEventListener("input", () => {
        state.bundleQuantity = Math.max(0, Math.min(999, Math.floor(Number(input.value) || 0)));
        input.value = state.bundleQuantity;
        updateTotals();
      });
    }

    function populatePaymentDetails() {
      const payment = config.payment;
      document.querySelector("[data-bank-account-name]").textContent = payment.accountName;
      document.querySelector("[data-bank-name]").textContent = payment.bankName;
      document.querySelector("[data-bank-account-number]").textContent = payment.accountNumber;
      document.querySelector("[data-bank-ifsc]").textContent = payment.ifsc;
      document.querySelector("[data-bank-branch]").textContent = payment.branch;
      document.querySelector("[data-bank-micr]").textContent = payment.micr;
      document.querySelector("[data-payment-instructions]").textContent = payment.instructions;
    }

    function renderReview() {
      const value = totals();
      const list = document.querySelector("[data-review-items]");
      list.innerHTML = `
        <div class="review-line">
          <span>${pack.label} × ${value.bundles}</span>
          <strong>${helpers.formatMoney(value.inclusiveTotal)}</strong>
        </div>
      `;
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

      if (state.bundleQuantity < 1) {
        setStatus(customerStatusBox, "Please select at least one 36-ball bundle.", "error");
        packContainer.querySelector("[data-quantity]")?.focus();
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
      hideStatus(customerStatusBox);
      reviewPanel.hidden = false;
      reviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    editButton.addEventListener("click", () => {
      reviewPanel.hidden = true;
      hideStatus(orderStatusBox);
      customerForm.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    function buildPayload() {
      const value = totals();
      state.requestToken = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      return {
        version: 2,
        requestToken: state.requestToken,
        submittedAt: new Date().toISOString(),
        productId: product.id,
        productName: product.name,
        bundleQuantity: value.bundles,
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
        }, config.order.responseTimeoutMs || 20000);

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
      if (!state.customer || state.bundleQuantity < 1) {
        setStatus(orderStatusBox, "Please complete the quantity and customer details first.", "error");
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
        document.querySelector("[data-success-total]").textContent = helpers.formatMoney(response.total || value.inclusiveTotal);
        successPanel.hidden = false;
        customerForm.querySelectorAll("input, textarea, button").forEach((element) => (element.disabled = true));
        confirmationForm.querySelectorAll("input, button").forEach((element) => (element.disabled = true));
        setStatus(orderStatusBox, `Order ${response.orderId} has been recorded successfully.`, "success");

        const whatsappMessage = [
          `Hi, my AIV order has been recorded.`,
          `Order Reference: ${response.orderId}`,
          `Product: ${product.name}`,
          `Bundles: ${value.bundles}`,
          `Total Fireballs: ${value.pieces}`,
          `Total payable: ${helpers.formatMoney(response.total || value.inclusiveTotal)}`
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

    renderPackSelector();
    populatePaymentDetails();
    updateTotals();
  });
})();
