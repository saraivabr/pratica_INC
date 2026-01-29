import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

const BASE_URL = 'https://www.orulo.com.br';

(async () => {
  console.log('--- Login ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/customers/sign_in`);
  const emailBtn = await page.$('a[href*="/email"]');
  if (emailBtn) { await emailBtn.click(); await page.waitForTimeout(1000); }
  await page.fill('#email', auth.email);
  await page.fill('#password', auth.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**', { timeout: 60000 });

  console.log('Login success. Navigating to Land Interests...');
  await page.goto(`${BASE_URL}/customers/interest_land`, { waitUntil: 'networkidle' });
  
  // Wait for potential dynamic content
  await page.waitForTimeout(5000);

  // Take screenshot for debug
  await page.screenshot({ path: 'lands_debug.png', fullPage: true });

  const data = await page.evaluate(() => {
      const results = [];
      // Look for any table or list of cards
      const tables = Array.from(document.querySelectorAll('table'));
      tables.forEach((table, tIdx) => {
          const rows = Array.from(table.querySelectorAll('tr'));
          const tableData = rows.map(tr => Array.from(tr.querySelectorAll('td, th')).map(td => td.innerText.trim()));
          results.push({ type: 'table', index: tIdx, content: tableData });
      });

      // Look for cards/items if no table
      const cards = Array.from(document.querySelectorAll('.card, .item, [class*="land"]'));
      const cardData = cards.map(c => c.innerText.trim()).filter(t => t.length > 20);
      if (cardData.length > 0) results.push({ type: 'cards', content: cardData });

      return results;
  });

  fs.writeFileSync('terrenos_interesse_deep.json', JSON.stringify(data, null, 2));
  console.log('Saved deep land data.');

  await browser.close();
})();
