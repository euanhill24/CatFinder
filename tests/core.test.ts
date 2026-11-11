import { describe, expect, it } from "vitest";
import { ConfigError } from "@/core/config";
import { describeProblem } from "@/core/errors";
import { formatAge, formatAgo, formatPrice, formatSource } from "@/core/format";
import { visitBaseline } from "@/core/visit";

describe("format", () => {
  it("formats ages", () => {
    expect(formatAge(null)).toBe("Age unknown");
    expect(formatAge(1)).toBe("1 month");
    expect(formatAge(7)).toBe("7 months");
    expect(formatAge(12)).toBe("1 year");
    expect(formatAge(14)).toBe("1 year 2 months");
    expect(formatAge(38)).toBe("3 years");
  });

  it("formats prices", () => {
    expect(formatPrice(null)).toBe("Price on request");
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(45000)).toBe("£450");
    expect(formatPrice(125050)).toBe("£1,250.5");
  });

  it("formats sources", () => {
    expect(formatSource("pets4homes")).toBe("Pets4Homes");
    expect(formatSource("preloved")).toBe("Preloved");
  });

  it("formats relative times", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    expect(formatAgo(null, now)).toBeNull();
    expect(formatAgo("2026-11-11T11:59:30Z", now)).toBe("just now");
    expect(formatAgo("2026-11-11T11:35:00Z", now)).toBe("25m ago");
    expect(formatAgo("2026-11-11T08:00:00Z", now)).toBe("4h ago");
    expect(formatAgo("2026-11-08T08:00:00Z", now)).toBe("3 days ago");
    expect(formatAgo("2026-09-01T08:00:00Z", now)).toBe("1 Sept 2026");
  });
});

describe("visit baseline", () => {
  const now = new Date("2026-11-11T12:00:00Z");
  const at = (iso: string) => String(new Date(iso).getTime());

  it("has no baseline on the very first visit", () => {
    expect(visitBaseline(undefined, undefined, now)).toBeNull();
  });

  it("starts a new visit after a gap, counting from when she was last here", () => {
    const seen = at("2026-11-11T07:00:00Z");
    expect(visitBaseline(seen, at("2026-11-10T07:00:00Z"), now)?.toISOString()).toBe("2026-11-11T07:00:00.000Z");
  });

  it("keeps the same baseline while she is still browsing", () => {
    const since = at("2026-11-11T07:00:00Z");
    expect(visitBaseline(at("2026-11-11T11:50:00Z"), since, now)?.toISOString()).toBe("2026-11-11T07:00:00.000Z");
  });

  it("ignores unreadable cookie values", () => {
    expect(visitBaseline("garbage", "nope", now)).toBeNull();
  });
});

describe("describeProblem", () => {
  it("names missing configuration", () => {
    const p = describeProblem(new ConfigError(["DATABASE_URL"]));
    expect(p.title).toBe("The app isn't set up yet");
    expect(p.detail).toContain("DATABASE_URL");
  });

  it("unwraps the real cause and explains a paused database", () => {
    const cause = Object.assign(new Error("getaddrinfo ENOTFOUND db.example.co"), { code: "ENOTFOUND" });
    const p = describeProblem(new Error("fetch failed", { cause }));
    expect(p.detail).toBe("fetch failed: getaddrinfo ENOTFOUND db.example.co");
    expect(p.hint).toContain("paused");
  });

  it("explains a missing schema", () => {
    expect(describeProblem(new Error('relation "listings" does not exist')).hint).toContain("migrations");
  });

  it("falls back to the raw message", () => {
    expect(describeProblem(new Error("boom"))).toEqual({ title: "Can't load cats right now", detail: "boom", hint: null });
  });
});
