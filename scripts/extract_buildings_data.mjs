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

  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  // Load buildings from map if exists
  let allBuildings = [];
  if (fs.existsSync('buildings_map.json')) {
      allBuildings = JSON.parse(fs.readFileSync('buildings_map.json', 'utf8'));
  } else {
      console.log('Building map not found, cannot proceed deeply. Please run build_building_map.mjs first.');
      return;
  }

  const buildingsDir = path.join(OUTPUT_DIR, 'empreendimentos');
  if (!fs.existsSync(buildingsDir)) fs.mkdirSync(buildingsDir);

  console.log(`\n--- Processing ${allBuildings.length} buildings ---`);

  // Batch requests to be polite but faster
  const CHUNK_SIZE = 5;
  for (let i = 0; i < allBuildings.length; i += CHUNK_SIZE) {
      const chunk = allBuildings.slice(i, i + CHUNK_SIZE);
      console.log(`Processing chunk ${i+1}-${i+chunk.length}...`);
      
      const promises = chunk.map(async (b) => {
          const safeName = b.name.replace(/[^a-z0-9]/gi, '_');
          const bPath = path.join(buildingsDir, `${b.id}_${safeName}`);
          if (!fs.existsSync(bPath)) fs.mkdirSync(bPath);

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

          // Integrations
          try {
              const integ = await client.get(`/api/v2/dashboard/${b.id}/integration_list`);
              fs.writeFileSync(path.join(bPath, 'integrations.json'), JSON.stringify(integ.data, null, 2));
          } catch(e) {}
      });

      await Promise.all(promises);
  }

  console.log('\n--- Land Interests ---');
  try {
      await page.goto('https://www.orulo.com.br/customers/interest_land');
      await page.waitForLoadState('networkidle');
      
      const lands = await page.evaluate(() => {
          // Check for data-table rows or similar
          const rows = Array.from(document.querySelectorAll('table tbody tr'));
          if (rows.length > 0) {
              return rows.map(tr => Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim()));
          }
          // Fallback: check for lists or cards
          const items = Array.from(document.querySelectorAll('.land-interest-item, .card')); // Hypothetical
          return items.map(i => i.innerText);
      });
      
      fs.writeFileSync(path.join(OUTPUT_DIR, 'terrenos_interesse.json'), JSON.stringify(lands, null, 2));
      console.log(`Saved land interests.`);
  } catch(e) { console.log('Error lands:', e.message); }

  console.log('Done.');
  await browser.close();
})();
