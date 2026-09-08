import { Listing, isStale } from "@/lib/listings";

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

function sanitizeLocation(loc: string | null): string | null {
  if (!loc || loc.trim() === "") return null;
  if (loc.length > 60) return null;
  const lower = loc.toLowerCase();
  if (
    lower.includes("pets4homes") ||
    lower.includes("gumtree") ||
    lower.includes("cookie") ||
    lower.includes("sign in") ||
    lower.includes("http")
  )
    return null;
  return loc.trim();
}

export default function LikedListItem({ listing }: { listing: Listing }) {
  const photoUrl = listing.photo_urls?.[0];
  const location = sanitizeLocation(listing.location_raw);
  // Saved cats are never hidden when they go stale — a cat you liked that has
  // since been taken down is exactly the thing you need to be told about.
  const gone = isStale(listing);

  return (
    <a
      href={listing.external_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 rounded-xl bg-card p-3 shadow-[0_4px_16px_rgba(100,40,20,0.08)] active:bg-fog ${
        gone ? "opacity-60" : ""
      }`}
    >
      {/* Thumbnail */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={listing.title ?? "Cat"}
          className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-fog text-2xl">
          🐱
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {listing.title ?? "Unnamed cat"}
        </p>
        {gone && (
          <span className="mt-0.5 inline-block rounded-full bg-fog px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-bark">
            No longer listed
          </span>
        )}
        <p className="text-xs text-bark">
          {formatAge(listing.age_months)} · {location ?? "Location unknown"}
        </p>
        <p className="text-xs text-dust">
          Listed on {formatSource(listing.source)}
        </p>
        <p className="text-xs text-dust">{timeAgo(listing.decided_at)}</p>
      </div>

      {/* Score + chevron */}
      <div className="flex shrink-0 items-center gap-2">
        {listing.score_overall != null && (
          <span className="text-sm font-semibold text-ink">
            {listing.score_overall.toFixed(1)} ⭐
          </span>
        )}
        <span className="text-dust">›</span>
      </div>
    </a>
  );
}
