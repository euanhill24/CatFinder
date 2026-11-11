"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore, useTransition } from "react";
import type { Problem } from "@/core/errors";
import { formatAgo } from "@/core/format";
import type { CollectionStatus } from "@/core/types";
import { PawIcon, SignalOffIcon } from "./icons";

/** Shown whenever data could not be loaded. Never an empty deck instead (R-80). */
export function ErrorState({ problem }: { problem: Problem }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center px-7 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-ink text-5xl shadow-soft" aria-hidden>
        😿
      </div>
      <h2 className="mt-6 font-display text-2xl font-semibold text-ink">{problem.title}</h2>
      {problem.hint && <p className="mt-2 max-w-xs text-sm leading-relaxed text-bark">{problem.hint}</p>}
      <p className="mt-4 max-w-xs break-words rounded-2xl bg-card px-4 py-3 text-left font-mono text-[11px] leading-5 text-ink shadow-soft">
        {problem.detail}
      </p>
      <button
        onClick={() => startRetry(() => router.refresh())}
        disabled={retrying}
        className="brand-gradient mt-6 min-h-12 rounded-full px-7 text-[15px] font-extrabold text-white shadow-like transition-transform duration-150 active:scale-95 disabled:opacity-60"
      >
        {retrying ? "Trying…" : "Try again"}
      </button>
    </div>
  );
}

const EMPTY_LINES = [
  "New cats are checked for every 4 hours. Go touch grass.",
  "Nothing new yet. Maybe pet a real cat?",
  "Check back soon. The internet has more cats, promise.",
];

export function lastCheckedText(status: CollectionStatus, now: Date): string {
  const ago = formatAgo(status.lastCheckedAt, now);
  return ago ? `Last checked ${ago}` : "New cats haven't been checked for yet";
}

/** The deck is empty because she has seen everything, and we did check (R-81). */
export function EmptyState({ status, now }: { status: CollectionStatus; now: Date }) {
  // Varies by day so it changes between visits but renders the same on server and phone.
  const line = EMPTY_LINES[Math.floor(now.getTime() / 86_400_000) % EMPTY_LINES.length];
  return (
    <div className="flex h-full flex-col items-center justify-center px-7 text-center" style={{ animation: "rise-in 400ms ease-out" }}>
      <div className="relative" style={{ animation: "float 4s ease-in-out infinite" }}>
        <div className="brand-gradient flex h-32 w-32 items-center justify-center rounded-full text-white shadow-like">
          <PawIcon size={68} />
        </div>
        <span aria-hidden className="absolute -right-3 -top-2 text-3xl">
          ✨
        </span>
      </div>
      <h2 className="mt-8 font-display text-[28px] font-semibold leading-tight text-ink">You&apos;re all caught up!</h2>
      <p className="mt-2 max-w-[270px] text-[15px] leading-relaxed text-bark">{line}</p>
      <p className="mt-6 rounded-full bg-card/80 px-4 py-2 text-xs font-bold text-bark shadow-soft">{lastCheckedText(status, now)}</p>
    </div>
  );
}

/** A gentle heads-up when collection has not succeeded for a day (R-82). */
export function OverdueBanner({ status, now }: { status: CollectionStatus; now: Date }) {
  if (!status.overdue) return null;
  const ago = formatAgo(status.lastCheckedAt, now);
  return (
    <p role="status" className="mx-4 mt-3 rounded-2xl bg-card/90 px-4 py-2.5 text-xs font-semibold leading-5 text-ink shadow-soft backdrop-blur">
      <span aria-hidden>⏳ </span>
      {ago
        ? `New cats were last checked for ${ago}, which is longer than usual. There may be listings missing.`
        : "New cats haven't been checked for yet, so there may be listings missing."}
    </p>
  );
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
  if (online) return null;
  return (
    <p role="status" className="mx-4 mt-3 flex items-center gap-2 rounded-2xl bg-ink px-4 py-2.5 text-xs font-semibold leading-5 text-card shadow-soft">
      <SignalOffIcon size={16} className="shrink-0" />
      You&apos;re offline. Swipes won&apos;t save until you&apos;re connected again.
    </p>
  );
}

/** Placeholder while the first cards load. */
export function DeckSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Loading cats">
      <div className="relative min-h-0 flex-1 px-4 pb-5 pt-4">
        <div
          className="flex h-full flex-col justify-end gap-3 rounded-card bg-gradient-to-b from-fog to-dust/60 p-5 shadow-card"
          style={{ animation: "shimmer 1.4s ease-in-out infinite" }}
        >
          <div className="h-7 w-2/3 rounded-full bg-card/70" />
          <div className="h-3.5 w-1/2 rounded-full bg-card/60" />
          <div className="h-24 rounded-2xl bg-card/40" />
        </div>
      </div>
      <div className="h-[124px] shrink-0" />
    </div>
  );
}
