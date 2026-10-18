import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("states the core value without claiming unfinished capabilities are live", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Find your next client");
    expect(screen.getByText(/controlled discovery, audits, opportunity scoring, tenant-safe CRM, review-only AI drafts, and versioned proposal snapshots are implemented; AI generation, production auditing, public proposal delivery, and outbound automation remain disabled by default/i)).toBeInTheDocument();
  });
});
