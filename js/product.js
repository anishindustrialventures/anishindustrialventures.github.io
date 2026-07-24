(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", async () => {
    const { config, helpers } = window.AIV;
    await window.AIV.productsReady;

    const params = new URLSearchParams(window.location.search);
    const requested = params.get("product");
    const product = helpers.findProduct(requested) || helpers.activeProduct();

    if (!product) {
      document.querySelector("main").innerHTML = "<section class='section'><div class='container empty-state'><h1>Product not found</h1><p>Please return to the products page.</p></div></section>";
      return;
    }

    const setText = (selector, value) => {
      document.querySelectorAll(selector).forEach((element) => (element.textContent = value));
    };

    document.title = `${product.name} | ${config.company.shortName}`;
    setText("[data-product-name]", product.name);
    setText("[data-product-summary]", product.summary);
    setText("[data-product-description]", product.description || product.summary);
    setText("[data-product-code]", product.productCode || "Not listed");
    setText("[data-sap-code]", product.sapCode || "Not listed");
    setText("[data-hsn-code]", product.hsnCode || "Not listed");

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
    if (product.priceInclGst > 0) {
      priceContainer.innerHTML = `
        ${product.mrp > 0 ? `<span>MRP <del>${helpers.formatMoney(product.mrp)}</del> per ${helpers.escapeHtml(product.unit)}</span>` : ""}
        <strong>${helpers.formatMoney(product.priceInclGst)} per ${helpers.escapeHtml(product.unit)}</strong>
        <small>${product.gstRate > 0 ? `${product.gstRate}% GST included` : "Final selling price"}${product.shippingIncluded ? " · shipping included" : ""}</small>`;
    } else {
      priceContainer.innerHTML = `<strong>Price on request</strong><small>Contact AIV for pricing and ordering details.</small>`;
    }

    const bundlePrice = product.bundleQuantity > 0 && product.priceInclGst > 0
      ? product.bundleQuantity * product.priceInclGst
      : 0;
    const overviewRows = [
      ["[data-order-multiple-wrap]", "[data-order-multiple]", product.bundleQuantity > 0 ? `${product.bundleQuantity} ${helpers.unitLabel(product, product.bundleQuantity)}` : ""],
      ["[data-minimum-order-wrap]", "[data-minimum-order]", product.minimumQuantity > 0 ? `${product.minimumQuantity} ${helpers.unitLabel(product, product.minimumQuantity)}` : ""],
      ["[data-bundle-price-wrap]", "[data-bundle-price]", bundlePrice > 0 ? helpers.formatMoney(bundlePrice) : ""],
      ["[data-shipping-wrap]", "[data-product-shipping]", product.shippingIncluded ? "Included" : "As applicable"]
    ];
    overviewRows.forEach(([wrapSelector, valueSelector, value]) => {
      const wrap = document.querySelector(wrapSelector);
      const valueElement = document.querySelector(valueSelector);
      if (wrap) wrap.hidden = !value;
      if (valueElement && value) valueElement.textContent = value;
    });

    const specs = document.querySelector("[data-specifications]");
    specs.innerHTML = "";
    (product.specifications.length ? product.specifications : [product.summary]).forEach((specification) => {
      const item = document.createElement("li");
      item.textContent = specification;
      specs.appendChild(item);
    });

    const orderButton = document.querySelector("[data-order-link]");
    const whatsappButton = document.querySelector("[data-product-whatsapp]");
    const enquiryMessage = `Hi, I would like more information about ${product.name}${product.productCode ? ` (Product Code: ${product.productCode})` : ""}.`;
    whatsappButton.href = helpers.whatsappUrl(enquiryMessage);

    if (product.orderEnabled) {
      orderButton.href = `order.html?product=${encodeURIComponent(product.id)}`;
      orderButton.textContent = "Start order";
    } else {
      orderButton.href = helpers.whatsappUrl(`Hi, I would like pricing and ordering details for ${product.name}.`);
      orderButton.target = "_blank";
      orderButton.rel = "noopener noreferrer";
      orderButton.textContent = "Request price";
    }

    setText("[data-product-cta-name]", product.name);
  });
})();
