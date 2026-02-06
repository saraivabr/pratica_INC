/**
 * Animated background component with gradient blobs
 * Used consistently across all pages for a unified look
 *
 * Performance optimizations:
 * - prefers-reduced-motion: shows static gradient instead of animated blobs
 * - Mobile: smaller blobs (w-64 h-64), lighter blur (blur-2xl), lower opacity (/25)
 * - will-change-transform on animated elements for GPU layer promotion
 */
export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Static gradient fallback for prefers-reduced-motion */}
      <div className="hidden motion-reduce:block absolute inset-0 bg-gradient-to-br from-emerald-100/30 via-green-50/20 to-teal-100/30 dark:from-emerald-950/30 dark:via-green-950/20 dark:to-teal-950/30" />

      {/* Animated blobs - hidden when reduced motion is preferred */}
      <div className="motion-reduce:hidden contents">
        <div className="absolute -top-40 -right-40 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-br from-emerald-300/25 md:from-emerald-300/40 to-green-400/25 md:to-green-400/40 rounded-full blur-2xl md:blur-3xl will-change-transform animate-blob" />
        <div className="absolute top-1/2 -left-40 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-br from-green-300/20 md:from-green-300/30 to-teal-400/20 md:to-teal-400/30 rounded-full blur-2xl md:blur-3xl will-change-transform animate-blob animation-delay-2000" />
        <div className="absolute -bottom-40 right-1/3 w-64 h-64 md:w-96 md:h-96 bg-gradient-to-br from-emerald-200/20 md:from-emerald-200/30 to-cyan-300/20 md:to-cyan-300/30 rounded-full blur-2xl md:blur-3xl will-change-transform animate-blob animation-delay-4000" />
      </div>
    </div>
  );
}
