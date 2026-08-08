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
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner className="size-8" />
    </div>
  )
}

/** Soft placeholder blocks shown while dashboard data loads. */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="h-40 animate-pulse rounded-card bg-accent-soft" />
      <div className="h-56 animate-pulse rounded-card bg-card" />
      <div className="h-36 animate-pulse rounded-card bg-card" />
      <div className="h-48 animate-pulse rounded-card bg-card" />
    </div>
  )
}
