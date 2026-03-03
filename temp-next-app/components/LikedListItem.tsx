import { Listing } from "@/lib/listings";

function formatAge(months: number | null): string {
  if (months == null) return "Age unknown";
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Saved today";
  if (days === 1) return "Saved 1 day ago";
  return `Saved ${days} days ago`;
}

function formatSource(source: string): string {
  if (source === "pets4homes") return "Pets4Homes";
  if (source === "gumtree") return "Gumtree";
  return source;
}

export default function LikedListItem({ listing }: { listing: Listing }) {
  const photoUrl = listing.photo_urls?.[0];

  return (
    <a
      href={listing.external_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm active:bg-zinc-50"
    >
      {/* Thumbnail */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={listing.title ?? "Cat"}
          className="h-[72px] w-[72px] shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-2xl">
          🐱
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-zinc-800">
          {listing.title ?? "Unnamed cat"}
        </p>
        <p className="text-xs text-zinc-500">
          {formatAge(listing.age_months)} · {listing.location_raw ?? "Unknown location"}
        </p>
        <p className="text-xs text-zinc-400">
          Listed on {formatSource(listing.source)}
        </p>
        <p className="text-xs text-zinc-400">{timeAgo(listing.decided_at)}</p>
      </div>

      {/* Score + chevron */}
      <div className="flex shrink-0 items-center gap-2">
        {listing.score_overall != null && (
          <span className="text-sm font-semibold text-zinc-700">
            {listing.score_overall.toFixed(1)} ⭐
          </span>
        )}
        <span className="text-zinc-300">›</span>
      </div>
    </a>
  );
}
