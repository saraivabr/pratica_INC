/**
 * Test specific CV CRM endpoint that failed
 */

const https = require('https');

const baseUrl = 'pratica.cvcrm.com.br';
const token = '8899fff8925165bcfb20d35cdc2443a80744692d';
const email = 'orcioli@pratica-inc.com.br';

// Test the endpoint that returned 405
const endpoint = '/api/v1/comercial/leads_interacoes';

console.log(`Testing: ${endpoint}\n`);

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

const req = https.request(options, (res) => {
  let data = '';

  console.log(`Status: ${res.statusCode}`);
  console.log(`Method: ${options.method}`);

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`\nResponse:`, data);
    if (res.statusCode !== 200) {
      console.log('\n❌ FAILED');
    } else {
      console.log('\n✅ SUCCESS');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
});

req.end();
