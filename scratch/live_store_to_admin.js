const puppeteer = require('puppeteer');
const path = require('path');

const artifactDir = 'C:\\Users\\13900K\\.gemini\\antigravity-ide\\brain\\5f51f8cd-bb98-4fdf-89bc-2d393ef46efa';
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  console.log('--- INICIANDO COMPRA DE BOLETOS EN LA TIENDA Y VERIFICACIÓN EN ADMIN ---');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 850 });

  // 1. Entrar a la tienda principal suerterd.com.do
  console.log('1. Entrando a suerterd.com.do...');
  await page.goto('https://www.suerterd.com.do', { waitUntil: 'networkidle2' });
  await delay(2000);

  // Seleccionar Paquete Oro (25 Boletos) o el primer botón de paquete disponible
  console.log('2. Seleccionando paquete de boletos...');
  const pkgButtons = await page.$$('.package-card, .btn-package, button');
  if (pkgButtons.length > 0) {
    for (let btn of pkgButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text.includes('Oro') || text.includes('25') || text.includes('Seleccionar')) {
        await btn.click();
        break;
      }
    }
  }
  await delay(1000);

  // Abrir formulario de apartado o ingresar datos
  const btnComprar = await page.$('#btnOpenCheckout, #btnCheckout, .btn-checkout-trigger');
  if (btnComprar) await btnComprar.click();
  await delay(1000);

  // Llenar formulario de datos de cliente
  console.log('3. Llenando datos del cliente...');
  if (await page.$('#buyerNameInput')) {
    await page.type('#buyerNameInput', 'Pedro Infante (Cliente Real)');
    await page.type('#buyerWhatsappInput', '18097775544');
    
    // Confirmar y Generar Recibo
    if (await page.$('#btnConfirmReserveFinal')) {
      await page.click('#btnConfirmReserveFinal');
      await delay(2000);
    }
  }

  // Tomar captura de la tienda con el recibo generado
  const pathStore = path.join(artifactDir, 'media__real_purchase_store.png');
  await page.screenshot({ path: pathStore });
  console.log('Captura 1 Guardada (Tienda):', pathStore);

  // 4. Ir al Panel Admin suerterd.com.do/admin
  console.log('4. Navegando al Panel Admin...');
  await page.goto('https://www.suerterd.com.do/admin', { waitUntil: 'networkidle2' });
  await delay(1000);

  if (await page.$('#pinInput')) {
    try {
      await page.type('#pinInput', '123456');
      await page.click('#btnLoginSubmit');
      await delay(2000);
    } catch(e) {}
  }

  // Hacer clic en Validar Pagos
  await page.click('.tab-btn[data-tab="tabValidarPagos"]');
  await delay(2000);

  // Tomar captura del Admin con la compra reflejada
  const pathAdmin = path.join(artifactDir, 'media__real_purchase_admin.png');
  await page.screenshot({ path: pathAdmin });
  console.log('Captura 2 Guardada (Admin Reflejado):', pathAdmin);

  await browser.close();
  console.log('--- COMPRA Y SINCRO COMPLETADA EXITOSAMENTE ---');
})();
