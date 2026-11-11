import { ConfigError } from "./config";

/** A failure, described for the person looking at the screen (R-80). */
export interface Problem {
  title: string;
  /** The real reason, as reported. */
  detail: string;
  /** What to do about it, when we can tell. */
  hint: string | null;
}

function causeChain(err: unknown): string[] {
  const parts: string[] = [];
  let current: unknown = err;
  for (let depth = 0; current && depth < 5; depth++) {
    if (current instanceof Error) {
      const code = (current as { code?: unknown }).code;
      parts.push(typeof code === "string" && !current.message.includes(code) ? `${current.message} (${code})` : current.message);
      current = current.cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  return parts.filter(Boolean);
}

export function describeProblem(err: unknown): Problem {
  if (err instanceof ConfigError) {
    return {
      title: "The app isn't set up yet",
      detail: err.message,
      hint: "This needs fixing in the app's settings. It isn't anything you did.",
    };
  }

  const detail = causeChain(err).join(": ") || "Unknown error";
  const text = detail.toLowerCase();

  let hint: string | null = null;
  if (text.includes("enotfound") || text.includes("getaddrinfo")) {
    hint = "The database address can't be found. A free database that has been idle is paused and looks like this until it is restarted.";
  } else if (text.includes("econnrefused") || text.includes("timeout") || text.includes("etimedout") || text.includes("econnreset")) {
    hint = "The database isn't answering. This is often temporary, so try again in a minute.";
  } else if (text.includes("password") || text.includes("authentication")) {
    hint = "The database rejected the app's login. The saved connection details need updating.";
  } else if (text.includes("does not exist")) {
    hint = "The database is reachable but hasn't been set up. The migrations need running.";
  }

  return { title: "Can't load cats right now", detail, hint };
}
