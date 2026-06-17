export default function ReportLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8 animate-pulse">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-9 w-32 rounded-md bg-zinc-800/60" />
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-zinc-800/60" />
            <div className="space-y-2">
              <div className="h-8 w-24 rounded bg-zinc-800/60" />
              <div className="h-4 w-40 rounded bg-zinc-800/40" />
            </div>
          </div>
          <div className="space-y-3 pt-2">
            {[85, 72, 60, 90].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-28 rounded bg-zinc-800/50" />
                <div className="flex-1 h-2 rounded-full bg-zinc-800/50">
                  <div className="h-2 rounded-full bg-zinc-700/70" style={{ width: `${w}%` }} />
                </div>
                <div className="h-3 w-8 rounded bg-zinc-800/50" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-3">
              <div className="h-5 w-32 rounded bg-zinc-800/60" />
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-4 w-full rounded bg-zinc-800/40" />
              ))}
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4">
          <div className="h-5 w-40 rounded bg-zinc-800/60" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-zinc-800/50 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 rounded bg-zinc-800/50" />
                <div className="h-3 w-full rounded bg-zinc-800/30" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}