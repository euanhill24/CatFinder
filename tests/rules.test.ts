import { describe, expect, it } from "vitest";
import { SCORE_WEIGHTS, isCollectionOverdue, overallScore } from "@/core/rules";

describe("rules", () => {
  it("weights sum to 1", () => {
    const sum = Object.values(SCORE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it("computes the weighted overall score", () => {
    expect(overallScore({ alone: 7, friendly: 9, vibe: 8, distance: 10, age: 7 })).toBe(8);
    expect(overallScore({ alone: 10, friendly: 10, vibe: 10, distance: 10, age: 10 })).toBe(10);
    expect(overallScore({ alone: 0, friendly: 0, vibe: 0, distance: 0, age: 0 })).toBe(0);
  });

  it("flags collection as overdue after 24 hours, or if it never ran", () => {
    const now = new Date("2026-11-11T12:00:00Z");
    expect(isCollectionOverdue(null, now)).toBe(true);
    expect(isCollectionOverdue(new Date("2026-11-11T08:00:00Z"), now)).toBe(false);
    expect(isCollectionOverdue(new Date("2026-11-10T11:00:00Z"), now)).toBe(true);
  });
});
