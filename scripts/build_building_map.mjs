import { chromium } from 'playwright';
import axios from 'axios';
import fs from 'fs';

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

  const allBuildings = [];
  let pageNum = 1;
  const MAX_PAGES = 10;
  
  while(pageNum <= MAX_PAGES) {
      console.log(`Fetching buildings page ${pageNum}...`);
      try {
          const res = await client.get(`/api/v2/dashboard/buildings`, {
              params: { page: pageNum, results_per_page: 100 }
          });
          
          if (!res.data.buildings || res.data.buildings.length === 0) break;
          
          res.data.buildings.forEach(b => {
              allBuildings.push({ id: b.id, name: b.name });
          });
          
          // Check pagination metadata if available, otherwise just check emptiness
          if (res.data.page >= res.data.total_pages) break;
          pageNum++;
      } catch (e) {
          console.error('Error fetching buildings:', e.message);
          break;
      }
  }

  console.log(`Total buildings found: ${allBuildings.length}`);
  fs.writeFileSync('buildings_map.json', JSON.stringify(allBuildings, null, 2));

})();
