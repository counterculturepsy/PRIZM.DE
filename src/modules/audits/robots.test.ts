import { describe, expect, it } from "vitest";
import { isRobotsAllowed } from "./robots";

describe("robots policy", () => {
  it("uses the specific product group ahead of wildcard rules", () => {
    const text = "User-agent: *\nDisallow: /\n\nUser-agent: PRIZMDEV\nAllow: /public\nDisallow: /private";
    expect(isRobotsAllowed(text, new URL("https://example.com/public"))).toBe(true);
    expect(isRobotsAllowed(text, new URL("https://example.com/private"))).toBe(false);
  });

  it("uses the longest matching rule and allow wins an equal tie", () => {
    const text = "User-agent: *\nDisallow: /catalog\nAllow: /catalog/public\nDisallow: /file$\nAllow: /file-long";
    expect(isRobotsAllowed(text, new URL("https://example.com/catalog/public/item"))).toBe(true);
    expect(isRobotsAllowed(text, new URL("https://example.com/catalog/hidden"))).toBe(false);
    expect(isRobotsAllowed(text, new URL("https://example.com/file"))).toBe(false);
    expect(isRobotsAllowed(text, new URL("https://example.com/file-long"))).toBe(true);
  });
});
