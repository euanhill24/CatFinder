"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SCORE_KEYS, type ScoreKey } from "@/core/rules";
import { formatAge, formatAgo, formatDate, formatPrice, formatSex, formatSource } from "@/core/format";
import type { Cat } from "@/core/types";
import { MatchRing } from "./MatchRing";
import { Photo } from "./Photo";
import { ScoreBar } from "./ScoreBar";
import { ArrowOutIcon, CloseIcon, PinIcon } from "./icons";

interface Props {
  cat: Cat;
  now: Date;
  /** Called once the view has closed, however it was closed. */
  onClose: () => void;
  /** Shown under the title, e.g. when she saved it. */
  badge?: ReactNode;
  /** Pinned to the bottom of the screen: the decision buttons. */
  actions: ReactNode;
}

const SCORE_META: Record<ScoreKey, { icon: string; label: string }> = {
  alone: { icon: "🏠", label: "Alone OK" },
  friendly: { icon: "😸", label: "Friendly" },
  vibe: { icon: "✨", label: "Vibe" },
  distance: { icon: "📍", label: "Distance" },
  age: { icon: "🎂", label: "Age" },
};

/** Closes the open detail view. The view calls `onClose` once it has gone. */
export function closeDetail() {
  window.history.back();
}

function Gallery({ cat }: { cat: Cat }) {
  const [index, setIndex] = useState(0);
  const name = cat.title ?? "Ragdoll cat";
  const count = cat.photoUrls.length;

  if (count === 0) {
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
            alt={`${name}, photo ${i + 1} of ${count}`}
            eager={i === 0}
            className="aspect-[4/5] max-h-[68dvh] w-full shrink-0 snap-center"
          />
        ))}
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-ink/45 to-transparent" />
      {count > 1 && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-5 flex gap-1"
            style={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
          >
            {cat.photoUrls.map((url, i) => (
              <span key={url + i} className={`h-[3px] flex-1 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
          <span className="pointer-events-none absolute bottom-11 right-4 rounded-full bg-ink/45 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
            {index + 1} / {count}
          </span>
        </>
      )}
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-2 text-[13px] font-bold text-ink shadow-soft">
      {children}
    </span>
  );
}

function fitHeading(cat: Cat): string {
  if (cat.sex === "female") return "How she fits";
  if (cat.sex === "male") return "How he fits";
  return "How this cat fits";
}

/** Everything about one cat (R-50 to R-56). Used from the deck and the saved list. */
export function DetailView({ cat, now, onClose, badge, actions }: Props) {
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
  const sex = formatSex(cat.sex);
  const adverts = [{ source: cat.source, externalUrl: cat.externalUrl }, ...cat.otherAdverts];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex justify-center bg-ink/50 backdrop-blur-sm"
      style={{ animation: "fade-in 180ms ease-out" }}
    >
      <div className="wash relative flex h-full w-full max-w-md flex-col" style={{ animation: "sheet-up 280ms cubic-bezier(0.2, 0.8, 0.2, 1)" }}>
        <button
          onClick={closeDetail}
          aria-label="Close"
          className="absolute right-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-ink/45 text-white backdrop-blur-md transition-transform duration-150 active:scale-90"
          style={{ top: "calc(env(safe-area-inset-top) + 1.75rem)" }}
        >
          <CloseIcon size={20} />
        </button>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <Gallery cat={cat} />

          <div className="wash relative -mt-8 flex flex-col gap-6 rounded-t-[32px] px-5 pb-8 pt-3">
            <span aria-hidden className="mx-auto h-1 w-10 rounded-full bg-dust/60" />

            <header className="flex items-start gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[28px] font-bold leading-[1.1] tracking-tight text-ink">{title}</h2>
                {badge && <div className="mt-2">{badge}</div>}
              </div>
              <MatchRing score={cat.overall} size={72} tone="light" />
            </header>

            <div className="flex flex-wrap gap-2" aria-label="Key facts">
              <Chip>{formatPrice(cat.pricePence)}</Chip>
              <Chip>{formatAge(cat.ageMonths)}</Chip>
              {sex && <Chip>{sex}</Chip>}
              {cat.location && (
                <Chip>
                  <PinIcon size={15} className="text-rose" />
                  {cat.location}
                </Chip>
              )}
              <Chip>{formatSource(cat.source)}</Chip>
              <Chip>{cat.listedAt ? `Listed ${formatDate(cat.listedAt)} (${formatAgo(cat.listedAt, now)})` : "Listing date not shown"}</Chip>
            </div>

            <section aria-label="Scores" className="rounded-3xl bg-card p-5 shadow-soft">
              <h3 className="font-display text-xl font-semibold text-ink">{fitHeading(cat)}</h3>
              <div className="mt-4 flex flex-col gap-4">
                {SCORE_KEYS.map((key, i) => (
                  <div key={key} className="flex gap-3">
                    <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush text-base">
                      {SCORE_META[key].icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <ScoreBar label={SCORE_META[key].label} score={cat.scores[key]} showNumber index={i} />
                      <p className="mt-1 text-[13px] leading-snug text-bark">{cat.reasons[key]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section aria-label="Description">
              <h3 className="font-display text-xl font-semibold text-ink">From the advert</h3>
              <p className="mt-2 whitespace-pre-line break-words text-[15px] leading-relaxed text-ink/90">
                {cat.description?.trim() || "The advert has no description."}
              </p>
            </section>

            <div className="flex flex-col gap-2.5">
              {adverts.map((ad, i) => (
                <a
                  key={ad.externalUrl}
                  href={ad.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex min-h-[52px] items-center justify-center gap-1.5 rounded-full px-5 text-[15px] font-extrabold transition-transform duration-150 active:scale-[0.98] ${
                    i === 0 ? "bg-ink text-card shadow-soft" : "bg-card text-ink shadow-soft"
                  }`}
                >
                  {i === 0 ? "View original advert" : `Also on ${formatSource(ad.source)}`}
                  <ArrowOutIcon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div
          className="shrink-0 border-t border-white/60 bg-cream/80 px-5 pt-3 backdrop-blur-xl"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
        >
          {actions}
        </div>
      </div>
    </div>
  );
}
