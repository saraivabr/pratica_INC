/**
 * Analisador Psicológico Profundo - Sistema de IA Emocional
 *
 * Este módulo analisa mensagens como um PSICÓLOGO especializado
 * em comportamento de compra imobiliária.
 *
 * Princípios fundamentais:
 * - Pessoas não compram imóveis, compram SONHOS, SEGURANÇA, STATUS, PERTENCIMENTO
 * - Cada objeção esconde um MEDO
 * - Cada pergunta esconde uma ESPERANÇA
 * - Pessoas querem CONECTAR antes de comprar
 */

import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

import type {
  PsychologicalAnalysis,
  PrimaryMotivation,
  UnderlyingEmotion,
  ConnectionStrategy,
} from "../psychology/types";

import { getAnalysisModel } from "./config";

// =============================================================================
// SCHEMA DE VALIDAÇÃO COM ZOD
// =============================================================================

/**
 * Schema Zod que espelha exatamente a interface PsychologicalAnalysis
 */
export const PsychologySchema = z.object({
  primaryMotivation: z.enum([
    "security",
    "achievement",
    "belonging",
    "autonomy",
    "self_actualization",
  ] as const).describe("Motivação primária detectada na mensagem"),

  underlyingEmotion: z.enum([
    "medo",
    "esperanca",
    "frustração",
    "entusiasmo",
    "ansiedade",
    "confianca",
    "duvida",
  ] as const).describe("Emoção subjacente que a pessoa está sentindo"),

  unspokenNeed: z
    .string()
    .describe("O que a pessoa realmente precisa mas não disse explicitamente"),

  connectionStrategy: z.enum([
    "validar_sentimentos",
    "oferecer_seguranca",
    "inspirar_possibilidades",
    "ser_direto_pratico",
    "construir_confianca",
    "criar_urgencia_suave",
  ] as const).describe("Estratégia recomendada para conectar emocionalmente"),

  rapportLevel: z
    .number()
    .min(0)
    .max(10)
    .describe("Nível de conexão/rapport atual de 0 a 10"),

  nextEmotionalStep: z
    .string()
    .describe("Próximo passo para aprofundar a conexão humana"),

  reasoning: z
    .string()
    .describe("Raciocínio completo da análise psicológica"),
});

// Tipo inferido do schema para type-safety
export type PsychologySchemaType = z.infer<typeof PsychologySchema>;

// =============================================================================
// PROMPT DE ANÁLISE PSICOLÓGICA PROFUNDA
// =============================================================================

const PSYCHOLOGY_PROMPT_TEMPLATE = `Você é uma PSICÓLOGA especializada em comportamento de compra imobiliária.

Sua missão: Entender o SER HUMANO por trás da mensagem, não apenas as palavras.

## VERDADES FUNDAMENTAIS QUE VOCÊ SABE:

1. **Pessoas não compram imóveis** - Elas compram:
   - SONHOS (a vida que imaginam ter)
   - SEGURANÇA (proteção para quem amam)
   - STATUS (reconhecimento do que conquistaram)
   - PERTENCIMENTO (um lugar para chamar de lar)

2. **Cada objeção esconde um MEDO**
   - "Tá caro" = Medo de não conseguir pagar / não valer a pena
   - "Preciso pensar" = Medo de errar / de se comprometer
   - "Vou ver outros" = Medo de estar perdendo algo melhor
   - "Não tenho pressa" = Medo de ser pressionado / manipulado

3. **Cada pergunta esconde uma ESPERANÇA**
   - Perguntas sobre localização = Esperança de vida melhor
   - Perguntas sobre preço = Esperança de conseguir realizar
   - Perguntas sobre lazer = Esperança de qualidade de vida
   - Perguntas sobre segurança = Esperança de proteção da família

4. **Pessoas querem CONECTAR antes de comprar**
   - Precisam se sentir OUVIDAS
   - Precisam sentir que você ENTENDE
   - Precisam confiar que você quer AJUDAR, não vender

## MOTIVAÇÕES HUMANAS (Hierarquia de Maslow Imobiliária):

- **security**: Proteção, estabilidade, lar seguro para família
- **achievement**: Status, qualidade de vida, reconhecimento do sucesso
- **belonging**: Comunidade, família, criar raízes, deixar legado
- **autonomy**: Sair do aluguel, ter controle, independência
- **self_actualization**: Sonho de vida realizado, meta atingida

## EMOÇÕES SUBJACENTES:

- **medo**: Medo de perder, errar, se arrepender
- **esperanca**: Esperança de vida melhor, de conseguir
- **frustração**: Frustrado com situação atual
- **entusiasmo**: Animado com possibilidade
- **ansiedade**: Preocupado com decisão grande
- **confianca**: Seguro do que quer
- **duvida**: Incerto, precisa de orientação

## ESTRATÉGIAS DE CONEXÃO:

- **validar_sentimentos**: Para quem precisa se sentir ouvido
- **oferecer_seguranca**: Para quem precisa de certezas
- **inspirar_possibilidades**: Para quem precisa ver o sonho
- **ser_direto_pratico**: Para quem quer eficiência
- **construir_confianca**: Para quem precisa de provas
- **criar_urgencia_suave**: Para quem precisa de empurrão gentil

## CONTEXTO DA CONVERSA:

Histórico recente:
{conversationHistory}

Mensagem atual do usuário:
"{userMessage}"

Perfil conhecido (se houver):
{userProfile}

## SUA ANÁLISE:

Analise PROFUNDAMENTE esta mensagem. Vá além das palavras.
- O que essa pessoa REALMENTE está sentindo?
- O que ela PRECISA mas não disse?
- Qual MEDO pode estar escondido?
- Qual ESPERANÇA está por trás?
- Como criar CONEXÃO GENUÍNA?

Responda em JSON válido com a seguinte estrutura:
{{
  "primaryMotivation": "security" | "achievement" | "belonging" | "autonomy" | "self_actualization",
  "underlyingEmotion": "medo" | "esperanca" | "frustração" | "entusiasmo" | "ansiedade" | "confianca" | "duvida",
  "unspokenNeed": "string - necessidade não-dita detectada",
  "connectionStrategy": "validar_sentimentos" | "oferecer_seguranca" | "inspirar_possibilidades" | "ser_direto_pratico" | "construir_confianca" | "criar_urgencia_suave",
  "rapportLevel": número de 0 a 10,
  "nextEmotionalStep": "string - próximo passo para conectar mais",
  "reasoning": "string - seu raciocínio completo"
}}

IMPORTANTE:
- Seja HUMANA na análise, não robótica
- Foque em ENTENDER, não em vender
- Lembre-se: por trás de cada mensagem há um ser humano com sonhos e medos`;

// =============================================================================
// CLASSE ANALISADORA PSICOLÓGICA
// =============================================================================

export interface PsychologyAnalyzerInput {
  userMessage: string;
  conversationHistory?: string;
  userProfile?: string;
}

export interface PsychologyAnalyzerOptions {
  model?: ChatOpenAI;
  verbose?: boolean;
}

/**
 * Analisador Psicológico usando LangChain
 *
 * Analisa mensagens como um psicólogo especializado em comportamento
 * de compra imobiliária, focando no ser humano por trás das palavras.
 */
export class PsychologyAnalyzer {
  private model: ChatOpenAI;
  private promptTemplate: PromptTemplate;
  private verbose: boolean;

  constructor(options: PsychologyAnalyzerOptions = {}) {
    this.model = options.model ?? getAnalysisModel();
    this.verbose = options.verbose ?? false;

    this.promptTemplate = new PromptTemplate({
      template: PSYCHOLOGY_PROMPT_TEMPLATE,
      inputVariables: ["userMessage", "conversationHistory", "userProfile"],
    });
  }

  /**
   * Analisa uma mensagem e retorna insights psicológicos profundos
   */
  async analyze(input: PsychologyAnalyzerInput): Promise<PsychologicalAnalysis> {
    const {
      userMessage,
      conversationHistory = "Primeira interação",
      userProfile = "Sem perfil prévio",
    } = input;

    try {
      // Formata o prompt com os inputs
      const formattedPrompt = await this.promptTemplate.format({
        userMessage,
        conversationHistory,
        userProfile,
      });

      if (this.verbose) {
        console.log("[PsychologyAnalyzer] Analisando:", userMessage.slice(0, 100));
      }

      // Chama o modelo
      const response = await this.model.invoke(formattedPrompt);

      // Extrai o conteúdo da resposta
      const content = typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

      // Parseia o JSON da resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Resposta não contém JSON válido");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Valida com Zod
      const validated = PsychologySchema.parse(parsed);

      if (this.verbose) {
        console.log("[PsychologyAnalyzer] Resultado:", {
          motivation: validated.primaryMotivation,
          emotion: validated.underlyingEmotion,
          rapport: validated.rapportLevel,
        });
      }

      // Retorna como PsychologicalAnalysis (compatível com o tipo)
      return validated as PsychologicalAnalysis;
    } catch (error) {
      if (this.verbose) {
        console.error("[PsychologyAnalyzer] Erro na análise:", error);
      }

      // Retorna análise padrão em caso de erro
      return this.getDefaultAnalysis(userMessage);
    }
  }

  /**
   * Análise rápida usando heurísticas (sem chamar o modelo)
   * Útil para casos simples ou fallback
   */
  quickAnalyze(userMessage: string): PsychologicalAnalysis {
    const message = userMessage.toLowerCase();

    // Detecta motivação por palavras-chave
    let primaryMotivation: PrimaryMotivation = "belonging";
    if (message.match(/segur|proteg|família|filhos|condomínio fechado/)) {
      primaryMotivation = "security";
    } else if (message.match(/qualidade|luxo|alto padrão|status|melhor/)) {
      primaryMotivation = "achievement";
    } else if (message.match(/aluguel|meu|próprio|independ|liberdade/)) {
      primaryMotivation = "autonomy";
    } else if (message.match(/sonho|sempre quis|vida toda|meta|realiz/)) {
      primaryMotivation = "self_actualization";
    }

    // Detecta emoção
    let underlyingEmotion: UnderlyingEmotion = "esperanca";
    if (message.match(/caro|preço|não sei|medo|receio|dúvida/)) {
      underlyingEmotion = "medo";
    } else if (message.match(/frustr|cansado|chega|demora/)) {
      underlyingEmotion = "frustração";
    } else if (message.match(/ansios|preocup|nervos/)) {
      underlyingEmotion = "ansiedade";
    } else if (message.match(/anim|empolgad|quer|gost|ador/)) {
      underlyingEmotion = "entusiasmo";
    } else if (message.match(/certeza|decid|vou|quero/)) {
      underlyingEmotion = "confianca";
    } else if (message.match(/será|talvez|não sei|pensar/)) {
      underlyingEmotion = "duvida";
    }

    // Define estratégia baseada na emoção
    let connectionStrategy: ConnectionStrategy = "validar_sentimentos";
    switch (underlyingEmotion) {
      case "medo":
      case "ansiedade":
        connectionStrategy = "oferecer_seguranca";
        break;
      case "frustração":
        connectionStrategy = "validar_sentimentos";
        break;
      case "entusiasmo":
        connectionStrategy = "inspirar_possibilidades";
        break;
      case "confianca":
        connectionStrategy = "ser_direto_pratico";
        break;
      case "duvida":
        connectionStrategy = "construir_confianca";
        break;
    }

    return {
      primaryMotivation,
      underlyingEmotion,
      unspokenNeed: this.inferUnspokenNeed(primaryMotivation, underlyingEmotion),
      connectionStrategy,
      rapportLevel: 5,
      nextEmotionalStep: this.getNextStep(connectionStrategy),
      reasoning: "Análise rápida por heurísticas (sem modelo)",
    };
  }

  /**
   * Infere necessidade não-dita baseada na motivação e emoção
   */
  private inferUnspokenNeed(
    motivation: PrimaryMotivation,
    emotion: UnderlyingEmotion
  ): string {
    const needs: Record<PrimaryMotivation, Record<UnderlyingEmotion, string>> = {
      security: {
        medo: "Precisa de garantias de que sua família estará protegida",
        esperanca: "Sonha com um lugar onde possa dormir tranquilo",
        frustração: "Está cansado de se preocupar com segurança",
        entusiasmo: "Animado com a possibilidade de ter paz",
        ansiedade: "Preocupado se vai conseguir oferecer segurança à família",
        confianca: "Sabe o que precisa para se sentir seguro",
        duvida: "Não tem certeza se o investimento vale a segurança",
      },
      achievement: {
        medo: "Tem medo de não conseguir manter o padrão",
        esperanca: "Quer um lugar que reflita suas conquistas",
        frustração: "Sente que merece mais do que tem",
        entusiasmo: "Animado em mostrar que chegou lá",
        ansiedade: "Preocupado com o que os outros vão pensar",
        confianca: "Sabe exatamente o padrão que quer",
        duvida: "Incerto se é o momento certo para dar esse passo",
      },
      belonging: {
        medo: "Tem medo de escolher o lugar errado para sua família",
        esperanca: "Sonha em criar memórias em um verdadeiro lar",
        frustração: "Cansado de não ter raízes",
        entusiasmo: "Animado para começar uma nova fase",
        ansiedade: "Preocupado se a família vai se adaptar",
        confianca: "Sabe que está pronto para criar um lar",
        duvida: "Incerto sobre qual o melhor lugar para a família",
      },
      autonomy: {
        medo: "Tem medo de se endividar e perder a liberdade",
        esperanca: "Sonha em não depender mais de ninguém",
        frustração: "Frustrado com as limitações do aluguel",
        entusiasmo: "Animado em ter seu próprio espaço",
        ansiedade: "Preocupado com a responsabilidade",
        confianca: "Decidido a conquistar sua independência",
        duvida: "Incerto se está preparado financeiramente",
      },
      self_actualization: {
        medo: "Tem medo de o sonho ser maior que a realidade",
        esperanca: "Sente que finalmente chegou sua hora",
        frustração: "Frustrado por ainda não ter realizado o sonho",
        entusiasmo: "Vibrando com a proximidade da conquista",
        ansiedade: "Ansioso para que tudo dê certo",
        confianca: "Certo de que merece essa realização",
        duvida: "Se perguntando se é realmente isso que quer",
      },
    };

    return needs[motivation]?.[emotion] ?? "Precisa ser compreendido e orientado";
  }

  /**
   * Define próximo passo baseado na estratégia
   */
  private getNextStep(strategy: ConnectionStrategy): string {
    const steps: Record<ConnectionStrategy, string> = {
      validar_sentimentos:
        "Reconhecer e validar o que a pessoa está sentindo antes de qualquer coisa",
      oferecer_seguranca:
        "Apresentar fatos e garantias que reduzam a sensação de risco",
      inspirar_possibilidades:
        "Pintar o quadro do futuro que a pessoa pode ter",
      ser_direto_pratico:
        "Ir direto ao ponto com informações objetivas",
      construir_confianca:
        "Compartilhar provas sociais e demonstrar expertise",
      criar_urgencia_suave:
        "Mostrar gentilmente o custo de esperar demais",
    };

    return steps[strategy];
  }

  /**
   * Retorna análise padrão para fallback
   */
  private getDefaultAnalysis(message: string): PsychologicalAnalysis {
    // Usa a análise rápida como fallback
    return this.quickAnalyze(message);
  }
}

// =============================================================================
// INSTÂNCIA SINGLETON PARA USO SIMPLES
// =============================================================================

let _analyzerInstance: PsychologyAnalyzer | null = null;

/**
 * Obtém a instância singleton do analisador
 */
export function getPsychologyAnalyzer(): PsychologyAnalyzer {
  if (!_analyzerInstance) {
    _analyzerInstance = new PsychologyAnalyzer();
  }
  return _analyzerInstance;
}

/**
 * Função utilitária para análise rápida
 */
export async function analyzePsychology(
  userMessage: string,
  conversationHistory?: string,
  userProfile?: string
): Promise<PsychologicalAnalysis> {
  const analyzer = getPsychologyAnalyzer();
  return analyzer.analyze({
    userMessage,
    conversationHistory,
    userProfile,
  });
}

/**
 * Função utilitária para análise rápida sem modelo (heurísticas)
 */
export function quickAnalyzePsychology(
  userMessage: string
): PsychologicalAnalysis {
  const analyzer = getPsychologyAnalyzer();
  return analyzer.quickAnalyze(userMessage);
}
