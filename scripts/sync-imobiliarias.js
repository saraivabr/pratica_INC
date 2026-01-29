const https = require('https');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:356d20e7786bbbe6f375@84.247.128.56:3005/pratica?sslmode=disable'
});

const imobIds = [2,135,3,192,10,8,18,14,253,15,16,13,20,21,22,23,24,9,26,34,31,35,28,40,41,42,43,82,49,50,11,51,53,60,225,33,244,68,12,344,73,74,71,75,77,78,80,83,61,104,93,110,119,262,351,130,131,132,65,251,134,136,137,141,142,145,64];

async function fetchImob(id) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'pratica.cvcrm.com.br',
      path: '/api/v1/cadastros/imobiliarias/' + id,
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'email': 'orcioli@pratica-inc.com.br',
        'token': '88d84a98da6aea7d066967b19b2ecfd72f0619fa'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.imobiliarias || json);
        } catch(e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

async function insertImob(imob) {
  const nome = imob.nome || imob.razao_social;
  if (!nome) return null;

  // Check if exists
  const existing = await pool.query('SELECT id FROM imobiliarias WHERE LOWER(nome) = LOWER($1)', [nome]);
  if (existing.rows.length > 0) {
    return { updated: true, nome };
  }

  // Insert
  await pool.query(
    'INSERT INTO imobiliarias (nome, cnpj, telefone, email) VALUES ($1, $2, $3, $4)',
    [nome, imob.cnpj || null, imob.telefone || imob.celular || null, imob.email || null]
  );
  return { created: true, nome };
}

(async () => {
  let created = 0, updated = 0, errors = 0;

  for (const id of imobIds) {
    const imob = await fetchImob(id);
    if (imob && imob.nome) {
      try {
        const result = await insertImob(imob);
        if (result.created) {
          created++;
          console.log('Criada:', result.nome);
        } else {
          updated++;
        }
      } catch(e) {
        errors++;
        console.error('Erro:', imob.nome, e.message);
      }
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 100));
  }

  console.log('\n=== RESULTADO ===');
  console.log('Criadas:', created);
  console.log('Já existiam:', updated);
  console.log('Erros:', errors);

  await pool.end();
})();
