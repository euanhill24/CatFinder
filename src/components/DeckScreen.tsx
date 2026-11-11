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
import { Header } from "./Header";
import { EmptyState, OfflineBanner, OverdueBanner } from "./States";
import { SwipeCard, type SwipeDirection, type SwipeHandle } from "./SwipeCard";
import { TapButton } from "./TapButton";
import { CloseIcon, HeartIcon, UndoIcon } from "./icons";

/** Fetch more cards when the phone is holding this few. */
const TOP_UP_BELOW = 5;
const YEAR_SECONDS = 365 * 24 * 60 * 60;

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${YEAR_SECONDS}; samesite=lax`;
}

function likeText(cat: Cat): string {
  if (cat.sex === "female") return "Love her!";
  if (cat.sex === "male") return "Love him!";
  return "Love!";
}

interface LastDecision {
  cat: Cat;
  decision: Decision;
}

const HEARTS = [
  { dx: -70, s: 1.1, rot: -24, delay: 0 },
  { dx: -30, s: 1.5, rot: 10, delay: 60 },
  { dx: 0, s: 1.9, rot: -6, delay: 0 },
  { dx: 36, s: 1.3, rot: 18, delay: 90 },
  { dx: 74, s: 1, rot: 28, delay: 40 },
  { dx: -12, s: 0.9, rot: -14, delay: 140 },
];

/** A short burst of hearts when a cat is saved. */
function HeartBurst() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-28 z-30 flex justify-center">
      {HEARTS.map((h, i) => (
        <HeartIcon
          key={i}
          size={30}
          className="absolute text-rose drop-shadow"
          style={{
            ["--dx" as string]: `${h.dx}px`,
            ["--s" as string]: h.s,
            ["--rot" as string]: `${h.rot}deg`,
            animation: `heart-float 900ms ease-out ${h.delay}ms both`,
          }}
        />
      ))}
    </div>
  );
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
  const [burst, setBurst] = useState(0);

  const topCard = useRef<SwipeHandle>(null);
  const stack = useRef<HTMLDivElement>(null);
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

  const isNew = useCallback(
    (cat: Cat) => data.since != null && new Date(cat.firstSeenAt).getTime() > data.since,
    [data.since],
  );
  /** On a first visit everything counts as new, so the badge would mean nothing. */
  const countsAsNew = useCallback((cat: Cat) => data.since == null || isNew(cat), [data.since, isNew]);

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

  /** The card behind grows into place as the top card is pulled away. */
  const onPull = useCallback((pull: number) => {
    stack.current?.style.setProperty("--pull", String(Math.abs(pull)));
  }, []);

  const record = useCallback(
    (cat: Cat, decision: Decision) => {
      decidedIds.current.add(cat.id);
      stack.current?.style.setProperty("--pull", "0");
      setCats((current) => current.filter((c) => c.id !== cat.id));
      setRemaining((n) => Math.max(0, n - 1));
      if (countsAsNew(cat)) setNewCount((n) => Math.max(0, n - 1));
      if (decision === "liked") {
        setSavedCount((n) => n + 1);
        setBurst((n) => n + 1);
      }
      setLast({ cat, decision });
      setCookie(SEEN_COOKIE, String(Date.now()));
      navigator.vibrate?.(decision === "liked" ? [12, 40, 12] : 8);

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
    [countsAsNew],
  );

  const undo = useCallback(() => {
    if (!last) return;
    const { cat, decision } = last;
    setLast(null);
    decidedIds.current.delete(cat.id);
    setCats((current) => [cat, ...current.filter((c) => c.id !== cat.id)]);
    setRemaining((n) => n + 1);
    if (countsAsNew(cat)) setNewCount((n) => n + 1);
    if (decision === "liked") setSavedCount((n) => Math.max(0, n - 1));

    const failed = (why: string) => setSaveError(`Couldn't undo that swipe. (${why})`);
    undoAction(cat.id).then(
      (result) => {
        if (result.ok) setSaveError(null);
        else failed(result.message);
      },
      () => failed("No connection"),
    );
  }, [last, countsAsNew]);

  const top = cats[0];
  const next = cats[1];
  const third = cats[2];

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
    <div className="relative isolate mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      {/* The top cat's photo, blurred, tints the whole screen. */}
      {top?.photoUrls[0] && (
        <div key={top.id} aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ animation: "fade-in 600ms ease-out" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={top.photoUrls[0]} alt="" className="h-full w-full scale-125 object-cover opacity-45 blur-3xl saturate-150" />
          <div className="absolute inset-0 bg-gradient-to-b from-cream/70 via-cream/20 to-cream/90" />
        </div>
      )}

      <Header
        status={
          <p aria-live="polite" className="flex items-center gap-1.5">
            {remaining > 0 ? (
              <>
                {newCount > 0 && (
                  <span className="brand-gradient rounded-full px-2 py-0.5 text-[11px] font-extrabold text-white">{newCount} new</span>
                )}{" "}
                <span>{pluralCats(remaining)} to review</span>
              </>
            ) : (
              <span>All caught up</span>
            )}
          </p>
        }
        action={
          <Link
            href="/saved"
            aria-label={`Saved cats (${savedCount})`}
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-card/90 text-rose shadow-dismiss backdrop-blur transition-transform duration-150 active:scale-90"
          >
            <HeartIcon size={22} />
            {savedCount > 0 && (
              <span
                key={savedCount}
                className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-ink px-1 text-[11px] font-extrabold text-card"
                style={{ animation: "pop 320ms ease-out" }}
              >
                {savedCount}
              </span>
            )}
          </Link>
        }
      />

      <OfflineBanner />
      <OverdueBanner status={data.status} now={now} />

      <div className="relative min-h-0 flex-1 px-4 pb-5 pt-4">
        {!top ? (
          <EmptyState status={data.status} now={now} />
        ) : (
          <div ref={stack} className="relative h-full" style={{ ["--pull" as string]: 0 }}>
            {third && (
              <div
                key={third.id}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-card bg-card/70 shadow-soft"
                style={{
                  transform: "translateY(calc(26px - 12px * var(--pull))) scale(calc(0.88 + 0.05 * var(--pull)))",
                  transformOrigin: "50% 100%",
                }}
              />
            )}
            {next && (
              <div
                key={next.id}
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  transform: "translateY(calc(14px - 14px * var(--pull))) scale(calc(0.94 + 0.06 * var(--pull)))",
                  transformOrigin: "50% 100%",
                  filter: "brightness(calc(0.82 + 0.18 * var(--pull)))",
                }}
              >
                <CatCard cat={next} now={now} eager isNew={isNew(next)} />
              </div>
            )}
            <div key={top.id} className="absolute inset-0" style={{ animation: "card-rise 260ms cubic-bezier(0.2, 0.8, 0.2, 1)", transformOrigin: "50% 100%" }}>
              <SwipeCard
                ref={topCard}
                onSwiped={onSwiped}
                onPull={onPull}
                onTap={() => setDetail(top)}
                label={`${top.title ?? "Ragdoll cat"}. Open for details. Swipe right to save, left to dismiss.`}
                likeText={likeText(top)}
              >
                <CatCard cat={top} now={now} eager isNew={isNew(top)} />
              </SwipeCard>
            </div>
          </div>
        )}
      </div>

      {burst > 0 && <HeartBurst key={burst} />}

      {saveError && (
        <div role="alert" className="mx-4 mt-3 flex shrink-0 items-start gap-2 rounded-2xl bg-ink px-4 py-3 text-card shadow-soft" style={{ animation: "rise-in 200ms ease-out" }}>
          <p className="flex-1 break-words text-xs font-semibold leading-5">{saveError}</p>
          <button onClick={() => setSaveError(null)} aria-label="Dismiss message" className="-m-2 shrink-0 p-2 text-card/70">
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      <div
        className="flex shrink-0 items-center justify-center gap-5 pt-3"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
      >
        <TapButton
          onPress={() => topCard.current?.fling("left")}
          disabled={!top}
          aria-label="Dismiss"
          className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-card text-dismiss shadow-dismiss transition-transform duration-150 active:scale-90 disabled:opacity-40"
        >
          <CloseIcon size={30} />
        </TapButton>
        <TapButton
          onPress={undo}
          disabled={!last}
          aria-label="Undo last swipe"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-tangerine shadow-dismiss transition-all duration-150 active:scale-90 disabled:opacity-35 disabled:shadow-none"
        >
          <UndoIcon size={22} />
        </TapButton>
        <TapButton
          onPress={() => topCard.current?.fling("right")}
          disabled={!top}
          aria-label="Save"
          className="brand-gradient flex h-[76px] w-[76px] items-center justify-center rounded-full text-white shadow-like transition-transform duration-150 active:scale-90 disabled:opacity-40"
        >
          <HeartIcon size={34} />
        </TapButton>
      </div>

      {detail && (
        <DetailView
          cat={detail}
          now={now}
          onClose={() => setDetail(null)}
          actions={
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={() => decideFromDetail("dismissed")}
                aria-label="Dismiss"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-card text-dismiss shadow-dismiss transition-transform duration-150 active:scale-90"
              >
                <CloseIcon size={28} />
              </button>
              <button
                onClick={() => decideFromDetail("liked")}
                aria-label="Save"
                className="brand-gradient flex h-[72px] w-[72px] items-center justify-center rounded-full text-white shadow-like transition-transform duration-150 active:scale-90"
              >
                <HeartIcon size={32} />
              </button>
            </div>
          }
        />
      )}
    </div>
  );
}
