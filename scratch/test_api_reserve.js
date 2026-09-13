(async () => {
  try {
    const res = await fetch("https://www.suerterd.com.do/api/tickets/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raffleId: "florida5",
        name: "Carlos Ramirez (Test Live)",
        whatsapp: "18099838626",
        loteria: "Pick 5 Florida",
        tickets: ["00001", "00002"],
        packageLabel: "Paquete Test",
        comprobante: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        estado: "esperando_validacion"
      })
    });
    console.log("Status:", res.status);
    const json = await res.json();
    console.log("Response:", JSON.stringify(json));
  } catch(e) {
    console.error("Fetch error:", e);
  }
})();
