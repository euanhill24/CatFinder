"use client";

import { useRef, type ButtonHTMLAttributes } from "react";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  onPress: () => void;
}

/**
 * A button that acts when the finger lifts, not on the browser's click.
 *
 * Mobile browsers drop the click for a tap that lands straight after a fast
 * swipe, so a quick swipe-then-tap on a plain button can do nothing. The touch
 * itself is still reported, and that is what this listens for. Clicks are kept
 * for keyboards and assistive technology.
 */
export function TapButton({ onPress, disabled, ...rest }: Props) {
  const pressed = useRef(false);
  const handledAt = useRef(0);

  return (
    <button
      {...rest}
      disabled={disabled}
      onPointerDown={(e) => {
        pressed.current = e.pointerType !== "mouse" || e.button === 0;
      }}
      onPointerLeave={() => {
        pressed.current = false;
      }}
      onPointerCancel={() => {
        pressed.current = false;
      }}
      onPointerUp={() => {
        if (!pressed.current || disabled) return;
        pressed.current = false;
        handledAt.current = performance.now();
        onPress();
      }}
      onClick={() => {
        // The click that follows a handled touch is the same press.
        if (performance.now() - handledAt.current < 700) return;
        onPress();
      }}
    />
  );
}
