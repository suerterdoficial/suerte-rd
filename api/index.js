const express = require('express');
const fs = require('fs');
const path = require('path');
const { kv } = require('@vercel/kv');
const { put, list } = require('@vercel/blob');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..')));

const DATA_FILE = path.join(__dirname, '..', 'data.json');
const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

let cachedDb = null;
let lastDbFetchTime = 0;
const CACHE_TTL_MS = 2000;

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
    details: "¡Súper Sorteo Especial! Participa por un iPhone 17 Pro Max de 1TB por solo RD$3 pesos. Se realiza en combinación con la lotería oficial de Florida.",
    blessedPct: 0.1,
    blessedPrize: "RD$5,000",
    saleStatus: "active",
    blessedDrawInterval: 5,
    countdownTriggerPct: 80,
    countdownDurationDays: 7,
    blessedNumbers: [],
    whatsapp: "18099838626"
  }
};

// Helper to read database
async function readDb() {
  const now = Date.now();
  if (cachedDb && (now - lastDbFetchTime) < CACHE_TTL_MS) {
    return cachedDb;
  }

  let db = null;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (token) {
    try {
      const { blobs } = await list({ prefix: 'suerterd_db.json', token });
      if (blobs && blobs.length > 0) {
        const res = await fetch(blobs[0].url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const text = await res.text();
          db = JSON.parse(text);
        }
      }
    } catch (e) {
      console.error("Error reading from Vercel Blob:", e);
    }
  }

  if (!db && useKV) {
    try {
      const data = await kv.get('suerterd_db');
      db = data || {};
    } catch (e) {
      console.error("Error reading from Vercel KV:", e);
    }
  }

  if (!db) {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        db = JSON.parse(raw) || {};
      } catch (e) {
        console.error("Error reading data.json, returning empty object", e);
        db = {};
      }
    } else {
      db = {};
    }
  }

  let changed = false;

  // Auto-initialize raffle IDs list
  if (!db['suerterd:raffle:ids'] || db['suerterd:raffle:ids'] !== JSON.stringify(["florida5"])) {
    db['suerterd:raffle:ids'] = JSON.stringify(["florida5"]);
    changed = true;
  }

  // Auto-initialize default configurations if they don't exist
  for (const id in DEFAULT_CONFIGS) {
    const key = `suerterd:config:v2:${id}`;
    if (!db[key]) {
      db[key] = JSON.stringify(DEFAULT_CONFIGS[id]);
      changed = true;
    } else {
      try {
        const parsedCfg = JSON.parse(db[key]);
        if (parsedCfg.title === "Pick 5 Florida" || parsedCfg.image === "./assets/suerte_rd_iphone17.jpg") {
          db[key] = JSON.stringify(DEFAULT_CONFIGS[id]);
          changed = true;
        }
      } catch (e) {
        console.error("Error parsing config during migration check", e);
      }
    }
    // Also ensure tickets databases are initialized empty if not present
    const tKey = `suerterd:tickets:v2:${id}`;
    if (!db[tKey]) {
      db[tKey] = "{}";
      changed = true;
    }
  }

  if (changed) {
    await writeDb(db);
  }

  cachedDb = db;
  lastDbFetchTime = Date.now();
  return db;
}

// Helper to write database
async function writeDb(db) {
  cachedDb = db;
  lastDbFetchTime = Date.now();

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) {
    try {
      await put('suerterd_db.json', JSON.stringify(db), {
        access: 'private',
        addRandomSuffix: false,
        token
      });
    } catch (e) {
      console.error("Error writing to Vercel Blob:", e);
    }
  }

  if (useKV) {
    try {
      await kv.set('suerterd_db', db);
    } catch (e) {
      console.error("Error writing to Vercel KV:", e);
    }
  }

  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    // Ignore read-only filesystem errors on Vercel
  }
}

// Notification Detector Helper
async function detectAndLogNotifications(key, oldValStr, newValStr) {
  let oldVal = null;
  let newVal = null;
  try { oldVal = oldValStr ? JSON.parse(oldValStr) : null; } catch(e) {}
  try { newVal = newValStr ? JSON.parse(newValStr) : null; } catch(e) {}

  let messages = [];
  const db = await readDb();

  if (key.startsWith("suerterd:tickets:v2:")) {
    const raffleId = key.split(":")[3];
    const oldTickets = oldVal || {};
    const newTickets = newVal || {};

    // 1. Check for resets
    if (Object.keys(oldTickets).length > 0 && Object.keys(newTickets).length === 0) {
      messages.push(`Se reiniciaron las ventas del sorteo (${raffleId})`);
    } else {
      // 2. Check for additions or changes
      const addedTickets = [];
      const changedTickets = [];

      Object.keys(newTickets).forEach(tNum => {
        const oldT = oldTickets[tNum];
        const newT = newTickets[tNum];

        if (!oldT) {
          addedTickets.push({ num: tNum, ...newT });
        } else if (oldT.estado !== newT.estado) {
          changedTickets.push({ num: tNum, oldEstado: oldT.estado, newEstado: newT.estado, ...newT });
        }
      });

      // Handle grouped additions
      if (addedTickets.length > 0) {
        const groups = {};
        addedTickets.forEach(t => {
          const key = `${t.timestamp || Date.now()}_${t.whatsapp || 'unknown'}`;
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(t);
        });

        Object.keys(groups).forEach(gKey => {
          const list = groups[gKey];
          const name = list[0].name || list[0].nombre || "Cliente";
          if (list.length >= 25) {
            messages.push(`¡Paquete de ${list.length} boletos apartado por ${name}! En espera de validación.`);
          } else if (list.length > 1) {
            messages.push(`¡Grupo de ${list.length} boletos reservado por ${name}!`);
          } else {
            messages.push(`¡Boleto #${list[0].num} reservado por ${name}!`);
          }
        });
      }

      // Handle grouped changes
      if (changedTickets.length > 0) {
        const groups = {};
        changedTickets.forEach(t => {
          const timestamp = t.timestamp_comprobante || t.timestamp_pago || t.timestamp || Date.now();
          const key = `${timestamp}_${t.whatsapp || 'unknown'}_${t.newEstado}`;
          if (!groups[key]) {
            groups[key] = {
              state: t.newEstado,
              name: t.name || t.nombre || "Cliente",
              tickets: []
            };
          }
          groups[key].tickets.push(t.num);
        });

        Object.keys(groups).forEach(gKey => {
          const g = groups[gKey];
          g.tickets.sort();
          const count = g.tickets.length;
          if (g.state === 'pagado') {
            if (count >= 25) {
              messages.push(`Pago confirmado para el paquete de ${count} boletos de ${g.name}`);
            } else if (count > 1) {
              messages.push(`Pago confirmado para el grupo de ${count} boletos de ${g.name}`);
            } else {
              messages.push(`Pago confirmado para el boleto #${g.tickets[0]} (${g.name})`);
            }
          } else if (g.state === 'esperando_validacion') {
            if (count >= 25) {
              messages.push(`Pago pendiente de validación para el paquete de ${count} boletos de ${g.name}`);
            } else if (count > 1) {
              messages.push(`Pago pendiente de validación para el grupo de ${count} boletos de ${g.name}`);
            } else {
              messages.push(`Pago pendiente de validación para el boleto #${g.tickets[0]} (${g.name})`);
            }
          } else {
            if (count >= 25) {
              messages.push(`Paquete de ${count} boletos de ${g.name} revertido a estado reservado`);
            } else if (count > 1) {
              messages.push(`Grupo de ${count} boletos de ${g.name} revertido a estado reservado`);
            } else {
              messages.push(`Boleto #${g.tickets[0]} revertido a estado reservado (${g.name})`);
            }
          }
        });
      }

      // 3. Check for deletions
      const deletedTickets = [];
      Object.keys(oldTickets).forEach(tNum => {
        if (!newTickets[tNum]) {
          deletedTickets.push({ num: tNum, ...oldTickets[tNum] });
        }
      });

      if (deletedTickets.length > 0) {
        const groups = {};
        deletedTickets.forEach(t => {
          const key = `${t.whatsapp || 'admin'}`;
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(t);
        });

        Object.keys(groups).forEach(gKey => {
          const list = groups[gKey];
          const name = list[0].name || list[0].nombre || "Cliente";
          if (list.length >= 25) {
            messages.push(`Paquete de ${list.length} boletos de ${name} liberado y disponible nuevamente`);
          } else if (list.length > 1) {
            messages.push(`Grupo de ${list.length} boletos de ${name} liberado y disponible nuevamente`);
          } else {
            messages.push(`Boleto #${list[0].num} liberado y disponible nuevamente`);
          }
        });
      }
    }

    // 4. Algoritmo de hitos de ventas y cuenta regresiva
    const cfgKey = `suerterd:config:v2:${raffleId}`;
    const configRaw = db[cfgKey];
    const config = configRaw ? JSON.parse(configRaw) : null;

    if (config) {
      const totalCount = Math.max(1, Number(config.total) || 10000);
      const interval = config.blessedDrawInterval !== undefined ? parseFloat(config.blessedDrawInterval) : 5;
      const countdownTriggerPct = config.countdownTriggerPct !== undefined ? parseFloat(config.countdownTriggerPct) : 80;

      const oldSoldCount = Object.keys(oldTickets).length;
      const newSoldCount = Object.keys(newTickets).length;
      const currentPct = (newSoldCount / totalCount) * 100;

      // Hitos de números bendecidos (automatizado)
      if (newSoldCount > oldSoldCount && interval > 0) {
        const oldPct = (oldSoldCount / totalCount) * 100;
        const oldIndex = Math.floor(oldPct / interval);
        const newIndex = Math.floor(currentPct / interval);

        if (newIndex > oldIndex) {
          const milestonePct = newIndex * interval;
          const soldList = Object.keys(newTickets).filter(num => newTickets[num].estado === 'reservado' || newTickets[num].estado === 'pagado');
          const blessedNumbersSet = new Set(config.blessedNumbers || []);
          const availableTickets = soldList.filter(num => !blessedNumbersSet.has(num));

          if (availableTickets.length > 0) {
            const winnerIndex = Math.floor(Math.random() * availableTickets.length);
            const winningTicket = availableTickets[winnerIndex];

            if (!config.blessedNumbers) {
              config.blessedNumbers = [];
            }
            config.blessedNumbers.push(winningTicket);
            config.blessedNumbers.sort();
            db[cfgKey] = JSON.stringify(config);

            const buyerName = newTickets[winningTicket].name || newTickets[winningTicket].nombre || "Cliente";
            messages.push(`🎉 ¡Sorteo al instante! El boleto #${winningTicket} de ${buyerName} es un nuevo Número Bendecido de ${config.blessedPrize || 'RD$5,000'} por alcanzar el ${milestonePct.toFixed(0)}% de ventas!`);
          }
        }
      }

      // Activación del conteo regresivo al llegar al 80% (o el hito configurado)
      if (currentPct >= countdownTriggerPct) {
        if (!config.countdownStartedAt) {
          config.countdownStartedAt = Date.now();
          db[cfgKey] = JSON.stringify(config);
          messages.push(`⏰ ¡Atención! Las ventas de (${raffleId}) alcanzaron el ${countdownTriggerPct}%. Se ha activado la cuenta regresiva final.`);
        }
      } else {
        if (config.countdownStartedAt) {
          delete config.countdownStartedAt;
          db[cfgKey] = JSON.stringify(config);
          messages.push(`ℹ️ Cuenta regresiva del sorteo (${raffleId}) desactivada al disminuir las ventas por debajo de ${countdownTriggerPct}%.`);
        }
      }
    }
  } else if (key.startsWith("suerterd:config:v2:")) {
    const newConf = newVal || {};
    messages.push(`Configuración de rifa actualizada: "${newConf.title || 'Sorteo'}"`);
  } else if (key === "suerterd:winners:v2") {
    const oldWinners = oldVal || [];
    const newWinners = newVal || [];
    if (newWinners.length > oldWinners.length) {
      const latestWinner = newWinners[newWinners.length - 1];
      const formattedNum = String(latestWinner.number).padStart(5, '0');
      messages.push(`¡Sorteo Oficial! ${latestWinner.name} ganó el premio "${latestWinner.prize}" con el boleto #${formattedNum}`);
    }
  }

  if (messages.length > 0) {
    if (!db.notifications) {
      db.notifications = [];
    }
    messages.forEach(msg => {
      db.notifications.unshift({
        text: msg,
        timestamp: Date.now()
      });
    });
    // Limit to 50 notifications
    if (db.notifications.length > 50) {
      db.notifications = db.notifications.slice(0, 50);
    }
    await writeDb(db);
  }
}

async function getAdminPin() {
  const db = await readDb();
  return db['suerterd:admin:pin'] || process.env.ADMIN_PIN || 'SuerteRD2026';
}

async function isAdmin(req) {
  const pin = req.headers['x-admin-pin'] || req.body.pin || req.query.pin;
  if (!pin) return false;
  const adminPin = await getAdminPin();
  return pin === adminPin;
}

// Background Task: Auto-release expired reserved tickets (Phase 3)
async function releaseExpiredTickets() {
  const db = await readDb();
  let dbChanged = false;
  let releasedCount = 0;
  const EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in ms
  const now = Date.now();

  Object.keys(db).forEach(key => {
    if (key.startsWith("suerterd:tickets:v2:")) {
      let tickets = {};
      try {
        tickets = db[key] ? JSON.parse(db[key]) : {};
      } catch (e) {
        return;
      }

      let ticketsChanged = false;
      const keys = Object.keys(tickets);

      keys.forEach(tNum => {
        const ticket = tickets[tNum];
        if (ticket.estado === 'reservado' && ticket.timestamp) {
          const elapsed = now - ticket.timestamp;
          if (elapsed > EXPIRATION_TIME) {
            delete tickets[tNum];
            ticketsChanged = true;
            dbChanged = true;
            releasedCount++;

            if (!db.notifications) db.notifications = [];
            db.notifications.unshift({
              text: `Boleto #${tNum} liberado automáticamente tras 24 horas sin pago (Cliente: ${ticket.name})`,
              timestamp: now
            });
            console.log(`[Auto-Release] Ticket #${tNum} expired and released.`);
          }
        }
      });

      if (ticketsChanged) {
        db[key] = JSON.stringify(tickets);
      }
    }
  });

  if (dbChanged) {
    if (db.notifications && db.notifications.length > 50) {
      db.notifications = db.notifications.slice(0, 50);
    }
    await writeDb(db);
  }
  return releasedCount;
}

// Run cleanup every 5 minutes (only locally or if node process stays alive)
if (!process.env.VERCEL) {
  setInterval(async () => {
    try {
      await releaseExpiredTickets();
    } catch (e) {
      console.error("Error in scheduled releaseExpiredTickets:", e);
    }
  }, 5 * 60 * 1000);
  
  setTimeout(async () => {
    try {
      await releaseExpiredTickets();
    } catch (e) {
      console.error("Error in startup releaseExpiredTickets:", e);
    }
  }, 5000);
}

// API Endpoints
app.post('/api/admin/verify', async (req, res) => {
  const { pin } = req.body;
  const adminPin = await getAdminPin();
  if (pin === adminPin) {
    return res.json({ success: true });
  }
  res.json({ success: false });
});

app.post('/api/admin/clean-expired', async (req, res) => {
  if (!await isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const count = await releaseExpiredTickets();
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Public Ticket Reservation Endpoint for Customers
app.post('/api/tickets/reserve', async (req, res) => {
  try {
    const { raffleId, name, whatsapp, loteria, tickets, comprobante, estado } = req.body;
    if (!raffleId || !name || !whatsapp || !tickets || !Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: "Campos incompletos para reservar boletos." });
    }

    const rId = raffleId || "florida5";
    const db = await readDb();
    const key = `suerterd:tickets:v2:${rId}`;
    let ticketsObj = db[key] ? JSON.parse(db[key]) : {};

    const now = Date.now();
    const targetState = estado || (comprobante ? "esperando_validacion" : "reservado");

    tickets.forEach((tNum, index) => {
      const existing = ticketsObj[tNum] || {};
      if (existing.estado === 'pagado') return;

      ticketsObj[tNum] = {
        ...existing,
        name: name,
        nombre: name,
        whatsapp: whatsapp,
        loteria: loteria || "Pick 5 Florida",
        estado: targetState,
        timestamp: existing.timestamp || now
      };

      if (comprobante) {
        ticketsObj[tNum].comprobante = (index === 0) ? comprobante : true;
        ticketsObj[tNum].timestamp_comprobante = now;
      }
    });

    db[key] = JSON.stringify(ticketsObj);

    // Create notification
    if (!db.notifications) db.notifications = [];
    const notifMsg = comprobante 
      ? `¡Paquete de ${tickets.length} boletos enviado con comprobante por ${name}! Pendiente de validación.`
      : `¡Paquete de ${tickets.length} boletos reservado por ${name}! En espera de comprobante.`;
    
    db.notifications.unshift({
      text: notifMsg,
      timestamp: now
    });
    if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);

    await writeDb(db);
    res.json({ success: true, count: tickets.length });
  } catch (e) {
    console.error("Error in /api/tickets/reserve:", e);
    res.status(500).json({ error: e.message });
  }
});

// Cron Endpoint for Vercel Cron
app.get('/api/cron/release-tickets', async (req, res) => {
  try {
    const count = await releaseExpiredTickets();
    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/get', async (req, res) => {
  const { key } = req.query;
  if (!key) {
    return res.status(400).json({ error: "Missing key parameter" });
  }
  if (key === 'supportMessages' || key === 'notifications') {
    if (!await isAdmin(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }
  const db = await readDb();
  res.json({ value: db[key] || null });
});

app.post('/api/set', async (req, res) => {
  const { key, value } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Missing key in request body" });
  }
  const db = await readDb();
  const oldValue = db[key] || null;
  
  // Security validation (Phase 1)
  let needsAdmin = false;
  if (key.startsWith("suerterd:config:v2:") || key === "suerterd:winners:v2" || key === "suerterd:payment:methods") {
    needsAdmin = true;
  } else if (key.startsWith("suerterd:tickets:v2:")) {
    let oldTickets = {};
    let newTickets = {};
    try { oldTickets = oldValue ? JSON.parse(oldValue) : {}; } catch(e) {}
    try { newTickets = value ? JSON.parse(value) : {}; } catch(e) {}

    for (const tNum in oldTickets) {
      if (!newTickets[tNum]) {
        needsAdmin = true; // Deleting (releasing) ticket requires admin
        break;
      }
      const oldEst = oldTickets[tNum].estado;
      const newEst = newTickets[tNum].estado;
      if (oldEst !== newEst) {
        if (oldEst === 'reservado' && newEst === 'esperando_validacion') {
          // Allowed for customer uploading payment receipt
        } else {
          needsAdmin = true; // Modifying state to pagado/bloqueado or reverting requires admin
          break;
        }
      }
    }
    for (const tNum in newTickets) {
      if (!oldTickets[tNum]) {
        const newEst = newTickets[tNum].estado;
        if (newEst === 'pagado' || newEst === 'bloqueado') {
          needsAdmin = true; // Adding directly as paid/blocked requires admin
          break;
        }
      }
    }
  } else {
    needsAdmin = true;
  }

  if (needsAdmin && !await isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  db[key] = value;

  // Auto-generate blessed numbers when milestones of 10,000 are reached
  if (key.startsWith("suerterd:tickets:v2:")) {
    const rId = key.substring("suerterd:tickets:v2:".length);
    const cfgKey = `suerterd:config:v2:${rId}`;
    if (db[cfgKey]) {
      try {
        const tickets = value ? JSON.parse(value) : {};
        const totalSold = Object.keys(tickets).length;
        const expectedBlessedCount = Math.min(10, Math.floor(totalSold / 10000));
        
        const conf = JSON.parse(db[cfgKey]);
        if (!conf.blessedNumbers) conf.blessedNumbers = [];
        
        if (conf.blessedNumbers.length < expectedBlessedCount) {
          const soldList = Object.keys(tickets);
          const pool = soldList.filter(num => !conf.blessedNumbers.includes(num));
          
          let needed = expectedBlessedCount - conf.blessedNumbers.length;
          let generatedAny = false;
          while (needed > 0 && pool.length > 0) {
            const randIdx = Math.floor(Math.random() * pool.length);
            const chosen = pool[randIdx];
            conf.blessedNumbers.push(chosen);
            pool.splice(randIdx, 1);
            needed--;
            generatedAny = true;
            
            // Log a notification for the new blessed winner
            const winnerInfo = tickets[chosen];
            const winnerName = winnerInfo ? (winnerInfo.name || winnerInfo.nombre || "Cliente") : "Cliente";
            if (!db.notifications) db.notifications = [];
            db.notifications.unshift({
              text: `🎉 ¡Boleto #${chosen} es un NÚMERO BENDECIDO! Ganador: ${winnerName}`,
              timestamp: Date.now()
            });
          }
          if (generatedAny) {
            db[cfgKey] = JSON.stringify(conf);
          }
        }
      } catch (e) {
        console.error("Error generating auto blessed numbers", e);
      }
    }
  }

  await writeDb(db);
  
  // Detect and log any notifications
  await detectAndLogNotifications(key, oldValue, value);
  
  res.json({ success: true });
});

// Notifications API
app.get('/api/notifications', async (req, res) => {
  // Let this be public so client can show live activity logs feed
  const db = await readDb();
  res.json({ value: db.notifications || [] });
});

// Support API
app.post('/api/support', async (req, res) => {
  const { name, whatsapp, type, message } = req.body;
  if (!name || !whatsapp || !message) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const db = await readDb();
  if (!db.supportMessages) {
    db.supportMessages = [];
  }
  const newMsg = {
    name,
    whatsapp,
    type: type || 'General',
    message,
    timestamp: Date.now()
  };
  db.supportMessages.unshift(newMsg);
  
  // Log a notification for support request too
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    text: `Nueva consulta/queja de ${name}: "${type || 'General'}"`,
    timestamp: Date.now()
  });
  if (db.notifications.length > 50) db.notifications = db.notifications.slice(0, 50);

  await writeDb(db);
  res.json({ success: true, message: newMsg });
});

app.get('/api/support', async (req, res) => {
  if (!await isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const db = await readDb();
  res.json({ value: db.supportMessages || [] });
});

app.post('/api/support/delete', async (req, res) => {
  if (!await isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const { index } = req.body;
  if (index === undefined || index === null) {
    return res.status(400).json({ error: "Missing index" });
  }
  const db = await readDb();
  const messages = db.supportMessages || [];
  const idx = parseInt(index, 10);
  if (idx >= 0 && idx < messages.length) {
    messages.splice(idx, 1);
    db.supportMessages = messages;
    await writeDb(db);
    return res.json({ success: true });
  }
  res.status(400).json({ error: "Invalid index" });
});

// Serve index.html by default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Serve admin.html
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(` Servidor de Suerte RD corriendo en:`);
    console.log(` http://localhost:${PORT}`);
    console.log(` Guardando datos en: ${DATA_FILE}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
