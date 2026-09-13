const puppeteer = require('puppeteer');

(async () => {
  console.log('--- INICIANDO DEPURACIÓN PROFUNDA DE COMPRA REAL ---');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  // Escuchar errores de consola y red
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
  page.on('response', async res => {
    if (res.url().includes('/api/tickets/reserve')) {
      console.log('RESERVE API STATUS:', res.status());
      try {
        const json = await res.json();
        console.log('RESERVE API RESPONSE:', json);
      } catch(e) {}
    }
  });

  await page.goto('https://www.suerterd.com.do', { waitUntil: 'networkidle2' });

  // Ejecutar reserva en el navegador igual que un cliente real
  const res = await page.evaluate(async () => {
    try {
      const response = await fetch('/api/tickets/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raffleId: 'florida5',
          name: 'Cliente Real de Prueba',
          whatsapp: '18099838626',
          loteria: 'Pick 5 Florida',
          tickets: ['55501', '55502', '55503'],
          packageLabel: 'Paquete de Prueba Real',
          comprobante: './assets/suerte_rd_iphone17_banner.png',
          estado: 'esperando_validacion'
        })
      });
      return await response.json();
    } catch(e) {
      return { error: e.message };
    }
  });

  console.log('EVALUATE RESULT:', res);

  // Verificar si la compra aparece en admin
  await page.goto('https://www.suerterd.com.do/admin', { waitUntil: 'networkidle2' });
  await page.type('#pinInput', '123456');
  await page.click('#btnLoginSubmit');
  await new Promise(r => setTimeout(r, 2000));

  const adminTickets = await page.evaluate(async () => {
    const r = await fetch('/api/get?key=suerterd:tickets:v2:florida5');
    const data = await r.json();
    return data;
  });

  console.log('ADMIN GET RESULT:', adminTickets);

  await browser.close();
})();
