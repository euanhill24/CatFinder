"use client";

import { useRef } from "react";
import { Listing } from "@/lib/listings";
import ScoreBar from "./ScoreBar";

function formatAge(months: number | null): string {
  if (months == null) return "Age unknown";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"}`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function formatSource(source: string): string {
  if (source === "pets4homes") return "Pets4Homes";
  if (source === "gumtree") return "Gumtree";
  return source;
}

function sanitizeLocation(loc: string | null): string | null {
  if (!loc || loc.trim() === "") return null;
  if (loc.length > 60) return null;
  const lower = loc.toLowerCase();
  if (
    lower.includes("pets4homes") ||
    lower.includes("gumtree") ||
    lower.includes("cookie") ||
    lower.includes("sign in") ||
    lower.includes("sign up") ||
    lower.includes("http")
  )
    return null;
  return loc.trim();
}

export default function CatCard({
  listing,
  onTap,
}: {
  listing: Listing;
  onTap?: () => void;
}) {
  const photoUrl = listing.photo_urls?.[0];
  const pointerStart = useRef<{ x: number; y: number; t: number } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!pointerStart.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - pointerStart.current.t;
    pointerStart.current = null;
    if (dist < 10 && duration < 300) {
      onTap?.();
    }
  };

  const location = sanitizeLocation(listing.location_raw);

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-[28px] bg-card shadow-[0_8px_32px_rgba(100,40,20,0.10),0_2px_8px_rgba(100,40,20,0.06)]"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Photo */}
      <div className="relative w-full bg-fog" style={{ height: "55%" }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={listing.title ?? "Cat photo"}
            className="h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-6xl">
            🐱
          </div>
        )}
        {listing.score_overall != null && (
          <div className="absolute top-3 right-3 rounded-full bg-card/80 backdrop-blur-sm px-2.5 py-1 font-display font-semibold text-ink text-sm">
            {listing.score_overall.toFixed(1)}/10
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h2 className="font-display font-semibold text-[22px] leading-tight text-ink">
            {listing.title ?? "Unnamed cat"}
          </h2>
          <p className="mt-0.5 text-sm text-bark">
            {formatAge(listing.age_months)}
            {listing.sex && listing.sex !== "unknown"
              ? ` · ${listing.sex.charAt(0).toUpperCase() + listing.sex.slice(1)}`
              : ""}
          </p>
          {location && (
            <p className="text-sm text-bark">
              📍 {location}
            </p>
          )}
        </div>

        {/* Scores */}
        <div className="mt-auto flex flex-col gap-1.5">
          {listing.score_alone != null && (
            <ScoreBar emoji="🏠" label="Alone OK" score={listing.score_alone} />
          )}
          {listing.score_friendly != null && (
            <ScoreBar emoji="😸" label="Friendly" score={listing.score_friendly} />
          )}
          {listing.score_vibe != null && (
            <ScoreBar emoji="✨" label="Vibe" score={listing.score_vibe} />
          )}
          {listing.score_overall != null && (
            <ScoreBar emoji="⭐" label="Overall" score={listing.score_overall} />
          )}
        </div>

        {/* Footer */}
        <p className="mt-1 text-xs text-dust">
          {formatSource(listing.source)}
          {listing.listed_at
            ? ` · Listed ${timeAgo(listing.listed_at)}`
            : listing.ingested_at
              ? ` · Added ${timeAgo(listing.ingested_at)}`
              : ""}
        </p>
      </div>
    </div>
  );
}
