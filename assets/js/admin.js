(async function() {
  "use strict";

  // --- CONFIGURACIÓN DE LLAVES Y ESTADOS ---
  const API_GET_URL = "/api/get";
  const API_SET_URL = "/api/set";
  
  const CFG_KEY_PREFIX = "suerterd:config:v2";
  const TICKETS_KEY_PREFIX = "suerterd:tickets:v2";
  const WINNERS_KEY = "suerterd:winners:v2";

  const RAFFLE_IDS = ["celular", "carro", "patineta"];

  const DEFAULT_CONFIGS = {
    celular: {
      id: "celular",
      title: "Rifa Especial del Celular",
      prize: "iPhone 17 Pro Max",
      price: "RD$500",
      total: 10000,
      image: "./005.jpeg",
      active: true,
      brand: "Apple",
      model: "iPhone 17 Pro Max",
      year: "",
      details: "Capacidad 256GB, Color mamaey, Cámara de 48MP.",
      blessedPct: 0.1,
      blessedPrize: "RD$5,000",
      saleStatus: "active",
      blessedDrawInterval: 5,
      countdownTriggerPct: 80,
      countdownDurationDays: 7,
      blessedNumbers: ["01196", "02061", "03628", "04527", "10452", "11946", "18442", "19068", "29402", "32947"]
    },
    carro: {
      id: "carro",
      title: "Gran Sorteo del Carro",
      prize: "Toyota Hilux 2026",
      price: "RD$1,000",
      total: 50000,
      image: "./006.jpeg",
      active: true,
      brand: "Toyota",
      model: "Hilux",
      year: "2026",
      details: "Doble Cabina, Transmisión Automática, Combustible Diesel.",
      blessedPct: 0.05,
      blessedPrize: "RD$5,000",
      saleStatus: "locked",
      blessedDrawInterval: 5,
      countdownTriggerPct: 80,
      countdownDurationDays: 7,
      blessedNumbers: ["00123", "04567", "12345", "18442", "29402", "32947", "45678", "56789", "67890", "78901", "89012", "90123", "01196", "02061", "03628", "04527", "10452", "11946", "19068", "80312", "69819", "02234", "04321", "08976", "09876"]
    },
    patineta: {
      id: "patineta",
      title: "Sorteo Patineta Eléctrica",
      prize: "Patineta Dualtron Ultra",
      price: "RD$300",
      total: 5000,
      image: "./007.jpeg",
      active: true,
      brand: "Dualtron",
      model: "Ultra",
      year: "",
      details: "Velocidad máxima 80 km/h, Autonomía 100 km, Doble motor.",
      blessedPct: 0.2,
      blessedPrize: "RD$3,000",
      saleStatus: "locked",
      blessedDrawInterval: 5,
      countdownTriggerPct: 80,
      countdownDurationDays: 7,
      blessedNumbers: ["00111", "00222", "00333", "00444", "00555", "00666", "00777", "00888", "00999", "01000"]
    }
  };

  let activeRaffleId = "celular";
  let configs = {};
  let allTickets = {};
  let winners = [];
  let supportMessages = [];
  let statsChart = null;

  // --- API HELPERS ---
  const $ = (id) => document.getElementById(id);

  async function getStorageItem(key) {
    try {
      const res = await fetch(`${API_GET_URL}?key=${encodeURIComponent(key)}`);
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
      await fetch(API_SET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: val })
      });
    } catch (e) {
      console.error(`Error setStorageItem for ${key}`, e);
    }
  }

  function pad5(num) {
    return String(num).padStart(5, "0");
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
        }
      });
    });
  }

  // --- EVENT LISTENERS BINDING ---
  function setupEventListeners() {
    $("globalRaffleSelect").addEventListener("change", (e) => {
      loadRaffleState(e.target.value);
    });

    $("cfgRaffleSelect").addEventListener("change", (e) => {
      loadConfigForm(e.target.value);
    });

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
  }

  // --- STATE LOADER ---
  function loadRaffleState(rId) {
    activeRaffleId = rId;
    
    // Header Sync
    const conf = configs[rId];
    $("headerTitle").textContent = conf.title;
    $("headerSubtitle").textContent = `Premio: ${conf.prize} • Precio: ${conf.price} • Total Boletos: ${conf.total.toLocaleString("es-DO")}`;

    // Dropdowns Sync
    if ($("globalRaffleSelect").value !== rId) $("globalRaffleSelect").value = rId;
    if ($("cfgRaffleSelect").value !== rId) $("cfgRaffleSelect").value = rId;

    loadConfigForm(rId);
    updateDashboardStats();
    renderTicketsTable();
  }

  // --- LOAD CONFIG FORM ---
  function loadConfigForm(rId) {
    const conf = configs[rId];
    if (!conf) return;

    $("cfgTitle").value = conf.title || "";
    $("cfgPrize").value = conf.prize || "";
    $("cfgPrice").value = conf.price || "";
    $("cfgTotal").value = conf.total || "";
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

    // Dynamic generation of blessed numbers if total or pct changed
    let blessedNumbers = configs[activeRaffleId].blessedNumbers || [];
    const targetCount = Math.round(total * (blessedPct / 100));
    
    if (blessedNumbers.length !== targetCount || configs[activeRaffleId].blessedPct !== blessedPct || configs[activeRaffleId].total !== total) {
      blessedNumbers = [];
      const used = new Set();
      const countToGen = Math.min(targetCount, total);
      while (blessedNumbers.length < countToGen) {
        const rand = Math.floor(Math.random() * total);
        const formatted = pad5(rand);
        if (!used.has(formatted)) {
          used.add(formatted);
          blessedNumbers.push(formatted);
        }
      }
      blessedNumbers.sort();
    }

    configs[activeRaffleId] = {
      ...configs[activeRaffleId],
      title: $("cfgTitle").value.trim() || configs[activeRaffleId].title,
      prize: $("cfgPrize").value.trim() || configs[activeRaffleId].prize,
      price: $("cfgPrice").value.trim() || configs[activeRaffleId].price,
      total: total,
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

    // Blessed numbers list
    const blessedNumbers = [];
    const used = new Set();
    const targetCount = Math.round(total * (blessedPct / 100));
    const countToGen = Math.min(targetCount, total);
    while (blessedNumbers.length < countToGen) {
      const rand = Math.floor(Math.random() * total);
      const formatted = pad5(rand);
      if (!used.has(formatted)) {
        used.add(formatted);
        blessedNumbers.push(formatted);
      }
    }
    blessedNumbers.sort();

    RAFFLE_IDS.push(id);
    await setStorageItem("suerterd:raffle:ids", JSON.stringify(RAFFLE_IDS));

    const newConfig = {
      id,
      title,
      prize,
      price,
      total,
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
      image: configs["celular"] ? configs["celular"].image : "./suerte_rd_banner.png",
      paymentInstructions: configs["celular"] ? configs["celular"].paymentInstructions : ""
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
      const name = ticket.nombre || "";
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
            ${state !== "bloqueado" ? `<button class="btn btn-green btn-toggle-pay" data-number="${num}" style="padding:6px 10px; font-size:0.75rem;">${state === 'reservado' ? 'Marcar Pagado' : 'Marcar Reservado'}</button>` : ''}
            <button class="btn btn-red btn-release" data-number="${num}" style="padding:6px 10px; font-size:0.75rem;"><i data-lucide="trash-2" style="width:12px;"></i> Liberar</button>
          </div>
        </td>
      `;

      tr.querySelector(".btn-release").addEventListener("click", () => releaseTicket(num));
      const payBtn = tr.querySelector(".btn-toggle-pay");
      if (payBtn) payBtn.addEventListener("click", () => toggleTicketPayment(num));

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
      const res = await fetch("/api/admin/clean-expired", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showNotification(`Limpieza completada. Se liberaron ${data.count} boletos expirados.`, "success");
        // Reload sales
        const tKey = `${TICKETS_KEY_PREFIX}:${activeRaffleId}`;
        const raw = await getStorageItem(tKey);
        allTickets[activeRaffleId] = raw ? JSON.parse(raw) : {};
        loadRaffleState(activeRaffleId);
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
      const res = await fetch(`/api/support/delete?index=${idx}`, { method: "POST" });
      if (res.ok) {
        showNotification("Mensaje eliminado.", "success");
        await fetchSupportMessages();
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
    const reels = [$("reel0"), $("reel1"), $("reel2"), $("reel3"), $("reel4")];
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
      name: details.nombre,
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
      csvContent += `"${num}","${t.nombre}","${t.whatsapp}","${t.loteria}","${t.estado}","${date}"\r\n`;
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
  function showNotification(txt, type) {
    const el = $("statusMessage");
    if (!el) return;

    el.textContent = txt;
    el.className = `status-msg ${type}`;
    el.style.display = "block";

    setTimeout(() => {
      el.style.display = "none";
    }, 4000);
  }

  // Run on startup
  await init();

})();
