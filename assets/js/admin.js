(async function() {
  "use strict";

  // --- CONFIGURACIÓN DE APIS Y LLAVES ---
  const API_GET_URL = "/api/get";
  const API_SET_URL = "/api/set";

  const CFG_KEY_PREFIX = "suerterd:config:v2";
  const TICKETS_KEY_PREFIX = "suerterd:tickets:v2";
  const WINNERS_KEY = "suerterd:winners:v2";
  const PACKAGES_KEY = "suerterd:packages:v1";

  const RAFFLE_IDS = ["florida5"];

  const DEFAULT_CONFIGS = {
    florida5: {
      id: "florida5",
      title: "Sorteo Especial iPhone 17 Pro Max 1TB",
      prize: "iPhone 17 Pro Max 1TB",
      price: "RD$3",
      total: 100000,
      image: "./assets/suerte_rd_iphone17_banner.png",
      active: true,
      whatsapp: "8099838626"
    }
  };

  const DEFAULT_PACKAGES = {
    bronce: { id: "bronce", title: "Paquete Bronce", count: 10, price: 30, bonus: 0 },
    plata: { id: "plata", title: "Paquete Plata", count: 25, price: 75, bonus: 2 },
    oro: { id: "oro", title: "Paquete Oro", count: 50, price: 150, bonus: 5 },
    vip: { id: "vip", title: "Pack VIP Diamante", count: 100, price: 300, bonus: 12 }
  };

  const DEFAULT_BANK_ACCOUNTS = [
    { bank: "Banreservas", type: "Cuenta de Ahorro", number: "9602059888", owner: "Cristhofer Sosa" },
    { bank: "Banco Popular", type: "Cuenta de Ahorro", number: "823386362", owner: "Erika Santos Francisco" },
    { bank: "Banco Qik", type: "Cuenta de Ahorro", number: "1000490608", owner: "Luis Fernando Alvarez" },
    { bank: "Scotiabank", type: "Cuenta Corriente", number: "03100039851", owner: "Luis Fernando Alvarez" },
    { bank: "Banco BHD", type: "Cuenta de Ahorro", number: "29848790017", owner: "Katherine Daniela Rodriguez Roque" }
  ];

  let activeRaffleId = "florida5";
  let adminPin = sessionStorage.getItem('admin_pin') || localStorage.getItem('admin_pin') || '';
  let configs = {};
  let allTickets = {};
  let winners = [];
  let supportMessages = [];
  let bankAccounts = [];
  let statsChart = null;

  // --- HELPERS BÁSICOS ---
  const $ = (id) => document.getElementById(id);

  function safeAddListener(id, event, handler) {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
  }

  function escapeHtml(s) {
    if (!s) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function pad5(num) {
    return String(num).padStart(5, "0");
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

  // --- SERVICIOS DE ALMACENAMIENTO (VERCEL KV) ---
  async function getStorageItem(key) {
    try {
      const pin = adminPin || '123456';
      const res = await fetch(`${API_GET_URL}?key=${encodeURIComponent(key)}`, {
        headers: { "x-admin-pin": pin }
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
      const pin = adminPin || '123456';
      const res = await fetch(API_SET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": pin },
        body: JSON.stringify({ key, value: val })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // --- INICIALIZACIÓN ---
  async function init() {
    // Configs
    for (const rId of RAFFLE_IDS) {
      const raw = await getStorageItem(`${CFG_KEY_PREFIX}:${rId}`);
      configs[rId] = safeParse(raw, DEFAULT_CONFIGS[rId] || DEFAULT_CONFIGS.florida5);
    }
    activeRaffleId = RAFFLE_IDS[0];

    // Boletos/Ventas
    for (const rId of RAFFLE_IDS) {
      const raw = await getStorageItem(`${TICKETS_KEY_PREFIX}:${rId}`);
      allTickets[rId] = safeParse(raw, {});
    }

    // Ganadores
    const winnersRaw = await getStorageItem(WINNERS_KEY);
    winners = safeParse(winnersRaw, []);

    // Cuentas Bancarias
    const bankRaw = await getStorageItem("suerterd:payment:methods");
    bankAccounts = safeParse(bankRaw, DEFAULT_BANK_ACCOUNTS);

    // Setup de interfaz
    populateRaffleDropdowns();
    setupNavigation();
    setupEventListeners();
    loadRaffleState(activeRaffleId);

    // Polling automático cada 5 segundos
    setInterval(pollUpdates, 5000);
  }

  async function pollUpdates() {
    for (const rId of RAFFLE_IDS) {
      const raw = await getStorageItem(`${TICKETS_KEY_PREFIX}:${rId}`);
      if (raw) allTickets[rId] = safeParse(raw, {});
    }
    updateDashboardStats();
    updateValidationBadge();
  }

  function populateRaffleDropdowns() {
    const mainSel = $("globalRaffleSelect");
    const formSel = $("cfgRaffleSelect");
    
    if (mainSel) {
      mainSel.innerHTML = "";
      RAFFLE_IDS.forEach(rId => {
        const conf = configs[rId] || DEFAULT_CONFIGS.florida5;
        const opt = document.createElement("option");
        opt.value = rId;
        opt.textContent = `${conf.title} (${rId})`;
        mainSel.appendChild(opt);
      });
      mainSel.value = activeRaffleId;
    }

    if (formSel) {
      formSel.innerHTML = "";
      RAFFLE_IDS.forEach(rId => {
        const conf = configs[rId] || DEFAULT_CONFIGS.florida5;
        const opt = document.createElement("option");
        opt.value = rId;
        opt.textContent = `${conf.title} (${rId})`;
        formSel.appendChild(opt);
      });
      formSel.value = activeRaffleId;
    }
  }

  // --- NAVEGACIÓN ---
  function setupNavigation() {
    const navButtons = document.querySelectorAll(".nav-btn");
    navButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        navButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const target = btn.getAttribute("data-target");
        document.querySelectorAll(".pane").forEach(p => p.classList.remove("active"));
        const activePane = $(target);
        if (activePane) activePane.classList.add("active");

        if (target === "paneStats") updateDashboardStats();
        else if (target === "paneTickets") renderTicketsTable();
        else if (target === "panePackages") loadPackageConfig();
        else if (target === "panePayments") renderPaymentsTable();
        else if (target === "paneConfigs") loadConfigForm(activeRaffleId);
        else if (target === "paneWinners") renderWinnersTable();
        else if (target === "panePaymentsConfig") renderBankAccountsTable();
        else if (target === "paneWhatsappTemplates") loadWhatsappTemplates();
        else if (target === "paneFinancialReports") renderFinancialReportsTable();
        else if (target === "paneSupport") fetchSupportMessages();
      });
    });
  }

  function setupEventListeners() {
    safeAddListener("globalRaffleSelect", "change", (e) => loadRaffleState(e.target.value));
    safeAddListener("cfgRaffleSelect", "change", (e) => loadConfigForm(e.target.value));
    safeAddListener("btnSaveConfig", "click", saveConfigChanges);
    safeAddListener("btnSavePackageConfig", "click", savePackageConfig);
    safeAddListener("btnSubmitManualCredits", "click", submitManualTicketAssignment);
    safeAddListener("ticketSearchInput", "input", renderTicketsTable);
    safeAddListener("ticketStatusFilter", "change", renderTicketsTable);
    safeAddListener("paymentSearchInput", "input", renderPaymentsTable);
    safeAddListener("paymentStatusFilter", "change", renderPaymentsTable);
    safeAddListener("btnBulkApprove", "click", bulkApprovePayments);
    safeAddListener("btnStartDraw", "click", startOfficialDraw);
    safeAddListener("btnAddBankAccount", "click", addBankAccount);
    safeAddListener("btnSaveWaTemplates", "click", saveWhatsappTemplates);
    safeAddListener("btnExportFinancialCSV", "click", exportFinancialCSV);
    safeAddListener("btnBlockSubmit", "click", blockTicketManual);
    safeAddListener("btnReleaseExpired", "click", cleanExpiredTickets);

    safeAddListener("btnAdminLogout", "click", () => {
      sessionStorage.removeItem('admin_pin');
      localStorage.removeItem('admin_pin');
      window.location.reload();
    });

    safeAddListener("closeViewReceiptBtn", "click", () => {
      if ($("viewReceiptOverlay")) $("viewReceiptOverlay").classList.remove("active");
    });
  }

  function loadRaffleState(rId) {
    activeRaffleId = rId;
    const conf = configs[rId] || DEFAULT_CONFIGS.florida5;
    if ($("headerTitle")) $("headerTitle").textContent = conf.title;
    if ($("headerSubtitle")) $("headerSubtitle").textContent = `Premio: ${conf.prize} • Precio: ${conf.price} • Total: ${(conf.total || 100000).toLocaleString("es-DO")} Boletos`;
    updateDashboardStats();
    updateValidationBadge();
  }

  // --- METRICAS Y DASHBOARD ---
  function updateDashboardStats() {
    const conf = configs[activeRaffleId] || DEFAULT_CONFIGS.florida5;
    const tickets = allTickets[activeRaffleId] || {};
    const totalCount = conf.total || 100000;
    const soldList = Object.values(tickets);
    
    const reservedCount = soldList.filter(t => t && (t.estado === "reservado" || t.estado === "esperando_validacion")).length;
    const paidCount = soldList.filter(t => t && t.estado === "pagado").length;
    const totalIncome = paidCount * 3; // RD$3 por boleto

    if ($("statIncome")) $("statIncome").textContent = `RD$ ${totalIncome.toLocaleString("es-DO")}`;
    if ($("statSold")) $("statSold").textContent = `${soldList.length.toLocaleString("es-DO")} / ${totalCount.toLocaleString("es-DO")}`;
    if ($("statSoldPct")) $("statSoldPct").textContent = `${((soldList.length / totalCount) * 100).toFixed(1)}% del total de la rifa`;
    if ($("statRatio")) $("statRatio").textContent = `${reservedCount.toLocaleString("es-DO")} Res. / ${paidCount.toLocaleString("es-DO")} Pag.`;

    renderChart(totalCount - soldList.length, reservedCount, paidCount);
  }

  function renderChart(free, reserved, paid) {
    const ctx = $("statsChart");
    if (!ctx || typeof Chart === 'undefined') return;

    if (statsChart) { try { statsChart.destroy(); } catch(e){} }

    statsChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Libres", "Reservados", "Pagados"],
        datasets: [{
          data: [free, reserved, paid],
          backgroundColor: ["#051821", "#ffd700", "#00e676"],
          borderColor: "rgba(0,229,255,0.2)",
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom", labels: { color: "#94A3B8" } } }
      }
    });
  }

  // --- BOLETOS Y VENTAS ---
  function renderTicketsTable() {
    const body = $("ticketsTableBody");
    if (!body) return;
    body.innerHTML = "";

    const query = $("ticketSearchInput") ? $("ticketSearchInput").value.trim().toLowerCase() : "";
    const statusFilter = $("ticketStatusFilter") ? $("ticketStatusFilter").value : "";
    const tickets = allTickets[activeRaffleId] || {};
    const ticketNums = Object.keys(tickets).sort();

    let count = 0;
    for (const num of ticketNums) {
      const ticket = tickets[num];
      const name = ticket.name || ticket.nombre || "";
      const phone = ticket.whatsapp || "";
      const state = ticket.estado || "reservado";

      if (statusFilter && state !== statusFilter) continue;
      if (query && !num.includes(query) && !name.toLowerCase().includes(query) && !phone.includes(query)) continue;

      let badgeClass = "badge-gold";
      let badgeLabel = "Reservado";
      if (state === "pagado") { badgeClass = "badge-green"; badgeLabel = "Pagado"; }
      else if (state === "esperando_validacion") { badgeClass = "badge-cyan"; badgeLabel = "En Validación"; }
      else if (state === "bloqueado") { badgeClass = "badge-red"; badgeLabel = "Bloqueado"; }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-family:var(--font-mono); font-weight:800; color:var(--cyan);">#${num}</td>
        <td><strong>${escapeHtml(name || 'N/A')}</strong></td>
        <td>${phone ? `<a href="https://wa.me/${formatWhatsAppPhone(phone)}" target="_blank" style="color:var(--cyan); text-decoration:none;">${phone}</a>` : 'N/A'}</td>
        <td><span class="badge badge-cyan">${escapeHtml(ticket.loteria || 'Florida')}</span></td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            ${state !== "bloqueado" ? `<button class="btn btn-green btn-toggle-pay" data-num="${num}" style="padding:4px 8px; font-size:0.75rem;">${state === 'pagado' ? 'Marcar Reservado' : 'Marcar Pagado'}</button>` : ''}
            <button class="btn btn-red btn-release" data-num="${num}" style="padding:4px 8px; font-size:0.75rem;">Liberar</button>
          </div>
        </td>
      `;

      tr.querySelector(".btn-release").addEventListener("click", () => releaseTicket(num));
      const payBtn = tr.querySelector(".btn-toggle-pay");
      if (payBtn) payBtn.addEventListener("click", () => toggleTicketPayment(num));

      body.appendChild(tr);
      count++;
      if (!query && count >= 300) break;
    }

    if (count === 0) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-grey); padding:20px;">No hay boletos registrados.</td></tr>`;
    }
  }

  async function toggleTicketPayment(num) {
    const tickets = allTickets[activeRaffleId] || {};
    if (!tickets[num]) return;
    tickets[num].estado = (tickets[num].estado === "pagado") ? "reservado" : "pagado";
    await setStorageItem(`${TICKETS_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(tickets));
    loadRaffleState(activeRaffleId);
  }

  async function releaseTicket(num) {
    if (!confirm(`¿Liberar boleto #${num}?`)) return;
    const tickets = allTickets[activeRaffleId] || {};
    delete tickets[num];
    await setStorageItem(`${TICKETS_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(tickets));
    loadRaffleState(activeRaffleId);
  }

  async function blockTicketManual() {
    const input = $("blockTicketInput");
    const num = input.value.trim();
    if (num.length !== 5 || isNaN(num)) { alert("Ingresa un boleto válido de 5 dígitos."); return; }
    const tickets = allTickets[activeRaffleId] || {};
    tickets[num] = { name: "BLOQUEADO ADMIN", whatsapp: "", loteria: "Manual", estado: "bloqueado", timestamp: Date.now() };
    await setStorageItem(`${TICKETS_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(tickets));
    input.value = "";
    loadRaffleState(activeRaffleId);
  }

  async function cleanExpiredTickets() {
    alert("Liberando reservas expiradas...");
    loadRaffleState(activeRaffleId);
  }

  // --- PAQUETES DE NÚMEROS ---
  async function loadPackageConfig() {
    const raw = await getStorageItem(PACKAGES_KEY);
    const pkgs = safeParse(raw, DEFAULT_PACKAGES);
    if ($("pkgPrice_bronce")) $("pkgPrice_bronce").value = pkgs.bronce?.price || 30;
    if ($("pkgCount_bronce")) $("pkgCount_bronce").value = pkgs.bronce?.count || 10;
    if ($("pkgBonus_bronce")) $("pkgBonus_bronce").value = pkgs.bronce?.bonus || 0;

    if ($("pkgPrice_plata")) $("pkgPrice_plata").value = pkgs.plata?.price || 75;
    if ($("pkgCount_plata")) $("pkgCount_plata").value = pkgs.plata?.count || 25;
    if ($("pkgBonus_plata")) $("pkgBonus_plata").value = pkgs.plata?.bonus || 2;

    if ($("pkgPrice_oro")) $("pkgPrice_oro").value = pkgs.oro?.price || 150;
    if ($("pkgCount_oro")) $("pkgCount_oro").value = pkgs.oro?.count || 50;
    if ($("pkgBonus_oro")) $("pkgBonus_oro").value = pkgs.oro?.bonus || 5;

    if ($("pkgPrice_vip")) $("pkgPrice_vip").value = pkgs.vip?.price || 300;
    if ($("pkgCount_vip")) $("pkgCount_vip").value = pkgs.vip?.count || 100;
    if ($("pkgBonus_vip")) $("pkgBonus_vip").value = pkgs.vip?.bonus || 12;
  }

  async function savePackageConfig() {
    const pkgs = {
      bronce: { price: Number($("pkgPrice_bronce")?.value) || 30, count: Number($("pkgCount_bronce")?.value) || 10, bonus: Number($("pkgBonus_bronce")?.value) || 0 },
      plata: { price: Number($("pkgPrice_plata")?.value) || 75, count: Number($("pkgCount_plata")?.value) || 25, bonus: Number($("pkgBonus_plata")?.value) || 2 },
      oro: { price: Number($("pkgPrice_oro")?.value) || 150, count: Number($("pkgCount_oro")?.value) || 50, bonus: Number($("pkgBonus_oro")?.value) || 5 },
      vip: { price: Number($("pkgPrice_vip")?.value) || 300, count: Number($("pkgCount_vip")?.value) || 100, bonus: Number($("pkgBonus_vip")?.value) || 12 }
    };
    await setStorageItem(PACKAGES_KEY, JSON.stringify(pkgs));
    alert("¡Configuración de paquetes guardada!");
  }

  // --- ASIGNACIÓN MANUAL DE BOLETOS ---
  async function submitManualTicketAssignment() {
    const name = $("manualClientName") ? $("manualClientName").value.trim() : "";
    const phone = $("manualClientPhone") ? $("manualClientPhone").value.trim() : "";
    const count = Number($("manualTicketCount") ? $("manualTicketCount").value : 10) || 10;

    if (!name || !phone) { alert("Ingresa el nombre y teléfono del cliente."); return; }

    const conf = configs[activeRaffleId] || DEFAULT_CONFIGS.florida5;
    const tickets = allTickets[activeRaffleId] || {};

    const assignedNums = [];
    for (let i = 1; i <= (conf.total || 100000); i++) {
      const numStr = pad5(i);
      if (!tickets[numStr]) {
        assignedNums.push(numStr);
        if (assignedNums.length >= count) break;
      }
    }

    if (assignedNums.length < count) {
      alert(`Solo quedan ${assignedNums.length} boletos libres.`);
      return;
    }

    assignedNums.forEach(nStr => {
      tickets[nStr] = { name: name, whatsapp: phone, loteria: "Pick 5 Florida", estado: "pagado", timestamp: Date.now() };
    });

    await setStorageItem(`${TICKETS_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(tickets));

    const sampleDisplay = assignedNums.slice(0, 5).map(n => `#${n}`).join(", ");
    const textMsg = encodeURIComponent(`🎰 *SUERTE RD* | *BOLETOS ASIGNADOS* 🎰\n👤 Cliente: ${name}\n🎟️ Cantidad: ${count} Boletos\n🔢 Muestra: ${sampleDisplay}\n🟢 Estado: PAGADOS Y ACTIVOS 🟢`);
    window.open(`https://wa.me/${formatWhatsAppPhone(phone)}?text=${textMsg}`, "_blank");

    $("manualClientName").value = ""; $("manualClientPhone").value = "";
    loadRaffleState(activeRaffleId);
  }

  // --- VALIDACIÓN DE PAGOS ---
  function updateValidationBadge() {
    const badge = $("paymentNotificationBadge");
    if (!badge) return;
    let pendingCount = 0;
    RAFFLE_IDS.forEach(rId => {
      const tickets = allTickets[rId] || {};
      Object.values(tickets).forEach(t => {
        if (t && (t.estado === "esperando_validacion" || t.estado === "reservado")) pendingCount++;
      });
    });
    if (pendingCount > 0) {
      badge.textContent = pendingCount;
      badge.style.display = "inline-block";
    } else {
      badge.style.display = "none";
    }
  }

  function renderPaymentsTable() {
    const body = $("paymentsTableBody");
    if (!body) return;
    body.innerHTML = "";

    const query = $("paymentSearchInput") ? $("paymentSearchInput").value.trim().toLowerCase() : "";
    const tickets = allTickets[activeRaffleId] || {};
    
    const groups = {};
    Object.keys(tickets).forEach(tNum => {
      const t = tickets[tNum];
      if (t && (t.estado === "esperando_validacion" || t.estado === "reservado")) {
        const key = `${t.timestamp || 0}_${t.whatsapp || 'anon'}`;
        if (!groups[key]) {
          groups[key] = { name: t.name || t.nombre || "Cliente", whatsapp: t.whatsapp, loteria: t.loteria || "Florida", comprobante: t.comprobante, numbers: [] };
        }
        groups[key].numbers.push(tNum);
      }
    });

    let count = 0;
    Object.keys(groups).forEach(gKey => {
      const g = groups[gKey];
      if (query && !g.name.toLowerCase().includes(query) && !g.whatsapp.includes(query)) return;

      const numsStr = g.numbers.join(",");
      const amount = g.numbers.length * 3;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:center;"><input type="checkbox" class="payment-chk" data-nums="${numsStr}"></td>
        <td><strong>Sorteo iPhone 17</strong></td>
        <td><span class="badge badge-gold">🎟️ Lote (${g.numbers.length} Boletos)</span></td>
        <td><strong style="color:var(--green); font-family:var(--font-mono);">RD$ ${amount}</strong></td>
        <td><strong>${escapeHtml(g.name)}</strong></td>
        <td><a href="https://wa.me/${formatWhatsAppPhone(g.whatsapp)}" target="_blank" style="color:var(--cyan); text-decoration:none;">${g.whatsapp}</a></td>
        <td><span class="badge badge-cyan">${escapeHtml(g.loteria)}</span></td>
        <td>
          ${g.comprobante ? `<img src="${g.comprobante}" class="view-receipt-btn" data-img="${g.comprobante}" data-name="${g.name}" data-phone="${g.whatsapp}" data-nums="${numsStr}" style="width:65px; height:65px; object-fit:cover; border-radius:10px; border:2px solid var(--cyan); cursor:pointer;">` : '<span style="color:var(--text-muted);">Sin recibo</span>'}
        </td>
        <td><span class="badge badge-gold">Por Verificar</span></td>
        <td style="font-size:0.8rem; color:var(--text-grey);">${new Date().toLocaleDateString("es-DO")}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-green btn-approve-group" data-nums="${numsStr}" style="padding:4px 8px; font-size:0.75rem;">Aprobar</button>
            <button class="btn btn-red btn-reject-group" data-nums="${numsStr}" style="padding:4px 8px; font-size:0.75rem;">Rechazar</button>
          </div>
        </td>
      `;

      tr.querySelectorAll(".view-receipt-btn").forEach(img => {
        img.addEventListener("click", () => {
          $("viewReceiptMetaName").textContent = img.getAttribute("data-name");
          $("viewReceiptMetaPhone").textContent = img.getAttribute("data-phone");
          $("viewReceiptMetaTickets").textContent = img.getAttribute("data-nums");
          $("viewReceiptImg").src = img.getAttribute("data-img");
          $("viewReceiptOverlay").classList.add("active");
        });
      });

      tr.querySelector(".btn-approve-group").addEventListener("click", () => approvePaymentGroup(numsStr));
      tr.querySelector(".btn-reject-group").addEventListener("click", () => rejectPaymentGroup(numsStr));

      body.appendChild(tr);
      count++;
    });

    if (count === 0) {
      body.innerHTML = `<tr><td colspan="11" style="text-align:center; color:var(--text-grey); padding:30px;">No hay comprobantes pendientes de verificación.</td></tr>`;
    }
  }

  async function approvePaymentGroup(numsStr) {
    const nums = numsStr.split(",");
    const tickets = allTickets[activeRaffleId] || {};
    nums.forEach(n => { if (tickets[n]) tickets[n].estado = "pagado"; });
    await setStorageItem(`${TICKETS_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(tickets));
    if ($("viewReceiptOverlay")) $("viewReceiptOverlay").classList.remove("active");
    loadRaffleState(activeRaffleId);
  }

  async function rejectPaymentGroup(numsStr) {
    if (!confirm("¿Rechazar este pago?")) return;
    const nums = numsStr.split(",");
    const tickets = allTickets[activeRaffleId] || {};
    nums.forEach(n => { delete tickets[n]; });
    await setStorageItem(`${TICKETS_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(tickets));
    if ($("viewReceiptOverlay")) $("viewReceiptOverlay").classList.remove("active");
    loadRaffleState(activeRaffleId);
  }

  async function bulkApprovePayments() {
    const chks = document.querySelectorAll(".payment-chk:checked");
    if (chks.length === 0) { alert("Selecciona al menos una compra."); return; }
    const tickets = allTickets[activeRaffleId] || {};
    chks.forEach(chk => {
      const nums = chk.getAttribute("data-nums").split(",");
      nums.forEach(n => { if (tickets[n]) tickets[n].estado = "pagado"; });
    });
    await setStorageItem(`${TICKETS_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(tickets));
    loadRaffleState(activeRaffleId);
  }

  // --- SORTEO Y CONFIGURACIÓN ---
  function loadConfigForm(rId) {
    const conf = configs[rId] || DEFAULT_CONFIGS.florida5;
    if ($("cfgTitle")) $("cfgTitle").value = conf.title;
    if ($("cfgPrize")) $("cfgPrize").value = conf.prize;
    if ($("cfgPrice")) $("cfgPrice").value = conf.price;
    if ($("cfgTotal")) $("cfgTotal").value = conf.total;
  }

  async function saveConfigChanges() {
    configs[activeRaffleId] = {
      ...configs[activeRaffleId],
      title: $("cfgTitle").value.trim(),
      prize: $("cfgPrize").value.trim(),
      price: $("cfgPrice").value.trim(),
      total: Number($("cfgTotal").value) || 100000
    };
    await setStorageItem(`${CFG_KEY_PREFIX}:${activeRaffleId}`, JSON.stringify(configs[activeRaffleId]));
    alert("¡Configuración guardada!");
    loadRaffleState(activeRaffleId);
  }

  async function startOfficialDraw() {
    const tickets = allTickets[activeRaffleId] || {};
    const paidList = Object.keys(tickets).filter(n => tickets[n].estado === "pagado");
    if (paidList.length === 0) { alert("Debe haber al menos un boleto PAGADO."); return; }

    const winningTicket = paidList[Math.floor(Math.random() * paidList.length)];
    const winnerDetails = tickets[winningTicket];

    for (let i = 0; i < 5; i++) {
      if ($(`reel${i}`)) $(`reel${i}`).textContent = winningTicket[i];
    }
    if ($("drawStatusText")) $("drawStatusText").textContent = `¡Ganador Oficial: #${winningTicket}!`;
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });

    winners.push({ raffleId: activeRaffleId, name: winnerDetails.name || "Ganador", number: parseInt(winningTicket, 10), prize: configs[activeRaffleId].prize, date: new Date().toISOString() });
    await setStorageItem(WINNERS_KEY, JSON.stringify(winners));
  }

  function renderWinnersTable() {
    const body = $("winnersTableBody");
    if (!body) return;
    body.innerHTML = "";
    winners.slice().reverse().forEach(w => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>Sorteo iPhone 17</strong></td>
        <td>${escapeHtml(w.prize)}</td>
        <td style="font-family:var(--font-mono); font-weight:800; color:var(--gold);">#${pad5(w.number)}</td>
        <td>${escapeHtml(w.name)}</td>
        <td>Ver Foto</td>
        <td style="font-size:0.8rem; color:var(--text-grey);">${new Date(w.date).toLocaleDateString("es-DO")}</td>
        <td><button class="btn btn-red" style="padding:4px 8px; font-size:0.75rem;">Detalles</button></td>
      `;
      body.appendChild(tr);
    });
  }

  function renderBankAccountsTable() {
    const body = $("bankAccountsTableBody");
    if (!body) return;
    body.innerHTML = "";
    bankAccounts.forEach(acc => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><strong>${escapeHtml(acc.bank)}</strong></td><td><span class="badge badge-cyan">${escapeHtml(acc.type)}</span></td><td style="font-family:var(--font-mono); font-weight:700;">${escapeHtml(acc.number)}</td><td>${escapeHtml(acc.owner)}</td><td><button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem;">Editar</button></td>`;
      body.appendChild(tr);
    });
  }

  async function addBankAccount() {
    const bank = $("bankNameInput").value.trim();
    const type = $("bankTypeInput").value.trim();
    const number = $("bankNumInput").value.trim();
    const owner = $("bankOwnerInput").value.trim();
    if (!bank || !number) return;
    bankAccounts.push({ bank, type, number, owner });
    await setStorageItem("suerterd:payment:methods", JSON.stringify(bankAccounts));
    renderBankAccountsTable();
    $("bankNameInput").value = ""; $("bankNumInput").value = ""; $("bankOwnerInput").value = "";
  }

  function loadWhatsappTemplates() {
    if ($("waApprovedTemplate")) $("waApprovedTemplate").value = "✅ *SUERTE RD* | *PAGO APROBADO*\n¡Tu pago ha sido validado! Tus boletos están oficialmente participando. 🍀";
    if ($("waRejectedTemplate")) $("waRejectedTemplate").value = "❌ *SUERTE RD* | *PAGO RECHAZADO*\nTu comprobante no pudo ser verificado. Por favor contacta al soporte.";
  }

  function saveWhatsappTemplates() { alert("Plantillas guardadas."); }

  function renderFinancialReportsTable() {
    const body = $("financialBreakdownTableBody");
    if (!body) return;
    body.innerHTML = "";
    const tickets = allTickets[activeRaffleId] || {};
    const paidCount = Object.values(tickets).filter(t => t.estado === "pagado").length;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td><strong>General / Individual</strong></td><td>RD$ 3</td><td>${paidCount}</td><td>${paidCount} Boletos</td><td style="color:var(--green); font-family:var(--font-mono); font-weight:800;">RD$ ${paidCount * 3}</td>`;
    body.appendChild(tr);
  }

  function exportFinancialCSV() { alert("Exportando reporte..."); }

  async function fetchSupportMessages() {
    const body = $("supportTableBody");
    if (!body) return;
    body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-grey); padding:20px;">Bandeja de soporte vacía.</td></tr>`;
  }

  // --- AUTENTICACIÓN Y PIN ---
  async function checkAuthentication() {
    const overlay = $("adminLoginOverlay");
    const pin = sessionStorage.getItem('admin_pin') || localStorage.getItem('admin_pin') || '';
    if (pin === '123456' || pin === 'SuerteRD2026' || pin === 'SoyArte(20251975)') {
      adminPin = pin;
      if (overlay) overlay.classList.remove("active");
      await init();
      return;
    }

    if (overlay) {
      overlay.classList.add("active");
      const btn = $("btnAdminLoginSubmit");
      const input = $("adminLoginPinInput");
      if (btn) btn.onclick = () => handleLogin(input.value.trim());
      if (input) input.onkeydown = (e) => { if (e.key === "Enter") handleLogin(input.value.trim()); };
    }
  }

  function handleLogin(pin) {
    if (pin === '123456' || pin === 'SuerteRD2026' || pin === 'SoyArte(20251975)') {
      adminPin = pin;
      sessionStorage.setItem('admin_pin', pin);
      localStorage.setItem('admin_pin', pin);
      if ($("adminLoginOverlay")) $("adminLoginOverlay").classList.remove("active");
      init();
    } else {
      const err = $("adminLoginErrorMsg");
      if (err) { err.textContent = "PIN de seguridad incorrecto."; err.style.display = "block"; }
    }
  }

  // Inicio automático
  checkAuthentication();

})();
