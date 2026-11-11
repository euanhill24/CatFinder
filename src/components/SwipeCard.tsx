"use client";

import { useCallback, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";

export type SwipeDirection = "left" | "right";

export interface SwipeHandle {
  /** Send the card off as if it had been swiped. Used by the buttons. */
  fling(direction: SwipeDirection): void;
}

interface Props {
  ref?: Ref<SwipeHandle>;
  onSwiped: (direction: SwipeDirection) => void;
  onTap: () => void;
  label: string;
  /** Stamp shown while dragging right, e.g. "Love her!". */
  likeText: string;
  children: ReactNode;
}

/** How far the card must travel to count as a decision. */
const SWIPE_DISTANCE = 90;
/** A quick flick counts from a shorter distance. */
const FLICK_DISTANCE = 40;
const FLICK_SPEED = 0.5; // px per ms
/** Movement under this is a tap, not a drag (R-44). */
const TAP_SLOP = 8;
const TAP_MAX_MS = 600;
const EXIT_MS = 260;

/**
 * The top card of the deck. Drag it sideways to decide, tap it to open.
 *
 * Tap and swipe are told apart by distance moved, using pointer events only,
 * so one touch can never be read as both.
 */
export function SwipeCard({ ref, onSwiped, onTap, label, likeText, children }: Props) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<SwipeDirection | null>(null);
  const start = useRef<{ x: number; y: number; t: number; id: number; moved: boolean } | null>(null);
  const done = useRef(false);

  const fling = useCallback(
    (direction: SwipeDirection) => {
      if (done.current) return;
      done.current = true;
      setDragging(false);
      setLeaving(direction);
      // Not transitionend: it does not fire if the tab is hidden mid-animation.
      window.setTimeout(() => onSwiped(direction), EXIT_MS);
    },
    [onSwiped],
  );

  useImperativeHandle(ref, () => ({ fling }), [fling]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (done.current || start.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, moved: false };
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    s.moved = true;
    setOffset({ x: dx, y: dy * 0.25 });
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    start.current = null;
    setDragging(false);

    const dx = e.clientX - s.x;
    const elapsed = performance.now() - s.t;

    if (cancelled) {
      setOffset({ x: 0, y: 0 });
      return;
    }
    if (!s.moved) {
      if (elapsed < TAP_MAX_MS) onTap();
      return;
    }
    const flicked = Math.abs(dx) > FLICK_DISTANCE && Math.abs(dx) / Math.max(elapsed, 1) > FLICK_SPEED;
    if (Math.abs(dx) > SWIPE_DISTANCE || flicked) {
      fling(dx > 0 ? "right" : "left");
    } else {
      setOffset({ x: 0, y: 0 });
    }
  }

  const x = leaving ? (leaving === "right" ? 1 : -1) * 520 : offset.x;
  const pull = leaving ? (leaving === "right" ? 1 : -1) : Math.max(-1, Math.min(1, offset.x / SWIPE_DISTANCE));

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => onPointerEnd(e, false)}
      onPointerCancel={(e) => onPointerEnd(e, true)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap();
        } else if (e.key === "ArrowRight") fling("right");
        else if (e.key === "ArrowLeft") fling("left");
      }}
      className="absolute inset-0 cursor-grab touch-none select-none outline-none active:cursor-grabbing"
      style={{
        transform: `translate3d(${x}px, ${leaving ? 0 : offset.y}px, 0) rotate(${x * 0.05}deg)`,
        transition: dragging ? "none" : `transform ${leaving ? EXIT_MS : 220}ms ease-out`,
        willChange: "transform",
      }}
    >
      {children}

      {/* Colour wash and stamp so the outcome is clear before she lets go (R-42).
          Each stamp sits on the trailing side, which is the part still on screen. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-start justify-start rounded-card bg-rose/45 pl-6 pt-[22%]"
        style={{ opacity: Math.max(0, pull) }}
      >
        <span className="-rotate-6 font-display text-3xl font-bold text-white drop-shadow-md">💛 {likeText}</span>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-start justify-end rounded-card bg-fog/75 pr-6 pt-[22%]"
        style={{ opacity: Math.max(0, -pull) }}
      >
        <span className="rotate-6 text-2xl font-bold text-bark">Not this time →</span>
      </div>
    </div>
  );
}
