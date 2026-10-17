import { describe, expect, it } from "vitest";
import { classifyPriority } from "./classification";

describe("classifyPriority", () => {
  it.each([
    [0, "low"], [29, "low"], [30, "possible"], [49, "possible"],
    [50, "good"], [69, "good"], [70, "high"], [84, "high"],
    [85, "priority"], [100, "priority"],
  ] as const)("classifies %i as %s", (score, expected) => {
    expect(classifyPriority(score)).toBe(expected);
  });

  it("rejects scores outside the versioned range", () => {
    expect(() => classifyPriority(-1)).toThrow(RangeError);
    expect(() => classifyPriority(101)).toThrow(RangeError);
    expect(() => classifyPriority(Number.NaN)).toThrow(RangeError);
  });
});
