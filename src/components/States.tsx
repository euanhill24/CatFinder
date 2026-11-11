"use client";

import { useRouter } from "next/navigation";
import { useSyncExternalStore, useTransition } from "react";
import type { Problem } from "@/core/errors";
import { formatAgo } from "@/core/format";
import type { CollectionStatus } from "@/core/types";

/** Shown whenever data could not be loaded. Never an empty deck instead (R-80). */
export function ErrorState({ problem }: { problem: Problem }) {
  const router = useRouter();
  const [retrying, startRetry] = useTransition();

  return (
    <div role="alert" className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p aria-hidden className="text-[64px] leading-none">
        😿
      </p>
      <h2 className="mt-4 font-display text-xl font-semibold text-ink">{problem.title}</h2>
      {problem.hint && <p className="mt-2 max-w-xs text-sm text-bark">{problem.hint}</p>}
      <p className="mt-3 max-w-xs break-words rounded-xl bg-blush px-3 py-2 text-left text-xs leading-5 text-ink">
        {problem.detail}
      </p>
      <button
        onClick={() => startRetry(() => router.refresh())}
        disabled={retrying}
        className="mt-5 min-h-12 rounded-full bg-rose px-6 text-[15px] font-bold text-white shadow-like transition-transform duration-75 active:scale-95 disabled:opacity-60"
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
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <p aria-hidden className="text-[80px] leading-none">
        🐾
      </p>
      <h2 className="mt-4 font-display text-xl font-semibold text-ink">You&apos;re all caught up!</h2>
      <p className="mt-2 max-w-[260px] text-sm text-bark">{line}</p>
      <p className="mt-4 text-xs text-dust">{lastCheckedText(status, now)}</p>
    </div>
  );
}

/** A gentle note when collection has not succeeded for a day (R-82). */
export function OverdueBanner({ status, now }: { status: CollectionStatus; now: Date }) {
  if (!status.overdue) return null;
  const ago = formatAgo(status.lastCheckedAt, now);
  return (
    <p role="status" className="mx-4 mt-2 rounded-xl bg-blush px-3 py-2 text-xs leading-5 text-ink">
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
    <p role="status" className="mx-4 mt-2 rounded-xl bg-fog px-3 py-2 text-xs leading-5 text-ink">
      <span aria-hidden>📡 </span>
      You&apos;re offline. Swipes won&apos;t save until you&apos;re connected again.
    </p>
  );
}

/** Placeholder while the first cards load. */
export function DeckSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-busy="true" aria-label="Loading cats">
      <div className="relative min-h-0 flex-1 px-4 pt-3">
        <div className="h-full rounded-card bg-card shadow-card" style={{ animation: "shimmer 1.4s ease-in-out infinite" }}>
          <div className="h-[58%] rounded-t-card bg-fog" />
          <div className="space-y-3 p-5">
            <div className="h-6 w-2/3 rounded-full bg-fog" />
            <div className="h-3 w-1/2 rounded-full bg-fog" />
            <div className="h-2 w-full rounded-full bg-fog" />
            <div className="h-2 w-full rounded-full bg-fog" />
          </div>
        </div>
      </div>
      <div className="h-[120px] shrink-0" />
    </div>
  );
}
