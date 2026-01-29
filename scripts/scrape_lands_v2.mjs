import { chromium } from 'playwright';
import fs from 'fs';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

const BASE_URL = 'https://www.orulo.com.br';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto(`${BASE_URL}/customers/sign_in`);
  const emailBtn = await page.$('a[href*="/email"]');
  if (emailBtn) await emailBtn.click();
  await page.fill('#email', auth.email);
  await page.fill('#password', auth.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**', { timeout: 60000 });

  console.log('Navigating to Land Interests...');
  await page.goto(`${BASE_URL}/customers/interest_land`, { waitUntil: 'networkidle' });
  
  // Wait for the table or list to load
  await page.waitForTimeout(5000);

  // Debug: Print page title and URL
  console.log('Page Title:', await page.title());
  console.log('Current URL:', page.url());

  // Extract all text to see what's there
  const allText = await page.innerText('body');
  fs.writeFileSync('lands_text_debug.txt', allText);

  // Look for specific patterns (addresses, dates, areas)
  const data = await page.evaluate(() => {
      // Find all divs or rows that might be lands
      return Array.from(document.querySelectorAll('.land-card, .interest-land-item, tr, .item'))
        .map(el => el.innerText.trim())
        .filter(t => t.length > 50); // Filter for long descriptions
  });

  fs.writeFileSync('lands_extracted.json', JSON.stringify(data, null, 2));
  console.log(`Found ${data.length} potential land entries.`);

  await browser.close();
})();
