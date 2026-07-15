/**
 * AIV Order Receiver
 *
 * Deploy this script as a Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 * Then paste the /exec URL into js/site-config.js -> order.endpoint.
 */
const AIV_SETTINGS = {
  SPREADSHEET_ID: '15VuBQcjwtp0-GXhf6Y9s_Zpl7s8hZ0IBDF3hYlGwCIM',
  SHEET_NAME: 'Orders',
  NOTIFICATION_EMAIL: 'anishindustrialventures@gmail.com',
  SELLER_GSTIN: '03AGRPG5512C1ZV',
  SELLER_UDYAM: 'UDYAM-PB-19-0073269',
  PRODUCT_ID: 'brand-daddy-fireball',
  PRODUCT_NAME: 'Brand Daddy Fireball',
  BUNDLE_SIZE: 36,
  UNIT_PRICE: 603,
  UNIT_MRP: 999,
  GST_RATE: 0.18
};

const HEADERS = [
  'Submitted At',
  'Order Reference',
  'Status',
  'Product',
  'Bundle Quantity',
  'Balls per Bundle',
  'Total Fireballs',
  'MRP per Fireball',
  'Selling Price per Fireball',
  'GST',
  'Shipping',
  'Total Payable',
  'Business / Customer Name',
  'Contact Person',
  'Phone',
  'Email',
  'Customer GSTIN',
  'State',
  'Billing Address',
  'Delivery Address',
  'PIN Code',
  'Purchase Order Reference',
  'Order Notes',
  'Seller GSTIN',
  'Seller Udyam',
  'Request Token',
  'Payload Version'
];

function doGet() {
  return ContentService
    .createTextOutput('AIV order receiver is active.')
    .setMimeType(ContentService.MimeType.TEXT);
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
    validatePayload_(payload);

    const spreadsheet = SpreadsheetApp.openById(AIV_SETTINGS.SPREADSHEET_ID);
    const sheet = getOrCreateSheet_(spreadsheet);

    const duplicate = findByRequestToken_(sheet, payload.requestToken);
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

    const bundleQuantity = Number(payload.bundleQuantity);
    const totalPieces = bundleQuantity * AIV_SETTINGS.BUNDLE_SIZE;
    const totalPayable = totalPieces * AIV_SETTINGS.UNIT_PRICE;
    const orderId = generateOrderId_();
    const customer = payload.customer || {};

    sheet.appendRow([
      new Date(),
      orderId,
      'ORDER_RECEIVED_PAYMENT_PENDING',
      AIV_SETTINGS.PRODUCT_NAME,
      bundleQuantity,
      AIV_SETTINGS.BUNDLE_SIZE,
      totalPieces,
      AIV_SETTINGS.UNIT_MRP,
      AIV_SETTINGS.UNIT_PRICE,
      '18% included',
      'Included',
      totalPayable,
      safeCell_(customer.businessName),
      safeCell_(customer.contactPerson),
      safeCell_(customer.phone),
      safeCell_(customer.email),
      safeCell_(String(customer.gstin || '').toUpperCase()),
      safeCell_(customer.state),
      safeCell_(customer.billingAddress),
      safeCell_(customer.deliveryAddress),
      safeCell_(customer.pincode),
      safeCell_(customer.purchaseOrderReference),
      safeCell_(customer.notes),
      AIV_SETTINGS.SELLER_GSTIN,
      AIV_SETTINGS.SELLER_UDYAM,
      safeCell_(payload.requestToken),
      Number(payload.version || 2)
    ]);

    formatLastRow_(sheet);
    sendNotification_(orderId, payload, totalPieces, totalPayable);

    return htmlResponse_({
      ok: true,
      source: 'aiv-order-receiver',
      requestToken: payload.requestToken,
      orderId: orderId,
      total: totalPayable
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

function getOrCreateSheet_(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(AIV_SETTINGS.SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(AIV_SETTINGS.SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#061B34')
      .setFontColor('#FFFFFF');
    sheet.autoResizeColumns(1, HEADERS.length);
  }
  return sheet;
}

function findByRequestToken_(sheet, requestToken) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2 || !requestToken) return null;
  const tokenColumn = HEADERS.indexOf('Request Token') + 1;
  const orderColumn = HEADERS.indexOf('Order Reference') + 1;
  const totalColumn = HEADERS.indexOf('Total Payable') + 1;
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

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid order details.');
  if (!payload.requestToken) throw new Error('Request token is missing.');
  if (payload.productId !== AIV_SETTINGS.PRODUCT_ID) throw new Error('Invalid product selected.');

  const bundles = Number(payload.bundleQuantity);
  if (!Number.isInteger(bundles) || bundles < 1 || bundles > 999) {
    throw new Error('Bundle quantity must be between 1 and 999.');
  }

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

function generateOrderId_() {
  const timezone = Session.getScriptTimeZone() || 'Asia/Kolkata';
  const date = Utilities.formatDate(new Date(), timezone, 'yyyyMMdd');
  const suffix = Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  return `AIV-${date}-${suffix}`;
}

function formatLastRow_(sheet) {
  const row = sheet.getLastRow();
  const totalColumn = HEADERS.indexOf('Total Payable') + 1;
  const mrpColumn = HEADERS.indexOf('MRP per Fireball') + 1;
  const priceColumn = HEADERS.indexOf('Selling Price per Fireball') + 1;
  sheet.getRange(row, 1).setNumberFormat('dd-mmm-yyyy hh:mm:ss');
  sheet.getRange(row, mrpColumn).setNumberFormat('₹#,##0.00');
  sheet.getRange(row, priceColumn).setNumberFormat('₹#,##0.00');
  sheet.getRange(row, totalColumn).setNumberFormat('₹#,##0.00');
  sheet.setRowHeight(row, 34);
}

function sendNotification_(orderId, payload, totalPieces, totalPayable) {
  const customer = payload.customer || {};
  const body = [
    `New AIV order: ${orderId}`,
    '',
    `Product: ${AIV_SETTINGS.PRODUCT_NAME}`,
    `Bundles: ${payload.bundleQuantity}`,
    `Total Fireballs: ${totalPieces}`,
    `Total payable: ₹${Number(totalPayable).toFixed(2)}`,
    'GST: 18% included',
    'Shipping: Included',
    '',
    `Business / Customer: ${customer.businessName}`,
    `Contact: ${customer.contactPerson}`,
    `Phone: ${customer.phone}`,
    `Email: ${customer.email}`,
    `GSTIN: ${customer.gstin}`,
    `Delivery address: ${customer.deliveryAddress}, ${customer.state} - ${customer.pincode}`,
    '',
    'Status: Order received; payment verification pending.'
  ].join('\n');

  MailApp.sendEmail({
    to: AIV_SETTINGS.NOTIFICATION_EMAIL,
    subject: `AIV Order ${orderId}`,
    body: body
  });
}

function safeCell_(value) {
  const text = value == null ? '' : String(value).trim();
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function htmlResponse_(result) {
  const data = JSON.stringify(result).replace(/</g, '\\u003c');
  const html = `<!doctype html><html><body><script>
    window.parent.postMessage(${data}, '*');
  <\/script></body></html>`;
  return HtmlService
    .createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
