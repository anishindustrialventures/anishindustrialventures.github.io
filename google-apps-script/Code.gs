/**
 * AIV Free Order Receiver — Google Apps Script
 *
 * 1. Create a Google Sheet and copy its spreadsheet ID.
 * 2. Optionally create a Google Drive folder for payment screenshots.
 * 3. Replace the three constants below.
 * 4. Deploy as a Web App: execute as yourself and allow anyone with the link.
 * 5. Paste the Web App URL into js/site-config.js -> order.endpoint.
 */
const AIV_SETTINGS = {
  SPREADSHEET_ID: 'PASTE_GOOGLE_SHEET_ID_HERE',
  SHEET_NAME: 'Orders',
  SCREENSHOT_FOLDER_ID: 'PASTE_DRIVE_FOLDER_ID_HERE',
  NOTIFICATION_EMAIL: 'PASTE_OWNER_EMAIL_HERE'
};

const HEADERS = [
  'Submitted At',
  'Order ID',
  'Status',
  'Business Name',
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
  'Line Items',
  'Total Sets',
  'Total Pieces',
  'Taxable Value',
  'GST',
  'Total Inclusive of GST',
  'Payer Name',
  'Payment Date',
  'UTR / Transaction Reference',
  'Screenshot URL',
  'Seller GSTIN',
  'Payload Version'
];

function doGet() {
  return jsonResponse_({ ok: true, service: 'AIV order receiver' });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Empty request body.');
    }

    const payload = JSON.parse(e.postData.contents);
    validatePayload_(payload);

    const spreadsheet = SpreadsheetApp.openById(AIV_SETTINGS.SPREADSHEET_ID);
    const sheet = getOrCreateSheet_(spreadsheet);

    if (orderExists_(sheet, payload.orderId)) {
      return jsonResponse_({ ok: true, duplicate: true, orderId: payload.orderId });
    }

    const screenshotUrl = saveScreenshot_(payload);
    const items = Array.isArray(payload.lineItems) ? payload.lineItems : [];
    const totalSets = items.reduce((sum, item) => sum + Number(item.sets || 0), 0);
    const lineItemText = items
      .map((item) => `${item.label}: ${item.sets} set(s), ${item.pieces} piece(s), ₹${Number(item.amount || 0).toFixed(2)}`)
      .join(' | ');

    const customer = payload.customer || {};
    const totals = payload.totals || {};
    const payment = payload.payment || {};

    sheet.appendRow([
      payload.submittedAt || new Date().toISOString(),
      safeCell_(payload.orderId),
      safeCell_(payload.status || 'PAYMENT_VERIFICATION_PENDING'),
      safeCell_(customer.businessName),
      safeCell_(customer.contactPerson),
      safeCell_(customer.phone),
      safeCell_(customer.email),
      safeCell_(customer.gstin),
      safeCell_(customer.state),
      safeCell_(customer.billingAddress),
      safeCell_(customer.deliveryAddress),
      safeCell_(customer.pincode),
      safeCell_(customer.purchaseOrderReference),
      safeCell_(customer.notes),
      safeCell_(lineItemText),
      totalSets,
      Number(totals.pieces || 0),
      Number(totals.taxable || 0),
      Number(totals.gst || 0),
      Number(totals.inclusiveTotal || 0),
      safeCell_(payment.payerName),
      safeCell_(payment.paymentDate),
      safeCell_(payment.utr),
      screenshotUrl,
      safeCell_(payload.sellerGstin),
      Number(payload.version || 1)
    ]);

    sendNotification_(payload, screenshotUrl);
    return jsonResponse_({ ok: true, orderId: payload.orderId });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ ok: false, error: error.message });
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
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}

function orderExists_(sheet, orderId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const values = sheet.getRange(2, 2, lastRow - 1, 1).getDisplayValues().flat();
  return values.includes(String(orderId));
}

function saveScreenshot_(payload) {
  const screenshot = payload.paymentScreenshot;
  if (!screenshot || !screenshot.base64) return '';
  if (!AIV_SETTINGS.SCREENSHOT_FOLDER_ID || AIV_SETTINGS.SCREENSHOT_FOLDER_ID.includes('PASTE_')) return '';

  const bytes = Utilities.base64Decode(screenshot.base64);
  const fileName = `${payload.orderId}-${String(screenshot.name || 'payment-proof').replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const blob = Utilities.newBlob(bytes, screenshot.mimeType || 'image/jpeg', fileName);
  const folder = DriveApp.getFolderById(AIV_SETTINGS.SCREENSHOT_FOLDER_ID);
  return folder.createFile(blob).getUrl();
}

function sendNotification_(payload, screenshotUrl) {
  const email = AIV_SETTINGS.NOTIFICATION_EMAIL;
  if (!email || email.includes('PASTE_')) return;

  const totals = payload.totals || {};
  const customer = payload.customer || {};
  const payment = payload.payment || {};
  const lines = (payload.lineItems || []).map((item) =>
    `- ${item.label} × ${item.sets} = ${item.pieces} pieces (₹${Number(item.amount || 0).toFixed(2)})`
  );

  const body = [
    `New AIV order submitted: ${payload.orderId}`,
    '',
    `Status: ${payload.status}`,
    `Business: ${customer.businessName || ''}`,
    `Contact: ${customer.contactPerson || ''} | ${customer.phone || ''}`,
    `GSTIN: ${customer.gstin || ''}`,
    '',
    'Items:',
    ...lines,
    '',
    `Total pieces: ${totals.pieces || 0}`,
    `Total inclusive of GST: ₹${Number(totals.inclusiveTotal || 0).toFixed(2)}`,
    `UTR: ${payment.utr || ''}`,
    `Screenshot: ${screenshotUrl || 'Not saved'}`,
    '',
    'Verify the bank receipt before confirming the order.'
  ].join('\n');

  MailApp.sendEmail({
    to: email,
    subject: `AIV Order ${payload.orderId} — Payment Verification Pending`,
    body: body
  });
}

function validatePayload_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid JSON payload.');
  if (!payload.orderId) throw new Error('Order ID is required.');
  if (!payload.customer || !payload.customer.businessName || !payload.customer.phone) {
    throw new Error('Customer details are incomplete.');
  }
  if (!Array.isArray(payload.lineItems) || payload.lineItems.length === 0) {
    throw new Error('At least one line item is required.');
  }
  if (!payload.payment || !payload.payment.utr) throw new Error('UTR is required.');
}

function safeCell_(value) {
  const text = value == null ? '' : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function jsonResponse_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
