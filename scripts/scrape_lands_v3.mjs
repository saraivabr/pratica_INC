import { chromium } from 'playwright';
import fs from 'fs';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Login...');
  await page.goto('https://www.orulo.com.br/customers/sign_in');
  const emailBtn = await page.$('a[href*="/email"]');
  if (emailBtn) await emailBtn.click();
  await page.fill('#email', auth.email);
  await page.fill('#password', auth.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**', { timeout: 60000 });

  const urls = [
      'https://www.orulo.com.br/customers/interest_land',
      'https://www.orulo.com.br/dashboard/customers/interest_land'
  ];

  for (const url of urls) {
      console.log(`\nVisiting ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(5000);
      
      // Dismiss cookie banner if exists
      try {
          const cookieBtn = await page.$('button:has-text("todos"), button:has-text("Permitir")');
          if (cookieBtn) {
              await cookieBtn.click();
              await page.waitForTimeout(2000);
          }
      } catch(e) {}

      const content = await page.innerText('body');
      console.log(`Content Length: ${content.length}`);
      fs.writeFileSync(`land_content_${url.includes('dashboard') ? 'dash' : 'cust'}.txt`, content);
      
      // Look for data rows
      const rows = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('tr, .item, .card'))
            .map(el => el.innerText.trim())
            .filter(t => t.length > 30);
      });
      console.log(`Rows found: ${rows.length}`);
      if (rows.length > 0) {
          fs.writeFileSync(`land_rows_${url.includes('dashboard') ? 'dash' : 'cust'}.json`, JSON.stringify(rows, null, 2));
      }
  }

  await browser.close();
})();
