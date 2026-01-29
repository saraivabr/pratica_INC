const https = require('https');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgres://postgres:356d20e7786bbbe6f375@84.247.128.56:3005/pratica?sslmode=disable'
});

// Função para normalizar telefone
function normalizePhone(phone) {
  const numbers = phone.replace(/\D/g, '');
  if (numbers.startsWith('55') && numbers.length >= 12) {
    return '+' + numbers;
  }
  const withoutZero = numbers.startsWith('0') ? numbers.slice(1) : numbers;
  return '+55' + withoutZero;
}

async function fetchCorretores() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'pratica.cvcrm.com.br',
      path: '/api/v1/cadastros/corretores',
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'email': 'orcioli@pratica-inc.com.br',
        'token': '8b39dacabbc024d28ee9a5d10d2d7762a6cd1734'
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.corretores || json.data || []);
        } catch(e) {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.end();
  });
}

async function fetchImobName(id) {
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
          const imob = json.imobiliarias || json;
          resolve(imob.nome || imob.razao_social || null);
        } catch(e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.end();
  });
}

(async () => {
  console.log('Buscando corretores do CV CRM...');
  const corretores = await fetchCorretores();
  console.log('Total de corretores:', corretores.length);

  // Criar mapa de idimobiliaria -> nome
  const imobNames = new Map();
  const uniqueImobIds = [...new Set(corretores.map(c => c.idimobiliaria).filter(Boolean))];

  console.log('Buscando nomes das', uniqueImobIds.length, 'imobiliárias...');
  for (const id of uniqueImobIds) {
    const name = await fetchImobName(id);
    if (name) {
      imobNames.set(id, name);
    }
    await new Promise(r => setTimeout(r, 50));
  }
  console.log('Nomes obtidos:', imobNames.size);

  // Buscar IDs das imobiliárias no nosso banco
  const imobDbIds = new Map();
  for (const [cvId, name] of imobNames) {
    const result = await pool.query('SELECT id FROM imobiliarias WHERE LOWER(nome) = LOWER($1)', [name]);
    if (result.rows.length > 0) {
      imobDbIds.set(cvId, result.rows[0].id);
    }
  }
  console.log('Imobiliárias encontradas no banco:', imobDbIds.size);

  // Atualizar corretores
  let updated = 0, notFound = 0;
  for (const corretor of corretores) {
    if (!corretor.telefone && !corretor.celular) continue;

    const phone = normalizePhone(corretor.telefone || corretor.celular);
    const dbImobId = imobDbIds.get(corretor.idimobiliaria);

    if (dbImobId) {
      const result = await pool.query(
        'UPDATE users SET imobiliaria_id = $1 WHERE telefone = $2 RETURNING id',
        [dbImobId, phone]
      );
      if (result.rows.length > 0) {
        updated++;
      }
    } else {
      notFound++;
    }
  }

  console.log('\n=== RESULTADO ===');
  console.log('Corretores atualizados:', updated);
  console.log('Sem imobiliária no banco:', notFound);

  await pool.end();
})();
