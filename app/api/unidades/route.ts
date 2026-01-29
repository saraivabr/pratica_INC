import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const empreendimentoId = searchParams.get("empreendimento_id");

    if (!empreendimentoId) {
      return NextResponse.json({ error: "Empreendimento ID required" }, { status: 400 });
    }

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(empreendimentoId);
    
    if (!isUUID) {
      return NextResponse.json([]);
    }

    // Get empreendimento info
    const empResult = await pool.query(
      'SELECT cvcrm_id, cvcrm_data FROM cvcrm_empreendimentos WHERE id = $1',
      [empreendimentoId]
    );
    
    if (empResult.rows.length === 0) {
      return NextResponse.json([]);
    }
    
    const cvcrmId = empResult.rows[0].cvcrm_id;
    const oruloData = empResult.rows[0].cvcrm_data || {};
    
    // Try to get units from cvcrm_unidades (real CVCRM data)
    const unitsResult = await pool.query(
      `SELECT * FROM cvcrm_unidades 
       WHERE empreendimento_id = $1 
         AND tipo LIKE 'APARTAMENTO%'
       ORDER BY andar::int DESC NULLS LAST, nome ASC`,
      [cvcrmId]
    );
    
    if (unitsResult.rows.length > 0) {
      // Build typology lookup by area range for enriching units without price/bedrooms
      const typologies = (oruloData.typologies || []) as any[];
      const findTypology = (area: number) => {
        if (!area || area <= 0 || typologies.length === 0) return null;
        // Find closest matching typology by private_area
        let best = null;
        let bestDiff = Infinity;
        for (const t of typologies) {
          const tArea = parseFloat(t.private_area || '0');
          const diff = Math.abs(tArea - area);
          if (diff < bestDiff) {
            best = t;
            bestDiff = diff;
          }
        }
        // Accept if within 20% tolerance or 15m² absolute
        if (best && (bestDiff <= 15 || bestDiff / area <= 0.2)) return best;
        // Fallback: return cheapest typology for a rough estimate
        return typologies.reduce((a: any, b: any) => 
          (parseFloat(a.discount_price || a.original_price || '0') < parseFloat(b.discount_price || b.original_price || '0')) ? a : b
        );
      };

      const mappedUnits = unitsResult.rows.map((u: any) => {
        const nome = u.nome || '';
        const andar = parseInt(u.andar || '0');
        let final = '';
        if (nome && andar > 0) {
          const andarStr = String(andar);
          const idx = nome.indexOf(andarStr);
          if (idx >= 0) {
            final = nome.substring(idx + andarStr.length);
          }
        }
        if (!final) {
          final = nome.slice(-2);
        }

        const rawSituacao = (u.situacao || '').toLowerCase();
        let status = 'disponivel';
        if (rawSituacao.includes('vendid')) status = 'vendido';
        else if (rawSituacao.includes('reserv')) status = 'reservado';
        else if (rawSituacao.includes('bloq')) status = 'reservado';
        else if (rawSituacao.includes('dispon')) status = 'disponivel';

        const metragem = parseFloat(u.area_privativa || '0');
        let valor = parseFloat(u.valor_venda || '0');
        let quartos = parseInt(u.dormitorios || '0');
        let vagas = parseInt(u.vagas || '0');

        // Enrich from Órulo typology if DB data is missing
        if ((!valor || valor <= 0 || !quartos || quartos <= 0) && metragem > 0) {
          const typo = findTypology(metragem);
          if (typo) {
            if (!valor || valor <= 0) valor = parseFloat(typo.discount_price || typo.original_price || '0');
            if (!quartos || quartos <= 0) quartos = parseInt(typo.bedrooms || '0');
            if (!vagas || vagas <= 0) vagas = parseInt(typo.parking || '0');
          }
        }

        return {
          id: u.id?.toString() || u.cvcrm_id?.toString(),
          tipo: u.tipo || 'Apartamento',
          metragem,
          valor,
          status,
          quartos,
          vagas: vagas || 1,
          andar,
          final,
          bloco: u.bloco || '',
          unidade: nome,
          nome: `Unidade ${nome} - ${u.tipo || 'Apt'}`,
        };
      });
      return NextResponse.json(mappedUnits);
    }
    
    // If no real units, generate virtual units from Órulo typologies
    if (oruloData.typologies && Array.isArray(oruloData.typologies) && oruloData.typologies.length > 0) {
      const virtualUnits: any[] = [];
      
      for (const typo of oruloData.typologies) {
        const stock = typo.stock || 0;
        const totalUnits = typo.total_units || stock;
        const sold = totalUnits - stock;
        
        // Generate representative units for each typology
        // Since we don't have real floor/final data, create summary entries
        for (let i = 0; i < totalUnits && i < 200; i++) {
          const floor = Math.floor(i / 4) + 1; // 4 units per floor approximation
          const finalNum = (i % 4) + 1;
          const isSold = i < sold;
          
          virtualUnits.push({
            id: `typo-${typo.id}-${i}`,
            tipo: typo.type || 'Apartamento',
            metragem: parseFloat(typo.private_area || '0'),
            valor: parseFloat(typo.discount_price || typo.original_price || '0'),
            status: isSold ? 'vendido' : 'disponivel',
            quartos: parseInt(typo.bedrooms || '0'),
            vagas: parseInt(typo.parking || '0'),
            andar: floor,
            final: String(finalNum).padStart(2, '0'),
            bloco: '',
            unidade: `${floor}${String(finalNum).padStart(2, '0')}`,
            nome: `${typo.type || 'Unidade'} ${floor}${String(finalNum).padStart(2, '0')}`,
            isVirtual: true,
            typologyId: typo.id,
            typologyRef: typo.reference || '',
          });
        }
      }
      
      // Sort: highest floor first
      virtualUnits.sort((a, b) => b.andar - a.andar || a.final.localeCompare(b.final));
      
      return NextResponse.json(virtualUnits);
    }
    
    return NextResponse.json([]);
  } catch (error) {
    console.error("Erro ao buscar unidades:", error);
    return NextResponse.json([], { status: 200 });
  }
}
