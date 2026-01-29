import { chromium } from 'playwright';
import fs from 'fs';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  const outputFile = 'corretores_completo.json';
  let allBrokers = [];
  if (fs.existsSync(outputFile)) {
      try {
          allBrokers = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      } catch(e) {}
  }
  const processedUrls = new Set(allBrokers.map(b => b.url));

  console.log('Logging in...');
  await page.goto('https://www.orulo.com.br/customers/sign_in');
  const emailBtn = await page.$('a[href*="/email"]');
  if (emailBtn) { await emailBtn.click(); await page.waitForTimeout(1000); }
  await page.fill('#email', auth.email);
  await page.fill('#password', auth.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(url => url.toString().includes('dashboard'), { timeout: 60000 });

  console.log('Login success.');

  for (let p = 1; p <= 26; p++) {
    console.log(`
--- Page ${p} ---`);
    await page.goto(`https://www.orulo.com.br/dashboard/brokers?page=${p}`, { waitUntil: 'networkidle' });
    
    try {
        await page.waitForSelector('table', { timeout: 15000 });
    } catch(e) {
        console.log('Table not found on page ' + p);
        const htmlSnippet = await page.evaluate(() => document.body.innerHTML.substring(0, 1000));
        console.log('HTML Snippet:', htmlSnippet);
    }

    const links = await page.evaluate(() => {
      const allLinks = Array.from(document.links);
      console.log('Total document links:', allLinks.length);
      return allLinks
        .filter(l => l.href.includes('/dashboard/brokers/') && /\d+$/.test(l.href))
        .map(l => l.href)
        .filter((v, i, a) => a.indexOf(v) === i);
    });
    const firstBroker = await page.evaluate(() => {
        const first = document.querySelector('table tbody tr td:first-child');
        return first ? first.innerText.trim() : 'N/A';
    });
    console.log(`Page ${p} first broker: ${firstBroker}`);

    for (const link of links) {
      if (processedUrls.has(link)) {
          process.stdout.write('s'); // skip
          continue;
      }

      const bPage = await context.newPage();
      try {
        await bPage.goto(link, { waitUntil: 'networkidle', timeout: 45000 });
        const data = await bPage.evaluate(() => {
          const res = { nome: document.querySelector('h1')?.innerText?.trim(), url: window.location.href };
          const body = document.body.innerText;
          const h3s = Array.from(document.querySelectorAll('h3'));
          
          const dH = h3s.find(h => h.innerText.includes('Dados do corretor'));
          if (dH) {
             let txt = ""; let n = dH.nextElementSibling;
             while(n && n.tagName !== 'H3') { txt += n.innerText + "\n"; n = n.nextElementSibling; }
             const c = txt.match(/CRECI:\s*([\w\d]+)/i); if(c) res.creci = c[1];
             const t = txt.match(/Telefone:\s*(\(\.*\)\s*[\d-]+)/); if(t) res.telefone = t[1];
             const e = txt.match(/E-mail:\s*([^\s]+@[^\s]+)/); if(e) res.email = e[1];
          }
          
          const iH = h3s.find(h => h.innerText.includes('Interesse nos Concorrentes'));
          if (iH) {
              res.interesseConcorrentes = [];
              let n = iH.nextElementSibling;
              let count = 0;
              while(n && count < 40) {
                  if (n.innerText.includes('Últimas atividades') || n.innerText.includes('Fale com a gente')) break;
                  if (n.tagName === 'H3' && !n.innerText.includes('atividades')) {
                      res.interesseConcorrentes.push(n.innerText.trim());
                  }
                  n = n.nextElementSibling;
                  count++;
              }
          }
          
          if (body.includes('Últimas atividades nos seus empreendimentos')) {
              const pts = body.split('Últimas atividades nos seus empreendimentos');
              if (pts[1]) {
                  res.atividades = pts[1].split('Fale com a gente')[0].split('\n')
                    .map(s=>s.trim()).filter(s=>s.length > 5 && !s.includes('Filtrar') && !s.includes('Carregar mais'));
              }
          }
          return res;
        });
        
        allBrokers.push(data);
        processedUrls.add(link);
        process.stdout.write('.');
        
        // Save every 5 brokers
        if (allBrokers.length % 5 === 0) {
            fs.writeFileSync(outputFile, JSON.stringify(allBrokers, null, 2));
        }
      } catch (e) {
          process.stdout.write('x');
          console.log(`Error ${link}: ${e.message}`);
      } finally {
          await bPage.close();
      }
    }
    fs.writeFileSync(outputFile, JSON.stringify(allBrokers, null, 2));
  }

  console.log('\nFinished extraction.');
  await browser.close();
})();