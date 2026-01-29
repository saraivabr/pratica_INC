import { NextRequest, NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { getCorretoresCVCRM, getImobiliariaCVCRM } from "@/lib/cvcrm-client";
import { normalizePhone } from "@/lib/supabase";
import { getAuthenticatedUser } from "@/lib/api-auth";

interface SyncLog {
  id: string;
  sync_type: string;
  status: string;
  total_items: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  error_details: string[];
}

// Helper para parsear endereço do CV CRM
function parseEndereco(endereco: any) {
  if (!endereco) return {};
  if (typeof endereco === 'string') {
    try {
      endereco = JSON.parse(endereco);
    } catch {
      return { logradouro: endereco };
    }
  }
  return {
    cep: endereco.cep || null,
    logradouro: endereco.logradouro || endereco.rua || null,
    numero: endereco.numero || null,
    complemento: endereco.complemento || null,
    bairro: endereco.bairro || null,
    cidade: endereco.cidade || endereco.municipio || null,
    uf: endereco.uf || endereco.estado || null,
  };
}

// Helper para parsear dados CRECI
function parseCreci(creci: any) {
  if (!creci) return {};
  if (typeof creci === 'string') {
    return { creci };
  }
  return {
    creci: creci.numero || creci.creci || null,
    creci_uf: creci.uf || creci.estado || null,
    creci_validade: creci.validade || null,
  };
}

// Helper para parsear dados bancários
function parseBancarios(dados: any) {
  if (!dados) return {};
  if (typeof dados === 'string') {
    try {
      dados = JSON.parse(dados);
    } catch {
      return {};
    }
  }
  return {
    banco: dados.banco || dados.nome_banco || null,
    agencia: dados.agencia || null,
    conta: dados.conta || dados.numero_conta || null,
    tipo_conta: dados.tipo || dados.tipo_conta || null,
    pix: dados.pix || dados.chave_pix || null,
  };
}

// POST - Full sync from CV CRM
export async function POST(request: NextRequest) {
  // ❌ CV CRM SYNC ADMIN DESABILITADO - Erro 405 constantemente  
  return NextResponse.json({
    success: false,
    message: "CV CRM sync admin desabilitado por Fellipe - erro 405 constante",
    timestamp: new Date().toISOString()
  }, { status: 503 });

  /* CÓDIGO ORIGINAL COMENTADO
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Criar log de sync
    const { rows: [syncLog] } = await dbQuery<SyncLog>(
      `INSERT INTO sync_logs (sync_type, status, triggered_by)
       VALUES ('full', 'running', $1)
       RETURNING *`,
      [user.id]
    );

    const results = {
      imobiliarias: { created: 0, updated: 0, errors: [] as string[] },
      corretores: { created: 0, updated: 0, linked: 0, errors: [] as string[] },
    };

    try {
      // ========================================
      // PASSO 1: Buscar todos os corretores
      // ========================================
      console.log("[Sync] Buscando corretores do CV CRM...");
      const corretoresResponse = await getCorretoresCVCRM();
      const corretores = (corretoresResponse as any).corretores || (corretoresResponse as any).data || [];
      console.log(`[Sync] ${corretores.length} corretores encontrados`);

      // ========================================
      // PASSO 2: Extrair IDs únicos de imobiliárias
      // ========================================
      const uniqueImobIds = [...new Set(
        corretores
          .map((c: any) => c.idimobiliaria)
          .filter((id: any) => id && id > 0)
      )] as number[];
      console.log(`[Sync] ${uniqueImobIds.length} imobiliárias únicas para sincronizar`);

      // ========================================
      // PASSO 3: Sincronizar imobiliárias
      // ========================================
      const imobMap = new Map<number, string>(); // cvcrm_id -> uuid

      for (const imobId of uniqueImobIds) {
        try {
          const imobResponse = await getImobiliariaCVCRM(imobId);
          const imob = (imobResponse as any).imobiliarias || imobResponse;

          if (!imob || !imob.nome) {
            results.imobiliarias.errors.push(`Imobiliária ${imobId}: dados inválidos`);
            continue;
          }

          const endereco = parseEndereco(imob.endereco || imob.endereço);
          const creciData = parseCreci(imob.dados_creci || imob.creci);

          // Verificar se já existe por cvcrm_id ou nome
          const { rows: existing } = await dbQuery(
            `SELECT id FROM imobiliarias WHERE cvcrm_id = $1 OR LOWER(nome) = LOWER($2)`,
            [imobId, imob.nome]
          );

          if (existing.length > 0) {
            // Atualizar
            await dbQuery(
              `UPDATE imobiliarias SET
                cvcrm_id = $2,
                nome = COALESCE($3, nome),
                razao_social = COALESCE($4, razao_social),
                fantasia = COALESCE($5, fantasia),
                cnpj = COALESCE($6, cnpj),
                telefone = COALESCE($7, telefone),
                celular = COALESCE($8, celular),
                email = COALESCE($9, email),
                site = COALESCE($10, site),
                cep = COALESCE($11, cep),
                logradouro = COALESCE($12, logradouro),
                numero = COALESCE($13, numero),
                complemento = COALESCE($14, complemento),
                bairro = COALESCE($15, bairro),
                cidade = COALESCE($16, cidade),
                uf = COALESCE($17, uf),
                creci = COALESCE($18, creci),
                creci_uf = COALESCE($19, creci_uf),
                cvcrm_data = $20,
                synced_at = NOW()
              WHERE id = $1`,
              [
                existing[0].id,
                imobId,
                imob.nome,
                imob.razao_social,
                imob.fantasia || imob.nome_fantasia,
                imob.cnpj,
                imob.telefone,
                imob.celular,
                imob.email,
                imob.site || imob.website,
                endereco.cep,
                endereco.logradouro,
                endereco.numero,
                endereco.complemento,
                endereco.bairro,
                endereco.cidade,
                endereco.uf,
                creciData.creci,
                creciData.creci_uf,
                JSON.stringify(imob),
              ]
            );
            imobMap.set(imobId, existing[0].id);
            results.imobiliarias.updated++;
          } else {
            // Criar nova
            const { rows: [newImob] } = await dbQuery(
              `INSERT INTO imobiliarias (
                cvcrm_id, nome, razao_social, fantasia, cnpj,
                telefone, celular, email, site,
                cep, logradouro, numero, complemento, bairro, cidade, uf,
                creci, creci_uf, cvcrm_data, synced_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
              RETURNING id`,
              [
                imobId,
                imob.nome,
                imob.razao_social,
                imob.fantasia || imob.nome_fantasia,
                imob.cnpj,
                imob.telefone,
                imob.celular,
                imob.email,
                imob.site || imob.website,
                endereco.cep,
                endereco.logradouro,
                endereco.numero,
                endereco.complemento,
                endereco.bairro,
                endereco.cidade,
                endereco.uf,
                creciData.creci,
                creciData.creci_uf,
                JSON.stringify(imob),
              ]
            );
            imobMap.set(imobId, newImob.id);
            results.imobiliarias.created++;
          }

          // Pequeno delay para não sobrecarregar a API
          await new Promise(r => setTimeout(r, 50));
        } catch (err: any) {
          results.imobiliarias.errors.push(`Imobiliária ${imobId}: ${err.message}`);
        }
      }

      console.log(`[Sync] Imobiliárias: ${results.imobiliarias.created} criadas, ${results.imobiliarias.updated} atualizadas`);

      // ========================================
      // PASSO 4: Sincronizar corretores
      // ========================================
      for (const corretor of corretores) {
        try {
          const telefone = corretor.telefone || corretor.celular;
          if (!corretor.nome) {
            results.corretores.errors.push(`Corretor ID ${corretor.idcorretor}: sem nome`);
            continue;
          }

          const normalizedPhone = telefone ? normalizePhone(telefone) : null;
          const endereco = parseEndereco(corretor.endereco || corretor['endereço']);
          const creciData = parseCreci(corretor.dados_creci);
          const bancarios = parseBancarios(corretor.informacoes_bancarias);

          // Buscar imobiliária local pelo mapa
          const imobiliariaId = corretor.idimobiliaria ? imobMap.get(corretor.idimobiliaria) : null;

          // Verificar se já existe por cvcrm_id ou telefone
          const { rows: existing } = await dbQuery(
            `SELECT id FROM users WHERE cvcrm_id = $1 OR ($2 IS NOT NULL AND telefone = $2)`,
            [corretor.idcorretor, normalizedPhone]
          );

          if (existing.length > 0) {
            // Atualizar
            await dbQuery(
              `UPDATE users SET
                cvcrm_id = $2,
                cvcrm_imobiliaria_id = $3,
                imobiliaria_id = COALESCE($4, imobiliaria_id),
                nome = COALESCE($5, nome),
                apelido = COALESCE($6, apelido),
                email = COALESCE($7, email),
                telefone = COALESCE($8, telefone),
                cpf = COALESCE($9, cpf),
                rg = COALESCE($10, rg),
                rg_orgao = COALESCE($11, rg_orgao),
                data_nascimento = COALESCE($12::date, data_nascimento),
                genero = COALESCE($13, genero),
                estado_civil = COALESCE($14, estado_civil),
                naturalidade = COALESCE($15, naturalidade),
                nacionalidade = COALESCE($16, nacionalidade),
                creci = COALESCE($17, creci),
                creci_uf = COALESCE($18, creci_uf),
                categoria = COALESCE($19, categoria),
                nivel = COALESCE($20, nivel),
                time = COALESCE($21, time),
                codigo_interno = COALESCE($22, codigo_interno),
                cep = COALESCE($23, cep),
                logradouro = COALESCE($24, logradouro),
                numero = COALESCE($25, numero),
                complemento = COALESCE($26, complemento),
                bairro = COALESCE($27, bairro),
                cidade = COALESCE($28, cidade),
                uf = COALESCE($29, uf),
                banco = COALESCE($30, banco),
                agencia = COALESCE($31, agencia),
                conta = COALESCE($32, conta),
                pix = COALESCE($33, pix),
                observacoes = COALESCE($34, observacoes),
                ativo_login_cvcrm = $35,
                cvcrm_data = $36,
                synced_at = NOW()
              WHERE id = $1`,
              [
                existing[0].id,
                corretor.idcorretor,
                corretor.idimobiliaria,
                imobiliariaId,
                corretor.nome,
                corretor.apelido,
                corretor.email,
                normalizedPhone,
                corretor.documento || corretor.cpf,
                corretor.rg,
                corretor.rg_orgao_expedidor,
                corretor['data de nascimento'] || corretor.data_nascimento || null,
                corretor.genero,
                corretor['estado civil'] || corretor.estado_civil,
                corretor.naturalidade,
                corretor.nacionalidade,
                creciData.creci,
                creciData.creci_uf,
                corretor.categoria,
                corretor.nivel,
                corretor.time,
                corretor.codigo_interno,
                endereco.cep,
                endereco.logradouro,
                endereco.numero,
                endereco.complemento,
                endereco.bairro,
                endereco.cidade,
                endereco.uf,
                bancarios.banco,
                bancarios.agencia,
                bancarios.conta,
                bancarios.pix,
                corretor['observações'] || corretor.observacoes,
                corretor.ativo_login === 1 || corretor.ativo_login === true,
                JSON.stringify(corretor),
              ]
            );
            results.corretores.updated++;
            if (imobiliariaId) results.corretores.linked++;
          } else {
            // Criar novo - só criar se tiver telefone
            if (!normalizedPhone) {
              results.corretores.errors.push(`Corretor ${corretor.nome}: sem telefone`);
              continue;
            }

            await dbQuery(
              `INSERT INTO users (
                cvcrm_id, cvcrm_imobiliaria_id, imobiliaria_id,
                nome, apelido, email, telefone, role,
                cpf, rg, rg_orgao, data_nascimento, genero, estado_civil,
                naturalidade, nacionalidade,
                creci, creci_uf, categoria, nivel, time, codigo_interno,
                cep, logradouro, numero, complemento, bairro, cidade, uf,
                banco, agencia, conta, pix, observacoes,
                ativo_login_cvcrm, cvcrm_data, synced_at,
                is_active, onboarding_status
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, 'corretor',
                $8, $9, $10, $11::date, $12, $13, $14, $15,
                $16, $17, $18, $19, $20, $21,
                $22, $23, $24, $25, $26, $27, $28,
                $29, $30, $31, $32, $33,
                $34, $35, NOW(),
                true, 'completed'
              )`,
              [
                corretor.idcorretor,
                corretor.idimobiliaria,
                imobiliariaId,
                corretor.nome,
                corretor.apelido,
                corretor.email,
                normalizedPhone,
                corretor.documento || corretor.cpf,
                corretor.rg,
                corretor.rg_orgao_expedidor,
                corretor['data de nascimento'] || corretor.data_nascimento || null,
                corretor.genero,
                corretor['estado civil'] || corretor.estado_civil,
                corretor.naturalidade,
                corretor.nacionalidade,
                creciData.creci,
                creciData.creci_uf,
                corretor.categoria,
                corretor.nivel,
                corretor.time,
                corretor.codigo_interno,
                endereco.cep,
                endereco.logradouro,
                endereco.numero,
                endereco.complemento,
                endereco.bairro,
                endereco.cidade,
                endereco.uf,
                bancarios.banco,
                bancarios.agencia,
                bancarios.conta,
                bancarios.pix,
                corretor['observações'] || corretor.observacoes,
                corretor.ativo_login === 1 || corretor.ativo_login === true,
                JSON.stringify(corretor),
              ]
            );
            results.corretores.created++;
            if (imobiliariaId) results.corretores.linked++;
          }
        } catch (err: any) {
          results.corretores.errors.push(`Corretor ${corretor.nome || corretor.idcorretor}: ${err.message}`);
        }
      }

      console.log(`[Sync] Corretores: ${results.corretores.created} criados, ${results.corretores.updated} atualizados, ${results.corretores.linked} vinculados`);

      // ========================================
      // PASSO 5: Atualizar log de sync
      // ========================================
      await dbQuery(
        `UPDATE sync_logs SET
          status = 'completed',
          completed_at = NOW(),
          total_items = $2,
          created = $3,
          updated = $4,
          errors = $5,
          error_details = $6,
          summary = $7
        WHERE id = $1`,
        [
          syncLog.id,
          corretores.length + uniqueImobIds.length,
          results.imobiliarias.created + results.corretores.created,
          results.imobiliarias.updated + results.corretores.updated,
          results.imobiliarias.errors.length + results.corretores.errors.length,
          JSON.stringify([...results.imobiliarias.errors, ...results.corretores.errors]),
          JSON.stringify(results),
        ]
      );

      return NextResponse.json({
        success: true,
        syncLogId: syncLog.id,
        results,
      });
    } catch (error: any) {
      // Atualizar log de sync com erro
      await dbQuery(
        `UPDATE sync_logs SET
          status = 'error',
          completed_at = NOW(),
          error_details = $2
        WHERE id = $1`,
        [syncLog.id, JSON.stringify([error.message])]
      );

      throw error;
    }
  } catch (error: any) {
    console.error("[Sync] Error:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}

// GET - Retorna status do último sync
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { rows } = await dbQuery(
      `SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 10`
    );

    // Estatísticas gerais
    const { rows: [stats] } = await dbQuery(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'corretor') as total_corretores,
        (SELECT COUNT(*) FROM users WHERE cvcrm_id IS NOT NULL) as corretores_sincronizados,
        (SELECT COUNT(*) FROM imobiliarias) as total_imobiliarias,
        (SELECT COUNT(*) FROM imobiliarias WHERE cvcrm_id IS NOT NULL) as imobiliarias_sincronizadas,
        (SELECT COUNT(*) FROM users WHERE imobiliaria_id IS NOT NULL) as corretores_vinculados
    `);

    return NextResponse.json({
      logs: rows,
      stats,
    });
  } catch (error: any) {
    console.error("[Sync] Error:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
  */ // FIM DO CÓDIGO COMENTADO
}
