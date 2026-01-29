import { chromium } from 'playwright';
import fs from 'fs';

const POWERBI_URL = 'https://app.powerbi.com/view?r=eyJrIjoiNDQ2MDg5ZmYtYzEyNi00NzA4LTk2MGEtNWQxNjdkZWJjMDg3IiwidCI6ImExYmI2ZTU4LTVhMTUtNDMzOS04ZmYyLTk0Y2Q0ZmVhZmEyOSJ9';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Opening PowerBI...');
  await page.goto(POWERBI_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(10000); // PowerBI is heavy

  const allData = new Set();

  console.log('Scrolling and extracting...');
  
  // Strategy: Find the scrollable container and scroll repeatedly
  // In PowerBI, the data is often in .row, .cell or similar
  // We'll just grab all text blocks that look like table rows
  
  for (let i = 0; i < 20; i++) {
      const rows = await page.evaluate(() => {
          // Look for the specific grid structure of PowerBI
          const cells = Array.from(document.querySelectorAll('.pivotTableCellWrap, .vc-grid-cell, .column-header, .row-header'));
          return cells.map(c => c.innerText.trim()).filter(t => t.length > 0);
      });
      
      rows.forEach(r => allData.add(r));
      
      // Try to scroll the table
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(1000);
      process.stdout.write('.');
  }

  // Second pass: grab all divs with text
  const rawText = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div[role="cell"], div[role="row"], .visual-container'));
      return divs.map(d => d.innerText.split('\n').map(s => s.trim()).filter(s => s.length > 0)).flat();
  });
  rawText.forEach(t => allData.add(t));

  const result = Array.from(allData);
  fs.writeFileSync('terrenos_powerbi_raw.json', JSON.stringify(result, null, 2));
  
  // Try to reconstruct rows (heuristically)
  // Each row has ~7 fields: Company, City, Bairro, Area, Contact, Tel, Email
  const reconstructed = [];
  const list = result.filter(s => s.length > 1);
  
  // PowerBI rendering makes this hard, but let's try to group related items
  // Actually, the innerText of the body was pretty good.
  const bodyText = await page.innerText('body');
  fs.writeFileSync('terrenos_powerbi_text.txt', bodyText);

  console.log(`
Extracted ${result.length} unique strings.`);
  await browser.close();
})();
