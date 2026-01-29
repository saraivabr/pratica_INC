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

  console.log('Navigating to Terrenos...');
  await page.goto('https://www.orulo.com.br/customers/interest_land', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('button, a')).map(el => el.innerText.trim()).filter(t => t.length > 0));
  console.log('Buttons/Links on page:', buttons);

  const html = await page.content();
  fs.writeFileSync('terrenos_page.html', html);

  await browser.close();
})();
