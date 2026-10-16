import { describe, expect, it } from "vitest";
import { isPrivateAddress, normalizeAuditUrl } from "./url-policy";

describe("website audit URL policy", () => {
  it("normalizes public HTTP URLs and removes fragments", () => {
    expect(normalizeAuditUrl("Example.com/path#private").toString()).toBe("https://example.com/path");
  });

  it.each(["http://localhost", "http://127.0.0.1", "http://10.1.2.3", "http://169.254.169.254/latest", "http://[::1]"])('blocks local destination %s', (value) => {
    expect(() => normalizeAuditUrl(value)).toThrow("Private or local destinations");
  });

  it("recognizes representative private and public addresses", () => {
    expect(isPrivateAddress("192.168.1.2")).toBe(true);
    expect(isPrivateAddress("100.64.1.2")).toBe(true);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
    expect(isPrivateAddress("2001:4860:4860::8888")).toBe(false);
  });
});
