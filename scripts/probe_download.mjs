import { chromium } from 'playwright';
import axios from 'axios';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

const BASE_URL = 'https://www.orulo.com.br';
const BUILDING_ID = 69734;
const FILE_ID = 1613814;

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
      // 'Accept': 'application/json', // Allow binary for download
    },
    maxRedirects: 0, // We want to catch the 302 location
    validateStatus: status => status >= 200 && status < 400
  });

  const patterns = [
      `/api/v2/buildings/${BUILDING_ID}/files/${FILE_ID}`,
      `/buildings/${BUILDING_ID}/files/${FILE_ID}`,
      `/buildings/${BUILDING_ID}/files/${FILE_ID}/download`,
      `/api/v2/buildings/${BUILDING_ID}/files/${FILE_ID}/download`,
      `/api/v2/files/${FILE_ID}/download`,
      `/files/${FILE_ID}/download`
  ];

  for (const url of patterns) {
      console.log(`Probing: ${url}`);
      try {
          const res = await client.get(url);
          console.log(`  [${res.status}] Type: ${res.headers['content-type']}`);
          if (res.headers.location) console.log(`  Location: ${res.headers.location}`);
          if (res.headers['content-type']?.includes('application/pdf')) console.log('  -> THIS IS THE PDF!');
      } catch(e) {
          console.log(`  [FAILED] ${e.response?.status}`);
      }
  }

})();
