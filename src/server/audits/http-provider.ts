import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isRobotsAllowed } from "@/modules/audits/robots";
import { isPrivateAddress, normalizeAuditUrl } from "@/modules/audits/url-policy";
import { AuditPolicyError, type AuditSnapshot, type WebsiteAuditProvider } from "@/modules/audits/types";
import { getServerEnv } from "@/config/env";

type ResponseData = Readonly<{ status: number; headers: Record<string, string>; body: Buffer; bytes: number; durationMs: number }>;
const ROBOTS_MAX_BYTES = 256_000;
const MAX_REDIRECTS = 3;

function normalizedHeaders(headers: http.IncomingHttpHeaders): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).flatMap(([name, value]) => value === undefined ? [] : [[name.toLowerCase(), Array.isArray(value) ? value.join(", ") : value]]));
}

async function resolvePublicAddress(url: URL): Promise<{ address: string; family: number }> {
  let addresses;
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new AuditPolicyError("dns_failed", "The website hostname could not be resolved.");
  }
  if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new AuditPolicyError("private_destination", "The destination resolved to a private or reserved address.");
  }
  const [selected] = addresses;
  if (!selected) throw new AuditPolicyError("dns_failed", "The website hostname could not be resolved.");
  return selected;
}

async function requestOnce(url: URL, userAgent: string, maxBytes: number, timeoutMs: number): Promise<ResponseData> {
  const target = normalizeAuditUrl(url.toString());
  const resolved = await resolvePublicAddress(target);
  const transport = target.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const request = transport.request({
      protocol: target.protocol,
      hostname: resolved.address,
      family: resolved.family,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method: "GET",
      servername: target.protocol === "https:" ? target.hostname : undefined,
      headers: { Accept: "text/html,application/xhtml+xml,text/plain;q=0.5", Host: target.host, "User-Agent": userAgent },
    }, (response) => {
      const chunks: Buffer[] = [];
      let bytes = 0;
      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > maxBytes) {
          request.destroy(new AuditPolicyError("response_too_large", "The response exceeded the configured byte limit."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({
        status: response.statusCode ?? 0,
        headers: normalizedHeaders(response.headers),
        body: Buffer.concat(chunks),
        bytes,
        durationMs: Date.now() - started,
      }));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new AuditPolicyError("request_timeout", "The website did not respond within the audit limit.")));
    request.on("error", (error) => reject(error instanceof AuditPolicyError ? error : new AuditPolicyError("request_failed", "The website request failed.")));
    request.end();
  });
}

function redirectTarget(current: URL, response: ResponseData): URL | null {
  if (![301, 302, 303, 307, 308].includes(response.status)) return null;
  const location = response.headers.location;
  if (!location) throw new AuditPolicyError("redirect_missing_location", "The website returned an invalid redirect.");
  return normalizeAuditUrl(new URL(location, current).toString());
}

async function requestRobots(start: URL, userAgent: string): Promise<ResponseData> {
  let current = new URL("/robots.txt", start.origin);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await requestOnce(current, userAgent, ROBOTS_MAX_BYTES, 5_000);
    const redirect = redirectTarget(current, response);
    if (!redirect) return response;
    if (redirects === MAX_REDIRECTS) throw new AuditPolicyError("redirect_limit", "Robots policy exceeded the redirect limit.");
    current = redirect;
  }
  throw new AuditPolicyError("redirect_limit", "Robots policy exceeded the redirect limit.");
}

async function assertRobotsAllowed(url: URL, userAgent: string): Promise<void> {
  const response = await requestRobots(url, userAgent);
  if (response.status === 404) return;
  if (response.status < 200 || response.status >= 300) throw new AuditPolicyError("robots_unavailable", "Robots policy could not be confirmed.");
  if (!isRobotsAllowed(response.body.toString("utf8"), url, "prizmdev")) throw new AuditPolicyError("robots_disallowed", "The website robots policy does not allow this audit.");
}

export class SafeHttpAuditProvider implements WebsiteAuditProvider {
  readonly id = "safe-http-v1";
  constructor(private readonly userAgent: string, private readonly maxResponseBytes: number) {}

  async inspect(requestedUrl: URL): Promise<AuditSnapshot> {
    let current = normalizeAuditUrl(requestedUrl.toString());
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
      await assertRobotsAllowed(current, this.userAgent);
      const response = await requestOnce(current, this.userAgent, this.maxResponseBytes, 10_000);
      const redirect = redirectTarget(current, response);
      if (redirect) {
        if (redirects === MAX_REDIRECTS) throw new AuditPolicyError("redirect_limit", "The website exceeded the redirect limit.");
        current = redirect;
        continue;
      }
      const contentType = response.headers["content-type"] ?? "";
      if (!/^(text\/html|application\/xhtml\+xml)(;|$)/i.test(contentType)) throw new AuditPolicyError("unsupported_content_type", "Only HTML website responses can be audited.");
      return {
        requestedUrl: requestedUrl.toString(), finalUrl: current.toString(), status: response.status,
        contentType, headers: response.headers, body: response.body, responseBytes: response.bytes,
        durationMs: response.durationMs, observedAt: new Date(), robotsAllowed: true,
      };
    }
    throw new AuditPolicyError("redirect_limit", "The website exceeded the redirect limit.");
  }
}

export function createConfiguredAuditProvider(): WebsiteAuditProvider {
  const env = getServerEnv();
  if (!env.WEBSITE_AUDIT_ENABLED) throw new AuditPolicyError("worker_disabled", "Website audit processing is not enabled in this environment.");
  return new SafeHttpAuditProvider(env.AUDIT_USER_AGENT, env.AUDIT_MAX_RESPONSE_BYTES);
}
