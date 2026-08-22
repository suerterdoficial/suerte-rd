(async function() {
  "use strict";

  // --- CONFIGURACIÓN DE LLAVES Y ESTADOS ---
  const API_GET_URL = "/api/get";
  const API_SET_URL = "/api/set";
  
  const CFG_KEY_PREFIX = "suerterd:config:v2";
  const TICKETS_KEY_PREFIX = "suerterd:tickets:v2";
  const WINNERS_KEY = "suerterd:winners:v2";

  const RAFFLE_IDS = ["florida5"];

  const DEFAULT_CONFIGS = {
    florida5: {
      id: "florida5",
      title: "Sorteo Especial iPhone 17 Pro Max 1TB",
      prize: "iPhone 17 Pro Max 1TB",
      price: "RD$3",
      total: 100000,
      image: "./assets/suerte_rd_iphone17.jpg",
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
      whatsapp: "18092800000"
    }
  };

  let activeRaffleId = "florida5";
  let adminPin = sessionStorage.getItem('admin_pin') || '';
  let configs = {};
  let allTickets = {};
  let winners = [];
  let supportMessages = [];
  let statsChart = null;
  let lastNotificationTime = Date.now();

  // --- API HELPERS ---
  const $ = (id) => document.getElementById(id);

  function escapeHtml(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function getStorageItem(key) {
    try {
      const res = await fetch(`${API_GET_URL}?key=${encodeURIComponent(key)}`, {
        headers: { "x-admin-pin": adminPin }
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.value;
    } catch (e) {
      console.error(`Error getStorageItem for ${key}`, e);
      return null;
    }
  }

  async function setStorageItem(key, val) {
    try {
      const res = await fetch(API_SET_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-pin": adminPin
        },
        body: JSON.stringify({ key, value: val })
      });
      if (!res.ok) {
        console.error(`Error setStorageItem for ${key}: Unauthorized or failed`);
      }
    } catch (e) {
      console.error(`Error setStorageItem for ${key}`, e);
    }
  }

  function pad5(num) {
    const conf = configs[activeRaffleId];
    const digitCount = conf ? (conf.ticketDigits || 5) : 5;
    return String(num).padStart(digitCount, "0");
  }

  // --- INITIALIZATION ---
  async function init() {
    // Load IDs
    try {
      const idsRaw = await getStorageItem("suerterd:raffle:ids");
      if (idsRaw) {
        const parsed = JSON.parse(idsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          RAFFLE_IDS.length = 0;
          RAFFLE_IDS.push(...parsed);
        }
      } else {
        await setStorageItem("suerterd:raffle:ids", JSON.stringify(RAFFLE_IDS));
      }
    } catch (e) {
      console.warn("Failed loading raffle IDs", e);
    }

    // Load Configurations
    for (const rId of RAFFLE_IDS) {
      try {
        const key = `${CFG_KEY_PREFIX}:${rId}`;
        const raw = await getStorageItem(key);
        configs[rId] = raw ? JSON.parse(raw) : (DEFAULT_CONFIGS[rId] ? {...DEFAULT_CONFIGS[rId]} : {
          id: rId,
          title: "Nuevo Sorteo",
          prize: "Premio Principal",
          price: "RD$500",
          total: 10000,
          brand: "",
          model: "",
          year: "",
          details: "Gran sorteo premium. Elige tu boleto.",
          active: true,
          image: "./suerte_rd_banner.png",
          paymentInstructions: ""
        });
      } catch (e) {
        configs[rId] = DEFAULT_CONFIGS[rId] ? {...DEFAULT_CONFIGS[rId]} : {
          id: rId,
          title: "Nuevo Sorteo",
          prize: "Premio Principal",
          price: "RD$500",
          total: 10000,
          brand: "",
          model: "",
          year: "",
          details: "Gran sorteo premium. Elige tu boleto.",
          active: true,
          image: "./suerte_rd_banner.png",
          paymentInstructions: ""
        };
      }
      // Fill fallbacks
      if (configs[rId].blessedPct === undefined) configs[rId].blessedPct = DEFAULT_CONFIGS[rId]?.blessedPct ?? 0.1;
      if (configs[rId].blessedPrize === undefined) configs[rId].blessedPrize = DEFAULT_CONFIGS[rId]?.blessedPrize ?? "RD$5,000";
      if (configs[rId].saleStatus === undefined) configs[rId].saleStatus = DEFAULT_CONFIGS[rId]?.saleStatus ?? "active";
      if (configs[rId].blessedDrawInterval === undefined) configs[rId].blessedDrawInterval = DEFAULT_CONFIGS[rId]?.blessedDrawInterval ?? 5;
      if (configs[rId].countdownTriggerPct === undefined) configs[rId].countdownTriggerPct = DEFAULT_CONFIGS[rId]?.countdownTriggerPct ?? 80;
      if (configs[rId].countdownDurationDays === undefined) configs[rId].countdownDurationDays = DEFAULT_CONFIGS[rId]?.countdownDurationDays ?? 7;
      if (configs[rId].blessedNumbers === undefined) {
        configs[rId].blessedNumbers = DEFAULT_CONFIGS[rId]?.blessedNumbers ?? ["01196", "02061", "03628", "04527", "10452", "11946", "18442", "19068", "29402", "32947"];
      }
    }

    if (RAFFLE_IDS.length > 0) {
      activeRaffleId = RAFFLE_IDS[0];
    }

    // Load Sales / Tickets
    for (const rId of RAFFLE_IDS) {
      try {
        const key = `${TICKETS_KEY_PREFIX}:${rId}`;
        const raw = await getStorageItem(key);
        allTickets[rId] = raw ? JSON.parse(raw) : {};
      } catch (e) {
        allTickets[rId] = {};
      }
    }

    // Load Winners
    try {
      const winnersRaw = await getStorageItem(WINNERS_KEY);
      winners = winnersRaw ? JSON.parse(winnersRaw) : [];
    } catch (e) {
      winners = [];
    }

    // Fetch Support Messages
    await fetchSupportMessages();

    // Render elements
    populateRaffleDropdowns();
    setupNavigation();
    setupEventListeners();
    loadRaffleState(activeRaffleId);

    // Initialize notification baseline
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const notificationsList = data.value || [];
        if (notificationsList.length > 0) {
          lastNotificationTime = Math.max(...notificationsList.map(n => n.timestamp));
        }
      }
    } catch (e) {
      console.warn("Failed to fetch notification baseline", e);
    }

    // Start background polling
    setInterval(pollUpdates, 10000);
  }

  // --- POPULATE DROPDOWNS ---
  function populateRaffleDropdowns() {
    const mainSel = $("globalRaffleSelect");
    const formSel = $("cfgRaffleSelect");
    
    if (mainSel) {
      mainSel.innerHTML = "";
      RAFFLE_IDS.forEach(rId => {
        const conf = configs[rId];
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
        const conf = configs[rId];
        const opt = document.createElement("option");
        opt.value = rId;
        opt.textContent = `${conf.title} (${rId})`;
        formSel.appendChild(opt);
      });
      formSel.value = activeRaffleId;
    }
  }

  // --- NAVIGATION TAB SWITCHING ---
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
        
        if (target === "paneStats") {
          renderChart();
        } else if (target === "panePayments") {
          renderPaymentsTable();
        }
      });
    });
  }

  // --- EVENT LISTENERS BINDING ---
  function setupEventListeners() {
    $("globalRaffleSelect").addEventListener("change", (e) => {
      loadRaffleState(e.target.value);
    });

    if ($("cfgRaffleSelect")) {
      $("cfgRaffleSelect").addEventListener("change", (e) => {
        loadConfigForm(e.target.value);
      });
    }

    // Image Upload Preview
    $("cfgImageUpload").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(evt) {
          $("cfgImgPreview").src = evt.target.result;
          $("cfgImgPreview").style.display = "block";
          $("cfgImgPlaceholder").style.display = "none";
        };
        reader.readAsDataURL(file);
      }
    });

    // CRUD
    $("btnSaveConfig").addEventListener("click", saveConfigChanges);
    $("btnCreateNewRaffle").addEventListener("click", () => $("createRaffleOverlay").classList.add("active"));
    $("closeCreateModal").addEventListener("click", () => $("createRaffleOverlay").classList.remove("active"));
    $("btnCreateSubmit").addEventListener("click", createRaffle);
    $("btnDeleteCurrentRaffle").addEventListener("click", deleteRaffle);

    // Sales Actions
    $("btnReleaseExpired").addEventListener("click", cleanExpiredTickets);
    $("btnBlockSubmit").addEventListener("click", blockTicketManual);
    $("btnExportCSV").addEventListener("click", exportSalesCSV);
    $("btnResetSales").addEventListener("click", resetRaffleSales);

    // Draw
    $("btnStartDraw").addEventListener("click", startOfficialDraw);
    $("btnAddWinner").addEventListener("click", addWinnerManual);

    // Ticket search filter
    $("ticketSearchInput").addEventListener("input", renderTicketsTable);

    // Change PIN
    $("btnUpdatePin").addEventListener("click", updateAdminPinCode);

    // Logout
    const btnLogout = $("btnAdminLogout");
    if (btnLogout) {
      btnLogout.addEventListener("click", () => {
        sessionStorage.removeItem('admin_pin');
        localStorage.removeItem('suerterd_admin_logged');
        window.location.href = '/';
      });
    }

    // Receipt Modal Close (Phase 6)
    const closeBtn = $("closeViewReceiptBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeReceiptViewer);
    }
    
    // Receipt Modal Approve (Phase 6)
    const approveBtn = $("btnApproveReceiptModal");
    if (approveBtn) {
      approveBtn.addEventListener("click", () => {
        if (activeReceiptRaffleId && activeReceiptTicketNum) {
          approvePaymentGroup(activeReceiptRaffleId, activeReceiptTicketNum);
          closeReceiptViewer();
        }
      });
    }
  }

  // --- STATE LOADER ---
  function loadRaffleState(rId) {
    activeRaffleId = rId;
    
    // Header Sync
    const conf = configs[rId];
    $("headerTitle").textContent = conf.title;
    $("headerSubtitle").textContent = `Premio: ${conf.prize} • Precio: ${conf.price} • Total Boletos: ${conf.total.toLocaleString("es-DO")}`;

    // Rebuild draw reels UI
    updateDrawReelsDOM();

    // Dropdowns Sync
    if ($("globalRaffleSelect").value !== rId) $("globalRaffleSelect").value = rId;
    if ($("cfgRaffleSelect") && $("cfgRaffleSelect").value !== rId) $("cfgRaffleSelect").value = rId;

    loadConfigForm(rId);
    updateDashboardStats();
    renderTicketsTable();
    updatePaymentsNotificationBadge();
  }

  function updateDrawReelsDOM() {
    const conf = configs[activeRaffleId];
    const digitCount = conf ? (conf.ticketDigits || 5) : 5;
    const reelsRow = document.querySelector(".reels-row");
    if (reelsRow) {
      reelsRow.innerHTML = "";
      for (let i = 0; i < digitCount; i++) {
        const reelDiv = document.createElement("div");
        reelDiv.className = "reel";
        reelDiv.id = `reel${i}`;
        reelDiv.textContent = "0";
        reelsRow.appendChild(reelDiv);
      }
    }
  }

  // --- LOAD CONFIG FORM ---
  function loadConfigForm(rId) {
    const conf = configs[rId];
    if (!conf) return;

    $("cfgTitle").value = conf.title || "";
    $("cfgPrize").value = conf.prize || "";
    $("cfgPrice").value = conf.price || "";
    $("cfgTotal").value = conf.total || "";
    $("cfgTicketDigits").value = conf.ticketDigits !== undefined ? conf.ticketDigits : 5;
    $("cfgBlessedPct").value = conf.blessedPct !== undefined ? conf.blessedPct : 0.1;
    $("cfgBlessedPrize").value = conf.blessedPrize || "RD$5,000";
    $("cfgBlessedDrawInterval").value = conf.blessedDrawInterval !== undefined ? conf.blessedDrawInterval : 5;
    $("cfgCountdownTriggerPct").value = conf.countdownTriggerPct !== undefined ? conf.countdownTriggerPct : 80;
    $("cfgCountdownDurationDays").value = conf.countdownDurationDays !== undefined ? conf.countdownDurationDays : 7;
    $("cfgSaleStatus").value = conf.saleStatus || "active";
    $("cfgActive").checked = conf.active !== false;
    $("cfgBrand").value = conf.brand || "";
    $("cfgModel").value = conf.model || "";
    $("cfgYear").value = conf.year || "";
    $("cfgDetails").value = conf.details || "";
    $("cfgWhatsapp").value = conf.whatsapp || "";
    $("cfgPaymentInstructions").value = conf.paymentInstructions || "";

    const preview = $("cfgImgPreview");
    const placeholder = $("cfgImgPlaceholder");
    if (conf.image) {
      preview.src = conf.image;
      preview.style.display = "block";
      placeholder.style.display = "none";
    } else {
      preview.src = "";
      preview.style.display = "none";
      placeholder.style.display = "block";
    }
  }

  // --- DASHBOARD AND STATS ---
  function updateDashboardStats() {
    const conf = configs[activeRaffleId];
    const tickets = allTickets[activeRaffleId] || {};
    
    const totalCount = conf.total;
    const soldList = Object.values(tickets);
    
    const soldCount = soldList.length;
    const reservedCount = soldList.filter(t => t.estado === "reservado").length;
    const paidCount = soldList.filter(t => t.estado === "pagado").length;
    
    // Estimate income: ticket price * paidCount
    const priceNum = parseFloat(conf.price.replace(/[^\d.]/g, "")) || 0;
    const income = priceNum * paidCount;

    $("statIncome").textContent = `RD$${income.toLocaleString("es-DO")}`;
    $("statSold").textContent = `${soldCount.toLocaleString("es-DO")} / ${totalCount.toLocaleString("es-DO")}`;
    $("statRatio").textContent = `${reservedCount.toLocaleString("es-DO")} Res. / ${paidCount.toLocaleString("es-DO")} Pag.`;

    renderChart();
  }

  function renderChart() {
    const ctx = $("statsChart");
    if (!ctx) return;

    const conf = configs[activeRaffleId];
    const tickets = allTickets[activeRaffleId] || {};
    const totalCount = conf.total;
    const soldList = Object.values(tickets);
    const reservedCount = soldList.filter(t => t.estado === "reservado").length;
    const paidCount = soldList.filter(t => t.estado === "pagado").length;
    const availableCount = Math.max(0, totalCount - soldList.length);

    if (statsChart) {
      statsChart.destroy();
    }

    statsChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Libres", "Reservados", "Pagados"],
        datasets: [{
          data: [availableCount, reservedCount, paidCount],
          backgroundColor: ["#09242d", "#ffd700", "#00e676"],
          borderColor: ["rgba(0, 229, 255, 0.1)", "rgba(0, 0, 0, 0.2)", "rgba(0, 0, 0, 0.2)"],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#8fa7b2",
              font: { family: "Inter", size: 12 }
            }
          }
        }
      }
    });
  }

  // --- SAVE RAFFLE CONFIG ---
  async function saveConfigChanges() {
    showNotification("Guardando configuración...", "info");

    const total = Math.max(10, Math.min(100000, parseInt($("cfgTotal").value, 10) || 10000));
    const blessedPct = parseFloat($("cfgBlessedPct").value) || 0.1;
    const blessedPrize = $("cfgBlessedPrize").value.trim() || "RD$5,000";
    const saleStatus = $("cfgSaleStatus").value || "active";
    const blessedDrawInterval = parseFloat($("cfgBlessedDrawInterval").value) || 5;
    const countdownTriggerPct = parseFloat($("cfgCountdownTriggerPct").value) || 80;
    const countdownDurationDays = parseFloat($("cfgCountdownDurationDays").value) || 7;

    const previewSrc = $("cfgImgPreview").src;
    const finalImage = (previewSrc && previewSrc.startsWith("data:")) ? previewSrc : (configs[activeRaffleId].image || "./suerte_rd_banner.png");

    // Preserve existing blessed numbers (they are generated automatically on sales milestones)
    let blessedNumbers = configs[activeRaffleId].blessedNumbers || [];

    const ticketDigits = Number($("cfgTicketDigits").value) || 5;

    configs[activeRaffleId] = {
      ...configs[activeRaffleId],
      title: $("cfgTitle").value.trim() || configs[activeRaffleId].title,
      prize: $("cfgPrize").value.trim() || configs[activeRaffleId].prize,
      price: $("cfgPrice").value.trim() || configs[activeRaffleId].price,
      total: total,
      ticketDigits: ticketDigits,
      blessedPct: blessedPct,
      blessedPrize: blessedPrize,
      saleStatus: saleStatus,
      blessedDrawInterval: blessedDrawInterval,
      countdownTriggerPct: countdownTriggerPct,
      countdownDurationDays: countdownDurationDays,
      blessedNumbers: blessedNumbers,
      brand: $("cfgBrand").value.trim(),
      model: $("cfgModel").value.trim(),
      year: $("cfgYear").value.trim(),
      details: $("cfgDetails").value.trim(),
      active: $("cfgActive").checked,
      image: finalImage,
      whatsapp: $("cfgWhatsapp").value.trim(),
      paymentInstructions: $("cfgPaymentInstructions").value.trim()
    };

    const key = `${CFG_KEY_PREFIX}:${activeRaffleId}`;
    await setStorageItem(key, JSON.stringify(configs[activeRaffleId]));

    showNotification("¡Configuración guardada correctamente!", "success");
    loadRaffleState(activeRaffleId);
  }

  // --- CREATE NEW RAFFLE ---
  async function createRaffle() {
    const rawId = $("newRaffleId").value.trim().toLowerCase();
    const id = rawId.replace(/[^a-z0-9]/g, "");
    const title = $("newRaffleTitle").value.trim();
    const prize = $("newRafflePrize").value.trim();
    const price = $("newRafflePrice").value.trim() || "RD$500";
    const total = Math.max(10, Math.min(100000, parseInt($("newRaffleTotal").value, 10) || 10000));
    const blessedPct = parseFloat($("newRaffleBlessedPct").value) || 0.1;
    const blessedPrize = $("newRaffleBlessedPrize").value.trim() || "RD$5,000";
    const blessedDrawInterval = parseFloat($("newRaffleBlessedDrawInterval").value) || 5;
    const countdownTriggerPct = parseFloat($("newRaffleCountdownTriggerPct").value) || 80;
    const countdownDurationDays = parseFloat($("newRaffleCountdownDurationDays").value) || 7;

    if (!id || !title || !prize) {
      alert("Por favor completa todos los campos obligatorios.");
      return;
    }

    if (RAFFLE_IDS.includes(id)) {
      alert("El código de este sorteo ya existe.");
      return;
    }

    showNotification("Creando sorteo...", "info");

    const blessedNumbers = [];

    const ticketDigits = Number($("newRaffleTicketDigits").value) || 5;

    RAFFLE_IDS.push(id);
    await setStorageItem("suerterd:raffle:ids", JSON.stringify(RAFFLE_IDS));

    const newConfig = {
      id,
      title,
      prize,
      price,
      total,
      ticketDigits,
      blessedPct,
      blessedPrize,
      saleStatus: "active",
      blessedDrawInterval,
      countdownTriggerPct,
      countdownDurationDays,
      blessedNumbers,
      brand: "",
      model: "",
      year: "",
      details: "Gran sorteo premium. Elige tu boleto.",
      active: true,
      image: configs["florida5"] ? configs["florida5"].image : "./suerte_rd_banner.png",
      whatsapp: configs["florida5"] ? configs["florida5"].whatsapp : "18092800000",
      paymentInstructions: configs["florida5"] ? configs["florida5"].paymentInstructions : ""
    };
    configs[id] = newConfig;

    const key = `${CFG_KEY_PREFIX}:${id}`;
    await setStorageItem(key, JSON.stringify(newConfig));

    allTickets[id] = {};
    const tKey = `${TICKETS_KEY_PREFIX}:${id}`;
    await setStorageItem(tKey, JSON.stringify({}));

    $("createRaffleOverlay").classList.remove("active");
    populateRaffleDropdowns();
    loadRaffleState(id);
    showNotification(`¡Sorteo "${title}" creado exitosamente!`, "success");
  }

  // --- DELETE RAFFLE ---
  async function deleteRaffle() {
    if (RAFFLE_IDS.length <= 1) {
      alert("No puedes eliminar todos los sorteos. Debe quedar al menos uno.");
      return;
    }

    if (!confirm(`¿Estás completamente seguro de que deseas eliminar permanentemente el sorteo "${configs[activeRaffleId].title}"? Esta acción borrará todas sus ventas y configuración.`)) {
      return;
    }

    showNotification("Eliminando sorteo...", "info");

    const idToDelete = activeRaffleId;
    const index = RAFFLE_IDS.indexOf(idToDelete);
    if (index > -1) {
      RAFFLE_IDS.splice(index, 1);
    }

    // Save ids list
    await setStorageItem("suerterd:raffle:ids", JSON.stringify(RAFFLE_IDS));

    // Clear config and ticket items in server
    await setStorageItem(`${CFG_KEY_PREFIX}:${idToDelete}`, "");
    await setStorageItem(`${TICKETS_KEY_PREFIX}:${idToDelete}`, "");

    delete configs[idToDelete];
    delete allTickets[idToDelete];

    populateRaffleDropdowns();
    loadRaffleState(RAFFLE_IDS[0]);
    showNotification("Sorteo eliminado permanentemente.", "success");
  }

  // --- TICKETS RENDER ---
  function renderTicketsTable() {
    const body = $("ticketsTableBody");
    if (!body) return;
    body.innerHTML = "";

    const query = $("ticketSearchInput").value.trim().toLowerCase();
    const tickets = allTickets[activeRaffleId] || {};
    const ticketNums = Object.keys(tickets).sort();

    let renderedCount = 0;

    for (const num of ticketNums) {
      const ticket = tickets[num];
      const name = ticket.name || ticket.nombre || "";
      const whatsapp = ticket.whatsapp || "";
      const lottery = ticket.loteria || "Por asignar";
      const state = ticket.estado || "reservado";

      // Filter check
      if (query) {
        const matchesQuery = num.includes(query) || name.toLowerCase().includes(query) || whatsapp.includes(query);
        if (!matchesQuery) continue;
      }

      const tr = document.createElement("tr");

      let badgeClass = "badge-reserved";
      let badgeLabel = "Reservado";
      if (state === "pagado") {
        badgeClass = "badge-paid";
        badgeLabel = "Pagado";
      } else if (state === "esperando_validacion") {
        badgeClass = "badge-pending";
        badgeLabel = "Validar Pago";
      } else if (state === "bloqueado") {
        badgeClass = "badge-blocked";
        badgeLabel = "Bloqueado";
      }

      tr.innerHTML = `
        <td style="font-family:var(--font-mono); font-weight:700;">#${num}</td>
        <td>${name || '<span style="color:var(--text-muted)">N/A</span>'}</td>
        <td>${whatsapp ? `<a href="https://wa.me/${whatsapp.replace(/\D/g, "")}" target="_blank" style="color:var(--cyan); text-decoration:none;">${whatsapp}</a>` : '<span style="color:var(--text-muted)">N/A</span>'}</td>
        <td>${lottery}</td>
        <td><span class="badge ${badgeClass}">${badgeLabel}</span></td>
        <td>
          <div style="display:flex; gap:6px;">
            ${state !== "bloqueado" ? `<button class="btn btn-green btn-toggle-pay" data-number="${num}" style="padding:6px 10px; font-size:0.75rem; margin-bottom:0;">${state === 'reservado' || state === 'esperando_validacion' ? 'Marcar Pagado' : 'Marcar Reservado'}</button>` : ''}
            ${state === "esperando_validacion" && ticket.comprobante ? `<button class="btn btn-secondary btn-view-receipt-inline" data-number="${num}" style="padding:6px 10px; font-size:0.75rem; margin-bottom:0;"><i data-lucide="image" style="width:12px;"></i> Recibo</button>` : ''}
            <button class="btn btn-red btn-release" data-number="${num}" style="padding:6px 10px; font-size:0.75rem; margin-bottom:0;"><i data-lucide="trash-2" style="width:12px;"></i> Liberar</button>
          </div>
        </td>
      `;

      tr.querySelector(".btn-release").addEventListener("click", () => releaseTicket(num));
      const payBtn = tr.querySelector(".btn-toggle-pay");
      if (payBtn) payBtn.addEventListener("click", () => toggleTicketPayment(num));
      const receiptBtn = tr.querySelector(".btn-view-receipt-inline");
      if (receiptBtn) receiptBtn.addEventListener("click", () => openReceiptViewer(activeRaffleId, num, ticket.comprobante));

      body.appendChild(tr);
      renderedCount++;
      if (renderedCount >= 100) break; // Limit render size for speed
    }

    if (renderedCount === 0) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-grey); padding: 20px;">No se encontraron boletos registrados.</td></tr>`;
    }

    lucide.createIcons();
  }

  // --- ACTIONS FOR TICKETS ---
  async function toggleTicketPayment(num) {
    const tickets = allTickets[activeRaffleId] || {};
    if (!tickets[num]) return;

    tickets[num].estado = tickets[num].estado === "reservado" ? "pagado" : "reservado";
    
    showNotification("Actualizando estado de pago...", "info");
    const tKey = `${TICKETS_KEY_PREFIX}:${activeRaffleId}`;
    await setStorageItem(tKey, JSON.stringify(tickets));
    
    showNotification(`¡Boleto #${num} actualizado!`, "success");
    loadRaffleState(activeRaffleId);
  }

  async function releaseTicket(num) {
    if (!confirm(`¿Deseas liberar y cancelar el boleto #${num}? Volverá a estar disponible para el público.`)) {
      return;
    }

    const tickets = allTickets[activeRaffleId] || {};
    delete tickets[num];

    showNotification("Liberando boleto...", "info");
    const tKey = `${TICKETS_KEY_PREFIX}:${activeRaffleId}`;
    await setStorageItem(tKey, JSON.stringify(tickets));

    showNotification(`Boleto #${num} liberado correctamente.`, "success");
    loadRaffleState(activeRaffleId);
  }

  async function blockTicketManual() {
    const input = $("blockTicketInput");
    const num = input.value.trim();

    if (num.length !== 5 || isNaN(num)) {
      alert("Por favor ingresa un número de boleto válido de 5 dígitos.");
      return;
    }

    const tickets = allTickets[activeRaffleId] || {};
    const conf = configs[activeRaffleId];
    const ticketIndex = parseInt(num, 10);

    if (ticketIndex >= conf.total) {
      alert(`El número de boleto supera el total configurado para esta rifa (${conf.total}).`);
      return;
    }

    if (tickets[num]) {
      alert(`El boleto #${num} ya está ocupado (Reservado/Pagado). Libéralo primero.`);
      return;
    }

    tickets[num] = {
      name: "BLOQUEADO ADMIN",
      nombre: "BLOQUEADO ADMIN",
      whatsapp: "",
      loteria: "Manual",
      estado: "bloqueado",
      timestamp: Date.now()
    };

    showNotification("Bloqueando boleto...", "info");
    const tKey = `${TICKETS_KEY_PREFIX}:${activeRaffleId}`;
    await setStorageItem(tKey, JSON.stringify(tickets));

    input.value = "";
    showNotification(`Boleto #${num} bloqueado manualmente.`, "success");
    loadRaffleState(activeRaffleId);
  }

  async function cleanExpiredTickets() {
    showNotification("Liberando boletos expirados...", "info");
    try {
      const res = await fetch("/api/admin/clean-expired", {
        method: "POST",
        headers: {
          "x-admin-pin": adminPin
        }
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Limpieza completada. Se liberaron ${data.count} boletos expirados.`, "success");
        // Reload sales
        const tKey = `${TICKETS_KEY_PREFIX}:${activeRaffleId}`;
        const raw = await getStorageItem(tKey);
        allTickets[activeRaffleId] = raw ? JSON.parse(raw) : {};
        loadRaffleState(activeRaffleId);
      } else {
        showNotification("No autorizado o error al liberar.", "error");
      }
    } catch (e) {
      showNotification("Error ejecutando limpieza de expirados.", "error");
    }
  }

  async function resetRaffleSales() {
    if (!confirm(`¿ESTÁS COMPLETAMENTE SEGURO de que deseas ELIMINAR TODAS LAS VENTAS del sorteo "${configs[activeRaffleId].title}"? Esta acción vaciará por completo la base de datos de boletos vendidos y es irreversible.`)) {
      return;
    }

    showNotification("Limpiando base de datos de ventas...", "info");
    allTickets[activeRaffleId] = {};
    const tKey = `${TICKETS_KEY_PREFIX}:${activeRaffleId}`;
    await setStorageItem(tKey, JSON.stringify({}));

    showNotification("Se han reiniciado todas las ventas del sorteo.", "success");
    loadRaffleState(activeRaffleId);
  }

  // --- SUPPORT MESSAGES ---
  async function fetchSupportMessages() {
    try {
      const raw = await getStorageItem("supportMessages");
      supportMessages = raw ? JSON.parse(raw) : [];
      renderSupportTable();
    } catch (e) {
      supportMessages = [];
    }
  }

  function renderSupportTable() {
    const body = $("supportTableBody");
    if (!body) return;
    body.innerHTML = "";

    supportMessages.forEach((msg, idx) => {
      const name = msg.name || "Anonimo";
      const phone = msg.whatsapp || "";
      const cat = msg.category || "General";
      const txt = msg.message || "";
      const date = msg.timestamp ? new Date(msg.timestamp).toLocaleString("es-DO") : "";

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:700;">${name}</td>
        <td><a href="https://wa.me/${phone.replace(/\D/g, "")}" target="_blank" style="color:var(--cyan); text-decoration:none;">${phone}</a></td>
        <td><span class="badge" style="background:rgba(0,229,255,0.05); color:var(--cyan); border:1px solid var(--border-cyan);">${cat}</span></td>
        <td style="max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${txt}">${txt}</td>
        <td style="font-size:0.8rem; color:var(--text-grey);">${date}</td>
        <td>
          <button class="btn btn-red btn-del-support" style="padding:6px 10px; font-size:0.75rem;">Eliminar</button>
        </td>
      `;

      tr.querySelector(".btn-del-support").addEventListener("click", () => deleteSupportMsg(idx));
      body.appendChild(tr);
    });

    if (supportMessages.length === 0) {
      body.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-grey); padding: 20px;">No hay mensajes de soporte en la bandeja.</td></tr>`;
    }
  }

  async function deleteSupportMsg(idx) {
    if (!confirm("¿Deseas eliminar este mensaje de soporte?")) return;

    showNotification("Eliminando mensaje...", "info");
    try {
      const res = await fetch('/api/support/delete', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-pin": adminPin
        },
        body: JSON.stringify({ index: idx })
      });
      if (res.ok) {
        showNotification("Mensaje eliminado.", "success");
        await fetchSupportMessages();
      } else {
        showNotification("No autorizado o error al eliminar.", "error");
      }
    } catch (e) {
      showNotification("Error eliminando mensaje.", "error");
    }
  }

  // --- DRAW OFFICIAL WINNER ---
  async function startOfficialDraw() {
    const tickets = allTickets[activeRaffleId] || {};
    const conf = configs[activeRaffleId];
    
    // Get list of paid tickets
    const soldList = Object.keys(tickets);
    const paidList = soldList.filter(num => tickets[num].estado === "pagado");

    if (paidList.length === 0) {
      alert("No hay boletos marcados como PAGADOS para realizar el sorteo. Debe haber al menos un boleto pagado.");
      return;
    }

    const startBtn = $("btnStartDraw");
    startBtn.disabled = true;
    $("drawStatusText").textContent = "Mezclando boletos...";

    // Select winner
    const winningIndex = Math.floor(Math.random() * paidList.length);
    const winningTicket = paidList[winningIndex];
    const winnerDetails = tickets[winningTicket];

    // Reels Animation
    const digitCount = conf.ticketDigits || 5;
    const reels = [];
    for (let i = 0; i < digitCount; i++) {
      reels.push($(`reel${i}`));
    }
    reels.forEach(r => r.classList.add("spinning"));

    reels.forEach((reel, i) => {
      let val = 0;
      const timer = setInterval(() => {
        val = (val + 1) % 10;
        reel.textContent = val;
      }, 50 + i * 20);

      setTimeout(() => {
        clearInterval(timer);
        reel.textContent = winningTicket[i];
        reel.classList.remove("spinning");
        
        if (i === reels.length - 1) {
          $("drawStatusText").textContent = `¡Sorteo finalizado! Ganador: #${winningTicket}`;
          startBtn.disabled = false;
          
          // Trigger confetti!
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });

          // Save Winner
          saveWinner(winningTicket, winnerDetails);
        }
      }, 2000 + i * 400);
    });
  }

  async function saveWinner(num, details) {
    winners.push({
      raffleId: activeRaffleId,
      name: details.name || details.nombre || "Cliente",
      number: parseInt(num, 10),
      prize: configs[activeRaffleId].prize,
      photoUrl: "",
      date: new Date().toISOString()
    });

    await setStorageItem(WINNERS_KEY, JSON.stringify(winners));
    showNotification(`¡Ganador registrado! #${num} - ${details.nombre}`, "success");
  }

  async function addWinnerManual() {
    const nameInput = $("winName");
    const numInput = $("winNumber");
    const photoInput = $("winPhoto");

    const name = nameInput.value.trim();
    const num = numInput.value.trim();
    const photo = photoInput.value.trim();

    if (!name || num.length !== 5 || isNaN(num)) {
      alert("Por favor ingresa un nombre y un número de boleto de 5 dígitos.");
      return;
    }

    showNotification("Guardando ganador...", "info");

    winners.push({
      raffleId: activeRaffleId,
      name: name,
      number: parseInt(num, 10),
      prize: configs[activeRaffleId].prize,
      photoUrl: photo,
      date: new Date().toISOString()
    });

    await setStorageItem(WINNERS_KEY, JSON.stringify(winners));
    
    // Clear inputs
    nameInput.value = "";
    numInput.value = "";
    photoInput.value = "";

    showNotification("¡Ganador registrado correctamente!", "success");
  }

  // --- EXPORT CSV ---
  function exportSalesCSV() {
    const tickets = allTickets[activeRaffleId] || {};
    const list = Object.keys(tickets).sort();

    if (list.length === 0) {
      alert("No hay ventas registradas para exportar.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Boleto,Nombre,WhatsApp,Loteria,Estado,FechaReserva\r\n";

    list.forEach(num => {
      const t = tickets[num];
      const date = t.timestamp ? new Date(t.timestamp).toISOString() : "";
      csvContent += `"${num}","${t.name || t.nombre || ""}","${t.whatsapp}","${t.loteria}","${t.estado}","${date}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ventas_Sorteo_${activeRaffleId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- NOTIFICATION UTILITIES ---
  // Inject toast container style & element programmatically
  const toastStyle = document.createElement("style");
  toastStyle.textContent = `
    .admin-toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .admin-toast {
      background: rgba(2, 12, 16, 0.95);
      border: 1px solid var(--cyan);
      color: #FFF;
      padding: 12px 20px;
      border-radius: 12px;
      font-family: var(--font-sans);
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0, 229, 255, 0.2);
      opacity: 0;
      transform: translateY(20px);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .admin-toast.active {
      opacity: 1;
      transform: translateY(0);
    }
    .admin-toast.info { border-color: var(--cyan); box-shadow: 0 5px 15px rgba(0, 229, 255, 0.15); }
    .admin-toast.success { border-color: var(--green); box-shadow: 0 5px 15px rgba(0, 230, 118, 0.15); }
    .admin-toast.error { border-color: var(--red); box-shadow: 0 5px 15px rgba(255, 77, 94, 0.15); }
  `;
  document.head.appendChild(toastStyle);

  const toastContainer = document.createElement("div");
  toastContainer.className = "admin-toast-container";
  document.body.appendChild(toastContainer);

  let audioCtx = null;
  function playSound(type) {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'chime') {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.1); // A5
        gain2.gain.setValueAtTime(0.08, now + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        osc.start(now);
        osc.stop(now + 0.4);
        osc2.start(now + 0.1);
        osc2.stop(now + 0.5);
      } else if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(70, now + 0.22);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch(e) {
      console.warn("AudioContext block", e);
    }
  }

  function showToast(msg, type = "info") {
    const toast = document.createElement("div");
    toast.className = `admin-toast ${type}`;
    
    let icon = "info";
    if (type === "success") icon = "check-circle";
    else if (type === "error") icon = "alert-circle";
    
    toast.innerHTML = `<i data-lucide="${icon}" style="width:16px; height:16px;"></i> <span>${msg}</span>`;
    toastContainer.appendChild(toast);
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
    
    setTimeout(() => toast.classList.add("active"), 10);
    
    setTimeout(() => {
      toast.classList.remove("active");
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  function showNotification(txt, type) {
    let tType = "info";
    if (type === "success") tType = "success";
    else if (type === "error" || type === "bad") tType = "error";
    
    showToast(txt, tType);
    
    if (type === "success") playSound("success");
    else if (type === "error" || type === "bad") playSound("error");
  }

  // --- SECURITY PIN AND LOGIN LOGIN LOGIC ---
  async function updateAdminPinCode() {
    const input = $("cfgAdminPin");
    const newPin = input.value.trim();
    if (!newPin) {
      alert("Por favor ingresa un nuevo PIN.");
      return;
    }
    if (newPin.length < 4) {
      alert("El PIN debe tener al menos 4 caracteres.");
      return;
    }
    
    showNotification("Actualizando PIN...", "info");
    try {
      await setStorageItem('suerterd:admin:pin', newPin);
      adminPin = newPin;
      sessionStorage.setItem('admin_pin', newPin);
      localStorage.setItem('suerterd_admin_logged', 'true');
      input.value = "";
      showNotification("¡PIN de acceso actualizado correctamente!", "success");
    } catch (e) {
      showNotification("Error al guardar el nuevo PIN.", "error");
    }
  }

  async function checkAuthentication() {
    const pin = sessionStorage.getItem('admin_pin');
    if (pin) {
      const isValid = await verifyPin(pin);
      if (isValid) {
        adminPin = pin;
        localStorage.setItem('suerterd_admin_logged', 'true');
        $("adminLoginOverlay").classList.remove("active");
        await init();
        return;
      }
    }
    // If not authenticated or verification fails, show the login screen and listen to submit
    $("adminLoginOverlay").classList.add("active");
    
    // Bind login submit buttons
    $("btnAdminLoginSubmit").onclick = handleLoginSubmit;
    $("adminLoginPinInput").onkeydown = (e) => {
      if (e.key === "Enter") handleLoginSubmit();
    };
  }

  async function verifyPin(pin) {
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      return data.success;
    } catch(e) {
      console.error("Error verifying pin", e);
      return false;
    }
  }

  async function handleLoginSubmit() {
    const input = $("adminLoginPinInput");
    const pin = input.value.trim();
    if (!pin) {
      showLoginError("Ingresa un PIN.");
      return;
    }
    showLoginError(""); // clear error
    const isValid = await verifyPin(pin);
    if (isValid) {
      adminPin = pin;
      sessionStorage.setItem('admin_pin', pin);
      localStorage.setItem('suerterd_admin_logged', 'true');
      $("adminLoginOverlay").classList.remove("active");
      await init();
    } else {
      showLoginError("PIN de seguridad incorrecto.");
    }
  }

  function showLoginError(msg) {
    const el = $("adminLoginErrorMsg");
    if (!el) return;
    if (msg) {
      el.textContent = msg;
      el.style.display = "block";
    } else {
      el.style.display = "none";
    }
  }

  // --- PAYMENT VALIDATION CORE FUNCTIONS (Phase 6) ---
  let activeReceiptRaffleId = null;
  let activeReceiptTicketNum = null;

  function getPendingPaymentsCount() {
    let pendingGroups = 0;
    RAFFLE_IDS.forEach(rId => {
      const tickets = allTickets[rId] || {};
      const groups = {};
      Object.keys(tickets).forEach(tNum => {
        const t = tickets[tNum];
        if (t.estado === 'esperando_validacion' || t.estado === 'reservado') {
          const groupKey = `${t.timestamp_comprobante || t.timestamp}_${t.whatsapp}`;
          groups[groupKey] = true;
        }
      });
      pendingGroups += Object.keys(groups).length;
    });
    return pendingGroups;
  }

  function updatePaymentsNotificationBadge() {
    const count = getPendingPaymentsCount();
    const badge = $("paymentNotificationBadge");
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = "inline-block";
      } else {
        badge.style.display = "none";
      }
    }
  }

  function renderPaymentsTable() {
    const tbody = $("paymentsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    let rowsHtml = "";
    let hasPending = false;

    RAFFLE_IDS.forEach(rId => {
      const conf = configs[rId];
      const tickets = allTickets[rId] || {};
      
      const groups = {};
      
      Object.keys(tickets).forEach(tNum => {
        const t = tickets[tNum];
        if (t.estado === 'esperando_validacion' || t.estado === 'reservado') {
          const groupKey = `${t.timestamp_comprobante || t.timestamp}_${t.whatsapp}`;
          if (!groups[groupKey]) {
            groups[groupKey] = {
              raffleId: rId,
              name: t.name || t.nombre || "Cliente",
              whatsapp: t.whatsapp,
              comprobante: t.comprobante,
              estado: t.estado,
              timestamp: t.timestamp_comprobante || t.timestamp,
              numbers: []
            };
          }
          groups[groupKey].numbers.push(tNum);
          if (t.estado === 'esperando_validacion') {
            groups[groupKey].estado = 'esperando_validacion';
          }
        }
      });
      
      Object.keys(groups).forEach(gKey => {
        const g = groups[gKey];
        hasPending = true;
        g.numbers.sort();
        
        const dateStr = g.timestamp ? new Date(g.timestamp).toLocaleDateString("es-DO") + " " + new Date(g.timestamp).toLocaleTimeString("es-DO", {hour: '2-digit', minute:'2-digit'}) : "N/A";
        
        let numbersDisplay = g.numbers.map(n => `#${n}`).join(", ");
        if (g.numbers.length > 5) {
          numbersDisplay = g.numbers.slice(0, 5).map(n => `#${n}`).join(", ") + `... y ${g.numbers.length - 5} más`;
        }
        
        const allNumsStr = g.numbers.join(",");

        let statusBadge = "";
        if (g.estado === 'esperando_validacion') {
          statusBadge = `<span class="badge" style="background:rgba(0, 229, 255, 0.1); color:var(--cyan); border:1px solid var(--cyan);">Recibo Subido</span>`;
        } else {
          statusBadge = `<span class="badge" style="background:rgba(255, 215, 0, 0.1); color:var(--gold); border:1px solid var(--gold);">Reservado (S.C.)</span>`;
        }

        rowsHtml += `
          <tr data-raffle="${rId}" data-tickets="${allNumsStr}">
            <td><strong>${escapeHtml(conf.title)}</strong></td>
            <td>
              <span class="badge" style="background:rgba(255,255,255,0.05); color:#FFF; font-weight:800; font-family:var(--font-mono); font-size:0.85rem;" title="${g.numbers.join(', ')}">
                ${g.numbers.length} boletos
              </span>
              <div style="font-size:0.75rem; color:var(--text-grey); margin-top:4px; font-family:var(--font-mono);">${numbersDisplay}</div>
            </td>
            <td>${escapeHtml(g.name)}</td>
            <td>
              <a href="https://wa.me/${g.whatsapp.replace(/\D/g, "")}" target="_blank" class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; border-color:#00E676; color:#00E676; display:inline-flex; align-items:center; gap:4px; margin-bottom:0;">
                <i data-lucide="message-circle" style="width:12px;"></i> WhatsApp
              </a>
            </td>
            <td>
              ${g.comprobante ? `
                <button class="btn btn-secondary btn-view-receipt" data-raffle="${rId}" data-tickets="${allNumsStr}" style="padding: 4px 8px; font-size: 0.75rem; display:inline-flex; align-items:center; gap:4px; margin-bottom:0;">
                  <i data-lucide="image" style="width:12px;"></i> Ver Recibo
                </button>
              ` : `<span style="color:var(--text-muted); font-size:0.8rem;">Sin recibo</span>`}
            </td>
            <td>${statusBadge}</td>
            <td style="font-size:0.8rem; color:var(--text-grey);">${dateStr}</td>
            <td>
              <div style="display:flex; gap:6px;">
                <button class="btn btn-green btn-approve-group" data-raffle="${rId}" data-tickets="${allNumsStr}" style="padding: 4px 8px; font-size: 0.75rem; font-weight:800; margin-bottom:0;">
                  <i data-lucide="check" style="width:12px; vertical-align:middle;"></i> Aprobar
                </button>
                <button class="btn btn-red btn-reject-group" data-raffle="${rId}" data-tickets="${allNumsStr}" style="padding: 4px 8px; font-size: 0.75rem; font-weight:800; margin-bottom:0;">
                  <i data-lucide="x" style="width:12px; vertical-align:middle;"></i> Rechazar
                </button>
              </div>
            </td>
          </tr>
        `;
      });
    });

    if (hasPending) {
      tbody.innerHTML = rowsHtml;
      
      tbody.querySelectorAll(".btn-view-receipt").forEach(btn => {
        btn.addEventListener("click", () => {
          const rId = btn.getAttribute("data-raffle");
          const numsStr = btn.getAttribute("data-tickets");
          const firstNum = numsStr.split(",")[0];
          const t = allTickets[rId][firstNum];
          openReceiptViewer(rId, numsStr, t.comprobante);
        });
      });

      tbody.querySelectorAll(".btn-approve-group").forEach(btn => {
        btn.addEventListener("click", () => {
          const rId = btn.getAttribute("data-raffle");
          const numsStr = btn.getAttribute("data-tickets");
          approvePaymentGroup(rId, numsStr);
        });
      });

      tbody.querySelectorAll(".btn-reject-group").forEach(btn => {
        btn.addEventListener("click", () => {
          const rId = btn.getAttribute("data-raffle");
          const numsStr = btn.getAttribute("data-tickets");
          rejectPaymentGroup(rId, numsStr);
        });
      });
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:30px; color:var(--text-grey); font-family:var(--font-mono);">
            No hay comprobantes pendientes de validación.
          </td>
        </tr>
      `;
    }
    
    lucide.createIcons();
    updatePaymentsNotificationBadge();
  }

  async function approvePaymentGroup(rId, numsStr) {
    const nums = numsStr.split(",");
    if (!confirm(`¿Estás seguro de que deseas APROBAR el pago de los ${nums.length} boletos?`)) return;
    showNotification("Aprobando pagos...", "info");
    
    const tickets = allTickets[rId] || {};
    let countApprove = 0;
    
    nums.forEach(tNum => {
      if (tickets[tNum]) {
        tickets[tNum].estado = "pagado";
        tickets[tNum].timestamp_pago = Date.now();
        countApprove++;
      }
    });
    
    if (countApprove > 0) {
      const key = `${TICKETS_KEY_PREFIX}:${rId}`;
      await setStorageItem(key, JSON.stringify(tickets));
      showNotification(`¡Se aprobaron ${countApprove} boletos con éxito!`, "success");
      
      // Send WhatsApp message to user confirming activation
      const firstNum = nums[0];
      const tInfo = tickets[firstNum];
      const conf = configs[rId];
      if (tInfo && tInfo.whatsapp && conf) {
        const clientName = tInfo.name || tInfo.nombre || "Cliente";
        const raffleTitle = conf.title;
        const formattedNums = nums.map(n => `#${n}`).join(", ");
        const textMsg = `¡Hola ${clientName}! Te informamos de parte de Suerte RD que tu pago ha sido recibido y tus ${nums.length} boletos (${formattedNums}) para el sorteo "${raffleTitle}" han sido validados y ya se encuentran activos participando en la rifa. ¡Te deseamos mucha suerte! 🍀`;
        const encoded = encodeURIComponent(textMsg);
        const cleanPhone = tInfo.whatsapp.replace(/\D/g, "");
        window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, "_blank");
      }

      renderPaymentsTable();
      if (activeRaffleId === rId) {
        renderTicketsTable();
        updateDashboardStats();
      }
    }
  }

  async function rejectPaymentGroup(rId, numsStr) {
    const nums = numsStr.split(",");
    if (!confirm(`¿Estás seguro de que deseas RECHAZAR el pago de los ${nums.length} boletos? Los boletos serán liberados.`)) return;
    showNotification("Rechazando y liberando boletos...", "info");
    
    const tickets = allTickets[rId] || {};
    let countReject = 0;
    
    nums.forEach(tNum => {
      if (tickets[tNum]) {
        delete tickets[tNum];
        countReject++;
      }
    });
    
    if (countReject > 0) {
      const key = `${TICKETS_KEY_PREFIX}:${rId}`;
      await setStorageItem(key, JSON.stringify(tickets));
      showNotification(`¡Se liberaron ${countReject} boletos!`, "success");
      
      renderPaymentsTable();
      if (activeRaffleId === rId) {
        renderTicketsTable();
        updateDashboardStats();
      }
    }
  }

  function openReceiptViewer(rId, tNum, base64) {
    activeReceiptRaffleId = rId;
    activeReceiptTicketNum = tNum;
    
    const modal = $("viewReceiptOverlay");
    const img = $("viewReceiptImg");
    if (modal && img) {
      img.src = base64;
      modal.classList.add("active");
    }
  }

  function closeReceiptViewer() {
    activeReceiptRaffleId = null;
    activeReceiptTicketNum = null;
    
    const modal = $("viewReceiptOverlay");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  async function pollUpdates() {
    try {
      // 1. Reload tickets in background
      for (const rId of RAFFLE_IDS) {
        try {
          const tKey = `${TICKETS_KEY_PREFIX}:${rId}`;
          const raw = await getStorageItem(tKey);
          if (raw) {
            allTickets[rId] = JSON.parse(raw);
          }
        } catch (e) {}
      }

      // 2. Fetch Support Messages in background
      try {
        const raw = await getStorageItem("supportMessages");
        if (raw) {
          supportMessages = JSON.parse(raw);
        }
      } catch (e) {}

      // 3. Check notifications list on server
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          const notificationsList = data.value || [];
          
          // Check for new notifications
          let newNotifFound = false;
          notificationsList.forEach(n => {
            if (n.timestamp > lastNotificationTime) {
              showToast(n.text, "info");
              newNotifFound = true;
            }
          });
          
          if (newNotifFound) {
            playSound("chime");
            if (notificationsList.length > 0) {
              lastNotificationTime = Math.max(...notificationsList.map(n => n.timestamp));
            }
          }
        }
      } catch (e) {}

      // 4. Update UI elements dynamically based on active pane
      updatePaymentsNotificationBadge();
      
      const activePane = document.querySelector(".pane.active");
      if (activePane) {
        const paneId = activePane.id;
        if (paneId === "paneStats") {
          updateDashboardStats();
        } else if (paneId === "paneTickets") {
          renderTicketsTable();
        } else if (paneId === "panePayments") {
          renderPaymentsTable();
        } else if (paneId === "paneSupport") {
          renderSupportTable();
        }
      }
    } catch(e) {
      console.error("Polling error", e);
    }
  }

  // Run on startup
  await checkAuthentication();

})();
