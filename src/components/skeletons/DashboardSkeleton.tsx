import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Hero Stats Section */}
      <div className="relative mb-8 -mx-3 md:-mx-6 -mt-3 md:-mt-6 px-3 md:px-6 pt-6 pb-8 bg-gradient-to-b from-secondary/50 via-secondary/20 to-transparent">
        <div className="relative">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-8">
            <Skeleton className="h-8 w-36 rounded-full" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>

          {/* Main Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Primary Metrics */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <Skeleton className="h-4 w-28 mb-3" />
                <Skeleton className="h-16 md:h-20 w-80 md:w-96" />
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-4">
                <div>
                  <Skeleton className="h-3 w-14 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <div className="w-px h-12 bg-border hidden sm:block" />
                <div>
                  <Skeleton className="h-3 w-20 mb-2" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-28" />
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Summary Cards */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-card/80 backdrop-blur border border-border p-4"
                >
                  <div className="mb-3">
                    <Skeleton className="w-10 h-10 rounded-xl" />
                  </div>
                  <Skeleton className="h-9 w-12 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
          {[...Array(4)].map((_, i) => (
            <Skeleton
              key={i}
              className="h-9 shrink-0 rounded-full"
              style={{ width: i === 0 ? 100 : 120 + i * 10 }}
            />
          ))}
          <Skeleton className="w-9 h-9 rounded-full shrink-0" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-2xl p-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Skeleton className="w-12 h-12 rounded-xl" />
                  <Skeleton className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card" />
                </div>
                <div>
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>

            {/* Type Badge */}
            <div className="mb-4">
              <Skeleton className="h-6 w-20 rounded-lg" />
            </div>

            {/* Balance */}
            <div className="mb-4">
              <Skeleton className="h-3 w-14 mb-2" />
              <Skeleton className="h-8 w-32" />
            </div>

            {/* P/L */}
            <div className="flex items-center justify-between py-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 w-20" />
              </div>
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
              <div>
                <Skeleton className="h-2 w-14 mb-1" />
                <Skeleton className="h-4 w-10" />
              </div>
              <div>
                <Skeleton className="h-2 w-12 mb-1" />
                <Skeleton className="h-4 w-8" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
