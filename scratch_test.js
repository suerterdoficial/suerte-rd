const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

(async () => {
  console.log("Starting Puppeteer browser simulation...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR EXCEPTION:', err.toString()));

    console.log("Navigating to https://www.suerterd.com.do...");
    await page.goto('https://www.suerterd.com.do', { waitUntil: 'networkidle2' });

    console.log("Clicking 'Comprar Paquete'...");
    await page.evaluate(() => {
      if (typeof window.srd !== 'undefined' && window.srd.addPackageToCart) {
        window.srd.addPackageToCart(50);
      } else {
        const btns = Array.from(document.querySelectorAll('button'));
        const bronzeBtn = btns.find(b => b.textContent.includes('Comprar Paquete'));
        if (bronzeBtn) bronzeBtn.click();
      }
    });

    await new Promise(r => setTimeout(r, 1000));

    console.log("Filling buyer form (julio / 8099090455)...");
    await page.type('#buyerNameInput', 'julio');
    await page.type('#buyerWhatsappInput', '8099090455');

    console.log("Clicking '#btnConfirmReserveFinal' (Confirmar y Generar Recibo)...");
    await page.click('#btnConfirmReserveFinal');

    await new Promise(r => setTimeout(r, 2000));

    const receiptActive = await page.evaluate(() => {
      const el = document.getElementById('receiptOverlay');
      return el ? el.classList.contains('active') : false;
    });

    console.log("Is receiptOverlay active after click?", receiptActive);

    const artifactPath = "C:\\Users\\13900K\\.gemini\\antigravity-ide\\brain\\f558e9fb-4e8a-48df-9f13-313a1bd11ca8\\media__1789172889619.png";
    await page.screenshot({ path: artifactPath });
    console.log(`Saved simulation screenshot to ${artifactPath}`);

  } catch (err) {
    console.error("Simulation error:", err);
  } finally {
    await browser.close();
  }
})();
