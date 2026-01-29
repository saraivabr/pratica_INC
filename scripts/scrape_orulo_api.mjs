import { chromium } from 'playwright';
import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

const auth = {
  email: 'fe@saraiva.ai',
  password: '$Sucesso2025$'
};

const BASE_URL = 'https://www.orulo.com.br';

(async () => {
  console.log('--- Step 1: Authentication via Playwright ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    await page.goto(`${BASE_URL}/customers/sign_in`);
    const emailBtn = await page.$('a[href*="/email"]');
    if (emailBtn) {
        await emailBtn.click();
        await page.waitForTimeout(1000);
    }
    await page.fill('#email', auth.email);
    await page.fill('#password', auth.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => url.toString().includes('dashboard'), { timeout: 45000 });
    console.log('Login successful.');
  } catch (e) {
    console.error('Login failed:', e.message);
    await browser.close();
    return;
  }

  // Get Cookies
  const cookies = await context.cookies();
  const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  await browser.close();

  console.log('--- Step 2: High-Speed Extraction via HTTP/HTML parsing ---');
  
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    }
  });

  const allBrokers = [];
  const MAX_PAGES = 26;

  for (let p = 1; p <= MAX_PAGES; p++) {
    console.log(`Fetching Page ${p}...`);
    try {
      const { data: listHtml } = await client.get(`/dashboard/brokers?page=${p}`);
      
      // Debug: Check if we are being served the real page or a JS redirect/protection
      if (listHtml.includes('CookieBanner') || listHtml.length < 5000) {
          console.log(`  [Warning] Page ${p} content suspicious (len=${listHtml.length}). Saving debug snippet.`);
          fs.writeFileSync(`debug_page_${p}.html`, listHtml);
      }

      const $ = cheerio.load(listHtml);
      
      const brokerLinks = [];
      $('a[href^="/dashboard/brokers/"]').each((i, el) => {
        const href = $(el).attr('href');
        // Avoid extracting non-profile links if any, regex for ID at end
        if (/\/\d+$/.test(href)) {
            brokerLinks.push(href);
        }
      });
      
      // Deduplicate
      const uniqueLinks = [...new Set(brokerLinks)];
      console.log(`  Found ${uniqueLinks.length} brokers.`);

      // Parallel fetch details (chunked to avoid rate limits)
      const chunkSize = 5;
      for (let i = 0; i < uniqueLinks.length; i += chunkSize) {
        const chunk = uniqueLinks.slice(i, i + chunkSize);
        const promises = chunk.map(async (link) => {
            try {
                const { data: detailHtml } = await client.get(link);
                const $$ = cheerio.load(detailHtml);
                
                const nome = $$('h1').first().text().trim();
                const dadosBlock = $$('h3:contains("Dados do corretor")').parent(); // usually content is siblings
                
                // Parsing strategy: look for text nodes or specific markers
                const bodyText = $$('body').text();
                
                // Extract using Regex on the full text or specific sections for robustness
                const creci = (bodyText.match(/CRECI:\s*([\w\d]+)/i) || [])[1] || 'N/A';
                const telefone = (bodyText.match(/Telefone:\s*(\(\.*\)\s*\d+-*)/) || [])[1] || 'N/A';
                
                // Email is often hidden or in a mailto
                let email = 'N/A';
                const mailto = $$('a[href^="mailto:"]').first().attr('href');
                if (mailto) email = mailto.replace('mailto:', '');
                else {
                    const emailMatch = bodyText.match(/E-mail:\s*([^\s]+@[^\s]+)/);
                    if (emailMatch) email = emailMatch[1];
                }

                // Interests
                const interesses = [];
                const intHeader = $$('h3:contains("Interesse nos Concorrentes")');
                if (intHeader.length) {
                    let curr = intHeader.next();
                    if (curr.text().includes('últimos 90 dias')) curr = curr.next();
                    // Iterate siblings until next header or sentinel
                    let safety = 0;
                    while(curr.length && safety < 20) {
                        const t = curr.text().trim();
                        if (t && (curr.is('h3') || curr.is('div'))) { // Assuming interests are in H3/divs based on prior logs
                             if (t.includes('Últimas atividades') || t.includes('Fale com a gente')) break;
                             // Heuristic: Interest usually has a number or project name
                             if (t.length > 3) interesses.push(t);
                        }
                        curr = curr.next();
                        safety++;
                    }
                }

                // Activities
                const atividades = [];
                if (bodyText.includes('Últimas atividades nos seus empreendimentos')) {
                    const part = bodyText.split('Últimas atividades nos seus empreendimentos')[1].split('Fale com a gente')[0];
                    part.split('\n').forEach(line => {
                        const l = line.trim();
                        if (l.length > 10 && !l.includes('Filtrar') && !l.includes('Carregar mais')) {
                            atividades.push(l);
                        }
                    });
                }

                return {
                    id: link.split('/').pop(),
                    url: `${BASE_URL}${link}`,
                    nome,
                    creci,
                    telefone,
                    email,
                    interesses,
                    atividades
                };
            } catch (err) {
                console.error(`  Error fetching ${link}: ${err.message}`);
                return null;
            }
        });

        const results = await Promise.all(promises);
        allBrokers.push(...results.filter(r => r !== null));
        process.stdout.write('.');
      }
      process.stdout.write('\n');
      
      // Save partial
      fs.writeFileSync('corretores_api_parcial.json', JSON.stringify(allBrokers, null, 2));

    } catch (err) {
        console.error(`Error on page ${p}: ${err.message}`);
    }
  }

  fs.writeFileSync('corretores_api_completo.json', JSON.stringify(allBrokers, null, 2));
  console.log(`\nDONE. Extracted ${allBrokers.length} brokers.`);
})();
