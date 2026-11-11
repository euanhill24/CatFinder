/** Display formatting shared by every screen. Pure, so it renders the same on server and phone. */

export function formatAge(months: number | null): string {
  if (months == null) return "Age unknown";
  if (months < 1) return "Under a month";
  if (months < 24) {
    if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
    const rem = months % 12;
    return rem === 0 ? "1 year" : `1 year ${rem} month${rem === 1 ? "" : "s"}`;
  }
  return `${Math.floor(months / 12)} years`;
}

export function formatPrice(pence: number | null): string {
  if (pence == null) return "Price on request";
  if (pence === 0) return "Free";
  const pounds = pence / 100;
  return `£${pounds.toLocaleString("en-GB", { maximumFractionDigits: Number.isInteger(pounds) ? 0 : 2 })}`;
}

const SOURCE_NAMES: Record<string, string> = {
  pets4homes: "Pets4Homes",
  gumtree: "Gumtree",
  sample: "Sample",
};

export function formatSource(source: string): string {
  return SOURCE_NAMES[source] ?? source.charAt(0).toUpperCase() + source.slice(1);
}

export function formatSex(sex: string): string | null {
  if (sex === "male") return "Male";
  if (sex === "female") return "Female";
  return null;
}

/** "just now", "25m ago", "4h ago", "3 days ago", then a date. */
export function formatAgo(iso: string | null, now: Date): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  const mins = Math.floor((now.getTime() - then.getTime()) / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(iso);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
}

export function pluralCats(n: number): string {
  return `${n} cat${n === 1 ? "" : "s"}`;
}
