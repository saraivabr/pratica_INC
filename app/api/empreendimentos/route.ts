import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'));

    // Query to get empreendimentos with unit counts
    // includeAll=true retorna todos (inclusive pais sem dados)
    const includeAll = searchParams.get('includeAll') === 'true';

    const query = `
      SELECT 
        e.id,
        e.cvcrm_id,
        e.nome,
        e.cidade,
        e.uf,
        e.status,
        e.total_unidades,
        e.descricao,
        e.tipo,
        e.endereco_completo,
        e.cep,
        e.data_lancamento,
        e.data_entrega_prevista,
        e.cvcrm_data,
        COUNT(u.id) as unidades_cadastradas,
        COUNT(CASE WHEN u.situacao IN ('disponivel', 'a venda') THEN 1 END) as unidades_disponiveis
      FROM cvcrm_empreendimentos e
      LEFT JOIN cvcrm_unidades u ON u.empreendimento_id = e.cvcrm_id
      WHERE e.status = 'ativo'
        ${!includeAll ? "AND (e.cvcrm_data IS NOT NULL AND e.cvcrm_data != '{}'::jsonb)" : ''}
      GROUP BY e.id, e.cvcrm_id, e.nome, e.cidade, e.uf, e.status, e.total_unidades, e.descricao, e.tipo, e.endereco_completo, e.cep, e.data_lancamento, e.data_entrega_prevista, e.cvcrm_data
      ORDER BY e.nome ASC
      LIMIT $1 OFFSET $2
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT e.id) as total
      FROM cvcrm_empreendimentos e
      WHERE e.status = 'ativo'
        ${!includeAll ? "AND (e.cvcrm_data IS NOT NULL AND e.cvcrm_data != '{}'::jsonb)" : ''}
    `;

    const [result, countResult] = await Promise.all([
      pool.query(query, [limit, offset]),
      pool.query(countQuery)
    ]);

    const empreendimentos = result.rows.map(row => {
      const orulo = row.cvcrm_data || {};
      const stock = orulo.stock || row.unidades_disponiveis || 0;
      
      // Map stage to previsaoEntrega
      let previsaoEntrega = null;
      const stage = orulo.stage || '';
      if (stage.toLowerCase().includes('pronto')) previsaoEntrega = 'Pronto para Morar';
      else if (stage.toLowerCase().includes('constru')) previsaoEntrega = 'Em Construção';
      else if (stage.toLowerCase().includes('lanç') || stage.toLowerCase().includes('lanc')) previsaoEntrega = 'Lançamento';
      else if (stage) previsaoEntrega = stage;

      // Clean up display name: " - NR" → " Comercial", remove " - Residencial"
      let displayNome = row.nome;
      if (displayNome.endsWith(' - NR')) {
        displayNome = displayNome.replace(' - NR', ' (Comercial)');
      } else if (displayNome.endsWith(' - Residencial')) {
        displayNome = displayNome.replace(' - Residencial', '');
      }

      return {
        // Campos base
        id: row.id,
        nome: displayNome,
        nomeOriginal: row.nome,
        cidade: row.cidade,
        uf: row.uf,
        status: row.status,
        descricao: row.descricao,
        tipo: row.tipo || 'apartamento',
        bairro: orulo.address?.area || null,
        // Imagem principal do Órulo
        imagemPrincipal: orulo.default_image || null,
        imagemThumb: orulo.default_image_thumb || null,
        imagens: (orulo.images || []).map((img: any) => img.url).filter(Boolean),
        // Campos camelCase (compatível com interface Empreendimento)
        precoMinimo: orulo.min_price && orulo.min_price > 1000 ? orulo.min_price : null,
        precoMaximo: null,
        previsaoEntrega,
        unidadesDisponiveis: stock,
        areaMin: orulo.min_area || null,
        areaMax: orulo.max_area || null,
        quartosMin: orulo.min_bedrooms || null,
        quartosMax: orulo.max_bedrooms || null,
        // Features e diferenciais
        diferenciais: orulo.features || [],
        features: orulo.features || [],
        // Campos snake_case (retrocompatibilidade)
        total_unidades: row.total_unidades || orulo.total_units || row.unidades_cadastradas || 0,
        unidades_disponiveis: stock,
        endereco_completo: row.endereco_completo,
        cep: row.cep,
        // Dados extras Órulo
        preco_m2: orulo.price_per_m2 || null,
        estoque: stock,
        suites_min: orulo.min_suites || null,
        suites_max: orulo.max_suites || null,
        vagas_min: orulo.min_parking || null,
        vagas_max: orulo.max_parking || null,
        andares: orulo.number_of_floors || null,
        torres: orulo.number_of_towers || null,
        fase: stage || null,
        finalidade: orulo.finality || null,
        url_orulo: orulo.orulo_url || null,
        url_site: orulo.webpage || null,
        url_compartilhar: orulo.sharing_url || null,
        endereco: orulo.address || null,
        // Tipologias (unidades por tipo)
        typologies: orulo.typologies || [],
        // Arquivos (PDFs, tabelas)
        files: orulo.files || [],
        // Plantas
        floor_plans: orulo.floor_plans || [],
      };
    });

    const total = parseInt(countResult.rows[0]?.total || '0');

    const response = NextResponse.json({
      success: true,
      data: empreendimentos,
      total,
      source: "database"
    });
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    return response;
  } catch (error) {
    console.error("Erro ao buscar empreendimentos:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar dados dos empreendimentos" },
      { status: 500 }
    );
  }
}