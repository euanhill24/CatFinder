"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getLikedListings } from "@/lib/liked";
import { Listing } from "@/lib/listings";
import { ConfigError, describeError } from "@/lib/errors";
import LikedListItem from "@/components/LikedListItem";
import ErrorState from "@/components/ErrorState";

export default function LikedPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ message: string; isConfig: boolean } | null>(null);

  useEffect(() => {
    getLikedListings()
      .then(setListings)
      .catch((err) => {
        console.error("Failed to load liked listings:", err);
        setLoadError({
          message: describeError(err),
          isConfig: err instanceof ConfigError,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-dvh bg-[#FFF8F5]">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-lg shadow-sm text-bark"
        >
          ‹
        </Link>
        <h1 className="font-display font-bold text-xl text-ink">Saved Cats</h1>
      </header>

      <div className="px-4 pb-8 pt-2">
        {loading ? (
          <p className="py-12 text-center text-bark">Loading...</p>
        ) : loadError ? (
          <ErrorState message={loadError.message} isConfigError={loadError.isConfig} compact />
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <p className="text-[80px] leading-none">🐾</p>
            <p className="mt-4 font-display font-semibold text-xl text-ink">
              No cats saved yet
            </p>
            <p className="mt-2 text-sm text-bark">
              Start swiping to save your favourites!
            </p>
            <Link
              href="/"
              className="mt-6 rounded-full bg-rose px-6 py-2.5 text-sm font-bold text-white active:scale-95"
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
