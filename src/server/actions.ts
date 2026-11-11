"use server";

import { describeProblem } from "@/core/errors";
import type { Cat, Decision } from "@/core/types";
import { getDb } from "./db";
import { decide, getDeck, setNote, undoDecision } from "./listings";
import { DECK_PAGE_SIZE } from "./load";

/**
 * Actions the phone can ask for. Each returns a result instead of throwing,
 * because production builds strip the message from a thrown error and the
 * screen needs to say what actually went wrong (R-46).
 */
export type ActionResult<T = unknown> = ({ ok: true } & T) | { ok: false; message: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function run<T extends object>(what: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, ...(await fn()) };
  } catch (err) {
    console.error(`${what} failed:`, err);
    return { ok: false, message: describeProblem(err).detail };
  }
}

function checkId(id: unknown): string {
  if (typeof id !== "string" || !UUID.test(id)) throw new Error("Invalid listing id");
  return id;
}

export async function decideAction(id: string, decision: Decision): Promise<ActionResult> {
  return run("Saving a decision", async () => {
    if (decision !== "liked" && decision !== "dismissed") throw new Error("Invalid decision");
    await decide(getDb(), checkId(id), decision);
    return {};
  });
}

export async function undoAction(id: string): Promise<ActionResult> {
  return run("Undoing a decision", async () => {
    await undoDecision(getDb(), checkId(id));
    return {};
  });
}

export async function noteAction(id: string, note: string): Promise<ActionResult> {
  return run("Saving a note", async () => {
    if (typeof note !== "string" || note.length > 2000) throw new Error("Note is too long");
    await setNote(getDb(), checkId(id), note);
    return {};
  });
}

/** More cards for the bottom of the deck, skipping ones the phone already has. */
export async function topUpAction(excludeIds: string[]): Promise<ActionResult<{ cats: Cat[]; remaining: number }>> {
  return run("Loading more cats", async () => {
    if (!Array.isArray(excludeIds) || excludeIds.length > 500) throw new Error("Invalid request");
    const deck = await getDeck(getDb(), { limit: DECK_PAGE_SIZE, excludeIds: excludeIds.map(checkId) });
    return { cats: deck.cats, remaining: deck.remaining };
  });
}
