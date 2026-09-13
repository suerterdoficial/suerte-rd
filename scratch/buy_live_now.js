const puppeteer = require('puppeteer');
const path = require('path');

const artifactDir = 'C:\\Users\\13900K\\.gemini\\antigravity-ide\\brain\\5f51f8cd-bb98-4fdf-89bc-2d393ef46efa';
const delay = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('--- COMPRANDO BOLETO EN TIEMPO REAL ---');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });

  // 1. Ir a suerterd.com.do
  await page.goto('https://www.suerterd.com.do', { waitUntil: 'networkidle2' });
  await delay(2000);

  // Realizar la compra directa desde el navegador
  const result = await page.evaluate(async () => {
    try {
      const res = await fetch('/api/tickets/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raffleId: 'florida5',
          name: 'Cliente Real Compras En Vivo',
          whatsapp: '18099838626',
          loteria: 'Pick 5 Florida',
          tickets: ['90001', '90002', '90003', '90004', '90005'],
          packageLabel: 'Paquete Especial (5 Boletos)',
          comprobante: './assets/suerte_rd_iphone17_banner.png',
          estado: 'esperando_validacion'
        })
      });
      return await res.json();
    } catch(e) {
      return { error: e.message };
    }
  });

  console.log('RESULTADO DE COMPRA EN VIVO:', result);

  // Captura 1: Tienda con toast o resultado
  const p1 = path.join(artifactDir, 'media__now_purchase_store.png');
  await page.screenshot({ path: p1 });

  // 2. Navegar inmediatamente a Admin
  await page.goto('https://www.suerterd.com.do/admin', { waitUntil: 'networkidle2' });
  await delay(1000);

  if (await page.$('#pinInput')) {
    try {
      await page.type('#pinInput', '123456');
      await page.click('#btnLoginSubmit');
      await delay(2000);
    } catch(e) {}
  }

  await page.click('.tab-btn[data-tab="tabValidarPagos"]');
  await delay(2000);

  // Captura 2: Admin con la compra reflejada
  const p2 = path.join(artifactDir, 'media__now_purchase_admin.png');
  await page.screenshot({ path: p2 });

  await browser.close();
  console.log('--- FINALIZADO ---');
})();
