"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { pluralCats } from "@/core/format";
import type { Cat, Decision } from "@/core/types";
import { SEEN_COOKIE, SINCE_COOKIE, VISIT_GAP_MINUTES } from "@/core/visit";
import { decideAction, topUpAction, undoAction } from "@/server/actions";
import type { HomeData } from "@/server/load";
import { CatCard } from "./CatCard";
import { DetailView, closeDetail } from "./DetailView";
import { EmptyState, OfflineBanner, OverdueBanner } from "./States";
import { TapButton } from "./TapButton";
import { SwipeCard, type SwipeDirection, type SwipeHandle } from "./SwipeCard";

/** Fetch more cards when the phone is holding this few. */
const TOP_UP_BELOW = 5;
const YEAR_SECONDS = 365 * 24 * 60 * 60;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${YEAR_SECONDS}; samesite=lax`;
}

function likeText(cat: Cat): string {
  if (cat.sex === "female") return "Love her!";
  if (cat.sex === "male") return "Love him!";
  return "Love this one!";
}

interface LastDecision {
  cat: Cat;
  decision: Decision;
}

export function DeckScreen({ data }: { data: HomeData }) {
  const router = useRouter();
  const now = new Date(data.now);

  const [cats, setCats] = useState(data.deck.cats);
  const [remaining, setRemaining] = useState(data.deck.remaining);
  const [newCount, setNewCount] = useState(data.deck.newSinceLastVisit);
  const [savedCount, setSavedCount] = useState(data.savedCount);
  const [detail, setDetail] = useState<Cat | null>(null);
  const [last, setLast] = useState<LastDecision | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const topCard = useRef<SwipeHandle>(null);
  /** Decided on the phone but possibly not yet saved; never fetch these again. */
  const decidedIds = useRef(new Set<string>());
  const toppingUp = useRef(false);

  // Remember this visit, so next time "new" counts from now (R-47).
  useEffect(() => {
    setCookie(SINCE_COOKIE, data.since == null ? "" : String(data.since));
    const touch = () => setCookie(SEEN_COOKIE, String(Date.now()));
    touch();
    const loadedAt = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      // Reopened from the background after a while: the deck is out of date.
      if (Date.now() - loadedAt > VISIT_GAP_MINUTES * 60_000) router.refresh();
      else touch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [data.since, router]);

  const isNew = useCallback((cat: Cat) => data.since == null || new Date(cat.firstSeenAt).getTime() > data.since, [data.since]);

  // Keep a few cards in hand without ever loading the whole deck (R-49).
  useEffect(() => {
    if (toppingUp.current || cats.length >= TOP_UP_BELOW || remaining <= cats.length) return;
    toppingUp.current = true;
    const held = [...cats.map((c) => c.id), ...decidedIds.current];
    topUpAction(held)
      .then((result) => {
        if (!result.ok) return;
        setCats((current) => {
          const have = new Set(current.map((c) => c.id));
          const fresh = result.cats.filter((c) => !have.has(c.id) && !decidedIds.current.has(c.id));
          return [...current, ...fresh];
        });
      })
      .finally(() => {
        toppingUp.current = false;
      });
  }, [cats, remaining]);

  const record = useCallback(
    (cat: Cat, decision: Decision) => {
      decidedIds.current.add(cat.id);
      setCats((current) => current.filter((c) => c.id !== cat.id));
      setRemaining((n) => Math.max(0, n - 1));
      if (isNew(cat)) setNewCount((n) => Math.max(0, n - 1));
      if (decision === "liked") setSavedCount((n) => n + 1);
      setLast({ cat, decision });
      setCookie(SEEN_COOKIE, String(Date.now()));

      const name = cat.title ?? "that cat";
      const notSaved = (why: string) =>
        setSaveError(`Your swipe on "${name}" wasn't saved, so that cat will come back next time. (${why})`);
      decideAction(cat.id, decision).then(
        (result) => {
          // A swipe that saved means any earlier warning is out of date (R-46).
          if (result.ok) setSaveError(null);
          else notSaved(result.message);
        },
        () => notSaved("No connection"),
      );
    },
    [isNew],
  );

  const undo = useCallback(() => {
    if (!last) return;
    const { cat, decision } = last;
    setLast(null);
    decidedIds.current.delete(cat.id);
    setCats((current) => [cat, ...current.filter((c) => c.id !== cat.id)]);
    setRemaining((n) => n + 1);
    if (isNew(cat)) setNewCount((n) => n + 1);
    if (decision === "liked") setSavedCount((n) => Math.max(0, n - 1));

    const failed = (why: string) => setSaveError(`Couldn't undo that swipe. (${why})`);
    undoAction(cat.id).then(
      (result) => {
        if (result.ok) setSaveError(null);
        else failed(result.message);
      },
      () => failed("No connection"),
    );
  }, [last, isNew]);

  const top = cats[0];
  const next = cats[1];

  const onSwiped = useCallback(
    (direction: SwipeDirection) => {
      if (top) record(top, direction === "right" ? "liked" : "dismissed");
    },
    [top, record],
  );

  const decideFromDetail = (decision: Decision) => {
    if (!detail) return;
    const cat = detail;
    closeDetail();
    record(cat, decision);
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      <header
        className="flex shrink-0 items-center justify-between px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <div>
          <h1 className="font-display text-[22px] font-bold leading-none text-ink">🐾 Kitty Tinder</h1>
          <p className="mt-1 h-4 text-xs text-bark" aria-live="polite">
            {remaining > 0 && (
              <>
                {newCount > 0 && <strong className="font-bold text-rose">{newCount} new · </strong>}
                {pluralCats(remaining)} to review
              </>
            )}
          </p>
        </div>
        <Link
          href="/saved"
          aria-label={`Saved cats (${savedCount})`}
          className="relative flex h-11 w-11 items-center justify-center rounded-full bg-card text-xl text-rose shadow-dismiss"
        >
          ♥
          {savedCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose px-1 text-[10px] font-bold text-white">
              {savedCount}
            </span>
          )}
        </Link>
      </header>

      <OfflineBanner />
      <OverdueBanner status={data.status} now={now} />

      <div className="relative min-h-0 flex-1 px-4 pt-3">
        {!top ? (
          <EmptyState status={data.status} now={now} />
        ) : (
          <div className="relative h-full">
            {next && (
              <div
                key={next.id}
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ transform: "scale(0.95) translateY(12px)", opacity: 0.85 }}
              >
                <CatCard cat={next} now={now} eager />
              </div>
            )}
            <div key={top.id} className="absolute inset-0" style={{ animation: "card-rise 200ms ease-out" }}>
              <SwipeCard
                ref={topCard}
                onSwiped={onSwiped}
                onTap={() => setDetail(top)}
                label={`${top.title ?? "Ragdoll cat"}. Open for details. Swipe right to save, left to dismiss.`}
                likeText={likeText(top)}
              >
                <CatCard cat={top} now={now} eager />
              </SwipeCard>
            </div>
          </div>
        )}
      </div>

      {saveError && (
        <div role="alert" className="mx-4 mt-2 flex shrink-0 items-start gap-2 rounded-xl bg-blush px-3 py-2">
          <span aria-hidden className="text-sm leading-5">
            ⚠️
          </span>
          <p className="flex-1 break-words text-xs leading-5 text-ink">{saveError}</p>
          <button onClick={() => setSaveError(null)} aria-label="Dismiss" className="-m-2 shrink-0 p-2 text-sm text-bark">
            ✕
          </button>
        </div>
      )}

      <div
        className="flex shrink-0 items-center justify-center gap-6 pt-4"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
      >
        <TapButton
          onPress={() => topCard.current?.fling("left")}
          disabled={!top}
          aria-label="Dismiss"
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-2xl text-dismiss shadow-dismiss transition-transform duration-75 active:scale-[0.92] disabled:opacity-40"
        >
          ✕
        </TapButton>
        <TapButton
          onPress={undo}
          disabled={!last}
          aria-label="Undo last swipe"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-xl text-tangerine shadow-dismiss transition-transform duration-75 active:scale-[0.92] disabled:opacity-30"
        >
          ↺
        </TapButton>
        <TapButton
          onPress={() => topCard.current?.fling("right")}
          disabled={!top}
          aria-label="Save"
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-rose text-2xl text-white shadow-like transition-transform duration-75 active:scale-[0.92] disabled:opacity-40"
        >
          ♥
        </TapButton>
      </div>

      {detail && (
        <DetailView
          cat={detail}
          now={now}
          onClose={() => setDetail(null)}
          actions={
            <div className="flex items-center justify-center gap-10">
              <button
                onClick={() => decideFromDetail("dismissed")}
                aria-label="Dismiss"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl text-dismiss shadow-dismiss transition-transform duration-75 active:scale-[0.92]"
              >
                ✕
              </button>
              <button
                onClick={() => decideFromDetail("liked")}
                aria-label="Save"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-rose text-2xl text-white shadow-like transition-transform duration-75 active:scale-[0.92]"
              >
                ♥
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}
