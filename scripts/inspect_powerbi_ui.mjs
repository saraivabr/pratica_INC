import { chromium } from 'playwright';

const POWERBI_URL = 'https://app.powerbi.com/view?r=eyJrIjoiNDQ2MDg5ZmYtYzEyNi00NzA4LTk2MGEtNWQxNjdkZWJjMDg3IiwidCI6ImExYmI2ZTU4LTVhMTUtNDMzOS04ZmYyLTk0Y2Q0ZmVhZmEyOSJ9';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Opening PowerBI...');
  await page.goto(POWERBI_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(10000);

  // Take screenshot to see UI
  await page.screenshot({ path: 'powerbi_ui.png' });

  // Look for any interactive elements that might trigger scroll or export
  const elements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, .visual-container, .scroll-bar'))
        .map(el => ({
            tag: el.tagName,
            text: el.innerText.trim(),
            className: el.className
        }));
  });
  console.log('UI Elements:', elements);

  await browser.close();
})();
