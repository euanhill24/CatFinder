"use client";

import { useEffect, useState } from "react";
import { getLikedListings } from "@/lib/liked";
import { Listing } from "@/lib/listings";
import LikedListItem from "./LikedListItem";

export default function LikedDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getLikedListings()
        .then(setListings)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/30"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] bg-blush transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="font-display font-bold text-xl text-ink">Saved Cats</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-fog text-bark"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2" style={{ maxHeight: "calc(100dvh - 60px)" }}>
          {loading ? (
            <p className="py-12 text-center text-bark">Loading...</p>
          ) : listings.length === 0 ? (
            <p className="py-12 text-center text-bark">No cats saved yet</p>
          ) : (
            <div className="space-y-2">
              {listings.map((listing) => (
                <LikedListItem key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
