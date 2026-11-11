"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatAge, formatAgo, formatDate, formatPrice, formatSex, formatSource } from "@/core/format";
import type { Cat } from "@/core/types";
import { Photo } from "./Photo";
import { ScoreBar } from "./ScoreBar";

interface Props {
  cat: Cat;
  now: Date;
  /** Called once the view has closed, however it was closed. */
  onClose: () => void;
  /** Shown under the title, e.g. a "No longer listed" badge. */
  badge?: ReactNode;
  /** Extra content above the scores, e.g. the note editor. */
  extra?: ReactNode;
  /** Pinned to the bottom of the screen: the decision buttons. */
  actions: ReactNode;
}

const SCORE_ROWS = [
  { key: "alone", icon: "🏠", label: "Alone OK" },
  { key: "friendly", icon: "😸", label: "Friendly" },
  { key: "vibe", icon: "✨", label: "Vibe" },
  { key: "distance", icon: "📍", label: "Distance" },
  { key: "age", icon: "🎂", label: "Age" },
] as const;

/** Closes the open detail view. The view calls `onClose` once it has gone. */
export function closeDetail() {
  window.history.back();
}

function Gallery({ cat }: { cat: Cat }) {
  const [index, setIndex] = useState(0);
  const name = cat.title ?? "Ragdoll cat";

  if (cat.photoUrls.length === 0) {
    return <Photo src={undefined} alt={name} className="aspect-[4/3] w-full" />;
  }

  return (
    <div className="relative">
      <div
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {cat.photoUrls.map((url, i) => (
          <Photo
            key={url + i}
            src={url}
            alt={`${name}, photo ${i + 1} of ${cat.photoUrls.length}`}
            eager={i === 0}
            className="aspect-[4/5] w-full shrink-0 snap-center"
          />
        ))}
      </div>
      {cat.photoUrls.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {cat.photoUrls.map((url, i) => (
            <span
              key={url + i}
              className={`h-1.5 rounded-full bg-card shadow transition-all ${i === index ? "w-4 opacity-100" : "w-1.5 opacity-60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Everything about one cat (R-50 to R-56). Used from the deck and the saved list. */
export function DetailView({ cat, now, onClose, badge, extra, actions }: Props) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  // Opening adds a history entry and every way of closing goes back through
  // it, so the phone's back button closes this view instead of leaving the app.
  useEffect(() => {
    if (!window.history.state?.catDetail) window.history.pushState({ catDetail: true }, "");
    const onPop = () => closeRef.current();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const title = cat.title ?? "Ragdoll cat";
  const facts: [string, string][] = [
    ["Price", formatPrice(cat.pricePence)],
    ["Age", formatAge(cat.ageMonths)],
    ["Sex", formatSex(cat.sex) ?? "Not stated"],
    ["Location", cat.location ?? "Not stated"],
    ["Listed", cat.listedAt ? `${formatDate(cat.listedAt)} (${formatAgo(cat.listedAt, now)})` : "Date not shown"],
    ["Source", formatSource(cat.source)],
  ];
  const adverts = [{ source: cat.source, externalUrl: cat.externalUrl }, ...cat.otherAdverts];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex justify-center bg-ink/40"
      style={{ animation: "sheet-up 200ms ease-out" }}
    >
      <div className="relative flex h-full w-full max-w-md flex-col bg-cream">
        <button
          onClick={closeDetail}
          aria-label="Close"
          className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-card/90 text-lg text-ink shadow-dismiss"
          style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
        >
          ✕
        </button>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <Gallery cat={cat} />

          <div className="flex flex-col gap-5 px-5 pb-6 pt-4">
            <header>
              <h2 className="font-display text-[28px] font-bold leading-tight text-ink">{title}</h2>
              {badge && <div className="mt-2">{badge}</div>}
            </header>

            {extra}

            <section aria-label="Scores" className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-card">
              <ScoreBar icon="⭐" label="Overall" score={cat.overall} showNumber />
              <hr className="border-fog" />
              {SCORE_ROWS.map((row) => (
                <div key={row.key}>
                  <ScoreBar icon={row.icon} label={row.label} score={cat.scores[row.key]} showNumber />
                  <p className="mt-1 text-[13px] leading-snug text-bark">{cat.reasons[row.key]}</p>
                </div>
              ))}
            </section>

            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {facts.map(([name, value]) => (
                <div key={name} className="contents">
                  <dt className="text-bark">{name}</dt>
                  <dd className="font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <section aria-label="Description">
              <h3 className="font-display text-lg font-semibold text-ink">From the advert</h3>
              <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-ink">
                {cat.description?.trim() || "The advert has no description."}
              </p>
            </section>

            <div className="flex flex-col gap-2">
              {adverts.map((ad, i) => (
                <a
                  key={ad.externalUrl}
                  href={ad.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex min-h-12 items-center justify-center rounded-full px-5 text-[15px] font-bold ${
                    i === 0 ? "bg-rose text-white shadow-like" : "bg-card text-rose shadow-dismiss"
                  }`}
                >
                  {i === 0 ? "View original advert" : `Also on ${formatSource(ad.source)}`}
                  <span aria-hidden className="ml-1.5">
                    ↗
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          className="shrink-0 border-t border-fog bg-cream px-5 pt-3"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          {actions}
        </div>
      </div>
    </div>
  );
}
