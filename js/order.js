(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const { config, helpers } = window.AIV;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("product");
    const product = config.products.find((item) => item.id === productId) || helpers.activeProduct();

    const state = {
      product,
      quantities: Object.fromEntries(product.packs.map((pack) => [pack.id, 0])),
      orderId: "",
      customer: null,
      screenshot: null
    };

    const packContainer = document.querySelector("[data-order-packs]");
    const customerForm = document.querySelector("#customer-form");
    const paymentForm = document.querySelector("#payment-form");
    const reviewPanel = document.querySelector("[data-payment-step]");
    const setupBanner = document.querySelector("[data-payment-setup-banner]");
    const finalButton = document.querySelector("[data-submit-payment]");
    const statusBox = document.querySelector("[data-order-status]");

    document.title = `Place Order | ${config.company.shortName}`;
    document.querySelector("[data-order-product-name]").textContent = product.name;
    document.querySelector("[data-unit-price]").textContent = helpers.formatMoney(product.pricePerUnit);

    function setStatus(message, type = "info") {
      statusBox.textContent = message;
      statusBox.className = `status-message status-message--${type}`;
      statusBox.hidden = false;
      statusBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function totals() {
      const lineItems = product.packs
        .map((pack) => {
          const sets = Number(state.quantities[pack.id] || 0);
          return {
            packId: pack.id,
            label: pack.label,
            piecesPerSet: pack.pieces,
            sets,
            pieces: pack.pieces * sets,
            amount: pack.pieces * sets * product.pricePerUnit
          };
        })
        .filter((item) => item.sets > 0);

      const pieces = lineItems.reduce((sum, item) => sum + item.pieces, 0);
      const inclusiveTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const taxable = inclusiveTotal / (1 + config.order.gstRate);
      const gst = inclusiveTotal - taxable;

      return { lineItems, pieces, inclusiveTotal, taxable, gst };
    }

    function updateTotals() {
      const value = totals();
      document.querySelectorAll("[data-total-pieces]").forEach((element) => (element.textContent = String(value.pieces)));
      document.querySelectorAll("[data-taxable-value]").forEach((element) => (element.textContent = helpers.formatMoney(value.taxable)));
      document.querySelectorAll("[data-gst-value]").forEach((element) => (element.textContent = helpers.formatMoney(value.gst)));
      document.querySelectorAll("[data-order-total]").forEach((element) => (element.textContent = helpers.formatMoney(value.inclusiveTotal)));

      document.querySelectorAll("[data-pack-line]").forEach((element) => {
        const packId = element.dataset.packLine;
        const pack = product.packs.find((item) => item.id === packId);
        const sets = Number(state.quantities[packId] || 0);
        element.textContent = helpers.formatMoney(pack.pieces * sets * product.pricePerUnit);
      });
    }

    function renderPacks() {
      product.packs.forEach((pack) => {
        const setPrice = pack.pieces * product.pricePerUnit;
        const row = document.createElement("article");
        row.className = "order-pack";
        row.innerHTML = `
          <div class="order-pack__main">
            <span class="order-pack__pieces">${pack.pieces}</span>
            <div>
              <h3>${pack.label}</h3>
              <p>${helpers.formatMoney(setPrice)} per set · GST included</p>
            </div>
          </div>
          <div class="quantity-control" aria-label="Number of ${pack.label}s">
            <button type="button" data-decrement="${pack.id}" aria-label="Decrease ${pack.label} quantity">−</button>
            <input type="number" min="0" max="999" step="1" value="0" inputmode="numeric" data-quantity="${pack.id}" aria-label="${pack.label} quantity">
            <button type="button" data-increment="${pack.id}" aria-label="Increase ${pack.label} quantity">+</button>
          </div>
          <strong class="order-pack__line-total" data-pack-line="${pack.id}">${helpers.formatMoney(0)}</strong>
        `;
        packContainer.appendChild(row);
      });

      packContainer.addEventListener("click", (event) => {
        const increment = event.target.closest("[data-increment]");
        const decrement = event.target.closest("[data-decrement]");
        const packId = increment?.dataset.increment || decrement?.dataset.decrement;
        if (!packId) return;
        const current = Number(state.quantities[packId] || 0);
        state.quantities[packId] = increment ? Math.min(999, current + 1) : Math.max(0, current - 1);
        packContainer.querySelector(`[data-quantity="${packId}"]`).value = state.quantities[packId];
        updateTotals();
      });

      packContainer.addEventListener("input", (event) => {
        const input = event.target.closest("[data-quantity]");
        if (!input) return;
        const value = Math.max(0, Math.min(999, Math.floor(Number(input.value) || 0)));
        input.value = value;
        state.quantities[input.dataset.quantity] = value;
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
      document.querySelector("[data-upi-id]").textContent = payment.upiId;
      document.querySelector("[data-payment-instructions]").textContent = payment.instructions;
      document.querySelector("[data-bank-qr]").src = payment.qrImage;

      if (!payment.live) {
        setupBanner.hidden = false;
        finalButton.disabled = true;
        finalButton.textContent = "Payment submission activates after bank setup";
      }
    }

    function renderReview() {
      const value = totals();
      const list = document.querySelector("[data-review-items]");
      list.innerHTML = "";
      value.lineItems.forEach((item) => {
        const row = document.createElement("div");
        row.className = "review-line";
        row.innerHTML = `<span>${item.label} × ${item.sets}</span><strong>${helpers.formatMoney(item.amount)}</strong>`;
        list.appendChild(row);
      });
      document.querySelector("[data-order-id]").textContent = state.orderId;
    }

    function validateGstin(value) {
      if (!config.order.gstinRequired && !value) return true;
      return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(value.trim().toUpperCase());
    }

    customerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      statusBox.hidden = true;
      const value = totals();
      if (!value.lineItems.length) {
        setStatus("Please select at least one 24-piece, 40-piece or 50-piece set.", "error");
        return;
      }

      const formData = new FormData(customerForm);
      const customer = Object.fromEntries(formData.entries());
      customer.gstin = String(customer.gstin || "").trim().toUpperCase();
      customer.phone = String(customer.phone || "").replace(/\D/g, "");

      if (!/^[6-9][0-9]{9}$/.test(customer.phone)) {
        setStatus("Please enter a valid 10-digit Indian mobile number.", "error");
        return;
      }

      if (!validateGstin(customer.gstin)) {
        setStatus("Please enter a valid 15-character GSTIN.", "error");
        return;
      }

      if (!customerForm.checkValidity()) {
        customerForm.reportValidity();
        return;
      }

      state.customer = customer;
      state.orderId = helpers.generateOrderId();
      renderReview();
      reviewPanel.hidden = false;
      reviewPanel.scrollIntoView({ behavior: "smooth", block: "start" });

      try {
        localStorage.setItem("aiv-order-draft", JSON.stringify({
          orderId: state.orderId,
          productId: product.id,
          quantities: state.quantities,
          customer,
          totals: value,
          savedAt: new Date().toISOString()
        }));
      } catch (error) {
        console.warn("Could not save local draft", error);
      }
    });

    const screenshotInput = document.querySelector("#payment-screenshot");
    screenshotInput.addEventListener("change", () => {
      const file = screenshotInput.files?.[0];
      state.screenshot = null;
      if (!file) return;
      const maxBytes = config.order.maxScreenshotMB * 1024 * 1024;
      if (file.size > maxBytes) {
        screenshotInput.value = "";
        setStatus(`Payment screenshot must be smaller than ${config.order.maxScreenshotMB} MB.`, "error");
        return;
      }
      if (!/^image\//.test(file.type)) {
        screenshotInput.value = "";
        setStatus("Please upload an image file for the payment screenshot.", "error");
        return;
      }
      state.screenshot = file;
    });

    function fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || "");
          resolve({
            name: file.name,
            mimeType: file.type,
            base64: result.includes(",") ? result.split(",")[1] : result
          });
        };
        reader.onerror = () => reject(reader.error || new Error("Could not read screenshot"));
        reader.readAsDataURL(file);
      });
    }

    paymentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!config.payment.live) {
        setStatus("The order flow is ready, but payment submission is disabled until official bank details and the QR code are added.", "info");
        return;
      }

      if (!state.customer || !state.orderId) {
        setStatus("Please complete the customer and order details first.", "error");
        return;
      }

      const paymentData = Object.fromEntries(new FormData(paymentForm).entries());
      if (!String(paymentData.utr || "").trim()) {
        setStatus("Please enter the payment UTR or transaction reference.", "error");
        return;
      }
      if (!state.screenshot) {
        setStatus("Please upload the payment screenshot.", "error");
        return;
      }
      if (!paymentForm.checkValidity()) {
        paymentForm.reportValidity();
        return;
      }

      finalButton.disabled = true;
      finalButton.textContent = "Submitting order…";

      try {
        const value = totals();
        const screenshot = await fileToBase64(state.screenshot);
        const payload = {
          version: 1,
          submittedAt: new Date().toISOString(),
          status: "PAYMENT_VERIFICATION_PENDING",
          orderId: state.orderId,
          company: config.company.legalName,
          sellerGstin: config.company.gstin,
          product: { id: product.id, name: product.name, unitPriceInclusiveGst: product.pricePerUnit },
          lineItems: value.lineItems,
          totals: value,
          customer: state.customer,
          payment: {
            utr: String(paymentData.utr).trim(),
            paymentDate: paymentData.paymentDate,
            payerName: String(paymentData.payerName || "").trim()
          },
          paymentScreenshot: screenshot
        };

        if (!config.order.endpoint) {
          throw new Error("The free Google Sheets submission endpoint has not been configured yet.");
        }

        await fetch(config.order.endpoint, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });

        localStorage.removeItem("aiv-order-draft");
        paymentForm.reset();
        setStatus(`Order ${state.orderId} has been submitted. Status: payment verification pending.`, "success");
        document.querySelector("[data-success-order-id]").textContent = state.orderId;
        document.querySelector("[data-success-panel]").hidden = false;

        const whatsappMessage = [
          `Hi, I have submitted AIV order ${state.orderId}.`,
          `Product: ${product.name}`,
          `Total pieces: ${value.pieces}`,
          `Amount: ${helpers.formatMoney(value.inclusiveTotal)}`,
          `UTR: ${paymentData.utr}`
        ].join("\n");
        const whatsapp = helpers.whatsappUrl(whatsappMessage);
        const link = document.querySelector("[data-success-whatsapp]");
        if (whatsapp) link.href = whatsapp;
      } catch (error) {
        console.error(error);
        setStatus(error.message || "The order could not be submitted. Please try again.", "error");
      } finally {
        if (config.payment.live) {
          finalButton.disabled = false;
          finalButton.textContent = "Submit payment details";
        }
      }
    });

    renderPacks();
    populatePaymentDetails();
    updateTotals();
  });
})();
