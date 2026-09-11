const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function main() {
  const dir = 'C:/Users/13900K/.gemini/antigravity-ide/brain/386af5e0-410a-4149-8c1a-2a60e6933f5b';
  const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  
  console.log('1. Abriendo navegador Chrome en vivo...');
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('2. Entrando a https://www.suerterd.com.do/ ...');
  await page.goto('https://www.suerterd.com.do/', { waitUntil: 'networkidle2' });
  const f1 = path.join(dir, 'media__live1.png');
  await page.screenshot({ path: f1 });
  console.log('Captura 1 (Página Principal):', fs.existsSync(f1));

  console.log('3. Haciendo clic en "Comprar Paquete" en el Paquete Bronce (50 Números)...');
  await page.evaluate(() => {
    const btn = document.querySelector('.package-card.package-bronce .package-btn');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  const f2 = path.join(dir, 'media__live2.png');
  await page.screenshot({ path: f2 });
  console.log('Captura 2 (Modal Abierto con 50 boletos):', fs.existsSync(f2));

  console.log('4. Llenando nombre y teléfono del comprador...');
  await page.type('#buyerNameInput', 'Carlos Mendoza (Prueba en Vivo)');
  await page.type('#buyerWhatsappInput', '18099838626');
  await new Promise(r => setTimeout(r, 1000));
  const f3 = path.join(dir, 'media__live3.png');
  await page.screenshot({ path: f3 });
  console.log('Captura 3 (Formulario Completo):', fs.existsSync(f3));

  console.log('5. Presionando "Confirmar y Generar Recibo"...');
  await page.evaluate(() => {
    const btn = document.querySelector('#btnConfirmReserveFinal');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));
  const f4 = path.join(dir, 'media__live4.png');
  await page.screenshot({ path: f4 });
  console.log('Captura 4 (Recibo Digital Generado):', fs.existsSync(f4));

  await browser.close();
  console.log('--- PROCESO EN VIVO FINALIZADO ---');
}

main().catch(err => console.error('Error en simulación:', err));
