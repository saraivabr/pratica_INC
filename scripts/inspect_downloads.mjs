import { chromium } from 'playwright';
import axios from 'axios';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

const BASE_URL = 'https://www.orulo.com.br';
const TARGET_BROKER_ID = 163917; // Cintia (known to have downloads)

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  console.log('Logging in...');
  await page.goto(`${BASE_URL}/customers/sign_in`);
  const emailBtn = await page.$('a[href*="/email"]');
  if (emailBtn) await emailBtn.click();
  await page.fill('#email', auth.email);
  await page.fill('#password', auth.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard/**', { timeout: 60000 });

  const cookies = await context.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  await browser.close();

  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  console.log(`Fetching activities for broker ${TARGET_BROKER_ID}...`);
  const actsRes = await client.get(`/api/v2/dashboard/developers/brokers/${TARGET_BROKER_ID}/activities`);
  
  // Filter for downloads
  const downloads = actsRes.data.activities.filter(a => (a.message && a.message.toLowerCase().includes('baixou')));
  
  console.log(`Found ${downloads.length} downloads.`);
  if (downloads.length > 0) {
      console.log('First download object keys:', Object.keys(downloads[0]));
      console.log('Sample Download JSON:', JSON.stringify(downloads[0], null, 2));
  } else if (actsRes.data.activities.length > 0) {
      console.log('Sample Activity JSON (No Download):', JSON.stringify(actsRes.data.activities[0], null, 2));
  }

})();
