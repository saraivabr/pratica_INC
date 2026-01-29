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

  // Monitor API calls
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/') && response.headers()['content-type']?.includes('json')) {
        console.log(`[API DETECTED] ${response.request().method()} ${url}`);
    }
  });

  const sections = [
      '/dashboard/intelligence',
      '/dashboard/integrations',
      '/dashboard/developer_users',
      '/customers/interest_land'
  ];

  for (const sec of sections) {
      console.log(`
Navigating to ${sec}...`);
      try {
          await page.goto(`https://www.orulo.com.br${sec}`, { waitUntil: 'networkidle' });
          await page.waitForTimeout(2000);
      } catch(e) {
          console.log(`Error visiting ${sec}: ${e.message}`);
      }
  }

  await browser.close();
})();
