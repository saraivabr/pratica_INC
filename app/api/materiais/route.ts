import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import pool from "@/lib/db";

export interface Material {
  tipo: "tabela" | "ficha_tecnica" | "book" | "apresentacao" | "outro";
  tipoNome: string;
  nomeOriginal: string;
  arquivo: string;
  url: string;
  tamanho: number;
  dataAtualizacao: string;
}

export interface EmpreendimentoMateriais {
  id: number;
  nome: string;
  materiais: Material[];
}

let materiaisCache: Record<string, EmpreendimentoMateriais> | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

function loadMateriais(): Record<string, EmpreendimentoMateriais> {
  const now = Date.now();
  if (materiaisCache && now - cacheTimestamp < CACHE_DURATION) {
    return materiaisCache;
  }

  try {
    const filePath = path.join(process.cwd(), "public/materiais/index.json");
    const data = fs.readFileSync(filePath, "utf-8");
    materiaisCache = JSON.parse(data);
    cacheTimestamp = now;
    return materiaisCache!;
  } catch (error) {
    console.error("Erro ao carregar materiais:", error);
    return {};
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const empreendimentoId = searchParams.get("empreendimentoId");

  const materiais = loadMateriais();

  if (empreendimentoId) {
    // Check if it's a UUID — need to convert to cvcrm_id
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(empreendimentoId);
    
    let lookupKey = empreendimentoId;
    
    if (isUUID) {
      try {
        const result = await pool.query(
          'SELECT cvcrm_id FROM cvcrm_empreendimentos WHERE id = $1',
          [empreendimentoId]
        );
        if (result.rows.length > 0) {
          lookupKey = String(result.rows[0].cvcrm_id);
        }
      } catch (err) {
        console.error("Erro ao converter UUID para cvcrm_id:", err);
      }
    }

    // Also enrich materiais with Órulo files if available
    let empMateriais = materiais[lookupKey];
    
    // Try to get Órulo files too
    if (isUUID) {
      try {
        const oruloResult = await pool.query(
          "SELECT cvcrm_data->'files' as files, cvcrm_data->'floor_plans' as floor_plans FROM cvcrm_empreendimentos WHERE id = $1",
          [empreendimentoId]
        );
        if (oruloResult.rows.length > 0) {
          const oruloFiles = oruloResult.rows[0].files || [];
          const floorPlans = oruloResult.rows[0].floor_plans || [];
          
          const extraMaterials: Material[] = [];
          
          // Add Órulo files
          for (const file of oruloFiles) {
            if (file.url) {
              extraMaterials.push({
                tipo: "outro",
                tipoNome: file.name || file.label || "Documento",
                nomeOriginal: file.name || "arquivo.pdf",
                arquivo: file.url,
                url: file.url,
                tamanho: 0,
                dataAtualizacao: file.updated_at || "",
              });
            }
          }
          
          // Add floor plans
          for (const plan of floorPlans) {
            if (plan.url || plan.image_url) {
              const desc = plan.description || plan.typology || plan.name || "Planta";
              extraMaterials.push({
                tipo: "apresentacao",
                tipoNome: `Planta - ${desc}`,
                nomeOriginal: `${desc}.jpg`,
                arquivo: plan.url || plan.image_url,
                url: plan.url || plan.image_url,
                tamanho: 0,
                dataAtualizacao: plan.updated_at || "",
              });
            }
          }
          
          if (extraMaterials.length > 0) {
            if (!empMateriais) {
              empMateriais = {
                id: parseInt(lookupKey) || 0,
                nome: "",
                materiais: extraMaterials,
              };
            } else {
              // Only add Órulo files that don't duplicate existing local ones
              // Check by filename similarity (strip extension + normalize)
              const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
              const existingNames = new Set(empMateriais.materiais.map(m => normalize(m.nomeOriginal)));
              const existingUrls = new Set(empMateriais.materiais.map(m => m.url));
              
              for (const em of extraMaterials) {
                // Skip if URL already exists
                if (existingUrls.has(em.url)) continue;
                // Skip Órulo PDF files that are same as local PDFs (by name)
                const normalName = normalize(em.nomeOriginal);
                if (em.url.includes('orulo.com.br/files') && existingNames.has(normalName)) continue;
                // Floor plans (images) always add
                empMateriais.materiais.push(em);
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro ao buscar arquivos Órulo:", err);
      }
    }

    if (!empMateriais || empMateriais.materiais.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: "Nenhum material encontrado para este empreendimento",
      });
    }
    return NextResponse.json({
      success: true,
      data: empMateriais,
    });
  }

  // Retornar todos os materiais
  return NextResponse.json({
    success: true,
    data: Object.values(materiais),
    total: Object.keys(materiais).length,
  });
}
