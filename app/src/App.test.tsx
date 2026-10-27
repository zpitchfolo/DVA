import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("DVA workspace shell", () => {
  it("starts with an editable panel", () => {
    render(<App />);
    expect(screen.getByRole("textbox", { name: "Untitled content" })).toBeInTheDocument();
  });

  it("creates a separate panel without replacing the first", () => {
    render(<App />);
    fireEvent.change(screen.getByRole("textbox", { name: "Untitled content" }), { target: { value: "First note" } });
    fireEvent.click(screen.getByRole("button", { name: /new panel/i }));
    expect(screen.getByRole("textbox", { name: "First note content" })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("keeps another panel when one panel is closed", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /new panel/i }));
    const panels = screen.getAllByRole("article");
    fireEvent.change(within(panels[0]).getByRole("textbox"), { target: { value: "Keep this" } });
    fireEvent.change(within(panels[1]).getByRole("textbox"), { target: { value: "Close this" } });
    fireEvent.click(screen.getByRole("button", { name: "Close Close this panel" }));
    expect(screen.getByRole("textbox", { name: "Keep this content" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Close this content" })).not.toBeInTheDocument();
  });

  it("shows an empty state and can recover by creating a panel", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /close untitled panel/i }));
    expect(screen.getByText("Start anywhere.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /create a panel/i }));
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
  });
});
