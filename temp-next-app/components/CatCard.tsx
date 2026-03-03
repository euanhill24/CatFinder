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

export default function CatCard({
  listing,
  onTap,
}: {
  listing: Listing;
  onTap?: () => void;
}) {
  const photoUrl = listing.photo_urls?.[0];

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white shadow-lg"
      onClick={(e) => {
        e.stopPropagation();
        onTap?.();
      }}
    >
      {/* Photo */}
      <div className="relative w-full" style={{ height: "55%" }}>
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={listing.title ?? "Cat photo"}
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-100 text-6xl">
            🐱
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h2 className="text-lg font-semibold leading-tight text-zinc-900">
            {listing.title ?? "Unnamed cat"}
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            {formatAge(listing.age_months)}
            {listing.sex && listing.sex !== "unknown"
              ? ` · ${listing.sex.charAt(0).toUpperCase() + listing.sex.slice(1)}`
              : ""}
          </p>
          {listing.location_raw && (
            <p className="text-sm text-zinc-500">
              📍 {listing.location_raw}
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
        <p className="mt-1 text-xs text-zinc-400">
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
