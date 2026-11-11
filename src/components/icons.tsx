import type { SVGProps } from "react";

/** Line icons, drawn to match: 24px grid, round caps, 2px stroke. */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HeartIcon = ({ filled = true, ...p }: IconProps & { filled?: boolean }) => (
  <Svg {...p} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.5 3.7 4 7.2 4c2 0 3.7 1.1 4.8 2.8C13.1 5.1 14.8 4 16.8 4c3.5 0 5.8 3.5 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4Z" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg strokeWidth={2.6} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const UndoIcon = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M4 9h10a6 6 0 0 1 0 12H8" />
    <path d="M8 5 4 9l4 4" />
  </Svg>
);

export const BackIcon = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);

export const ArrowOutIcon = (p: IconProps) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M8 16 16 8M9 8h7v7" />
  </Svg>
);

export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z" />
    <circle cx="12" cy="10.5" r="2.3" />
  </Svg>
);

export const PawIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <ellipse cx="12" cy="15.6" rx="4.6" ry="3.9" />
    <ellipse cx="5.6" cy="11" rx="2" ry="2.6" transform="rotate(-20 5.6 11)" />
    <ellipse cx="9.5" cy="6.8" rx="2" ry="2.7" transform="rotate(-8 9.5 6.8)" />
    <ellipse cx="14.5" cy="6.8" rx="2" ry="2.7" transform="rotate(8 14.5 6.8)" />
    <ellipse cx="18.4" cy="11" rx="2" ry="2.6" transform="rotate(20 18.4 11)" />
  </Svg>
);

export const SignalOffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.6M19 13a10 10 0 0 0-5-2.8M2 9.5a15 15 0 0 1 4.5-3M22 9.5A15 15 0 0 0 11 5" />
    <circle cx="12" cy="20" r="0.6" fill="currentColor" />
  </Svg>
);
