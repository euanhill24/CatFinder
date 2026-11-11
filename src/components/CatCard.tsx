import { formatAge, formatAgo, formatSex, formatSource } from "@/core/format";
import type { Cat } from "@/core/types";
import { MatchRing } from "./MatchRing";
import { Photo } from "./Photo";
import { ScoreBar } from "./ScoreBar";
import { PinIcon } from "./icons";

interface Props {
  cat: Cat;
  now: Date;
  eager?: boolean;
  /** Arrived since her last visit. */
  isNew?: boolean;
}

/**
 * The face of a card (R-41). The photo fills it; everything needed to decide
 * at a glance sits on top, over a scrim that keeps the text readable.
 */
export function CatCard({ cat, now, eager, isNew }: Props) {
  const title = cat.title ?? "Ragdoll cat";
  const facts = [formatAge(cat.ageMonths), formatSex(cat.sex)].filter(Boolean).join(" · ");
  const listed = formatAgo(cat.listedAt, now);
  const photos = cat.photoUrls.length;

  return (
    <article className="relative h-full overflow-hidden rounded-card bg-ink shadow-card">
      <Photo src={cat.photoUrls[0]} alt={title} eager={eager} className="absolute inset-0 h-full w-full" />

      <div aria-hidden className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-ink/55 to-transparent" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink/90 via-ink/45 to-transparent" />

      {photos > 1 && (
        <div aria-hidden className="absolute inset-x-5 top-3 flex gap-1">
          {cat.photoUrls.map((url, i) => (
            <span key={url + i} className={`h-[3px] flex-1 rounded-full ${i === 0 ? "bg-white" : "bg-white/35"}`} />
          ))}
        </div>
      )}

      <div className="absolute inset-x-4 top-7 flex items-start justify-between">
        <span className="rounded-full bg-ink/40 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md">
          {formatSource(cat.source)}
          {listed && <span className="font-semibold text-white/80"> · {listed}</span>}
        </span>
        <MatchRing score={cat.overall} />
      </div>

      <div className="on-photo absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 text-white [@media(max-height:700px)]:gap-2 [@media(max-height:700px)]:p-4">
        <div>
          {isNew && (
            <span className="brand-gradient mb-2 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-like [text-shadow:none]">
              New
            </span>
          )}
          <h2 className="line-clamp-2 font-display text-[28px] font-semibold leading-[1.08] [@media(max-height:700px)]:text-[23px]">{title}</h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-white/90">
            <span className="shrink-0">{facts}</span>
            {cat.location && (
              <>
                <span aria-hidden className="text-white/50">
                  ·
                </span>
                <PinIcon size={14} className="shrink-0" />
                <span className="truncate">{cat.location}</span>
              </>
            )}
          </p>
        </div>

        <div className="glass flex flex-col gap-2 rounded-2xl px-3.5 py-3 [text-shadow:none] [@media(max-height:700px)]:gap-1.5 [@media(max-height:700px)]:py-2.5">
          <ScoreBar tone="glass" label="Alone OK" score={cat.scores.alone} index={0} />
          <ScoreBar tone="glass" label="Friendly" score={cat.scores.friendly} index={1} />
          <ScoreBar tone="glass" label="Vibe" score={cat.scores.vibe} index={2} />
        </div>
      </div>
    </article>
  );
}
