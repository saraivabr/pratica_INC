import { chromium } from 'playwright';
import axios from 'axios';
import fs from 'fs';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

const BASE_URL = 'https://www.orulo.com.br';

(async () => {
  console.log('--- Step 1: Login & Get Session Cookies ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/customers/sign_in`);
    const emailBtn = await page.$('a[href*="/email"]');
    if (emailBtn) { await emailBtn.click(); await page.waitForTimeout(500); }
    await page.fill('#email', auth.email);
    await page.fill('#password', auth.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard/**', { timeout: 45000 });
    console.log('Logged in successfully.');
  } catch (e) {
    console.error('Login failed:', e.message);
    await browser.close();
    return;
  }

  const cookies = await context.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  await browser.close();

  console.log('--- Step 2: Extract Data via Private API ---');

  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }
  });

  const allBrokersData = [];
  const TOTAL_PAGES = 26; // As per user request

  // Resume logic - Load existing file
  if (fs.existsSync('corretores_api_final.json')) {
      try {
          const existing = JSON.parse(fs.readFileSync('corretores_api_final.json'));
          allBrokersData.push(...existing);
          console.log(`Resuming... Loaded ${existing.length} brokers.`);
      } catch(e) {}
  }

  for (let p = 17; p <= TOTAL_PAGES; p++) {
    console.log(`
Fetching List Page ${p}...`);
    try {
      const listRes = await client.get(`/api/v2/dashboard/developers/brokers`, {
        params: {
          sort_column: 'buildings_interest',
          sort_orientation: 'desc',
          page: p,
          results_per_page: 50
        }
      });

      const brokersList = listRes.data.brokers || [];
      console.log(`  Found ${brokersList.length} brokers.`);

      if (brokersList.length === 0) break;

      // Process details in parallel chunks
      const chunkData = [];
      const CHUNK_SIZE = 10;
      
      for (let i = 0; i < brokersList.length; i += CHUNK_SIZE) {
        const chunk = brokersList.slice(i, i + CHUNK_SIZE);
        const promises = chunk.map(async (b) => {
            const brokerId = b.broker_id;
            try {
                // 1. Details (Phone, Email)
                const detailRes = await client.get(`/api/v2/dashboard/developers/brokers/${brokerId}`);
                const detail = detailRes.data;

                // 2. Activities
                const actsRes = await client.get(`/api/v2/dashboard/developers/brokers/${brokerId}/activities`);
                const activities = actsRes.data.activities || [];

                // 3. Interests
                const intsRes = await client.get(`/api/v2/dashboard/developers/brokers/${brokerId}/interests`);
                const interests = intsRes.data.groups ? intsRes.data.groups.flat() : [];

                return {
                    id: brokerId,
                    nome: detail.name,
                    email: detail.email,
                    telefone: detail.phone,
                    creci: detail.creci,
                    imobiliaria: detail.organization_name,
                    atividades: activities.map(a => `${a.message} - ${a.time}`),
                    interesses: interests.map(i => `${i.interest} ${i.building_name} (${i.developer_name})`)
                };
            } catch (err) {
                console.error(`  Error broker ${brokerId}: ${err.message}`);
                return null;
            }
        });

        const results = await Promise.all(promises);
        chunkData.push(...results.filter(r => r));
        process.stdout.write('.');
      }
      
      allBrokersData.push(...chunkData);
      
      // Save progress
      fs.writeFileSync('corretores_api_final.json', JSON.stringify(allBrokersData, null, 2));

    } catch (err) {
      console.error(`Error fetching list page ${p}:`, err.message);
    }
  }

  console.log(`

Total extracted: ${allBrokersData.length}`);
})();
