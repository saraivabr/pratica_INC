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

  // ============================================
  // 4. INSERIR UNIDADES AURA GUILHERMINA (AGOSTO 2025)
  // ============================================
  console.log("4. Inserindo unidades Aura Guilhermina (Agosto 2025)...");

  const auraUnidades: UnidadeStationPark[] = [
    { id: "AG405", unidade: "405", area: 33, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 286865, plano: { ato: { valor: 28686, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 229492, vencimento: "2026-10-15" } } },
    { id: "AG702", unidade: "702", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 368825, plano: { ato: { valor: 36883, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 295060, vencimento: "2026-10-15" } } },
    { id: "AG1001", unidade: "1001", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG - DEP)", status: "disponivel", valorTotal: 358849, plano: { ato: { valor: 35885, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 287079, vencimento: "2026-10-15" } } },
    { id: "AG1103", unidade: "1103", area: 33, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 276987, plano: { ato: { valor: 27699, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 221589, vencimento: "2026-10-15" } } },
    { id: "AG1107", unidade: "1107", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 358849, plano: { ato: { valor: 35885, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 287079, vencimento: "2026-10-15" } } },
    { id: "AG1304", unidade: "1304", area: 33, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 286865, plano: { ato: { valor: 28686, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 229492, vencimento: "2026-10-15" } } },
    { id: "AG1405", unidade: "1405", area: 33, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 286865, plano: { ato: { valor: 28686, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 229492, vencimento: "2026-10-15" } } },
    { id: "AG1606", unidade: "1606", area: 33, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 276987, plano: { ato: { valor: 27699, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 221589, vencimento: "2026-10-15" } } },
    { id: "AG1801", unidade: "1801", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 459429, plano: { ato: { valor: 45943, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 367544, vencimento: "2026-10-15" } } },
    { id: "AG1805", unidade: "1805", area: 33, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 358599, plano: { ato: { valor: 35860, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 286879, vencimento: "2026-10-15" } } },
    { id: "AG2001", unidade: "2001", area: 88, dormitorios: 3, tipologia: "3 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 986834, plano: { ato: { valor: 98683, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 789467, vencimento: "2026-10-15" } } },
    { id: "AG2002", unidade: "2002", area: 66, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 740126, plano: { ato: { valor: 74013, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 592101, vencimento: "2026-10-15" } } },
    { id: "AG2003", unidade: "2003", area: 66, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 740126, plano: { ato: { valor: 74013, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 592101, vencimento: "2026-10-15" } } },
    { id: "AG2004", unidade: "2004", area: 88, dormitorios: 3, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 986834, plano: { ato: { valor: 98683, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 789467, vencimento: "2026-10-15" } } },
  ];

  for (const unidade of auraUnidades) {
    await prisma.unidade.upsert({
      where: { id: unidade.id },
      update: {
        empreendimentoId: "aura",
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
        empreendimentoId: "aura",
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

  console.log(`   Total: ${auraUnidades.length} unidades\n`);

  // ============================================
  // 5. INSERIR UNIDADES COLATINNA (AGOSTO 2025)
  // ============================================
  console.log("5. Inserindo unidades Colatinna (Agosto 2025)...");

  const colatinnaUnidades: UnidadeStationPark[] = [
    { id: "COL604", unidade: "604", area: 49, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG)", status: "disponivel", valorTotal: 667937, plano: { ato: { valor: 66794, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 467556, vencimento: "2027-10-15" } } },
    { id: "COL803", unidade: "803", area: 51, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG)", status: "disponivel", valorTotal: 704835, plano: { ato: { valor: 70484, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 493385, vencimento: "2027-10-15" } } },
    { id: "COL902", unidade: "902", area: 43, dormitorios: 2, tipologia: "2 Dormitórios (MOTO)", status: "disponivel", valorTotal: 538843, plano: { ato: { valor: 53884, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 377190, vencimento: "2027-10-15" } } },
    { id: "COL903", unidade: "903", area: 51, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG)", status: "disponivel", valorTotal: 725756, plano: { ato: { valor: 72576, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 508030, vencimento: "2027-10-15" } } },
    { id: "COL904", unidade: "904", area: 50, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG - DEP)", status: "disponivel", valorTotal: 697344, plano: { ato: { valor: 69734, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 488141, vencimento: "2027-10-15" } } },
    { id: "COL1001", unidade: "1001", area: 46, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG - DEP)", status: "disponivel", valorTotal: 674064, plano: { ato: { valor: 67406, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 471844, vencimento: "2027-10-15" } } },
    { id: "COL1002", unidade: "1002", area: 43, dormitorios: 2, tipologia: "2 Dormitórios (MOTO - DEP)", status: "disponivel", valorTotal: 561166, plano: { ato: { valor: 56117, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 392816, vencimento: "2027-10-15" } } },
    { id: "COL1003", unidade: "1003", area: 51, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG - DEP)", status: "disponivel", valorTotal: 730446, plano: { ato: { valor: 73045, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 511312, vencimento: "2027-10-15" } } },
    { id: "COL1004", unidade: "1004", area: 49, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG - DEP)", status: "disponivel", valorTotal: 701846, plano: { ato: { valor: 70185, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 491292, vencimento: "2027-10-15" } } },
    { id: "COL1102", unidade: "1102", area: 43, dormitorios: 2, tipologia: "2 Dormitórios (MOTO - DEP)", status: "disponivel", valorTotal: 568994, plano: { ato: { valor: 56899, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 398296, vencimento: "2027-10-15" } } },
    { id: "COL1202", unidade: "1202", area: 43, dormitorios: 2, tipologia: "2 Dormitórios (VG - DEP)", status: "disponivel", valorTotal: 636974, plano: { ato: { valor: 63697, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 445882, vencimento: "2027-10-15" } } },
    { id: "COL1203", unidade: "1203", area: 51, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG - DEP)", status: "disponivel", valorTotal: 768067, plano: { ato: { valor: 76807, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 537647, vencimento: "2027-10-15" } } },
    { id: "COL1204", unidade: "1204", area: 49, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG - DEP)", status: "disponivel", valorTotal: 710938, plano: { ato: { valor: 71094, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 497657, vencimento: "2027-10-15" } } },
    { id: "COL1302", unidade: "1302", area: 43, dormitorios: 2, tipologia: "2 Dormitórios (VG - DEP)", status: "disponivel", valorTotal: 594387, plano: { ato: { valor: 59439, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 416071, vencimento: "2027-10-15" } } },
    { id: "COL1303", unidade: "1303", area: 51, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG - DEP)", status: "disponivel", valorTotal: 765257, plano: { ato: { valor: 76526, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 535680, vencimento: "2027-10-15" } } },
    { id: "COL1304", unidade: "1304", area: 49, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte (VG - DEP)", status: "disponivel", valorTotal: 743866, plano: { ato: { valor: 74387, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 520706, vencimento: "2027-10-15" } } },
  ];

  for (const unidade of colatinnaUnidades) {
    await prisma.unidade.upsert({
      where: { id: unidade.id },
      update: {
        empreendimentoId: "colatinna",
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
        empreendimentoId: "colatinna",
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

  console.log(`   Total: ${colatinnaUnidades.length} unidades\n`);

  // ============================================
  // 6. INSERIR UNIDADES STATION GARDEN (AGOSTO 2025)
  // ============================================
  console.log("6. Inserindo unidades Station Garden (Agosto 2025)...");

  const stationGardenUnidades: UnidadeStationPark[] = [
    { id: "SG14", unidade: "14", area: 115, dormitorios: 2, tipologia: "2 dormitórios - garden", status: "disponivel", valorTotal: 644862, plano: { ato: { valor: 128972, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 515890, vencimento: "2025-12-15" } } },
    { id: "SG23", unidade: "23", area: 45, dormitorios: 2, tipologia: "2 dormitórios", status: "disponivel", valorTotal: 311905, plano: { ato: { valor: 62381, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 249524, vencimento: "2025-12-15" } } },
    { id: "SG124", unidade: "124", area: 45, dormitorios: 2, tipologia: "2 dormitórios", status: "disponivel", valorTotal: 334427, plano: { ato: { valor: 66885, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 267542, vencimento: "2025-12-15" } } },
  ];

  for (const unidade of stationGardenUnidades) {
    await prisma.unidade.upsert({
      where: { id: unidade.id },
      update: {
        empreendimentoId: "station-garden",
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
        empreendimentoId: "station-garden",
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

  console.log(`   Total: ${stationGardenUnidades.length} unidades\n`);

  // ============================================
  // 7. INSERIR UNIDADES MIRANTE DA VILA (AGOSTO 2025)
  // ============================================
  console.log("7. Inserindo unidades Mirante da Vila (Agosto 2025)...");

  const miranteUnidades: UnidadeStationPark[] = [
    { id: "MV112", unidade: "112", area: 61, dormitorios: 2, tipologia: "Garden - 2 dormitórios", status: "disponivel", valorTotal: 487136, plano: { ato: { valor: 97427, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 360436, vencimento: "2025-12-15" } } },
  ];

  for (const unidade of miranteUnidades) {
    await prisma.unidade.upsert({
      where: { id: unidade.id },
      update: {
        empreendimentoId: "mirante-vila",
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
        empreendimentoId: "mirante-vila",
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

  console.log(`   Total: ${miranteUnidades.length} unidades\n`);

  // ============================================
  // 8. INSERIR UNIDADES MOMENT METRÔ CONCEIÇÃO (AGOSTO 2025)
  // ============================================
  console.log("8. Inserindo unidades Moment Metrô Conceição (Agosto 2025)...");

  const momentUnidades: UnidadeStationPark[] = [
    { id: "MMC301", unidade: "301", area: 60, dormitorios: 3, tipologia: "3 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 685110, plano: { ato: { valor: 68511, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 548088, vencimento: "2025-12-15" } } },
    { id: "MMC401", unidade: "401", area: 60, dormitorios: 3, tipologia: "3 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 695832, plano: { ato: { valor: 69583, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 556666, vencimento: "2025-12-15" } } },
    { id: "MMC407", unidade: "407", area: 49, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 500583, plano: { ato: { valor: 50058, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 400466, vencimento: "2025-12-15" } } },
    { id: "MMC1101", unidade: "1101", area: 60, dormitorios: 3, tipologia: "3 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 711986, plano: { ato: { valor: 71199, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 569589, vencimento: "2025-12-15" } } },
    { id: "MMC2001", unidade: "2001", area: 60, dormitorios: 3, tipologia: "3 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 724491, plano: { ato: { valor: 72449, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 579593, vencimento: "2025-12-15" } } },
    { id: "MMC2101", unidade: "2101", area: 60, dormitorios: 3, tipologia: "3 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 726925, plano: { ato: { valor: 72692, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 581540, vencimento: "2025-12-15" } } },
    { id: "MMC2303", unidade: "2303", area: 40, dormitorios: 2, tipologia: "2 Dormitórios", status: "disponivel", valorTotal: 400988, plano: { ato: { valor: 40099, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 320790, vencimento: "2025-12-15" } } },
    { id: "MMC2401", unidade: "2401", area: 60, dormitorios: 3, tipologia: "3 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 791254, plano: { ato: { valor: 79125, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 633003, vencimento: "2025-12-15" } } },
    { id: "MMC2501", unidade: "2501", area: 60, dormitorios: 3, tipologia: "3 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 792326, plano: { ato: { valor: 79233, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 633861, vencimento: "2025-12-15" } } },
  ];

  for (const unidade of momentUnidades) {
    await prisma.unidade.upsert({
      where: { id: unidade.id },
      update: {
        empreendimentoId: "moment-metro",
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
        empreendimentoId: "moment-metro",
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

  console.log(`   Total: ${momentUnidades.length} unidades\n`);

  // ============================================
  // 9. INSERIR UNIDADES ESSÊNCIA DA VILA (AGOSTO 2025)
  // ============================================
  console.log("9. Inserindo unidades Essência da Vila (Agosto 2025)...");

  const essenciaUnidades: UnidadeStationPark[] = [
    { id: "EV408", unidade: "408", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 375187, plano: { ato: { valor: 37519, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 300149, vencimento: "2026-04-15" } } },
    { id: "EV1101", unidade: "1101", area: 45, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 495155, plano: { ato: { valor: 49516, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 396124, vencimento: "2026-04-15" } } },
    { id: "EV1402", unidade: "1402", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 505223, plano: { ato: { valor: 50522, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 404179, vencimento: "2026-04-15" } } },
    { id: "EV1801", unidade: "1801", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 516948, plano: { ato: { valor: 51695, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 413558, vencimento: "2026-04-15" } } },
    { id: "EV1802", unidade: "1802", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 516948, plano: { ato: { valor: 51695, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 413558, vencimento: "2026-04-15" } } },
    { id: "EV1901", unidade: "1901", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 516948, plano: { ato: { valor: 51695, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 413558, vencimento: "2026-04-15" } } },
    { id: "EV1902", unidade: "1902", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 516948, plano: { ato: { valor: 51695, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 413558, vencimento: "2026-04-15" } } },
    { id: "EV2001", unidade: "2001", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 522277, plano: { ato: { valor: 52228, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 417822, vencimento: "2026-04-15" } } },
    { id: "EV2002", unidade: "2002", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 522277, plano: { ato: { valor: 52228, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 417821, vencimento: "2026-04-15" } } },
    { id: "EV2101", unidade: "2101", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 522277, plano: { ato: { valor: 52228, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 417821, vencimento: "2026-04-15" } } },
    { id: "EV2102", unidade: "2102", area: 44, dormitorios: 2, tipologia: "2 Dormitórios, sendo 1 suíte", status: "disponivel", valorTotal: 522277, plano: { ato: { valor: 52228, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 417821, vencimento: "2026-04-15" } } },
    { id: "EV2202", unidade: "2202", area: 81, dormitorios: 2, tipologia: "COBERTURA - 2 Dormitórios", status: "disponivel", valorTotal: 924704, plano: { ato: { valor: 92470, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 739763, vencimento: "2026-04-15" } } },
    { id: "EV2203", unidade: "2203", area: 81, dormitorios: 2, tipologia: "COBERTURA - 2 Dormitórios", status: "disponivel", valorTotal: 925177, plano: { ato: { valor: 92518, vencimento: "2025-08-15" }, mensais: { quantidade: 1, valor: 0, primeiroVencimento: "2025-08-15" }, financiamento: { valor: 740141, vencimento: "2026-04-15" } } },
  ];

  for (const unidade of essenciaUnidades) {
    await prisma.unidade.upsert({
      where: { id: unidade.id },
      update: {
        empreendimentoId: "essencia-vila",
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
        empreendimentoId: "essencia-vila",
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

  console.log(`   Total: ${essenciaUnidades.length} unidades\n`);

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
