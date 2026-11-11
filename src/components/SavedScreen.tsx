"use client";

import Link from "next/link";
import { useState } from "react";
import { formatAge, formatAgo, pluralCats } from "@/core/format";
import type { SavedCat } from "@/core/types";
import { decideAction } from "@/server/actions";
import { DetailView, closeDetail } from "./DetailView";
import { Photo } from "./Photo";
import { OfflineBanner } from "./States";
import { ArrowOutIcon, BackIcon, HeartIcon } from "./icons";

function GoneBadge({ onPhoto = false }: { onPhoto?: boolean }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
        onPhoto ? "bg-ink/75 text-card" : "bg-fog text-bark"
      }`}
    >
      No longer listed
    </span>
  );
}

export function SavedScreen({ initial, now: nowIso }: { initial: SavedCat[]; now: string }) {
  const now = new Date(nowIso);
  const [cats, setCats] = useState(initial);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = cats.find((c) => c.id === openId) ?? null;

  async function remove(cat: SavedCat) {
    closeDetail();
    setCats((current) => current.filter((c) => c.id !== cat.id));
    const result = await decideAction(cat.id, "dismissed").catch(() => ({ ok: false as const, message: "No connection" }));
    if (result.ok) {
      setError(null);
    } else {
      // Put it back: the removal did not happen.
      setCats((current) => [...current, cat].sort((a, b) => b.likedAt.localeCompare(a.likedAt)));
      setError(`Couldn't remove "${cat.title ?? "that cat"}". (${result.message})`);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header
        className="sticky top-0 z-10 flex items-center gap-3 bg-cream/75 px-5 pb-3 backdrop-blur-xl"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.875rem)" }}
      >
        <Link
          href="/"
          aria-label="Back to the deck"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card text-ink shadow-dismiss transition-transform duration-150 active:scale-90"
        >
          <BackIcon size={22} />
        </Link>
        <div>
          <h1 className="font-display text-[26px] font-bold leading-none tracking-tight text-ink">Saved cats</h1>
          <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-bark">
            <HeartIcon size={12} className="text-rose" />
            {cats.length === 0 ? "Your shortlist" : `${pluralCats(cats.length)} on your shortlist`}
          </p>
        </div>
      </header>

      <OfflineBanner />
      {error && (
        <p role="alert" className="mx-4 mb-3 rounded-2xl bg-ink px-4 py-3 text-xs font-semibold leading-5 text-card shadow-soft">
          {error}
        </p>
      )}

      {cats.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-7 pb-24 text-center" style={{ animation: "rise-in 400ms ease-out" }}>
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-card text-rose shadow-soft" style={{ animation: "float 4s ease-in-out infinite" }}>
            <HeartIcon size={52} />
          </div>
          <h2 className="mt-7 font-display text-2xl font-semibold text-ink">No saved cats yet</h2>
          <p className="mt-2 max-w-[260px] text-[15px] leading-relaxed text-bark">Swipe right on a cat you like and it will wait for you here.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 px-4 pb-10 pt-1">
          {cats.map((cat, i) => {
            const title = cat.title ?? "Ragdoll cat";
            return (
              <li
                key={cat.id}
                className="relative aspect-[3/4.3] overflow-hidden rounded-[26px] bg-ink shadow-soft"
                style={{ animation: `rise-in 360ms ease-out ${Math.min(i, 8) * 50}ms backwards` }}
              >
                <Photo
                  src={cat.photoUrls[0]}
                  alt=""
                  compact
                  className={`absolute inset-0 h-full w-full ${cat.gone ? "opacity-70 grayscale" : ""}`}
                />
                <div aria-hidden className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-ink/90 via-ink/50 to-transparent" />

                <button
                  onClick={() => {
                    setConfirmRemove(false);
                    setOpenId(cat.id);
                  }}
                  className="on-photo absolute inset-0 flex flex-col justify-end p-3.5 text-left text-white outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-rose/60"
                >
                  {cat.gone && (
                    <span className="mb-1.5 [text-shadow:none]">
                      <GoneBadge onPhoto />
                    </span>
                  )}
                  <span className="line-clamp-2 font-display text-[17px] font-semibold leading-tight">{title}</span>
                  <span className="mt-1 truncate text-xs font-semibold text-white/85">
                    {formatAge(cat.ageMonths)}
                    {cat.location && ` · ${cat.location}`}
                  </span>
                  <span className="mt-0.5 text-[11px] font-semibold text-white/65">Saved {formatAgo(cat.likedAt, now)}</span>
                </button>

                <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink/50 px-2.5 py-1 text-[11px] font-extrabold text-white backdrop-blur-md">
                  {Math.round(cat.overall * 10)}% match
                </span>
                <a
                  href={cat.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View listing"
                  className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-card text-ink shadow-dismiss transition-transform duration-150 active:scale-90"
                >
                  <ArrowOutIcon size={20} />
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <DetailView
          cat={open}
          now={now}
          onClose={() => setOpenId(null)}
          badge={
            <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-bark">
              <span className="inline-flex items-center gap-1">
                <HeartIcon size={12} className="text-rose" />
                Saved {formatAgo(open.likedAt, now)}
              </span>
              {open.gone && <GoneBadge />}
            </p>
          }
          actions={
            <button
              onClick={() => (confirmRemove ? remove(open) : setConfirmRemove(true))}
              className={`min-h-[52px] w-full rounded-full px-5 text-[15px] font-extrabold transition-colors ${
                confirmRemove ? "bg-rose text-white shadow-like" : "bg-card text-bark shadow-soft"
              }`}
            >
              {confirmRemove ? "Tap again to remove" : "Remove from saved"}
            </button>
          }
        />
      )}
    </div>
  );
}
