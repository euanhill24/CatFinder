import { describe, expect, it } from "vitest";
import { ConfigError, getCollectorConfig, getDatabaseUrl } from "@/core/config";

const full = { DATABASE_URL: "postgres://example/db", ANTHROPIC_API_KEY: "key" };

describe("config", () => {
  it("returns the database URL when present", () => {
    expect(getDatabaseUrl(full)).toBe("postgres://example/db");
  });

  it("names every missing value", () => {
    try {
      getCollectorConfig({});
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      expect((err as ConfigError).missing).toEqual(["DATABASE_URL", "ANTHROPIC_API_KEY"]);
      expect((err as Error).message).toContain("DATABASE_URL, ANTHROPIC_API_KEY");
    }
  });

  it("treats blank values as missing", () => {
    expect(() => getDatabaseUrl({ DATABASE_URL: "  " })).toThrow(ConfigError);
  });

  it("does not require the scoring key for the app", () => {
    expect(() => getDatabaseUrl({ DATABASE_URL: "postgres://example/db" })).not.toThrow();
  });
});
