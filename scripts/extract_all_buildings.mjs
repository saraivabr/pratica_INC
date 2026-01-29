import { chromium } from 'playwright';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

const BASE_URL = 'https://www.orulo.com.br';
const OUTPUT_DIR = 'dados_empreendimentos';

(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  console.log('--- Step 1: Login ---');
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

  console.log('--- Step 2: Get Developer/Partner Info ---');
  let partnerId = null;
  try {
      const meRes = await client.get('/api/v2/me/developers');
      if (meRes.data.developers && meRes.data.developers.length > 0) {
          partnerId = meRes.data.developers[0].id;
          console.log(`Partner ID: ${partnerId} (${meRes.data.developers[0].name})`);
          fs.writeFileSync(path.join(OUTPUT_DIR, 'partner_info.json'), JSON.stringify(meRes.data, null, 2));
      }
  } catch(e) { console.error('Error getting partner info:', e.message); }

  console.log('--- Step 3: Fetch Global Performance ---');
  if (partnerId) {
      try {
          const perfRes = await client.get(`/api/v2/partners/${partnerId}/performance`);
          fs.writeFileSync(path.join(OUTPUT_DIR, 'global_performance.json'), JSON.stringify(perfRes.data, null, 2));
          console.log('Saved global_performance.json');
      } catch(e) { console.error('Error getting performance:', e.message); }
  }

  console.log('--- Step 4: List All Buildings ---');
  const allBuildings = [];
  let pageNum = 1;
  while(true) {
      try {
          const bRes = await client.get('/api/v2/dashboard/buildings', { params: { page: pageNum, results_per_page: 100 } });
          const list = bRes.data.buildings || [];
          if (list.length === 0) break;
          allBuildings.push(...list);
          if (bRes.data.page >= bRes.data.total_pages) break;
          pageNum++;
      } catch(e) { break; }
  }
  console.log(`Found ${allBuildings.length} buildings.`);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'buildings_list.json'), JSON.stringify(allBuildings, null, 2));

  console.log('--- Step 5: Fetch Deep Data per Building ---');
  for (const b of allBuildings) {
      const safeName = b.name.replace(/[^a-z0-9]/gi, '_');
      const bDir = path.join(OUTPUT_DIR, `${b.id}_${safeName}`);
      if (!fs.existsSync(bDir)) fs.mkdirSync(bDir);

      console.log(`Processing ${b.name} (${b.id})...`);

      // 5.1 Full Details
      try {
          const detailRes = await client.get(`/api/v2/buildings/${b.id}`);
          fs.writeFileSync(path.join(bDir, 'details.json'), JSON.stringify(detailRes.data, null, 2));
      } catch(e) { console.error(`  Error details: ${e.message}`); }

      // 5.2 Units/Availability
      try {
          const unitsRes = await client.get(`/api/v2/buildings/${b.id}/units`);
          fs.writeFileSync(path.join(bDir, 'units.json'), JSON.stringify(unitsRes.data, null, 2));
      } catch(e) { 
          // 404 is common if no units are registered
          if (e.response?.status !== 404) console.error(`  Error units: ${e.message}`);
      }

      // 5.3 Building Performance (if available specific endpoint exists)
      // Usually performance is aggregated, but let's see if we can get it per building via dashboard API
      // /api/v2/dashboard/buildings/{id}/analytics ?? (Guessing)
      // We will rely on what we found in 'details' for now.
  }

  console.log('Done.');

})();
