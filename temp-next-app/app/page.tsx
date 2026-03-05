"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import TinderCard from "react-tinder-card";
import Link from "next/link";
import { getUndecidedListings, Listing } from "@/lib/listings";
import { likeCat, dismissCat } from "@/lib/decisions";
import CatCard from "@/components/CatCard";
import DetailModal from "@/components/DetailModal";
import LikedDrawer from "@/components/LikedDrawer";

type API = { swipe(dir?: string): Promise<void>; restoreCard(): Promise<void> };

const emptySubtexts = [
  "New cats drop every 4 hours. Go touch grass.",
  "Nothing new yet. Maybe pet a real cat?",
  "Check back soon. The internet has more cats, promise.",
];

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedCount, setLikedCount] = useState(0);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const cardRefs = useRef<(API | null)[]>([]);
  const swiping = useRef(false);
  const [emptyText] = useState(() => emptySubtexts[Math.floor(Math.random() * emptySubtexts.length)]);

  useEffect(() => {
    getUndecidedListings()
      .then((data) => {
        setListings(data);
        cardRefs.current = data.map(() => null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    // Get initial liked count
    import("@/lib/liked").then(({ getLikedListings }) =>
      getLikedListings().then((liked) => setLikedCount(liked.length))
    );
  }, []);

  const currentIndex = listings.length - 1;

  const removeListing = useCallback((index: number) => {
    setListings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSwipe = useCallback(
    async (direction: string, index: number) => {
      const listing = listings[index];
      if (!listing) return;
      try {
        if (direction === "right") {
          await likeCat(listing.id);
          setLikedCount((c) => c + 1);
        } else if (direction === "left") {
          await dismissCat(listing.id);
        }
      } catch (err) {
        console.error("Decision failed:", err);
      }
    },
    [listings]
  );

  const handleCardLeftScreen = useCallback(
    (_direction: string, index: number) => {
      removeListing(index);
      swiping.current = false;
    },
    [removeListing]
  );

  const triggerSwipe = useCallback(
    async (dir: "left" | "right") => {
      if (currentIndex < 0 || swiping.current) return;
      swiping.current = true;
      await cardRefs.current[currentIndex]?.swipe(dir);
    },
    [currentIndex]
  );

  const handleDetailAction = useCallback(
    async (action: "like" | "dismiss") => {
      if (!detailListing) return;
      const index = listings.findIndex((l) => l.id === detailListing.id);
      setDetailListing(null);
      if (index < 0) return;

      try {
        if (action === "like") {
          await likeCat(detailListing.id);
          setLikedCount((c) => c + 1);
        } else {
          await dismissCat(detailListing.id);
        }
      } catch (err) {
        console.error("Decision failed:", err);
      }
      removeListing(index);
    },
    [detailListing, listings, removeListing]
  );

  if (loading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-cream">
        <p className="text-lg text-bark">Loading cats...</p>
      </main>
    );
  }

  return (
    <main className="flex h-dvh flex-col items-center bg-cream overflow-hidden">
      {/* Header */}
      <header className="flex w-full max-w-md items-center justify-between px-4 pt-4 shrink-0">
        <h1 className="font-display font-bold text-xl text-ink">🐾 Kitty Tinder</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-bark">
            {listings.length > 0
              ? `${listings.length} cat${listings.length === 1 ? "" : "s"} to review`
              : ""}
          </span>
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-card text-lg shadow-sm"
          >
            ♥
            {likedCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose text-[10px] font-bold text-white">
                {likedCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Card area */}
      <div className="relative mt-4 flex-1 min-h-0 w-full max-w-md px-4">
        {listings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[80px] leading-none">🐾</p>
            <p className="mt-4 font-display font-semibold text-xl text-ink">
              You&apos;re all caught up!
            </p>
            <p className="mt-2 text-sm text-bark max-w-[260px]">{emptyText}</p>
          </div>
        ) : (
          listings.map((listing, index) => (
            <TinderCard
              key={listing.id}
              ref={(el: API | null) => {
                cardRefs.current[index] = el;
              }}
              onSwipe={(dir: string) => handleSwipe(dir, index)}
              onCardLeftScreen={(dir: string) =>
                handleCardLeftScreen(dir, index)
              }
              preventSwipe={["up", "down"]}
              className="absolute inset-0"
            >
              <CatCard
                listing={listing}
                onTap={() => setDetailListing(listing)}
              />
            </TinderCard>
          ))
        )}
      </div>

      {/* Buttons */}
      {listings.length > 0 && (
        <div className="flex gap-10 pb-6 pt-4 shrink-0">
          <button
            onClick={() => triggerSwipe("left")}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-2xl text-[#8C8C8C] shadow-[0_4px_16px_rgba(0,0,0,0.08)] transition-transform duration-[80ms] active:scale-[0.92]"
          >
            ✕
          </button>
          <button
            onClick={() => triggerSwipe("right")}
            className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-rose text-2xl text-white shadow-[0_4px_20px_rgba(232,93,117,0.40)] transition-transform duration-[80ms] active:scale-[0.92]"
          >
            ♥
          </button>
        </div>
      )}

      {/* Liked drawer */}
      <LikedDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Detail modal */}
      {detailListing && (
        <DetailModal
          listing={detailListing}
          onClose={() => setDetailListing(null)}
          onLike={() => handleDetailAction("like")}
          onDismiss={() => handleDetailAction("dismiss")}
        />
      )}
    </main>
  );
}
