import { getCorretoresCVCRM } from '../cvcrm-client';
import { comparePhones, normalizePhone, formatPhone, type PhoneMatchResult } from '../phone-utils';
import pool from './db-cli-adapter';

/**
 * Resultado do mapeamento de um corretor
 */
interface MappingResult {
    userId: string;
    userName: string;
    userPhone: string;
    cvcrmId: number | null;
    cvcrmName: string | null;
    cvcrmPhone: string | null;
    matchResult: PhoneMatchResult | null;
    status: 'matched' | 'no_match' | 'already_mapped' | 'skipped';
}

/**
 * Sincroniza corretores do CV CRM com os usuários locais
 * Mapeamento feito via comparacao robusta de telefones
 * Suporta diversos formatos: +55, DDD, com/sem 9o digito
 */
export async function syncCorretoresMapping() {
    console.log('[Sync] Iniciando mapeamento de corretores...');
    console.log('[Sync] Usando normalizacao robusta de telefones');

    const results: MappingResult[] = [];

    try {
        // 0. Resetar mapeamentos existentes para evitar conflitos de unique constraint
        await pool.query('UPDATE users SET cvcrm_id = NULL');

        // 1. Buscar todos os usuários locais
        const { rows: users } = await pool.query('SELECT id, telefone, nome FROM users ORDER BY created_at DESC');
        console.log(`[Sync] Encontrados ${users.length} usuários locais.`);

        // 2. Buscar corretores do CV CRM
        const response = await getCorretoresCVCRM() as any;
        const corretores: any[] = Array.isArray(response) ? response : (response.data || response.corretores || response.registros || []);
        console.log(`[Sync] Encontrados ${corretores.length} corretores no CV CRM.`);

        let mappedCount = 0;
        let noMatchCount = 0;
        let skippedCount = 0;
        const mappedCvcrmIds = new Set<number>();

        // 3. Tentar mapear cada usuário
        for (const user of users) {
            const userPhone = String(user.telefone || '');
            const normalizedUser = normalizePhone(userPhone);

            // Pular usuarios sem telefone valido
            if (!normalizedUser.isValid) {
                console.log(`[Sync] Pulando "${user.nome}": telefone invalido (${normalizedUser.invalidReason})`);
                results.push({
                    userId: user.id,
                    userName: user.nome,
                    userPhone,
                    cvcrmId: null,
                    cvcrmName: null,
                    cvcrmPhone: null,
                    matchResult: null,
                    status: 'skipped',
                });
                skippedCount++;
                continue;
            }

            // Buscar melhor match entre corretores do CV CRM
            let bestMatch: { corretor: any; result: PhoneMatchResult } | null = null;

            for (const corretor of corretores) {
                const corretorPhone = String(corretor.celular || corretor.telefone || '');
                const matchResult = comparePhones(userPhone, corretorPhone);

                if (matchResult.matched) {
                    // Escolher match com maior confianca
                    if (!bestMatch || getConfidenceScore(matchResult.confidence) > getConfidenceScore(bestMatch.result.confidence)) {
                        bestMatch = { corretor, result: matchResult };
                    }

                    // Match exato - parar de procurar
                    if (matchResult.confidence === 'exact') {
                        break;
                    }
                }
            }

            if (bestMatch) {
                const cvcrmId = Number(bestMatch.corretor.idcorretor || bestMatch.corretor.id);
                const cvcrmName = bestMatch.corretor.nome || bestMatch.corretor.apelido || 'N/A';
                const cvcrmPhone = String(bestMatch.corretor.celular || bestMatch.corretor.telefone || '');

                // Pular se este ID já foi mapeado para outro usuário local
                if (mappedCvcrmIds.has(cvcrmId)) {
                    console.log(`[Sync] Pulando "${user.nome}" - CV CRM ID ${cvcrmId} já mapeado para outro usuário`);
                    results.push({
                        userId: user.id,
                        userName: user.nome,
                        userPhone,
                        cvcrmId,
                        cvcrmName,
                        cvcrmPhone,
                        matchResult: bestMatch.result,
                        status: 'already_mapped',
                    });
                    continue;
                }

                await pool.query(
                    'UPDATE users SET cvcrm_id = $1 WHERE id = $2',
                    [cvcrmId, user.id]
                );

                mappedCvcrmIds.add(cvcrmId);

                const confidenceEmoji = getConfidenceEmoji(bestMatch.result.confidence);
                console.log(
                    `[Sync] ${confidenceEmoji} "${user.nome}" -> CV CRM "${cvcrmName}" (ID ${cvcrmId})` +
                    ` | Confianca: ${bestMatch.result.confidence.toUpperCase()}` +
                    ` | ${bestMatch.result.details}`
                );

                results.push({
                    userId: user.id,
                    userName: user.nome,
                    userPhone,
                    cvcrmId,
                    cvcrmName,
                    cvcrmPhone,
                    matchResult: bestMatch.result,
                    status: 'matched',
                });

                mappedCount++;
            } else {
                console.log(
                    `[Sync] Sem match para "${user.nome}"` +
                    ` | Tel: ${formatPhone(userPhone) || userPhone}` +
                    ` | Normalizado: ${normalizedUser.normalized || 'N/A'}`
                );

                results.push({
                    userId: user.id,
                    userName: user.nome,
                    userPhone,
                    cvcrmId: null,
                    cvcrmName: null,
                    cvcrmPhone: null,
                    matchResult: null,
                    status: 'no_match',
                });

                noMatchCount++;
            }
        }

        // 4. Resumo final
        console.log('\n[Sync] ========== RESUMO DO MAPEAMENTO ==========');
        console.log(`[Sync] Total de usuarios: ${users.length}`);
        console.log(`[Sync] Mapeados com sucesso: ${mappedCount}`);
        console.log(`[Sync] Sem correspondencia: ${noMatchCount}`);
        console.log(`[Sync] Pulados (tel invalido): ${skippedCount}`);

        // Detalhar por nivel de confianca
        const matchedResults = results.filter(r => r.status === 'matched');
        const byConfidence = {
            exact: matchedResults.filter(r => r.matchResult?.confidence === 'exact').length,
            high: matchedResults.filter(r => r.matchResult?.confidence === 'high').length,
            medium: matchedResults.filter(r => r.matchResult?.confidence === 'medium').length,
            low: matchedResults.filter(r => r.matchResult?.confidence === 'low').length,
        };

        console.log('[Sync] Por nivel de confianca:');
        console.log(`[Sync]   - Exato: ${byConfidence.exact}`);
        console.log(`[Sync]   - Alto: ${byConfidence.high}`);
        console.log(`[Sync]   - Medio: ${byConfidence.medium}`);
        console.log(`[Sync]   - Baixo: ${byConfidence.low}`);
        console.log('[Sync] =============================================\n');

        return {
            success: true,
            mapped: mappedCount,
            noMatch: noMatchCount,
            skipped: skippedCount,
            byConfidence,
            details: results,
        };
    } catch (error) {
        console.error('[Sync] Erro no mapeamento de corretores:', error);
        throw error;
    }
}

/**
 * Converte nivel de confianca para score numerico
 */
function getConfidenceScore(confidence: PhoneMatchResult['confidence']): number {
    const scores: Record<PhoneMatchResult['confidence'], number> = {
        exact: 4,
        high: 3,
        medium: 2,
        low: 1,
        none: 0,
    };
    return scores[confidence];
}

/**
 * Retorna emoji indicativo do nivel de confianca
 */
function getConfidenceEmoji(confidence: PhoneMatchResult['confidence']): string {
    const emojis: Record<PhoneMatchResult['confidence'], string> = {
        exact: '[OK]',
        high: '[~]',
        medium: '[?]',
        low: '[!]',
        none: '[X]',
    };
    return emojis[confidence];
}