/**
 * Thrown when the Supabase environment variables are missing or unusable.
 *
 * These are inlined into the browser bundle at build time, so a deploy built
 * without them produces a client that can never connect. Before this existed
 * the resulting throw was swallowed by a `.catch(console.error)` and the app
 * rendered its "all caught up" empty state — a total connection failure and an
 * empty queue looked identical.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/**
 * Turns anything thrown by a Supabase call into one readable line.
 *
 * postgrest-js rejects with a plain object (`{ message, details, hint, code }`)
 * rather than an Error, so `String(err)` on its own yields "[object Object]".
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;

  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;

    const parts: string[] = [];
    for (const field of [e.message, e.details, e.hint]) {
      if (typeof field !== "string") continue;
      const value = field.trim();
      if (value === "") continue;
      // postgrest-js often repeats the message inside `details`, sometimes with
      // a stack appended. Keep the longer of the two rather than printing both.
      const duplicateOf = parts.findIndex(
        (p) => p.startsWith(value) || value.startsWith(p)
      );
      if (duplicateOf >= 0) {
        if (value.length > parts[duplicateOf].length) parts[duplicateOf] = value;
        continue;
      }
      parts.push(value);
    }

    if (parts.length > 0) {
      const code = typeof e.code === "string" && e.code.trim() !== "" ? ` (${e.code.trim()})` : "";
      return `${parts.join(" — ")}${code}`;
    }
  }

  return String(err);
}
