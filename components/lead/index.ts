/**
 * Lead Components
 *
 * Centralized exports for all lead-related components.
 * Import from '@/components/lead' for cleaner imports.
 *
 * @example
 * import {
 *   LeadDetailModal,
 *   LeadContactInfo,
 *   LeadHistorySection,
 *   LeadInfoCard,
 *   ScoreDisplay,
 *   InfoCard,
 * } from '@/components/lead'
 */

// Main modal component for viewing lead details
export { LeadDetailModal } from "./LeadDetailModal"

// Contact information display with copy functionality
export { LeadContactInfo } from "./LeadContactInfo"

// Interaction history timeline
export { LeadHistorySection } from "./LeadHistorySection"

// Info card with variants (full-featured)
export { LeadInfoCard, leadInfoCardVariants } from "./LeadInfoCard"

// Score display gauge component
export { ScoreDisplay } from "./ScoreDisplay"

// Lead scoring components
export { LeadScoreBadge } from "./LeadScoreBadge"
export { LeadScoreCard } from "./LeadScoreCard"

// Simple info card component used in LeadDetailModal
export { InfoCard, InfoCardSkeleton, infoCardVariants } from "./InfoCard"

// Re-export types for convenience
export type { InfoCardProps } from "./InfoCard"
