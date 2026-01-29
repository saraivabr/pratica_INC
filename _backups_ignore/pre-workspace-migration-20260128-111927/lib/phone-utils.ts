/**
 * @fileoverview Utilitarios para manipulacao e normalizacao de telefones brasileiros
 * @module lib/phone-utils
 * @description Funcoes para normalizar, validar e comparar numeros de telefone
 * brasileiros em diversos formatos.
 */

// =============================================================================
// CONSTANTES
// =============================================================================

/**
 * DDDs validos no Brasil (regioes metropolitanas e estados)
 */
export const VALID_DDD = [
  // SP
  '11', '12', '13', '14', '15', '16', '17', '18', '19',
  // RJ e ES
  '21', '22', '24', '27', '28',
  // MG
  '31', '32', '33', '34', '35', '37', '38',
  // PR
  '41', '42', '43', '44', '45', '46',
  // SC
  '47', '48', '49',
  // RS
  '51', '53', '54', '55',
  // DF, GO, TO, MT, MS
  '61', '62', '63', '64', '65', '66', '67', '68', '69',
  // BA, SE
  '71', '73', '74', '75', '77', '79',
  // PE, AL, PB, RN
  '81', '82', '83', '84', '85', '86', '87', '88', '89',
  // CE, PI, MA
  '91', '92', '93', '94', '95', '96', '97', '98', '99',
] as const;

/**
 * Codigo do pais Brasil
 */
export const BRAZIL_COUNTRY_CODE = '55';

// =============================================================================
// TIPOS
// =============================================================================

export interface NormalizedPhone {
  /** Numero original recebido */
  original: string;
  /** Apenas digitos */
  digits: string;
  /** Codigo do pais (55 para Brasil) */
  countryCode: string | null;
  /** DDD (codigo de area) */
  areaCode: string | null;
  /** Numero local (8 ou 9 digitos) */
  localNumber: string;
  /** Numero completo normalizado (11 digitos: DDD + local) */
  normalized: string;
  /** Numero para comparacao (ultimos 9 digitos) */
  compareKey: string;
  /** Se eh um celular (9 digitos) */
  isMobile: boolean;
  /** Se eh um fixo (8 digitos) */
  isLandline: boolean;
  /** Se o telefone parece valido */
  isValid: boolean;
  /** Motivo de invalidez */
  invalidReason?: string;
}

export interface PhoneMatchResult {
  matched: boolean;
  confidence: 'exact' | 'high' | 'medium' | 'low' | 'none';
  matchType?: 'full' | 'local_only' | 'fuzzy_9digit' | 'fuzzy_8digit';
  details: string;
}

// =============================================================================
// FUNCOES DE NORMALIZACAO
// =============================================================================

/**
 * Remove todos os caracteres nao numericos de um telefone
 * @param phone - Telefone em qualquer formato
 * @returns Apenas os digitos
 */
export function cleanPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

/**
 * Normaliza um numero de telefone brasileiro para formato padrao
 * Lida com diversos formatos de entrada:
 * - "+55 11 99999-9999"
 * - "55 11 999999999"
 * - "(11) 9999-9999" (fixo antigo)
 * - "11999999999"
 * - "999999999" (sem DDD)
 *
 * @param phone - Telefone em qualquer formato
 * @param defaultDDD - DDD padrao se nao especificado (ex: '11')
 * @returns Objeto com informacoes detalhadas do telefone normalizado
 */
export function normalizePhone(
  phone: string | null | undefined,
  defaultDDD?: string
): NormalizedPhone {
  const original = phone || '';
  const digits = cleanPhone(original);

  // Resultado padrao para telefone invalido
  const invalidResult = (reason: string): NormalizedPhone => ({
    original,
    digits,
    countryCode: null,
    areaCode: null,
    localNumber: '',
    normalized: '',
    compareKey: '',
    isMobile: false,
    isLandline: false,
    isValid: false,
    invalidReason: reason,
  });

  // Verificacoes basicas
  if (!digits) {
    return invalidResult('Telefone vazio');
  }

  if (digits.length < 8) {
    return invalidResult('Telefone muito curto (minimo 8 digitos)');
  }

  if (digits.length > 13) {
    return invalidResult('Telefone muito longo (maximo 13 digitos)');
  }

  let countryCode: string | null = null;
  let areaCode: string | null = null;
  let localNumber: string = '';

  // Processar baseado no tamanho
  if (digits.length === 13) {
    // +55 + DDD + 9 digitos: 55 11 999999999
    countryCode = digits.substring(0, 2);
    areaCode = digits.substring(2, 4);
    localNumber = digits.substring(4);
  } else if (digits.length === 12) {
    // +55 + DDD + 8 digitos: 55 11 99999999 (fixo ou celular sem 9)
    countryCode = digits.substring(0, 2);
    areaCode = digits.substring(2, 4);
    localNumber = digits.substring(4);
  } else if (digits.length === 11) {
    // DDD + 9 digitos: 11 999999999
    areaCode = digits.substring(0, 2);
    localNumber = digits.substring(2);
  } else if (digits.length === 10) {
    // DDD + 8 digitos: 11 99999999 (fixo ou celular antigo)
    areaCode = digits.substring(0, 2);
    localNumber = digits.substring(2);
  } else if (digits.length === 9) {
    // Apenas numero local com 9 digitos: 999999999
    areaCode = defaultDDD || null;
    localNumber = digits;
  } else if (digits.length === 8) {
    // Apenas numero local com 8 digitos: 99999999
    areaCode = defaultDDD || null;
    localNumber = digits;
  }

  // Validar codigo do pais
  if (countryCode && countryCode !== BRAZIL_COUNTRY_CODE) {
    return invalidResult(`Codigo de pais invalido: ${countryCode} (esperado: ${BRAZIL_COUNTRY_CODE})`);
  }

  // Validar DDD
  if (areaCode && !VALID_DDD.includes(areaCode as typeof VALID_DDD[number])) {
    return invalidResult(`DDD invalido: ${areaCode}`);
  }

  // Determinar tipo de telefone
  const isMobile = localNumber.length === 9 && localNumber.startsWith('9');
  const isLandline = localNumber.length === 8 && !localNumber.startsWith('9');

  // Para celulares de 8 digitos, adicionar o 9 inicial se necessario
  let normalizedLocal = localNumber;
  if (localNumber.length === 8 && !localNumber.startsWith('9')) {
    // Eh fixo, manter como esta
  } else if (localNumber.length === 8 && localNumber.startsWith('9')) {
    // Celular antigo sem o 9 adicional - nao adicionar automaticamente
    // pois pode ser ambiguo
  }

  // Montar numero normalizado (sempre 11 digitos: DDD + local)
  let normalized = '';
  if (areaCode) {
    // Normalizar para 9 digitos se for celular de 8 digitos
    if (normalizedLocal.length === 8 && normalizedLocal.charAt(0) >= '6') {
      // Celulares comecam com 6, 7, 8, 9 - adicionar o 9
      normalizedLocal = '9' + normalizedLocal;
    }
    normalized = areaCode + normalizedLocal;
  }

  // Chave para comparacao (ultimos 9 digitos)
  // Isso permite match mesmo com/sem DDD e com/sem codigo de pais
  const compareKey = normalizedLocal.slice(-9).padStart(9, '0');

  return {
    original,
    digits,
    countryCode,
    areaCode,
    localNumber,
    normalized,
    compareKey,
    isMobile: normalizedLocal.length === 9 && normalizedLocal.startsWith('9'),
    isLandline: normalizedLocal.length === 8 || (normalizedLocal.length === 9 && !normalizedLocal.startsWith('9')),
    isValid: normalized.length >= 10,
  };
}

/**
 * Extrai apenas os ultimos N digitos de um telefone para comparacao
 * @param phone - Telefone em qualquer formato
 * @param length - Quantidade de digitos (padrao: 9)
 * @returns Ultimos N digitos
 */
export function getLastDigits(phone: string | null | undefined, length: number = 9): string {
  const digits = cleanPhone(phone);
  if (digits.length < length) {
    return digits.padStart(length, '0');
  }
  return digits.slice(-length);
}

/**
 * Normaliza telefone para formato de comparacao padrao
 * Retorna os ultimos 11 digitos (DDD + 9 digitos) ou o que tiver disponivel
 * @param phone - Telefone em qualquer formato
 * @returns Telefone normalizado para comparacao
 */
export function normalizeForComparison(phone: string | null | undefined): string {
  const normalized = normalizePhone(phone);
  return normalized.normalized || normalized.digits.slice(-11);
}

// =============================================================================
// FUNCOES DE COMPARACAO
// =============================================================================

/**
 * Compara dois telefones com tolerancia para diferentes formatos
 * Retorna informacoes detalhadas sobre a qualidade do match
 *
 * @param phone1 - Primeiro telefone
 * @param phone2 - Segundo telefone
 * @returns Resultado detalhado da comparacao
 */
export function comparePhones(
  phone1: string | null | undefined,
  phone2: string | null | undefined
): PhoneMatchResult {
  const normalized1 = normalizePhone(phone1);
  const normalized2 = normalizePhone(phone2);

  // Ambos invalidos ou vazios
  if (!normalized1.isValid && !normalized2.isValid) {
    return {
      matched: false,
      confidence: 'none',
      details: 'Ambos telefones sao invalidos ou vazios',
    };
  }

  // Apenas um invalido
  if (!normalized1.isValid || !normalized2.isValid) {
    return {
      matched: false,
      confidence: 'none',
      details: `Telefone invalido: ${!normalized1.isValid ? normalized1.invalidReason : normalized2.invalidReason}`,
    };
  }

  // Match exato pelo numero normalizado completo (11 digitos)
  if (normalized1.normalized && normalized2.normalized &&
      normalized1.normalized === normalized2.normalized) {
    return {
      matched: true,
      confidence: 'exact',
      matchType: 'full',
      details: `Match exato: ${normalized1.normalized}`,
    };
  }

  // Match pelos ultimos 9 digitos (compareKey)
  if (normalized1.compareKey === normalized2.compareKey) {
    // Verificar se os DDDs sao compativeis quando ambos tem
    if (normalized1.areaCode && normalized2.areaCode) {
      if (normalized1.areaCode === normalized2.areaCode) {
        return {
          matched: true,
          confidence: 'exact',
          matchType: 'full',
          details: `Match completo: DDD ${normalized1.areaCode} + ${normalized1.compareKey}`,
        };
      } else {
        // DDDs diferentes mas numero local igual - provavel erro ou duplicata
        return {
          matched: true,
          confidence: 'medium',
          matchType: 'local_only',
          details: `DDDs diferentes (${normalized1.areaCode} vs ${normalized2.areaCode}) mas numero local igual`,
        };
      }
    }

    // Apenas um tem DDD - ainda considerar match alto
    return {
      matched: true,
      confidence: 'high',
      matchType: 'fuzzy_9digit',
      details: `Match por ultimos 9 digitos: ${normalized1.compareKey}`,
    };
  }

  // Match pelos ultimos 8 digitos (para lidar com presenca/ausencia do 9)
  const last8_1 = getLastDigits(phone1, 8);
  const last8_2 = getLastDigits(phone2, 8);

  if (last8_1 === last8_2 && last8_1.length === 8) {
    return {
      matched: true,
      confidence: 'medium',
      matchType: 'fuzzy_8digit',
      details: `Match por ultimos 8 digitos: ${last8_1} (possivel diferenca no 9o digito)`,
    };
  }

  return {
    matched: false,
    confidence: 'none',
    details: 'Telefones nao correspondem',
  };
}

/**
 * Verifica se dois telefones correspondem (versao simplificada)
 * @param phone1 - Primeiro telefone
 * @param phone2 - Segundo telefone
 * @param minConfidence - Confianca minima para considerar match ('exact', 'high', 'medium', 'low')
 * @returns true se correspondem
 */
export function phonesMatch(
  phone1: string | null | undefined,
  phone2: string | null | undefined,
  minConfidence: 'exact' | 'high' | 'medium' | 'low' = 'high'
): boolean {
  const result = comparePhones(phone1, phone2);

  if (!result.matched) return false;

  const confidenceLevels = ['none', 'low', 'medium', 'high', 'exact'];
  const resultLevel = confidenceLevels.indexOf(result.confidence);
  const minLevel = confidenceLevels.indexOf(minConfidence);

  return resultLevel >= minLevel;
}

// =============================================================================
// FUNCOES DE FORMATACAO
// =============================================================================

/**
 * Formata telefone no padrao brasileiro (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
 * @param phone - Telefone em qualquer formato
 * @returns Telefone formatado ou string vazia se invalido
 */
export function formatPhone(phone: string | null | undefined): string {
  const normalized = normalizePhone(phone);

  if (!normalized.isValid) return '';

  const local = normalized.localNumber;
  const ddd = normalized.areaCode;

  if (!ddd) {
    // Sem DDD, formatar apenas o numero local
    if (local.length === 9) {
      return local.replace(/^(\d{5})(\d{4})$/, '$1-$2');
    }
    if (local.length === 8) {
      return local.replace(/^(\d{4})(\d{4})$/, '$1-$2');
    }
    return local;
  }

  // Com DDD
  if (local.length === 9) {
    return `(${ddd}) ${local.substring(0, 5)}-${local.substring(5)}`;
  }
  if (local.length === 8) {
    return `(${ddd}) ${local.substring(0, 4)}-${local.substring(4)}`;
  }

  return normalized.normalized;
}

/**
 * Formata telefone para uso em links WhatsApp
 * @param phone - Telefone em qualquer formato
 * @param includeCountryCode - Incluir +55 (padrao: true)
 * @returns Telefone formatado para WhatsApp (ex: 5511999999999)
 */
export function formatPhoneForWhatsApp(
  phone: string | null | undefined,
  includeCountryCode: boolean = true
): string {
  const normalized = normalizePhone(phone);

  if (!normalized.isValid || !normalized.normalized) return '';

  if (includeCountryCode) {
    return `${BRAZIL_COUNTRY_CODE}${normalized.normalized}`;
  }

  return normalized.normalized;
}

/**
 * Mascara telefone para exibicao segura: (XX) XXXXX-**XX
 * @param phone - Telefone em qualquer formato
 * @returns Telefone mascarado
 */
export function maskPhone(phone: string | null | undefined): string {
  const normalized = normalizePhone(phone);

  if (!normalized.isValid) return '';

  const local = normalized.localNumber;
  const ddd = normalized.areaCode;

  if (local.length >= 4) {
    const visible = local.substring(0, local.length - 4);
    const masked = '**' + local.substring(local.length - 2);

    if (ddd) {
      return `(${ddd}) ${visible}-${masked}`;
    }
    return `${visible}-${masked}`;
  }

  return '****-****';
}

// =============================================================================
// FUNCOES AUXILIARES
// =============================================================================

/**
 * Verifica se um telefone eh valido
 * @param phone - Telefone em qualquer formato
 * @returns true se valido
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  return normalizePhone(phone).isValid;
}

/**
 * Verifica se um telefone eh celular
 * @param phone - Telefone em qualquer formato
 * @returns true se for celular
 */
export function isMobilePhone(phone: string | null | undefined): boolean {
  const normalized = normalizePhone(phone);
  return normalized.isValid && normalized.isMobile;
}

/**
 * Verifica se um telefone eh fixo
 * @param phone - Telefone em qualquer formato
 * @returns true se for fixo
 */
export function isLandlinePhone(phone: string | null | undefined): boolean {
  const normalized = normalizePhone(phone);
  return normalized.isValid && normalized.isLandline;
}

/**
 * Extrai o DDD de um telefone
 * @param phone - Telefone em qualquer formato
 * @returns DDD ou null
 */
export function extractDDD(phone: string | null | undefined): string | null {
  return normalizePhone(phone).areaCode;
}
