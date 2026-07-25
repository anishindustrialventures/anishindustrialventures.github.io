(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    const { config, helpers } = window.AIV;
    const params = new URLSearchParams(window.location.search);
    const requestedIdentifier = params.get("product");

    function setText(selector, value) {
      document.querySelectorAll(selector).forEach((element) => {
        element.textContent = value;
      });
    }

    function setOverviewRow(wrapSelector, valueSelector, value) {
      const wrap = document.querySelector(wrapSelector);
      const valueElement = document.querySelector(valueSelector);
      if (wrap) wrap.hidden = !value;
      if (valueElement) valueElement.textContent = value || "";
    }

    function render() {
      const product = helpers.findProduct(requestedIdentifier) || helpers.activeProduct();
      if (!product) {
        const main = document.querySelector("main");
        if (main) {
          main.innerHTML = "<section class='section'><div class='container empty-state'><h1>Product not found</h1><p>Please return to the products page.</p></div></section>";
        }
        return;
      }

      document.title = `${product.name} | ${config.company.shortName}`;
      setText("[data-product-name]", product.name);
      setText("[data-product-summary]", product.summary);
      setText("[data-product-description]", product.description || product.summary);
      setText("[data-product-code]", product.productCode || "Not listed");
      setText("[data-sap-code]", product.sapCode || "Not listed");
      setText("[data-hsn-code]", product.hsnCode || "Not listed");
      setText("[data-product-cta-name]", product.name);

      document.querySelectorAll("[data-product-code-wrap]").forEach((element) => {
        element.hidden = !product.productCode;
      });
      document.querySelectorAll("[data-sap-code-wrap]").forEach((element) => {
        element.hidden = !product.sapCode;
      });
      document.querySelectorAll("[data-hsn-code-wrap]").forEach((element) => {
        element.hidden = !product.hsnCode;
      });

      document.querySelectorAll("[data-product-image]").forEach((image) => {
        image.src = product.image;
        image.alt = product.name;
      });

      const priceContainer = document.querySelector("[data-product-pricing]");
      if (priceContainer) {
        if (product.priceInclGst > 0) {
          priceContainer.innerHTML = `
            ${product.mrp > 0 ? `<span>MRP <del>${helpers.formatMoney(product.mrp)}</del> per ${helpers.escapeHtml(product.unit)}</span>` : ""}
            <strong>${helpers.formatMoney(product.priceInclGst)} per ${helpers.escapeHtml(product.unit)}</strong>
            <small>${product.gstRate > 0 ? `${product.gstRate}% GST included` : "Final selling price"}${product.shippingIncluded ? " · shipping included" : ""}</small>`;
        } else {
          priceContainer.innerHTML = "<strong>Price on request</strong><small>Contact AIV for pricing and ordering details.</small>";
        }
      }

      const bundlePrice = product.bundleQuantity > 0 && product.priceInclGst > 0
        ? product.bundleQuantity * product.priceInclGst
        : 0;
      setOverviewRow(
        "[data-order-multiple-wrap]",
        "[data-order-multiple]",
        product.bundleQuantity > 0 ? `${product.bundleQuantity} ${helpers.unitLabel(product, product.bundleQuantity)}` : ""
      );
      setOverviewRow(
        "[data-minimum-order-wrap]",
        "[data-minimum-order]",
        product.minimumQuantity > 0 ? `${product.minimumQuantity} ${helpers.unitLabel(product, product.minimumQuantity)}` : ""
      );
      setOverviewRow(
        "[data-bundle-price-wrap]",
        "[data-bundle-price]",
        bundlePrice > 0 ? helpers.formatMoney(bundlePrice) : ""
      );
      setOverviewRow(
        "[data-shipping-wrap]",
        "[data-product-shipping]",
        product.shippingIncluded ? "Included" : "As applicable"
      );

      const specifications = document.querySelector("[data-specifications]");
      if (specifications) {
        specifications.innerHTML = "";
        const values = product.specifications.length
          ? product.specifications
          : [product.summary].filter(Boolean);
        values.forEach((specification) => {
          const item = document.createElement("li");
          item.textContent = specification;
          specifications.appendChild(item);
        });
      }

      const orderButtons = document.querySelectorAll("[data-order-link]");
      const whatsappButtons = document.querySelectorAll("[data-product-whatsapp]");
      const enquiryMessage = `Hi, I would like more information about ${product.name}${product.productCode ? ` (Product Code: ${product.productCode})` : ""}.`;
      whatsappButtons.forEach((button) => {
        button.href = helpers.whatsappUrl(enquiryMessage);
      });

      orderButtons.forEach((button) => {
        if (product.orderEnabled) {
          button.href = `order.html?product=${encodeURIComponent(product.id)}`;
          button.textContent = "Start order";
          button.removeAttribute("target");
          button.removeAttribute("rel");
        } else {
          button.href = helpers.whatsappUrl(`Hi, I would like pricing and ordering details for ${product.name}.`);
          button.target = "_blank";
          button.rel = "noopener noreferrer";
          button.textContent = "Request price";
        }
      });
    }

    await window.AIV.productsReady;
    render();
    window.addEventListener("aiv:products-updated", render, { once: true });
  });
})();
