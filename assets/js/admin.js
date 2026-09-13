(async function() {
  "use strict";

  // --- CONFIGURACIÓN Y CONSTANTES ---
  const API_GET_URL = "/api/get";
  const API_SET_URL = "/api/set";

  const TICKETS_KEY_PREFIX = "suerterd:tickets:v2";
  const CFG_KEY_PREFIX = "suerterd:config:v2";
  const RAFFLE_IDS = ["florida5"];

  let activeRaffleId = "florida5";
  let adminPin = sessionStorage.getItem('admin_pin') || localStorage.getItem('admin_pin') || '123456';
  let allTickets = {};
  let lastPendingCount = 0;
  let activeModalGroupKey = null;

  // --- DOM HELPERS ---
  const $ = (id) => document.getElementById(id);

  function safeAddListener(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
  }

  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function formatWhatsAppPhone(phoneStr) {
    if (!phoneStr) return "";
    let clean = String(phoneStr).replace(/\D/g, "");
    if (clean.length === 10 && (clean.startsWith("809") || clean.startsWith("829") || clean.startsWith("849"))) {
      clean = "1" + clean;
    }
    return clean;
  }

  function safeParse(val, fallback = null) {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch(e) { return fallback; }
  }

  // --- AUDIO SOUND NOTIFICATION ---
  let audioCtx = null;
  function playNotificationSound() {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.start(now);
      osc.stop(now + 0.45);
    } catch(e) {
      console.warn("Audio Context block", e);
    }
  }

  // --- VERCEL KV COMMUNICATION ---
  async function getStorageItem(key) {
    try {
      const res = await fetch(`${API_GET_URL}?key=${encodeURIComponent(key)}`, {
        headers: { "x-admin-pin": adminPin }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.value;
    } catch (e) {
      return null;
    }
  }

  async function setStorageItem(key, val) {
    try {
      const res = await fetch(API_SET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": adminPin },
        body: JSON.stringify({ key, value: val })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // --- INICIALIZACIÓN ---
  async function init() {
    await fetchTicketsData();
    setupEventListeners();
    renderPendingPurchases();

    // Background polling every 4 seconds for real-time notifications
    setInterval(pollUpdates, 4000);
  }

  async function fetchTicketsData() {
    for (const rId of RAFFLE_IDS) {
      const raw = await getStorageItem(`${TICKETS_KEY_PREFIX}:${rId}`);
      allTickets[rId] = safeParse(raw, {});
    }
  }

  async function pollUpdates() {
    await fetchTicketsData();
    renderPendingPurchases();
  }

  function setupEventListeners() {
    safeAddListener("globalRaffleSelect", "change", (e) => {
      activeRaffleId = e.target.value;
      renderPendingPurchases();
    });

    safeAddListener("btnTestCreatePurchase", "click", createTestPurchase);
    safeAddListener("btnBulkApprove", "click", bulkApprovePurchases);

    safeAddListener("headerCheckbox", "change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll(".purchase-row-checkbox").forEach(chk => {
        chk.checked = checked;
      });
    });

    safeAddListener("closeReceiptModalBtn", "click", () => {
      if ($("viewReceiptModal")) $("viewReceiptModal").classList.remove("active");
    });

    safeAddListener("btnModalApprove", "click", () => {
      if (activeModalGroupKey) {
        approvePurchaseGroup(activeModalGroupKey);
        if ($("viewReceiptModal")) $("viewReceiptModal").classList.remove("active");
      }
    });

    safeAddListener("btnModalReject", "click", () => {
      if (activeModalGroupKey) {
        rejectPurchaseGroup(activeModalGroupKey);
        if ($("viewReceiptModal")) $("viewReceiptModal").classList.remove("active");
      }
    });
  }

  // --- RENDER PENDING PURCHASES & NOTIFICATIONS ---
  function renderPendingPurchases() {
    const tbody = $("pendingPurchasesTableBody");
    if (!tbody) return;

    const tickets = allTickets[activeRaffleId] || {};
    
    // Group tickets by client/timestamp
    const groups = {};
    Object.keys(tickets).forEach(tNum => {
      const t = tickets[tNum];
      if (t && (t.estado === "esperando_validacion" || t.estado === "reservado")) {
        const groupKey = `${t.timestamp || 0}_${t.whatsapp || 'unknown'}`;
        if (!groups[groupKey]) {
          groups[groupKey] = {
            key: groupKey,
            name: t.name || t.nombre || "Cliente",
            whatsapp: t.whatsapp || "",
            loteria: t.loteria || "Pick 5 Florida",
            comprobante: t.comprobante || null,
            timestamp: t.timestamp || Date.now(),
            estado: t.estado,
            numbers: []
          };
        }
        groups[groupKey].numbers.push(tNum);
        if (t.estado === "esperando_validacion") groups[groupKey].estado = "esperando_validacion";
        if (t.comprobante && !groups[groupKey].comprobante) groups[groupKey].comprobante = t.comprobante;
      }
    });

    const groupKeys = Object.keys(groups);
    const pendingCount = groupKeys.length;

    // Real-Time Sound & Badge Notification Trigger
    if (pendingCount > lastPendingCount) {
      playNotificationSound();
      const alertBanner = $("realtimeAlertBanner");
      if (alertBanner) {
        alertBanner.style.display = "flex";
        if ($("bannerAlertTitle")) $("bannerAlertTitle").textContent = `¡Nuevas Compras Recibidas! (${pendingCount} Pendiente${pendingCount > 1 ? 's' : ''})`;
      }
    } else if (pendingCount === 0) {
      const alertBanner = $("realtimeAlertBanner");
      if (alertBanner) alertBanner.style.display = "none";
    }
    lastPendingCount = pendingCount;

    // Update Sidebar & Metric Badges
    const badge = $("sidebarNotifBadge");
    if (badge) {
      if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }

    let totalPendingAmount = 0;
    groupKeys.forEach(gKey => {
      totalPendingAmount += groups[gKey].numbers.length * 3; // RD$3 por boleto
    });

    if ($("statPendingCount")) $("statPendingCount").textContent = pendingCount;
    if ($("statPendingAmount")) $("statPendingAmount").textContent = `RD$ ${totalPendingAmount.toLocaleString("es-DO")}`;

    // Render Table Rows
    tbody.innerHTML = "";
    if (pendingCount === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center; padding:40px 20px; color:var(--text-muted);">
            <i data-lucide="check-circle" style="width:32px; height:32px; color:var(--green); display:block; margin:0 auto 10px;"></i>
            <div style="font-family:var(--font-heading); font-weight:700; font-size:1.1rem; color:#FFF; margin-bottom:4px;">No hay compras pendientes por activar</div>
            <div style="font-size:0.85rem;">Cuando los clientes realicen pedidos de boletos, aparecerán aquí para tu validación en tiempo real.</div>
          </td>
        </tr>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    groupKeys.forEach(gKey => {
      const g = groups[gKey];
      g.numbers.sort();
      const numsStr = g.numbers.join(",");
      const count = g.numbers.length;
      const amount = count * 3;
      const dateStr = new Date(g.timestamp).toLocaleDateString("es-DO") + " " + new Date(g.timestamp).toLocaleTimeString("es-DO", {hour:'2-digit', minute:'2-digit'});

      let packageBadge = `<span class="badge-tag badge-cyan">🎟️ Lote (${count} Boletos)</span>`;
      if (count === 10) packageBadge = `<span class="badge-tag badge-gold">🥉 Paquete Bronce (10)</span>`;
      else if (count === 25) packageBadge = `<span class="badge-tag badge-cyan">🥈 Paquete Plata (25)</span>`;
      else if (count === 50) packageBadge = `<span class="badge-tag badge-gold">🥇 Paquete Oro (50)</span>`;
      else if (count >= 100) packageBadge = `<span class="badge-tag badge-green">💎 Pack VIP Diamante (${count})</span>`;

      let sampleNums = g.numbers.slice(0, 4).map(n => `#${n}`).join(", ");
      if (count > 4) sampleNums += `... y ${count - 4} más`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:center;">
          <input type="checkbox" class="purchase-row-checkbox" data-key="${gKey}" style="width:18px; height:18px; cursor:pointer;">
        </td>
        <td><strong>Sorteo iPhone 17</strong></td>
        <td>
          ${packageBadge}
          <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px; font-family:var(--font-mono);">${sampleNums}</div>
        </td>
        <td><strong style="color:var(--green); font-family:var(--font-mono); font-size:1rem;">RD$ ${amount.toLocaleString("es-DO")}</strong></td>
        <td><strong>${escapeHtml(g.name)}</strong></td>
        <td>
          <a href="https://wa.me/${formatWhatsAppPhone(g.whatsapp)}" target="_blank" class="btn btn-cyan" style="padding:4px 10px; font-size:0.75rem;">
            <i data-lucide="message-circle" style="width:12px;"></i> ${escapeHtml(g.whatsapp)}
          </a>
        </td>
        <td>
          ${g.comprobante ? `
            <img src="${g.comprobante}" class="btn-zoom-receipt" data-key="${gKey}" style="width:65px; height:65px; object-fit:cover; border-radius:12px; border:2px solid var(--cyan); cursor:pointer; box-shadow:0 0 12px rgba(0,229,255,0.25);" title="Hacer clic para ver en HD">
          ` : '<span style="color:var(--text-muted); font-size:0.8rem;">Sin recibo</span>'}
        </td>
        <td><span class="badge-tag badge-gold">🟡 Esperando Validación</span></td>
        <td style="font-size:0.8rem; color:var(--text-muted);">${dateStr}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-green btn-activate-group" data-key="${gKey}" style="padding:6px 12px; font-size:0.78rem;">
              <i data-lucide="check-circle" style="width:14px;"></i> Activar Boletos
            </button>
            <button class="btn btn-red btn-reject-group" data-key="${gKey}" style="padding:6px 12px; font-size:0.78rem;">
              <i data-lucide="x-circle" style="width:14px;"></i> Rechazar
            </button>
          </div>
        </td>
      `;

      // Zoom Modal trigger
      const imgZoom = tr.querySelector(".btn-zoom-receipt");
      if (imgZoom) {
        imgZoom.addEventListener("click", () => {
          activeModalGroupKey = gKey;
          if ($("modalMetaName")) $("modalMetaName").textContent = g.name;
          if ($("modalMetaPhone")) $("modalMetaPhone").textContent = g.whatsapp;
          if ($("modalMetaTickets")) $("modalMetaTickets").textContent = `${count} Boletos (${sampleNums})`;
          if ($("modalReceiptImg")) $("modalReceiptImg").src = g.comprobante;
          if ($("viewReceiptModal")) $("viewReceiptModal").classList.add("active");
        });
      }

      // Activate Button Handler
      tr.querySelector(".btn-activate-group").addEventListener("click", () => approvePurchaseGroup(gKey));
      tr.querySelector(".btn-reject-group").addEventListener("click", () => rejectPurchaseGroup(gKey));

      tbody.appendChild(tr);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // --- ACTIONS: ACTIVATION & REJECTION ---
  async function approvePurchaseGroup(gKey) {
    const tickets = allTickets[activeRaffleId] || {};
    const groupNums = [];

    Object.keys(tickets).forEach(tNum => {
      const t = tickets[tNum];
      const key = `${t.timestamp || 0}_${t.whatsapp || 'unknown'}`;
      if (key === gKey) {
        tickets[tNum].estado = "pagado";
        groupNums.push(tNum);
      }
    });

    if (groupNums.length === 0) return;

    await setStorageItem(`${TICKETS_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(tickets));

    // Open WhatsApp confirmation message for activation
    const firstTicket = tickets[groupNums[0]];
    const clientName = firstTicket ? (firstTicket.name || firstTicket.nombre || "Cliente") : "Cliente";
    const clientPhone = firstTicket ? firstTicket.whatsapp : "";
    const sampleDisplay = groupNums.length <= 5 ? groupNums.map(n => `#${n}`).join(", ") : groupNums.slice(0, 5).map(n => `#${n}`).join(", ") + `... y ${groupNums.length - 5} más`;

    const textMsg = 
`✅ *SUERTE RD* | *CONFIRMACIÓN DE BOLETOS ACTIVADOS* ✅
═════════════════════════════
🎉 *¡TU PAGO HA SIDO VALIDADO CON ÉXITO POR EL ADMINISTRADOR!* 🎉

👤 *CLIENTE:* ${clientName}
🏆 *SORTEO:* Sorteo Especial iPhone 17 Pro Max 1TB
🎟️ *BOLETOS ACTIVOS (${groupNums.length}):* ${sampleDisplay}

🟢 *ESTADO:* *PAGADOS Y OFICIALMENTE EN RIFA* 🟢
═════════════════════════════
✨ ¡Muchas gracias por tu compra en Suerte RD! Te deseamos la mayor de las suertes. 🍀🔥`;

    if (clientPhone) {
      window.open(`https://wa.me/${formatWhatsAppPhone(clientPhone)}?text=${encodeURIComponent(textMsg)}`, "_blank");
    }

    await fetchTicketsData();
    renderPendingPurchases();
  }

  async function rejectPurchaseGroup(gKey) {
    const reason = prompt("Introduce el motivo del rechazo para notificar al cliente:", "Comprobante no visible o transferencia no recibida");
    if (reason === null) return;

    const tickets = allTickets[activeRaffleId] || {};
    const groupNums = [];
    let clientPhone = "";
    let clientName = "";

    Object.keys(tickets).forEach(tNum => {
      const t = tickets[tNum];
      const key = `${t.timestamp || 0}_${t.whatsapp || 'unknown'}`;
      if (key === gKey) {
        groupNums.push(tNum);
        clientPhone = t.whatsapp;
        clientName = t.name || t.nombre || "Cliente";
        delete tickets[tNum]; // Release numbers
      }
    });

    await setStorageItem(`${TICKETS_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(tickets));

    if (clientPhone) {
      const textMsg = 
`❌ *SUERTE RD* | *NOTIFICACIÓN DE RECHAZO* ❌
═════════════════════════════
👤 *CLIENTE:* ${clientName}
📝 *MOTIVO:* ${reason}

⚠️ Tu orden de boletos ha sido rechazada. Por favor ponte en contacto con soporte enviando un comprobante válido.`;
      window.open(`https://wa.me/${formatWhatsAppPhone(clientPhone)}?text=${encodeURIComponent(textMsg)}`, "_blank");
    }

    await fetchTicketsData();
    renderPendingPurchases();
  }

  async function bulkApprovePurchases() {
    const checkedBoxes = document.querySelectorAll(".purchase-row-checkbox:checked");
    if (checkedBoxes.length === 0) {
      alert("Por favor selecciona al menos una compra en la lista para aprobar.");
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas ACTIVAR las ${checkedBoxes.length} compras seleccionadas?`)) return;

    const tickets = allTickets[activeRaffleId] || {};
    checkedBoxes.forEach(chk => {
      const keyTarget = chk.getAttribute("data-key");
      Object.keys(tickets).forEach(tNum => {
        const t = tickets[tNum];
        const key = `${t.timestamp || 0}_${t.whatsapp || 'unknown'}`;
        if (key === keyTarget) {
          tickets[tNum].estado = "pagado";
        }
      });
    });

    await setStorageItem(`${TICKETS_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(tickets));
    await fetchTicketsData();
    renderPendingPurchases();
  }

  async function createTestPurchase() {
    const tickets = allTickets[activeRaffleId] || {};
    const timestamp = Date.now();
    const testNums = ["00001", "00002", "00003", "00004", "00005", "00006", "00007", "00008", "00009", "00010", "00011", "00012", "00013", "00014", "00015", "00016", "00017", "00018", "00019", "00020", "00021", "00022", "00023", "00024", "00025"];

    testNums.forEach(num => {
      tickets[num] = {
        name: "Carlos Mendoza (Compra de Prueba)",
        nombre: "Carlos Mendoza (Compra de Prueba)",
        whatsapp: "18099838626",
        loteria: "Pick 5 Florida",
        estado: "esperando_validacion",
        comprobante: "./assets/suerte_rd_iphone17_banner.png",
        timestamp: timestamp
      };
    });

    await setStorageItem(`${TICKETS_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(tickets));
    await fetchTicketsData();
    renderPendingPurchases();
  }

  // Run on startup
  init();

})();
