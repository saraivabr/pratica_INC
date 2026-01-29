import { chromium } from 'playwright';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

const BASE_URL = 'https://www.orulo.com.br';
const OUTPUT_DIR = 'dados_sistema_orulo';

(async () => {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

  // --- LOGIN ---
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
  // Keep browser open for scraping HTML-only pages if needed (like Terrenos)

  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  // --- 2. PARTNER INFO & USERS ---
  console.log('--- Step 2: Partner & Team ---');
  let partnerId = 2848; // Default known, but let's refresh
  try {
      const meRes = await client.get('/api/v2/me/developers');
      if (meRes.data.developers?.length > 0) {
          partnerId = meRes.data.developers[0].id;
          fs.writeFileSync(path.join(OUTPUT_DIR, 'partner_profile.json'), JSON.stringify(meRes.data, null, 2));
      }
  } catch(e) {}

  // Users (Optional / May fail)
  try {
      const usersRes = await client.get(`/api/v2/partners/${partnerId}/users`); // Changed endpoint guess
      fs.writeFileSync(path.join(OUTPUT_DIR, 'team_users.json'), JSON.stringify(usersRes.data, null, 2));
  } catch(e) { console.log('Skipping users fetch (API error).'); }

  // Performance Global
  try {
      const perfRes = await client.get(`/api/v2/partners/${partnerId}/performance`);
      fs.writeFileSync(path.join(OUTPUT_DIR, 'global_performance.json'), JSON.stringify(perfRes.data, null, 2));
  } catch(e) {}

  console.log('--- Step 3: Buildings Deep Data ---');
  const allBuildings = [];
  let pageNum = 1;
  while(true) {
      console.log(`Fetching buildings page ${pageNum}...`);
      try {
          const bRes = await client.get('/api/v2/dashboard/buildings', { params: { page: pageNum, results_per_page: 100 } });
          const list = bRes.data.buildings || [];
          if (list.length === 0) break;
          allBuildings.push(...list);
          if (bRes.data.page >= bRes.data.total_pages) break;
          pageNum++;
      } catch(e) { break; }
  }
  
  const buildingsDir = path.join(OUTPUT_DIR, 'empreendimentos');
  if (!fs.existsSync(buildingsDir)) fs.mkdirSync(buildingsDir);

  for (const b of allBuildings) {
      const safeName = b.name.replace(/[^a-z0-9]/gi, '_');
      const bPath = path.join(buildingsDir, `${b.id}_${safeName}`);
      if (!fs.existsSync(bPath)) fs.mkdirSync(bPath);
      
      console.log(`Processing ${b.name}...`);

      // Details
      try {
          const det = await client.get(`/api/v2/buildings/${b.id}`);
          fs.writeFileSync(path.join(bPath, 'details.json'), JSON.stringify(det.data, null, 2));
      } catch(e) {}

      // Units
      try {
          const units = await client.get(`/api/v2/buildings/${b.id}/units`);
          fs.writeFileSync(path.join(bPath, 'units.json'), JSON.stringify(units.data, null, 2));
      } catch(e) {}

      // Integrations (Where is it advertised?)
      try {
          const integ = await client.get(`/api/v2/dashboard/${b.id}/integration_list`);
          fs.writeFileSync(path.join(bPath, 'integrations.json'), JSON.stringify(integ.data, null, 2));
      } catch(e) {}
  }

  // --- 4. LAND INTERESTS (HTML SCRAPE) ---
  console.log('--- Step 4: Land Interests ---');
  try {
      await page.goto('https://www.orulo.com.br/customers/interest_land');
      await page.waitForLoadState('networkidle');
      // Extract data from table if exists
      const lands = await page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('table tbody tr'));
          return rows.map(tr => {
              const cells = Array.from(tr.querySelectorAll('td'));
              return cells.map(td => td.innerText.trim());
          });
      });
      fs.writeFileSync(path.join(OUTPUT_DIR, 'terrenos_interesse.json'), JSON.stringify(lands, null, 2));
      console.log(`Saved ${lands.length} land interests.`);
  } catch(e) { console.log('Error lands:', e.message); }

  console.log('Extraction Complete.');
  await browser.close();
})();
