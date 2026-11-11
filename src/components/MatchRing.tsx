import { useId } from "react";

interface Props {
  /** Overall match, 0 to 10. */
  score: number;
  size?: number;
  /** "glass" sits on a photo; "light" sits on a cream surface. */
  tone?: "glass" | "light";
}

/** The overall match as a ring: the one number on a card. */
export function MatchRing({ score, size = 58, tone = "glass" }: Props) {
  const id = useId();
  const pct = Math.round(Math.max(0, Math.min(10, score)) * 10);
  const stroke = size >= 64 ? 6 : 5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const glass = tone === "glass";

  return (
    <div
      role="meter"
      aria-label="Overall match"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={`${pct}% match`}
      className={`relative shrink-0 rounded-full ${glass ? "bg-ink/35 backdrop-blur-md" : "bg-card shadow-soft"}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-tangerine)" />
            <stop offset="1" stopColor="var(--color-rose)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={glass ? "stroke-white/25" : "stroke-fog"}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          style={{ animation: "ring-draw 700ms cubic-bezier(0.2, 0.8, 0.2, 1) 120ms backwards", ["--ring" as string]: circumference }}
        />
      </svg>
      <div className={`absolute inset-0 flex flex-col items-center justify-center leading-none ${glass ? "text-white" : "text-ink"}`}>
        <span className="font-display font-bold tabular-nums" style={{ fontSize: size * 0.34 }}>
          {pct}
          <span style={{ fontSize: size * 0.18 }}>%</span>
        </span>
        <span className={`font-semibold uppercase tracking-wide ${glass ? "text-white/75" : "text-bark"}`} style={{ fontSize: Math.max(7, size * 0.125) }}>
          match
        </span>
      </div>
    </div>
  );
}
