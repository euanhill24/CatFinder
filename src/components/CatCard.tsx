import { formatAge, formatAgo, formatSex, formatSource } from "@/core/format";
import type { Cat } from "@/core/types";
import { Photo } from "./Photo";
import { ScoreBar } from "./ScoreBar";

interface Props {
  cat: Cat;
  now: Date;
  eager?: boolean;
}

/** The face of a card: everything needed to decide at a glance (R-41). */
export function CatCard({ cat, now, eager }: Props) {
  const title = cat.title ?? "Ragdoll cat";
  const facts = [formatAge(cat.ageMonths), formatSex(cat.sex)].filter(Boolean).join(" · ");
  const listed = formatAgo(cat.listedAt, now);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-card bg-card shadow-card">
      <div className="relative min-h-0 flex-[58]">
        <Photo src={cat.photoUrls[0]} alt={title} eager={eager} className="absolute inset-0 h-full w-full" />
        {cat.photoUrls.length > 1 && (
          <span className="absolute bottom-2 right-3 rounded-full bg-ink/55 px-2 py-0.5 text-[11px] font-semibold text-card">
            {cat.photoUrls.length} photos
          </span>
        )}
      </div>

      <div className="flex min-h-0 flex-[42] flex-col justify-between gap-2 px-5 pb-4 pt-3">
        <div>
          <h2 className="line-clamp-2 font-display text-[22px] font-semibold leading-tight text-ink">{title}</h2>
          <p className="mt-1 truncate text-[13px] text-bark">
            {facts}
            {cat.location && (
              <>
                {" · "}
                <span aria-hidden>📍</span> {cat.location}
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <ScoreBar icon="🏠" label="Alone OK" score={cat.scores.alone} />
          <ScoreBar icon="😸" label="Friendly" score={cat.scores.friendly} />
          <ScoreBar icon="✨" label="Vibe" score={cat.scores.vibe} />
          <ScoreBar icon="⭐" label="Overall" score={cat.overall} />
        </div>

        <p className="truncate text-[11px] text-dust">
          {formatSource(cat.source)}
          {listed && ` · Listed ${listed}`}
        </p>
      </div>
    </article>
  );
}
