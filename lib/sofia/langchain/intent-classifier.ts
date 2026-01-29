import { z } from 'zod';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { EmotionalState } from '../psychology/types';
import { getAnalysisModel } from './config';

// Schema for extracted entities from user messages
const ExtractedEntitiesSchema = z.object({
  empreendimento: z.string().optional().describe('Nome do empreendimento mencionado'),
  bairro: z.string().optional().describe('Bairro ou região de interesse'),
  cidade: z.string().optional().describe('Cidade mencionada'),
  quartos: z.number().optional().describe('Número de quartos desejados'),
  valorMinimo: z.number().optional().describe('Valor mínimo mencionado'),
  valorMaximo: z.number().optional().describe('Valor máximo ou orçamento'),
  metragem: z.number().optional().describe('Metragem desejada em m²'),
  tipologia: z.string().optional().describe('Tipo de imóvel (apartamento, casa, etc)'),
  finalidade: z.enum(['moradia', 'investimento', 'ambos']).optional().describe('Finalidade da compra'),
  urgencia: z.enum(['imediata', 'curto_prazo', 'medio_prazo', 'longo_prazo']).optional().describe('Urgência da compra'),
  caracteristicas: z.array(z.string()).optional().describe('Características específicas mencionadas (varanda, piscina, etc)'),
});

// Main intent classification schema
export const IntentSchema = z.object({
  intent: z.string().describe('A intenção detectada do usuário em português'),
  category: z.enum([
    'busca',        // Procurando imóveis
    'simulacao',    // Quer simular financiamento
    'informacao',   // Buscando informações sobre imóvel/empreendimento
    'suporte',      // Precisa de ajuda/suporte
    'objecao',      // Apresentando objeções ou dúvidas
    'conversacao',  // Conversa casual/saudações
    'decisao',      // Próximo de tomar decisão
  ]).describe('Categoria principal da intenção'),
  confidence: z.number().min(0).max(1).describe('Nível de confiança na classificação (0-1)'),
  emotionalTone: z.enum([
    'positivo',   // Animado, interessado, satisfeito
    'neutro',     // Tom neutro, apenas buscando informação
    'negativo',   // Frustrado, descontente
    'urgente',    // Precisa de resposta rápida
    'ansioso',    // Preocupado, inseguro sobre a decisão
  ]).describe('Tom emocional detectado na mensagem'),
  extractedEntities: ExtractedEntitiesSchema.describe('Entidades extraídas da mensagem'),
  suggestedAction: z.string().describe('Ação sugerida para a Sofia responder adequadamente'),
});

export type IntentClassification = z.infer<typeof IntentSchema>;
export type ExtractedEntities = z.infer<typeof ExtractedEntitiesSchema>;

const CLASSIFICATION_PROMPT = `Você é um sistema de análise de intenções especializado em vendas de imóveis no Brasil.
Sua tarefa é analisar mensagens de clientes potenciais e classificar suas intenções.

## Contexto
Você está analisando mensagens enviadas para a Sofia, uma corretora virtual de imóveis.
Os clientes podem estar em diferentes estágios do funil de vendas.

## Histórico da Conversa
{history}

## Mensagem Atual do Cliente
{message}

## Instruções de Análise

### 1. Identificação de Intenção
Determine a intenção principal do cliente considerando:
- O que ele está buscando ou perguntando
- O contexto do histórico da conversa
- Sinais de interesse ou desinteresse

### 2. Categorização
Classifique em uma das categorias:
- **busca**: Cliente procurando imóveis (ex: "quero um apartamento de 3 quartos")
- **simulacao**: Interesse em financiamento (ex: "quanto fica a parcela?")
- **informacao**: Buscando detalhes específicos (ex: "qual a metragem?")
- **suporte**: Precisa de ajuda (ex: "como faço para agendar visita?")
- **objecao**: Apresentando resistência (ex: "está muito caro", "preciso pensar")
- **conversacao**: Interação social (ex: "bom dia", "obrigado")
- **decisao**: Sinais de fechamento (ex: "vou levar", "como faço para reservar?")

### 3. Tom Emocional
Identifique o estado emocional:
- **positivo**: Entusiasmo, interesse genuíno, satisfação
- **neutro**: Apenas buscando informações, sem emoção aparente
- **negativo**: Frustração, descontentamento, reclamação
- **urgente**: Pressa, necessidade imediata
- **ansioso**: Insegurança, muitas perguntas, hesitação

### 4. Extração de Entidades
Extraia informações mencionadas sobre:
- Empreendimentos específicos
- Localização (bairro, cidade)
- Características do imóvel (quartos, metragem)
- Valores e orçamento
- Finalidade e urgência

### 5. Ação Sugerida
Recomende a melhor abordagem para responder:
- Se deve mostrar opções de imóveis
- Se deve fazer perguntas de qualificação
- Se deve tratar objeções
- Se deve avançar para próximos passos
- Como adaptar o tom da resposta

Analise a mensagem e retorne a classificação estruturada.`;

export class IntentClassifier {
  private model: ChatOpenAI;
  private prompt: ChatPromptTemplate;

  constructor() {
    this.model = getAnalysisModel();
    this.prompt = ChatPromptTemplate.fromTemplate(CLASSIFICATION_PROMPT);
  }

  async classify(message: string, history: string = ''): Promise<IntentClassification> {
    try {
      // Create structured output model
      const structuredModel = this.model.withStructuredOutput(IntentSchema, {
        name: 'intent_classification',
      });

      // Format the prompt
      const formattedPrompt = await this.prompt.format({
        message,
        history: history || 'Nenhum histórico disponível - primeira mensagem da conversa.',
      });

      // Get classification
      const result = await structuredModel.invoke(formattedPrompt);

      return result;
    } catch (error) {
      console.error('[IntentClassifier] Error classifying intent:', error);

      // Return a safe default classification
      return {
        intent: 'Não foi possível classificar a intenção',
        category: 'conversacao',
        confidence: 0.3,
        emotionalTone: 'neutro',
        extractedEntities: {},
        suggestedAction: 'Responder de forma amigável e tentar entender melhor a necessidade do cliente',
      };
    }
  }

  /**
   * Classify with additional context about the lead
   */
  async classifyWithContext(
    message: string,
    history: string,
    leadContext?: {
      name?: string;
      previousInteractions?: number;
      lastIntent?: string;
      currentStage?: string;
    }
  ): Promise<IntentClassification> {
    let enrichedHistory = history;

    if (leadContext) {
      const contextInfo = [];
      if (leadContext.name) {
        contextInfo.push(`Nome do cliente: ${leadContext.name}`);
      }
      if (leadContext.previousInteractions) {
        contextInfo.push(`Interações anteriores: ${leadContext.previousInteractions}`);
      }
      if (leadContext.lastIntent) {
        contextInfo.push(`Última intenção detectada: ${leadContext.lastIntent}`);
      }
      if (leadContext.currentStage) {
        contextInfo.push(`Estágio atual no funil: ${leadContext.currentStage}`);
      }

      if (contextInfo.length > 0) {
        enrichedHistory = `## Contexto do Lead\n${contextInfo.join('\n')}\n\n## Histórico\n${history}`;
      }
    }

    return this.classify(message, enrichedHistory);
  }

  /**
   * Map emotional tone to EmotionalState for psychology integration
   */
  mapToEmotionalState(tone: IntentClassification['emotionalTone']): Partial<EmotionalState> {
    const mappings: Record<typeof tone, Partial<EmotionalState>> = {
      positivo: {
        current: 'entusiasmo',
        intensity: 0.7,
        trend: 'improving',
      },
      neutro: {
        current: 'interesse',
        intensity: 0.5,
        trend: 'stable',
      },
      negativo: {
        current: 'frustração',
        intensity: 0.6,
        trend: 'declining',
      },
      urgente: {
        current: 'ansiedade',
        intensity: 0.8,
        trend: 'stable',
      },
      ansioso: {
        current: 'ansiedade',
        intensity: 0.6,
        trend: 'declining',
      },
    };

    return mappings[tone] || mappings.neutro;
  }
}

// Singleton instance for reuse
let classifierInstance: IntentClassifier | null = null;

export function getIntentClassifier(): IntentClassifier {
  if (!classifierInstance) {
    classifierInstance = new IntentClassifier();
  }
  return classifierInstance;
}
