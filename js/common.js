(() => {
  "use strict";

  const config = window.AIV_CONFIG;
  if (!config) {
    console.error("AIV_CONFIG is missing. Load js/site-config.js before common.js.");
    return;
  }

  const moneyFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: config.order.currency || "INR",
    maximumFractionDigits: 2
  });

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slugify(value) {
    return String(value || "product")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "product";
  }

  function toNumber(value) {
    const number = Number(String(value ?? "").replace(/,/g, "").trim());
    return Number.isFinite(number) ? number : 0;
  }

  function toBoolean(value) {
    if (typeof value === "boolean") return value;
    return ["yes", "true", "1", "active", "enabled"].includes(String(value || "").trim().toLowerCase());
  }

  function normaliseImageUrl(url) {
    const value = String(url || "").trim();
    if (!value) return "assets/favicon.svg";

    const driveFileMatch = value.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
    if (driveFileMatch) return `https://drive.google.com/uc?export=view&id=${driveFileMatch[1]}`;

    try {
      const parsed = new URL(value);
      if (parsed.hostname.includes("drive.google.com") && parsed.searchParams.get("id")) {
        return `https://drive.google.com/uc?export=view&id=${parsed.searchParams.get("id")}`;
      }
    } catch (_) {
      // A relative GitHub asset path is valid and does not need URL parsing.
    }
    return value;
  }

  function normaliseSpecifications(value) {
    if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
    return String(value || "")
      .split(/\r?\n|\|/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normaliseProduct(raw, index = 0) {
    const productCode = String(raw.productCode ?? raw["Product Code"] ?? "").trim();
    const name = String(raw.name ?? raw.productName ?? raw["Product Name"] ?? "Product").trim();
    const bundleQuantity = toNumber(raw.bundleQuantity ?? raw["Bundle Quantity"]);
    const minimumQuantity = toNumber(raw.minimumQuantity ?? raw["Minimum Quantity"]);
    const priceInclGst = toNumber(raw.priceInclGst ?? raw["Price Including GST"]);
    const orderEnabledValue = raw.orderEnabled ?? raw["Order Enabled"];

    const product = {
      id: slugify(raw.id || productCode || name),
      productCode,
      sapCode: String(raw.sapCode ?? raw["SAP Code"] ?? "").trim(),
      name,
      image: normaliseImageUrl(raw.image ?? raw.productPhotoUrl ?? raw["Product Photo URL"]),
      summary: String(raw.summary ?? raw.shortDescription ?? raw["Short Description"] ?? "").trim(),
      description: String(raw.description ?? raw.detailedDescription ?? raw["Detailed Description"] ?? "").trim(),
      basePrice: toNumber(raw.basePrice ?? raw["Base Price"]),
      gstRate: toNumber(raw.gstRate ?? raw["GST %"]),
      priceInclGst,
      mrp: toNumber(raw.mrp ?? raw.MRP),
      bundleQuantity,
      minimumQuantity,
      unit: String(raw.unit ?? raw.Unit ?? "unit").trim() || "unit",
      shippingIncluded: toBoolean(raw.shippingIncluded ?? raw["Shipping Included"]),
      hsnCode: String(raw.hsnCode ?? raw["HSN Code"] ?? "").trim(),
      specifications: normaliseSpecifications(raw.specifications ?? raw.Specifications),
      active: raw.active === undefined && raw.Active === undefined ? true : toBoolean(raw.active ?? raw.Active),
      orderEnabled: orderEnabledValue === undefined
        ? Boolean(productCode && priceInclGst > 0 && bundleQuantity > 0 && minimumQuantity > 0)
        : toBoolean(orderEnabledValue),
      displayOrder: toNumber(raw.displayOrder ?? raw["Display Order"]) || index + 1
    };

    product.minimumBundles = product.bundleQuantity > 0
      ? Math.max(1, Math.ceil(product.minimumQuantity / product.bundleQuantity))
      : 0;
    product.orderEnabled = Boolean(
      product.orderEnabled &&
      product.active &&
      product.productCode &&
      product.priceInclGst > 0 &&
      product.bundleQuantity > 0 &&
      product.minimumQuantity > 0
    );
    return product;
  }

  const helpers = {
    formatMoney(value) {
      return moneyFormatter.format(Number(value || 0));
    },
    escapeHtml,
    normaliseImageUrl,
    activeProduct() {
      return window.AIV.products.find((product) => product.active) || window.AIV.products[0];
    },
    findProduct(identifier) {
      const key = String(identifier || "").trim().toLowerCase();
      return window.AIV.products.find((product) =>
        product.id.toLowerCase() === key || product.productCode.toLowerCase() === key
      );
    },
    whatsappUrl(message) {
      const number = String(config.contact.whatsappNumber || "").replace(/\D/g, "");
      if (!number) return "";
      return `https://wa.me/${number}?text=${encodeURIComponent(message || config.contact.defaultWhatsappMessage)}`;
    },
    unitLabel(product, quantity = 1) {
      const unit = product.unit || "unit";
      return quantity === 1 ? unit : `${unit}s`;
    }
  };

  window.AIV = {
    config,
    helpers,
    products: (config.fallbackProducts || []).map(normaliseProduct),
    usingFallbackProducts: true,
    productsReady: null
  };

  function loadProductsFromSheet() {
    const endpoint = String(config.data?.productsEndpoint || "").trim();
    if (!endpoint) return Promise.resolve(window.AIV.products);

    return new Promise((resolve) => {
      const callbackName = `__aivProducts_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      let completed = false;

      const finish = (products, usingFallback) => {
        if (completed) return;
        completed = true;
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
        if (Array.isArray(products) && products.length) {
          window.AIV.products = products.map(normaliseProduct)
            .filter((product) => product.active)
            .sort((a, b) => a.displayOrder - b.displayOrder);
          window.AIV.usingFallbackProducts = usingFallback;
        }
        resolve(window.AIV.products);
      };

      window[callbackName] = (response) => {
        if (response?.ok && Array.isArray(response.products) && response.products.length) {
          finish(response.products, false);
        } else {
          console.warn("AIV product service returned no active products. Using local product data.");
          finish(window.AIV.products, true);
        }
      };

      const timeout = window.setTimeout(() => {
        console.warn("AIV product service timed out. Using local product data.");
        finish(window.AIV.products, true);
      }, config.data?.productsTimeoutMs || 15000);

      const separator = endpoint.includes("?") ? "&" : "?";
      script.src = `${endpoint}${separator}action=products&callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
      script.async = true;
      script.onerror = () => finish(window.AIV.products, true);
      document.head.appendChild(script);
    });
  }

  window.AIV.productsReady = loadProductsFromSheet();

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  }

  function initialiseGlobalContent() {
    setText("[data-company-name]", config.company.legalName);
    setText("[data-company-short]", config.company.shortName);
    setText("[data-proprietor-name]", config.company.proprietorName);
    setText("[data-tagline]", config.company.tagline);
    setText("[data-gstin]", config.company.gstin);
    setText("[data-udyam]", config.company.udyam);
    setText("[data-address]", config.company.address);
    setText("[data-phone]", config.contact.phoneDisplay);
    setText("[data-email]", config.contact.email);
    setText("[data-partner-label]", config.partner.label);
    setText("[data-year]", String(config.company.copyrightYear));

    document.querySelectorAll("[data-phone-link]").forEach((element) => {
      element.href = `tel:${config.contact.phoneHref.replace(/\s/g, "")}`;
    });
    document.querySelectorAll("[data-email-link]").forEach((element) => {
      element.href = `mailto:${config.contact.email}`;
    });
    document.querySelectorAll("[data-whatsapp-link]").forEach((element) => {
      const message = element.dataset.whatsappMessage || config.contact.defaultWhatsappMessage;
      element.href = helpers.whatsappUrl(message);
      element.target = "_blank";
      element.rel = "noopener noreferrer";
    });
  }

  function initialiseMobileMenu() {
    const toggle = document.querySelector("[data-menu-toggle]");
    const menu = document.querySelector("[data-mobile-menu]");
    if (!toggle || !menu) return;

    const closeMenu = () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
    };

    toggle.addEventListener("click", () => {
      const open = !menu.classList.contains("is-open");
      menu.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("menu-open", open);
    });
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  function productMeta(product) {
    const entries = [];
    if (product.productCode) entries.push(`<span><b>Product Code</b> ${escapeHtml(product.productCode)}</span>`);
    if (product.sapCode) entries.push(`<span><b>SAP Code</b> ${escapeHtml(product.sapCode)}</span>`);
    return entries.length ? `<div class="product-code-row">${entries.join("")}</div>` : "";
  }

  function productPriceMarkup(product) {
    if (product.priceInclGst <= 0) {
      return `<div class="product-price-block"><strong>Price on request</strong><span>Contact AIV for commercial details</span></div>`;
    }

    const mrp = product.mrp > 0
      ? `<span class="mrp-line">MRP <del>${helpers.formatMoney(product.mrp)}</del> per ${escapeHtml(product.unit)}</span>`
      : "";
    const taxText = product.gstRate > 0 ? `${product.gstRate}% GST included` : "Final selling price";
    const bundleText = product.bundleQuantity > 0
      ? `<small>${product.bundleQuantity} ${escapeHtml(helpers.unitLabel(product, product.bundleQuantity))} per order bundle · ${helpers.formatMoney(product.bundleQuantity * product.priceInclGst)}</small>`
      : "";

    return `<div class="product-price-block">${mrp}<strong>${helpers.formatMoney(product.priceInclGst)}</strong><span>per ${escapeHtml(product.unit)} · ${escapeHtml(taxText)}${product.shippingIncluded ? " · shipping included" : ""}</span>${bundleText}</div>`;
  }

  async function initialiseProductCards() {
    const container = document.querySelector("[data-product-list]");
    if (!container) return;

    await window.AIV.productsReady;
    container.innerHTML = "";
    const products = window.AIV.products.filter((product) => product.active);

    if (!products.length) {
      container.innerHTML = `<div class="empty-state"><h3>Products are being updated</h3><p>Please contact AIV on WhatsApp for current availability.</p></div>`;
      return;
    }

    products.forEach((product) => {
      const card = document.createElement("article");
      card.className = "product-card product-card--featured";
      const detailUrl = `product.html?product=${encodeURIComponent(product.id)}`;
      const orderAction = product.orderEnabled
        ? `<a class="button button--outline" href="order.html?product=${encodeURIComponent(product.id)}">Place order</a>`
        : `<a class="button button--outline" href="${helpers.whatsappUrl(`Hi, I would like pricing and ordering details for ${product.name}.`)}" target="_blank" rel="noopener noreferrer">Enquire on WhatsApp</a>`;

      card.innerHTML = `
        <a class="product-card__media" href="${detailUrl}" aria-label="View ${escapeHtml(product.name)}">
          <img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" width="776" height="548">
        </a>
        <div class="product-card__content">
          <span class="eyebrow">${product.orderEnabled ? "Available to order" : "Product enquiry"}</span>
          <h3><a href="${detailUrl}">${escapeHtml(product.name)}</a></h3>
          ${productMeta(product)}
          <p>${escapeHtml(product.summary)}</p>
          ${productPriceMarkup(product)}
          <div class="button-row">
            <a class="button button--primary" href="${detailUrl}">View details <span aria-hidden="true">→</span></a>
            ${orderAction}
          </div>
        </div>`;
      container.appendChild(card);
    });
  }

  function initialiseHeaderState() {
    const header = document.querySelector(".site-header");
    if (!header) return;
    const update = () => header.classList.toggle("is-scrolled", window.scrollY > 16);
    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initialiseGlobalContent();
    initialiseMobileMenu();
    initialiseProductCards();
    initialiseHeaderState();
  });
})();
