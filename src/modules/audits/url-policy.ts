import { BlockList, isIP } from "node:net";
import { z } from "zod";
import { AuditPolicyError } from "./types";

const auditUrlSchema = z.url({ protocol: /^https?$/ });
const blockedNames = new Set(["localhost", "localhost.localdomain"]);
const blockedIpv4 = new BlockList();
const blockedIpv6 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blockedIpv4.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 128], ["::1", 128], ["::ffff:0:0", 96], ["64:ff9b:1::", 48], ["100::", 64],
  ["2001:db8::", 32], ["2002::", 16], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
] as const) blockedIpv6.addSubnet(network, prefix, "ipv6");

export function normalizeAuditUrl(input: string): URL {
  const candidate = /^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`;
  const parsed = auditUrlSchema.safeParse(candidate);
  if (!parsed.success) throw new AuditPolicyError("invalid_url", "Enter a valid public HTTP or HTTPS URL.");
  const url = new URL(parsed.data);
  if (url.username || url.password) throw new AuditPolicyError("url_credentials", "Website URLs cannot contain credentials.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new AuditPolicyError("non_standard_port", "Only standard HTTP and HTTPS ports are allowed.");
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if (isBlockedHostname(url.hostname)) throw new AuditPolicyError("private_destination", "Private or local destinations cannot be audited.");
  return url;
}

export function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
  return blockedNames.has(normalized) || normalized.endsWith(".localhost") || normalized.endsWith(".local") || normalized.endsWith(".internal") || (isIP(normalized) !== 0 && isPrivateAddress(normalized));
}

export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return blockedIpv4.check(address, "ipv4");
  if (version === 6) return blockedIpv6.check(address, "ipv6");
  return true;
}
