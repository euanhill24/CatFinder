"use client";

import Link from "next/link";
import { useState } from "react";
import { formatAge, formatAgo } from "@/core/format";
import type { SavedCat } from "@/core/types";
import { decideAction, noteAction } from "@/server/actions";
import { DetailView, closeDetail } from "./DetailView";
import { Photo } from "./Photo";
import { OfflineBanner } from "./States";

function GoneBadge() {
  return (
    <span className="inline-block rounded-full bg-fog px-2 py-0.5 text-[11px] font-bold text-bark">No longer listed</span>
  );
}

function NoteEditor({ cat, onSaved }: { cat: SavedCat; onSaved: (note: string | null) => void }) {
  const [text, setText] = useState(cat.note ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const changed = text.trim() !== (cat.note ?? "");

  async function save() {
    setState("saving");
    const result = await noteAction(cat.id, text).catch(() => ({ ok: false as const }));
    if (result.ok) {
      onSaved(text.trim() || null);
      setState("saved");
    } else {
      setState("failed");
    }
  }

  return (
    <section aria-label="Your note" className="rounded-2xl bg-card p-4 shadow-card">
      <label htmlFor="note" className="text-xs font-semibold text-bark">
        Your note
      </label>
      <textarea
        id="note"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setState("idle");
        }}
        maxLength={2000}
        rows={2}
        placeholder="Messaged the seller, viewing Saturday…"
        className="mt-1 w-full resize-none rounded-xl bg-cream px-3 py-2 text-base text-ink outline-none placeholder:text-dust focus:ring-2 focus:ring-rose/40"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-bark" role="status">
          {state === "saved" && !changed && "Saved"}
          {state === "failed" && "Couldn't save. Try again."}
        </span>
        <button
          onClick={save}
          disabled={!changed || state === "saving"}
          className="min-h-11 rounded-full bg-rose px-5 text-sm font-bold text-white disabled:opacity-40"
        >
          {state === "saving" ? "Saving…" : "Save note"}
        </button>
      </div>
    </section>
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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-shortlist">
      <header
        className="sticky top-0 z-10 flex items-center gap-2 bg-shortlist/95 px-4 pb-3 backdrop-blur"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <Link
          href="/"
          aria-label="Back to the deck"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-lg text-ink shadow-dismiss"
        >
          ←
        </Link>
        <h1 className="font-display text-[22px] font-bold text-ink">
          Saved Cats <span className="text-rose">♥</span>
        </h1>
      </header>

      <OfflineBanner />
      {error && (
        <p role="alert" className="mx-4 mb-2 rounded-xl bg-blush px-3 py-2 text-xs leading-5 text-ink">
          ⚠️ {error}
        </p>
      )}

      {cats.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">
          <p aria-hidden className="text-[64px] leading-none">
            💛
          </p>
          <h2 className="mt-4 font-display text-xl font-semibold text-ink">No saved cats yet</h2>
          <p className="mt-2 max-w-[260px] text-sm text-bark">Swipe right on a cat you like and it will wait for you here.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 px-4 pb-8">
          {cats.map((cat) => (
            <li key={cat.id} className={`rounded-2xl bg-card p-3 shadow-card ${cat.gone ? "opacity-70" : ""}`}>
              <button
                onClick={() => {
                  setConfirmRemove(false);
                  setOpenId(cat.id);
                }}
                className="flex w-full gap-3 text-left"
              >
                <Photo
                  src={cat.photoUrls[0]}
                  alt=""
                  className={`h-20 w-20 shrink-0 rounded-xl text-[10px] ${cat.gone ? "grayscale" : ""}`}
                />
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 font-display text-base font-semibold leading-tight text-ink">
                    {cat.title ?? "Ragdoll cat"}
                  </h2>
                  <p className="mt-0.5 truncate text-[13px] text-bark">
                    {formatAge(cat.ageMonths)}
                    {cat.location && ` · ${cat.location}`}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-dust">
                    <span className="font-bold text-rose">⭐ {cat.overall.toFixed(1)}</span>
                    <span>Saved {formatAgo(cat.likedAt, now)}</span>
                    {cat.gone && <GoneBadge />}
                  </p>
                </div>
              </button>
              {cat.note && <p className="mt-2 line-clamp-2 rounded-xl bg-cream px-3 py-2 text-[13px] text-ink">📝 {cat.note}</p>}
              <a
                href={cat.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex min-h-11 items-center justify-center rounded-full bg-rose px-4 text-sm font-bold text-white"
              >
                View listing <span aria-hidden className="ml-1">↗</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <DetailView
          cat={open}
          now={now}
          onClose={() => setOpenId(null)}
          badge={
            <p className="flex flex-wrap items-center gap-2 text-xs text-bark">
              <span>Saved {formatAgo(open.likedAt, now)}</span>
              {open.gone && <GoneBadge />}
            </p>
          }
          extra={
            <NoteEditor
              key={open.id}
              cat={open}
              onSaved={(note) => setCats((current) => current.map((c) => (c.id === open.id ? { ...c, note } : c)))}
            />
          }
          actions={
            <button
              onClick={() => (confirmRemove ? remove(open) : setConfirmRemove(true))}
              className={`min-h-12 w-full rounded-full px-5 text-[15px] font-bold ${
                confirmRemove ? "bg-ink text-card" : "bg-card text-bark shadow-dismiss"
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
