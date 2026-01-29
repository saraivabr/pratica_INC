import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dbQuery } from '@/lib/db';
import { getEmpreendimentosCVCRM, getUnidadesCVCRM } from '@/lib/cvcrm-client';
import { ShareLanding } from '@/components/share/share-landing';

interface SharePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ref?: string }>;
}

async function getEmpreendimento(id: string) {
  const response = await getEmpreendimentosCVCRM();
  const responseAny = response as any;
  const empreendimentos = Array.isArray(response)
    ? response
    : (responseAny.empreendimentos || responseAny.data || []);
  const empreendimento = empreendimentos.find(
    (emp: any) => String(emp.idempreendimento || emp.id) === id
  );

  if (!empreendimento) return null;
  return empreendimento;
}

async function getUnidades(empreendimentoId: string) {
  const response = await getUnidadesCVCRM();
  const unidadesRaw = Array.isArray(response)
    ? response
    : (response as any).data || (response as any).unidades || [];

  return unidadesRaw
    .filter((u: any) => String(u.idempreendimento) === empreendimentoId)
    .sort((a: any, b: any) => Number(a.valor_venda || a.valor_tabela || 0) - Number(b.valor_venda || b.valor_tabela || 0));
}

async function getCorretor(corretorId: string) {
  const { rows } = await dbQuery(
    `select id, nome, telefone from users where id = $1 limit 1`,
    [corretorId]
  );
  return rows[0] || null;
}

async function trackView(empreendimentoId: string, corretorId?: string) {
  try {
    await dbQuery(
      `insert into share_views (empreendimento_id, corretor_id)
       values ($1, $2)`,
      [empreendimentoId, corretorId || null]
    );
  } catch (e) {
    // Silently fail tracking
  }
}

export async function generateMetadata({ params }: SharePageProps): Promise<Metadata> {
  const { id } = await params;
  const empreendimento = await getEmpreendimento(id);

  if (!empreendimento) {
    return {
      title: 'Empreendimento não encontrado | Pratica Incorporadora',
    };
  }

  const precoFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(empreendimento.preco_minimo || 0);

  return {
    title: `${empreendimento.nome} | Pratica Incorporadora`,
    description: `${empreendimento.descricao?.slice(0, 150) || empreendimento.nome} - A partir de ${precoFormatado}`,
    openGraph: {
      title: empreendimento.nome,
      description: `A partir de ${precoFormatado} - ${empreendimento.bairro}, ${empreendimento.cidade}`,
      images: empreendimento.imagem_principal ? [empreendimento.imagem_principal] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: empreendimento.nome,
      description: `A partir de ${precoFormatado}`,
    },
  };
}

export default async function SharePage({ params, searchParams }: SharePageProps) {
  const { id } = await params;
  const { ref } = await searchParams;

  const empreendimento = await getEmpreendimento(id);

  if (!empreendimento) {
    notFound();
  }

  const unidades = await getUnidades(id);
  const corretor = ref ? await getCorretor(ref) : null;

  // Track view
  await trackView(id, ref);

  return (
    <ShareLanding
      empreendimento={{
        id: String(empreendimento.idempreendimento || empreendimento.id),
        nome: empreendimento.nome || empreendimento.empreendimento,
        cidade: empreendimento.cidade?.nome || empreendimento.cidade || empreendimento.municipio,
        bairro: empreendimento.bairro?.nome || empreendimento.bairro,
        tipo: empreendimento.tipo?.nome || empreendimento.tipo || empreendimento.tipologia,
        construtora: empreendimento.incorporadora || empreendimento.construtora,
        previsaoEntrega: empreendimento.data_entrega || empreendimento.previsao_entrega,
        descricao: empreendimento.descricao || empreendimento.apresentacao,
        diferenciais: empreendimento.diferenciais || [],
        imagemPrincipal: empreendimento.imagem_principal || empreendimento.foto || undefined,
        imagens: Array.isArray(empreendimento.imagens || empreendimento.fotos)
          ? (empreendimento.imagens || empreendimento.fotos)
          : empreendimento.imagens || empreendimento.fotos
            ? [empreendimento.imagens || empreendimento.fotos]
            : [],
        precoMinimo: empreendimento.preco_minimo || empreendimento.precoMinimo || undefined,
        precoMaximo: empreendimento.preco_maximo || empreendimento.precoMaximo || undefined,
      }}
      unidades={unidades.map((u: any) => {
        const situacao = String(u.situacao || u.idunidadesituacao || "").toUpperCase();
        const status =
          ["V", "VENDIDA", "VENDIDO"].includes(situacao)
            ? "vendido"
            : ["R", "RESERVADA", "RESERVADO", "B", "BLOQUEADA"].includes(situacao)
              ? "reservado"
              : "disponivel";

        return {
          id: String(u.idunidade),
          tipo: String(u.tipo || u.tipologia || u.descricao || ''),
          metragem: Number(u.area_privativa || u.area_total || 0),
          valor: Number(u.valor_venda || u.valor_tabela || u.preco || 0),
          status,
          quartos: Number(u.quartos || 0),
          vagas: Number(u.vagas || 0),
          andar: Number(u.andar || 0),
          final: String(u.nome || u.numero || ''),
        };
      })}
      corretor={corretor ? {
        nome: corretor.nome,
        telefone: corretor.telefone,
      } : undefined}
    />
  );
}
