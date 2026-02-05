import { Skeleton } from "@/components/ui/skeleton";

export function AccountPageSkeleton() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative mb-8 -mx-3 md:-mx-6 -mt-3 md:-mt-6 px-3 md:px-6 pt-6 pb-8 bg-gradient-to-b from-secondary/50 via-secondary/20 to-transparent">
        <div className="relative">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-9 w-28 rounded-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-xl" />
              <Skeleton className="h-9 w-24 rounded-xl" />
            </div>
          </div>

          {/* Account Title */}
          <div className="mb-6">
            <Skeleton className="h-10 w-64 mb-3" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-20 rounded-lg" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>

          {/* Main Stats Display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Balance & Equity */}
            <div className="lg:col-span-7 space-y-6">
              {/* Balance Hero */}
              <div>
                <Skeleton className="h-4 w-20 mb-3" />
                <Skeleton className="h-16 md:h-20 w-72 md:w-96" />
              </div>

              {/* Secondary Stats Row */}
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
                <div className="w-px h-12 bg-border hidden md:block" />
                <div>
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-8 w-28" />
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
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
        {[...Array(4)].map((_, i) => (
          <Skeleton
            key={i}
            className="h-10 shrink-0 rounded-full"
            style={{ width: i === 0 ? 120 : 100 + i * 15 }}
          />
        ))}
      </div>

      {/* Tab Content - Chart Card */}
      <div className="space-y-6">
        <div className="rounded-2xl bg-card border border-border p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-12 rounded-lg" />
              ))}
            </div>
          </div>
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-card border border-border p-4 md:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-9 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>

        {/* Calendar Placeholder */}
        <div className="rounded-2xl bg-card border border-border p-5 md:p-6">
          <Skeleton className="h-5 w-32 mb-6" />
          <div className="grid grid-cols-7 gap-2">
            {[...Array(35)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
