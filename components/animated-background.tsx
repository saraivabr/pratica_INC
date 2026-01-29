/**
 * Animated background component with gradient blobs
 * Used consistently across all pages for a unified look
 */
export function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-300/40 to-green-400/40 rounded-full blur-3xl animate-blob" />
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-gradient-to-br from-green-300/30 to-teal-400/30 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-gradient-to-br from-emerald-200/30 to-cyan-300/30 rounded-full blur-3xl animate-blob animation-delay-4000" />
    </div>
  );
}
