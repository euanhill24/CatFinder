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

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-5 text-center">{emoji}</span>
      <span className="w-16 shrink-0 text-zinc-600">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-pink-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-xs text-zinc-500">
        {score.toFixed(0)}
      </span>
    </div>
  );
}
