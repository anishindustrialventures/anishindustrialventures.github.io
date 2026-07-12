# Anish Industrial Ventures Website

A responsive, dependency-free website built for free GitHub Pages hosting.

## Included pages

- `index.html` — approved navy/orange AIV homepage
- `product.html` — Brand Daddy Fireball details, pack sizes, benefits, usage and future video section
- `order.html` — mixed-SKU ordering, GST-inclusive calculation, customer details, bank-payment flow and payment proof collection
- `404.html` — GitHub Pages fallback

## Current commercial setup

- Product: Brand Daddy Fireball
- Price: ₹650 per fireball, inclusive of GST
- Packs: 24 pieces, 40 pieces and 50 pieces
- Customers can mix packs and order any number of sets
- Order status after submission: `Payment verification pending`
- GSTIN, bank details, contact details and QR code currently use placeholders
- Payment submission is intentionally disabled while `payment.live` is `false`

## One-file future updates

Most business changes are made in:

`js/site-config.js`

Use that file to update:

- GSTIN
- phone, email and WhatsApp number
- bank account and UPI details
- bank QR image
- price or pack sizes
- new products
- YouTube videos
- Google Sheets order endpoint

## Preview locally

From the project folder, run:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Free order storage using Google Sheets

1. Create a Google Sheet.
2. Create a Google Drive folder for payment screenshots.
3. Open Google Apps Script and paste `google-apps-script/Code.gs`.
4. Replace the Sheet ID, Drive folder ID and notification email in that script.
5. Deploy it as a Web App that executes as the owner and can receive public form submissions.
6. Copy the Web App URL into `js/site-config.js` as `order.endpoint`.
7. Add final bank details and QR image.
8. Change `payment.live` from `false` to `true` only after testing.

The Apps Script creates the order sheet header automatically, prevents duplicate order IDs, saves the screenshot to Drive and emails the owner.

## Add a product video later

In the Fireball product inside `js/site-config.js`, replace:

```js
videos: []
```

with:

```js
videos: [
  {
    title: "How to use Brand Daddy Fireball",
    type: "youtube",
    videoId: "YOUR_YOUTUBE_VIDEO_ID"
  }
]
```

## Add another product later

Duplicate the Fireball object inside `products` in `js/site-config.js`, give it a unique `id`, update its content and set `status: "active"`. The homepage product grid will render it automatically.

## Publish on GitHub Pages

Upload the contents of this folder to a GitHub repository and enable GitHub Pages for the repository's main branch and root folder. All links and assets are relative, so the site works from a project repository path.

## Before public launch

Replace all `XXXXXXXX` values, use the official Brand Daddy product images and authorised-partner material, confirm delivery charges, add terms/privacy/return policies, test the Google Sheet submission, and complete a real low-value payment test before enabling payment.
