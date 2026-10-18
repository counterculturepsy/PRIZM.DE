import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("states the core value without claiming unfinished capabilities are live", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Find your next client");
    expect(screen.getByText(/controlled discovery, audit queues, deterministic opportunity scoring, tenant-safe CRM, and evidence-grounded review-only drafts are implemented; AI generation, production audit processing, and outbound automation remain disabled by default/i)).toBeInTheDocument();
  });
});
