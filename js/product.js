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
          <p>${helpers.formatMoney(total)} per set</p>
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

    const videos = document.querySelector("[data-videos]");
    if (!product.videos.length) {
      videos.innerHTML = `
        <article class="video-placeholder">
          <div class="video-placeholder__play" aria-hidden="true">▶</div>
          <div>
            <span class="eyebrow">Video section</span>
            <h3>Product videos coming soon</h3>
            <p>Demonstrations and usage videos can be added here later using YouTube embeds.</p>
          </div>
        </article>
      `;
    } else {
      product.videos.forEach((video) => {
        if (video.type !== "youtube" || !video.videoId) return;
        const article = document.createElement("article");
        article.className = "video-card";
        article.innerHTML = `
          <div class="video-frame">
            <iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.videoId)}" title="${video.title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
          </div>
          <h3>${video.title}</h3>
        `;
        videos.appendChild(article);
      });
    }
  });
})();
