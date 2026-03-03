"use client";

import { useState } from "react";
import { Listing } from "@/lib/listings";
import ScoreBar from "./ScoreBar";

function formatAge(months: number | null): string {
  if (months == null) return "Age unknown";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"}`;
}

function formatPrice(pence: number | null): string {
  if (pence == null) return "Price on request";
  return `£${(pence / 100).toLocaleString("en-GB")}`;
}

function formatSource(source: string): string {
  if (source === "pets4homes") return "Pets4Homes";
  if (source === "gumtree") return "Gumtree";
  return source;
}

export default function DetailModal({
  listing,
  onClose,
  onLike,
  onDismiss,
}: {
  listing: Listing;
  onClose: () => void;
  onLike: () => void;
  onDismiss: () => void;
}) {
  const photos = listing.photo_urls ?? [];
  const [photoIndex, setPhotoIndex] = useState(0);
  const rationale = listing.score_rationale;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-white"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-lg font-semibold text-zinc-800 truncate pr-4">
          {listing.title ?? "Unnamed cat"}
        </h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Photo gallery */}
        {photos.length > 0 ? (
          <div className="relative">
            <img
              src={photos[photoIndex]}
              alt={`Photo ${photoIndex + 1}`}
              className="h-72 w-full object-cover"
            />
            {photos.length > 1 && (
              <>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIndex(i)}
                      className={`h-2 w-2 rounded-full ${
                        i === photoIndex ? "bg-white" : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
                {photoIndex > 0 && (
                  <button
                    onClick={() => setPhotoIndex((p) => p - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 px-2 py-1 text-white"
                  >
                    ‹
                  </button>
                )}
                {photoIndex < photos.length - 1 && (
                  <button
                    onClick={() => setPhotoIndex((p) => p + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 px-2 py-1 text-white"
                  >
                    ›
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center bg-zinc-100 text-5xl">
            🐱
          </div>
        )}

        <div className="space-y-5 px-4 pt-4">
          {/* Quick info */}
          <div>
            <p className="text-sm text-zinc-600">
              {formatAge(listing.age_months)}
              {listing.sex && listing.sex !== "unknown"
                ? ` · ${listing.sex.charAt(0).toUpperCase() + listing.sex.slice(1)}`
                : ""}
              {" · "}
              {formatPrice(listing.price)}
            </p>
            {listing.location_raw && (
              <p className="text-sm text-zinc-500">
                📍 {listing.location_raw}
              </p>
            )}
            <p className="mt-1 text-xs text-zinc-400">
              Listed on {formatSource(listing.source)}
            </p>
          </div>

          {/* Scores with rationale */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-700">Scores</h3>
            {listing.score_alone != null && (
              <div>
                <ScoreBar emoji="🏠" label="Alone OK" score={listing.score_alone} />
                {rationale?.alone && (
                  <p className="ml-7 mt-0.5 text-xs text-zinc-400">{rationale.alone}</p>
                )}
              </div>
            )}
            {listing.score_friendly != null && (
              <div>
                <ScoreBar emoji="😸" label="Friendly" score={listing.score_friendly} />
                {rationale?.friendly && (
                  <p className="ml-7 mt-0.5 text-xs text-zinc-400">{rationale.friendly}</p>
                )}
              </div>
            )}
            {listing.score_vibe != null && (
              <div>
                <ScoreBar emoji="✨" label="Vibe" score={listing.score_vibe} />
                {rationale?.vibe && (
                  <p className="ml-7 mt-0.5 text-xs text-zinc-400">{rationale.vibe}</p>
                )}
              </div>
            )}
            {listing.score_distance != null && (
              <div>
                <ScoreBar emoji="📍" label="Distance" score={listing.score_distance} />
                {rationale?.distance && (
                  <p className="ml-7 mt-0.5 text-xs text-zinc-400">{rationale.distance}</p>
                )}
              </div>
            )}
            {listing.score_age != null && (
              <div>
                <ScoreBar emoji="🎂" label="Age" score={listing.score_age} />
                {rationale?.age && (
                  <p className="ml-7 mt-0.5 text-xs text-zinc-400">{rationale.age}</p>
                )}
              </div>
            )}
            {listing.score_overall != null && (
              <div>
                <ScoreBar emoji="⭐" label="Overall" score={listing.score_overall} />
              </div>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-700">Description</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                {listing.description}
              </p>
            </div>
          )}

          {/* Link to original */}
          <a
            href={listing.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg bg-zinc-100 px-4 py-3 text-center text-sm font-medium text-zinc-700"
          >
            View original listing →
          </a>
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center gap-6 border-t border-zinc-100 bg-white/95 py-4 backdrop-blur">
        <button
          onClick={onDismiss}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 text-xl active:scale-95"
        >
          ✕
        </button>
        <button
          onClick={onLike}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-500 text-xl text-white active:scale-95"
        >
          ♥
        </button>
      </div>
    </div>
  );
}
