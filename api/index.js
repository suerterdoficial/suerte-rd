const express = require('express');
const fs = require('fs');
const path = require('path');
const { kv } = require('@vercel/kv');
const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const DATA_FILE = path.join(__dirname, '..', 'data.json');
const useKV = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

// Helper to read database
async function readDb() {
  if (useKV) {
    try {
      const data = await kv.get('suerterd_db');
      return data || {};
    } catch (e) {
      console.error("Error reading from Vercel KV, falling back to local file if available", e);
    }
  }
  if (!fs.existsSync(DATA_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw) || {};
  } catch (e) {
    console.error("Error reading data.json, returning empty object", e);
    return {};
  }
}

// Helper to write database
async function writeDb(db) {
  if (useKV) {
    try {
      await kv.set('suerterd_db', db);
      return;
    } catch (e) {
      console.error("Error writing to Vercel KV", e);
    }
  }
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch (e) {
    console.error("Error writing data.json", e);
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
      Object.keys(newTickets).forEach(tNum => {
        const oldT = oldTickets[tNum];
        const newT = newTickets[tNum];

        if (!oldT) {
          messages.push(`¡Boleto #${tNum} reservado por ${newT.name}!`);
        } else if (oldT.estado !== newT.estado) {
          if (newT.estado === 'pagado') {
            messages.push(`Pago confirmado para el boleto #${tNum} (${newT.name})`);
          } else {
            messages.push(`Boleto #${tNum} revertido a estado reservado (${newT.name})`);
          }
        }
      });

      // 3. Check for deletions
      Object.keys(oldTickets).forEach(tNum => {
        if (!newTickets[tNum]) {
          messages.push(`Boleto #${tNum} liberado y disponible nuevamente`);
        }
      });
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

            const buyerName = newTickets[winningTicket].nombre || "Cliente";
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

function getAdminPin() {
  const db = readDb();
  return db['suerterd:admin:pin'] || process.env.ADMIN_PIN || 'SuerteRD2026';
}

function isAdmin(req) {
  return true;
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
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const count = await releaseExpiredTickets();
    res.json({ success: true, count });
  } catch (e) {
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
    if (!isAdmin(req)) {
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
      if (oldTickets[tNum].estado !== newTickets[tNum].estado) {
        needsAdmin = true; // Modifying state requires admin
        break;
      }
    }
    for (const tNum in newTickets) {
      if (!oldTickets[tNum] && newTickets[tNum].estado === 'pagado') {
        needsAdmin = true; // Adding directly as paid requires admin
        break;
      }
    }
  } else {
    needsAdmin = true;
  }

  if (needsAdmin && !isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  db[key] = value;
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
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const db = await readDb();
  res.json({ value: db.supportMessages || [] });
});

app.post('/api/support/delete', async (req, res) => {
  if (!isAdmin(req)) {
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
