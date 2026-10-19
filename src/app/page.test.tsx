import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("states the core value without claiming unfinished capabilities are live", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Find your next client");
    expect(screen.getByText(/campaign safety, and workspace-scoped reporting are implemented; live providers, outbound automation, and recognized-revenue reporting remain disabled/i)).toBeInTheDocument();
  });
});
