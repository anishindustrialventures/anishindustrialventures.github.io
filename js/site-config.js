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
    defaultWhatsappMessage: "Hi, I would like to know more about the products available from Anish Industrial Ventures."
  },

  data: {
    productsEndpoint: "https://script.google.com/macros/s/AKfycbw_TQXKdmVgiSev223VZPgTy8uvvXLEzWtxBpzxzJ_49ndADbRb_Zm_hiYyYtM5ue39/exec",
    productsTimeoutMs: 10000,
    browserCacheMs: 1800000
  },

  order: {
    currency: "INR",
    gstinRequired: true,
    endpoint: "https://script.google.com/macros/s/AKfycbw_TQXKdmVgiSev223VZPgTy8uvvXLEzWtxBpzxzJ_49ndADbRb_Zm_hiYyYtM5ue39/exec",
    responseTimeoutMs: 60000
  },

  payment: {
    accountName: "Anish Industrial Ventures",
    bankName: "HDFC Bank",
    accountNumber: "50200121908336",
    ifsc: "HDFC0000262",
    branch: "Sangrur",
    instructions: "Transfer the displayed total to the AIV bank account and upload the payment screenshot below. Your AIV Order Reference will be generated after the order is recorded."
  },

  /*
   * These products keep the website usable if Google Sheets is temporarily unavailable.
   * The live website normally loads product data from the Products tab in Google Sheets.
   */
  fallbackProducts: [
    {
      id: "gfo01",
      productCode: "GFO01",
      sapCode: "0000366966",
      name: "GFO Automatic Fireball – 400 gm",
      image: "assets/gfo-automatic-fireball-400g.png",
      summary: "Automatic fire-extinguisher ball designed to activate after contact with flame.",
      description: "A 400 gm automatic fireball suitable for fire-prone areas, LPG-cylinder locations, vehicles and electrical panels.",
      basePrice: 646.61,
      gstRate: 18,
      priceInclGst: 763,
      mrp: 999,
      bundleQuantity: 20,
      minimumQuantity: 20,
      unit: "ball",
      shippingIncluded: true,
      hsnCode: "84241000",
      specifications: [
        "Weight: 400 gm",
        "One box contains 20 balls",
        "Automatic activation within 5–10 seconds",
        "Zero maintenance",
        "5-year shelf life"
      ],
      active: true,
      orderEnabled: true,
      displayOrder: 1
    },
    {
      id: "domestic-suraksha-lpg-hose",
      productCode: "",
      sapCode: "",
      name: "Domestic Suraksha LPG Hose",
      image: "assets/domestic-suraksha-lpg-hose.png",
      summary: "LERC-approved LPG Suraksha Hose Part 2 for low-pressure domestic and household applications.",
      description: "Domestic LPG hose designed for low-pressure household use in accordance with IS 9573 Part 2.",
      basePrice: 0,
      gstRate: 0,
      priceInclGst: 0,
      mrp: 0,
      bundleQuantity: 0,
      minimumQuantity: 0,
      unit: "",
      shippingIncluded: false,
      hsnCode: "",
      specifications: [
        "IS 9573 Part 2",
        "LERC approved",
        "Recommended maximum working pressure: 10 Bar",
        "Minimum burst pressure: 40 Bar"
      ],
      active: true,
      orderEnabled: false,
      displayOrder: 2
    }
  ]
};
