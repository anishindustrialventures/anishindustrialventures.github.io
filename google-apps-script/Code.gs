/**
 * AIV dynamic product catalogue and multi-product order receiver.
 *
 * Spreadsheet tabs used:
 *   1. Products
 *   2. Orders
 *   3. Order Items
 *
 * After replacing this file in Apps Script:
 *   - Run setupAivSheets once and authorise it.
 *   - Deploy a new version of the existing Web App deployment.
 */

const AIV_SETTINGS = {
  SPREADSHEET_ID: '15VuBQcjwtp0-GXhf6Y9s_Zpl7s8hZ0IBDF3hYlGwCIM',
  PRODUCTS_SHEET: 'Products',
  ORDERS_SHEET: 'Orders',
  ORDER_ITEMS_SHEET: 'Order Items',
  NOTIFICATION_EMAIL: 'anishindustrialventures@gmail.com',
  TIMEZONE: 'Asia/Kolkata'
};

const PRODUCT_HEADERS = [
  'Product Code',
  'SAP Code',
  'Product Name',
  'Product Photo URL',
  'Short Description',
  'Detailed Description',
  'Base Price',
  'GST %',
  'Price Including GST',
  'MRP',
  'Bundle Quantity',
  'Minimum Quantity',
  'Unit',
  'Shipping Included',
  'HSN Code',
  'Specifications',
  'Active',
  'Order Enabled',
  'Display Order'
];

const ORDER_HEADERS = [
  'Submitted At',
  'Order Reference',
  'Status',
  'Customer / Business Name',
  'Contact Person',
  'Phone',
  'Email',
  'GSTIN',
  'State',
  'Delivery PIN Code',
  'Billing Address',
  'Delivery Address',
  'Purchase Order Reference',
  'Order Notes',
  'Total Payable',
  'Request Token'
];

const ORDER_ITEM_HEADERS = [
  'Order Reference',
  'Product Code',
  'SAP Code',
  'Product Name',
  'Bundle Quantity',
  'Number of Bundles',
  'Total Units',
  'Unit Price Including GST',
  'GST %',
  'Line Total'
];

const DEFAULT_PRODUCTS = [
  [
    'GFO01',
    '0000366966',
    'GFO Automatic Fireball – 400 gm',
    'assets/gfo-automatic-fireball-400g.png',
    'Automatic fire-extinguisher ball designed to activate after contact with flame.',
    'A 400 gm automatic fireball suitable for fire-prone areas, LPG-cylinder locations, vehicles and electrical panels.',
    646.61,
    18,
    763,
    999,
    20,
    20,
    'ball',
    'Yes',
    '84241000',
    'Weight: 400 gm|One box contains 20 balls|Automatic activation within 5–10 seconds|Zero maintenance|5-year shelf life',
    'Yes',
    'Yes',
    1
  ],
  [
    '',
    '',
    'Domestic Suraksha LPG Hose',
    'assets/domestic-suraksha-lpg-hose.png',
    'LERC-approved LPG Suraksha Hose Part 2 for low-pressure domestic and household applications.',
    'Domestic LPG hose designed for low-pressure household use in accordance with IS 9573 Part 2.',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'IS 9573 Part 2|LERC approved|Recommended maximum working pressure: 10 Bar|Minimum burst pressure: 40 Bar',
    'Yes',
    'No',
    2
  ]
];

function setupAivSheets() {
  const spreadsheet = SpreadsheetApp.openById(AIV_SETTINGS.SPREADSHEET_ID);
  const sheets = ensureAllSheets_(spreadsheet);
  formatProductsSheet_(sheets.products);
  formatOrdersSheet_(sheets.orders);
  formatOrderItemsSheet_(sheets.orderItems);
  SpreadsheetApp.flush();
  return 'Products, Orders and Order Items sheets are ready.';
}

function doGet(e) {
  try {
    const action = String(e && e.parameter && e.parameter.action || '').toLowerCase();
    if (action === 'products') {
      const spreadsheet = SpreadsheetApp.openById(AIV_SETTINGS.SPREADSHEET_ID);
      const productsSheet = ensureProductsSheet_(spreadsheet);
      const products = getProductRecords_(productsSheet)
        .filter((product) => isYes_(product['Active']))
        .sort((a, b) => number_(a['Display Order']) - number_(b['Display Order']))
        .map(productForClient_);

      return jsonOrJsonpResponse_({
        ok: true,
        source: 'aiv-product-catalogue',
        products: products,
        updatedAt: new Date().toISOString()
      }, e && e.parameter && e.parameter.callback);
    }

    return ContentService
      .createTextOutput('AIV catalogue and order service is active.')
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    return jsonOrJsonpResponse_({
      ok: false,
      source: 'aiv-product-catalogue',
      error: error.message || 'Product catalogue could not be loaded.'
    }, e && e.parameter && e.parameter.callback);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let requestToken = '';

  try {
    const rawPayload = e && e.parameter ? e.parameter.payload : '';
    if (!rawPayload) throw new Error('Order details were not received.');

    const payload = JSON.parse(rawPayload);
    requestToken = safeCell_(payload.requestToken);
    validateCustomerPayload_(payload);

    const spreadsheet = SpreadsheetApp.openById(AIV_SETTINGS.SPREADSHEET_ID);
    const sheets = ensureAllSheets_(spreadsheet);

    const duplicate = findByRequestToken_(sheets.orders, payload.requestToken);
    if (duplicate) {
      return htmlResponse_({
        ok: true,
        source: 'aiv-order-receiver',
        requestToken: payload.requestToken,
        orderId: duplicate.orderId,
        total: duplicate.total,
        duplicate: true
      });
    }

    const products = getProductRecords_(sheets.products);
    const productMap = {};
    products.forEach((product) => {
      const code = String(product['Product Code'] || '').trim().toUpperCase();
      if (code) productMap[code] = product;
    });

    const authoritativeItems = validateAndPriceItems_(payload.items, productMap);
    const totalPayable = roundMoney_(authoritativeItems.reduce((sum, item) => sum + item.lineTotal, 0));
    const orderId = generateOrderId_();
    const customer = payload.customer || {};

    sheets.orders.appendRow([
      new Date(),
      orderId,
      'PAYMENT_PENDING',
      safeCell_(customer.businessName),
      safeCell_(customer.contactPerson),
      safeCell_(customer.phone),
      safeCell_(customer.email),
      safeCell_(String(customer.gstin || '').toUpperCase()),
      safeCell_(customer.state),
      safeCell_(customer.pincode),
      safeCell_(customer.billingAddress),
      safeCell_(customer.deliveryAddress),
      safeCell_(customer.purchaseOrderReference),
      safeCell_(customer.notes),
      totalPayable,
      safeCell_(payload.requestToken)
    ]);

    const itemRows = authoritativeItems.map((item) => [
      orderId,
      safeCell_(item.productCode),
      safeCell_(item.sapCode),
      safeCell_(item.productName),
      item.bundleQuantity,
      item.bundles,
      item.totalUnits,
      item.unitPriceInclGst,
      item.gstRate,
      item.lineTotal
    ]);
    const firstItemRow = sheets.orderItems.getLastRow() + 1;
    sheets.orderItems.getRange(firstItemRow, 1, itemRows.length, ORDER_ITEM_HEADERS.length).setValues(itemRows);

    formatLastOrderRow_(sheets.orders);
    formatOrderItemRows_(sheets.orderItems, firstItemRow, itemRows.length);
    sendNotification_(orderId, payload, authoritativeItems, totalPayable);

    return htmlResponse_({
      ok: true,
      source: 'aiv-order-receiver',
      requestToken: payload.requestToken,
      orderId: orderId,
      total: totalPayable,
      itemCount: authoritativeItems.length
    });
  } catch (error) {
    console.error(error);
    return htmlResponse_({
      ok: false,
      source: 'aiv-order-receiver',
      requestToken: requestToken,
      error: error.message || 'The order could not be recorded.'
    });
  } finally {
    lock.releaseLock();
  }
}

function ensureAllSheets_(spreadsheet) {
  return {
    products: ensureProductsSheet_(spreadsheet),
    orders: ensureStructuredSheet_(spreadsheet, AIV_SETTINGS.ORDERS_SHEET, ORDER_HEADERS),
    orderItems: ensureStructuredSheet_(spreadsheet, AIV_SETTINGS.ORDER_ITEMS_SHEET, ORDER_ITEM_HEADERS)
  };
}

function ensureProductsSheet_(spreadsheet) {
  const sheet = ensureStructuredSheet_(spreadsheet, AIV_SETTINGS.PRODUCTS_SHEET, PRODUCT_HEADERS);
  if (sheet.getLastRow() === 1) {
    sheet.getRange(2, 1, DEFAULT_PRODUCTS.length, PRODUCT_HEADERS.length).setValues(DEFAULT_PRODUCTS);
    sheet.getRange(2, 1, DEFAULT_PRODUCTS.length, 2).setNumberFormat('@');
    formatProductsSheet_(sheet);
  }
  return sheet;
}

function ensureStructuredSheet_(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);

  if (sheet.getLastRow() === 0) {
    initialiseHeader_(sheet, headers);
    return sheet;
  }

  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getDisplayValues()[0];
  const matches = headers.every((header, index) => currentHeaders[index] === header);
  if (matches) return sheet;

  const backupName = uniqueBackupName_(spreadsheet, sheetName);
  sheet.setName(backupName);
  sheet = spreadsheet.insertSheet(sheetName);
  initialiseHeader_(sheet, headers);
  return sheet;
}

function initialiseHeader_(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#061B34')
    .setFontColor('#FFFFFF')
    .setWrap(true);
}

function uniqueBackupName_(spreadsheet, baseName) {
  const timestamp = Utilities.formatDate(new Date(), AIV_SETTINGS.TIMEZONE, 'yyyyMMdd-HHmmss');
  let name = `${baseName} Backup ${timestamp}`.slice(0, 99);
  let suffix = 2;
  while (spreadsheet.getSheetByName(name)) {
    name = `${baseName} Backup ${timestamp}-${suffix}`.slice(0, 99);
    suffix += 1;
  }
  return name;
}

function getProductRecords_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, PRODUCT_HEADERS.length).getValues();
  const displays = sheet.getRange(2, 1, lastRow - 1, PRODUCT_HEADERS.length).getDisplayValues();
  const textColumns = ['Product Code', 'SAP Code', 'Product Photo URL', 'HSN Code'];

  return values.map((row, rowIndex) => {
    const record = {};
    PRODUCT_HEADERS.forEach((header, columnIndex) => {
      record[header] = textColumns.indexOf(header) >= 0 ? displays[rowIndex][columnIndex] : row[columnIndex];
    });
    return record;
  }).filter((record) => String(record['Product Name'] || '').trim());
}

function productForClient_(product) {
  return {
    productCode: String(product['Product Code'] || '').trim(),
    sapCode: String(product['SAP Code'] || '').trim(),
    name: String(product['Product Name'] || '').trim(),
    image: String(product['Product Photo URL'] || '').trim(),
    summary: String(product['Short Description'] || '').trim(),
    description: String(product['Detailed Description'] || '').trim(),
    basePrice: number_(product['Base Price']),
    gstRate: number_(product['GST %']),
    priceInclGst: number_(product['Price Including GST']),
    mrp: number_(product['MRP']),
    bundleQuantity: number_(product['Bundle Quantity']),
    minimumQuantity: number_(product['Minimum Quantity']),
    unit: String(product['Unit'] || '').trim(),
    shippingIncluded: isYes_(product['Shipping Included']),
    hsnCode: String(product['HSN Code'] || '').trim(),
    specifications: String(product['Specifications'] || '').trim(),
    active: isYes_(product['Active']),
    orderEnabled: isYes_(product['Order Enabled']),
    displayOrder: number_(product['Display Order'])
  };
}

function validateAndPriceItems_(items, productMap) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) {
    throw new Error('Select at least one valid product.');
  }

  const seen = {};
  return items.map((requestedItem) => {
    const productCode = String(requestedItem && requestedItem.productCode || '').trim().toUpperCase();
    if (!productCode || seen[productCode]) throw new Error('Duplicate or missing product code in the order.');
    seen[productCode] = true;

    const product = productMap[productCode];
    if (!product || !isYes_(product['Active']) || !isYes_(product['Order Enabled'])) {
      throw new Error(`Product ${productCode} is not currently available for online ordering.`);
    }

    const bundles = Number(requestedItem.bundles);
    const bundleQuantity = number_(product['Bundle Quantity']);
    const minimumQuantity = number_(product['Minimum Quantity']);
    const unitPriceInclGst = number_(product['Price Including GST']);
    if (!Number.isInteger(bundles) || bundles < 1 || bundles > 999) {
      throw new Error(`Invalid bundle quantity for ${productCode}.`);
    }
    if (bundleQuantity <= 0 || minimumQuantity <= 0 || unitPriceInclGst <= 0) {
      throw new Error(`Commercial details are incomplete for ${productCode}.`);
    }

    const minimumBundles = Math.max(1, Math.ceil(minimumQuantity / bundleQuantity));
    if (bundles < minimumBundles) {
      throw new Error(`Minimum order for ${productCode} is ${minimumQuantity} units.`);
    }

    const totalUnits = bundles * bundleQuantity;
    return {
      productCode: productCode,
      sapCode: String(product['SAP Code'] || '').trim(),
      productName: String(product['Product Name'] || '').trim(),
      bundleQuantity: bundleQuantity,
      bundles: bundles,
      totalUnits: totalUnits,
      unitPriceInclGst: unitPriceInclGst,
      gstRate: number_(product['GST %']),
      lineTotal: roundMoney_(totalUnits * unitPriceInclGst)
    };
  });
}

function validateCustomerPayload_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid order details.');
  if (!payload.requestToken) throw new Error('Request token is missing.');

  const customer = payload.customer || {};
  const required = ['businessName', 'contactPerson', 'phone', 'email', 'gstin', 'state', 'billingAddress', 'deliveryAddress', 'pincode'];
  required.forEach((field) => {
    if (!String(customer[field] || '').trim()) throw new Error(`Missing customer field: ${field}.`);
  });

  if (!/^[6-9][0-9]{9}$/.test(String(customer.phone).replace(/\D/g, ''))) {
    throw new Error('Invalid Indian mobile number.');
  }
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(String(customer.gstin).trim().toUpperCase())) {
    throw new Error('Invalid customer GSTIN.');
  }
  if (!/^[0-9]{6}$/.test(String(customer.pincode).trim())) {
    throw new Error('Invalid delivery PIN code.');
  }
}

function findByRequestToken_(sheet, requestToken) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || !requestToken) return null;
  const tokenColumn = ORDER_HEADERS.indexOf('Request Token') + 1;
  const orderColumn = ORDER_HEADERS.indexOf('Order Reference') + 1;
  const totalColumn = ORDER_HEADERS.indexOf('Total Payable') + 1;
  const tokens = sheet.getRange(2, tokenColumn, lastRow - 1, 1).getDisplayValues();

  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index][0] === String(requestToken)) {
      const row = index + 2;
      return {
        orderId: sheet.getRange(row, orderColumn).getDisplayValue(),
        total: Number(sheet.getRange(row, totalColumn).getValue())
      };
    }
  }
  return null;
}

function generateOrderId_() {
  const date = Utilities.formatDate(new Date(), AIV_SETTINGS.TIMEZONE, 'yyyyMMdd');
  const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `AIV-${date}-${suffix}`;
}

function formatProductsSheet_(sheet) {
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, 1, rows, 2).setNumberFormat('@');
  ['Base Price', 'Price Including GST', 'MRP'].forEach((header) => {
    sheet.getRange(2, PRODUCT_HEADERS.indexOf(header) + 1, rows, 1).setNumberFormat('₹#,##0.00');
  });
  sheet.getRange(2, PRODUCT_HEADERS.indexOf('GST %') + 1, rows, 1).setNumberFormat('0.##');
  sheet.autoResizeColumns(1, PRODUCT_HEADERS.length);
  sheet.setColumnWidth(PRODUCT_HEADERS.indexOf('Product Name') + 1, 250);
  sheet.setColumnWidth(PRODUCT_HEADERS.indexOf('Product Photo URL') + 1, 270);
  sheet.setColumnWidth(PRODUCT_HEADERS.indexOf('Specifications') + 1, 350);
}

function formatOrdersSheet_(sheet) {
  sheet.autoResizeColumns(1, ORDER_HEADERS.length);
  sheet.setColumnWidth(ORDER_HEADERS.indexOf('Billing Address') + 1, 280);
  sheet.setColumnWidth(ORDER_HEADERS.indexOf('Delivery Address') + 1, 280);
}

function formatOrderItemsSheet_(sheet) {
  const rows = Math.max(sheet.getMaxRows() - 1, 1);
  sheet.getRange(2, ORDER_ITEM_HEADERS.indexOf('Product Code') + 1, rows, 2).setNumberFormat('@');
  sheet.autoResizeColumns(1, ORDER_ITEM_HEADERS.length);
}

function formatLastOrderRow_(sheet) {
  const row = sheet.getLastRow();
  sheet.getRange(row, 1).setNumberFormat('dd-mmm-yyyy hh:mm:ss');
  sheet.getRange(row, ORDER_HEADERS.indexOf('Total Payable') + 1).setNumberFormat('₹#,##0.00');
  sheet.setRowHeight(row, 34);
}

function formatOrderItemRows_(sheet, firstRow, numberOfRows) {
  sheet.getRange(firstRow, ORDER_ITEM_HEADERS.indexOf('Product Code') + 1, numberOfRows, 2).setNumberFormat('@');
  sheet.getRange(firstRow, ORDER_ITEM_HEADERS.indexOf('Unit Price Including GST') + 1, numberOfRows, 1).setNumberFormat('₹#,##0.00');
  sheet.getRange(firstRow, ORDER_ITEM_HEADERS.indexOf('Line Total') + 1, numberOfRows, 1).setNumberFormat('₹#,##0.00');
}

function sendNotification_(orderId, payload, items, totalPayable) {
  const customer = payload.customer || {};
  const itemLines = items.map((item) =>
    `${item.productName} (${item.productCode}${item.sapCode ? ` / SAP ${item.sapCode}` : ''}): ${item.bundles} bundle(s), ${item.totalUnits} units, ₹${item.lineTotal.toFixed(2)}`
  );

  const body = [
    `New AIV order: ${orderId}`,
    '',
    ...itemLines,
    '',
    `Total payable: ₹${Number(totalPayable).toFixed(2)}`,
    '',
    `Business / Customer: ${customer.businessName}`,
    `Contact: ${customer.contactPerson}`,
    `Phone: ${customer.phone}`,
    `Email: ${customer.email}`,
    `GSTIN: ${customer.gstin}`,
    `Delivery address: ${customer.deliveryAddress}, ${customer.state} - ${customer.pincode}`,
    '',
    'Status: Payment pending.'
  ].join('\n');

  MailApp.sendEmail({
    to: AIV_SETTINGS.NOTIFICATION_EMAIL,
    subject: `AIV Order ${orderId}`,
    body: body
  });
}

function jsonOrJsonpResponse_(data, requestedCallback) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const callback = safeCallback_(requestedCallback);
  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${json});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

function htmlResponse_(result) {
  const data = JSON.stringify(result).replace(/</g, '\\u003c');
  const html = `<!doctype html><html><head><base target="_top"></head><body><script>
    (function () {
      const message = ${data};
      try { window.top.postMessage(message, '*'); } catch (error) {}
      try { window.parent.postMessage(message, '*'); } catch (error) {}
    })();
  <\/script></body></html>`;
  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function safeCallback_(value) {
  const callback = String(value || '').trim();
  return /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback) ? callback : '';
}

function isYes_(value) {
  if (value === true) return true;
  return ['yes', 'true', '1', 'active', 'enabled'].indexOf(String(value || '').trim().toLowerCase()) >= 0;
}

function number_(value) {
  const number = Number(String(value == null ? '' : value).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : 0;
}

function roundMoney_(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function safeCell_(value) {
  const text = value == null ? '' : String(value).trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}
