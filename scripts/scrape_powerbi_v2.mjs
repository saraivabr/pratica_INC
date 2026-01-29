import { chromium } from 'playwright';
import fs from 'fs';

const POWERBI_URL = 'https://app.powerbi.com/view?r=eyJrIjoiNDQ2MDg5ZmYtYzEyNi00NzA4LTk2MGEtNWQxNjdkZWJjMDg3IiwidCI6ImExYmI2ZTU4LTVhMTUtNDMzOS04ZmYyLTk0Y2Q0ZmVhZmEyOSJ9';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Opening PowerBI...');
  await page.goto(POWERBI_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(10000);

  const finalData = new Map();

  console.log('Starting incremental extraction...');

  // Helper to extract visible data
  const extractVisible = async () => {
      return await page.evaluate(() => {
          const rows = [];
          // In PowerBI tables, rows are often divs with role="row" or specific classes
          // Let's look for the text structure we saw earlier
          const container = document.querySelector('.pbi-root'); // broad container
          const allText = document.body.innerText;
          const lines = allText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
          
          const parsed = [];
          // Strategy: Find blocks of 7 lines that look like:
          // Company, City, Neighborhood, Area, Contact, Phone, Email
          for (let i = 0; i < lines.length; i++) {
              // Heuristic: If line contains '@' and previous line looks like phone, we found an end
              if (lines[i].includes('@') && lines[i-1] && (lines[i-1].includes('(') || /["\d-]{8,}/.test(lines[i-1]))) {
                  const row = {
                      email: lines[i],
                      phone: lines[i-1],
                      contact: lines[i-2],
                      area: lines[i-3],
                      neighborhood: lines[i-4],
                      city: lines[i-5],
                      company: lines[i-6]
                  };
                  // Basic validation
                  if (row.company && row.city && row.area) {
                      parsed.push(row);
                  }
              }
          }
          return parsed;
      });
  };

  for (let i = 0; i < 50; i++) { // 50 scrolls
      const visible = await extractVisible();
      visible.forEach(row => {
          const key = `${row.company}|${row.neighborhood}|${row.area}`;
          finalData.set(key, row);
      });

      // Scroll down
      // PowerBI scrolling is often handled by a specific div or just the body
      await page.mouse.wheel(0, 400); 
      await page.waitForTimeout(1500);
      process.stdout.write(`\rFound ${finalData.size} rows...`);
  }

  const result = Array.from(finalData.values());
  fs.writeFileSync('terrenos_interesse_final.json', JSON.stringify(result, null, 2));
  
  console.log(`\nDone. Extracted ${result.size} unique rows.`);
  await browser.close();
})();
