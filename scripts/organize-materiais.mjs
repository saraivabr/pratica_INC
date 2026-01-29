import fs from 'fs';
import path from 'path';

const DOWNLOADS_DIR = 'downloads';
const PUBLIC_MATERIAIS_DIR = 'public/materiais';

// Mapeamento de nomes das pastas -> IDs dos empreendimentos
const buildingsMap = {
  'Alta_Floresta___Breve_Lan_amento': { id: 69734, nome: 'Alta Floresta - Breve Lançamento' },
  'Aura': { id: 45784, nome: 'Aura' },
  'Ess_ncia_da_Vila___NR': { id: 37455, nome: 'Essência da Vila - NR' },
  'Ess_ncia_da_Vila___Residencial': { id: 37454, nome: 'Essência da Vila - Residencial' },
  'Giardino_Verticale': { id: 45783, nome: 'Giardino Verticale' },
  'Mirante_da_Vila': { id: 34789, nome: 'Mirante da Vila' },
  'Moment_Metr__Concei__o': { id: 34790, nome: 'Moment Metrô Conceição' },
  'Station_Garden___NR': { id: 34718, nome: 'Station Garden - NR' },
  'Station_Garden___Residencial': { id: 34717, nome: 'Station Garden - Residencial' },
  'Station_Park_Vila_Ema___NR': { id: 29565, nome: 'Station Park Vila Ema - NR' },
  'Station_Park_Vila_Ema___Residencial': { id: 29287, nome: 'Station Park Vila Ema - Residencial' },
  'Station_Park_Vila_Ema___Studios': { id: 29566, nome: 'Station Park Vila Ema - Studios' },
};

// Função para normalizar nome do arquivo
function normalizeFileName(fileName) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

// Função para determinar o tipo de material
function getMaterialType(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.includes('tabela')) return 'tabela';
  if (lower.includes('ficha')) return 'ficha_tecnica';
  if (lower.includes('book')) return 'book';
  if (lower.includes('apresenta')) return 'apresentacao';
  return 'outro';
}

// Função para obter nome amigável do tipo
function getMaterialTypeName(type) {
  const names = {
    'tabela': 'Tabela de Preços',
    'ficha_tecnica': 'Ficha Técnica',
    'book': 'Book do Empreendimento',
    'apresentacao': 'Apresentação',
    'outro': 'Outro Material'
  };
  return names[type] || 'Material';
}

async function main() {
  console.log('Organizando materiais...\n');

  // Criar pasta de destino se não existir
  if (!fs.existsSync(PUBLIC_MATERIAIS_DIR)) {
    fs.mkdirSync(PUBLIC_MATERIAIS_DIR, { recursive: true });
  }

  const materiaisMap = {};

  // Processar cada pasta de downloads
  const folders = fs.readdirSync(DOWNLOADS_DIR).filter(f => {
    const fullPath = path.join(DOWNLOADS_DIR, f);
    return fs.statSync(fullPath).isDirectory() && !f.startsWith('.');
  });

  for (const folder of folders) {
    const building = buildingsMap[folder];
    if (!building) {
      console.log(`[WARN] Pasta não mapeada: ${folder}`);
      continue;
    }

    const { id, nome } = building;
    const sourcePath = path.join(DOWNLOADS_DIR, folder);
    const destPath = path.join(PUBLIC_MATERIAIS_DIR, String(id));

    // Criar pasta de destino
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }

    // Inicializar mapeamento
    materiaisMap[id] = {
      id,
      nome,
      materiais: []
    };

    // Processar arquivos
    const files = fs.readdirSync(sourcePath).filter(f => f.endsWith('.pdf'));

    for (const file of files) {
      const sourceFile = path.join(sourcePath, file);
      const normalizedName = normalizeFileName(file);
      const destFile = path.join(destPath, normalizedName);
      const materialType = getMaterialType(file);

      // Copiar arquivo
      fs.copyFileSync(sourceFile, destFile);
      console.log(`  [OK] ${nome}: ${file} -> ${normalizedName}`);

      // Adicionar ao mapeamento
      materiaisMap[id].materiais.push({
        tipo: materialType,
        tipoNome: getMaterialTypeName(materialType),
        nomeOriginal: file,
        arquivo: normalizedName,
        url: `/materiais/${id}/${normalizedName}`,
        tamanho: fs.statSync(sourceFile).size,
        dataAtualizacao: new Date().toISOString().split('T')[0]
      });
    }

    console.log(`[OK] ${nome}: ${files.length} arquivo(s) copiado(s)\n`);
  }

  // Salvar mapeamento JSON
  const outputPath = path.join(PUBLIC_MATERIAIS_DIR, 'index.json');
  fs.writeFileSync(outputPath, JSON.stringify(materiaisMap, null, 2));
  console.log(`\n[OK] Mapeamento salvo em: ${outputPath}`);

  // Também salvar na pasta dados_empreendimentos
  const dataOutputPath = 'dados_empreendimentos/materiais_map.json';
  fs.writeFileSync(dataOutputPath, JSON.stringify(materiaisMap, null, 2));
  console.log(`[OK] Mapeamento salvo em: ${dataOutputPath}`);

  // Estatísticas
  const totalEmpreendimentos = Object.keys(materiaisMap).length;
  const totalMateriais = Object.values(materiaisMap).reduce((sum, e) => sum + e.materiais.length, 0);
  console.log(`\n=== Resumo ===`);
  console.log(`Empreendimentos processados: ${totalEmpreendimentos}`);
  console.log(`Total de materiais: ${totalMateriais}`);
}

main().catch(console.error);
