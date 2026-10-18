import { describe, expect, it } from "vitest";
import { redactEvidence, validateGrounding, type SalesEvidence } from "./sales";
const evidence: SalesEvidence[] = [{ id: "00000000-0000-4000-8000-000000000001", category: "seo", confidence: "high", observedAt: "2026-10-17T12:00:00Z", excerpt: "Title missing" }];
describe("sales grounding", () => {
  it("redacts direct email, phone, and common credential strings", () => {
    const result = redactEvidence("Email ari@example.com or +27 82 123 4567. Token sk-abcdefghijklmnop");
    expect(result).not.toContain("ari@example.com"); expect(result).not.toContain("123 4567"); expect(result).not.toContain("sk-abcdefgh");
  });
  it("requires supported citations on every bounded section", () => {
    const output = { title: "Review SEO", sections: [{ heading: "Observation", text: "The title was missing.", evidenceIds: [evidence[0]!.id] }], reviewWarnings: ["Verify before use"] };
    expect(validateGrounding(output, evidence)).toEqual(output);
    expect(() => validateGrounding({ ...output, sections: [{ ...output.sections[0], evidenceIds: ["00000000-0000-4000-8000-000000000002"] }] }, evidence)).toThrow();
    expect(() => validateGrounding({ ...output, sections: [{ ...output.sections[0], evidenceIds: [] }] }, evidence)).toThrow();
  });
});
