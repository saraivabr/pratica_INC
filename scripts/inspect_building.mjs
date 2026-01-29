import { chromium } from 'playwright';
import axios from 'axios';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

const BASE_URL = 'https://www.orulo.com.br';
const BUILDING_ID = 69734; // Alta Floresta

(async () => {
  console.log('--- Login ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/customers/sign_in`);
  const emailBtn = await page.$('a[href*="/email"]');
  if (emailBtn) { await emailBtn.click(); await page.waitForTimeout(500); }
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

  console.log('\n--- 1. Fetching All Buildings ---');
  try {
      const bRes = await client.get('/api/v2/dashboard/buildings');
      console.log('Buildings found:', bRes.data.buildings?.length);
      if (bRes.data.buildings?.length > 0) {
          console.log('Sample Building:', JSON.stringify(bRes.data.buildings[0], null, 2));
      }
  } catch(e) { console.log('Error fetching buildings:', e.message); }

  console.log(`\n--- 2. Probing Building ${BUILDING_ID} ---`);
  
  const endpoints = [
      `/api/v2/buildings/${BUILDING_ID}`,
      `/api/v2/buildings/${BUILDING_ID}/files`,
      `/api/v2/buildings/${BUILDING_ID}/documents`,
      `/api/v2/dashboard/buildings/${BUILDING_ID}`,
      `/api/v2/dashboard/buildings/${BUILDING_ID}/files`
  ];

  for (const ep of endpoints) {
      console.log(`Trying ${ep}...`);
      try {
          const res = await client.get(ep);
          console.log(`  [SUCCESS] Keys:`, Object.keys(res.data));
          // If it looks like files, print snippet
          if (Array.isArray(res.data) || res.data.files || res.data.documents) {
              console.log('  [PAYLOAD]', JSON.stringify(res.data).substring(0, 300));
          }
      } catch (e) {
          console.log(`  [FAILED] ${e.response?.status || e.message}`);
      }
  }

})();
