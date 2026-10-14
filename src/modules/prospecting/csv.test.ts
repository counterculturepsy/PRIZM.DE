import { describe, expect, it } from "vitest";
import { companyDedupeKey, CsvImportError, MAX_CSV_ROWS, parseCompanyCsv } from "./csv";

describe("company CSV parsing", () => {
  it("parses a BOM, normalizes websites, and creates stable domain keys", () => {
    const [row] = parseCompanyCsv("\ufeffname,website,city,country_code\nPrizm Studio,www.example.co.za,Johannesburg,za");
    expect(row).toMatchObject({ name: "Prizm Studio", website: "https://www.example.co.za/", city: "Johannesburg", country_code: "ZA" });
    expect(row && companyDedupeKey(row)).toBe("domain:example.co.za");
  });

  it("rejects unsupported columns and excessive rows", () => {
    expect(() => parseCompanyCsv("name,private_note\nAcme,secret")).toThrow(CsvImportError);
    const rows = Array.from({ length: MAX_CSV_ROWS + 1 }, (_, index) => `Company ${index}`).join("\n");
    expect(() => parseCompanyCsv(`name\n${rows}`)).toThrow(`limited to ${MAX_CSV_ROWS} rows`);
  });

  it("requires valid public contact fields", () => {
    expect(() => parseCompanyCsv("name,email\nAcme,not-an-email")).toThrow("Invalid email");
    expect(() => parseCompanyCsv("name,source_url\nAcme,javascript:alert(1)")).toThrow("Invalid URL");
  });
});
