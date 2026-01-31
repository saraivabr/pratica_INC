/**
 * Simple test script to check CV CRM API connection
 */

const https = require('https');

const baseUrl = 'pratica.cvcrm.com.br';
const token = process.env.CVCRM_TOKEN_LEAD || '';
const email = process.env.CVCRM_EMAIL || '';
const endpoint = '/api/v1/comercial/leads';

console.log('🚀 Testing CV CRM API Connection\n');
console.log('=' .repeat(60));
console.log(`Base URL: https://${baseUrl}`);
console.log(`Endpoint: ${endpoint}`);
console.log(`Email: ${email}`);
console.log(`Token: ${token.substring(0, 10)}...`);
console.log('=' .repeat(60) + '\n');

const options = {
  hostname: baseUrl,
  path: `${endpoint}?limit=5&offset=0`,
  method: 'GET',
  headers: {
    'accept': 'application/json',
    'email': email,
    'token': token
  }
};

console.log('📡 Making request...\n');

const req = https.request(options, (res) => {
  let data = '';

  console.log(`Status Code: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  console.log('\n' + '=' .repeat(60) + '\n');

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ Response received successfully!\n');

      console.log('📦 Full Response:');
      console.log(JSON.stringify(json, null, 2));
      console.log('\n');

      console.log(`Total leads: ${json.data ? json.data.length : 0}`);

      if (json.data && json.data.length > 0) {
        console.log('\n📊 First lead sample:');
        console.log(JSON.stringify(json.data[0], null, 2));
      }

      if (json.pagination) {
        console.log('\n📄 Pagination info:');
        console.log(JSON.stringify(json.pagination, null, 2));
      }

      console.log('\n' + '=' .repeat(60));
      console.log('✅ API connection test PASSED!');
      console.log('=' .repeat(60) + '\n');

    } catch (e) {
      console.error('❌ Failed to parse JSON response:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  process.exit(1);
});

req.end();
