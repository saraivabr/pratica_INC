/**
 * Urgency Calculator
 * Calculates lead urgency and prioritization based on multiple factors
 */

export interface Lead {
  id: string | number;
  nome: string;
  telefone: string;
  email?: string;
  situacao?: string;
  valor_negocio?: number;
  renda_familiar?: number;
  score?: number;
  empreendimento?: { id?: number; nome?: string } | null;
  interacoes?: Array<{ descricao?: string; data_cad?: string }>;
  data_cadastro?: string;
  tags?: string[];
}

export interface UrgencyScore {
  score: number; // 0-100, higher = more urgent
  priority: "critical" | "high" | "medium" | "low";
  reasons: string[];
  category: "contact-now" | "loss-risk" | "opportunity" | "overdue" | "normal";
  daysInactive: number;
  actionLabel: string;
}

// Constants
const UNKNOWN_DAYS_INACTIVE = 999; // Used when no date information is available

/**
 * Calculate urgency score for a lead
 */
export function calculateUrgency(lead: Lead): UrgencyScore {
  let score = 0;
  const reasons: string[] = [];
  let category: UrgencyScore["category"] = "normal";
  
  const now = Date.now();
  
  // Calculate days since last interaction
  const lastInteraction = lead.interacoes?.[lead.interacoes.length - 1];
  const lastDate = lastInteraction?.data_cad ? Date.parse(lastInteraction.data_cad) : 
                   lead.data_cadastro ? Date.parse(lead.data_cadastro) : null;
  
  // Validate date parsing
  const daysInactive = lastDate && !isNaN(lastDate)
    ? Math.round((now - lastDate) / (1000 * 60 * 60 * 24))
    : UNKNOWN_DAYS_INACTIVE;
  
  // Factor 1: Days without contact (0-40 points)
  if (daysInactive === 0) {
    score += 10;
  } else if (daysInactive <= 2) {
    score += 35; // Hot lead, maintain momentum
    reasons.push(`Contato recente (${daysInactive}d)`);
  } else if (daysInactive <= 5) {
    score += 30;
    reasons.push(`Aguardando follow-up (${daysInactive}d)`);
  } else if (daysInactive <= 7) {
    score += 25;
    reasons.push(`Prestes a esfriar (${daysInactive}d sem contato)`);
  } else if (daysInactive <= 14) {
    score += 15;
    reasons.push(`Lead esfriando (${daysInactive}d sem contato)`);
  } else if (daysInactive <= 30) {
    score += 10;
    reasons.push(`Lead frio (${daysInactive}d sem contato)`);
  } else {
    score += 5;
    reasons.push(`Lead muito frio (${daysInactive}d sem contato)`);
  }
  
  // Factor 2: Lead score from system (0-25 points)
  if (lead.score) {
    const scorePoints = Math.min(25, Math.round(lead.score / 4));
    score += scorePoints;
    if (lead.score >= 80) {
      reasons.push("Lead qualificado (score alto)");
    }
  }
  
  // Factor 3: Financial value (0-20 points)
  if (lead.valor_negocio && lead.valor_negocio > 0) {
    if (lead.valor_negocio >= 500000) {
      score += 20;
      reasons.push(`Alto valor (R$ ${(lead.valor_negocio / 1000).toFixed(0)}k)`);
    } else if (lead.valor_negocio >= 300000) {
      score += 15;
      reasons.push("Valor médio-alto");
    } else if (lead.valor_negocio >= 150000) {
      score += 10;
    }
  }
  
  // Factor 4: Has property of interest (0-15 points)
  if (lead.empreendimento?.nome) {
    score += 15;
    reasons.push(`Interesse em ${lead.empreendimento.nome}`);
  }
  
  // Determine category
  const situacaoLower = (lead.situacao || "").toLowerCase();
  
  if (situacaoLower.includes("vend") || situacaoLower.includes("convers")) {
    category = "normal";
    score = 0; // Already converted
  } else if (situacaoLower.includes("perd")) {
    category = "normal";
    score = 0; // Already lost
  } else if (daysInactive >= 14 && score > 20) {
    category = "loss-risk";
    reasons.unshift("⚠️ RISCO: Lead valioso esfriando");
  } else if (daysInactive >= 7 && daysInactive < 14) {
    category = "overdue";
    reasons.unshift("Ação atrasada - retomar contato");
  } else if (daysInactive <= 3 && score >= 60) {
    category = "opportunity";
    reasons.unshift("🔥 QUENTE: Alta chance de conversão");
  } else if (daysInactive >= 5 && daysInactive <= 7 && score >= 40) {
    category = "contact-now";
    reasons.unshift("Momento crítico - contatar hoje");
  }
  
  // Determine priority
  let priority: UrgencyScore["priority"];
  if (score >= 70) {
    priority = "critical";
  } else if (score >= 50) {
    priority = "high";
  } else if (score >= 30) {
    priority = "medium";
  } else {
    priority = "low";
  }
  
  // Action label
  let actionLabel = "Ver detalhes";
  if (category === "contact-now") {
    actionLabel = "Contatar agora";
  } else if (category === "loss-risk") {
    actionLabel = "Recuperar lead";
  } else if (category === "opportunity") {
    actionLabel = "Fechar venda";
  } else if (category === "overdue") {
    actionLabel = "Retomar contato";
  }
  
  return {
    score,
    priority,
    reasons,
    category,
    daysInactive,
    actionLabel,
  };
}

/**
 * Categorize and sort leads by urgency
 */
export function categorizeLeads(leads: Lead[]) {
  const leadsWithUrgency = leads.map((lead) => ({
    lead,
    urgency: calculateUrgency(lead),
  }));
  
  // Sort by urgency score (descending)
  leadsWithUrgency.sort((a, b) => b.urgency.score - a.urgency.score);
  
  // Categorize
  const contactNow = leadsWithUrgency.filter(l => l.urgency.category === "contact-now").slice(0, 5);
  const lossRisks = leadsWithUrgency.filter(l => l.urgency.category === "loss-risk").slice(0, 5);
  const opportunities = leadsWithUrgency.filter(l => l.urgency.category === "opportunity").slice(0, 5);
  const overdue = leadsWithUrgency.filter(l => l.urgency.category === "overdue").slice(0, 5);
  
  // Fill contact-now with high-priority leads if empty
  if (contactNow.length < 3) {
    const highPriority = leadsWithUrgency
      .filter(l => l.urgency.priority === "critical" || l.urgency.priority === "high")
      .filter(l => !contactNow.includes(l) && !lossRisks.includes(l) && !opportunities.includes(l))
      .slice(0, 5 - contactNow.length);
    contactNow.push(...highPriority);
  }
  
  return {
    contactNow: contactNow.slice(0, 5),
    lossRisks: lossRisks.slice(0, 5),
    opportunities: opportunities.slice(0, 5),
    overdue: overdue.slice(0, 5),
    all: leadsWithUrgency,
  };
}

/**
 * Get summary statistics
 */
export function getUrgencyStats(leads: Lead[]) {
  const categories = categorizeLeads(leads);
  
  return {
    totalLeads: leads.length,
    criticalActions: categories.contactNow.length,
    atRisk: categories.lossRisks.length,
    hotOpportunities: categories.opportunities.length,
    overdue: categories.overdue.length,
  };
}
