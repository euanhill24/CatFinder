"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import TinderCard from "react-tinder-card";
import Link from "next/link";
import { getUndecidedListings, Listing } from "@/lib/listings";
import { likeCat, dismissCat } from "@/lib/decisions";
import CatCard from "@/components/CatCard";
import DetailModal from "@/components/DetailModal";

type API = { swipe(dir?: string): Promise<void>; restoreCard(): Promise<void> };

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedCount, setLikedCount] = useState(0);
  const [detailListing, setDetailListing] = useState<Listing | null>(null);
  const cardRefs = useRef<(API | null)[]>([]);
  const swiping = useRef(false);

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
      <main className="flex min-h-dvh items-center justify-center bg-zinc-50">
        <p className="text-lg text-zinc-400">Loading cats...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center bg-zinc-50">
      {/* Header */}
      <header className="flex w-full max-w-md items-center justify-between px-4 pt-4">
        <h1 className="text-xl font-bold text-zinc-800">Kitty Tinder</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">
            {listings.length > 0
              ? `${listings.length} cat${listings.length === 1 ? "" : "s"} to review`
              : ""}
          </span>
          <Link
            href="/liked"
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow-sm"
          >
            ♥
            {likedCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">
                {likedCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Card area */}
      <div className="relative mt-4 h-[72dvh] w-full max-w-md px-4">
        {listings.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-5xl">🐾</p>
            <p className="mt-4 text-lg font-medium text-zinc-600">
              You&apos;re all caught up!
            </p>
            <p className="mt-1 text-sm text-zinc-400">Check back later</p>
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
        <div className="flex gap-8 pb-6 pt-4">
          <button
            onClick={() => triggerSwipe("left")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl shadow-md active:scale-95"
          >
            ✕
          </button>
          <button
            onClick={() => triggerSwipe("right")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-pink-500 text-2xl text-white shadow-md active:scale-95"
          >
            ♥
          </button>
        </div>
      )}

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
