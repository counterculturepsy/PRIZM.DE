import { describe, expect, it } from "vitest";
import { ProviderRegistry, type BusinessSearchProvider } from "./providers";

describe("prospecting provider registry", () => {
  it("registers explicit adapters and rejects ambiguous duplicate IDs", () => {
    const provider: BusinessSearchProvider = { id: "approved-provider", search: async () => ({ records: [] }) };
    const registry = new ProviderRegistry<BusinessSearchProvider>();
    registry.register(provider);
    expect(registry.get("approved-provider")).toBe(provider);
    expect(registry.list()).toEqual([provider]);
    expect(() => registry.register(provider)).toThrow("Provider already registered");
  });
});
