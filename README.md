# Anish Industrial Ventures Website

Customer-facing AIV website hosted through GitHub Pages, with products loaded dynamically from Google Sheets and confirmed orders stored in separate order-level and item-level tabs.

## Main changes in this version

- Correct HDFC account number: `50200121908336`
- MICR removed from all customer-facing pages
- Products are loaded from the `Products` Google Sheet tab
- Product Code and SAP Code are displayed on the website when entered
- Multiple products can be selected in one order
- Orders are stored using a compact `Orders` tab
- Product lines are stored separately in `Order Items`
- Prices and bundle rules are revalidated by Apps Script before saving

## Required deployment order

### 1. Update Apps Script first

1. Open the AIV Google Sheet.
2. Go to **Extensions → Apps Script**.
3. Replace all existing code with `google-apps-script/Code.gs`.
4. Save the project.
5. Select the function `setupAivSheets` and click **Run** once.
6. Approve the requested permissions.
7. Go to **Deploy → Manage deployments**.
8. Edit the existing Web App deployment.
9. Select **New version** and deploy it.
10. Keep **Execute as: Me** and **Who has access: Anyone**.

The existing `/exec` URL can remain unchanged when the existing deployment is updated.

### 2. Verify the Google Sheet tabs

The setup function creates:

- `Products`
- `Orders`
- `Order Items`

If an old `Orders` tab has incompatible columns, the script preserves it by renaming it as an `Orders Backup ...` tab before creating the new structure.

### 3. Review the Products tab before customer use

The script adds two initial products:

1. **GFO Automatic Fireball – 400 gm**
2. **Domestic Suraksha LPG Hose**

The Fireball row is initially enabled for online ordering. Its default row treats ₹763 as the final GST-inclusive selling price at 18% GST. Verify this commercial treatment and edit the row if required.

The LPG Hose is visible in the catalogue but online ordering is disabled until Product Code, SAP Code, price, GST, bundle quantity and minimum quantity are completed.

### 4. Replace all GitHub files

Extract the supplied ZIP, open the inner repository folder, select all files and folders, and upload them to the root of the GitHub repository. Commit directly to `main`.

## Products sheet columns

| Column | Meaning |
|---|---|
| Product Code | Unique customer-facing product code; mandatory when Order Enabled is Yes |
| SAP Code | SAP product code shown on website and stored in orders |
| Product Name | Customer-facing product name |
| Product Photo URL | Relative GitHub asset path or public image URL |
| Short Description | Product-card description |
| Detailed Description | Full product-page description |
| Base Price | Price before GST |
| GST % | GST rate as a number, for example `18` |
| Price Including GST | Final per-unit customer price used for website calculations |
| MRP | Per-unit MRP |
| Bundle Quantity | Units in one selectable bundle |
| Minimum Quantity | Minimum total units allowed |
| Unit | Ball, piece, metre, box, etc. |
| Shipping Included | Yes or No |
| HSN Code | Product HSN code |
| Specifications | Separate specifications with `|` or new lines |
| Active | Yes to display the product |
| Order Enabled | Yes to allow online ordering |
| Display Order | Numeric product sequence |

## Order data structure

### Orders

One row per confirmed order containing customer details, total payable, status and the order reference.

### Order Items

One row per product selected in the order containing Product Code, SAP Code, bundles, total units, GST-inclusive unit price and line total.

## Image URLs

You may use:

- A relative GitHub path such as `assets/product-image.png`
- A public direct image URL
- A common Google Drive sharing URL; the website attempts to convert it to a direct view URL

For the most reliable display, use a public direct image URL or upload the image into the repository `assets` folder.
