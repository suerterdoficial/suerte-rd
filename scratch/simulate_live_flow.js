const puppeteer = require('puppeteer');
const path = require('path');

const artifactDir = 'C:\\Users\\13900K\\.gemini\\antigravity-ide\\brain\\5f51f8cd-bb98-4fdf-89bc-2d393ef46efa';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('Iniciando simulación en vivo con navegador...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });

  // Step 1: Open main store page
  console.log('1. Abriendo la tienda suerterd.com.do...');
  await page.goto('https://www.suerterd.com.do', { waitUntil: 'networkidle2' });
  await delay(2000);

  // Take screenshot 1
  const step1Path = path.join(artifactDir, 'media__live_step1_store.png');
  await page.screenshot({ path: step1Path });
  console.log('Captura 1 guardada:', step1Path);

  // Step 2: Open Admin Panel directly
  console.log('2. Abriendo el Panel de Administración suerterd.com.do/admin...');
  await page.goto('https://www.suerterd.com.do/admin', { waitUntil: 'networkidle2' });
  await delay(1000);

  // Login
  await page.type('#pinInput', '123456');
  await page.click('#btnLoginSubmit');
  await delay(2000);

  // Click Validar Pagos
  await page.click('.tab-btn[data-tab="tabValidarPagos"]');
  await delay(1000);

  // Take screenshot 2
  const step2Path = path.join(artifactDir, 'media__live_step2_admin_tab.png');
  await page.screenshot({ path: step2Path });
  console.log('Captura 2 guardada:', step2Path);

  // Step 3: Click "Crear Compra de Prueba" to simulate customer purchase
  console.log('3. Generando compra de paquete en tiempo real...');
  await page.click('#btnCreateTest');
  await delay(3000);

  // Take screenshot 3: Order arriving in Validar Pagos
  const step3Path = path.join(artifactDir, 'media__live_step3_order_arrived.png');
  await page.screenshot({ path: step3Path });
  console.log('Captura 3 guardada:', step3Path);

  await browser.close();
  console.log('Simulación completada con éxito.');
})();
