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
  console.log('Logged in.');

  // Monitor network
  page.on('response', async response => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';
    
    if (url.includes('brokers') || url.includes('dashboard') || contentType.includes('json')) {
      if (contentType.includes('json')) {
          console.log(`\n[API FOUND?] ${response.request().method()} ${url}`);
          try {
            const json = await response.json();
            // Check if it looks like a list of brokers
            if (Array.isArray(json) || (json.brokers && Array.isArray(json.brokers)) || (json.data && Array.isArray(json.data))) {
                console.log('  -> Payload looks promising! Keys:', Object.keys(json));
                // Print snippet
                console.log('  -> Snippet:', JSON.stringify(json).substring(0, 200));
            }
          } catch(e) {
              console.log('  -> Could not parse JSON');
          }
      }
    }
  });

  console.log('Navigating to brokers list...');
  await page.goto('https://www.orulo.com.br/dashboard/brokers');
  await page.waitForTimeout(5000);

  console.log('Navigating to page 2...');
  await page.goto('https://www.orulo.com.br/dashboard/brokers?page=2');
  await page.waitForTimeout(5000);

  await browser.close();
})();
