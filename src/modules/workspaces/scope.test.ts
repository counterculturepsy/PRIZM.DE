import { describe, expect, it } from "vitest";
import { assertWorkspaceMatch, createWorkspaceScope, hasCapability } from "./scope";

const workspaceId = "6cd7ed96-66e6-4e6f-a7df-5f1d26f7af34";
const userId = "443193ee-897e-44ea-a8cc-e0cb83bfa6db";

describe("workspace scope", () => {
  it("denies records from another workspace", () => {
    const scope = createWorkspaceScope({ workspaceId, userId, role: "viewer" });
    expect(() => assertWorkspaceMatch(scope, "1d51530d-b3ce-4dd1-9789-b729c513974d")).toThrow(
      "Workspace access denied",
    );
  });

  it("keeps viewers read-only", () => {
    const scope = createWorkspaceScope({ workspaceId, userId, role: "viewer" });
    expect(hasCapability(scope, "read")).toBe(true);
    expect(hasCapability(scope, "write")).toBe(false);
  });

  it("allows owners to manage billing", () => {
    const scope = createWorkspaceScope({ workspaceId, userId, role: "owner" });
    expect(hasCapability(scope, "manage_billing")).toBe(true);
  });
});
