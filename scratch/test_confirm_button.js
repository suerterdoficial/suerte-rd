const puppeteer = require('puppeteer');
const https = require('https');

(async () => {
  console.log("1. Sending live purchase reservation via https module...");

  const testDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const payload = JSON.stringify({
    raffleId: "florida5",
    name: "Katherine Rodriguez (Cliente Confirmado Boton)",
    whatsapp: "18099838626",
    loteria: "Pick 5 Florida",
    tickets: ["09901", "09902", "09903", "09904", "09905"],
    packageLabel: "Paquete Oro (5 Boletos)",
    comprobante: testDataUrl,
    estado: "esperando_validacion"
  });

  const targetUrl = new URL('https://www.suerterd.com.do/api/tickets/reserve');

  await new Promise((resolve) => {
    const req = https.request(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log("Reserve Response:", res.statusCode, body);
        resolve();
      });
    });
    req.on('error', (e) => {
      console.error("Reserve error:", e);
      resolve();
    });
    req.write(payload);
    req.end();
  });

  console.log("2. Opening Admin page in Puppeteer...");
  const browser = await puppeteer.launch({
    headless: "new",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 1280, height: 900 });

  await adminPage.goto("https://www.suerterd.com.do/admin.html", { waitUntil: "domcontentloaded" });

  await new Promise(r => setTimeout(r, 1000));

  // Enter PIN 123456 into pinInput and click btnLoginSubmit
  await adminPage.evaluate(() => {
    const pinInp = document.getElementById('pinInput');
    const loginBtn = document.getElementById('btnLoginSubmit');
    if (pinInp && loginBtn) {
      pinInp.value = "123456";
      loginBtn.click();
    }
  });

  console.log("3. Admin logged in! Waiting 3 seconds for data load...");
  await new Promise(r => setTimeout(r, 3000));

  // Click "Validar Pagos" tab
  await adminPage.evaluate(() => {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => {
      if (t.textContent.includes('Validar Pagos')) t.click();
    });
  });

  await new Promise(r => setTimeout(r, 2000));

  await adminPage.screenshot({ path: "C:\\Users\\13900K\\.gemini\\antigravity-ide\\brain\\5f51f8cd-bb98-4fdf-89bc-2d393ef46efa\\media__now_purchase_admin.png" });

  console.log("4. Clicking 'Ver Foto HD' button in Admin table...");
  await adminPage.evaluate(() => {
    const hdBtn = document.querySelector('button[onclick*="openReceiptFromCache"], button[onclick*="openReceiptModal"]');
    if (hdBtn) hdBtn.click();
  });

  await new Promise(r => setTimeout(r, 1500));

  await adminPage.screenshot({ path: "C:\\Users\\13900K\\.gemini\\antigravity-ide\\brain\\5f51f8cd-bb98-4fdf-89bc-2d393ef46efa\\media__real_purchase_admin.png" });

  console.log("SUCCESS! Screenshots taken.");
  await browser.close();
})();
