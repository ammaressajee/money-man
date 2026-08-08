export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block size-5 animate-spin rounded-full border-2 border-line border-t-accent ${className}`}
    />
  )
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper">
      <Spinner className="size-8" />
    </div>
  )
}

/** Soft placeholder blocks shown while dashboard data loads. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-44 animate-pulse rounded-card bg-accent-soft" />
      <div className="h-24 animate-pulse rounded-card bg-card" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="h-20 animate-pulse rounded-card bg-card" />
        <div className="h-20 animate-pulse rounded-card bg-card" />
        <div className="h-20 animate-pulse rounded-card bg-card" />
      </div>
      <div className="h-40 animate-pulse rounded-card bg-card" />
    </div>
  )
}
