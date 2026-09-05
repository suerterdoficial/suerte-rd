(function(){
  // Claves de Almacenamiento
  const CFG_KEY_PREFIX = "suerterd:config:v2";
  const TICKETS_KEY_PREFIX = "suerterd:tickets:v2";
  const WINNERS_KEY = "suerterd:winners:v2";

  // State Variables (Phase 1 & 4)
  let adminPin = sessionStorage.getItem('admin_pin') || '';
  let cart = [];
  
  let RAFFLE_IDS = ["florida5"];
  const RAFFLE_ICONS = {
    florida5: "🌴"
  };

  // --- NUEVAS FUNCIONES DE INTERACTIVIDAD ---
  const DR_NAMES = ["Carlos M.", "Sofía D.", "Juan P.", "Mateo S.", "María G.", "José L.", "Luis A.", "Ana R.", "David C.", "Laura M.", "Diego V.", "Carmen T.", "Manuel R.", "Elena S.", "Ramón N.", "Altagracia M.", "Milagros D.", "Francisco H.", "Yolanda B.", "Pedro G.", "Giselle F.", "Nelson C.", "Patricia J.", "Franklin S.", "Mildred P."];
  const DR_PROVINCES = ["Santo Domingo", "Santiago", "La Vega", "Puerto Plata", "San Cristóbal", "Duarte", "La Altagracia", "San Pedro de Macorís", "La Romana", "Espaillat", "Samaná", "Barahona", "Baní", "Moca", "Montecristi", "Boca Chica", "Constanza", "Jarabacoa", "Higüey"];
  const DR_PRIZES = ["iPhone 16 Pro Max", "Toyota Hilux 2026", "Patineta Dualtron Ultra"];

  function showToast(msg, type = "info") {
    const container = $("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast`;
    
    const iconName = type === "ok" ? "check-circle" : (type === "bad" ? "alert-triangle" : "info");
    const iconClass = type;

    toast.innerHTML = `
      <div class="toast-icon ${iconClass}">
        <i data-lucide="${iconName}"></i>
      </div>
      <div class="toast-content">${msg}</div>
    `;
    container.appendChild(toast);
    lucide.createIcons({attrs: {class: "lucide"}});

    setTimeout(() => toast.classList.add("show"), 10);

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  }

  function initLiveActivityFeed() {
    const container = $("liveActivityContainer");
    if (!container) return;

    function showNextActivity() {
      const name = DR_NAMES[Math.floor(Math.random() * DR_NAMES.length)];
      const province = DR_PROVINCES[Math.floor(Math.random() * DR_PROVINCES.length)];
      const prize = DR_PRIZES[Math.floor(Math.random() * DR_PRIZES.length)];
      const ticketNum = pad5(Math.floor(Math.random() * 10000));
      
      const avatarUrl = `https://ui-avatars.com/api/?background=054c54&color=ffffff&bold=true&size=38&name=${encodeURIComponent(name)}`;

      const card = document.createElement("div");
      card.className = "activity-card";
      card.innerHTML = `
        <img class="activity-avatar" src="${avatarUrl}" alt="${name}">
        <div class="activity-info">
          <span class="activity-user">${name} (${province})</span>
          <span class="activity-desc">Reservó el boleto <strong style="color:var(--cyan)">#${ticketNum}</strong> para el sorteo del ${prize}</span>
        </div>
        <span class="activity-time">Hace 1s</span>
      `;

      container.appendChild(card);

      setTimeout(() => card.classList.add("show"), 10);

      setTimeout(() => {
        card.classList.remove("show");
        setTimeout(() => card.remove(), 600);
      }, 6000);

      const nextTime = Math.random() * (35000 - 18000) + 18000;
      setTimeout(showNextActivity, nextTime);
    }

    setTimeout(showNextActivity, 10000);
  }

  function initParticlesCanvas() {
    const canvas = $("particlesCanvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let particles = [];
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouse = { x: null, y: null };

    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });

    window.addEventListener("mouseleave", () => {
      mouse.x = null;
      mouse.y = null;
    });

    class Particle {
      constructor() {
        this.reset();
        this.y = Math.random() * height;
      }

      reset() {
        this.x = Math.random() * width;
        this.y = height + 10;
        this.size = Math.random() * 2.5 + 0.5;
        this.speedY = -(Math.random() * 0.6 + 0.2);
        this.speedX = Math.random() * 0.4 - 0.2;
        this.alpha = Math.random() * 0.5 + 0.1;
      }

      update() {
        this.y += this.speedY;
        this.x += this.speedX;

        if (mouse.x !== null && mouse.y !== null) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            const force = (100 - dist) / 100;
            this.x += (dx / dist) * force * 2;
            this.y += (dy / dist) * force * 2;
          }
        }

        if (this.y < -10 || this.x < -10 || this.x > width + 10) {
          this.reset();
        }
      }

      draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = "#ffffff";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "#00e5ff";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    for (let i = 0; i < 45; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    }

    animate();
  }

  const DEFAULT_CONFIGS = {
    florida5: {
      id: "florida5",
      title: "Sorteo Especial iPhone 17 Pro Max 1TB",
      prize: "iPhone 17 Pro Max 1TB",
      price: "RD$3",
      total: 100000,
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

  let activeRaffleId = "florida5";
  let configs = {};
  let allTickets = {}; 
  let winners = [];
  let bankAccounts = [];

  const DEFAULT_BANK_ACCOUNTS = [
    { bank: "Banco Qik", type: "Cuenta de Ahorro", number: "1000490608", owner: "Luis Fernando Alvarez" },
    { bank: "Banreservas", type: "Cuenta de Ahorro", number: "9602059888", owner: "Cristhofer Sosa" },
    { bank: "Banco Popular", type: "Cuenta de Ahorro", number: "823386362", owner: "Erika Santos Francisco" },
    { bank: "Scotiabank", type: "Cuenta corriente", number: "03100039851", owner: "Luis Fernando Alvarez" },
    { bank: "Banco BHD", type: "Cuenta de Ahorro", number: "29848790017", owner: "Katherine Daniela Rodriguez Roque" }
  ];
  
  // Modes: random, custom, explore
  let mode = "random";
  let currentNumber = null;
  let currentStatus = null;
  
  // Explorer Pagination
  let explorerPage = 0;
  const explorerLimit = 100;

  // Sound Audio Context
  let audioCtx = null;
  let isMuted = false;

  // ChartJS instances
  let dashboardChart = null;

  const $ = (id) => document.getElementById(id);

  function pad5(n) {
    const conf = configs[activeRaffleId];
    const digitCount = conf ? (conf.ticketDigits || 5) : 5;
    return String(n).padStart(digitCount, "0");
  }

  // Sound Synth Synthesizer using Web Audio API
  function playSound(type) {
    if (isMuted) return;
    if (type !== 'spin' && type !== 'success' && type !== 'draw') return;
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const now = audioCtx.currentTime;

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'spin') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.setValueAtTime(400, now + 0.04);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'success') {
        // Play major triad chord (C Major)
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((f, i) => {
          const o = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          o.type = 'sine';
          o.connect(g);
          g.connect(audioCtx.destination);
          o.frequency.setValueAtTime(f, now + i * 0.07);
          g.gain.setValueAtTime(0.08, now + i * 0.07);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.35 + i * 0.07);
          o.start(now + i * 0.07);
          o.stop(now + 0.4 + i * 0.07);
        });
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(70, now + 0.22);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'draw') {
        // Cosmic sweep for official draw
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 1.2);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.2);
      }
    } catch(e) {
      console.warn("Audio Context block or error", e);
    }
  }

  // Fallback seguro a localStorage si no existe la API de window.storage
  const hasStorageAPI = window.storage && typeof window.storage.get === "function";

  async function getStorageItem(key) {
    // 1. Intentar con el Servidor Backend
    try {
      const res = await fetch(`/api/get?key=${encodeURIComponent(key)}`, {
        headers: { 'x-admin-pin': adminPin }
      });
      if (res.ok) {
        const data = await res.json();
        return data.value;
      }
    } catch (e) {
      console.warn("Server API failed, trying alternate storage methods...", e);
    }

    // 2. Intentar con la API de window.storage (Entorno IDE)
    if (hasStorageAPI) {
      try {
        const res = await window.storage.get(key, true);
        return res ? res.value : null;
      } catch (e) {
        console.warn("Storage API failed, falling back to localStorage", e);
      }
    }

    // 3. Fallback a LocalStorage del navegador
    return localStorage.getItem(key);
  }

  async function setStorageItem(key, val) {
    // 1. Guardar en el Servidor Backend
    let savedOnServer = false;
    try {
      const res = await fetch('/api/set', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin
        },
        body: JSON.stringify({ key, value: val })
      });
      if (res.ok) {
        savedOnServer = true;
      }
    } catch (e) {
      console.warn("Server API set failed, using alternate storage...", e);
    }

    // 2. Guardar en window.storage (Entorno IDE)
    if (hasStorageAPI) {
      try {
        await window.storage.set(key, val, true);
        if (savedOnServer) return;
      } catch (e) {
        console.warn("Storage API set failed, using localStorage as fallback", e);
      }
    }

    // 3. Guardar en LocalStorage del navegador
    localStorage.setItem(key, val);
  }

  // Control de Pantallas / Vistas
  function showScreen(screenName) {
    if (screenName === 'purchase') {
      document.body.classList.add("purchase-mode-active");
      window.scrollTo({top: 0, behavior: "smooth"});
      setTimeout(() => {
        if ($("buyerNameInput").value === "") {
          $("buyerNameInput").focus();
        }
      }, 300);
    } else {
      document.body.classList.remove("purchase-mode-active");
      window.scrollTo({top: 0, behavior: "smooth"});
    }
  }

  // --- SEGURIDAD, NOTIFICACIONES, SOPORTE Y CARRITO (Phases 1, 2, 4, 5) ---
  
  async function verifyAdminPinCode() {
    const pin = $("adminPinInput").value.trim();
    if (!pin) {
      showPinError("Ingresa un PIN válido.");
      return;
    }
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (data.success) {
        adminPin = pin;
        sessionStorage.setItem('admin_pin', pin);
        $("adminPinOverlay").classList.remove("active");
        $("adminPinInput").value = "";
        $("adminPinErrorMsg").style.display = "none";
        openAdminPanel();
      } else {
        showPinError("PIN Incorrecto.");
      }
    } catch(e) {
      showPinError("Error de conexión.");
    }
  }

  function showPinError(msg) {
    const err = $("adminPinErrorMsg");
    err.textContent = msg;
    err.style.display = "block";
    playSound("error");
  }

  let lastViewedNotificationTime = Number(localStorage.getItem('last_notification_time') || 0);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        const notifications = data.value || [];
        renderNotificationsList(notifications);
      }
    } catch(e) {
      console.warn("Error fetching notifications", e);
    }
  }

  function renderNotificationsList(notifications) {
    const list = $("notificationsList");
    const badge = $("notificationsBadge");
    if (!list) return;

    if (notifications.length === 0) {
      list.innerHTML = `<div style="padding: 20px; text-align: center; color: var(--text-grey); font-size: 0.8rem;">No hay actividad registrada.</div>`;
      badge.style.display = "none";
      return;
    }

    const unseenCount = notifications.filter(n => n.timestamp > lastViewedNotificationTime).length;
    if (unseenCount > 0) {
      badge.textContent = unseenCount;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }

    list.innerHTML = notifications.map(n => {
      const timeStr = new Date(n.timestamp).toLocaleTimeString("es-DO", { hour: '2-digit', minute: '2-digit' });
      return `
        <div class="notification-item">
          <div>${escapeHtml(n.text)}</div>
          <span class="notification-time">${timeStr}</span>
        </div>
      `;
    }).join("");
  }

  async function clearNotificationsOnServer() {
    if (!adminPin) {
      lastViewedNotificationTime = Date.now();
      localStorage.setItem('last_notification_time', lastViewedNotificationTime);
      fetchNotifications();
      return;
    }
    try {
      await setStorageItem('notifications', []);
      fetchNotifications();
      showToast("Actividades limpiadas con éxito.", "ok");
    } catch(e) {
      showToast("Error al limpiar notificaciones.", "bad");
    }
  }

  async function handleSupportSubmit(e) {
    e.preventDefault();
    const name = $("supportName").value.trim();
    const whatsapp = $("supportWhatsapp").value.trim();
    const type = $("supportType").value;
    const message = $("supportMessage").value.trim();

    if (!name || !whatsapp || !message) {
      showToast("Por favor completa todos los campos del soporte.", "bad");
      return;
    }

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, whatsapp, type, message })
      });
      if (res.ok) {
        showToast("Mensaje de soporte enviado con éxito.", "ok");
        playSound("success");
        $("supportForm").reset();
        fetchNotifications();
      } else {
        showToast("Error al enviar el mensaje de soporte.", "bad");
      }
    } catch(e) {
      showToast("Error al conectar con el servidor.", "bad");
    }
  }

  async function loadSupportMessages() {
    const tbody = $("adminSupportTableBody");
    if (!tbody) return;
    
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--text-grey);">Cargando consultas...</td></tr>`;

    try {
      const res = await fetch('/api/support', {
        headers: { 'x-admin-pin': adminPin }
      });
      if (res.ok) {
        const data = await res.json();
        const messages = data.value || [];
        renderSupportMessagesTable(messages);
      } else {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--red);">Acceso no autorizado.</td></tr>`;
      }
    } catch(e) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--red);">Error de conexión.</td></tr>`;
    }
  }

  function renderSupportMessagesTable(messages) {
    const tbody = $("adminSupportTableBody");
    tbody.innerHTML = "";
    if (messages.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; font-family:var(--font-mono); color:var(--text-muted)">No hay mensajes de soporte recibidos.</td></tr>`;
      return;
    }

    messages.forEach((m, idx) => {
      const dateStr = new Date(m.timestamp).toLocaleString("es-DO");
      const cleanPhone = m.whatsapp.replace(/\D/g, "");
      const responseText = `Hola ${m.name}, nos comunicamos de Suerte RD en respuesta a tu consulta sobre "${m.type}": "${m.message}". ¿En qué podemos ayudarte?`;
      
      const row = document.createElement("tr");
      row.innerHTML = `
        <td style="font-weight:700;">${escapeHtml(m.name)}</td>
        <td><a href="https://wa.me/${cleanPhone}" target="_blank" style="color:var(--cyan); text-decoration:underline;">${escapeHtml(m.whatsapp)}</a></td>
        <td><span class="badge badge-pending" style="background: rgba(0, 229, 255, 0.1); color: var(--cyan); border: 1px solid var(--border-cyan);">${escapeHtml(m.type)}</span></td>
        <td style="max-width: 250px; white-space: normal; word-break: break-word;">${escapeHtml(m.message)}</td>
        <td style="font-size:0.8rem; color:var(--text-muted);">${dateStr}</td>
        <td>
          <div style="display:flex; gap:5px;">
            <a href="https://wa.me/${cleanPhone}?text=${encodeURIComponent(responseText)}" target="_blank" class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; border-color:var(--green); color:var(--green); display:inline-flex;">Chat</a>
            <button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; border-color:var(--red); color:var(--red)" onclick="window.srd.deleteSupportMessage(${idx})">Borrar</button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
    lucide.createIcons();
  }

  async function deleteSupportMessage(index) {
    if (!confirm("¿Deseas eliminar este mensaje de soporte?")) return;
    try {
      const res = await fetch('/api/support/delete', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': adminPin
        },
        body: JSON.stringify({ index })
      });
      if (res.ok) {
        showToast("Consulta eliminada.", "info");
        playSound("click");
        loadSupportMessages();
      }
    } catch(e) {
      showToast("Error al eliminar consulta.", "bad");
    }
  }

  function addToCart() {
    if (!currentNumber || currentStatus !== "ok") {
      showToast("Por favor selecciona un número de boleto disponible primero.", "bad");
      return;
    }
    
    if (cart.includes(currentNumber)) {
      showToast("Este boleto ya está en tu carrito.", "bad");
      return;
    }

    cart.push(currentNumber);
    playSound("success");
    showToast(`Boleto #${currentNumber} agregado al carrito.`, "ok");
    
    currentNumber = null;
    currentStatus = null;
    updateDigitsRow("", null);
    $("secretInput").value = "";
    $("btnActionReserve").disabled = true;
    $("btnExplorerReserve").disabled = true;
    
    showStatus(mode === "random" ? "Presiona el botón para generar otro aleatorio" : "Escribe otro número de 5 dígitos...", "info");
    
    renderCart();
    
    if (mode === 'explore') {
      renderExplorerGrid();
    }
  }

  function removeFromCart(num) {
    cart = cart.filter(n => n !== num);
    playSound("click");
    renderCart();
    if (mode === 'explore') {
      renderExplorerGrid();
    }
  }

  function updateStep3Badge() {
    const badge = $("step3Badge");
    if (!badge) return;
    if (cart.length === 0) {
      badge.innerHTML = `<i data-lucide="shopping-cart" style="width: 18px; height: 18px;"></i>`;
    } else {
      badge.innerHTML = cart.length;
    }
    lucide.createIcons({attrs: {class: "lucide"}});
  }

  function calculateTotalAmount(count, conf) {
    if (!conf) return 0;
    const ticketPrice = parseInt(conf.price.replace(/\D/g, "")) || 100;
    let remaining = count;
    let totalAmount = 0;
    
    if (remaining >= 500) {
      const packs = Math.floor(remaining / 500);
      totalAmount += packs * 1500;
      remaining = remaining % 500;
    }
    if (remaining >= 250) {
      const packs = Math.floor(remaining / 250);
      totalAmount += packs * 750;
      remaining = remaining % 250;
    }
    if (remaining >= 150) {
      const packs = Math.floor(remaining / 150);
      totalAmount += packs * 450;
      remaining = remaining % 150;
    }
    if (remaining >= 50) {
      const packs = Math.floor(remaining / 50);
      totalAmount += packs * 150;
      remaining = remaining % 50;
    }
    totalAmount += remaining * ticketPrice;
    return totalAmount;
  }

  function renderCart() {
    const list = $("cartItemsList");
    const container = $("cartSection");
    const countBadge = $("cartCountBadge");
    const totalDisplay = $("cartTotalDisplay");
    
    if (cart.length === 0) {
      container.style.display = "none";
      list.innerHTML = "";
      updateStep3Badge();
      return;
    }

    container.style.display = "block";
    countBadge.textContent = cart.length;
    updateStep3Badge();

    const conf = configs[activeRaffleId];
    const totalAmount = calculateTotalAmount(cart.length, conf);

    totalDisplay.textContent = `RD$ ${totalAmount.toLocaleString("es-DO")}`;

    list.innerHTML = cart.map(num => `
      <span class="cart-item-tag">
        #${num}
        <span class="cart-item-remove" onclick="window.srd.removeFromCart('${num}')">&times;</span>
      </span>
    `).join("");

    const btn = $("btnCheckoutCart");
    if (btn) {
      if (cart.length < 25) {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
        btn.innerHTML = `<i data-lucide="alert-triangle" style="width:18px;"></i> Mínimo 25 números requeridos (${cart.length}/25)`;
      } else {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
        btn.innerHTML = `<i data-lucide="check-circle" style="width:18px;"></i> Comprar Boletos Seleccionados`;
      }
      lucide.createIcons();
    }
  }

  // Carrusel automático para la portada (desplazamiento horizontal con indicadores)
  function initHeroCarousel() {
    const track = $("heroCarouselTrack");
    const slides = document.querySelectorAll("#heroCarouselTrack .carousel-slide");
    const dotsContainer = $("heroCarouselDots");
    if (!track || !slides.length) return;
    
    let currentSlide = 0;
    let autoPlayTimer = null;
    
    // Render dots
    if (dotsContainer) {
      dotsContainer.innerHTML = "";
      slides.forEach((_, idx) => {
        const dot = document.createElement("span");
        dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
        dot.addEventListener("click", () => {
          goToSlide(idx);
          resetAutoPlay();
        });
        dotsContainer.appendChild(dot);
      });
    }
    
    function goToSlide(idx) {
      currentSlide = idx;
      track.style.transform = `translateX(-${currentSlide * 100}%)`;
      
      // Update dots
      if (dotsContainer) {
        const dots = dotsContainer.querySelectorAll(".carousel-dot");
        dots.forEach((dot, dIdx) => {
          dot.classList.toggle("active", dIdx === currentSlide);
        });
      }
    }
    
    function startAutoPlay() {
      autoPlayTimer = setInterval(() => {
        goToSlide((currentSlide + 1) % slides.length);
      }, 4000);
    }
    
    function resetAutoPlay() {
      if (autoPlayTimer) {
        clearInterval(autoPlayTimer);
      }
      startAutoPlay();
    }
    
    startAutoPlay();
  }

  // Inicialización de la aplicación
  async function init() {
    // 0. Cargar IDs de Rifas dinámicas
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

    // 1. Cargar Configuración de las Rifas
    for (const rId of RAFFLE_IDS) {
      try {
        const key = `${CFG_KEY_PREFIX}:${rId}`;
        const raw = await getStorageItem(key);
        configs[rId] = raw ? JSON.parse(raw) : (DEFAULT_CONFIGS[rId] ? {...DEFAULT_CONFIGS[rId]} : {
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
      
      // Asegurar que los campos nuevos tengan valores por defecto válidos
      if (configs[rId].blessedPct === undefined) configs[rId].blessedPct = DEFAULT_CONFIGS[rId]?.blessedPct ?? 0.1;
      if (configs[rId].blessedPrize === undefined) configs[rId].blessedPrize = DEFAULT_CONFIGS[rId]?.blessedPrize ?? "RD$5,000";
      if (configs[rId].saleStatus === undefined) configs[rId].saleStatus = DEFAULT_CONFIGS[rId]?.saleStatus ?? "active";
      if (configs[rId].blessedNumbers === undefined || !Array.isArray(configs[rId].blessedNumbers)) {
        configs[rId].blessedNumbers = DEFAULT_CONFIGS[rId]?.blessedNumbers ?? [];
      }
    }

    // 2. Cargar Ventas de Boletos de las Rifas
    for (const rId of RAFFLE_IDS) {
      try {
        const key = `${TICKETS_KEY_PREFIX}:${rId}`;
        const raw = await getStorageItem(key);
        allTickets[rId] = raw ? JSON.parse(raw) : {};
      } catch (e) {
        allTickets[rId] = {};
      }
    }

    // 3. Cargar Ganadores Históricos
    try {
      const raw = await getStorageItem(WINNERS_KEY);
      winners = raw ? JSON.parse(raw) : [];
    } catch(e) {
      winners = [];
    }

    // Cargar Cuentas Bancarias / Métodos de Pago
    try {
      const bankAccountsRaw = await getStorageItem("suerterd:payment:methods");
      if (bankAccountsRaw) {
        bankAccounts = JSON.parse(bankAccountsRaw);
      } else {
        bankAccounts = [...DEFAULT_BANK_ACCOUNTS];
      }
    } catch (e) {
      bankAccounts = [...DEFAULT_BANK_ACCOUNTS];
    }

    // 4. Configurar FAQ Acordeón
    document.querySelectorAll(".faq-question").forEach(q => {
      q.addEventListener("click", () => {
        const item = q.parentElement;
        const isActive = item.classList.contains("active");
        
        document.querySelectorAll(".faq-item").forEach(it => it.classList.remove("active"));
        
        if (!isActive) {
          item.classList.add("active");
          playSound("click");
        }
      });
    });



    // Secret trigger: click the logo 5 times to go to /admin
    let logoClickCount = 0;
    const logoBrand = $("navBrandLogo");
    if (logoBrand) {
      logoBrand.addEventListener("click", () => {
        logoClickCount++;
        if (logoClickCount >= 5) {
          window.location.href = "/admin";
        }
        setTimeout(() => {
          logoClickCount = 0;
        }, 3000);
      });
    }

    // Ensure activeRaffleId is an active raffle
    const activeIds = RAFFLE_IDS.filter(id => configs[id] && configs[id].active !== false);
    if (activeIds.length > 0 && !activeIds.includes(activeRaffleId)) {
      activeRaffleId = activeIds[0];
    }

    renderRaffleSelectorDropdown();
    renderRaffleSelector();
    loadRaffleState(activeRaffleId);
    renderWinnersCarousel();
    renderFaqBankAccounts();
    updateStatsCountdown();
    
    const winCarousel = $("winnersCarousel");
    if (winCarousel) {
      winCarousel.addEventListener("mouseenter", () => {
        if (winnersCarouselInterval) {
          clearInterval(winnersCarouselInterval);
          winnersCarouselInterval = null;
        }
      });
      winCarousel.addEventListener("mouseleave", () => {
        startWinnersCarouselAutoScroll();
      });
    }
    
    initHeroCarousel();
    initParticlesCanvas();
    initLiveActivityFeed();
    
    // Notificaciones iniciales y polling (Phase 2)
    fetchNotifications();
    setInterval(fetchNotifications, 20000);

    // Formulario de soporte (Phase 2)
    const sForm = $("supportForm");
    if (sForm) {
      sForm.addEventListener("submit", handleSupportSubmit);
    }

    // Hover confetti event listener for red buttons (Phase 2 & 4)
    document.addEventListener('mouseover', (e) => {
      const btn = e.target.closest('button, .btn, .keypad-btn, .sound-btn, .admin-btn, .tab-btn, .arrow-btn, .page-btn, .btn-back-home, .notification-btn, .modal-close-btn, .btn-primary, .btn-secondary');
      if (!btn) return;
      if (btn.dataset.hovered === 'true') return;
      btn.dataset.hovered = 'true';

      const style = window.getComputedStyle(btn);
      const color = style.color;
      const border = style.borderColor;
      const bg = style.backgroundColor;
      
      const isRed = color.includes('255, 77, 94') || 
                    border.includes('255, 77, 94') || 
                    bg.includes('255, 77, 94') ||
                    btn.classList.contains('red') ||
                    btn.classList.contains('has-confetti') ||
                    btn.id.toLowerCase().includes('delete') ||
                    btn.id.toLowerCase().includes('clear') ||
                    btn.id.toLowerCase().includes('clean') ||
                    btn.textContent.toLowerCase().includes('borrar') ||
                    btn.textContent.toLowerCase().includes('eliminar');

      if (isRed) {
        const rect = btn.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        
        confetti({
          particleCount: 20,
          spread: 45,
          origin: { x, y },
          colors: ['#FF4D5E', '#FFD700', '#00E5FF', '#00E676'],
          ticks: 60
        });
      }
    });

    document.addEventListener('mouseout', (e) => {
      const btn = e.target.closest('button, .btn, .keypad-btn, .sound-btn, .admin-btn, .tab-btn, .arrow-btn, .page-btn, .btn-back-home, .notification-btn, .modal-close-btn, .btn-primary, .btn-secondary');
      if (btn) {
        delete btn.dataset.hovered;
      }
    });



    lucide.createIcons();
  }

  function checkStep2Validation() {
    const step3 = $("step3Card");
    const warning = $("step3Warning");

    // Verificar si la cuenta regresiva del sorteo ha finalizado
    const conf = configs[activeRaffleId];
    const isCountdownFinished = conf && conf.countdownStartedAt && 
      (Number(conf.countdownStartedAt) + ((conf.countdownDurationDays || 7) * 24 * 60 * 60 * 1000)) <= Date.now();

    if (isCountdownFinished) {
      step3.classList.add("form-locked-state");
      warning.style.display = "flex";
      warning.innerHTML = `<i data-lucide="alert-triangle" style="width:16px; margin-right:5px; vertical-align:middle;"></i> Las ventas han cerrado para este sorteo.`;
      lucide.createIcons();
      return;
    }

    step3.classList.remove("form-locked-state");
    warning.style.display = "none";
  }

  function renderRaffleSelectorDropdown() {
    const select = $("ticketRaffleSelect");
    if (select) {
      select.innerHTML = "";
      RAFFLE_IDS.forEach(rId => {
        const conf = configs[rId];
        if (conf.active === false) return;
        const isLocked = conf.saleStatus === "locked";
        const opt = document.createElement("option");
        opt.value = rId;
        opt.textContent = isLocked ? `[PRÓXIMAMENTE] ${conf.title}` : `${conf.title} (${conf.price})`;
        if (isLocked) {
          opt.disabled = true;
        }
        select.appendChild(opt);
      });
    }
  }

  function loadRaffleState(rId) {
    const activeIds = RAFFLE_IDS.filter(id => configs[id] && configs[id].active !== false);
    if (activeIds.length > 0 && !activeIds.includes(rId)) {
      rId = activeIds[0];
    }
    activeRaffleId = rId;

    const conf = configs[rId];
    $("heroTitle").innerHTML = `${conf.title.split(" ").slice(0, -1).join(" ") || "Sorteo"} <span>${conf.title.split(" ").slice(-1)[0] || "RD"}</span>`;
    $("heroSubtitle").textContent = `Participa por nuestro gran premio: ${conf.prize}.`;
    
    const bannerImg = $("heroBannerImg");
    if (bannerImg) {
      bannerImg.src = conf.image;
    }

    $("jackpotDisplay").textContent = conf.prize;

    const digitCount = conf.ticketDigits || 5;
    const digitsRow = $("digitsRow");
    if (digitsRow) {
      digitsRow.innerHTML = "";
      const placeholderIcon = RAFFLE_ICONS[activeRaffleId] || "🎰";
      for (let i = 0; i < digitCount; i++) {
        const cell = document.createElement("div");
        cell.className = "digit-cell placeholder-icon";
        cell.textContent = placeholderIcon;
        digitsRow.appendChild(cell);
      }
    }

    const reelRow = $("reelRow");
    if (reelRow) {
      reelRow.innerHTML = "";
      for (let i = 0; i < digitCount; i++) {
        const reelCell = document.createElement("div");
        reelCell.className = "reel-cell";
        reelCell.textContent = "0";
        reelRow.appendChild(reelCell);
      }
    }

    const secretInput = $("secretInput");
    if (secretInput) {
      secretInput.setAttribute("maxlength", digitCount);
    }

    const explorerSearch = $("explorerSearch");
    if (explorerSearch) {
      explorerSearch.setAttribute("maxlength", digitCount);
    }

    if ($("ticketRaffleSelect").value !== rId) {
      $("ticketRaffleSelect").value = rId;
    }

    currentNumber = null;
    currentStatus = null;
    updateDigitsRow("", null);
    $("secretInput").value = "";
    $("btnActionReserve").disabled = true;
    $("btnExplorerReserve").disabled = true;
    
    showStatus(mode === "random" ? "Presiona el botón para elegir un número aleatorio" : `Escribe un número de ${digitCount} dígitos...`, "info");

    renderProgress();
    renderDrawResults();
    renderBlessedNumbers();
    updateStatsCountdown();
    updateAdminForm(rId);
    updatePrizeShowcase(rId);
    
    if (mode === 'explore') {
      renderExplorerGrid();
    }

    document.querySelectorAll(".raffle-card").forEach(c => {
      c.classList.toggle("active", c.getAttribute("data-id") === rId);
    });
  }

  // --- GESTIÓN DINÁMICA DE RIFAS (Crear y Eliminar) ---

  function openCreateRaffleModal() {
    $("newRaffleId").value = "";
    $("newRaffleTitle").value = "";
    $("newRafflePrize").value = "";
    $("newRafflePrice").value = "RD$500";
    $("newRaffleTotal").value = "10000";
    $("newRaffleBlessedPct").value = "0.1";
    $("newRaffleBlessedPrize").value = "RD$5,000";
    $("newRaffleSaleStatus").value = "active";
    $("createRaffleOverlay").classList.add("active");
    playSound("click");
    setTimeout(() => $("newRaffleId").focus(), 300);
  }

  function closeCreateRaffleModal() {
    $("createRaffleOverlay").classList.remove("active");
    playSound("click");
  }

  async function submitCreateRaffle() {
    const rawId = $("newRaffleId").value.trim().toLowerCase();
    const id = rawId.replace(/[^a-z0-9]/g, "");
    const title = $("newRaffleTitle").value.trim();
    const prize = $("newRafflePrize").value.trim();
    const price = $("newRafflePrice").value.trim() || "RD$500";
    const total = Math.max(10, Math.min(100000, parseInt($("newRaffleTotal").value, 10) || 10000));
    const blessedPct = parseFloat($("newRaffleBlessedPct").value) || 0.1;
    const blessedPrize = $("newRaffleBlessedPrize").value.trim() || "RD$5,000";
    const saleStatus = $("newRaffleSaleStatus").value || "active";

    if (!id || !title || !prize) {
      showToast("Completa los campos obligatorios.", "bad");
      playSound("error");
      return;
    }

    if (RAFFLE_IDS.includes(id)) {
      showToast("Este código único ya existe.", "bad");
      playSound("error");
      return;
    }

    // Generar números bendecidos dinámicamente según el porcentaje y total
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
    try {
      await setStorageItem("suerterd:raffle:ids", JSON.stringify(RAFFLE_IDS));
      
      const newConfig = {
        title,
        prize,
        price,
        total,
        blessedPct,
        blessedPrize,
        saleStatus,
        blessedNumbers,
        brand: "",
        model: "",
        year: "",
        details: "Gran sorteo premium. Elige tu boleto.",
        active: true,
        image: configs["florida5"] ? configs["florida5"].image : "./suerte_rd_banner.png",
        paymentInstructions: configs["florida5"] ? configs["florida5"].paymentInstructions : ""
      };
      configs[id] = newConfig;

      const key = `${CFG_KEY_PREFIX}:${id}`;
      await setStorageItem(key, JSON.stringify(newConfig));

      allTickets[id] = {};
      const tKey = `${TICKETS_KEY_PREFIX}:${id}`;
      await setStorageItem(tKey, JSON.stringify({}));

      showToast(`¡Sorteo "${title}" creado con éxito!`, "ok");
      playSound("success");
      
      closeCreateRaffleModal();

      renderRaffleSelectorDropdown();
      renderRaffleSelector();
      loadRaffleState(id);
      
      $("cfgRaffleSelect").value = id;
      updateAdminForm(id);
      updateStatsPane();
      updateReservationsTable();
    } catch(e) {
      showToast("Error al guardar nuevo sorteo.", "bad");
    }
  }

  async function deleteCurrentRaffle() {
    const editId = $("cfgRaffleSelect").value;
    if (RAFFLE_IDS.length <= 1) {
      showToast("Debe haber al menos un sorteo activo en el sistema.", "bad");
      playSound("error");
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente el sorteo "${configs[editId].title}"?\nEsto borrará todas las configuraciones y ventas registradas.`)) {
      return;
    }

    RAFFLE_IDS.splice(RAFFLE_IDS.indexOf(editId), 1);
    try {
      await setStorageItem("suerterd:raffle:ids", JSON.stringify(RAFFLE_IDS));
      
      delete configs[editId];
      delete allTickets[editId];

      showToast("Sorteo eliminado con éxito.", "info");
      playSound("click");

      const fallbackId = RAFFLE_IDS[0];
      renderRaffleSelectorDropdown();
      renderRaffleSelector();
      loadRaffleState(fallbackId);

      $("cfgRaffleSelect").value = fallbackId;
      updateAdminForm(fallbackId);
      updateStatsPane();
      updateReservationsTable();
    } catch(e) {
      showToast("Error al eliminar sorteo.", "bad");
    }
  }

  function updatePrizeShowcase(rId) {
    const panel = $("prizeShowcasePanel");
    if (!panel) return;

    const conf = configs[rId];
    let imageSrc = conf.image || (DEFAULT_CONFIGS[rId] ? DEFAULT_CONFIGS[rId].image : "./suerte_rd_banner.png");
    let badgeText = `🎁 ¡SORTEO ${conf.prize.toUpperCase()}!`;
    let badgeColor = "var(--cyan)";

    if (rId === "florida5") {
      badgeText = "🌴 ¡LOTERÍA DE FLORIDA!";
      badgeColor = "var(--green)";
    }

    // Reset panel animation by cloning and replacing
    panel.classList.remove("show-anim");
    void panel.offsetWidth; // trigger reflow
    panel.classList.add("show-anim");

    const brandModel = (conf.brand || conf.model) ? `• ${conf.brand || ""} ${conf.model || ""} ${(rId === 'carro' && conf.year) ? conf.year : ""}` : "";
    const descriptionText = conf.details || "Completa el paso 2 y selecciona tu número de 5 dígitos para reservar tu boleto.";

    panel.innerHTML = `
      <div class="showcase-content">
        <div class="showcase-visual">
          <div class="showcase-shine"></div>
          <img class="showcase-img" src="${imageSrc}" alt="${conf.title}">
        </div>
        <div class="showcase-details">
          <span class="showcase-badge" style="background: ${badgeColor}; box-shadow: 0 0 10px ${badgeColor}; color: #000; font-weight: 800;">${badgeText}</span>
          <h4 class="showcase-title" style="margin: 4px 0; font-weight: 800; font-family: var(--font-title);">${escapeHtml(conf.title)} <span style="font-size:0.85rem; font-weight:600; color:var(--text-grey); font-family:var(--font-sans); display:block; margin-top:2px;">${escapeHtml(brandModel)}</span></h4>
          <div class="showcase-stats">
            <div class="showcase-stat">
              <span class="stat-lbl">PRECIO DE BOLETO</span>
              <span class="stat-val highlight" style="color: var(--gold); text-shadow: 0 0 8px rgba(255,215,0,0.3); font-weight: 800;">${escapeHtml(conf.price)}</span>
            </div>
            <div class="showcase-stat">
              <span class="stat-lbl">TOTAL BOLETOS</span>
              <span class="stat-val" style="font-weight: 700;">${conf.total.toLocaleString("es-DO")}</span>
            </div>
          </div>
          <p class="showcase-desc">${escapeHtml(descriptionText)}</p>
        </div>
      </div>
    `;
    lucide.createIcons();
  }

  function renderRaffleSelector() {
    const container = $("raffleGrid");
    container.innerHTML = "";

    RAFFLE_IDS.forEach(rId => {
      const conf = configs[rId];
      if (conf.active === false) return;
      const sold = Object.keys(allTickets[rId]).length;
      const total = Math.max(1, Number(conf.total) || 10000);
      const pct = Math.min(100, (sold / total) * 100);

      const isLocked = conf.saleStatus === "locked";

      const card = document.createElement("div");
      card.className = `raffle-card ${rId === activeRaffleId ? 'active' : ''} ${isLocked ? 'raffle-locked' : ''}`;
      card.setAttribute("data-id", rId);
      
      let badgeHtml = "";
      if (isLocked) {
        badgeHtml = `<span class="raffle-status-badge">PRÓXIMAMENTE</span>`;
      }

      card.innerHTML = `
        <div class="raffle-img-box">
          ${badgeHtml}
          <img class="raffle-img" src="${conf.image}" alt="${conf.title}">
        </div>
        <div class="raffle-card-content">
          <div class="raffle-card-title">${escapeHtml(conf.title)}</div>
          <div class="raffle-card-meta">
            <span class="raffle-card-price">${escapeHtml(conf.price)}</span>
            <span class="raffle-card-percent">${isLocked ? 'Exhibición' : `${pct.toFixed(1)}% vendido`}</span>
          </div>
          ${isLocked ? `
          <div style="font-size:0.75rem; color:var(--text-grey); font-weight:600; display:flex; align-items:center; gap:4px; margin-top:8px;">
            <i data-lucide="lock" style="width:12px; color:var(--red);"></i> Compras deshabilitadas
          </div>
          ` : `
          <div class="progress-track" style="height:8px; border-color: rgba(0, 229, 255, 0.25);">
            <div class="progress-bar" style="width: ${pct}%"></div>
          </div>
          `}
        </div>
      `;

      card.addEventListener("click", () => {
        playSound("click");
        if (isLocked) {
          showToast("Este sorteo está en exhibición. Aún no está abierto para compra.", "info");
          return;
        }
        loadRaffleState(rId);
        showScreen('purchase');
      });
      container.appendChild(card);
    });
    lucide.createIcons();
  }

  function renderBlessedNumbers() {
    const grid = document.querySelector(".bendecidos-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const conf = configs[activeRaffleId] || {};
    const blessedList = conf.blessedNumbers || [];
    const tickets = allTickets[activeRaffleId] || {};
    const soldCount = Object.keys(tickets).length;
    const prize = conf.blessedPrize || "RD$5,000";
    
    // Actualizar el título de la sección de bendecidos
    const titleEl = document.querySelector(".bendecidos-title");
    if (titleEl) {
      titleEl.textContent = `10 NÚMEROS BENDECIDOS DE ${prize} CADA UNO`;
    }

    // Actualizar el footer de bendecidos
    const footerEl = document.getElementById("bendecidosFooter");
    if (footerEl) {
      footerEl.textContent = `Cada número bendecido aumentará su porcentaje (%) según las ventas de boletos. Al llegar al 100%, se generará automáticamente el número bendecido ganador y su dueño obtendrá ${prize} de inmediato.`;
    }

    for (let i = 0; i < 10; i++) {
      const milestone = (i + 1) * 10000;
      const num = blessedList[i]; // May be undefined
      
      const item = document.createElement("div");
      item.className = "bendecido-item";
      
      if (num) {
        // This slot is generated and has a winner!
        const ticket = tickets[num];
        const winnerName = ticket ? (ticket.name || ticket.nombre || "Cliente") : "Cliente";
        
        item.innerHTML = `
          <button class="bendecido-btn btn-black has-confetti" data-number="${num}" style="border-color: var(--gold); color: var(--gold); background: rgba(255, 215, 0, 0.05); font-weight: 800; font-family: var(--font-mono); font-size: 1.2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80px; gap: 4px; padding: 10px; cursor: default; width: 100%;">
            <span style="font-size: 1.1rem; letter-spacing: 1px;">#${num}</span>
            <span style="font-size: 0.65rem; color: #FFF; font-weight: 700; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px;" title="${escapeHtml(winnerName)}">👑 ${escapeHtml(winnerName)}</span>
          </button>
          <span class="badge-status-red" style="font-size: 0.65rem; padding: 2px 6px; margin-top: 4px; background: rgba(0, 230, 118, 0.15); color: var(--green); border: 1px solid var(--green);">¡GANADOR!</span>
        `;
      } else {
        // Calculate percentage progress toward milestone
        const pct = Math.min(100, Math.floor((soldCount / milestone) * 100));
        const formattedPct = String(pct).padStart(2, "0");
        const isCompleted = pct >= 100;

        item.innerHTML = `
          <button class="bendecido-btn btn-teal" disabled style="opacity: 0.95; background: linear-gradient(180deg, rgba(5, 76, 84, 0.6) 0%, rgba(2, 35, 39, 0.8) 100%); border: 1.5px solid ${isCompleted ? 'var(--gold)' : 'var(--border-cyan)'}; color: ${isCompleted ? 'var(--gold)' : 'var(--cyan)'}; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 80px; gap: 4px; padding: 8px 10px; cursor: not-allowed; width: 100%;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <i data-lucide="${isCompleted ? 'sparkles' : 'lock'}" style="width: 15px; height: 15px; color: ${isCompleted ? 'var(--gold)' : 'var(--cyan)'};"></i>
              <span style="font-size: 1.25rem; font-weight: 900; font-family: var(--font-mono); letter-spacing: 0.5px;">${formattedPct}%</span>
            </div>
            <div style="width: 85%; height: 5px; background: rgba(255, 255, 255, 0.1); border-radius: 10px; overflow: hidden; border: 1px solid rgba(0, 229, 255, 0.2); margin-top: 2px;">
              <div style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, var(--cyan), var(--gold)); border-radius: 10px; transition: width 0.4s ease;"></div>
            </div>
            <span style="font-size: 0.6rem; font-weight: 700; color: var(--text-grey); text-transform: uppercase; font-family: var(--font-mono); margin-top: 1px;">
              ${isCompleted ? '¡Desbloqueando...!' : 'Progreso de Ventas'}
            </span>
          </button>
        `;
      }
      grid.appendChild(item);
    }
    lucide.createIcons();
  }

  let countdownIntervalId = null;

  function updateCountdown() {
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }

    const conf = configs[activeRaffleId];
    if (!conf) return;

    const heroContainer = $("heroCountdownContainer");
    const purchaseContainer = $("purchaseCountdownContainer");

    if (conf.countdownStartedAt) {
      const durationDays = conf.countdownDurationDays !== undefined ? parseFloat(conf.countdownDurationDays) : 7;
      const durationMs = durationDays * 24 * 60 * 60 * 1000;
      const targetTime = Number(conf.countdownStartedAt) + durationMs;

      const tick = () => {
        const now = Date.now();
        const diff = targetTime - now;

        if (diff <= 0) {
          clearInterval(countdownIntervalId);
          countdownIntervalId = null;
          if ($("heroCountdownTimer")) $("heroCountdownTimer").innerHTML = `<span style="color:var(--red)">VENTAS CERRADAS</span>`;
          if ($("purchaseCountdownTimer")) $("purchaseCountdownTimer").innerHTML = `<span style="color:var(--red)">VENTAS CERRADAS</span>`;
          checkStep2Validation();
          return;
        }

        const totalSeconds = Math.floor(diff / 1000);
        const weeks = Math.floor(totalSeconds / (7 * 24 * 60 * 60));
        const remSecsAfterWeeks = totalSeconds % (7 * 24 * 60 * 60);
        const days = Math.floor(remSecsAfterWeeks / (24 * 60 * 60));
        const remSecsAfterDays = remSecsAfterWeeks % (24 * 60 * 60);
        const hours = Math.floor(remSecsAfterDays / (60 * 60));
        const remSecsAfterHours = remSecsAfterDays % (60 * 60);
        const minutes = Math.floor(remSecsAfterHours / 60);
        const seconds = remSecsAfterHours % 60;

        const pad = (n) => String(n).padStart(2, "0");
        const formatted = `${weeks} semanas, ${days} días, ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

        if ($("heroCountdownTimer")) $("heroCountdownTimer").textContent = formatted;
        if ($("purchaseCountdownTimer")) $("purchaseCountdownTimer").textContent = formatted;
      };

      countdownIntervalId = setInterval(tick, 1000);
      tick();

      if (heroContainer) heroContainer.style.display = "block";
      if (purchaseContainer) purchaseContainer.style.display = "block";
    } else {
      if (heroContainer) heroContainer.style.display = "none";
      if (purchaseContainer) purchaseContainer.style.display = "none";
      checkStep2Validation(); // Resetear estado de bloqueo si no ha expirado
    }
  }

  function renderProgress() {
    const conf = configs[activeRaffleId];
    const ticketsObj = allTickets[activeRaffleId];
    const sold = Object.keys(ticketsObj).length;
    const total = Math.max(1, Number(conf.total) || 10000);
    const pct = Math.min(100, (sold / total) * 100);

    $("soldLabel").textContent = `${sold.toLocaleString("es-DO")} vendidos de ${total.toLocaleString("es-DO")}`;
    $("pctLabel").textContent = `${pct.toFixed(1)}% comprado`;
    $("progressBar").style.width = `${pct}%`;

    const cardEl = document.querySelector(`.raffle-card[data-id="${activeRaffleId}"]`);
    if (cardEl) {
      const pEl = cardEl.querySelector(".raffle-card-percent");
      const bEl = cardEl.querySelector(".progress-bar");
      if (pEl) pEl.textContent = `${pct.toFixed(1)}% vendido`;
      if (bEl) bEl.style.width = `${pct}%`;
    }

    // Calculate accumulated revenue: price * sold tickets
    const priceNum = parseFloat(conf.price.replace(/[^\d.]/g, "")) || 0;
    const accumulated = priceNum * sold;
    const accDisplay = $("accumulatedDisplay");
    if (accDisplay) {
      accDisplay.textContent = `RD$ ${accumulated.toLocaleString("es-DO")}`;
    }
    renderBlessedNumbers();
    updateCountdown();
  }

  function renderDrawResults() {
    const el = $("lottoBallsRow");
    if (!el) return;
    el.innerHTML = "";

    const conf = configs[activeRaffleId] || {};
    const blessedList = conf.blessedNumbers || [];
    const tickets = allTickets[activeRaffleId] || {};
    const prize = conf.blessedPrize || "RD$5,000";

    const titleEl = $("lastDrawTitle");
    const labelEl = $("lastDrawWinner");
    
    if (titleEl) titleEl.textContent = "Premios al instante";
    if (labelEl) labelEl.textContent = `${prize} c/u`;

    if (blessedList.length === 0) {
      el.innerHTML = `<div style="color:var(--text-grey); font-family:var(--font-mono); font-size:0.8rem; padding: 10px;">Ninguno configurado</div>`;
      return;
    }

    el.innerHTML = blessedList.map(num => {
      const ticket = tickets[num];
      const isSold = ticket && (ticket.estado === 'reservado' || ticket.estado === 'pagado');
      const extraClass = isSold ? 'sold' : 'available';
      return `<div class="blessed-mini-ball ${extraClass}" title="Boleto #${num} - ${isSold ? 'Vendido' : 'Disponible'}">${num}</div>`;
    }).join("");
  }

  function getAvatar(name) {
    return `https://ui-avatars.com/api/?background=054c54&color=ffffff&bold=true&name=${encodeURIComponent(name)}`;
  }

  function renderWinnersCarousel() {
    const el = $("winnersCarousel");
    el.innerHTML = "";

    if (!winners.length) {
      el.innerHTML = `<div style="text-align:center; color:var(--text-grey); width:100%; padding:30px; font-family:var(--font-mono); font-size:0.9rem;"><i data-lucide="award" style="width:20px; vertical-align:middle; margin-right:8px;"></i> No hay ganadores registrados aún. ¡Pronto aparecerán aquí!</div>`;
      lucide.createIcons({attrs: {class: "lucide"}});
      return;
    }

    winners.slice().reverse().forEach(w => {
      const photo = w.photoUrl && w.photoUrl.trim() ? w.photoUrl.trim() : getAvatar(w.name);
      const card = document.createElement("div");
      card.className = "winner-card";
      card.innerHTML = `
        <img class="winner-avatar" src="${photo}" alt="${w.name}" onerror="this.src='${getAvatar(w.name)}'">
        <div class="winner-name">${escapeHtml(w.name)}</div>
        <div class="winner-ticket-num">#${escapeHtml(pad5(w.number))}</div>
        <div class="winner-prize-desc">${escapeHtml(w.prize || "Premio")}</div>
      `;
      el.appendChild(card);
    });
    // Start auto-scroll for winners carousel
    if (winners.length > 0) {
      startWinnersCarouselAutoScroll();
    }
  }

  let winnersCarouselInterval = null;
  function startWinnersCarouselAutoScroll() {
    const carousel = $("winnersCarousel");
    if (!carousel) return;
    
    if (winnersCarouselInterval) {
      clearInterval(winnersCarouselInterval);
    }
    
    winnersCarouselInterval = setInterval(() => {
      const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
      if (carousel.scrollLeft >= maxScrollLeft - 10) {
        carousel.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        carousel.scrollBy({ left: 300, behavior: 'smooth' });
      }
    }, 3500);
  }

  $("carouselPrevBtn").addEventListener("click", () => {
    $("winnersCarousel").scrollLeft -= 300;
    playSound("click");
  });
  $("carouselNextBtn").addEventListener("click", () => {
    $("winnersCarousel").scrollLeft += 300;
    playSound("click");
  });

  let statsCountdownIntervalId = null;

  function updateStatsCountdown() {
    if (statsCountdownIntervalId) {
      clearInterval(statsCountdownIntervalId);
      statsCountdownIntervalId = null;
    }

    const conf = configs[activeRaffleId];
    const timerRow = $("mainCountdownTimerRow");
    const placeholderMsg = $("countdownPlaceholderMessage");

    if (!conf || !timerRow) return;

    if (conf.countdownStartedAt) {
      timerRow.style.display = "flex";
      if (placeholderMsg) placeholderMsg.style.display = "none";

      const durationDays = conf.countdownDurationDays !== undefined ? parseFloat(conf.countdownDurationDays) : 7;
      const durationMs = durationDays * 24 * 60 * 60 * 1000;
      const targetTime = Number(conf.countdownStartedAt) + durationMs;

      const tick = () => {
        const now = Date.now();
        const diff = targetTime - now;

        if (diff <= 0) {
          clearInterval(statsCountdownIntervalId);
          statsCountdownIntervalId = null;
          $("cdDays").textContent = "00";
          $("cdHours").textContent = "00";
          $("cdMins").textContent = "00";
          $("cdSecs").textContent = "00";
          return;
        }

        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / (24 * 60 * 60));
        const remSecsAfterDays = totalSeconds % (24 * 60 * 60);
        const hours = Math.floor(remSecsAfterDays / (60 * 60));
        const remSecsAfterHours = remSecsAfterDays % (60 * 60);
        const minutes = Math.floor(remSecsAfterHours / 60);
        const seconds = remSecsAfterHours % 60;

        const pad = (n) => String(n).padStart(2, "0");

        $("cdDays").textContent = pad(days);
        $("cdHours").textContent = pad(hours);
        $("cdMins").textContent = pad(minutes);
        $("cdSecs").textContent = pad(seconds);
      };

      statsCountdownIntervalId = setInterval(tick, 1000);
      tick();
    } else {
      timerRow.style.display = "none";
      if (placeholderMsg) placeholderMsg.style.display = "block";
    }
  }

  function runSlotAnimation(finalNumber, onDone) {
    const reels = document.querySelectorAll("#reelRow .reel-cell");
    $("slotOverlay").classList.add("active");
    $("slotStatus").textContent = "GIRANDO TÓMBOLA...";
    $("goodLuckText").style.display = "none";

    let intervals = [];
    reels.forEach((reel, i) => {
      reel.className = "reel-cell spinning";
      const timer = setInterval(() => {
        reel.textContent = Math.floor(Math.random() * 10);
        playSound("spin");
      }, 70);
      intervals.push(timer);

      setTimeout(() => {
        clearInterval(timer);
        reel.textContent = finalNumber[i];
        reel.className = "reel-cell locked";

        if (i === reels.length - 1) {
          $("slotStatus").textContent = "¡Combinación de la suerte!";
          playSound("success");
          $("goodLuckText").style.display = "block";
          setTimeout(() => {
            $("slotOverlay").classList.remove("active");
            onDone();
          }, 2200);
        }
      }, 700 + i * 300);
    });
  }

  function generateRandomNumber() {
    const conf = configs[activeRaffleId];
    const maxVal = Math.max(1, Number(conf.total) || 10000);
    const ticketsObj = allTickets[activeRaffleId];
    const soldList = Object.keys(ticketsObj);

    if (soldList.length >= maxVal) {
      showStatus("¡Todos los números de esta rifa están agotados!", "bad");
      playSound("error");
      return;
    }

    let val, attempts = 0;
    do {
      val = pad5(Math.floor(Math.random() * maxVal));
      attempts++;
    } while (ticketsObj[val] && attempts < 800);

    if (ticketsObj[val]) {
      for (let i = 0; i < maxVal; i++) {
        const formatted = pad5(i);
        if (!ticketsObj[formatted]) {
          val = formatted;
          break;
        }
      }
    }

    $("btnActionRandom").disabled = true;
    runSlotAnimation(val, () => {
      currentNumber = val;
      currentStatus = "ok";
      updateDigitsRow(val, "ok");
      showStatus("Número disponible. Procede al apartado.", "ok");
      $("btnActionReserve").disabled = false;
      $("btnActionRandom").disabled = false;
    });
  }

  function generate25RandomNumbers() {
    const conf = configs[activeRaffleId];
    const maxVal = Math.max(1, Number(conf.total) || 10000);
    const ticketsObj = allTickets[activeRaffleId];
    const soldList = Object.keys(ticketsObj);
    
    const countNeeded = 25;
    const selected = new Set(cart);
    
    if (soldList.length + selected.size >= maxVal) {
      showToast("No hay suficientes números disponibles.", "bad");
      playSound("error");
      return;
    }
    
    const added = [];
    let attempts = 0;
    while (added.length < countNeeded && attempts < 5000) {
      const num = Math.floor(Math.random() * maxVal);
      const formatted = pad5(num);
      if (!ticketsObj[formatted] && !selected.has(formatted)) {
        selected.add(formatted);
        added.push(formatted);
      }
      attempts++;
    }
    
    if (added.length < countNeeded) {
      for (let i = 0; i < maxVal; i++) {
        const formatted = pad5(i);
        if (!ticketsObj[formatted] && !selected.has(formatted)) {
          selected.add(formatted);
          added.push(formatted);
          if (added.length === countNeeded) break;
        }
      }
    }
    
    if (added.length === 0) {
      showToast("No hay números disponibles para agregar.", "bad");
      playSound("error");
      return;
    }
    
    cart.push(...added);
    playSound("success");
    showToast(`¡${added.length} números aleatorios agregados al carrito!`, "ok");
    renderCart();
    if (mode === 'explore') {
      renderExplorerGrid();
    }
  }

  function switchMode(newMode) {
    mode = newMode;
    $("tabRandomBtn").classList.toggle("active", mode === "random");
    $("tabCustomBtn").classList.toggle("active", mode === "custom");
    $("tabExploreBtn").classList.toggle("active", mode === "explore");

    $("selectorTicketBox").style.display = (mode === "explore") ? "none" : "block";
    $("explorerTicketBox").style.display = (mode === "explore") ? "block" : "none";
    $("manualKeypad").style.display = (mode === "custom") ? "grid" : "none";

    currentNumber = null;
    currentStatus = null;
    $("secretInput").value = "";
    updateDigitsRow("", null);
    $("btnActionReserve").disabled = true;
    $("btnExplorerReserve").disabled = true;

    if (mode === "random") {
      showStatus("Presiona el botón para generar tu número aleatorio", "info");
    } else if (mode === "custom") {
      showStatus("Escribe un número de 5 dígitos usando el teclado", "info");
      focusSecretInput();
    } else if (mode === "explore") {
      explorerPage = 0;
      renderExplorerGrid();
    }
    playSound("click");
  }

  function focusSecretInput() {
    $("secretInput").focus();
  }

  function handleSecretInput() {
    const conf = configs[activeRaffleId];
    const digitCount = conf ? (conf.ticketDigits || 5) : 5;
    const rawVal = $("secretInput").value.replace(/\D/g, "").slice(0, digitCount);
    $("secretInput").value = rawVal;

    if (rawVal.length < digitCount) {
      updateDigitsRow(rawVal, null);
      showStatus(rawVal.length === 0 ? `Introduce ${digitCount} dígitos...` : `Escribiendo: ${rawVal.length}/${digitCount} dígitos`, "info");
      currentNumber = null;
      currentStatus = null;
      $("btnActionReserve").disabled = true;
      return;
    }

    validateEnteredNumber(rawVal);
  }

  function validateEnteredNumber(rawVal) {
    const conf = configs[activeRaffleId];
    const ticketsObj = allTickets[activeRaffleId];
    const maxVal = Math.max(1, Number(conf.total) || 10000);
    const parsed = parseInt(rawVal, 10);

    if (parsed >= maxVal) {
      updateDigitsRow(rawVal, "taken");
      showStatus(`Fuera de rango para esta rifa (Límite: ${pad5(maxVal - 1)})`, "bad");
      currentNumber = null;
      currentStatus = null;
      $("btnActionReserve").disabled = true;
      playSound("error");
    } else if (ticketsObj[rawVal]) {
      const ticketState = ticketsObj[rawVal].estado || "reservado";
      updateDigitsRow(rawVal, "taken");
      showStatus(ticketState === "pagado" ? "Boleto ya pagado. Elige otro." : "Boleto ya apartado. Intenta con otro.", "bad");
      currentNumber = null;
      currentStatus = null;
      $("btnActionReserve").disabled = true;
      playSound("error");
    } else {
      updateDigitsRow(rawVal, "ok");
      showStatus("¡Boleto disponible! Procede al apartado.", "ok");
      currentNumber = rawVal;
      currentStatus = "ok";
      $("btnActionReserve").disabled = false;
      playSound("click");
    }
  }

  function updateDigitsRow(str, statusClass) {
    const cells = document.querySelectorAll("#digitsRow .digit-cell");
    const conf = configs[activeRaffleId];
    const digitCount = conf ? (conf.ticketDigits || 5) : 5;
    const arr = str.padEnd(digitCount, " ").split("");
    const placeholderIcon = RAFFLE_ICONS[activeRaffleId] || "🎰";
    cells.forEach((cell, idx) => {
      const char = arr[idx];
      if (char !== undefined) {
        if (char.trim()) {
          cell.textContent = char;
          cell.className = "digit-cell filled";
          if (statusClass) {
            cell.classList.add(statusClass);
          }
        } else {
          cell.textContent = placeholderIcon;
          cell.className = "digit-cell placeholder-icon";
        }
      }
    });
  }

  function showStatus(txt, type) {
    const el = $("statusMessage");
    const icon = type === "ok" ? "check-circle" : (type === "bad" ? "alert-circle" : "info");
    el.innerHTML = `<i data-lucide="${icon}" style="width:16px;"></i> ${txt}`;
    el.className = `status-lbl ${type || "info"}`;
    lucide.createIcons({attrs: {class: "lucide"}});
  }

  function renderExplorerGrid() {
    const grid = $("explorerGridContainer");
    grid.innerHTML = "";

    const conf = configs[activeRaffleId];
    const totalTickets = Math.max(1, Number(conf.total) || 10000);
    const ticketsObj = allTickets[activeRaffleId];

    const searchVal = $("explorerSearch").value.trim();
    const filterEnd = $("explorerFilterEnd").value;
    const filterType = $("explorerFilterType").value;

    let pageStartIndex = explorerPage * explorerLimit;
    let matchedTickets = [];

    for (let i = 0; i < totalTickets; i++) {
      const formatted = pad5(i);
      const isSold = !!ticketsObj[formatted];

      if (searchVal && !formatted.includes(searchVal)) continue;
      if (filterEnd && !formatted.endsWith(filterEnd)) continue;
      if (filterType === 'even' && i % 2 !== 0) continue;
      if (filterType === 'odd' && i % 2 === 0) continue;
      if (filterType === 'available' && isSold) continue;

      matchedTickets.push({num: formatted, sold: isSold});
    }

    const totalFiltered = matchedTickets.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / explorerLimit));
    
    if (explorerPage >= totalPages) {
      explorerPage = totalPages - 1;
      pageStartIndex = explorerPage * explorerLimit;
    }
    if (explorerPage < 0) explorerPage = 0;

    $("explorerPageNum").textContent = `Pág. ${explorerPage + 1} de ${totalPages}`;
    $("explorerPrevPage").disabled = explorerPage === 0;
    $("explorerNextPage").disabled = explorerPage >= totalPages - 1;

    const pageSlice = matchedTickets.slice(pageStartIndex, pageStartIndex + explorerLimit);

    if (pageSlice.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:30px; font-family:var(--font-mono); color:var(--text-muted);">Sin resultados. Intenta otros filtros.</div>`;
      return;
    }

    pageSlice.forEach(t => {
      const card = document.createElement("div");
      const isSelectedInCart = cart.includes(t.num);
      card.className = `grid-ticket ${t.sold ? 'sold' : ''} ${t.num === currentNumber ? 'selected' : ''} ${isSelectedInCart ? 'selected' : ''}`;
      
      const ticketsObj = allTickets[activeRaffleId];
      if (t.sold && ticketsObj[t.num] && ticketsObj[t.num].estado === "pagado") {
        card.classList.add("paid");
        card.style.borderColor = "var(--border-cyan)";
        card.style.color = "var(--text-muted)";
      }

      card.textContent = t.num;
      
      if (!t.sold) {
        card.addEventListener("click", () => {
          if (cart.includes(t.num)) {
            removeFromCart(t.num);
            return;
          }
          document.querySelectorAll(".grid-ticket").forEach(el => el.classList.remove("selected"));
          card.classList.add("selected");
          currentNumber = t.num;
          currentStatus = "ok";
          $("btnExplorerReserve").disabled = false;
          playSound("click");
        });
      }
      grid.appendChild(card);
    });
  }

  $("explorerPrevPage").addEventListener("click", () => {
    if (explorerPage > 0) {
      explorerPage--;
      renderExplorerGrid();
      playSound("click");
    }
  });

  $("explorerNextPage").addEventListener("click", () => {
    explorerPage++;
    renderExplorerGrid();
    playSound("click");
  });

  $("explorerSearch").addEventListener("input", () => {
    explorerPage = 0;
    renderExplorerGrid();
  });
  $("explorerFilterEnd").addEventListener("change", () => {
    explorerPage = 0;
    renderExplorerGrid();
    playSound("click");
  });
  $("explorerFilterType").addEventListener("change", () => {
    explorerPage = 0;
    renderExplorerGrid();
    playSound("click");
  });

  $("btnExplorerReserve").addEventListener("click", () => {
    if (currentNumber && currentStatus === "ok") {
      openReserveForm();
    }
  });

  function formatTicketChips(numbersInput, isReceipt = false) {
    let list = [];
    if (Array.isArray(numbersInput)) {
      list = numbersInput;
    } else if (typeof numbersInput === "string") {
      list = numbersInput.split(",").map(s => s.trim()).filter(Boolean);
    }
    
    if (!list || list.length === 0) {
      list = ["00000"];
    }

    const chipClass = isReceipt ? "receipt-chip" : "ticket-chip";
    const gridClass = isReceipt ? "receipt-chips-grid" : "ticket-chips-grid";

    const chipsHtml = list.map(num => `<span class="${chipClass}">#${num.replace(/^#/, "")}</span>`).join("");
    return `<div class="${gridClass}">${chipsHtml}</div>`;
  }

  function openReserveForm() {
    if (cart.length === 0) return;
    if (cart.length < 25) {
      showToast("Debes comprar un mínimo de 25 boletos.", "bad");
      playSound("error");
      return;
    }
    
    const displayEl = $("reserveConfirmNumberDisplay");
    const rawString = cart.join(", ");
    displayEl.setAttribute("data-tickets", rawString);
    displayEl.innerHTML = formatTicketChips(cart, false);
    
    $("reserveConfirmErrorMsg").textContent = "";
    $("reserveConfirmOverlay").classList.add("active");
    playSound("click");
  }

  async function submitReservation() {
    const name = $("buyerNameInput").value.trim();
    const phone = $("buyerWhatsappInput").value.trim();
    const lottery = $("buyerLottery").value;
    const err = $("reserveConfirmErrorMsg");

    if (!name || !phone) {
      err.textContent = "Por favor completa todos los campos requeridos.";
      showToast("Por favor completa los campos requeridos.", "bad");
      playSound("error");
      return;
    }

    if (cart.length === 0) {
      err.textContent = "El carrito está vacío.";
      return;
    }

    let latestTickets = {};
    try {
      const key = `${TICKETS_KEY_PREFIX}:${activeRaffleId}`;
      const raw = await getStorageItem(key);
      latestTickets = raw ? JSON.parse(raw) : {};
    } catch(e) { latestTickets = allTickets[activeRaffleId]; }

    // Check if ANY ticket is already taken
    const takenTickets = [];
    cart.forEach(num => {
      if (latestTickets[num]) {
        takenTickets.push(num);
      }
    });

    if (takenTickets.length > 0) {
      allTickets[activeRaffleId] = latestTickets;
      err.textContent = `Los siguientes boletos ya fueron ocupados: ${takenTickets.join(", ")}. Remuévelos de tu carrito para continuar.`;
      showToast("Boletos ocupados por otro usuario.", "bad");
      playSound("error");
      if (mode === 'explore') {
        renderExplorerGrid();
      }
      return;
    }

    // Book all tickets in cart
    const timestamp = Date.now();
    cart.forEach(num => {
      latestTickets[num] = {
        name,
        nombre: name, // support backend/admin compatibility
        whatsapp: phone,
        loteria: lottery,
        estado: "reservado",
        timestamp: timestamp
      };
    });

    allTickets[activeRaffleId] = latestTickets;

    const key = `${TICKETS_KEY_PREFIX}:${activeRaffleId}`;
    await setStorageItem(key, JSON.stringify(latestTickets));
    
    renderProgress();
    
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });

    playSound("success");
    showToast("¡Boletos comprados! Completa tu pago por WhatsApp.", "ok");

    $("reserveConfirmOverlay").classList.remove("active");
    
    const checkedOutCart = [...cart];
    cart = [];
    renderCart();

    showReceipt(checkedOutCart.join(", "), name, phone, lottery, checkedOutCart.length);
  }

  function showReceipt(num, name, phone, lottery, count = 1) {
    const conf = configs[activeRaffleId];
    $("receiptRaffleTitle").textContent = conf.title.toUpperCase();
    $("receiptDate").textContent = new Date().toLocaleDateString("es-DO", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
    $("receiptName").textContent = name;
    $("receiptPhone").textContent = phone;
    
    const totalAmount = calculateTotalAmount(count, conf);
    $("receiptPrice").textContent = `RD$ ${totalAmount.toLocaleString("es-DO")}`;
    
    $("receiptLottery").textContent = lottery;
    
    const receiptNumEl = $("receiptTicketNum");
    const rawTicketsStr = (typeof num === "string") ? num : (Array.isArray(num) ? num.join(", ") : String(num));
    receiptNumEl.setAttribute("data-tickets", rawTicketsStr);
    receiptNumEl.innerHTML = formatTicketChips(num, true);

    const firstNum = rawTicketsStr.split(", ")[0].replace(/#/g, "");
    $("receiptBarcodeText").textContent = `SRD-${firstNum}-${count}tix`;

    // Render structured bank details
    const bankGrid = $("receiptBankAccounts");
    if (bankGrid) {
      bankGrid.innerHTML = bankAccounts.map((acc, idx) => `
        <div class="bank-card-item">
          <div class="bank-card-info">
            <span class="bank-card-name" style="color: #1A202C;">${acc.bank}</span>
            <span class="bank-card-type">${acc.type}</span>
            <span class="bank-card-num" style="font-size: 1rem; font-weight: 700; color: #2D3748; letter-spacing: 0.5px; margin: 2px 0;">${acc.number}</span>
            <span class="bank-card-owner" style="font-size: 0.7rem; color: #718096;">Titular: ${acc.owner}</span>
          </div>
          <button class="bank-card-copy-btn" onclick="window.srd.copyToClipboard('${acc.number}', '${acc.bank}')" type="button" title="Copiar número de cuenta">
            <i data-lucide="copy" style="width:14px; height:14px;"></i>
          </button>
        </div>
      `).join("");
      
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }

    const btnWa = $("btnSendWhatsApp");
    if (btnWa) btnWa.disabled = false;

    $("receiptOverlay").classList.add("active");
  }

  async function handleSendWhatsApp() {
    const conf = configs[activeRaffleId];
    const num = $("receiptTicketNum").getAttribute("data-tickets") || $("receiptTicketNum").textContent;
    const name = $("receiptName").textContent;
    const lottery = $("receiptLottery").textContent;

    if (selectedPaymentReceiptBase64) {
      showToast("Registrando comprobante...", "info");
    } else {
      showToast("Registrando apartado para validación...", "info");
    }

    const ticketNums = num.split(", ").map(s => s.trim().replace(/^#/, "")).filter(Boolean);
    try {
      const key = `${TICKETS_KEY_PREFIX}:${activeRaffleId}`;
      const raw = await getStorageItem(key);
      const latestTickets = raw ? JSON.parse(raw) : {};

      ticketNums.forEach(tNum => {
        if (latestTickets[tNum]) {
          latestTickets[tNum].estado = selectedPaymentReceiptBase64 ? "esperando_validacion" : "reservado";
          if (selectedPaymentReceiptBase64) {
            latestTickets[tNum].comprobante = selectedPaymentReceiptBase64;
            latestTickets[tNum].timestamp_comprobante = Date.now();
          }
        }
      });

      allTickets[activeRaffleId] = latestTickets;
      await setStorageItem(key, JSON.stringify(latestTickets));

      showToast(selectedPaymentReceiptBase64 ? "¡Comprobante registrado!" : "¡Apartado registrado!", "ok");
    } catch(e) {
      console.error("Failed to upload receipt", e);
      showToast("Error al registrar apartado. Reintenta.", "bad");
      return;
    }

    const phone = $("receiptPhone").textContent;
    const priceText = $("receiptPrice").textContent;
    const dateText = $("receiptDate").textContent;
    const barcodeText = $("receiptBarcodeText").textContent;
    const prizeTitle = conf.prize || conf.title || "Gran Sorteo Suerte RD";

    const ticketListRaw = num.split(", ").map(s => s.trim().replace(/^#/, "")).filter(Boolean);
    const ticketCount = ticketListRaw.length;

    const formattedLines = [];
    for (let i = 0; i < ticketListRaw.length; i += 4) {
      const chunk = ticketListRaw.slice(i, i + 4).map(n => `#${n}`).join(", ");
      formattedLines.push(chunk);
    }
    const formattedNumsText = formattedLines.join("\n");

    const textMsg = 
`🎰 *SUERTE RD* | *RECIBO DE COMPRA DIGITAL* 🎰
═════════════════════════════
✨ *¡NUEVO APARTADO REGISTRADO!* ✨

👤 *CLIENTE:* ${name}
📱 *CONTACTO:* ${phone}
📅 *FECHA DE REGISTRO:* ${dateText}

🏆 *SORTEO:* ${prizeTitle}
🎯 *LOTERÍA OFICIAL:* ${lottery}

🎟️ *BOLETO(S) APARTADO(S) (${ticketCount}):*
${formattedNumsText}

💵 *MONTO TOTAL:* ${priceText}
🟡 *ESTADO DE PAGO:* *${selectedPaymentReceiptBase64 ? 'Esperando Validación (Recibo Adjunto)' : 'Reservado / Pendiente de Pago'}*

🔒 *CÓDIGO VERIFICADOR:* \`${barcodeText}\`
═════════════════════════════
📩 *MENSAJE:* ${selectedPaymentReceiptBase64 ? 'He adjuntado mi comprobante de transferencia bancaria. Por favor validar mi(s) boleto(s) para la participación oficial. ¡Muchas gracias y buena suerte! 🍀✨' : 'Hola, he realizado la reserva de mis boletos. Por favor facilíteme los detalles para validar el pago. ¡Muchas gracias! 🍀✨'}`;

    const encoded = encodeURIComponent(textMsg);

    const whatsappNum = conf.whatsapp || "18099838626";
    window.open(`https://wa.me/${whatsappNum}?text=${encoded}`, "_blank");

    // Reset selected file fields
    selectedPaymentReceiptBase64 = null;
    const receiptInput = $("paymentReceiptInput");
    if (receiptInput) receiptInput.value = "";
    const fileNameEl = $("paymentReceiptFileName");
    if (fileNameEl) fileNameEl.textContent = "Sin archivo seleccionado";
    const previewCont = $("paymentReceiptPreviewContainer");
    if (previewCont) previewCont.style.display = "none";

    clearTicketSelection();
    $("receiptOverlay").classList.remove("active");
  }

  function clearTicketSelection() {
    currentNumber = null;
    currentStatus = null;
    updateDigitsRow("", null);
    $("secretInput").value = "";
    $("btnActionReserve").disabled = true;
    $("btnExplorerReserve").disabled = true;
    
    cart = [];
    renderCart();

    $("buyerNameInput").value = "";
    $("buyerWhatsappInput").value = "";
    checkStep2Validation();
    
    showStatus(mode === "random" ? "Presiona el botón para elegir un número aleatorio" : "Escribe un número de 5 dígitos...", "info");
    
    if (mode === 'explore') {
      renderExplorerGrid();
    }
  }

  $("btnCopyReceipt").addEventListener("click", () => {
    const num = $("receiptTicketNum").getAttribute("data-tickets") || $("receiptTicketNum").textContent;
    const name = $("receiptName").textContent;
    const phone = $("receiptPhone").textContent;
    const lottery = $("receiptLottery").textContent;
    const priceText = $("receiptPrice").textContent;
    const dateText = $("receiptDate").textContent;
    const barcodeText = $("receiptBarcodeText").textContent;
    const conf = configs[activeRaffleId];
    const prizeTitle = conf.prize || conf.title || "Gran Sorteo Suerte RD";

    const ticketListRaw = num.split(", ").map(s => s.trim().replace(/^#/, "")).filter(Boolean);
    const ticketCount = ticketListRaw.length;

    const formattedLines = [];
    for (let i = 0; i < ticketListRaw.length; i += 4) {
      const chunk = ticketListRaw.slice(i, i + 4).map(n => `#${n}`).join(", ");
      formattedLines.push(chunk);
    }
    const formattedNumsText = formattedLines.join("\n");

    const text = 
`🎰 SUERTE RD | RECIBO DE COMPRA DIGITAL 🎰
═════════════════════════════
👤 COMPRADOR: ${name}
📱 WHATSAPP: ${phone}
📅 FECHA: ${dateText}

🏆 SORTEO: ${prizeTitle}
🎯 LOTERÍA: ${lottery}

🎟️ BOLETO(S) (${ticketCount}):
${formattedNumsText}

💵 TOTAL: ${priceText}
🟡 ESTADO: Esperando Validación
🔒 VERIFICADOR: ${barcodeText}
═════════════════════════════`;

    navigator.clipboard.writeText(text).then(() => {
      playSound("click");
      showToast("Datos del recibo copiados al portapapeles.", "ok");
      const btn = $("btnCopyReceipt");
      btn.innerHTML = `<i data-lucide="check" style="color:var(--green)"></i>`;
      lucide.createIcons();
      setTimeout(() => {
        btn.innerHTML = `<i data-lucide="copy"></i>`;
        lucide.createIcons();
      }, 1500);
    });
  });

  function runSearch() {
    const rawQuery = $("searchInput").value.trim();
    const box = $("searchResults");
    box.innerHTML = "";

    if (rawQuery.length < 3) {
      box.innerHTML = `<div style="text-align:center; font-size:0.85rem; color:var(--text-muted);"><i data-lucide="alert-circle" style="width:14px; vertical-align:middle;"></i> Escribe al menos 3 caracteres o un número de boleto...</div>`;
      lucide.createIcons({attrs: {class: "lucide"}});
      playSound("error");
      return;
    }

    const isTicketNumberQuery = /^\d{1,5}$/.test(rawQuery);

    if (isTicketNumberQuery) {
      const formatted = pad5(parseInt(rawQuery, 10));
      const conf = configs[activeRaffleId];
      const maxVal = Math.max(1, Number(conf.total) || 10000);

      if (parseInt(formatted, 10) >= maxVal) {
        box.innerHTML = `
          <div class="result-item-card sold">
            <div class="result-item-info">
              <div class="result-status-dot">×</div>
              <div>
                <div class="mono" style="font-weight:700;">#${formatted}</div>
                <small style="color:var(--text-muted);">Fuera de rango para este sorteo</small>
              </div>
            </div>
          </div>`;
        playSound("error");
        return;
      }

      const ticketsObj = allTickets[activeRaffleId];
      const ticketInfo = ticketsObj[formatted];
      const isSold = !!ticketInfo;

      if (!isSold) {
        box.innerHTML = `
          <div class="result-item-card available">
            <div class="result-item-info">
              <div class="result-status-dot">✓</div>
              <div>
                <div class="mono" style="font-weight:700;">#${formatted}</div>
                <small style="color:var(--green); font-weight:600;">Disponible para apartar</small>
              </div>
            </div>
            <button class="btn btn-primary" style="flex:initial; padding:8px 16px; font-size:0.8rem; border-radius:10px;" onclick="window.srd.quickPick('${formatted}')"><i data-lucide="check" style="width:14px;"></i> Apartar</button>
          </div>`;
        playSound("success");
      } else {
        const isPaid = ticketInfo.estado === 'pagado';
        const isBlocked = ticketInfo.estado === 'bloqueado';
        const statusText = isBlocked ? "Boleto bloqueado por la administración" : (isPaid ? `Boleto PAGADO por ${ticketInfo.name}` : `Boleto COMPRADO por ${ticketInfo.name}`);
        const cardClass = isPaid ? 'paid' : 'sold';
        const statusSymbol = isPaid ? '✓' : '✕';
        
        box.innerHTML = `
          <div class="result-item-card ${cardClass}">
            <div class="result-item-info">
              <div class="result-status-dot">${statusSymbol}</div>
              <div>
                <div class="mono" style="font-weight:700;">#${formatted}</div>
                <small style="color:var(--text-grey); font-weight:600;">${statusText}</small>
              </div>
            </div>
          </div>`;
        playSound("click");
      }
      lucide.createIcons();
    } else {
      const queryLower = rawQuery.toLowerCase();
      const ticketsObj = allTickets[activeRaffleId];
      const keys = Object.keys(ticketsObj);
      const matches = [];

      keys.forEach(num => {
        const t = ticketsObj[num];
        if (t.name.toLowerCase().includes(queryLower) || t.whatsapp.includes(queryLower)) {
          matches.push({ num, ...t });
        }
      });

      if (matches.length === 0) {
        box.innerHTML = `<div style="text-align:center; padding:15px; font-size:0.85rem; color:var(--text-muted);"><i data-lucide="alert-circle" style="width:14px; vertical-align:middle;"></i> No encontramos reservas para: "${rawQuery}"</div>`;
        lucide.createIcons({attrs: {class: "lucide"}});
        playSound("error");
        return;
      }

      box.innerHTML = `
        <div style="font-size:0.8rem; color:var(--cyan); margin-bottom:8px; font-family:var(--font-mono); text-align:left;">
          Resultados para "${rawQuery}" (${matches.length}):
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; max-height:220px; overflow-y:auto; padding-right:5px;">
          ${matches.map(m => {
            const isPaid = m.estado === 'pagado';
            const statusLabel = isPaid ? 'PAGADO' : 'COMPRADO';
            const statusColor = isPaid ? 'var(--green)' : 'var(--red)';
            const uploadBtn = !isPaid ? `
              <button class="btn btn-secondary btn-upload-receipt-search" data-num="${m.num}" data-name="${escapeHtml(m.name)}" data-phone="${escapeHtml(m.whatsapp)}" data-lottery="${escapeHtml(m.loteria || 'Florida')}" style="padding: 4px 8px; font-size: 0.7rem; border-color:var(--cyan); color:var(--cyan); margin-bottom: 0;">
                Subir Recibo
              </button>
            ` : '';
            return `
              <div class="result-item-card ${isPaid ? 'paid' : 'sold'}" style="padding:10px; margin:0; display:flex; justify-content:space-between; align-items:center; width:100%;">
                <div class="result-item-info" style="display:flex; align-items:center; gap:10px;">
                  <div class="mono" style="font-weight:900; font-size:1.1rem; color:var(--cyan);">#${m.num}</div>
                  <div style="text-align:left; line-height:1.2;">
                    <div style="font-size:0.85rem; font-weight:700; color:#FFF;">${escapeHtml(m.name)}</div>
                    <small style="color:var(--text-muted); font-size:0.7rem;">Estado: <span style="color:${statusColor}; font-weight:700;">${statusLabel}</span> | Tel: ${escapeHtml(m.whatsapp)}</small>
                  </div>
                </div>
                ${uploadBtn}
              </div>
            `;
          }).join("")}
        </div>
      `;

      box.querySelectorAll(".btn-upload-receipt-search").forEach(btn => {
        btn.addEventListener("click", () => {
          const num = btn.getAttribute("data-num");
          const name = btn.getAttribute("data-name");
          const phone = btn.getAttribute("data-phone");
          const lottery = btn.getAttribute("data-lottery");
          showReceipt(num, name, phone, lottery, 1);
        });
      });

      playSound("success");
      lucide.createIcons();
    }
  }

  function quickPick(num) {
    if (!$("buyerNameInput").value.trim()) {
      $("buyerNameInput").value = "Usuario Buscador";
    }
    if (!$("buyerWhatsappInput").value.trim()) {
      $("buyerWhatsappInput").value = "18095550000";
    }
    checkStep2Validation();

    switchMode("custom");
    $("secretInput").value = num;
    validateEnteredNumber(num);
    showScreen('purchase');
  }

  function addPackageToCart(count) {
    const conf = configs[activeRaffleId];
    if (!conf) return;
    const tickets = allTickets[activeRaffleId] || {};
    const totalCount = Math.max(1, Number(conf.total) || 10000);
    
    const available = [];
    for (let i = 0; i < totalCount; i++) {
      const num = pad5(i);
      if (!tickets[num] && !cart.includes(num)) {
        available.push(num);
      }
    }

    if (available.length < count) {
      showToast(`No hay suficientes boletos disponibles para este paquete. Solo quedan ${available.length}.`, "bad");
      return;
    }

    const selected = [];
    const tempAvailable = [...available];
    for (let i = 0; i < count; i++) {
      const randIdx = Math.floor(Math.random() * tempAvailable.length);
      selected.push(tempAvailable[randIdx]);
      tempAvailable.splice(randIdx, 1);
    }

    cart.push(...selected);
    renderCart();
    playSound("success");
    showToast(`¡Se agregaron ${count} boletos al carrito con tarifa de paquete!`, "ok");
    
    showScreen('purchase');
    openReserveForm();
  }

  function playStoryVideo(videoName) {
    playSound("draw");
    $("storyVideoText").textContent = `[Reproduciendo Video Ganador: ${videoName}]`;
    $("storyVideoOverlay").classList.add("active");
  }

  function initAdminDashboard() {
    document.querySelectorAll(".admin-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        playSound("click");
        document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".admin-pane").forEach(p => p.classList.remove("active"));

        btn.classList.add("active");
        const target = btn.getAttribute("data-target");
        $(target).classList.add("active");

        if (target === 'paneStats') {
          updateStatsPane();
        } else if (target === 'paneTickets') {
          updateReservationsTable();
        } else if (target === 'paneConfigs') {
          updateAdminForm(activeRaffleId);
        } else if (target === 'paneSupport') {
          loadSupportMessages();
        }
      });
    });

    $("adminTicketSearch").addEventListener("input", updateReservationsTable);

    // Clean expired reservations manually
    const cleanExpiredBtn = $("btnCleanExpired");
    if (cleanExpiredBtn) {
      cleanExpiredBtn.addEventListener("click", async () => {
        if (!confirm("¿Deseas liberar todos los boletos reservados con más de 24 horas sin pagar?")) return;
        try {
          const res = await fetch('/api/admin/clean-expired', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-pin': adminPin
            }
          });
          if (res.ok) {
            const data = await res.json();
            showToast(`Proceso finalizado. Se liberaron ${data.count} boletos.`, "ok");
            playSound("success");
            
            // Reload sales data
            for (const rId of RAFFLE_IDS) {
              try {
                const key = `${TICKETS_KEY_PREFIX}:${rId}`;
                const raw = await getStorageItem(key);
                allTickets[rId] = raw ? JSON.parse(raw) : {};
              } catch (e) {
                allTickets[rId] = {};
              }
            }

            updateReservationsTable();
            updateStatsPane();
            renderProgress();
          } else {
            showToast("Error al limpiar reservas o no autorizado.", "bad");
          }
        } catch(e) {
          showToast("Error al conectar con el servidor.", "bad");
        }
      });
    }

    // Block number manually (Phase 3 Extra)
    const blockBtn = $("btnBlockNumberSubmit");
    if (blockBtn) {
      blockBtn.addEventListener("click", blockTicketNumber);
    }
    const blockInput = $("adminBlockNumberInput");
    if (blockInput) {
      blockInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") blockTicketNumber();
      });
    }
  }

  function openAdminPanel() {
    updateStatsPane();
    updateReservationsTable();
    updateAdminForm(activeRaffleId);
    
    $("adminStatusMsg").textContent = "";
    $("adminOverlay").classList.add("active");
    playSound("click");
  }

  function updateStatsPane() {
    const rId = $("cfgRaffleSelect").value;
    const conf = configs[rId];
    const tickets = allTickets[rId];
    
    const ticketPrice = parseInt(conf.price.replace(/\D/g, "")) || 500;
    const totalTicketsCount = Math.max(1, Number(conf.total) || 10000);
    
    let soldCount = 0;
    let paidCount = 0;
    let reservedCount = 0;

    Object.keys(tickets).forEach(k => {
      soldCount++;
      if (tickets[k].estado === 'pagado') {
        paidCount++;
      } else {
        reservedCount++;
      }
    });

    const incomeEstimate = paidCount * ticketPrice;
    
    $("statIncome").textContent = `RD$ ${incomeEstimate.toLocaleString("es-DO")}`;
    $("statSold").textContent = `${soldCount.toLocaleString("es-DO")} / ${totalTicketsCount.toLocaleString("es-DO")}`;
    $("statPaidRatio").textContent = `${paidCount} Pag. / ${reservedCount} Res.`;

    const ctx = $("adminChart").getContext("2d");
    if (dashboardChart) {
      dashboardChart.destroy();
    }

    dashboardChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pagados', 'Reservados', 'Disponibles'],
        datasets: [{
          data: [paidCount, reservedCount, totalTicketsCount - soldCount],
          backgroundColor: ['#00E676', '#FFD700', 'rgba(255,255,255,0.05)'],
          borderColor: ['#00E676', '#FFD700', 'rgba(0, 229, 255, 0.15)'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#B2C4C6',
              font: {
                family: 'Inter',
                size: 11
              }
            }
          }
        }
      }
    });
  }

  function updateReservationsTable() {
    const searchVal = $("adminTicketSearch").value.trim().toLowerCase();
    const tbody = $("adminTicketsTableBody");
    tbody.innerHTML = "";

    const rId = $("cfgRaffleSelect").value;
    const tickets = allTickets[rId];
    const ticketKeys = Object.keys(tickets);

    let rowsAdded = 0;

    ticketKeys.sort().forEach(k => {
      const details = tickets[k];
      const name = details.name.toLowerCase();
      const whatsapp = details.whatsapp.toLowerCase();
      
      if (searchVal && !k.includes(searchVal) && !name.includes(searchVal) && !whatsapp.includes(searchVal)) {
        return;
      }

      const row = document.createElement("tr");
      const isPaid = details.estado === 'pagado';
      const isBlocked = details.estado === 'bloqueado';

      let statusBadge = '';
      if (isBlocked) {
        statusBadge = '<span class="badge" style="background:rgba(255, 77, 94, 0.1); color:var(--red); border:1px solid rgba(255, 77, 94, 0.3);">Bloqueado</span>';
      } else if (isPaid) {
        statusBadge = '<span class="badge badge-paid">Pagado</span>';
      } else {
        statusBadge = '<span class="badge badge-pending">Reservado</span>';
      }
      
      let togglePayBtn = '';
      if (!isBlocked) {
        togglePayBtn = isPaid 
          ? `<button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; border-color:var(--gold); color:var(--gold)" onclick="window.srd.togglePaymentState('${rId}', '${k}', false)">Reservar</button>`
          : `<button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; border-color:var(--green); color:var(--green)" onclick="window.srd.togglePaymentState('${rId}', '${k}', true)">Confirmar</button>`;
      }

      const waContent = (details.whatsapp && details.whatsapp !== 'N/A')
        ? `<a href="https://wa.me/${details.whatsapp.replace(/\D/g, "")}" target="_blank" style="color:var(--cyan); text-decoration:underline;">${escapeHtml(details.whatsapp)}</a>`
        : 'N/A';

      row.innerHTML = `
        <td class="mono" style="font-weight:700; color:var(--cyan)">#${k}</td>
        <td>${escapeHtml(details.name)}</td>
        <td>${waContent}</td>
        <td>${escapeHtml(details.loteria || "N/A")}</td>
        <td>${statusBadge}</td>
        <td>
          <div style="display:flex; gap:5px;">
            ${togglePayBtn}
            <button class="btn btn-secondary" style="padding:4px 8px; font-size:0.75rem; border-color:var(--red); color:var(--red)" onclick="window.srd.deleteReservation('${rId}', '${k}')"><i data-lucide="trash-2" style="width:12px;"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
      rowsAdded++;
    });

    if (rowsAdded === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:30px; font-family:var(--font-mono); color:var(--text-muted)">No se encontraron registros de ventas.</td></tr>`;
    }
    
    lucide.createIcons();
  }

  async function togglePaymentState(rId, ticketNum, markPaid) {
    if (allTickets[rId] && allTickets[rId][ticketNum]) {
      allTickets[rId][ticketNum].estado = markPaid ? 'pagado' : 'reservado';
      
      const key = `${TICKETS_KEY_PREFIX}:${rId}`;
      await setStorageItem(key, JSON.stringify(allTickets[rId]));
      
      updateReservationsTable();
      updateStatsPane();
      renderProgress();
      playSound("success");
      showToast(`Boleto #${ticketNum} marcado como ${markPaid ? 'pagado' : 'reservado'}.`, "ok");
    }
  }

  async function deleteReservation(rId, ticketNum) {
    if (!confirm(`¿Estás seguro de que deseas liberar el boleto #${ticketNum}?`)) return;

    if (allTickets[rId] && allTickets[rId][ticketNum]) {
      delete allTickets[rId][ticketNum];
      
      const key = `${TICKETS_KEY_PREFIX}:${rId}`;
      await setStorageItem(key, JSON.stringify(allTickets[rId]));
      
      updateReservationsTable();
      updateStatsPane();
      renderProgress();
      playSound("click");
      showToast(`Boleto #${ticketNum} liberado con éxito.`, "info");
    }
  }

  async function blockTicketNumber() {
    const input = $("adminBlockNumberInput");
    const num = input.value.trim().replace(/\D/g, "");
    const rId = $("cfgRaffleSelect").value;
    const conf = configs[rId];
    const totalLimit = Math.max(1, Number(conf.total) || 10000);

    if (num.length !== 5) {
      showToast("Ingresa un número de 5 dígitos (ej: 00123).", "bad");
      playSound("error");
      return;
    }

    const val = parseInt(num, 10);
    if (val >= totalLimit) {
      showToast(`El boleto #${num} supera la cantidad de boletos de esta rifa (${totalLimit}).`, "bad");
      playSound("error");
      return;
    }

    if (allTickets[rId][num]) {
      const currentStatus = allTickets[rId][num].estado;
      const statusText = currentStatus === 'pagado' ? 'PAGADO' : (currentStatus === 'bloqueado' ? 'BLOQUEADO' : 'RESERVADO');
      if (!confirm(`El boleto #${num} ya está en estado ${statusText}. ¿Deseas sobreescribirlo y bloquearlo?`)) {
        return;
      }
    }

    allTickets[rId][num] = {
      name: "Administración (Bloqueado)",
      whatsapp: "N/A",
      loteria: "N/A",
      estado: "bloqueado",
      timestamp: Date.now()
    };

    const key = `${TICKETS_KEY_PREFIX}:${rId}`;
    try {
      await setStorageItem(key, JSON.stringify(allTickets[rId]));
      showToast(`Boleto #${num} bloqueado correctamente.`, "ok");
      playSound("success");
      input.value = "";
      updateReservationsTable();
      updateStatsPane();
      renderProgress();
    } catch(e) {
      showToast("Error al guardar bloqueo.", "bad");
    }
  }

  function updateAdminForm(rId) {
    const conf = configs[rId];
    if (!$("cfgTitle")) return;
    $("cfgTitle").value = conf.title || "";
    $("cfgPrize").value = conf.prize || "";
    $("cfgPrice").value = conf.price || "";
    $("cfgTotal").value = conf.total || "";
    $("cfgBlessedPct").value = conf.blessedPct !== undefined ? conf.blessedPct : 0.1;
    $("cfgBlessedPrize").value = conf.blessedPrize || "RD$5,000";
    $("cfgSaleStatus").value = conf.saleStatus || "active";
    $("cfgBrand").value = conf.brand || "";
    $("cfgModel").value = conf.model || "";
    $("cfgYear").value = conf.year || "";
    $("cfgDetails").value = conf.details || "";
    $("cfgActive").checked = conf.active !== false;

    // Load payment instructions (Phase 5)
    $("cfgPaymentInstructions").value = conf.paymentInstructions || "";

    // Reset file input
    $("cfgImageUpload").value = "";

    // Show preview if exists
    const preview = $("cfgImagePreview");
    const placeholder = $("cfgImagePlaceholder");
    const imgUrl = conf.image || (DEFAULT_CONFIGS[rId] ? DEFAULT_CONFIGS[rId].image : "./suerte_rd_banner.png");
    if (imgUrl) {
      preview.src = imgUrl;
      preview.style.display = "block";
      placeholder.style.display = "none";
    } else {
      preview.src = "";
      preview.style.display = "none";
      placeholder.style.display = "block";
    }

    const yearField = $("cfgYearField");
    if (yearField) {
      yearField.style.display = "block";
    }
  }

  async function saveConfig() {
    const editId = $("cfgRaffleSelect").value;
    const total = Math.max(10, Math.min(100000, parseInt($("cfgTotal").value, 10) || (configs[editId] ? configs[editId].total : (DEFAULT_CONFIGS[editId] ? DEFAULT_CONFIGS[editId].total : 10000))));
    const blessedPct = parseFloat($("cfgBlessedPct").value) || 0.1;
    const blessedPrize = $("cfgBlessedPrize").value.trim() || "RD$5,000";
    const saleStatus = $("cfgSaleStatus").value || "active";

    // Get the base64 string from the preview image if uploaded, otherwise keep existing
    const previewSrc = $("cfgImagePreview").src;
    const finalImage = (previewSrc && previewSrc.startsWith("data:")) ? previewSrc : (configs[editId].image || (DEFAULT_CONFIGS[editId] ? DEFAULT_CONFIGS[editId].image : "./suerte_rd_banner.png"));

    // Regenerar números bendecidos si cambió el total o el porcentaje o no existen
    let blessedNumbers = configs[editId].blessedNumbers || [];
    const targetCount = Math.round(total * (blessedPct / 100));
    
    if (blessedNumbers.length !== targetCount || configs[editId].blessedPct !== blessedPct || configs[editId].total !== total) {
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

    configs[editId] = {
      ...configs[editId],
      title: $("cfgTitle").value.trim() || (configs[editId] ? configs[editId].title : (DEFAULT_CONFIGS[editId] ? DEFAULT_CONFIGS[editId].title : "Nuevo Sorteo")),
      prize: $("cfgPrize").value.trim() || (configs[editId] ? configs[editId].prize : (DEFAULT_CONFIGS[editId] ? DEFAULT_CONFIGS[editId].prize : "Premio")),
      price: $("cfgPrice").value.trim() || (configs[editId] ? configs[editId].price : (DEFAULT_CONFIGS[editId] ? DEFAULT_CONFIGS[editId].price : "RD$500")),
      total: total,
      blessedPct: blessedPct,
      blessedPrize: blessedPrize,
      saleStatus: saleStatus,
      blessedNumbers: blessedNumbers,
      brand: $("cfgBrand").value.trim(),
      model: $("cfgModel").value.trim(),
      year: $("cfgYear").value.trim(),
      details: $("cfgDetails").value.trim(),
      active: $("cfgActive").checked,
      image: finalImage,
      paymentInstructions: $("cfgPaymentInstructions").value.trim()
    };

    const key = `${CFG_KEY_PREFIX}:${editId}`;
    await setStorageItem(key, JSON.stringify(configs[editId]));

    // Check if new PIN was requested (Phase 1 Dynamic)
    const newPin = $("cfgAdminPin").value.trim();
    if (newPin) {
      if (newPin.length < 4) {
        showAdminMsg("El PIN debe tener al menos 4 caracteres.", "bad");
        showToast("Error: PIN muy corto.", "bad");
        playSound("error");
        return;
      }
      try {
        await setStorageItem('suerterd:admin:pin', newPin);
        adminPin = newPin;
        sessionStorage.setItem('admin_pin', newPin);
        $("cfgAdminPin").value = "";
        showAdminMsg("¡Configuración y PIN de administrador actualizados!", "ok");
        showToast("PIN de administrador actualizado.", "ok");
      } catch(e) {
        showToast("Error al guardar el nuevo PIN.", "bad");
      }
    } else {
      showAdminMsg("Configuración de rifa guardada con éxito.", "ok");
      showToast("Configuración de la rifa guardada.", "ok");
    }

    renderRaffleSelectorDropdown();
    renderRaffleSelector();
    if (editId === activeRaffleId) {
      loadRaffleState(activeRaffleId);
    }
    playSound("success");
  }

  async function addWinner() {
    const name = $("winName").value.trim();
    const number = $("winNumber").value.replace(/\D/g, "");
    const photoUrl = $("winPhoto").value.trim();

    if (!name || number.length !== 5) {
      showAdminMsg("Nombre y boleto válido son requeridos.", "bad");
      showToast("Datos incompletos para agregar ganador.", "bad");
      playSound("error");
      return;
    }

    winners.push({
      raffleId: activeRaffleId,
      name,
      number: parseInt(number, 10),
      prize: configs[activeRaffleId].prize,
      photoUrl,
      date: new Date().toISOString()
    });

    await setStorageItem(WINNERS_KEY, JSON.stringify(winners));
    renderDrawResults();
    renderWinnersCarousel();
    lucide.createIcons();

    $("winName").value = "";
    $("winNumber").value = "";
    $("winPhoto").value = "";
    showAdminMsg("Ganador agregado al historial.", "ok");
    showToast("Ganador agregado al historial con éxito.", "ok");
    playSound("success");
  }

  function exportCSV() {
    const editId = $("cfgRaffleSelect").value;
    const tickets = allTickets[editId];
    const soldKeys = Object.keys(tickets);

    if (!soldKeys.length) {
      showAdminMsg("No hay boletos reservados para este sorteo.", "bad");
      showToast("No hay ventas para exportar.", "bad");
      playSound("error");
      return;
    }

    let csvContent = "Boleto,Nombre,WhatsApp,Loteria Combinada,Estado,Fecha Registro\r\n";
    soldKeys.sort().forEach(k => {
      const details = tickets[k];
      const date = new Date(details.timestamp).toLocaleString("es-DO");
      const loteria = details.loteria || "Pick 5 Florida";
      const estado = details.estado || "reservado";
      csvContent += `${k},"${details.name.replace(/"/g, '""')}",${details.whatsapp},"${loteria}","${estado}","${date}"\r\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `suerterd_ventas_${editId}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showAdminMsg("Exportación CSV descargada.", "ok");
    showToast("Ventas exportadas en formato CSV.", "ok");
    playSound("success");
  }

  async function resetRaffle() {
    const editId = $("cfgRaffleSelect").value;
    if (!confirm(`¿Estás seguro de reiniciar todas las ventas de la rifa "${configs[editId].title}"? Esto eliminará todos los boletos vendidos.`)) return;

    allTickets[editId] = {};
    const key = `${TICKETS_KEY_PREFIX}:${editId}`;
    await setStorageItem(key, JSON.stringify({}));

    renderRaffleSelector();
    if (editId === activeRaffleId) {
      renderProgress();
      clearTicketSelection();
    }
    
    updateReservationsTable();
    updateStatsPane();
    showAdminMsg("Ventas reiniciadas con éxito.", "ok");
    showToast("Sorteo reiniciado y ventas vaciadas.", "info");
    playSound("success");
  }

  function showAdminMsg(txt, type) {
    const el = $("adminStatusMsg");
    el.textContent = txt;
    el.className = `status-lbl ${type === "ok" ? "ok" : "bad"}`;
    setTimeout(() => { el.textContent = ""; }, 4000);
  }

  function startOfficialDraw() {
    const rId = activeRaffleId;
    const tickets = allTickets[rId];
    const soldKeys = Object.keys(tickets);

    if (!soldKeys.length) {
      $("drawStatusMsg").textContent = "Error: No se han vendido boletos para este sorteo.";
      $("drawStatusMsg").className = "mono bad";
      playSound("error");
      return;
    }

    $("btnStartDraw").disabled = true;
    $("drawStatusMsg").textContent = "MEZCLANDO TÓMBOLA DE COMPRADORES...";
    $("drawStatusMsg").className = "mono info";
    playSound("draw");

    const winningIndex = Math.floor(Math.random() * soldKeys.length);
    const winningTicket = soldKeys[winningIndex];
    const winnerDetails = tickets[winningTicket];

    const reels = [
      $("drawReel0"),
      $("drawReel1"),
      $("drawReel2"),
      $("drawReel3"),
      $("drawReel4")
    ];

    let intervals = [];
    reels.forEach((reel, i) => {
      reel.className = "draw-spinner-reel spinning";
      const timer = setInterval(() => {
        reel.textContent = Math.floor(Math.random() * 10);
      }, 70);
      intervals.push(timer);

      setTimeout(() => {
        clearInterval(timer);
        reel.textContent = winningTicket[i];
        reel.className = "draw-spinner-reel";
        playSound("spin");

        if (i === reels.length - 1) {
          $("adminOverlay").classList.remove("active");
          showJackpotAnnouncement(winningTicket, winnerDetails);
          $("btnStartDraw").disabled = false;
        }
      }, 1500 + i * 400);
    });
  }

  function showJackpotAnnouncement(ticketNum, buyerDetails) {
    const conf = configs[activeRaffleId];
    $("jackpotWinnerTicket").textContent = ticketNum;
    $("jackpotWinnerName").textContent = buyerDetails.name;
    $("jackpotWinnerPhone").textContent = buyerDetails.whatsapp;
    $("jackpotWinnerPrize").textContent = conf.prize;

    $("btnContactWinner").onclick = () => {
      const text = `¡Felicidades ${buyerDetails.name}! Tu boleto #${ticketNum} ha sido seleccionado ganador del premio "${conf.prize}" en la plataforma de Suerte RD. Nos pondremos en contacto contigo de inmediato para coordinar la entrega.`;
      window.open(`https://wa.me/${buyerDetails.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`, "_blank");
    };

    $("jackpotOverlay").classList.add("active");
    playSound("success");

    let duration = 5 * 1000;
    let animationEnd = Date.now() + duration;
    let defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1100 };

    function randomInRange(min, max) {
      return Math.random() * (max - min) + min;
    }

    let interval = setInterval(function() {
      let timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      let particleCount = 50 * (timeLeft / duration);
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
      confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
    }, 250);

    saveWinnerFromDraw(ticketNum, buyerDetails);
  }

  async function saveWinnerFromDraw(ticketNum, buyerDetails) {
    winners.push({
      raffleId: activeRaffleId,
      name: buyerDetails.name,
      number: parseInt(ticketNum, 10),
      prize: configs[activeRaffleId].prize,
      photoUrl: "",
      date: new Date().toISOString()
    });

    await setStorageItem(WINNERS_KEY, JSON.stringify(winners));
    renderDrawResults();
    renderWinnersCarousel();
    lucide.createIcons();
    updateStatsPane();
  }

  $("toggleSoundBtn").addEventListener("click", () => {
    isMuted = !isMuted;
    const icon = isMuted ? "volume-x" : "volume-2";
    $("toggleSoundBtn").innerHTML = `<i data-lucide="${icon}"></i>`;
    lucide.createIcons();
    if (!isMuted) {
      playSound("click");
    }
  });

  $("btnPlayVideo").addEventListener("click", () => {
    $("btnPlayVideo").style.display = "none";
    $("videoContainer").style.display = "block";
    const player = $("videoPlayer");
    if (player) {
      player.play();
    }
    playSound("click");
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  document.querySelectorAll(".manual-keypad .keypad-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const val = btn.textContent.trim();
      const input = $("secretInput");
      
      if (btn.id === 'keypadClear') {
        input.value = input.value.slice(0, -1);
      } else {
        const conf = configs[activeRaffleId];
        const digitCount = conf ? (conf.ticketDigits || 5) : 5;
        if (input.value.length < digitCount) {
          input.value += val;
        }
      }
      handleSecretInput();
      playSound("click");
    });
  });

  $("ticketRaffleSelect").addEventListener("change", (e) => {
    playSound("click");
    loadRaffleState(e.target.value);
  });
  $("tabRandomBtn").addEventListener("click", () => switchMode("random"));
  $("tabCustomBtn").addEventListener("click", () => switchMode("custom"));
  $("tabExploreBtn").addEventListener("click", () => switchMode("explore"));
  $("btnActionRandom").addEventListener("click", generateRandomNumber);
  $("btnActionRandom25").addEventListener("click", generate25RandomNumbers);
  $("secretInput").addEventListener("input", handleSecretInput);
  $("digitsRow").addEventListener("click", () => { if (mode === "custom") focusSecretInput(); });

  // Phase 4: Cart and reservation wiring
  $("btnActionReserve").addEventListener("click", addToCart);
  $("btnExplorerReserve").addEventListener("click", addToCart);
  $("btnCheckoutCart").addEventListener("click", openReserveForm);

  $("closeReserveConfirmBtn").addEventListener("click", () => $("reserveConfirmOverlay").classList.remove("active"));
  $("btnConfirmReserveFinal").addEventListener("click", submitReservation);

  $("closeReceiptBtn").addEventListener("click", () => {
    $("receiptOverlay").classList.remove("active");
    playSound("click");
  });
  $("btnSendWhatsApp").addEventListener("click", handleSendWhatsApp);

  // File Upload listener for Payment Receipt (Phase 6)
  let selectedPaymentReceiptBase64 = null;
  const receiptInput = $("paymentReceiptInput");
  if (receiptInput) {
    receiptInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      $("paymentReceiptFileName").textContent = file.name;
      
      const reader = new FileReader();
      reader.onload = function(evt) {
        selectedPaymentReceiptBase64 = evt.target.result;
        $("paymentReceiptPreview").src = selectedPaymentReceiptBase64;
        $("paymentReceiptPreviewContainer").style.display = "block";
        $("btnSendWhatsApp").disabled = false; // Enable confirm button!
      };
      reader.readAsDataURL(file);
    });
  }

  $("closeJackpotBtn").addEventListener("click", () => {
    $("jackpotOverlay").classList.remove("active");
    playSound("click");
  });

  $("closeStoryVideoBtn").addEventListener("click", () => {
    $("storyVideoOverlay").classList.remove("active");
    playSound("click");
  });



  // Phase 2: Notifications Bell Dropdown event listeners
  $("toggleNotificationsBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    const dropdown = $("notificationsDropdown");
    const isActive = dropdown.classList.toggle("active");
    playSound("click");

    if (isActive) {
      lastViewedNotificationTime = Date.now();
      localStorage.setItem('last_notification_time', lastViewedNotificationTime);
      fetchNotifications();
    }
  });

  $("clearNotificationsBtn").addEventListener("click", (e) => {
    e.stopPropagation();
    clearNotificationsOnServer();
  });

  document.addEventListener("click", (e) => {
    const dropdown = $("notificationsDropdown");
    if (dropdown && dropdown.classList.contains("active")) {
      if (!dropdown.contains(e.target) && e.target.id !== "toggleNotificationsBtn" && !$("toggleNotificationsBtn").contains(e.target)) {
        dropdown.classList.remove("active");
      }
    }
  });



  $("btnSearch").addEventListener("click", runSearch);
  $("searchInput").addEventListener("keydown", (e) => { if (e.key === "Enter") runSearch(); });

  $("heroBuyTicketsBtn").addEventListener("click", () => {
    playSound("click");
    showScreen('purchase');
  });
  $("btnBackToHome").addEventListener("click", () => {
    playSound("click");
    showScreen('home');
  });
  $("navHome").addEventListener("click", (e) => {
    e.preventDefault();
    playSound("click");
    showScreen('home');
  });
  $("navRaffles").addEventListener("click", (e) => {
    e.preventDefault();
    playSound("click");
    showScreen('home');
    setTimeout(() => {
      $("raffleSection").scrollIntoView({behavior: "smooth"});
    }, 100);
  });
  $("navBuyTickets").addEventListener("click", (e) => {
    e.preventDefault();
    playSound("click");
    showScreen('purchase');
  });
  $("navStories").addEventListener("click", (e) => {
    e.preventDefault();
    playSound("click");
    showScreen('home');
    setTimeout(() => {
      $("storiesSection").scrollIntoView({behavior: "smooth"});
    }, 100);
  });
  $("footerSearchLink").addEventListener("click", (e) => {
    e.preventDefault();
    playSound("click");
    showScreen('home');
    setTimeout(() => {
      $("searchSection").scrollIntoView({behavior: "smooth"});
    }, 100);
  });
  $("footerWinnersLink").addEventListener("click", (e) => {
    e.preventDefault();
    playSound("click");
    showScreen('home');
    setTimeout(() => {
      $("winnersSection").scrollIntoView({behavior: "smooth"});
    }, 100);
  });

  function renderFaqBankAccounts() {
    const list = $("faqBankAccountsList");
    if (!list) return;
    list.innerHTML = "";

    bankAccounts.forEach(acc => {
      const card = document.createElement("div");
      card.style.cssText = "background: rgba(255,255,255,0.02); border: 1px solid rgba(0,229,255,0.15); padding: 14px; border-radius: 12px;";
      card.innerHTML = `
        <strong style="color:var(--cyan); font-size: 0.95rem; display: block; margin-bottom: 4px;">${escapeHtml(acc.bank)}</strong>
        <span style="font-size: 0.8rem; color: var(--text-grey); display: block; margin-bottom: 2px;">${escapeHtml(acc.type)}</span>
        <span style="font-family: var(--font-mono); font-size: 0.95rem; font-weight: 700; color: #FFF; display: block; margin-bottom: 4px;">${escapeHtml(acc.number)}</span>
        <span style="font-size: 0.8rem; color: var(--text-muted);">Titular: ${escapeHtml(acc.owner)}</span>
      `;
      list.appendChild(card);
    });

    if (bankAccounts.length === 0) {
      list.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:15px; color:var(--text-grey); font-size:0.8rem; font-family:var(--font-mono)">No hay cuentas configuradas en este momento.</div>`;
    }
  }

  function escapeHtml(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function copyToClipboard(text, label) {
    navigator.clipboard.writeText(text).then(() => {
      playSound("click");
      showToast(`${label} copiado al portapapeles.`, "ok");
    }).catch(err => {
      console.error("Error al copiar al portapapeles", err);
      showToast("Error al copiar al portapapeles.", "bad");
    });
  }

  window.srd = { 
    quickPick, 
    togglePaymentState, 
    deleteReservation,
    playStoryVideo,
    removeFromCart,
    deleteSupportMessage,
    addPackageToCart,
    copyToClipboard
  };

  init();
})();
