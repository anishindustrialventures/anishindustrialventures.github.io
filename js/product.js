(() => {
  "use strict";

  document.addEventListener("DOMContentLoaded", () => {
    const { config, helpers } = window.AIV;
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("product");
    const product = config.products.find((item) => item.id === productId) || helpers.activeProduct();

    if (!product) {
      document.querySelector("main").innerHTML = "<section class='section container'><h1>Product not found</h1></section>";
      return;
    }

    document.title = `${product.name} | ${config.company.shortName}`;
    document.querySelectorAll("[data-product-name]").forEach((element) => (element.textContent = product.name));
    document.querySelectorAll("[data-product-summary]").forEach((element) => (element.textContent = product.summary));
    document.querySelectorAll("[data-product-description]").forEach((element) => (element.textContent = product.description));
    document.querySelectorAll("[data-product-price]").forEach((element) => (element.textContent = helpers.formatMoney(product.pricePerUnit)));
    document.querySelectorAll("[data-product-mrp]").forEach((element) => (element.textContent = helpers.formatMoney(product.mrpPerUnit)));

    document.querySelectorAll("[data-product-image]").forEach((image) => {
      image.src = product.heroImage || product.image;
      image.alt = product.name;
    });

    document.querySelectorAll("[data-order-link]").forEach((link) => {
      link.href = `order.html?product=${encodeURIComponent(product.id)}`;
    });

    const packs = document.querySelector("[data-pack-list]");
    product.packs.forEach((pack) => {
      const total = pack.pieces * product.pricePerUnit;
      const card = document.createElement("article");
      card.className = "pack-card";
      card.innerHTML = `
        <span class="pack-card__count">${pack.pieces}</span>
        <div>
          <h3>${pack.label}</h3>
          <p>${helpers.formatMoney(total)} per bundle · GST and shipping included</p>
        </div>
      `;
      packs.appendChild(card);
    });

    const benefits = document.querySelector("[data-benefits]");
    product.benefits.forEach((benefit) => {
      const item = document.createElement("li");
      item.textContent = benefit;
      benefits.appendChild(item);
    });

    const usage = document.querySelector("[data-usage]");
    product.usage.forEach((step, index) => {
      const item = document.createElement("li");
      item.innerHTML = `<span>${index + 1}</span><p>${step}</p>`;
      usage.appendChild(item);
    });
  });
})();
