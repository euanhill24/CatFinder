interface Props {
  label: string;
  /** 0 to 10. */
  score: number;
  /** "glass" sits on a photo; "light" sits on a cream surface. */
  tone?: "glass" | "light";
  /** Show the number as well as the bar. Off on the card face. */
  showNumber?: boolean;
  /** Stagger the fill animation down a list. */
  index?: number;
}

export function ScoreBar({ label, score, tone = "light", showNumber = false, index = 0 }: Props) {
  const pct = Math.max(0, Math.min(100, score * 10));
  const glass = tone === "glass";
  return (
    <div className="flex items-center gap-2.5">
      <span className={`w-[4.5rem] shrink-0 truncate text-xs font-bold ${glass ? "text-white/90" : "text-ink"}`}>{label}</span>
      <div
        className={`h-1.5 flex-1 overflow-hidden rounded-full ${glass ? "bg-white/25" : "bg-fog"}`}
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
            backgroundImage: glass
              ? "linear-gradient(to right, #ffd7a8, #ff9fb0)"
              : "linear-gradient(to right, var(--color-tangerine), var(--color-rose))",
            backgroundSize: pct > 0 ? `${10000 / pct}% 100%` : undefined,
            animation: `bar-fill 520ms cubic-bezier(0.2, 0.8, 0.2, 1) ${140 + index * 70}ms backwards`,
          }}
        />
      </div>
      {showNumber && (
        <span className="w-7 shrink-0 text-right text-[13px] font-bold tabular-nums text-ink">
          {Number.isInteger(score) ? score : score.toFixed(1)}
        </span>
      )}
    </div>
  );
}
