import { Suspense } from "react";
import { DeckScreen } from "@/components/DeckScreen";
import { DeckSkeleton, ErrorState } from "@/components/States";
import { loadHome } from "@/server/load";

async function Deck() {
  const data = await loadHome();
  if (!data.ok) return <Shell><ErrorState problem={data.problem} /></Shell>;
  // Keyed by load time so a refresh starts the deck again from fresh data.
  return <DeckScreen key={data.now} data={data} />;
}

/** The frame shown while loading or when loading failed: wordmark, no counts. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      <header className="shrink-0 px-4" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}>
        <h1 className="font-display text-[22px] font-bold leading-none text-ink">🐾 Kitty Tinder</h1>
        <p className="mt-1 h-4" />
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="bg-cream">
      <Suspense fallback={<Shell><DeckSkeleton /></Shell>}>
        <Deck />
      </Suspense>
    </main>
  );
}
