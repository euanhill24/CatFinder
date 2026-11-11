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
  /** Reports how far the card has been pulled, from -1 (left) to 1 (right). */
  onPull?: (pull: number) => void;
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
export function SwipeCard({ ref, onSwiped, onTap, label, likeText, onPull, children }: Props) {
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
      onPull?.(direction === "right" ? 1 : -1);
      // Not transitionend: it does not fire if the tab is hidden mid-animation.
      window.setTimeout(() => onSwiped(direction), EXIT_MS);
    },
    [onSwiped, onPull],
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
    onPull?.(Math.max(-1, Math.min(1, dx / SWIPE_DISTANCE)));
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
      onPull?.(0);
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
      onPull?.(0);
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
      className="absolute inset-0 cursor-grab touch-none select-none rounded-card outline-none focus-visible:ring-4 focus-visible:ring-rose/50 active:cursor-grabbing"
      style={{
        transform: `translate3d(${x}px, ${leaving ? 0 : offset.y}px, 0) rotate(${x * 0.045}deg)`,
        transition: dragging ? "none" : `transform ${leaving ? EXIT_MS : 220}ms ease-out`,
        transformOrigin: "50% 120%",
        willChange: "transform",
      }}
    >
      {children}

      {/* Colour wash and stamp so the outcome is clear before she lets go (R-42).
          Each stamp sits on the trailing side, which is the part still on screen. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-card"
        style={{ opacity: Math.max(0, pull), background: "linear-gradient(160deg, rgba(232,93,117,0.75), rgba(244,162,97,0.45))" }}
      >
        <span
          className="absolute left-6 top-[18%] rounded-2xl border-[3px] border-white px-4 py-1.5 font-display text-[30px] font-bold leading-tight text-white"
          style={{ transform: `rotate(-12deg) scale(${0.8 + 0.2 * Math.max(0, pull)})` }}
        >
          {likeText}
        </span>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-card bg-ink/55"
        style={{ opacity: Math.max(0, -pull) }}
      >
        <span
          className="absolute right-6 top-[18%] rounded-2xl border-[3px] border-white/90 px-4 py-1.5 font-display text-[26px] font-bold leading-tight text-white/95"
          style={{ transform: `rotate(10deg) scale(${0.8 + 0.2 * Math.max(0, -pull)})` }}
        >
          Not this time
        </span>
      </div>
    </div>
  );
}
