const puppeteer = require('puppeteer');
const path = require('path');

const artifactDir = 'C:\\Users\\13900K\\.gemini\\antigravity-ide\\brain\\5f51f8cd-bb98-4fdf-89bc-2d393ef46efa';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('Iniciando prueba en vivo en navegador real...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });

  // 1. Entrar a admin
  console.log('1. Entrando a suerterd.com.do/admin...');
  await page.goto('https://www.suerterd.com.do/admin', { waitUntil: 'networkidle2' });
  await delay(1000);

  // Iniciar sesión
  if (await page.$('#pinInput')) {
    try {
      await page.type('#pinInput', '123456');
      await page.click('#btnLoginSubmit');
      await delay(2000);
    } catch(e) {}
  }

  // Entrar a Validar Pagos
  await page.click('.tab-btn[data-tab="tabValidarPagos"]');
  await delay(1000);

  // Crear compra de prueba
  console.log('2. Creando compra de prueba...');
  await page.click('#btnCreateTest');
  await delay(3000);

  // Captura ANTES de recargar
  const pathBefore = path.join(artifactDir, 'media__proof_before_refresh.png');
  await page.screenshot({ path: pathBefore });
  console.log('Captura ANTES de recargar guardada:', pathBefore);

  // RECARGAR PÁGINA (F5)
  console.log('3. Recargando la página con F5...');
  await page.reload({ waitUntil: 'networkidle2' });
  await delay(2000);

  await page.click('.tab-btn[data-tab="tabValidarPagos"]');
  await delay(1000);

  // Captura DESPUÉS de recargar F5
  const pathAfter = path.join(artifactDir, 'media__proof_after_refresh.png');
  await page.screenshot({ path: pathAfter });
  console.log('Captura DESPUÉS de recargar F5 guardada:', pathAfter);

  await browser.close();
  console.log('Prueba en vivo completada exitosamente.');
})();
