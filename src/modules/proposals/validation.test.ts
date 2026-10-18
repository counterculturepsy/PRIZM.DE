import { describe, expect, it } from "vitest";
import { calculateProposal, parseMajorToMinor } from "./validation";
const draft = { title: "Website improvement", summary: "Evidence reviewed", scope: "Rebuild key pages", deliverables: "Accessible responsive site", assumptions: "Content supplied", exclusions: "Hosting", timeline: "Four weeks", discountMinor: 500, items: [{ description: "Implementation", quantity: 2, unitAmountMinor: 10_000 }] };
describe("proposal pricing", () => {
  it("calculates immutable server totals in workspace currency", () => { expect(calculateProposal(draft, "ZAR")).toMatchObject({ subtotalMinor: 20_000, discountMinor: 500, totalMinor: 19_500, currency: "ZAR", items: [{ lineTotalMinor: 20_000 }] }); });
  it("rejects unsupported currency and discounts beyond subtotal", () => { expect(() => calculateProposal(draft, "zar")).toThrow("currency"); expect(() => calculateProposal({ ...draft, discountMinor: 20_001 }, "ZAR")).toThrow("Discount"); });
  it("parses decimal money without floating-point rounding", () => { expect(parseMajorToMinor("10.05")).toBe(1005); expect(parseMajorToMinor("10.5")).toBe(1050); expect(() => parseMajorToMinor("1e3")).toThrow("valid amount"); expect(() => parseMajorToMinor("10.005")).toThrow("valid amount"); });
});
