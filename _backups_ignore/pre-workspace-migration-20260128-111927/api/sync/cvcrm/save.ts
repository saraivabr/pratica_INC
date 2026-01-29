import { dbQuery } from "@/lib/db";

type Snapshot = {
  empreendimentos?: any;
  unidades?: any;
  unidadesSituacao?: any;
  series?: any;
  corretores?: any;
  leads?: any;
  summary?: Record<string, any>;
  errors?: Record<string, any>;
};

export async function saveSnapshot(data: Snapshot) {
  const payload = {
    empreendimentos: data.empreendimentos || null,
    unidades: data.unidades || null,
    unidadesSituacao: data.unidadesSituacao || null,
    series: data.series || null,
    corretores: data.corretores || null,
    leads: data.leads || null,
    summary: data.summary || null,
    errors: data.errors || null,
  };

  await dbQuery(
    `insert into cvcrm_snapshots
      (empreendimentos, unidades, unidades_situacao, series, corretores, leads, summary, errors)
     values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      payload.empreendimentos,
      payload.unidades,
      payload.unidadesSituacao,
      payload.series,
      payload.corretores,
      payload.leads,
      payload.summary,
      payload.errors,
    ]
  );
}
