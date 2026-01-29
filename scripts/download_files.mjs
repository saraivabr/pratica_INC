import { chromium } from 'playwright';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

const BASE_URL = 'https://www.orulo.com.br';
const DOWNLOAD_DIR = 'downloads';

// Load Data
const brokers = JSON.parse(fs.readFileSync('corretores_api_final.json', 'utf8'));
const buildings = JSON.parse(fs.readFileSync('buildings_map.json', 'utf8'));

// Map Building Name -> ID (Normalize for matching)
const buildingMap = {};
buildings.forEach(b => {
    buildingMap[b.name.trim()] = b.id;
});

// Normalize helper
const norm = (str) => str.trim().toLowerCase();

(async () => {
  if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

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

  const downloadQueue = [];

  // Parse Activities for Downloads
  brokers.forEach(broker => {
      broker.atividades.forEach(act => {
          if (act.includes('Baixou arquivo')) {
              // Regex to extract filename and building
              // "Baixou arquivo XXXXX do empreendimento YYYYY (Construtora) - há Z dias"
              const match = act.match(/Baixou arquivo (.+?) do empreendimento (.+?) \(/);
              if (match) {
                  const fileName = match[1];
                  const buildingName = match[2];
                  
                  // Look up building ID
                  // Try exact match, then fuzzy
                  let bId = buildingMap[buildingName];
                  if (!bId) {
                      const key = Object.keys(buildingMap).find(k => k.includes(buildingName) || buildingName.includes(k));
                      if (key) bId = buildingMap[key];
                  }

                  if (bId) {
                      downloadQueue.push({
                          brokerName: broker.nome,
                          fileName,
                          buildingName,
                          buildingId: bId
                      });
                  } else {
                      console.log(`[WARN] Building not found in map: ${buildingName} (File: ${fileName})`);
                  }
              }
          }
      });
  });

  // Deduplicate downloads (same file/building might be downloaded by multiple, or same person multiple times)
  const uniqueDownloads = [];
  const seen = new Set();
  downloadQueue.forEach(d => {
      const key = `${d.buildingId}-${d.fileName}`;
      if (!seen.has(key)) {
          seen.add(key);
          uniqueDownloads.push(d);
      }
  });

  console.log(`
Found ${uniqueDownloads.length} unique files to download.`);

  // Process Downloads
  for (const item of uniqueDownloads) {
      console.log(`
Processing: ${item.fileName} (${item.buildingName})...
`);
      
      try {
          // 1. Get File List for Building
          const filesRes = await client.get(`/api/v2/buildings/${item.buildingId}`);
          // Merge 'files', 'floor_plans', 'images' if needed, but usually 'files' contains documents
          const allFiles = [...(filesRes.data.files || [])]; 
          
          // 2. Find matching file
          // The activity log name might differ slightly from the API name property?
          // Let's try exact match on 'name' or 'filename'
          let targetFile = allFiles.find(f => f.name === item.fileName);
          
          if (!targetFile) {
              // Try lenient match
              targetFile = allFiles.find(f => f.name.includes(item.fileName) || item.fileName.includes(f.name));
          }

          if (targetFile) {
              console.log(`  Found File ID: ${targetFile.id}`);
              
              // 3. Get Download URL
              const dlRes = await client.get(`/api/v2/buildings/${item.buildingId}/files/${targetFile.id}`);
              const downloadUrl = dlRes.data.url;
              
              if (downloadUrl) {
                  // 4. Download
                  const fileBuffer = await client.get(downloadUrl, { responseType: 'arraybuffer' });
                  
                  // Organize by Building
                  const saveDir = path.join(DOWNLOAD_DIR, item.buildingName.replace(/[^a-z0-9]/gi, '_'));
                  if (!fs.existsSync(saveDir)) fs.mkdirSync(saveDir, { recursive: true });
                  
                  const savePath = path.join(saveDir, item.fileName);
                  fs.writeFileSync(savePath, fileBuffer.data);
                  console.log(`  Saved to: ${savePath}`);
              } else {
                  console.log('  No download URL returned.');
              }

          } else {
              console.log('  File not found in building file list.');
              // console.log('  Available files:', allFiles.map(f => f.name));
          }

      } catch (err) {
          console.error(`  Error: ${err.message}`);
      }
  }

})();
