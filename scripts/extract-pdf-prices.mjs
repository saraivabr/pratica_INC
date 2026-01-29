import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const MATERIAIS_DIR = 'public/materiais';
const OUTPUT_FILE = 'dados_empreendimentos/precos_extraidos.json';

// Regex patterns para encontrar dados
const PATTERNS = {
  // Valores em reais: R$ 123.456,78 ou R$ 123456.78
  preco: /R\$\s*[\d.,]+/gi,
  // Metragem: 45m², 45 m2, 45m2
  metragem: /(\d+(?:[.,]\d+)?)\s*m[²2]/gi,
  // Unidade/Apto: Apto 101, Unid. 101, Ap 101
  unidade: /(?:apto?|unid(?:ade)?|ap)\.?\s*(\d+[A-Z]?)/gi,
  // Andar: 1º andar, andar 1, 1° pavimento
  andar: /(\d+)[º°]?\s*(?:andar|pav(?:imento)?)/gi,
  // Quartos: 2 quartos, 2 dorms, 2q
  quartos: /(\d)\s*(?:quartos?|dorms?|q(?:uartos?)?|dormit[oó]rios?)/gi,
  // Vagas: 1 vaga, 2 vagas
  vagas: /(\d)\s*vagas?/gi,
  // Tipologia: Studio, 1 dorm, 2 dorms
  tipologia: /(?:studio|kitnet|\d\s*(?:dorm(?:it[oó]rios?)?s?|quartos?|suítes?))/gi,
};

function parsePreco(str) {
  if (!str) return null;
  // Remove R$, pontos de milhar, troca vírgula por ponto
  const clean = str.replace(/R\$\s*/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function extractDataFromText(text) {
  const data = {
    precos: [],
    metragens: [],
    unidades: [],
    tipologias: [],
    rawText: text.substring(0, 1000) // Primeiros 1000 caracteres para debug
  };

  // Extrair preços
  const precosMatch = text.match(PATTERNS.preco) || [];
  data.precos = precosMatch.map(parsePreco).filter(p => p && p > 10000); // Filtra valores muito baixos

  // Extrair metragens
  const metragensMatch = text.match(PATTERNS.metragem) || [];
  data.metragens = [...new Set(metragensMatch.map(m => {
    const num = parseFloat(m.replace(/[^\d.,]/g, '').replace(',', '.'));
    return isNaN(num) ? null : num;
  }).filter(m => m && m > 10 && m < 1000))]; // Entre 10 e 1000 m²

  // Extrair tipologias
  const tipologiasMatch = text.match(PATTERNS.tipologia) || [];
  data.tipologias = [...new Set(tipologiasMatch.map(t => t.toLowerCase()))];

  // Tentar identificar unidades individuais
  // Procurar padrões como "APTO 101 - 45m² - R$ 350.000"
  const linhas = text.split(/\n|\r/);
  const unidades = [];

  for (const linha of linhas) {
    const temPreco = linha.match(PATTERNS.preco);
    const temMetragem = linha.match(PATTERNS.metragem);

    if (temPreco && temPreco.length > 0) {
      const unidadeMatch = linha.match(/(?:apto?|unid|ap|un)\.?\s*(\d+[A-Za-z]?)/i);
      const andarMatch = linha.match(/(\d+)[º°]?\s*(?:and|pav|andar)/i);
      const quartosMatch = linha.match(/(\d)\s*(?:q|dorm|quarto|suite)/i);
      const vagasMatch = linha.match(/(\d)\s*vaga/i);

      unidades.push({
        linha: linha.trim().substring(0, 200),
        unidade: unidadeMatch ? unidadeMatch[1] : null,
        andar: andarMatch ? parseInt(andarMatch[1]) : null,
        metragem: temMetragem ? parseFloat(temMetragem[0].replace(/[^\d.,]/g, '').replace(',', '.')) : null,
        preco: parsePreco(temPreco[0]),
        quartos: quartosMatch ? parseInt(quartosMatch[1]) : null,
        vagas: vagasMatch ? parseInt(vagasMatch[1]) : null,
      });
    }
  }

  data.unidadesExtraidas = unidades.filter(u => u.preco && u.preco > 50000);

  // Calcular estatísticas
  if (data.precos.length > 0) {
    data.estatisticas = {
      precoMinimo: Math.min(...data.precos),
      precoMaximo: Math.max(...data.precos),
      precoMedio: data.precos.reduce((a, b) => a + b, 0) / data.precos.length,
      totalPrecos: data.precos.length,
    };
  }

  if (data.metragens.length > 0) {
    data.estatisticas = {
      ...data.estatisticas,
      metragensEncontradas: data.metragens,
      metragensMin: Math.min(...data.metragens),
      metragensMax: Math.max(...data.metragens),
    };
  }

  return data;
}

async function processPDF(filePath) {
  try {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDocument = await loadingTask.promise;

    let fullText = '';
    const numPages = pdfDocument.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return {
      success: true,
      text: fullText,
      numPages: numPages,
      extracted: extractDataFromText(fullText),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function main() {
  console.log('Extraindo dados dos PDFs de tabelas de preços...\n');

  const materiaisIndex = JSON.parse(fs.readFileSync(path.join(MATERIAIS_DIR, 'index.json'), 'utf-8'));
  const resultado = {};

  for (const [empId, empData] of Object.entries(materiaisIndex)) {
    console.log(`\n=== ${empData.nome} (ID: ${empId}) ===`);

    // Filtrar apenas tabelas de preços
    const tabelas = empData.materiais.filter(m => m.tipo === 'tabela');

    if (tabelas.length === 0) {
      console.log('  Nenhuma tabela de preços encontrada');
      continue;
    }

    resultado[empId] = {
      id: parseInt(empId),
      nome: empData.nome,
      tabelas: [],
    };

    for (const tabela of tabelas) {
      const pdfPath = path.join(MATERIAIS_DIR, empId, tabela.arquivo);
      console.log(`  Processando: ${tabela.arquivo}`);

      const pdfResult = await processPDF(pdfPath);

      if (pdfResult.success) {
        const extracted = pdfResult.extracted;
        console.log(`    Páginas: ${pdfResult.numPages}`);
        console.log(`    Preços encontrados: ${extracted.precos.length}`);
        console.log(`    Metragens encontradas: ${extracted.metragens.length}`);
        console.log(`    Unidades identificadas: ${extracted.unidadesExtraidas?.length || 0}`);

        if (extracted.estatisticas) {
          console.log(`    Preço mínimo: R$ ${extracted.estatisticas.precoMinimo?.toLocaleString('pt-BR')}`);
          console.log(`    Preço máximo: R$ ${extracted.estatisticas.precoMaximo?.toLocaleString('pt-BR')}`);
        }

        resultado[empId].tabelas.push({
          arquivo: tabela.arquivo,
          dataAtualizacao: tabela.dataAtualizacao,
          numPages: pdfResult.numPages,
          dados: {
            precos: extracted.precos.slice(0, 50), // Limitar para não ficar muito grande
            metragens: extracted.metragens,
            tipologias: extracted.tipologias,
            estatisticas: extracted.estatisticas,
            unidadesExtraidas: extracted.unidadesExtraidas?.slice(0, 20), // Limitar
          },
        });
      } else {
        console.log(`    ERRO: ${pdfResult.error}`);
        resultado[empId].tabelas.push({
          arquivo: tabela.arquivo,
          erro: pdfResult.error,
        });
      }
    }
  }

  // Salvar resultado
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(resultado, null, 2));
  console.log(`\n\n[OK] Dados extraídos salvos em: ${OUTPUT_FILE}`);

  // Resumo
  console.log('\n=== RESUMO ===');
  let totalEmpreendimentos = 0;
  let totalUnidades = 0;

  for (const [empId, empData] of Object.entries(resultado)) {
    totalEmpreendimentos++;
    for (const tabela of empData.tabelas) {
      if (tabela.dados?.unidadesExtraidas) {
        totalUnidades += tabela.dados.unidadesExtraidas.length;
      }
    }
  }

  console.log(`Empreendimentos processados: ${totalEmpreendimentos}`);
  console.log(`Unidades identificadas: ${totalUnidades}`);
}

main().catch(console.error);
