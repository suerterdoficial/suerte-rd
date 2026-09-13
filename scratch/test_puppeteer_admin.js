const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('https://www.suerterd.com.do/admin', { waitUntil: 'networkidle2' });
  
  // Take screenshot 1: Login overlay
  await page.screenshot({ path: 'scratch/screenshot_login.png' });
  console.log('Title:', await page.title());

  // Type PIN 123456 and click submit
  await page.type('#pinInput', '123456');
  await page.click('#btnLoginSubmit');
  
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'scratch/screenshot_dashboard.png' });

  // Click tab Validar Pagos
  const btnValidar = await page.$('.tab-btn[data-tab="tabValidarPagos"]');
  if (btnValidar) {
    await btnValidar.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/screenshot_validar_pagos.png' });
  }

  await browser.close();
  console.log('Puppeteer test finished!');
})();
