import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface Corretor {
  id: string;
  nome: string;
  whatsapp: string;
  codigo: string;
  ativo: boolean;
}

interface CorretoresData {
  corretores: Corretor[];
}

interface Empreendimento {
  id: string;
  nome: string;
  status: string;
  localizacao?: {
    endereco?: string;
    bairro?: string;
    zona?: string;
    proximidade_metro?: string;
  };
  entrega_prevista?: string;
  entrega?: string;
  imagemCapa?: string;
  galeria?: string[];
  tipologias?: any[];
  lazer?: string[];
  diferenciais?: string[];
  configuracao?: any;
  preco_m2?: string;
  financiamento?: string[];
}

interface EmpreendimentosData {
  empreendimentos: {
    em_construcao: Empreendimento[];
    em_lancamento: Empreendimento[];
    entregues: Empreendimento[];
  };
}

interface UnidadeStationPark {
  id: string;
  unidade: string;
  area: number;
  dormitorios: number;
  tipologia: string;
  status: string;
  valorTotal: number;
  plano: {
    ato: { valor: number; vencimento: string };
    mensais: { quantidade: number; valor: number; primeiroVencimento: string };
    financiamento: { valor: number; vencimento: string };
  };
}

async function main() {
  console.log("Iniciando seed do banco de dados...\n");

  // ============================================
  // 1. INSERIR CORRETORES
  // ============================================
  console.log("1. Inserindo corretores...");

  const corretoresPath = path.join(__dirname, "../src/data/corretores.json");
  const corretoresData: CorretoresData = JSON.parse(
    fs.readFileSync(corretoresPath, "utf-8")
  );

  for (const corretor of corretoresData.corretores) {
    await prisma.corretor.upsert({
      where: { whatsapp: corretor.whatsapp },
      update: {
        nome: corretor.nome,
        codigo: corretor.codigo,
        ativo: corretor.ativo,
      },
      create: {
        nome: corretor.nome,
        whatsapp: corretor.whatsapp,
        codigo: corretor.codigo,
        ativo: corretor.ativo,
      },
    });
    console.log(`   - Corretor inserido: ${corretor.nome}`);
  }

  console.log(`   Total: ${corretoresData.corretores.length} corretores\n`);

  // ============================================
  // 2. INSERIR EMPREENDIMENTOS
  // ============================================
  console.log("2. Inserindo empreendimentos...");

  const empreendimentosPath = path.join(
    __dirname,
    "../src/data/pratica_database.json"
  );
  const empreendimentosData: EmpreendimentosData = JSON.parse(
    fs.readFileSync(empreendimentosPath, "utf-8")
  );

  const todosEmpreendimentos: Empreendimento[] = [
    ...empreendimentosData.empreendimentos.em_construcao,
    ...empreendimentosData.empreendimentos.em_lancamento,
    ...empreendimentosData.empreendimentos.entregues,
  ];

  for (const emp of todosEmpreendimentos) {
    // Normalizar status
    let status = emp.status;
    if (status === "lancamento") status = "em_lancamento";
    if (status === "entregue") status = "entregue";

    // Criar objeto com todos os dados extras
    const dadosJson = {
      tipologias: emp.tipologias,
      lazer: emp.lazer,
      diferenciais: emp.diferenciais,
      galeria: emp.galeria,
      configuracao: emp.configuracao,
      preco_m2: emp.preco_m2,
      financiamento: emp.financiamento,
      localizacao: emp.localizacao,
    };

    await prisma.empreendimento.upsert({
      where: { id: emp.id },
      update: {
        nome: emp.nome,
        status: status,
        bairro: emp.localizacao?.bairro || null,
        zona: emp.localizacao?.zona || "Leste",
        entregaPrevista: emp.entrega_prevista
          ? new Date(emp.entrega_prevista)
          : emp.entrega
            ? new Date(emp.entrega)
            : null,
        imagemCapa: emp.imagemCapa || null,
        dadosJson: dadosJson,
      },
      create: {
        id: emp.id,
        nome: emp.nome,
        status: status,
        bairro: emp.localizacao?.bairro || null,
        zona: emp.localizacao?.zona || "Leste",
        entregaPrevista: emp.entrega_prevista
          ? new Date(emp.entrega_prevista)
          : emp.entrega
            ? new Date(emp.entrega)
            : null,
        imagemCapa: emp.imagemCapa || null,
        dadosJson: dadosJson,
      },
    });
    console.log(`   - Empreendimento inserido: ${emp.nome}`);
  }

  console.log(`   Total: ${todosEmpreendimentos.length} empreendimentos\n`);

  // ============================================
  // 3. INSERIR UNIDADES DO STATION PARK
  // ============================================
  console.log("3. Inserindo unidades do Station Park...");

  // Ler o arquivo station-park.ts e extrair os dados
  const stationParkPath = path.join(__dirname, "../src/data/station-park.ts");
  const stationParkContent = fs.readFileSync(stationParkPath, "utf-8");

  // Extrair o array usando regex
  const match = stationParkContent.match(
    /export const stationParkUnidades[^=]*=\s*\[([\s\S]*?)\n\]/
  );

  if (!match) {
    console.log("   AVISO: Nao foi possivel extrair unidades do station-park.ts");
    console.log("   Pulando insercao de unidades...\n");
  } else {
    // Parse manual dos dados
    const unidades: UnidadeStationPark[] = [
      { id: "SP407", unidade: "407", area: 40.26, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 373120.83, plano: { ato: { valor: 37312.09, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 24874.72, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 261184.58, vencimento: "2025-10-25" } } },
      { id: "SP408", unidade: "408", area: 58.62, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 575533.78, plano: { ato: { valor: 57553.37, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 38368.92, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 402873.65, vencimento: "2025-10-25" } } },
      { id: "SP902", unidade: "902", area: 60.34, dormitorios: 3, tipologia: "3 Dormitórios", status: "disponivel", valorTotal: 649687.55, plano: { ato: { valor: 64968.76, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 43312.50, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 454781.29, vencimento: "2025-10-25" } } },
      { id: "SP1002", unidade: "1002", area: 60.34, dormitorios: 3, tipologia: "3 Dormitórios", status: "disponivel", valorTotal: 668806.13, plano: { ato: { valor: 66880.60, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 44587.08, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 468164.29, vencimento: "2025-10-25" } } },
      { id: "SP1004", unidade: "1004", area: 47.84, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 495281.04, plano: { ato: { valor: 49528.09, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 33018.74, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 346696.73, vencimento: "2025-10-25" } } },
      { id: "SP1101", unidade: "1101", area: 49, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 553861.88, plano: { ato: { valor: 55386.17, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 36924.13, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 387703.32, vencimento: "2025-10-25" } } },
      { id: "SP1102", unidade: "1102", area: 60.34, dormitorios: 3, tipologia: "3 Dormitórios", status: "disponivel", valorTotal: 681519.80, plano: { ato: { valor: 68151.99, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 45434.65, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 477063.86, vencimento: "2025-10-25" } } },
      { id: "SP1201", unidade: "1201", area: 49, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 555594.99, plano: { ato: { valor: 55559.49, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 37039.67, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 388916.49, vencimento: "2025-10-25" } } },
      { id: "SP1301", unidade: "1301", area: 49, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 559639.08, plano: { ato: { valor: 55963.91, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 37309.27, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 391747.36, vencimento: "2025-10-25" } } },
      { id: "SP1404", unidade: "1404", area: 47.84, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 495281.04, plano: { ato: { valor: 49528.09, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 33018.74, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 346696.73, vencimento: "2025-10-25" } } },
      { id: "SP1501", unidade: "1501", area: 49, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 565556.28, plano: { ato: { valor: 56555.63, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 37703.75, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 395889.40, vencimento: "2025-10-25" } } },
      { id: "SP1502", unidade: "1502", area: 60.34, dormitorios: 3, tipologia: "3 Dormitórios", status: "disponivel", valorTotal: 695872.67, plano: { ato: { valor: 69587.27, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 46391.51, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 487110.87, vencimento: "2025-10-25" } } },
      { id: "SP1602", unidade: "1602", area: 60.34, dormitorios: 3, tipologia: "3 Dormitórios", status: "disponivel", valorTotal: 699547.98, plano: { ato: { valor: 69954.80, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 46636.53, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 489683.59, vencimento: "2025-10-25" } } },
      { id: "SP1605", unidade: "1605", area: 34.54, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 357587.93, plano: { ato: { valor: 35758.78, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 23839.20, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 250311.55, vencimento: "2025-10-25" } } },
      { id: "SP1607", unidade: "1607", area: 34.54, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 357587.93, plano: { ato: { valor: 35758.78, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 23839.20, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 250311.55, vencimento: "2025-10-25" } } },
      { id: "SP1705", unidade: "1705", area: 34.54, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 357587.93, plano: { ato: { valor: 35758.78, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 23839.20, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 250311.55, vencimento: "2025-10-25" } } },
      { id: "SP1707", unidade: "1707", area: 34.54, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 357587.93, plano: { ato: { valor: 35758.78, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 23839.20, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 250311.55, vencimento: "2025-10-25" } } },
      { id: "SP1804", unidade: "1804", area: 47.84, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 495281.04, plano: { ato: { valor: 49528.09, vencimento: "2025-02-25" }, mensais: { quantidade: 3, valor: 33018.74, primeiroVencimento: "2025-03-25" }, financiamento: { valor: 346696.73, vencimento: "2025-10-25" } } },
    ];

    for (const unidade of unidades) {
      await prisma.unidade.upsert({
        where: { id: unidade.id },
        update: {
          empreendimentoId: "station-park",
          numero: unidade.unidade,
          areaM2: unidade.area,
          dormitorios: unidade.dormitorios,
          tipologia: unidade.tipologia,
          status: unidade.status,
          valorTotal: unidade.valorTotal,
          planoJson: unidade.plano,
        },
        create: {
          id: unidade.id,
          empreendimentoId: "station-park",
          numero: unidade.unidade,
          areaM2: unidade.area,
          dormitorios: unidade.dormitorios,
          tipologia: unidade.tipologia,
          status: unidade.status,
          valorTotal: unidade.valorTotal,
          planoJson: unidade.plano,
        },
      });
      console.log(`   - Unidade: ${unidade.unidade} - R$ ${unidade.valorTotal.toLocaleString("pt-BR")}`);
    }

    console.log(`   Total: ${unidades.length} unidades\n`);
  }

  console.log("========================================");
  console.log("Seed concluido com sucesso!");
  console.log("========================================");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Erro durante o seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
