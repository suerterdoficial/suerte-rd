const fetch = globalThis.fetch || require('node-fetch');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runLiveSimulation() {
  console.log("==================================================");
  console.log("🚀 INICIANDO SIMULACIÓN DE COMPRA DE PAQUETE EN TIEMPO REAL");
  console.log("==================================================");

  // Paso 1: Selección y Reserva del Paquete Bronce (50 boletos)
  const tickets = [];
  for (let i = 200; i < 250; i++) {
    tickets.push(String(i).padStart(5, '0'));
  }

  console.log("\n📌 [PASO 1] El cliente selecciona el 'Paquete Bronce' (50 boletos)...");
  console.log(`🎟️ Boletos seleccionados: #${tickets[0]} al #${tickets[tickets.length - 1]}`);
  console.log("📱 WhatsApp de contacto:", "18099838626");

  const res1 = await fetch("http://localhost:8000/api/tickets/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      raffleId: "florida5",
      name: "Carlos Mendoza (Cliente Simulado)",
      whatsapp: "18099838626",
      loteria: "Pick 5 Florida",
      tickets: tickets,
      estado: "reservado"
    })
  });
  const data1 = await res1.json();
  console.log("✅ RESULTADO PASO 1 (Reserva realizada):", data1);

  console.log("\n⏳ Esperando 4 segundos (Cliente transfiriendo dinero y subiendo comprobante)...");
  await sleep(4000);

  // Paso 2: Subida del comprobante de pago
  console.log("\n📌 [PASO 2] El cliente adjunta la foto del comprobante bancario...");
  const res2 = await fetch("http://localhost:8000/api/tickets/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      raffleId: "florida5",
      name: "Carlos Mendoza (Cliente Simulado)",
      whatsapp: "18099838626",
      loteria: "Pick 5 Florida",
      tickets: tickets,
      comprobante: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      estado: "esperando_validacion"
    })
  });
  const data2 = await res2.json();
  console.log("✅ RESULTADO PASO 2 (Comprobante Recibido):", data2);

  console.log("\n⏳ Esperando 4 segundos (Administrador verificando en la cuenta bancaria)...");
  await sleep(4000);

  // Paso 3: Aprobación del Pago por el Administrador
  console.log("\n📌 [PASO 3] El Administrador aprueba el pago del paquete de 50 boletos...");

  const dbRes = await fetch("http://localhost:8000/api/get?key=suerterd:tickets:v2:florida5");
  const dbData = await dbRes.json();
  const currentTickets = JSON.parse(dbData.value || "{}");

  tickets.forEach(num => {
    if (currentTickets[num]) {
      currentTickets[num].estado = "pagado";
    }
  });

  const setRes = await fetch("http://localhost:8000/api/set", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-admin-pin": "SuerteRD2026"
    },
    body: JSON.stringify({
      key: "suerterd:tickets:v2:florida5",
      value: JSON.stringify(currentTickets)
    })
  });
  const setData = await setRes.json();
  console.log("✅ RESULTADO PASO 3 (Paquete marcado como PAGADO):", setData);

  console.log("\n⏳ Esperando 2 segundos para consultar notificaciones...");
  await sleep(2000);

  // Paso 4: Notificaciones registradas
  const notifRes = await fetch("http://localhost:8000/api/notifications");
  const notifData = await notifRes.json();
  console.log("\n🔔 ACTIVIDAD REGISTRADA EN EL SISTEMA:");
  (notifData.value || []).slice(0, 4).forEach((n, idx) => {
    console.log(`   ${idx + 1}. ${n.text}`);
  });

  console.log("\n==================================================");
  console.log("🎉 ¡SIMULACIÓN DE COMPRA EN TIEMPO REAL COMPLETADA!");
  console.log("==================================================");
}

runLiveSimulation().catch(console.error);
