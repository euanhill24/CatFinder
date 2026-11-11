import type { Metadata } from "next";
import { Suspense } from "react";
import { SavedScreen } from "@/components/SavedScreen";
import { ErrorState } from "@/components/States";
import { loadSaved } from "@/server/load";

export const metadata: Metadata = { title: "Saved Cats · Kitty Tinder" };

async function Saved() {
  const data = await loadSaved();
  if (!data.ok) {
    return (
      <div className="h-dvh">
        <ErrorState problem={data.problem} />
      </div>
    );
  }
  return <SavedScreen key={data.now} initial={data.cats} now={data.now} />;
}

export default function SavedPage() {
  return (
    <main className="min-h-dvh bg-shortlist">
      <Suspense fallback={<p className="p-8 text-center text-sm text-bark">Loading saved cats…</p>}>
        <Saved />
      </Suspense>
    </main>
  );
}
