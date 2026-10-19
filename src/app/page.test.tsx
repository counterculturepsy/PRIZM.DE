import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("states the core value without claiming unfinished capabilities are live", () => {
    render(<HomePage />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Find your next client");
    expect(screen.getByText(/campaign preparation, unsubscribe suppression, and a fail-closed delivery control plane are implemented; live providers and outbound automation remain disabled/i)).toBeInTheDocument();
  });
});
