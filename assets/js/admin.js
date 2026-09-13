(async function() {
  "use strict";

  const API_GET_URL = "/api/get";
  const API_SET_URL = "/api/set";
  const TICKETS_KEY = "suerterd:tickets:v2";
  const CFG_KEY = "suerterd:config:v2:florida5";

  let adminPin = sessionStorage.getItem('admin_pin') || '';
  let allTickets = {};

  const $ = (id) => document.getElementById(id);

  // --- API ---
  async function getStorageItem(key) {
    try {
      const res = await fetch(`${API_GET_URL}?key=${encodeURIComponent(key)}`, {
        headers: { "x-admin-pin": adminPin || "123456" }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.value;
    } catch(e) { return null; }
  }

  async function setStorageItem(key, val) {
    try {
      const res = await fetch(API_SET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": adminPin || "123456" },
        body: JSON.stringify({ key, value: val })
      });
      return res.ok;
    } catch(e) { return false; }
  }

  function safeParse(val, fallback = null) {
    if (!val) return fallback;
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch(e) { return fallback; }
  }

  function formatPhone(phoneStr) {
    if (!phoneStr) return "";
    let clean = String(phoneStr).replace(/\D/g, "");
    if (clean.length === 10 && (clean.startsWith("809") || clean.startsWith("829") || clean.startsWith("849"))) {
      clean = "1" + clean;
    }
    return clean;
  }

  // --- INICIO ---
  async function init() {
    await reloadData();
    setupTabs();
    setupListeners();

    // Polling cada 4s
    setInterval(reloadData, 4000);
  }

  async function reloadData() {
    const raw = await getStorageItem(TICKETS_KEY);
    allTickets = safeParse(raw, {});
    renderAll();
  }

  function renderAll() {
    renderMetrics();
    renderValidarTable();
    renderBoletosTable();
  }

  // --- METRICAS ---
  function renderMetrics() {
    const soldList = Object.values(allTickets);
    const pendingList = soldList.filter(t => t && (t.estado === "esperando_validacion" || t.estado === "reservado"));
    const paidList = soldList.filter(t => t && t.estado === "pagado");

    const totalIncome = paidList.length * 3; // RD$3

    if ($("metricPending")) $("metricPending").textContent = pendingList.length;
    if ($("metricIncome")) $("metricIncome").textContent = `RD$ ${totalIncome.toLocaleString("es-DO")}`;
    if ($("metricSold")) $("metricSold").textContent = `${soldList.length.toLocaleString("es-DO")} / 100,000`;
  }

  // --- TAB 1: VALIDAR COMPRAS ---
  function renderValidarTable() {
    const body = $("validarTableBody");
    if (!body) return;

    // Agrupar compras por cliente y timestamp
    const groups = {};
    Object.keys(allTickets).forEach(num => {
      const t = allTickets[num];
      if (t && (t.estado === "esperando_validacion" || t.estado === "reservado")) {
        const key = `${t.timestamp || 0}_${t.whatsapp || 'anon'}`;
        if (!groups[key]) {
          groups[key] = {
            key: key,
            name: t.name || t.nombre || "Cliente",
            whatsapp: t.whatsapp || "",
            comprobante: t.comprobante || null,
            numbers: []
          };
        }
        groups[key].numbers.push(num);
      }
    });

    const groupKeys = Object.keys(groups);
    body.innerHTML = "";

    if (groupKeys.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding:30px; color:var(--muted);">
            ✅ No hay compras pendientes por validar. ¡Todo está al día!
          </td>
        </tr>
      `;
      return;
    }

    groupKeys.forEach(gKey => {
      const g = groups[gKey];
      g.numbers.sort();
      const numsStr = g.numbers.join(",");
      const count = g.numbers.length;
      const amount = count * 3;

      let numsDisplay = g.numbers.slice(0, 4).map(n => `#${n}`).join(", ");
      if (count > 4) numsDisplay += `... y ${count - 4} más`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${escapeHtml(g.name)}</strong></td>
        <td>
          <a href="https://wa.me/${formatPhone(g.whatsapp)}" target="_blank" style="color:var(--cyan); text-decoration:none; font-weight:700;">
            📱 ${g.whatsapp || 'Sin WhatsApp'}
          </a>
        </td>
        <td>
          <span style="background:rgba(0,229,255,0.15); color:var(--cyan); padding:3px 8px; border-radius:6px; font-weight:700;">
            🎟️ ${count} Boletos
          </span>
          <div style="font-size:0.75rem; color:var(--muted); margin-top:2px;">${numsDisplay}</div>
        </td>
        <td><strong style="color:var(--green); font-family:var(--font-mono);">RD$ ${amount}</strong></td>
        <td>
          ${g.comprobante ? `
            <img src="${g.comprobante}" class="img-preview-btn" data-img="${g.comprobante}" style="width:55px; height:55px; object-fit:cover; border-radius:8px; border:2px solid var(--cyan); cursor:pointer;" title="Hacer clic para ver foto">
          ` : '<span style="color:var(--muted); font-size:0.8rem;">Sin foto</span>'}
        </td>
        <td><span style="background:rgba(255,215,0,0.15); color:var(--gold); padding:3px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">Por Validar</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-green btn-approve-group" data-key="${gKey}" style="padding:6px 12px; font-size:0.78rem;">
              ✓ Aprobar y Activar
            </button>
            <button class="btn btn-red btn-reject-group" data-key="${gKey}" style="padding:6px 12px; font-size:0.78rem;">
              ✗ Rechazar
            </button>
          </div>
        </td>
      `;

      // Zoom recibo
      const imgBtn = tr.querySelector(".img-preview-btn");
      if (imgBtn) {
        imgBtn.onclick = () => {
          $("modalImg").src = imgBtn.getAttribute("data-img");
          $("receiptModal").classList.add("active");
        };
      }

      // Aprobar / Rechazar
      tr.querySelector(".btn-approve-group").onclick = () => approveGroup(gKey);
      tr.querySelector(".btn-reject-group").onclick = () => rejectGroup(gKey);

      body.appendChild(tr);
    });
  }

  async function approveGroup(gKey) {
    const groupNums = [];
    let clientName = "Cliente";
    let clientPhone = "";

    Object.keys(allTickets).forEach(num => {
      const t = allTickets[num];
      const key = `${t.timestamp || 0}_${t.whatsapp || 'anon'}`;
      if (key === gKey) {
        allTickets[num].estado = "pagado";
        groupNums.push(num);
        clientName = t.name || t.nombre || clientName;
        clientPhone = t.whatsapp || clientPhone;
      }
    });

    if (groupNums.length === 0) return;

    await setStorageItem(TICKETS_KEY, JSON.stringify(allTickets));

    // Abrir WhatsApp con mensaje de confirmación
    const sampleNums = groupNums.slice(0, 5).map(n => `#${n}`).join(", ");
    const textMsg = 
`✅ *SUERTE RD* | *CONFIRMACIÓN DE BOLETOS ACTIVADOS* ✅
═════════════════════════════
🎉 *¡TU PAGO HA SIDO VALIDADO CON ÉXITO!* 🎉

👤 *CLIENTE:* ${clientName}
🎟️ *BOLETOS ACTIVOS (${groupNums.length}):* ${sampleNums}

🟢 *ESTADO:* *PAGADOS Y ACTIVOS EN RIFA* 🟢
═════════════════════════════
✨ ¡Muchas gracias por tu compra en Suerte RD! Te deseamos la mayor de las suertes. 🍀🔥`;

    if (clientPhone) {
      window.open(`https://wa.me/${formatPhone(clientPhone)}?text=${encodeURIComponent(textMsg)}`, "_blank");
    }

    await reloadData();
  }

  async function rejectGroup(gKey) {
    const reason = prompt("Motivo del rechazo:", "Comprobante ilegible o pago no recibido");
    if (reason === null) return;

    let clientPhone = "";
    Object.keys(allTickets).forEach(num => {
      const t = allTickets[num];
      const key = `${t.timestamp || 0}_${t.whatsapp || 'anon'}`;
      if (key === gKey) {
        clientPhone = t.whatsapp;
        delete allTickets[num];
      }
    });

    await setStorageItem(TICKETS_KEY, JSON.stringify(allTickets));

    if (clientPhone) {
      const textMsg = `❌ *SUERTE RD* | Tu orden de boletos ha sido rechazada. Motivo: ${reason}. Por favor contacta con soporte.`;
      window.open(`https://wa.me/${formatPhone(clientPhone)}?text=${encodeURIComponent(textMsg)}`, "_blank");
    }

    await reloadData();
  }

  async function createTestOrder() {
    const testNums = ["00001", "00002", "00003", "00004", "00005", "00006", "00007", "00008", "00009", "00010"];
    const timestamp = Date.now();

    testNums.forEach(num => {
      allTickets[num] = {
        name: "Juan Pérez (Cliente de Prueba)",
        whatsapp: "18099838626",
        estado: "esperando_validacion",
        comprobante: "./assets/suerte_rd_iphone17_banner.png",
        timestamp: timestamp
      };
    });

    await setStorageItem(TICKETS_KEY, JSON.stringify(allTickets));
    await reloadData();
  }

  // --- TAB 2: BOLETOS ---
  function renderBoletosTable() {
    const body = $("boletosTableBody");
    if (!body) return;

    const query = $("ticketSearch") ? $("ticketSearch").value.trim().toLowerCase() : "";
    const ticketNums = Object.keys(allTickets).sort();

    body.innerHTML = "";
    let count = 0;

    for (const num of ticketNums) {
      const t = allTickets[num];
      const name = t.name || t.nombre || "";
      const phone = t.whatsapp || "";
      const state = t.estado || "reservado";

      if (query && !num.includes(query) && !name.toLowerCase().includes(query) && !phone.includes(query)) continue;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family:var(--font-mono); font-weight:700; color:var(--cyan);">#${num}</td>
        <td><strong>${escapeHtml(name || 'Sin nombre')}</strong></td>
        <td>${phone ? `<a href="https://wa.me/${formatPhone(phone)}" target="_blank" style="color:var(--cyan); text-decoration:none;">${phone}</a>` : 'N/A'}</td>
        <td>
          <span style="background:${state === 'pagado' ? 'rgba(0,230,118,0.15)' : 'rgba(255,215,0,0.15)'}; color:${state === 'pagado' ? 'var(--green)' : 'var(--gold)'}; padding:3px 8px; border-radius:6px; font-weight:700; font-size:0.75rem;">
            ${state === 'pagado' ? 'Pagado' : 'Reservado'}
          </span>
        </td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-green btn-pay" data-num="${num}" style="padding:4px 8px; font-size:0.75rem;">
              ${state === 'pagado' ? 'Marcar Reservado' : 'Marcar Pagado'}
            </button>
            <button class="btn btn-red btn-del" data-num="${num}" style="padding:4px 8px; font-size:0.75rem;">
              Liberar
            </button>
          </div>
        </td>
      `;

      tr.querySelector(".btn-pay").onclick = async () => {
        allTickets[num].estado = (state === "pagado") ? "reservado" : "pagado";
        await setStorageItem(TICKETS_KEY, JSON.stringify(allTickets));
        reloadData();
      };

      tr.querySelector(".btn-del").onclick = async () => {
        delete allTickets[num];
        await setStorageItem(TICKETS_KEY, JSON.stringify(allTickets));
        reloadData();
      };

      body.appendChild(tr);
      count++;
      if (!query && count >= 200) break;
    }

    if (count === 0) {
      body.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--muted);">No hay boletos que coincidan.</td></tr>`;
    }
  }

  // --- TABS Y LISTENERS ---
  function setupTabs() {
    const btns = document.querySelectorAll(".tab-btn");
    btns.forEach(btn => {
      btn.onclick = () => {
        btns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const target = btn.getAttribute("data-tab");
        document.querySelectorAll(".pane").forEach(p => p.classList.remove("active"));
        if ($(target)) $(target).classList.add("active");
      };
    });
  }

  function setupListeners() {
    safeAddListener("btnCreateTest", "click", createTestOrder);
    safeAddListener("ticketSearch", "input", renderBoletosTable);

    safeAddListener("btnSaveConfig", "click", async () => {
      const title = $("cfgTitle").value.trim();
      const prize = $("cfgPrize").value.trim();
      await setStorageItem(CFG_KEY, JSON.stringify({ id: "florida5", title, prize, price: "RD$3", total: 100000 }));
      alert("¡Configuración guardada!");
    });

    safeAddListener("btnLogout", "click", () => {
      sessionStorage.removeItem("admin_pin");
      window.location.reload();
    });
  }

  // --- AUTH LOGIN ---
  function checkAuth() {
    const overlay = $("loginOverlay");
    const pin = sessionStorage.getItem("admin_pin");

    if (pin === "123456" || pin === "SoyArte(20251975)" || pin === "SuerteRD2026") {
      adminPin = pin;
      if (overlay) overlay.style.display = "none";
      init();
    } else {
      if (overlay) overlay.style.display = "flex";
      const submitBtn = $("btnLoginSubmit");
      const pinInput = $("pinInput");

      const doLogin = () => {
        const val = pinInput.value.trim();
        if (val === "123456" || val === "SoyArte(20251975)" || val === "SuerteRD2026") {
          adminPin = val;
          sessionStorage.setItem("admin_pin", val);
          if (overlay) overlay.style.display = "none";
          init();
        } else {
          $("loginErr").style.display = "block";
          $("loginErr").textContent = "Contraseña de seguridad incorrecta.";
        }
      };

      if (submitBtn) submitBtn.onclick = doLogin;
      if (pinInput) pinInput.onkeydown = (e) => { if (e.key === "Enter") doLogin(); };
    }
  }

  checkAuth();

})();
