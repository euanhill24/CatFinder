"use client";

import { useState } from "react";
import { PawIcon } from "./icons";

interface Props {
  src: string | undefined;
  alt: string;
  className?: string;
  /** Load straight away. Use for the card on top of the deck. */
  eager?: boolean;
  /** Hide the caption on the stand-in, for small thumbnails. */
  compact?: boolean;
}

/** A listing photo, with a warm stand-in when there isn't one or it won't load. */
export function Photo({ src, alt, className = "", eager = false, compact = false }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-white ${className}`}
        style={{ background: "linear-gradient(150deg, #f4a261 0%, #e85d75 60%, #b9506f 100%)" }}
      >
        <PawIcon size={compact ? 32 : 72} className="opacity-90" />
        {!compact && <span className="mt-3 text-sm font-bold opacity-90">{src ? "Photo unavailable" : "No photos yet"}</span>}
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
