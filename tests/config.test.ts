import { describe, expect, it } from "vitest";
import { ConfigError, getAppConfig, getCollectorConfig } from "@/core/config";

const full = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SECRET_KEY: "secret",
  ANTHROPIC_API_KEY: "key",
};

describe("config", () => {
  it("returns app config when all values are present", () => {
    expect(getAppConfig(full)).toEqual({
      supabaseUrl: "https://example.supabase.co",
      supabaseSecretKey: "secret",
    });
  });

  it("names every missing value", () => {
    try {
      getCollectorConfig({ SUPABASE_URL: "https://example.supabase.co" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      expect((err as ConfigError).missing).toEqual(["SUPABASE_SECRET_KEY", "ANTHROPIC_API_KEY"]);
      expect((err as Error).message).toContain("SUPABASE_SECRET_KEY, ANTHROPIC_API_KEY");
    }
  });

  it("treats blank values as missing", () => {
    expect(() => getAppConfig({ ...full, SUPABASE_SECRET_KEY: "  " })).toThrow(ConfigError);
  });

  it("does not require the scoring key for the app", () => {
    expect(() => getAppConfig({ ...full, ANTHROPIC_API_KEY: undefined })).not.toThrow();
  });
});
