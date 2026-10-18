// @vitest-environment node
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it, vi } from "vitest";
import { createWorkspaceScope } from "@/modules/workspaces/scope";
import { companies, leads, proposalVersions, users, workspaceMembers, workspaces } from "@/server/db/schema";

describe("proposal service", () => {
  it("enforces tenancy, idempotency, immutable revisions, pricing and privileged approval", async () => {
    const client = new PGlite(); const db = drizzle(client); await migrate(db, { migrationsFolder: "drizzle" });
    const [user] = await db.insert(users).values({ email: "proposal@example.com" }).returning();
    const [alpha,beta] = await db.insert(workspaces).values([{ name:"Alpha",slug:"proposal-alpha",currency:"ZAR" },{ name:"Beta",slug:"proposal-beta",currency:"USD" }]).returning();
    if (!user || !alpha || !beta) throw new Error("fixtures");
    await db.insert(workspaceMembers).values([{ workspaceId:alpha.id,userId:user.id,role:"owner",status:"active" },{ workspaceId:beta.id,userId:user.id,role:"owner",status:"active" }]);
    const [company] = await db.insert(companies).values({ workspaceId:alpha.id,name:"Client",dedupeKey:"proposal-client" }).returning();
    const [lead] = await db.insert(leads).values({ workspaceId:alpha.id,companyId:company!.id,title:"Client opportunity" }).returning();
    vi.resetModules(); vi.doMock("@/server/db", () => ({ getDatabase: () => db })); const service = await import("./service");
    const alphaScope=createWorkspaceScope({workspaceId:alpha.id,userId:user.id,role:"owner"}); const betaScope=createWorkspaceScope({workspaceId:beta.id,userId:user.id,role:"owner"}); const viewer=createWorkspaceScope({workspaceId:alpha.id,userId:user.id,role:"viewer"});
    const requestKey=randomUUID(); const input={ leadId:lead!.id,requestKey,title:"Site proposal",summary:"Review",scope:"Build",deliverables:"Website",assumptions:"Content supplied",exclusions:"Hosting",timeline:"4 weeks",discountMinor:500,items:[{description:"Implementation",quantity:2,unitAmountMinor:10000}] };
    const id=await service.createProposal(alphaScope,input); expect(await service.createProposal(alphaScope,input)).toBe(id);
    await expect(service.createProposal(viewer,{...input,requestKey:randomUUID()})).rejects.toThrow("role");
    await expect(service.getProposal(betaScope,id)).resolves.toBeNull(); await expect(service.approveProposal(betaScope,{proposalId:id,note:"Checked"})).rejects.toThrow("unavailable");
    const original=(await service.getProposal(alphaScope,id))!; expect(original.current.snapshot.totalMinor).toBe(19500);
    await service.approveProposal(alphaScope,{proposalId:id,note:"Scope and price reviewed"});
    await service.reviseProposal(alphaScope,id,{...input,title:"Revised proposal",discountMinor:0,items:[{description:"Implementation",quantity:3,unitAmountMinor:10000}]});
    const revised=(await service.getProposal(alphaScope,id))!; expect(revised).toMatchObject({status:"draft",currentVersion:2}); expect(revised.current.snapshot.totalMinor).toBe(30000); expect(revised.versions[1]!.snapshot.totalMinor).toBe(19500);
    await expect(service.approveProposal(viewer,{proposalId:id,note:"No"})).rejects.toThrow("role"); await service.approveProposal(alphaScope,{proposalId:id,note:"Revised scope reviewed"});
    expect(await db.select().from(proposalVersions)).toHaveLength(2); await client.close();
  });
});
