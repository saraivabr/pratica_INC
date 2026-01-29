import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('scrape orulo dashboard', async ({ page }) => {
  test.setTimeout(120000); // Increase global test timeout

  console.log('Navigating to dashboard...');
  try {
    await page.goto('https://www.orulo.com.br/dashboard/brokers', { timeout: 60000 });
  } catch (e) {
    console.log('Navigation error (might be redirect):', e.message);
  }

  // 2. Handle Login Flow
  if (page.url().includes('auth.orulo.com.br') || page.url().includes('sign_in') || page.url().includes('email')) {
    console.log('On auth page: ' + page.url());
    
    // Check if we need to select email option
    const emailLink = await page.$('a[href^="/email"]');
    if (emailLink) {
        console.log('Clicking "Continuar com e-mail"...');
        await emailLink.click();
        await page.waitForURL(/email/, { timeout: 30000 });
    }

    console.log('Filling credentials...');
    await page.fill('#email', 'fe@saraiva.ai');
    await page.fill('#password', 'Sucesso2025$');
    await page.click('button[type="submit"]');
    
    console.log('Submitted login form. Waiting...');
    
    // Wait a bit to see what happens
    await page.waitForTimeout(5000); 
    console.log('After 5s, URL is: ' + page.url());

    // Check for error messages
    const content = await page.content();
    if (content.includes('Email ou senha inválidos') || content.includes('Captcha')) {
        console.log('Login failed with error message on page.');
        fs.writeFileSync('login_failure.html', content);
    }

    try {
        await page.waitForURL('**/dashboard/**', { timeout: 30000, waitUntil: 'domcontentloaded' });
    } catch(e) {
        console.log('Timed out waiting for dashboard. Current URL:', page.url());
        const finalHtml = await page.content();
        fs.writeFileSync('timeout_page.html', finalHtml);
    }
  }

  console.log('Current URL: ' + page.url());

  // 3. Scrape
  if (page.url().includes('dashboard')) {
      console.log('On dashboard. scraping...');
      await page.waitForLoadState('networkidle');
      const html = await page.content();
      const text = await page.innerText('body');
      fs.writeFileSync('orulo_dashboard.html', html);
      fs.writeFileSync('orulo_dashboard.txt', text);
      console.log('Saved dashboard content.');
  } else {
      console.log('Not on dashboard. Aborting scrape.');
  }
});