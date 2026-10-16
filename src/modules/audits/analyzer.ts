import { loadBuffer } from "cheerio";
import type { AuditAnalysis, AuditFinding, AuditSnapshot } from "./types";

function finding(input: AuditFinding): AuditFinding { return input; }

export function analyzeWebsiteSnapshot(snapshot: AuditSnapshot): AuditAnalysis {
  const $ = loadBuffer(snapshot.body, { scriptingEnabled: false });
  const findings: AuditFinding[] = [];
  const add = (value: AuditFinding) => findings.push(finding(value));
  const title = $("title").first().text().trim();
  const description = $('meta[name="description"]').attr("content")?.trim();
  const language = $("html").attr("lang")?.trim();
  const viewport = $('meta[name="viewport"]').attr("content")?.trim();
  const canonical = $('link[rel="canonical"]').attr("href")?.trim();
  const h1Count = $("h1").length;
  const missingAlt = $("img").filter((_, element) => $(element).attr("alt") === undefined).length;
  const labelledIds = new Set($("label[for]").map((_, element) => $(element).attr("for")).get().filter((value): value is string => Boolean(value)));
  const unlabelledControls = $("input:not([type=hidden]), select, textarea").filter((_, element) => {
    const id = $(element).attr("id");
    return !$(element).attr("aria-label") && !$(element).attr("aria-labelledby") && !$(element).closest("label").length && !(id && labelledIds.has(id));
  }).length;
  const header = (name: string) => snapshot.headers[name.toLowerCase()];

  if (new URL(snapshot.finalUrl).protocol !== "https:") add({ category: "security", code: "transport.http", severity: "high", title: "Page is not served over HTTPS", summary: "The audited page used unencrypted HTTP.", evidence: snapshot.finalUrl, confidence: "high", scoreImpact: 20 });
  if (snapshot.status >= 400) add({ category: "performance", code: "http.error_status", severity: "high", title: "Page returned an error status", summary: "The requested page did not return a successful HTTP response.", evidence: `HTTP ${snapshot.status}`, confidence: "high", scoreImpact: 30 });
  if (!title) add({ category: "seo", code: "seo.title_missing", severity: "medium", title: "Document title is missing", summary: "Search and browser surfaces lack a page title.", evidence: "No non-empty <title> element observed", confidence: "high", scoreImpact: 10 });
  else if (title.length < 15 || title.length > 65) add({ category: "seo", code: "seo.title_length", severity: "low", title: "Document title length needs review", summary: "The title falls outside the useful 15–65 character review range.", evidence: `${title.length} characters`, confidence: "medium", scoreImpact: 3 });
  if (!description) add({ category: "seo", code: "seo.description_missing", severity: "medium", title: "Meta description is missing", summary: "No page-level description was observed.", evidence: 'No meta[name="description"] content observed', confidence: "high", scoreImpact: 8 });
  if (!language) add({ category: "accessibility", code: "a11y.lang_missing", severity: "medium", title: "Page language is not declared", summary: "Assistive technology may not infer the intended language reliably.", evidence: "No html[lang] attribute observed", confidence: "high", scoreImpact: 6 });
  if (!viewport) add({ category: "mobile", code: "mobile.viewport_missing", severity: "medium", title: "Viewport declaration is missing", summary: "Mobile browsers may render the page at an unsuitable layout width.", evidence: 'No meta[name="viewport"] content observed', confidence: "high", scoreImpact: 8 });
  if (h1Count !== 1) add({ category: "content", code: "content.h1_count", severity: "medium", title: "Primary heading structure needs review", summary: "The static document should normally expose one clear primary heading.", evidence: `${h1Count} h1 elements observed`, confidence: "high", scoreImpact: 7 });
  if (missingAlt > 0) add({ category: "accessibility", code: "a11y.image_alt_missing", severity: "medium", title: "Images are missing alternative text", summary: "Some static images have no alt attribute.", evidence: `${missingAlt} images without alt attributes`, confidence: "high", scoreImpact: Math.min(15, missingAlt * 3) });
  if (unlabelledControls > 0) add({ category: "accessibility", code: "a11y.form_label_missing", severity: "high", title: "Form controls lack accessible labels", summary: "Some static form controls have no associated label or accessible name.", evidence: `${unlabelledControls} controls without an observed accessible name`, confidence: "high", scoreImpact: Math.min(20, unlabelledControls * 5) });
  if (!canonical) add({ category: "seo", code: "seo.canonical_missing", severity: "low", title: "Canonical URL is not declared", summary: "No canonical link was observed in the static document.", evidence: 'No link[rel="canonical"] observed', confidence: "high", scoreImpact: 3 });
  if (!header("content-security-policy")) add({ category: "security", code: "security.csp_missing", severity: "medium", title: "Content Security Policy was not observed", summary: "The response did not include a Content-Security-Policy header.", evidence: "Header absent", confidence: "high", scoreImpact: 6 });
  if (!header("x-content-type-options")) add({ category: "security", code: "security.nosniff_missing", severity: "low", title: "MIME sniffing protection was not observed", summary: "The response did not include X-Content-Type-Options.", evidence: "Header absent", confidence: "high", scoreImpact: 3 });
  if (!header("x-frame-options") && !header("content-security-policy")?.includes("frame-ancestors")) add({ category: "security", code: "security.framing_policy_missing", severity: "low", title: "Framing policy was not observed", summary: "Neither X-Frame-Options nor a CSP frame-ancestors directive was observed.", evidence: "Headers absent", confidence: "high", scoreImpact: 3 });
  if (snapshot.responseBytes > 1_000_000) add({ category: "performance", code: "performance.document_size", severity: "medium", title: "HTML document is large", summary: "The initial HTML response exceeds the 1 MB review threshold.", evidence: `${snapshot.responseBytes} bytes`, confidence: "high", scoreImpact: 8 });
  if (snapshot.durationMs > 3_000) add({ category: "performance", code: "performance.response_time", severity: "low", title: "Server response was slow during observation", summary: "The bounded fetch took longer than three seconds; this is a single observation, not a lab benchmark.", evidence: `${snapshot.durationMs} ms`, confidence: "medium", scoreImpact: 5 });

  return { score: Math.max(0, 100 - findings.reduce((total, item) => total + item.scoreImpact, 0)), title: title || null, findings };
}
