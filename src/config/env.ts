import { z } from "zod";

const optionalString = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(8).optional(),
);

const optionalBoolean = z.preprocess(
  (value) => value === "" || value === undefined ? undefined : value === "true" ? true : value === "false" ? false : value,
  z.boolean().optional(),
);

export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    NEXTAUTH_URL: z.url(),
    DATABASE_URL: z.string().refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL URL",
    ),
    AUTH_SECRET: z.string().min(32),
    AUTH_GITHUB_ID: optionalString,
    AUTH_GITHUB_SECRET: optionalSecret,
    AUTH_GOOGLE_ID: optionalString,
    AUTH_GOOGLE_SECRET: optionalSecret,
    INTEGRATION_ENCRYPTION_KEY: optionalSecret,
    OPENAI_API_KEY: optionalSecret,
    ANTHROPIC_API_KEY: optionalSecret,
    GOOGLE_GENERATIVE_AI_API_KEY: optionalSecret,
    WEBSITE_AUDIT_ENABLED: optionalBoolean.default(false),
    AUDIT_USER_AGENT: z.preprocess((value) => value === "" ? undefined : value, z.string().min(10).max(300).optional()).default("PRIZMDEV/1.0"),
    AUDIT_MAX_RESPONSE_BYTES: z.preprocess((value) => value === "" || value === undefined ? undefined : Number(value), z.number().int().min(100_000).max(2_000_000).optional()).default(2_000_000),
  })
  .superRefine((value, context) => {
    const pairs = [
      ["AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"],
      ["AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"],
    ] as const;

    for (const [idKey, secretKey] of pairs) {
      if (Boolean(value[idKey]) !== Boolean(value[secretKey])) {
        context.addIssue({
          code: "custom",
          path: [idKey],
          message: `${idKey} and ${secretKey} must be configured together`,
        });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid server environment: ${fields}`);
  }
  return result.data;
}
