window.AIV_CONFIG = {
  company: {
    shortName: "AIV",
    legalName: "Anish Industrial Ventures",
    proprietorName: "Sunita Gupta",
    tagline: "Powering What’s Next.",
    gstin: "03AGRPG5512C1ZV",
    udyam: "UDYAM-PB-19-0073269",
    address: "Sunita Gupta, Gupta Niwas, Street No. 11, near Chandigarh Heart Centre Hospital, Punia Colony, Sangrur, Punjab – 148001",
    copyrightYear: new Date().getFullYear()
  },

  partner: {
    brand: "Brand Daddy",
    label: "Authorised Partner of Brand Daddy"
  },

  contact: {
    phoneDisplay: "+91 73075 12016",
    phoneHref: "+917307512016",
    email: "anishindustrialventures@gmail.com",
    whatsappNumber: "917307512016",
    defaultWhatsappMessage: "Hi, I would like to know more about Brand Daddy Fireball."
  },

  order: {
    currency: "INR",
    gstRate: 0.18,
    gstinRequired: true,
    shippingIncluded: true,
    endpoint: "https://script.google.com/macros/s/AKfycbw_TQXKdmVgiSev223VZPgTy8uvvXLEzWtxBpzxzJ_49ndADbRb_Zm_hiYyYtM5ue39/exec",
    responseTimeoutMs: 20000
  },

  payment: {
    accountName: "Anish Industrial Ventures",
    bankName: "HDFC Bank",
    accountNumber: "502000121908336",
    ifsc: "HDFC0000262",
    branch: "Sangrur",
    micr: "148240002",
    instructions: "After confirming the order, use the generated AIV Order Reference in your bank-transfer remarks. Dispatch will be processed after payment verification."
  },

  products: [
    {
      id: "brand-daddy-fireball",
      slug: "brand-daddy-fireball",
      name: "Brand Daddy Fireball",
      shortName: "Fireball",
      status: "active",
      mrpPerUnit: 999,
      pricePerUnit: 603,
      priceIncludesGst: true,
      shippingIncluded: true,
      image: "assets/brand-daddy-fireball.png",
      heroImage: "assets/brand-daddy-fireball.png",
      summary: "A clean, safe and efficient firelighter designed for dependable ignition.",
      description: "Brand Daddy Fireball is a practical firelighting solution developed for quick and consistent ignition. It is supplied by Anish Industrial Ventures in sealed bundles for reliable commercial and repeat ordering.",
      benefits: [
        "Quick and dependable ignition",
        "Clean and convenient handling",
        "Consistent product quality",
        "GST invoice and shipping included"
      ],
      usage: [
        "Place the fireball in the required ignition area.",
        "Light it carefully using an appropriate flame source.",
        "Allow it to ignite the surrounding fuel before adding more material.",
        "Always follow the instructions printed on the official product packaging."
      ],
      packs: [
        { id: "bundle-36", label: "36-ball bundle", pieces: 36 }
      ]
    }
  ]
};
