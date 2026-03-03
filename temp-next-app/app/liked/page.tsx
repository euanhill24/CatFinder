"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLikedListings } from "@/lib/liked";
import { Listing } from "@/lib/listings";
import LikedListItem from "@/components/LikedListItem";

export default function LikedPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLikedListings()
      .then(setListings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-dvh bg-zinc-50">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow-sm"
        >
          ‹
        </Link>
        <h1 className="text-xl font-bold text-zinc-800">Saved Cats</h1>
      </header>

      <div className="px-4 pb-8 pt-2">
        {loading ? (
          <p className="py-12 text-center text-zinc-400">Loading...</p>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-5xl">🐾</p>
            <p className="mt-4 text-lg font-medium text-zinc-600">
              No cats saved yet
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Start swiping to save your favourites!
            </p>
            <Link
              href="/"
              className="mt-6 rounded-full bg-pink-500 px-6 py-2.5 text-sm font-medium text-white active:scale-95"
            >
              Start swiping
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {listings.map((listing) => (
              <LikedListItem key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
