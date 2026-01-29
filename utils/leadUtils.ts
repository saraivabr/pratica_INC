/**
 * Utility functions for Lead management
 * Provides formatting, validation, and display helpers for lead data
 */

// =============================================================================
// TYPES
// =============================================================================

export type NullableString = string | null | undefined

export type LeadStatus =
  | "novo"
  | "qualificado"
  | "convertido"
  | "ativo"
  | "em_negociacao"
  | "proposta"
  | "aguardando"
  | "follow_up"
  | "perdido"
  | "descartado"
  | "inativo"
  | "arquivado"
  | string

export interface StatusColorConfig {
  bg: string
  text: string
  border: string
  dot?: string
}

export interface DateFormatOptions {
  includeTime?: boolean
  includeSeconds?: boolean
  shortMonth?: boolean
  relative?: boolean
}

export interface DaysSinceResult {
  days: number
  label: string
  isRecent: boolean
  isStale: boolean
  isCritical: boolean
}

// =============================================================================
// CPF UTILITIES
// =============================================================================

/**
 * Formats a CPF string with standard Brazilian mask (XXX.XXX.XXX-XX)
 * @param cpf - Raw CPF string (can contain non-numeric characters)
 * @returns Formatted CPF or original value if invalid
 */
export function formatCPF(cpf: NullableString): string {
  if (!cpf) return ""

  const cleaned = cpf.replace(/\D/g, "")

  // CPF must have exactly 11 digits
  if (cleaned.length !== 11) {
    // Return partially formatted if between 1-10 digits
    if (cleaned.length > 0 && cleaned.length < 11) {
      return cleaned
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    }
    return cpf
  }

  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
}

/**
 * Validates if a CPF has a valid format (does not validate checksum)
 * @param cpf - CPF string to validate
 * @returns True if CPF has 11 digits
 */
export function isValidCPFFormat(cpf: NullableString): boolean {
  if (!cpf) return false
  const cleaned = cpf.replace(/\D/g, "")
  return cleaned.length === 11
}

/**
 * Removes all non-numeric characters from CPF
 * @param cpf - CPF string to clean
 * @returns Clean numeric-only CPF
 */
export function cleanCPF(cpf: NullableString): string {
  if (!cpf) return ""
  return cpf.replace(/\D/g, "")
}

// =============================================================================
// PHONE UTILITIES
// =============================================================================

/**
 * Formats a Brazilian phone number with standard mask
 * Supports both landline (10 digits) and mobile (11 digits)
 * @param phone - Raw phone string
 * @returns Formatted phone or original value if invalid
 */
export function formatPhone(phone: NullableString): string {
  if (!phone) return ""

  const cleaned = phone.replace(/\D/g, "")

  // Mobile with 9 digit: (XX) 9XXXX-XXXX
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  }

  // Landline: (XX) XXXX-XXXX
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
  }

  // Without area code - mobile (9 digits)
  if (cleaned.length === 9) {
    return cleaned.replace(/(\d{5})(\d{4})/, "$1-$2")
  }

  // Without area code - landline (8 digits)
  if (cleaned.length === 8) {
    return cleaned.replace(/(\d{4})(\d{4})/, "$1-$2")
  }

  // Return original if doesn't match expected patterns
  return phone
}

/**
 * Removes all non-numeric characters from phone for use in links
 * @param phone - Phone string to clean
 * @returns Clean numeric-only phone
 */
export function cleanPhone(phone: NullableString): string {
  if (!phone) return ""
  return phone.replace(/\D/g, "")
}

/**
 * Formats phone for WhatsApp link (with country code)
 * @param phone - Phone string
 * @param countryCode - Country code (default: 55 for Brazil)
 * @returns Phone formatted for WhatsApp URL
 */
export function formatPhoneForWhatsApp(
  phone: NullableString,
  countryCode: string = "55"
): string {
  const cleaned = cleanPhone(phone)
  if (!cleaned) return ""
  return `${countryCode}${cleaned}`
}

/**
 * Validates if phone has valid Brazilian format
 * @param phone - Phone to validate
 * @returns True if valid Brazilian phone
 */
export function isValidPhoneFormat(phone: NullableString): boolean {
  if (!phone) return false
  const cleaned = phone.replace(/\D/g, "")
  return cleaned.length >= 8 && cleaned.length <= 11
}

// =============================================================================
// STATUS UTILITIES
// =============================================================================

/**
 * Status color mapping with comprehensive variations
 */
const STATUS_COLORS: Record<string, StatusColorConfig> = {
  // Positive states (green tones)
  qualificado: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
  convertido: {
    bg: "bg-green-50 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    dot: "bg-green-500",
  },
  ativo: {
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-800",
    dot: "bg-teal-500",
  },
  ganho: {
    bg: "bg-lime-50 dark:bg-lime-950/40",
    text: "text-lime-700 dark:text-lime-400",
    border: "border-lime-200 dark:border-lime-800",
    dot: "bg-lime-500",
  },
  fechado: {
    bg: "bg-green-50 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-400",
    border: "border-green-200 dark:border-green-800",
    dot: "bg-green-600",
  },

  // Progress states (blue tones)
  novo: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-800",
    dot: "bg-blue-500",
  },
  aguardando: {
    bg: "bg-sky-50 dark:bg-sky-950/40",
    text: "text-sky-700 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-800",
    dot: "bg-sky-500",
  },
  em_analise: {
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-800",
    dot: "bg-indigo-500",
  },
  contato: {
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    text: "text-cyan-700 dark:text-cyan-400",
    border: "border-cyan-200 dark:border-cyan-800",
    dot: "bg-cyan-500",
  },

  // Warning states (yellow/amber tones)
  em_negociacao: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  negociacao: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  proposta: {
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    text: "text-yellow-700 dark:text-yellow-400",
    border: "border-yellow-200 dark:border-yellow-800",
    dot: "bg-yellow-500",
  },
  follow_up: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500",
  },
  pendente: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    dot: "bg-amber-500",
  },
  retornar: {
    bg: "bg-orange-50 dark:bg-orange-950/40",
    text: "text-orange-700 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-800",
    dot: "bg-orange-500",
  },

  // Negative states (red tones)
  perdido: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
  descartado: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
  },
  cancelado: {
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    border: "border-red-200 dark:border-red-800",
    dot: "bg-red-500",
  },
  recusado: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
  },

  // Neutral states (gray tones)
  inativo: {
    bg: "bg-gray-50 dark:bg-gray-900/40",
    text: "text-gray-700 dark:text-gray-400",
    border: "border-gray-200 dark:border-gray-700",
    dot: "bg-gray-400",
  },
  arquivado: {
    bg: "bg-slate-50 dark:bg-slate-900/40",
    text: "text-slate-700 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },
  frio: {
    bg: "bg-slate-50 dark:bg-slate-900/40",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    dot: "bg-slate-400",
  },

  // Special states (purple/violet tones)
  vip: {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-400",
    border: "border-violet-200 dark:border-violet-800",
    dot: "bg-violet-500",
  },
  prioritario: {
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-200 dark:border-purple-800",
    dot: "bg-purple-500",
  },
  especial: {
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/40",
    text: "text-fuchsia-700 dark:text-fuchsia-400",
    border: "border-fuchsia-200 dark:border-fuchsia-800",
    dot: "bg-fuchsia-500",
  },

  // Hot lead states (pink tones)
  quente: {
    bg: "bg-pink-50 dark:bg-pink-950/40",
    text: "text-pink-700 dark:text-pink-400",
    border: "border-pink-200 dark:border-pink-800",
    dot: "bg-pink-500",
  },
  urgente: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    dot: "bg-rose-500",
  },
}

/**
 * Default color configuration for unknown statuses
 */
const DEFAULT_STATUS_COLOR: StatusColorConfig = {
  bg: "bg-gray-50 dark:bg-gray-900/40",
  text: "text-gray-700 dark:text-gray-400",
  border: "border-gray-200 dark:border-gray-700",
  dot: "bg-gray-400",
}

/**
 * Normalizes status string for matching
 * @param status - Raw status string
 * @returns Normalized lowercase status
 */
function normalizeStatus(status: string): string {
  return status
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]/g, "_") // Replace non-alphanumeric with underscore
    .replace(/_+/g, "_") // Collapse multiple underscores
    .replace(/^_|_$/g, "") // Remove leading/trailing underscores
}

/**
 * Gets CSS classes for a status badge
 * @param situacao - Lead status
 * @returns CSS class string for the badge
 */
export function getStatusColor(situacao: NullableString): string {
  if (!situacao) {
    const def = DEFAULT_STATUS_COLOR
    return `${def.bg} ${def.text} ${def.border}`
  }

  const normalized = normalizeStatus(situacao)

  // Direct match
  if (STATUS_COLORS[normalized]) {
    const config = STATUS_COLORS[normalized]
    return `${config.bg} ${config.text} ${config.border}`
  }

  // Partial match - check if status contains any known keyword
  for (const [key, config] of Object.entries(STATUS_COLORS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return `${config.bg} ${config.text} ${config.border}`
    }
  }

  // Fallback to default
  const def = DEFAULT_STATUS_COLOR
  return `${def.bg} ${def.text} ${def.border}`
}

/**
 * Gets full status color configuration object
 * @param situacao - Lead status
 * @returns Status color configuration
 */
export function getStatusColorConfig(situacao: NullableString): StatusColorConfig {
  if (!situacao) return DEFAULT_STATUS_COLOR

  const normalized = normalizeStatus(situacao)

  if (STATUS_COLORS[normalized]) {
    return STATUS_COLORS[normalized]
  }

  for (const [key, config] of Object.entries(STATUS_COLORS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return config
    }
  }

  return DEFAULT_STATUS_COLOR
}

/**
 * Gets all available status options
 * @returns Array of status keys
 */
export function getAvailableStatuses(): string[] {
  return Object.keys(STATUS_COLORS)
}

// =============================================================================
// NAME UTILITIES
// =============================================================================

/**
 * Extracts initials from a name (up to 2 characters)
 * @param name - Full name
 * @param maxInitials - Maximum number of initials (default: 2)
 * @returns Uppercase initials or fallback character
 */
export function getInitials(
  name: NullableString,
  maxInitials: number = 2
): string {
  if (!name || typeof name !== "string") return "?"

  const trimmed = name.trim()
  if (!trimmed) return "?"

  const words = trimmed.split(/\s+/).filter(Boolean)

  if (words.length === 0) return "?"

  // If only one word, take first two characters
  if (words.length === 1) {
    return words[0].substring(0, maxInitials).toUpperCase()
  }

  // Take first letter of first and last significant words
  const initials = words
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, maxInitials)
    .join("")
    .toUpperCase()

  return initials || "?"
}

/**
 * Formats name to title case
 * @param name - Name to format
 * @returns Name in title case
 */
export function formatName(name: NullableString): string {
  if (!name) return ""

  const prepositions = ["de", "da", "do", "das", "dos", "e"]

  return name
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && prepositions.includes(word)) {
        return word
      }
      return word.charAt(0).toUpperCase() + word.slice(1)
    })
    .join(" ")
}

/**
 * Gets first name from full name
 * @param name - Full name
 * @returns First name only
 */
export function getFirstName(name: NullableString): string {
  if (!name) return ""
  const parts = name.trim().split(/\s+/)
  return parts[0] || ""
}

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Formats a date string to Brazilian format with various options
 * @param date - Date string, Date object, or timestamp
 * @param options - Formatting options
 * @returns Formatted date string
 */
export function formatDate(
  date: NullableString | Date | number,
  options: DateFormatOptions = {}
): string {
  const { includeTime = true, includeSeconds = false, shortMonth = false, relative = false } = options

  if (!date) return ""

  try {
    const dateObj = date instanceof Date ? date : new Date(date)

    if (isNaN(dateObj.getTime())) {
      return typeof date === "string" ? date : ""
    }

    // Relative formatting
    if (relative) {
      const result = getRelativeTime(dateObj)
      if (result) return result
    }

    const formatOptions: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: shortMonth ? "short" : "2-digit",
      year: "numeric",
    }

    if (includeTime) {
      formatOptions.hour = "2-digit"
      formatOptions.minute = "2-digit"
      if (includeSeconds) {
        formatOptions.second = "2-digit"
      }
    }

    return dateObj.toLocaleDateString("pt-BR", formatOptions)
  } catch {
    return typeof date === "string" ? date : ""
  }
}

/**
 * Formats date as short version (dd/mm)
 * @param date - Date to format
 * @returns Short date string
 */
export function formatDateShort(date: NullableString | Date | number): string {
  if (!date) return ""

  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) return ""

    return dateObj.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    })
  } catch {
    return ""
  }
}

/**
 * Formats date as full written version
 * @param date - Date to format
 * @returns Full date string (e.g., "15 de janeiro de 2024")
 */
export function formatDateFull(date: NullableString | Date | number): string {
  if (!date) return ""

  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) return ""

    return dateObj.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return ""
  }
}

/**
 * Gets relative time string (e.g., "2 dias atras", "agora")
 * @param date - Date to compare
 * @returns Relative time string or null if too far
 */
function getRelativeTime(date: Date): string | null {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return "agora"
  if (diffMinutes < 60) return `${diffMinutes} min atras`
  if (diffHours < 24) return `${diffHours}h atras`
  if (diffDays === 1) return "ontem"
  if (diffDays < 7) return `${diffDays} dias atras`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atras`

  return null // Fall back to absolute date
}

/**
 * Calculates the number of days since a given date
 * @param date - Reference date
 * @returns Number of days or null if invalid
 */
export function daysSince(date: NullableString | Date | number): number | null {
  if (!date) return null

  try {
    const dateObj = date instanceof Date ? date : new Date(date)

    if (isNaN(dateObj.getTime())) return null

    const now = new Date()
    const diffTime = now.getTime() - dateObj.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    return diffDays >= 0 ? diffDays : 0
  } catch {
    return null
  }
}

/**
 * Gets detailed information about days since a date
 * @param date - Reference date
 * @param staleThreshold - Days before considered stale (default: 7)
 * @param criticalThreshold - Days before considered critical (default: 14)
 * @returns Object with days count and labels
 */
export function getDaysSinceInfo(
  date: NullableString | Date | number,
  staleThreshold: number = 7,
  criticalThreshold: number = 14
): DaysSinceResult | null {
  const days = daysSince(date)

  if (days === null) return null

  let label: string
  if (days === 0) {
    label = "Hoje"
  } else if (days === 1) {
    label = "Ontem"
  } else if (days < 7) {
    label = `${days} dias atras`
  } else if (days < 30) {
    const weeks = Math.floor(days / 7)
    label = weeks === 1 ? "1 semana atras" : `${weeks} semanas atras`
  } else if (days < 365) {
    const months = Math.floor(days / 30)
    label = months === 1 ? "1 mes atras" : `${months} meses atras`
  } else {
    const years = Math.floor(days / 365)
    label = years === 1 ? "1 ano atras" : `${years} anos atras`
  }

  return {
    days,
    label,
    isRecent: days <= 3,
    isStale: days > staleThreshold,
    isCritical: days > criticalThreshold,
  }
}

/**
 * Formats time only from a date
 * @param date - Date to format
 * @param includeSeconds - Whether to include seconds
 * @returns Time string (HH:MM or HH:MM:SS)
 */
export function formatTime(
  date: NullableString | Date | number,
  includeSeconds: boolean = false
): string {
  if (!date) return ""

  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    if (isNaN(dateObj.getTime())) return ""

    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    }

    if (includeSeconds) {
      options.second = "2-digit"
    }

    return dateObj.toLocaleTimeString("pt-BR", options)
  } catch {
    return ""
  }
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validates email format
 * @param email - Email to validate
 * @returns True if valid email format
 */
export function isValidEmail(email: NullableString): boolean {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validates if a value is empty (null, undefined, or empty string)
 * @param value - Value to check
 * @returns True if value is empty
 */
export function isEmpty(value: NullableString): boolean {
  return value === null || value === undefined || value.trim() === ""
}

/**
 * Gets a safe display value (returns placeholder for empty values)
 * @param value - Value to display
 * @param placeholder - Placeholder for empty values (default: "---")
 * @returns Value or placeholder
 */
export function safeDisplay(
  value: NullableString,
  placeholder: string = "---"
): string {
  return isEmpty(value) ? placeholder : value!
}
