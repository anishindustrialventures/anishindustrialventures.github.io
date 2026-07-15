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

  const helpers = {
    formatMoney(value) {
      return moneyFormatter.format(Number(value || 0));
    },

    activeProduct() {
      return config.products.find((product) => product.status === "active") || config.products[0];
    },

    whatsappUrl(message) {
      const number = String(config.contact.whatsappNumber || "").replace(/\D/g, "");
      if (!number) return "";
      return `https://wa.me/${number}?text=${encodeURIComponent(message || config.contact.defaultWhatsappMessage)}`;
    },

    scrollToId(id) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  window.AIV = { config, helpers };

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
      const href = helpers.whatsappUrl(message);
      element.href = href;
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

  function initialiseProductCards() {
    const container = document.querySelector("[data-product-list]");
    if (!container) return;

    container.innerHTML = "";
    config.products.filter((product) => product.status === "active").forEach((product) => {
      const bundle = product.packs[0];
      const bundlePrice = bundle.pieces * product.pricePerUnit;
      const card = document.createElement("article");
      card.className = "product-card product-card--featured product-card--single";
      card.innerHTML = `
        <a class="product-card__media" href="product.html?product=${encodeURIComponent(product.id)}" aria-label="View ${product.name}">
          <img src="${product.image}" alt="${product.name}" loading="lazy" width="776" height="548">
        </a>
        <div class="product-card__content">
          <span class="eyebrow">Available now</span>
          <h3><a href="product.html?product=${encodeURIComponent(product.id)}">${product.name}</a></h3>
          <p>${product.summary}</p>
          <div class="product-price-block">
            <span class="mrp-line">MRP <del>${helpers.formatMoney(product.mrpPerUnit)}</del> per ball</span>
            <strong>${helpers.formatMoney(product.pricePerUnit)}</strong>
            <span>per ball · 18% GST and shipping included</span>
            <small>${bundle.label}: ${helpers.formatMoney(bundlePrice)}</small>
          </div>
          <div class="button-row">
            <a class="button button--primary" href="product.html?product=${encodeURIComponent(product.id)}">View details <span aria-hidden="true">→</span></a>
            <a class="button button--outline" href="order.html?product=${encodeURIComponent(product.id)}">Place order</a>
          </div>
        </div>
      `;
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
