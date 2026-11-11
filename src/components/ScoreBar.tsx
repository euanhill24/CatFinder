interface Props {
  icon: string;
  label: string;
  /** 0 to 10. */
  score: number;
  /** Show the number as well as the bar. Off on the card face (DESIGN.md). */
  showNumber?: boolean;
}

export function ScoreBar({ icon, label, score, showNumber = false }: Props) {
  const pct = Math.max(0, Math.min(100, score * 10));
  return (
    <div className="flex items-center gap-2">
      <span className="w-[5.75rem] shrink-0 truncate text-xs font-semibold text-bark">
        <span aria-hidden className="mr-1">
          {icon}
        </span>
        {label}
      </span>
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-fog"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={Math.round(score * 10) / 10}
      >
        <div
          className="h-full origin-left rounded-full"
          style={{
            width: `${pct}%`,
            // The gradient spans the whole track, so a short bar stays orange
            // and only a long one reaches rose.
            backgroundImage: "linear-gradient(to right, var(--color-tangerine), var(--color-rose))",
            backgroundSize: pct > 0 ? `${10000 / pct}% 100%` : undefined,
            animation: "bar-fill 400ms ease-out 100ms backwards",
          }}
        />
      </div>
      {showNumber && (
        <span className="w-7 shrink-0 text-right text-xs font-bold tabular-nums text-ink">
          {Number.isInteger(score) ? score : score.toFixed(1)}
        </span>
      )}
    </div>
  );
}
