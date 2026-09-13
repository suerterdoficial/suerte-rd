const express = require('express');
const fs = require('fs');
const path = require('path');
const { kv } = require('@vercel/kv');
const { put, list } = require('@vercel/blob');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use((req, res, next) => {
  const matchedPath = req.headers['x-matched-path'] || req.originalUrl || req.url;
  if (matchedPath && matchedPath.startsWith('/api/')) {
    req.url = matchedPath;
  }
  next();
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  express.static(path.join(__dirname, '..'))(req, res, next);
});

app.get('/assets/js/app.js', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.sendFile(path.join(__dirname, '..', 'assets', 'js', 'app.js'));
});

app.get('/assets/js/admin.js', (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.sendFile(path.join(__dirname, '..', 'assets', 'js', 'admin.js'));
});

const ORIGINAL_DATA_FILE = path.join(__dirname, '..', 'data.json');
const DATA_FILE = process.env.VERCEL ? path.join('/tmp', 'suerterd_data.json') : ORIGINAL_DATA_FILE;
const UPSTASH_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || null;
const UPSTASH_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || null;
const useKV = !!(UPSTASH_URL && UPSTASH_TOKEN);

let cachedDb = null;
let lastDbFetchTime = 0;
const CACHE_TTL_MS = 1000;

const DEFAULT_CONFIGS = {
  florida5: {
    id: "florida5",
    title: "Sorteo Especial iPhone 17 Pro Max 1TB",
    prize: "iPhone 17 Pro Max 1TB",
    price: "RD$3",
    total: 100000,
    ticketDigits: 5,
    image: "./assets/suerte_rd_iphone17_banner.png",
    active: true,
    brand: "Apple",
    model: "iPhone 17 Pro Max 1TB",
    year: "2026",
    details: "Super Sorteo Especial! Participa por un iPhone 17 Pro Max de 1TB por solo RD$3 pesos. Se realiza en combinación con la lotería oficial de Florida.",
    blessedPct: 0.1,
    blessedPrize: "RD$5,000",
    saleStatus: "active",
    blessedDrawInterval: 5,
    countdownTriggerPct: 80,
    countdownDurationDays: 7,
    blessedNumbers: [],
    whatsapp: "8099838626"
  }
};

// Helper to check admin authorization
async function isAdmin(req) {
  const authHeader = req.headers.authorization || req.headers.adminpin || '';
  const pinFromHeader = authHeader.replace('Bearer ', '').trim();
  const pinFromBody = req.body && req.body.pin ? String(req.body.pin).trim() : '';
  const validPins = ['123456', 'SuerteRD2026', 'SoyArte(20251975)', 'suerte2026'];
  return validPins.includes(pinFromHeader) || validPins.includes(pinFromBody) || !process.env.VERCEL;
}

let BUNDLED_DATA = {};
try {
  BUNDLED_DATA = require('../data.json');
} catch(e) {}

function getDiskDb() {
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Object.keys(parsed).length > 0) return parsed;
    } catch (e) {}
  }
  if (fs.existsSync(ORIGINAL_DATA_FILE)) {
    try {
      const raw = fs.readFileSync(ORIGINAL_DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Object.keys(parsed).length > 0) return parsed;
    } catch (e) {}
  }
  if (BUNDLED_DATA && Object.keys(BUNDLED_DATA).length > 0) {
    return BUNDLED_DATA;
  }
  return {};
}

// Helper to read database
async function readDb(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedDb && (now - lastDbFetchTime) < CACHE_TTL_MS) {
    return cachedDb;
  }

  let db = null;

  if (useKV) {
    try {
      const kvPromise = kv.get('suerterd_db');
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('KV Timeout')), 1200));
      const data = await Promise.race([kvPromise, timeoutPromise]);
      db = data || null;
    } catch (e) {
      console.error("Error reading from Vercel KV:", e.message || e);
    }
  }

  if (!db && UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const fetchPromise = fetch(`${UPSTASH_URL}/get/suerterd_db`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      }).then(r => r.ok ? r.json() : null);
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Upstash Timeout')), 1200));
      const data = await Promise.race([fetchPromise, timeoutPromise]);
      if (data && data.result) {
        db = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      }
    } catch (e) {
      console.error("Error reading from Upstash Redis:", e.message || e);
    }
  }

  if (!db || typeof db !== 'object') {
    db = {};
  }

  const diskDb = getDiskDb();

  for (const k in diskDb) {
    if (!db[k]) {
      db[k] = diskDb[k];
    }
  }

  if (!db['suerterd:raffle:ids']) {
    db['suerterd:raffle:ids'] = JSON.stringify(["florida5"]);
  }

  for (const id in DEFAULT_CONFIGS) {
    const key = `suerterd:config:v2:${id}`;
    if (!db[key]) {
      db[key] = JSON.stringify(DEFAULT_CONFIGS[id]);
    }
    const tKey = `suerterd:tickets:v2:${id}`;
    
    const diskTicketsStr = diskDb[tKey];
    if (diskTicketsStr && diskTicketsStr !== "{}") {
      let currentObj = {};
      try { currentObj = typeof db[tKey] === 'string' ? JSON.parse(db[tKey] || "{}") : (db[tKey] || {}); } catch(e){}
      let diskObj = {};
      try { diskObj = typeof diskTicketsStr === 'string' ? JSON.parse(diskTicketsStr) : (diskTicketsStr || {}); } catch(e){}

      let hasChanges = false;
      for (const numStr in diskObj) {
        if (!currentObj[numStr]) {
          currentObj[numStr] = diskObj[numStr];
          hasChanges = true;
        }
      }
      db[tKey] = JSON.stringify(currentObj);
      if (hasChanges && useKV) {
        writeDb(db).catch(err => console.error("Error persisting merged db:", err));
      }
    }

    if (!db[tKey]) {
      db[tKey] = "{}";
    }
  }

  cachedDb = db;
  lastDbFetchTime = Date.now();
  return db;
}

// Helper to write database
async function writeDb(db) {
  cachedDb = db;
  lastDbFetchTime = Date.now();

  if (useKV) {
    try {
      await kv.set('suerterd_db', db);
    } catch (e) {
      console.error("Error writing to Vercel KV:", e);
    }
  }

  if (UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await fetch(`${UPSTASH_URL}/set/suerterd_db`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: typeof db === 'string' ? db : JSON.stringify(db) })
      });
    } catch (e) {
      console.error("Error writing to Upstash Redis:", e);
    }
  }

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error("Error writing DATA_FILE:", e);
  }
  return true;
}

// Helper to log notifications
async function detectAndLogNotifications(key, oldValueStr, newValueStr) {
  try {
    if (!key.startsWith("suerterd:tickets:v2:")) return;
    const oldTickets = oldValueStr ? JSON.parse(oldValueStr) : {};
    const newTickets = newValueStr ? JSON.parse(newValueStr) : {};

    let countNew = 0;
    let sampleName = 'Cliente';
    for (const numStr in newTickets) {
      if (newTickets[numStr] && !oldTickets[numStr]) {
        countNew++;
        sampleName = newTickets[numStr].name || newTickets[numStr].nombre || 'Cliente';
      }
    }

    if (countNew > 0) {
      const db = await readDb();
      if (!db.notifications) db.notifications = [];
      db.notifications.unshift({
        text: `🎟️ Nueva compra: ${sampleName} adquirió ${countNew} boletos.`,
        timestamp: Date.now()
      });
      if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);
      await writeDb(db);
    }
  } catch (e) {
    console.error("Error detecting notifications:", e);
  }
}

// ADMIN VERIFY PIN
app.post(['/api/admin/verify', '/admin/verify'], async (req, res) => {
  const { pin } = req.body || {};
  const validPins = ['123456', 'SuerteRD2026', 'SoyArte(20251975)', 'suerte2026'];
  if (pin && validPins.includes(String(pin).trim())) {
    return res.json({ success: true });
  }
  res.status(401).json({ success: false, error: "PIN incorrecto" });
});

// GET TICKETS API
app.get(['/api/tickets', '/tickets'], async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  const raffleId = req.query.raffleId || 'florida5';
  const key = `suerterd:tickets:v2:${raffleId}`;
  const db = await readDb();
  const rawValue = db[key] || "{}";
  let tickets = {};
  try {
    tickets = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
  } catch (e) {
    tickets = {};
  }
  res.json({ success: true, value: tickets });
});

// RESERVE TICKETS API
app.post(['/api/tickets/reserve', '/tickets/reserve'], async (req, res) => {
  const { raffleId = 'florida5', name, whatsapp, tickets, packageLabel, estado, comprobante, groupKey } = req.body || {};
  if (!name || !whatsapp || !tickets || !tickets.length) {
    return res.status(400).json({ error: "Faltan datos requeridos" });
  }

  const db = await readDb(true);
  const key = `suerterd:tickets:v2:${raffleId}`;
  const oldValueStr = db[key] || "{}";
  let ticketsObj = {};
  try { ticketsObj = oldValueStr ? JSON.parse(oldValueStr) : {}; } catch (e) {}

  const now = Date.now();
  const newStatus = estado || 'esperando_validacion';
  const uniqueGroupKey = groupKey || `order_${now}_${Math.random().toString(36).substring(2, 7)}`;

  // Find any existing receipt image for this group or ticket
  const firstTicketNum = tickets[0];
  let groupExistingComp = (ticketsObj[firstTicketNum] && ticketsObj[firstTicketNum].comprobante) ? ticketsObj[firstTicketNum].comprobante : '';
  if (!groupExistingComp || groupExistingComp.length < 20) {
    for (const tNum of tickets) {
      if (ticketsObj[tNum] && ticketsObj[tNum].comprobante && ticketsObj[tNum].comprobante.length > 20 && !ticketsObj[tNum].comprobante.includes('suerte_rd_iphone17_banner')) {
        groupExistingComp = ticketsObj[tNum].comprobante;
        break;
      }
    }
  }

  const finalComp = (comprobante && typeof comprobante === 'string' && comprobante.length > 20 && !comprobante.includes('suerte_rd_iphone17_banner'))
    ? comprobante
    : groupExistingComp;

  tickets.forEach((tNum, index) => {
    // Only store full base64 image on the primary ticket (index 0) to avoid duplicating 100KB x 500 = 50MB payload
    const ticketComp = (index === 0) ? finalComp : '';

    ticketsObj[tNum] = {
      name: name,
      whatsapp: whatsapp,
      packageLabel: packageLabel || (ticketsObj[tNum] && ticketsObj[tNum].packageLabel) || 'Personalizado',
      estado: newStatus,
      comprobante: ticketComp,
      fecha: (ticketsObj[tNum] && ticketsObj[tNum].fecha) ? ticketsObj[tNum].fecha : new Date(now).toISOString(),
      timestamp_reserva: now,
      timestamp_pago: newStatus === 'pagado' ? now : null,
      groupKey: uniqueGroupKey,
      orderId: uniqueGroupKey
    };
  });

  const newValueStr = JSON.stringify(ticketsObj);
  db[key] = newValueStr;

  if (finalComp && finalComp.length > 20) {
    if (!db.receipts) db.receipts = {};
    db.receipts[uniqueGroupKey] = finalComp;
  }

  // Registrar notificación
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    text: `🛒 Compra registrada: ${name} (${tickets.length} boletos - ${packageLabel || 'Paquete'})`,
    timestamp: now
  });
  if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);

  await writeDb(db);

  res.json({ success: true, count: tickets.length, groupKey: uniqueGroupKey });
});

// UPDATE TICKET STATUS API
app.post(['/api/tickets/update-status', '/tickets/update-status'], async (req, res) => {
  const { raffleId = 'florida5', tickets, status, action } = req.body || {};
  if (!tickets || !tickets.length) {
    return res.status(400).json({ error: "Faltan boletos para actualizar" });
  }

  const db = await readDb(true);
  const key = `suerterd:tickets:v2:${raffleId}`;
  const oldValueStr = db[key] || "{}";
  let ticketsObj = {};
  try { ticketsObj = oldValueStr ? JSON.parse(oldValueStr) : {}; } catch (e) {}

  const now = Date.now();
  const newStatus = status || 'pagado';

  tickets.forEach(tNum => {
    if (action === 'delete' || newStatus === 'deleted') {
      delete ticketsObj[tNum];
    } else {
      if (!ticketsObj[tNum]) {
        ticketsObj[tNum] = { name: 'Cliente', whatsapp: '', estado: newStatus, fecha: new Date(now).toISOString() };
      }
      ticketsObj[tNum].estado = newStatus;
      if (newStatus === 'pagado') {
        ticketsObj[tNum].timestamp_pago = now;
      }
    }
  });

  const newValueStr = JSON.stringify(ticketsObj);
  db[key] = newValueStr;
  await writeDb(db);

  res.json({ success: true, updatedCount: tickets.length });
});

// GET / SET GENERIC APIS
app.get(['/api/get', '/get'], async (req, res) => {
  const { key } = req.query;
  if (!key) return res.status(400).json({ error: "Falta parámetro key" });
  const db = await readDb(true);
  res.json({ value: db[key] || null });
});

app.post(['/api/set', '/set'], async (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: "Falta parámetro key" });
  const db = await readDb(true);
  db[key] = typeof value === 'object' ? JSON.stringify(value) : value;
  await writeDb(db);
  res.json({ success: true });
});

// SERVE FRONTEND
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get(['/admin', '/admin.', '/admin.html', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Servidor de Suerte RD corriendo en http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
