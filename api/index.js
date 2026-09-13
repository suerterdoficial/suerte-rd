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

app.use(express.static(path.join(__dirname, '..')));

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

// Helper to read database
async function readDb(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && cachedDb && (now - lastDbFetchTime) < CACHE_TTL_MS) {
    return cachedDb;
  }

  let db = null;

  if (useKV) {
    try {
      const data = await kv.get('suerterd_db');
      db = data || null;
    } catch (e) {
      console.error("Error reading from Vercel KV:", e);
    }
  }

  if (!db && UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const res = await fetch(`${UPSTASH_URL}/get/suerterd_db`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          db = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
        }
      }
    } catch (e) {
      console.error("Error reading from Upstash Redis:", e);
    }
  }

  if (!db) {
    if (process.env.VERCEL && !fs.existsSync(DATA_FILE) && fs.existsSync(ORIGINAL_DATA_FILE)) {
      try {
        fs.copyFileSync(ORIGINAL_DATA_FILE, DATA_FILE);
      } catch (e) {
        console.error("Error copying original data.json to /tmp:", e);
      }
    }
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        db = JSON.parse(raw) || {};
      } catch (e) {
        console.error("Error reading DATA_FILE:", e);
        db = {};
      }
    } else if (fs.existsSync(ORIGINAL_DATA_FILE)) {
      try {
        const raw = fs.readFileSync(ORIGINAL_DATA_FILE, 'utf8');
        db = JSON.parse(raw) || {};
      } catch (e) {
        db = {};
      }
    } else {
      db = {};
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
    if (db[tKey] === undefined) {
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
  const { raffleId = 'florida5', name, whatsapp, tickets, packageLabel, estado, comprobante } = req.body || {};
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

  tickets.forEach(tNum => {
    ticketsObj[tNum] = {
      name: name,
      whatsapp: whatsapp,
      packageLabel: packageLabel || 'Personalizado',
      estado: newStatus,
      comprobante: comprobante || '',
      fecha: new Date(now).toISOString(),
      timestamp_reserva: now,
      timestamp_pago: newStatus === 'pagado' ? now : null
    };
  });

  const newValueStr = JSON.stringify(ticketsObj);
  db[key] = newValueStr;

  // Registrar notificación
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    text: `🛒 Compra registrada: ${name} (${tickets.length} boletos - ${packageLabel || 'Paquete'})`,
    timestamp: now
  });
  if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);

  await writeDb(db);

  res.json({ success: true, count: tickets.length });
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
    } else if (ticketsObj[tNum]) {
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
