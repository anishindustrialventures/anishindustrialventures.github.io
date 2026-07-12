/*
  AIV WEBSITE CONFIGURATION
  -------------------------
  Update business, contact, product, payment and submission details here.
  The rest of the website reads from this single configuration file.
*/
window.AIV_CONFIG = {
  company: {
    shortName: "AIV",
    legalName: "Anish Industrial Ventures",
    tagline: "Powering What’s Next.",
    gstin: "XXXXXXXXXXXXXXX",
    address: "Punjab, India",
    copyrightYear: new Date().getFullYear()
  },

  partner: {
    brand: "Brand Daddy",
    label: "Authorised Partner of Brand Daddy",
    certificateUrl: "" // Add a certificate URL later, if required.
  },

  contact: {
    phoneDisplay: "+91 XXXXX XXXXX",
    phoneHref: "+91XXXXXXXXXX",
    email: "XXXXXXXX@XXXXXXXX.com",
    whatsappNumber: "91XXXXXXXXXX", // Digits only, including country code.
    defaultWhatsappMessage: "Hi, I would like to know more about Brand Daddy Fireball."
  },

  order: {
    currency: "INR",
    gstRate: 0.18,
    gstinRequired: true,
    maxScreenshotMB: 5,
    endpoint: "", // Add the deployed Google Apps Script Web App URL here.
    notificationMode: "google-sheets"
  },

  payment: {
    live: false, // Change to true only after the official bank details and QR are added.
    accountName: "XXXXXXXXXXXXXXX",
    bankName: "XXXXXXXXXXXXXXX",
    accountNumber: "XXXXXXXXXXXXXXX",
    ifsc: "XXXXXXXXXXX",
    branch: "XXXXXXXXXXXXXXX",
    upiId: "XXXXXXXXXXXXXXX",
    qrImage: "assets/bank-qr-placeholder.svg",
    instructions: "Use the generated AIV Order ID in the payment remarks. Your order will be confirmed after payment verification."
  },

  products: [
    {
      id: "brand-daddy-fireball",
      slug: "brand-daddy-fireball",
      name: "Brand Daddy Fireball",
      shortName: "Fireball",
      status: "active",
      pricePerUnit: 650,
      priceIncludesGst: true,
      image: "assets/brand-daddy-fireball.png",
      heroImage: "assets/brand-daddy-fireball.png",
      summary: "A clean, safe and efficient firelighter designed for dependable ignition.",
      description: "Brand Daddy Fireball is a practical firelighting solution developed for quick and consistent ignition. It is suitable for commercial buyers who value convenience, controlled handling and reliable performance.",
      benefits: [
        "Quick and dependable ignition",
        "Clean and convenient handling",
        "Consistent product quality",
        "Suitable for bulk and repeat orders"
      ],
      usage: [
        "Place the fireball in the required ignition area.",
        "Light it carefully using an appropriate flame source.",
        "Allow it to ignite the surrounding fuel before adding more material.",
        "Always follow the instructions printed on the official product packaging."
      ],
      packs: [
        { id: "pack-24", label: "24-piece set", pieces: 24 },
        { id: "pack-40", label: "40-piece set", pieces: 40 },
        { id: "pack-50", label: "50-piece set", pieces: 50 }
      ],
      videos: [] // Later add: { title: "How to use", type: "youtube", videoId: "VIDEO_ID" }
    }
  ]
};
