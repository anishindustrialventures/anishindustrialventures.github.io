# Anish Industrial Ventures Website

Customer-facing website for **Anish Industrial Ventures (AIV)**, hosted through GitHub Pages.

## Current commercial setup

- Product: Brand Daddy Fireball
- MRP: ₹999 per Fireball
- Selling price: ₹603 per Fireball
- Order unit: complete bundles of 36 Fireballs
- Bundle total: ₹21,708
- GST: 18% included
- Shipping: included
- Customer GSTIN: mandatory

## Official business details

- Trade name: Anish Industrial Ventures
- Proprietor: Sunita Gupta
- GSTIN: 03AGRPG5512C1ZV
- Udyam Registration: UDYAM-PB-19-0073269
- Email: anishindustrialventures@gmail.com
- Phone / WhatsApp: +91 73075 12016

## Files

- `index.html` — homepage
- `product.html` — Brand Daddy Fireball product page
- `order.html` — customer ordering and confirmation flow
- `js/site-config.js` — business, product, pricing, bank and endpoint configuration
- `js/order.js` — order calculations and Google Sheets submission
- `google-apps-script/Code.gs` — Apps Script receiver for the Orders sheet

## Google Sheets order connection

The Apps Script is configured for spreadsheet ID:

`15VuBQcjwtp0-GXhf6Y9s_Zpl7s8hZ0IBDF3hYlGwCIM`

To activate order storage:

1. Open the Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Replace the Apps Script editor content with `google-apps-script/Code.gs`.
4. Set the Apps Script project time zone to **Asia/Kolkata**.
5. Click **Deploy → New deployment → Web app**.
6. Set **Execute as** to yourself and **Who has access** to **Anyone**.
7. Copy the deployed `/exec` URL.
8. The deployed Web App URL is already configured in `js/site-config.js` under `order.endpoint`.
9. Upload the updated file to GitHub and test one order.

Orders are written to an `Orders` tab. The Apps Script calculates the authoritative total using ₹603 per Fireball and 36 Fireballs per bundle, generates the AIV Order Reference after a successful save, and emails the order summary to the AIV email address.
