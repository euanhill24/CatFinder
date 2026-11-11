import { Suspense } from "react";
import { DeckScreen } from "@/components/DeckScreen";
import { Header } from "@/components/Header";
import { DeckSkeleton, ErrorState } from "@/components/States";
import { loadHome } from "@/server/load";

async function Deck() {
  const data = await loadHome();
  if (!data.ok) {
    return (
      <Shell>
        <ErrorState problem={data.problem} />
      </Shell>
    );
  }
  // Keyed by load time so a refresh starts the deck again from fresh data.
  return <DeckScreen key={data.now} data={data} />;
}

/** The frame shown while loading or when loading failed: wordmark, no counts. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden">
      <Header />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="wash">
      <Suspense
        fallback={
          <Shell>
            <DeckSkeleton />
          </Shell>
        }
      >
        <Deck />
      </Suspense>
    </main>
  );
}
