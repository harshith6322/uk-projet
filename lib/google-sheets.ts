import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

let cachedDoc: GoogleSpreadsheet | null = null;

export async function getDoc() {
  if (cachedDoc) return cachedDoc;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const sheetId = process.env.GOOGLE_SPREADSHEET_ID;

  if (!email || !key || !sheetId) {
    throw new Error('Google Sheets credentials not configured in .env');
  }

  const serviceAccountAuth = new JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const doc = new GoogleSpreadsheet(sheetId, serviceAccountAuth);
  await doc.loadInfo();
  cachedDoc = doc;
  return doc;
}

export async function getProducts() {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle['Products'];
  if (!sheet) return [];
  const rows = await sheet.getRows();
  return rows.map(r => ({
    id: Number(r.get('ID')),
    name: r.get('Name'),
    emoji: r.get('Emoji'),
    description: r.get('Description'),
    price: Number(r.get('Price')),
    unit: r.get('Unit'),
    stock: Number(r.get('Stock')),
    maxPerOrder: Number(r.get('MaxPerOrder')) || 99,
    active: r.get('Active') === 'TRUE' || r.get('Active') === 'true' || r.get('Active') === true
  }));
}

export async function getOrders() {
  const doc = await getDoc();
  const sheet = doc.sheetsByTitle['Orders'];
  if (!sheet) return [];
  const rows = await sheet.getRows();
  return rows.map(r => ({
    id: r.get('Order ID'),
    orderNumber: r.get('Order ID'),
    orderId: r.get('Order ID'),
    createdAt: r.get('Date'),
    date: r.get('Date'),
    name: r.get('Name'),
    email: r.get('Email'),
    phone: r.get('Phone'),
    items: JSON.parse(r.get('Items') || '[]'),
    totalAmount: Number(r.get('Total')),
    total: Number(r.get('Total')),
    status: r.get('Status')
  })).reverse();
}

export async function verifyPassword(password: string) {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Settings'];
    if (!sheet) return false;
    
    // Load the first 10 rows to be safe
    await sheet.loadCells('A1:B10');
    
    for (let i = 0; i < 10; i++) {
      const field = String(sheet.getCell(i, 0).value || '').trim();
      if (field === 'AdminPassword') {
        const correctPass = String(sheet.getCell(i, 1).value || '').trim();
        return password === correctPass;
      }
    }
    return false;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function getMaxOtpAttempts() {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Settings'];
    if (!sheet) return 3; // Default to 3
    
    await sheet.loadCells('A1:B10');
    
    for (let i = 0; i < 10; i++) {
      const field = String(sheet.getCell(i, 0).value || '').trim();
      if (field === 'MaxOtpAttempts') {
        const val = parseInt(String(sheet.getCell(i, 1).value || '').trim());
        return isNaN(val) ? 3 : val;
      }
    }
    return 3;
  } catch (e) {
    console.error(e);
    return 3;
  }
}

export async function logAudit(action: string, ip: string, details: string) {
  try {
    const doc = await getDoc();
    let sheet = doc.sheetsByTitle['AuditLogs'];
    if (!sheet) {
      sheet = await doc.addSheet({ headerValues: ['Timestamp', 'IP', 'Action', 'Details'], title: 'AuditLogs' });
    }
    await sheet.addRow({
      Timestamp: new Date().toISOString(),
      IP: ip,
      Action: action,
      Details: details
    });
  } catch (e) {
    console.error("Failed to log audit", e);
  }
}

export async function getAuditLogs() {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['AuditLogs'];
    if (!sheet) return [];
    const rows = await sheet.getRows();
    return rows.map(r => ({
      timestamp: r.get('Timestamp'),
      ip: r.get('IP'),
      action: r.get('Action'),
      details: r.get('Details')
    })).reverse();
  } catch (e) {
    console.error("Failed to fetch audit logs", e);
    return [];
  }
}

export async function getAllSettings() {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Settings'];
    if (!sheet) return {};
    
    const rowsToLoad = Math.min(sheet.rowCount, 50);
    await sheet.loadCells(`A1:B${rowsToLoad}`);
    
    const settings: Record<string, string> = {};
    for (let i = 0; i < rowsToLoad; i++) {
      const key = String(sheet.getCell(i, 0).value || '').trim();
      const val = String(sheet.getCell(i, 1).value || '').trim();
      if (key) settings[key] = val;
    }
    return settings;
  } catch (e) {
    console.error("getAllSettings error:", e);
    return {};
  }
}

export async function getSetting(key: string, defaultVal: string = '') {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Settings'];
    if (!sheet) return defaultVal;
    
    const rowsToLoad = Math.min(sheet.rowCount, 50);
    await sheet.loadCells(`A1:B${rowsToLoad}`);
    
    for (let i = 0; i < rowsToLoad; i++) {
      const field = String(sheet.getCell(i, 0).value || '').trim();
      if (field === key) {
        return String(sheet.getCell(i, 1).value || '').trim();
      }
    }
    return defaultVal;
  } catch (e) {
    console.error("getSetting error:", e);
    return defaultVal;
  }
}

export async function setSetting(key: string, value: string) {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Settings'];
    if (!sheet) return;
    
    if (sheet.rowCount < 20) {
      await sheet.resize({ rowCount: 20, columnCount: Math.max(sheet.columnCount, 2) });
    }
    
    const rowsToLoad = Math.min(sheet.rowCount, 50);
    await sheet.loadCells(`A1:B${rowsToLoad}`);
    
    let found = false;
    for (let i = 0; i < rowsToLoad; i++) {
      const field = String(sheet.getCell(i, 0).value || '').trim();
      if (field === key) {
        sheet.getCell(i, 1).value = value;
        found = true;
        break;
      }
      if (field === '') { // empty row
        sheet.getCell(i, 0).value = key;
        sheet.getCell(i, 1).value = value;
        found = true;
        break;
      }
    }
    if (found) await sheet.saveUpdatedCells();
  } catch (e) {
    console.error("setSetting error:", e);
  }
}

export async function logFeedback(orderId: string, type: string, rating: number, comments: string, productsRated: string = '{}') {
  try {
    const doc = await getDoc();
    let sheet = doc.sheetsByTitle['FeedbackLogs'];
    if (!sheet) {
      sheet = await doc.addSheet({ headerValues: ['Timestamp', 'Order ID', 'Type', 'Rating', 'Comments', 'Product Ratings'], title: 'FeedbackLogs' });
    }
    await sheet.addRow({
      Timestamp: new Date().toISOString(),
      'Order ID': orderId,
      Type: type,
      Rating: rating.toString(),
      Comments: comments,
      'Product Ratings': productsRated
    });
  } catch (e) {
    console.error("Failed to log feedback", e);
  }
}

export async function hasFeedbackForOrder(orderId: string, type: string) {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['FeedbackLogs'];
    if (!sheet) return false;
    
    const rows = await sheet.getRows();
    return rows.some(r => r.get('Order ID') === orderId && r.get('Type') === type);
  } catch (e) {
    console.error("Failed to check feedback", e);
    return false;
  }
}

export async function getFeedbackStats() {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['FeedbackLogs'];
    if (!sheet) return { avgProductRating: 0, avgUxRating: 0, recentComments: [] };
    
    const rows = await sheet.getRows();
    let productTotal = 0, productCount = 0;
    let uxTotal = 0, uxCount = 0;
    const commentsList: Array<{ id: string, type: string, rating: number, comment: string, date: string }> = [];

    // Parse rows in reverse (newest first)
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const type = r.get('Type');
      const rating = parseFloat(r.get('Rating') || '0');
      const comment = r.get('Comments');
      
      if (type === 'product' && rating > 0) {
        productTotal += rating;
        productCount++;
      } else if (type === 'ux' && rating > 0) {
        uxTotal += rating;
        uxCount++;
      }

      if (comment && comment.trim() !== '' && commentsList.length < 10) {
        commentsList.push({
          id: r.get('Order ID') || 'N/A',
          type,
          rating,
          comment,
          date: r.get('Timestamp')
        });
      }
    }

    return {
      avgProductRating: productCount > 0 ? (productTotal / productCount).toFixed(1) : 0,
      avgUxRating: uxCount > 0 ? (uxTotal / uxCount).toFixed(1) : 0,
      recentComments: commentsList
    };
  } catch (e) {
    console.error("Failed to get feedback stats", e);
    return { avgProductRating: 0, avgUxRating: 0, recentComments: [] };
  }
}

export async function cleanupOldOrders(ip?: string) {
  try {
    const doc = await getDoc();
    const sheet = doc.sheetsByTitle['Orders'];
    if (!sheet) return { deletedCount: 0, deletedData: [] };

    const rows = await sheet.getRows();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    const deletedData: any[] = [];

    // Delete from bottom to top to preserve indices of remaining rows
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      const dateStr = r.get('Date');
      if (dateStr) {
        const orderDate = new Date(dateStr).getTime();
        if (orderDate < thirtyDaysAgo) {
          deletedData.push({
            id: r.get('ID'),
            orderNumber: r.get('Order Number'),
            date: r.get('Date'),
            name: r.get('Name'),
            email: r.get('Email'),
            phone: r.get('Phone'),
            items: r.get('Items'),
            total: r.get('Total'),
            status: r.get('Status')
          });
          await r.delete();
          deletedCount++;
        }
      }
    }
    
    if (deletedCount > 0 && ip) {
      await logAudit(ip, 'ORDERS_CLEANUP', `Deleted ${deletedCount} old orders and generated backup.`);
    }

    return { deletedCount, deletedData };
  } catch (e) {
    console.error("Failed to cleanup old orders", e);
    throw new Error("Failed to cleanup old orders");
  }
}
