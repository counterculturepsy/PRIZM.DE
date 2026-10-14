import { describe, expect, it } from "vitest";
import { serverEnvSchema } from "./env";

const valid = {
  NODE_ENV: "test",
  NEXTAUTH_URL: "http://localhost:3000",
  DATABASE_URL: "postgresql://user:password@localhost:5432/prizm",
  AUTH_SECRET: "a-test-secret-that-is-longer-than-thirty-two-characters",
};

describe("serverEnvSchema", () => {
  it("accepts the minimum safe configuration", () => {
    expect(serverEnvSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects an incomplete OAuth provider pair", () => {
    const result = serverEnvSchema.safeParse({ ...valid, AUTH_GITHUB_ID: "client-id" });
    expect(result.success).toBe(false);
  });

  it("rejects non-PostgreSQL database URLs", () => {
    const result = serverEnvSchema.safeParse({ ...valid, DATABASE_URL: "sqlite://local.db" });
    expect(result.success).toBe(false);
  });
});
