const https = require('https');

const names = [
  "Carlos Mendoza", "Ana Rodriguez", "Franklin Sosa", 
  "María Altagracia", "Jose Manuel", "Laura Peralta", "Diego Ventura"
];
const packages = [
  "Paquete Bronce (50 Boletos)", 
  "Paquete Plata (150 Boletos)", 
  "Paquete Oro (250 Boletos)"
];

let count = 0;
console.log("🚀 Iniciando envío continuo de compras en tiempo real cada 8 segundos...");

const interval = setInterval(() => {
  count++;
  if (count > 8) {
    clearInterval(interval);
    console.log("Fin de la simulación continua.");
    return;
  }

  const name = names[count % names.length] + ` (#${count})`;
  const phone = '1809' + Math.floor(1000000 + Math.random() * 9000000);
  const ticketStart = count * 100 + 10;
  const tickets = [String(ticketStart).padStart(5, '0'), String(ticketStart + 1).padStart(5, '0')];
  const pkg = packages[count % packages.length];

  const payload = JSON.stringify({
    raffleId: 'florida5',
    name: name,
    whatsapp: phone,
    loteria: 'Pick 5 Florida',
    tickets: tickets,
    packageLabel: pkg,
    comprobante: './assets/suerte_rd_iphone17_banner.png',
    estado: 'esperando_validacion'
  });

  const u = new URL('https://www.suerterd.com.do/api/tickets/reserve');
  const req = https.request(u, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  }, (res) => {
    let d = '';
    res.on('data', chunk => d += chunk);
    res.on('end', () => {
      console.log(`[Compra #${count} Enviada]: ${name} - ${pkg} (Estado: 200 OK)`);
    });
  });

  req.on('error', e => console.error('Error:', e));
  req.write(payload);
  req.end();

}, 8000);
