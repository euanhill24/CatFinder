import type { ReactNode } from "react";
import { PawIcon } from "./icons";

/** The wordmark row at the top of the deck. `status` sits under the name. */
export function Header({ status, action }: { status?: ReactNode; action?: ReactNode }) {
  return (
    <header
      className="flex shrink-0 items-center justify-between px-5"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.875rem)" }}
    >
      <div className="flex items-center gap-3">
        <span className="brand-gradient flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-like">
          <PawIcon size={24} />
        </span>
        <div>
          <h1 className="font-display text-[22px] font-bold leading-none tracking-tight text-ink">Kitty Tinder</h1>
          <div className="mt-1.5 flex h-[18px] items-center gap-1.5 text-xs font-semibold text-bark">{status}</div>
        </div>
      </div>
      {action}
    </header>
  );
}
