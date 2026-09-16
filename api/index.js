const express = require('express');
const fs = require('fs');
const path = require('path');

let kv = null;
if (process.env.ENABLE_VERCEL_KV === 'true') {
  try {
    kv = require('@vercel/kv').kv;
  } catch (e) {}
}
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

const DATA_FILE = path.join('/tmp', 'data.json');
const ORIGINAL_DATA_FILE = path.join(__dirname, '..', 'data.json');
const DEFAULT_UPSTASH_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const DEFAULT_UPSTASH_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

const UPSTASH_URL = DEFAULT_UPSTASH_URL;
const UPSTASH_TOKEN = DEFAULT_UPSTASH_TOKEN;
const useKV = process.env.ENABLE_VERCEL_KV === 'true' || !!(UPSTASH_URL && UPSTASH_TOKEN);

let cachedDb = null;
let lastDbFetchTime = 0;
const CACHE_TTL_MS = 1000;

// Timeout helper functions
function withTimeout(promise, ms = 3000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

async function fetchWithTimeout(resource, options = {}, ms = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    return response;
  } finally {
    clearTimeout(id);
  }
}

const DEFAULT_CONFIGS = {
  florida5: {
    id: "florida5",
    title: "Sorteo Gran Especial: 5 iPhone 17 Pro Max 1TB",
    prize: "5 iPhone 17 Pro Max 1TB",
    price: "RD$20",
    total: 100000,
    ticketDigits: 5,
    image: "./assets/suerte_rd_5_iphone17_banner.png",
    active: true,
    brand: "Apple",
    model: "5 iPhone 17 Pro Max 1TB",
    year: "2026",
    details: "¡Súper Sorteo Especial! Participa por 5 iPhone 17 Pro Max de 1TB por solo RD$20 pesos por ticket. Además: 10 Números Premiados de RD$5,000 pesos cada uno y RD$10,000 pesos extra al que más tickets compre.",
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
  const pin = req.headers['x-admin-pin'] || req.query.pin;
  const validPins = ['123456', 'SuerteRD2026', 'SoyArte(20251975)', 'suerte2026'];
  return pin && validPins.includes(String(pin).trim());
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

// Helper to read database (combining Vercel KV / Upstash / Local File)
async function readDb(forceFresh = false) {
  if (cachedDb && !forceFresh && (Date.now() - lastDbFetchTime < CACHE_TTL_MS)) {
    return cachedDb;
  }

  let db = null;
  if (useKV) {
    if (!kv) {
      try { kv = require('@vercel/kv').kv; } catch(e){}
    }
    if (kv) {
      try {
        db = await withTimeout(kv.get('suerterd_db'), 3000);
        if (typeof db === 'string') {
          try { db = JSON.parse(db); } catch(e){}
        }
      } catch (e) {
        console.warn("KV read bypassed/timed out:", e.message);
      }
    }
  }

  if (!db && UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      const res = await fetchWithTimeout(`${UPSTASH_URL}/get/suerterd_db`, {
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
      }, 3000);
      if (res.ok) {
        const data = await res.json();
        if (data.result) {
          let raw = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
          if (raw && raw.value) {
            try { raw = typeof raw.value === 'string' ? JSON.parse(raw.value) : raw.value; } catch(e){}
          }
          db = raw;
        }
      }
    } catch (e) {
      console.warn("REST read bypassed/timed out:", e.message);
    }
  }

  if (!db) {
    db = getDiskDb();
  }

  if (!db) {
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

  const payKey = "suerterd:payment:methods";
  const defaultBankAccounts = [
    { bank: "Banco Qik", type: "Cuenta de Ahorro", number: "1000490608", owner: "Luis Fernando Alvarez" },
    { bank: "Banreservas", type: "Cuenta de Ahorro", number: "9602059888", owner: "Cristhofer Sosa" },
    { bank: "Banco Popular", type: "Cuenta de Ahorro", number: "823386362", owner: "Erika Santos Francisco" },
    { bank: "Scotiabank", type: "Cuenta corriente", number: "03100039851", owner: "Luis Fernando Alvarez" },
    { bank: "Banco BHD", type: "Cuenta de Ahorro", number: "29848790017", owner: "Katherine Daniela Rodriguez Roque" }
  ];
  if (!db[payKey]) {
    db[payKey] = JSON.stringify(defaultBankAccounts);
  } else {
    try {
      let methods = typeof db[payKey] === 'string' ? JSON.parse(db[payKey]) : db[payKey];
      if (Array.isArray(methods) && !methods.some(m => m.number === "29848790017")) {
        methods.push({ bank: "Banco BHD", type: "Cuenta de Ahorro", number: "29848790017", owner: "Katherine Daniela Rodriguez Roque" });
        db[payKey] = JSON.stringify(methods);
      }
    } catch(e) {}
  }

  for (const id in DEFAULT_CONFIGS) {
    const key = `suerterd:config:v2:${id}`;
    if (!db[key]) {
      db[key] = JSON.stringify(DEFAULT_CONFIGS[id]);
    } else {
      try {
        let conf = typeof db[key] === 'string' ? JSON.parse(db[key]) : db[key];
        if (conf.price === "5" || conf.price === "20" || !conf.price) {
          conf.price = "RD$20";
          db[key] = JSON.stringify(conf);
        }
      } catch(e) {}
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

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error("Error writing DATA_FILE:", e);
  }

  let kvWritten = false;
  if (useKV) {
    if (!kv) {
      try { kv = require('@vercel/kv').kv; } catch(e){}
    }
    if (kv) {
      try {
        await withTimeout(kv.set('suerterd_db', db), 3000);
        kvWritten = true;
      } catch (e) {
        console.warn("KV write bypassed/timed out:", e.message);
      }
    }
  }

  if (!kvWritten && UPSTASH_URL && UPSTASH_TOKEN) {
    try {
      await fetchWithTimeout(`${UPSTASH_URL}/set/suerterd_db`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: typeof db === 'string' ? db : JSON.stringify(db)
      }, 3000);
    } catch (e) {
      console.warn("REST write bypassed/timed out:", e.message);
    }
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

// Auto-trigger countdown at 80% sold
function checkAutoCountdown(db, raffleId, ticketsObj) {
  try {
    const raffleConfigKey = `suerterd:config:v2:${raffleId}`;
    let currentConf = db[raffleConfigKey]
      ? (typeof db[raffleConfigKey] === 'string' ? JSON.parse(db[raffleConfigKey]) : db[raffleConfigKey])
      : (DEFAULT_CONFIGS[raffleId] || DEFAULT_CONFIGS['florida5']);

    if (currentConf && !currentConf.countdownStartedAt) {
      const soldCount = Object.keys(ticketsObj || {}).length;
      const totalCount = Number(currentConf.total) || 100000;
      const triggerPct = Number(currentConf.countdownTriggerPct) || 80;
      const currentPct = (soldCount / totalCount) * 100;
      if (currentPct >= triggerPct) {
        currentConf.countdownStartedAt = Date.now();
        db[raffleConfigKey] = typeof db[raffleConfigKey] === 'string' ? JSON.stringify(currentConf) : currentConf;
      }
    }
  } catch (e) {
    console.error("Error in checkAutoCountdown:", e);
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
  const db = await readDb(true);
  const rawValue = db[key] || "{}";
  let tickets = {};
  try {
    tickets = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
  } catch (e) {
    tickets = {};
  }

  // Vincular comprobante desde db.receipts a los boletos si no lo tienen de forma directa
  if (db.receipts && typeof db.receipts === 'object') {
    Object.values(tickets).forEach(t => {
      if (t && t.groupKey && db.receipts[t.groupKey] && (!t.comprobante || t.comprobante.length < 20 || t.comprobante.includes('suerte_rd_iphone17_banner'))) {
        t.comprobante = db.receipts[t.groupKey];
      }
    });
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

  // Encontrar comprobante existente para este grupo o boletos
  const firstTicketNum = tickets[0];
  let groupExistingComp = (ticketsObj[firstTicketNum] && ticketsObj[firstTicketNum].comprobante) ? ticketsObj[firstTicketNum].comprobante : '';
  if (!groupExistingComp || groupExistingComp.length < 20 || groupExistingComp.includes('suerte_rd_iphone17_banner')) {
    for (const tNum of tickets) {
      if (ticketsObj[tNum] && ticketsObj[tNum].comprobante && ticketsObj[tNum].comprobante.length > 20 && !ticketsObj[tNum].comprobante.includes('suerte_rd_iphone17_banner')) {
        groupExistingComp = ticketsObj[tNum].comprobante;
        break;
      }
    }
  }

  if (!groupExistingComp && db.receipts && db.receipts[uniqueGroupKey]) {
    groupExistingComp = db.receipts[uniqueGroupKey];
  }

  const finalComp = (comprobante && typeof comprobante === 'string' && comprobante.length > 20 && !comprobante.includes('suerte_rd_iphone17_banner'))
    ? comprobante
    : groupExistingComp;

  tickets.forEach((tNum) => {
    const existingFecha = (ticketsObj[tNum] && ticketsObj[tNum].fecha)
      ? ticketsObj[tNum].fecha
      : (ticketsObj[tNum] && ticketsObj[tNum].timestamp_reserva)
        ? new Date(ticketsObj[tNum].timestamp_reserva).toISOString()
        : new Date(now).toISOString();

    const existingResTime = (ticketsObj[tNum] && ticketsObj[tNum].timestamp_reserva)
      ? ticketsObj[tNum].timestamp_reserva
      : now;

    ticketsObj[tNum] = {
      name: name,
      whatsapp: whatsapp,
      packageLabel: packageLabel || (ticketsObj[tNum] && ticketsObj[tNum].packageLabel) || 'Personalizado',
      estado: newStatus,
      comprobante: finalComp || '',
      fecha: existingFecha,
      timestamp_reserva: existingResTime,
      timestamp_pago: newStatus === 'pagado' ? ((ticketsObj[tNum] && ticketsObj[tNum].timestamp_pago) || now) : null,
      groupKey: uniqueGroupKey,
      orderId: uniqueGroupKey
    };
  });

  // Guardar comprobante en el almacén db.receipts por grupo
  if (finalComp && finalComp.length > 20) {
    if (!db.receipts) db.receipts = {};
    db.receipts[uniqueGroupKey] = finalComp;
  }

  // Auto-trigger countdown if 80% sold
  checkAutoCountdown(db, raffleId, ticketsObj);

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
        ticketsObj[tNum] = {
          name: 'Cliente',
          whatsapp: '',
          estado: newStatus,
          fecha: new Date(now).toISOString(),
          timestamp_reserva: now,
          groupKey: `order_${now}_${tNum}`
        };
      }
      ticketsObj[tNum].estado = newStatus;
      if (newStatus === 'pagado') {
        ticketsObj[tNum].timestamp_pago = ticketsObj[tNum].timestamp_pago || now;
      }
      if (!ticketsObj[tNum].fecha) {
        ticketsObj[tNum].fecha = new Date(now).toISOString();
      }
      if (ticketsObj[tNum].groupKey && db.receipts && db.receipts[ticketsObj[tNum].groupKey] && !ticketsObj[tNum].comprobante) {
        ticketsObj[tNum].comprobante = db.receipts[ticketsObj[tNum].groupKey];
      }
    }
  });

  const newValueStr = JSON.stringify(ticketsObj);
  db[key] = newValueStr;
  checkAutoCountdown(db, raffleId, ticketsObj);
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

app.get(['/api/debug-kv-env', '/debug-kv-env'], async (req, res) => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  const enableKv = process.env.ENABLE_VERCEL_KV;

  let pingRes = null;
  let pingErr = null;
  if (url && token) {
    try {
      const r = await fetch(`${url}/ping`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      pingRes = { status: r.status, text: await r.text() };
    } catch(e) {
      pingErr = e.message;
    }
  }

  res.json({
    hasUrl: !!url,
    urlPrefix: url ? url.substring(0, 25) : '',
    hasToken: !!token,
    enableKv: enableKv,
    pingRes,
    pingErr
  });
});

if (!process.env.VERCEL && require.main === module) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Servidor de Suerte RD corriendo en http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
