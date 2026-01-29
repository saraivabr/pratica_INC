import fs from 'fs';
import XLSX from 'xlsx';

// Read the SQL file
const sqlContent = fs.readFileSync('./supabase/migrations/full_migration/03_data.sql', 'utf-8');

// Gravura imobiliaria ID
const gravuraId = '2845a1b9-8388-41e1-81c0-77142325bd6e';

// Find all user INSERT statements for Gravura
const lines = sqlContent.split('\n');
const corretores = [];

for (const line of lines) {
  if (line.includes('INSERT INTO "users"') && line.includes(gravuraId)) {
    // Parse the VALUES
    const valuesMatch = line.match(/VALUES \((.*)\) ON CONFLICT/);
    if (valuesMatch) {
      const valuesStr = valuesMatch[1];

      // Parse the values (handling NULL, strings with quotes, etc.)
      const values = [];
      let current = '';
      let inQuote = false;
      let quoteChar = '';
      let depth = 0;

      for (let i = 0; i < valuesStr.length; i++) {
        const char = valuesStr[i];

        if (!inQuote && (char === "'" || char === '"')) {
          inQuote = true;
          quoteChar = char;
          current += char;
        } else if (inQuote && char === quoteChar && valuesStr[i-1] !== '\\') {
          // Check for escaped quotes
          if (valuesStr[i+1] === quoteChar) {
            current += char;
            i++; // Skip next quote
            current += valuesStr[i];
          } else {
            inQuote = false;
            current += char;
          }
        } else if (!inQuote && char === '{') {
          depth++;
          current += char;
        } else if (!inQuote && char === '}') {
          depth--;
          current += char;
        } else if (!inQuote && depth === 0 && char === ',') {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      if (current.trim()) {
        values.push(current.trim());
      }

      // Clean up values
      const cleanValue = (v) => {
        if (v === 'NULL') return '';
        if (v === 'TRUE') return 'Sim';
        if (v === 'FALSE') return 'Não';
        // Remove surrounding quotes
        if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
          return v.slice(1, -1).replace(/''/g, "'");
        }
        return v;
      };

      // Map to corretor object based on columns
      // Columns: id, telefone, nome, role, imobiliaria_id, gerente_id, avatar_url, is_active, onboarding_status,
      // invited_at, created_at, updated_at, last_login, cvcrm_id, cvcrm_imobiliaria_id, apelido, email, cpf, rg,
      // rg_orgao, rg_data_emissao, data_nascimento, genero, estado_civil, naturalidade, nacionalidade, qtd_filhos,
      // dependentes, tamanho_camisa, creci, creci_uf, creci_validade, categoria, nivel, time, corretor_parceiro,
      // codigo_interno, identificador, cracha, numero_pis, cep, logradouro, numero, complemento, bairro, cidade, uf,
      // formacao_academica, curso, ano_conclusao, conhecimento_office, conhecimento_email, outros_cursos, banco,
      // agencia, conta, tipo_conta, pix, observacoes, ativo_login_cvcrm, cvcrm_data, synced_at

      const corretor = {
        'ID': cleanValue(values[0]),
        'Telefone': cleanValue(values[1]),
        'Nome': cleanValue(values[2]),
        'Função': cleanValue(values[3]),
        'Ativo': cleanValue(values[7]),
        'Status Onboarding': cleanValue(values[8]),
        'Data Cadastro': cleanValue(values[10]),
        'Último Login': cleanValue(values[12]),
        'CVCRM ID': cleanValue(values[13]),
        'Apelido': cleanValue(values[15]),
        'Email': cleanValue(values[16]),
        'CPF': cleanValue(values[17]),
        'RG': cleanValue(values[18]),
        'Data Nascimento': cleanValue(values[21]),
        'Gênero': cleanValue(values[22]),
        'Estado Civil': cleanValue(values[23]),
        'CRECI': cleanValue(values[29]),
        'CRECI UF': cleanValue(values[30]),
        'Time': cleanValue(values[34]),
        'Corretor Parceiro': cleanValue(values[35]),
        'CEP': cleanValue(values[40]),
        'Logradouro': cleanValue(values[41]),
        'Número': cleanValue(values[42]),
        'Complemento': cleanValue(values[43]),
        'Bairro': cleanValue(values[44]),
        'Cidade': cleanValue(values[45]),
        'UF': cleanValue(values[46]),
        'Formação': cleanValue(values[47]),
        'Banco': cleanValue(values[53]),
        'Agência': cleanValue(values[54]),
        'Conta': cleanValue(values[55]),
        'Tipo Conta': cleanValue(values[56]),
        'PIX': cleanValue(values[57]),
      };

      corretores.push(corretor);
    }
  }
}

console.log(`Encontrados ${corretores.length} corretores da Gravura`);

// Sort by name
corretores.sort((a, b) => a.Nome.localeCompare(b.Nome, 'pt-BR'));

// Create workbook
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(corretores);

// Set column widths
const colWidths = [
  { wch: 38 }, // ID
  { wch: 18 }, // Telefone
  { wch: 45 }, // Nome
  { wch: 12 }, // Função
  { wch: 8 },  // Ativo
  { wch: 18 }, // Status Onboarding
  { wch: 24 }, // Data Cadastro
  { wch: 24 }, // Último Login
  { wch: 10 }, // CVCRM ID
  { wch: 25 }, // Apelido
  { wch: 35 }, // Email
  { wch: 15 }, // CPF
  { wch: 15 }, // RG
  { wch: 15 }, // Data Nascimento
  { wch: 12 }, // Gênero
  { wch: 15 }, // Estado Civil
  { wch: 12 }, // CRECI
  { wch: 10 }, // CRECI UF
  { wch: 20 }, // Time
  { wch: 18 }, // Corretor Parceiro
  { wch: 12 }, // CEP
  { wch: 30 }, // Logradouro
  { wch: 10 }, // Número
  { wch: 15 }, // Complemento
  { wch: 20 }, // Bairro
  { wch: 20 }, // Cidade
  { wch: 8 },  // UF
  { wch: 20 }, // Formação
  { wch: 20 }, // Banco
  { wch: 12 }, // Agência
  { wch: 15 }, // Conta
  { wch: 12 }, // Tipo Conta
  { wch: 20 }, // PIX
];
ws['!cols'] = colWidths;

XLSX.utils.book_append_sheet(wb, ws, 'Corretores Gravura');

// Write file
const outputPath = './corretores_gravura.xlsx';
XLSX.writeFile(wb, outputPath);

console.log(`Arquivo gerado: ${outputPath}`);
console.log('\nPrimeiros 5 corretores:');
corretores.slice(0, 5).forEach((c, i) => {
  console.log(`${i+1}. ${c.Nome} - ${c.Telefone} - ${c.Email || 'sem email'}`);
});
