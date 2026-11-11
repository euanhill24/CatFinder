"use client";

import { useState } from "react";

interface Props {
  src: string | undefined;
  alt: string;
  className?: string;
  /** Load straight away. Use for the card on top of the deck. */
  eager?: boolean;
}

/** A listing photo, with a friendly stand-in when there isn't one or it won't load. */
export function Photo({ src, alt, className = "", eager = false }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex flex-col items-center justify-center bg-fog text-bark ${className}`}>
        <span aria-hidden className="text-5xl">
          🐾
        </span>
        <span className="mt-2 text-xs font-semibold">{src ? "Photo unavailable" : "No photos yet"}</span>
      </div>
    );
  }

  return (
    // Photos come from whichever site listed the cat, so they are shown as-is
    // rather than through the image optimiser.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      draggable={false}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
