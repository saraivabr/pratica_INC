import { chromium } from 'playwright';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto('https://www.orulo.com.br/customers/sign_in');
  const emailBtn = await page.$('a[href*="/email"]');
  if (emailBtn) await emailBtn.click();
  await page.fill('#email', auth.email);
  await page.fill('#password', auth.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**', { timeout: 60000 });
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/v2/') && response.headers()['content-type'].includes('json')) {
        console.log(`[API] ${response.request().method()} ${url}`);
        try {
            const json = await response.json();
            // Log keys to see if phone is here
            console.log('KEYS:', Object.keys(json));
            if (json.broker) console.log('BROKER KEYS:', Object.keys(json.broker));
        } catch(e) {}
    }
  });

  console.log('Navigating to broker detail...');
  await page.goto('https://www.orulo.com.br/dashboard/brokers/45670');
  await page.waitForTimeout(5000);

  await browser.close();
})();
