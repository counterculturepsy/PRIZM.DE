import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { z } from "zod";

export const MAX_CSV_BYTES = 1_000_000;
export const MAX_CSV_ROWS = 500;

const allowedHeaders = [
  "name", "website", "industry", "city", "province", "country_code", "phone", "email",
  "address", "postal_code", "description", "employee_estimate", "whatsapp", "facebook_url",
  "instagram_url", "linkedin_url", "google_maps_url", "rating", "review_count", "source_url", "external_id",
] as const;

const optionalText = (maximum: number) => z.string().trim().max(maximum).optional().transform((value) => value || undefined);
const optionalUrl = z.string().trim().max(500).optional().transform((value, context) => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported URL protocol");
    return url.toString();
  } catch {
    context.addIssue({ code: "custom", message: `Invalid URL: ${value}` });
    return z.NEVER;
  }
});

const companyRowSchema = z.object({
  name: z.string().trim().min(1).max(160),
  website: z.string().trim().max(500).optional().transform((value, context) => {
    if (!value) return undefined;
    const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      const url = new URL(candidate);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported URL protocol");
      return url.toString();
    } catch {
      context.addIssue({ code: "custom", message: `Invalid website: ${value}` });
      return z.NEVER;
    }
  }),
  industry: optionalText(120),
  city: optionalText(120),
  province: optionalText(120),
  country_code: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/).optional(),
  phone: optionalText(50),
  email: z.string().trim().max(254).optional().transform((value, context) => {
    if (!value) return undefined;
    const result = z.email().safeParse(value);
    if (!result.success) {
      context.addIssue({ code: "custom", message: `Invalid email: ${value}` });
      return z.NEVER;
    }
    return result.data.toLowerCase();
  }),
  address: optionalText(300),
  postal_code: optionalText(20),
  description: optionalText(2_000),
  employee_estimate: z.coerce.number().int().min(1).max(10_000_000).optional().or(z.literal("").transform(() => undefined)),
  whatsapp: optionalText(50),
  facebook_url: optionalUrl,
  instagram_url: optionalUrl,
  linkedin_url: optionalUrl,
  google_maps_url: optionalUrl,
  rating: z.coerce.number().min(0).max(5).optional().or(z.literal("").transform(() => undefined)),
  review_count: z.coerce.number().int().min(0).max(100_000_000).optional().or(z.literal("").transform(() => undefined)),
  source_url: optionalUrl,
  external_id: optionalText(200),
}).strict();

export type CompanyCsvRow = z.output<typeof companyRowSchema>;

export class CsvImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvImportError";
  }
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[ -]+/g, "_");
}

export function normalizeDomain(website: string | undefined): string | undefined {
  if (!website) return undefined;
  const hostname = new URL(website).hostname.toLowerCase().replace(/^www\./, "");
  return hostname || undefined;
}

function normalizedIdentityPart(value: string | undefined): string {
  return (value ?? "").normalize("NFKC").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function companyDedupeKey(row: Pick<CompanyCsvRow, "website" | "name" | "city" | "country_code">): string {
  const domain = normalizeDomain(row.website);
  if (domain) return `domain:${domain}`;
  const identity = [row.name, row.city, row.country_code].map(normalizedIdentityPart).join("|");
  return `identity:${createHash("sha256").update(identity).digest("hex")}`;
}

export function companySourceKey(row: CompanyCsvRow): string {
  if (row.external_id) return `csv:external:${createHash("sha256").update(row.external_id).digest("hex")}`;
  const stableRow = Object.entries(row).sort(([left], [right]) => left.localeCompare(right));
  return `csv:row:${createHash("sha256").update(JSON.stringify(stableRow)).digest("hex")}`;
}

export function parseCompanyCsv(input: string): CompanyCsvRow[] {
  if (Buffer.byteLength(input, "utf8") > MAX_CSV_BYTES) throw new CsvImportError("CSV files must be 1 MB or smaller.");
  let records: string[][];
  try {
    records = parse(input, { bom: true, skip_empty_lines: true, trim: true, max_record_size: 10_000 });
  } catch {
    throw new CsvImportError("The CSV could not be parsed. Check quoting, delimiters, and record sizes.");
  }
  const [rawHeaders, ...rows] = records;
  if (!rawHeaders) throw new CsvImportError("The CSV must include a header row.");
  if (rows.length === 0) throw new CsvImportError("The CSV must include at least one company row.");
  if (rows.length > MAX_CSV_ROWS) throw new CsvImportError(`CSV imports are limited to ${MAX_CSV_ROWS} rows.`);

  const headers = rawHeaders.map(normalizeHeader);
  if (new Set(headers).size !== headers.length) throw new CsvImportError("CSV headers must be unique.");
  const unsupported = headers.filter((header) => !(allowedHeaders as readonly string[]).includes(header));
  if (unsupported.length > 0) throw new CsvImportError(`Unsupported columns: ${unsupported.join(", ")}.`);
  if (!headers.includes("name")) throw new CsvImportError("The CSV requires a name column.");

  return rows.map((values, index) => {
    if (values.length !== headers.length) throw new CsvImportError(`Row ${index + 2} has the wrong number of columns.`);
    const candidate = Object.fromEntries(headers.map((header, columnIndex) => [header, values[columnIndex] ?? ""]));
    const parsed = companyRowSchema.safeParse(candidate);
    if (!parsed.success) throw new CsvImportError(`Row ${index + 2}: ${parsed.error.issues[0]?.message ?? "invalid data"}.`);
    return parsed.data;
  });
}

export const companyCsvHeaders = allowedHeaders;
