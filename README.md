# Anish Industrial Ventures Website

Customer-facing AIV website hosted through GitHub Pages. Product data is loaded dynamically from the `Products` tab in Google Sheets, while confirmed multi-product orders are stored in `Orders` and `Order Items`.

## Final fixes in this release

- Correct HDFC account number: `50200121908336`
- MICR removed from customer-facing pages
- Contact Us footer redesigned so phone, email and address do not collapse into a narrow column
- Bank details shown clearly in the footer
- Each product quantity control is isolated; changing one product never changes another product
- Duplicate Product Codes are prevented from creating duplicate online-order rows
- Product title is kept on one line on normal desktop screens
- Product Code, SAP Code and ordering rules appear only in Product Overview on the product page
- Separate Order Quantity block removed from product pages
- SDMS Portal Number is mandatory
- SDMS screenshot is optional
- Payment screenshot is mandatory
- Product data uses browser caching and Apps Script caching for faster loading
- Product prices, minimum quantities and bundle rules are revalidated by Apps Script before saving an order

## Required deployment order

### 1. Update Apps Script

1. Open the AIV Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Replace all existing code with `google-apps-script/Code.gs`.
4. Save the project.
5. Select `setupAivSheets` and click **Run** once.
6. Approve the requested permissions.
7. Go to **Deploy → Manage deployments**.
8. Edit the existing Web App deployment.
9. Select **New version** and deploy it.
10. Keep **Execute as: Me** and **Who has access: Anyone**.

The existing `/exec` URL remains unchanged when the existing deployment is updated.

### 2. Verify Google Sheet tabs

The setup function creates or verifies:

- `Products`
- `Orders`
- `Order Items`

If an existing tab has incompatible columns, it is retained as a timestamped backup before the new structure is created.

### 3. Replace all GitHub files

Extract the ZIP, select all files and folders inside it, and upload them to the root of the GitHub repository. Replace existing files and commit directly to `main`.

After GitHub Pages deploys, open the website in an incognito window or press **Ctrl + F5**.

## Products sheet columns

| Column | Meaning |
|---|---|
| Product Code | Unique product code; mandatory when Order Enabled is Yes |
| SAP Code | SAP product code shown on the website and stored in Order Items |
| Product Name | Customer-facing name |
| Product Photo URL | Relative GitHub asset path or public direct image URL |
| Short Description | Product-card description |
| Detailed Description | Product-page description |
| Base Price | Price before GST |
| GST % | GST rate, for example `18` |
| Price Including GST | Final per-unit customer price used for website totals |
| MRP | Per-unit MRP |
| Bundle Quantity | Units represented by one click/bundle on the order page |
| Minimum Quantity | Minimum total units allowed |
| Unit | Ball, pipe, piece, metre, box, etc. |
| Shipping Included | Yes or No |
| HSN Code | Product HSN code |
| Specifications | Separate points using `|` or new lines |
| Active | Yes to display the product |
| Order Enabled | Yes to allow online ordering |
| Display Order | Numeric catalogue sequence |

Product Code must be unique. If duplicate codes are entered, only the first matching product is allowed for online ordering until the sheet is corrected.

## Order workflow

1. Customer selects one or more products and bundle quantities.
2. Customer enters business, GST, delivery and SDMS details.
3. Optional SDMS portal screenshot may be uploaded.
4. Bank details and total payable are shown.
5. Payment screenshot is required.
6. Apps Script rechecks live product data and saves the order.
7. A unique AIV Order Reference is generated.

Uploaded files are stored in the Google Drive folder `AIV Order Uploads`. The Orders tab stores links to those files.

## Cache behaviour

- Browser cache provides fast catalogue loading for repeat visits.
- Apps Script caches the Products response.
- Editing the Products tab clears the Apps Script cache automatically through `onEdit`.
- The final order is always revalidated against the current Products sheet, so cached display data cannot alter the authoritative order price.

## Product image URLs

Recommended options:

- Relative repository path: `assets/product-image.png`
- Public direct image URL ending in `.jpg`, `.jpeg`, `.png` or `.webp`
- A common Google Drive sharing URL, which the website attempts to convert into a direct image URL

Repository assets or public direct image URLs are the most reliable options.
