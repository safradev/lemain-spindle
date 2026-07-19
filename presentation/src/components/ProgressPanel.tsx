type ProgressPanelProps = {
  percent: number;
  status: string;
};

export function ProgressPanel({ percent, status }: ProgressPanelProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const active = clamped > 0 && clamped < 100;
  const idle = !active && clamped === 0;

  return (
    <div
      className="surface-panel flex flex-col gap-3 rounded-[24px] px-5 py-4"
      style={{ opacity: idle ? 0.72 : 1 }}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex items-center gap-2" style={{ color: "var(--ink-soft)" }}>
          {active ? <span className="status-dot" aria-hidden="true" /> : null}
          {status}
        </span>
        <span
          className="font-[family-name:var(--font-mono)] text-[13px] tabular-nums"
          style={{ color: "var(--ink)" }}
        >
          {Math.round(clamped)}%
        </span>
      </div>
      <div className="progress-track h-1.5 rounded-full">
        <div
          className="progress-fill h-full rounded-full transition-[width] duration-300 ease-out"
          style={{
            width: `${clamped}%`,
            animationPlayState: active ? "running" : "paused",
            opacity: clamped === 0 ? 0 : 1,
          }}
        />
      </div>
    </div>
  );
}
