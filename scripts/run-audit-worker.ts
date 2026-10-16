import { randomUUID } from "node:crypto";
import { createConfiguredAuditProvider } from "../src/server/audits/http-provider";
import { processNextAuditJob } from "../src/server/audits/service";
import { closeDatabase } from "../src/server/db";

try {
  const provider = createConfiguredAuditProvider();
  const result = await processNextAuditJob(provider, `manual-${randomUUID()}`);
  process.stdout.write(result ? `Processed audit ${result.auditId}: ${result.status}\n` : "No eligible audit jobs.\n");
} finally {
  await closeDatabase();
}
