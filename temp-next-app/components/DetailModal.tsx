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
  const location = sanitizeLocation(listing.location_raw);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-cream"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-display font-bold text-[28px] text-ink truncate pr-4">
          {listing.title ?? "Unnamed cat"}
        </h2>
        <button
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fog text-bark"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Photo gallery */}
        {photos.length > 0 ? (
          <div className="relative bg-fog">
            <img
              src={photos[photoIndex]}
              alt={`Photo ${photoIndex + 1}`}
              className="h-72 w-full object-contain"
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
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/30 px-2 py-1 text-white"
                  >
                    ‹
                  </button>
                )}
                {photoIndex < photos.length - 1 && (
                  <button
                    onClick={() => setPhotoIndex((p) => p + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-ink/30 px-2 py-1 text-white"
                  >
                    ›
                  </button>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center bg-fog text-5xl">
            🐱
          </div>
        )}

        <div className="space-y-5 px-4 pt-4">
          {/* Quick info */}
          <div>
            <p className="text-sm text-bark">
              {formatAge(listing.age_months)}
              {listing.sex && listing.sex !== "unknown"
                ? ` · ${listing.sex.charAt(0).toUpperCase() + listing.sex.slice(1)}`
                : ""}
              {" · "}
              {formatPrice(listing.price)}
            </p>
            {location && (
              <p className="text-sm text-bark">
                📍 {location}
              </p>
            )}
            <p className="mt-1 text-xs text-dust">
              Listed on {formatSource(listing.source)}
            </p>
          </div>

          {/* Scores with rationale */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-ink">Scores</h3>
            {listing.score_alone != null && (
              <div>
                <ScoreBar emoji="🏠" label="Alone OK" score={listing.score_alone} />
                {rationale?.alone && (
                  <p className="ml-7 mt-0.5 text-xs text-dust">{rationale.alone}</p>
                )}
              </div>
            )}
            {listing.score_friendly != null && (
              <div>
                <ScoreBar emoji="😸" label="Friendly" score={listing.score_friendly} />
                {rationale?.friendly && (
                  <p className="ml-7 mt-0.5 text-xs text-dust">{rationale.friendly}</p>
                )}
              </div>
            )}
            {listing.score_vibe != null && (
              <div>
                <ScoreBar emoji="✨" label="Vibe" score={listing.score_vibe} />
                {rationale?.vibe && (
                  <p className="ml-7 mt-0.5 text-xs text-dust">{rationale.vibe}</p>
                )}
              </div>
            )}
            {listing.score_distance != null && (
              <div>
                <ScoreBar emoji="📍" label="Distance" score={listing.score_distance} />
                {rationale?.distance && (
                  <p className="ml-7 mt-0.5 text-xs text-dust">{rationale.distance}</p>
                )}
              </div>
            )}
            {listing.score_age != null && (
              <div>
                <ScoreBar emoji="🎂" label="Age" score={listing.score_age} />
                {rationale?.age && (
                  <p className="ml-7 mt-0.5 text-xs text-dust">{rationale.age}</p>
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
              <h3 className="text-sm font-semibold text-ink">Description</h3>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-bark">
                {listing.description}
              </p>
            </div>
          )}

          {/* Link to original */}
          <a
            href={listing.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-full bg-rose px-4 py-3 text-center text-sm font-bold text-white"
          >
            View original listing →
          </a>
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-center gap-10 bg-cream/95 py-4 backdrop-blur">
        <button
          onClick={onDismiss}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xl text-[#8C8C8C] shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-transform duration-[80ms] active:scale-[0.92]"
        >
          ✕
        </button>
        <button
          onClick={onLike}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-rose text-xl text-white shadow-[0_4px_20px_rgba(232,93,117,0.40)] transition-transform duration-[80ms] active:scale-[0.92]"
        >
          ♥
        </button>
      </div>
    </div>
  );
}
