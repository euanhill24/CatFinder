"use client";

/**
 * Shown when a database read fails.
 *
 * Deliberately loud and specific: the previous behaviour swallowed these
 * errors and rendered the "all caught up" empty state, so a misconfigured
 * deploy was indistinguishable from having no cats left to review.
 */
export default function ErrorState({
  message,
  isConfigError,
  compact = false,
}: {
  message: string;
  isConfigError: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center ${
        compact ? "py-10 px-2" : "h-full justify-center px-4"
      }`}
    >
      <p className="text-[56px] leading-none">🙀</p>
      <p className="mt-3 font-display font-semibold text-xl text-ink">
        {isConfigError ? "App isn't configured" : "Couldn't load cats"}
      </p>
      <p className="mt-2 max-w-[300px] text-sm text-bark">
        {isConfigError
          ? "The app can't reach its database, so it doesn't know whether there are cats waiting."
          : "The database is configured but the request failed. This is usually a network blip."}
      </p>

      <p className="mt-4 max-w-[320px] break-words rounded-xl bg-fog px-3 py-2 text-left font-mono text-[11px] leading-relaxed text-ink">
        {message}
      </p>

      <button
        onClick={() => window.location.reload()}
        className="mt-5 rounded-full bg-rose px-6 py-2.5 text-sm font-bold text-white active:scale-95"
      >
        Try again
      </button>
    </div>
  );
}
