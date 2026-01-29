/**
 * Utilitários para manipulação e validação de CPF
 */

/**
 * Remove todos os caracteres não numéricos do CPF
 * @param cpf - CPF com ou sem formatação
 * @returns Apenas os dígitos numéricos
 */
export function cleanCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';
  return cpf.replace(/\D/g, '');
}

/**
 * Valida se o CPF é válido usando o algoritmo oficial
 * @param cpf - CPF com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export function isValidCPF(cpf: string | null | undefined): boolean {
  if (!cpf) return false;

  const cleaned = cleanCPF(cpf);

  // Deve ter 11 dígitos
  if (cleaned.length !== 11) return false;

  // Rejeita CPFs com todos os dígitos iguais
  if (/^(\d)\1{10}$/.test(cleaned)) return false;

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;

  return true;
}

/**
 * Formata o CPF no padrão XXX.XXX.XXX-XX
 * @param cpf - CPF com ou sem formatação
 * @returns CPF formatado ou string vazia se inválido
 */
export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';

  const cleaned = cleanCPF(cpf);

  if (cleaned.length !== 11) return '';

  if (!isValidCPF(cleaned)) return '';

  return cleaned.replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    '$1.$2.$3-$4'
  );
}

/**
 * Mascara o CPF para exibição segura: XXX.***.***-XX
 * @param cpf - CPF com ou sem formatação
 * @returns CPF mascarado ou string vazia se inválido
 */
export function maskCPF(cpf: string | null | undefined): string {
  if (!cpf) return '';

  const cleaned = cleanCPF(cpf);

  if (cleaned.length !== 11) return '';

  const first = cleaned.substring(0, 3);
  const last = cleaned.substring(9, 11);

  return `${first}.***.***-${last}`;
}
