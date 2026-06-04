interface LogPanelProps {
  logs: string[];
}

export function LogPanel({ logs }: LogPanelProps) {
  return (
    <section className="game-log-drawer p-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black text-amber-100">게임 로그</h2>
        <span className="text-xs font-black text-amber-100/40">⌃</span>
      </div>
      <div className="mt-3 max-h-36 space-y-1 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-sm text-amber-100/50">아직 로그가 없습니다.</p>
        ) : (
          logs
            .slice()
            .reverse()
            .map((log, index) => (
              <div
                key={`${log}-${index}`}
                className="log-item border-b border-amber-100/10 px-2 py-1 text-xs font-semibold text-amber-100/70"
              >
                {log}
              </div>
            ))
        )}
      </div>
    </section>
  );
}
