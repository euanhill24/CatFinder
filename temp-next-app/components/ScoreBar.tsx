"use client";

import { useEffect, useState } from "react";

export default function ScoreBar({
  emoji,
  label,
  score,
}: {
  emoji: string;
  label: string;
  score: number;
}) {
  const pct = Math.round((score / 10) * 100);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-5 text-center">{emoji}</span>
      <span className="w-16 shrink-0 font-semibold text-xs text-bark">{label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-fog">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-tangerine to-rose transition-all duration-400"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
