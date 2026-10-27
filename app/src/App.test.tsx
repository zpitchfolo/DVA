import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

beforeEach(() => {
  localStorage.clear();
});

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

  it("automatically restores panel contents after the app remounts", () => {
    const firstRender = render(<App />);
    fireEvent.change(screen.getByRole("textbox", { name: "Untitled content" }), { target: { value: "A saved note" } });
    fireEvent.click(screen.getByRole("button", { name: /new panel/i }));
    firstRender.unmount();

    render(<App />);
    expect(screen.getByRole("textbox", { name: "A saved note content" })).toHaveValue("A saved note");
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("preserves malformed saved data and pauses autosave for recovery", async () => {
    const original = "{ this is not valid JSON and must survive }";
    localStorage.setItem("dva.workspace.v1", original);

    render(<App />);

    expect(await screen.findByText("Your saved writing was not replaced.")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Original saved workspace data" })).toHaveValue(original);
    expect(localStorage.getItem("dva.workspace.v1")).toBe(original);
    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("preserves structurally invalid saved data rather than replacing it with a starter workspace", async () => {
    const original = JSON.stringify({ panels: [{ id: "bad", title: "Lost?", content: "Keep me" }], activePanelId: 1 });
    localStorage.setItem("dva.workspace.v1", original);

    render(<App />);

    expect(await screen.findByText("Your saved writing was not replaced.")).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem("dva.workspace.v1")).toBe(original));
    expect(screen.queryByRole("textbox", { name: /content/i })).not.toBeInTheDocument();
  });

  it("creates a panel with Ctrl+N", () => {
    render(<App />);
    fireEvent.keyDown(window, { key: "n", ctrlKey: true });
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
  });

  it("opens panel search with Ctrl+F and jumps to a matching panel", () => {
    render(<App />);
    fireEvent.change(screen.getByRole("textbox", { name: "Untitled content" }), { target: { value: "Find the moon" } });
    fireEvent.keyDown(window, { key: "f", ctrlKey: true });
    const search = screen.getByRole("textbox", { name: "Search panels" });
    fireEvent.change(search, { target: { value: "moon" } });
    fireEvent.keyDown(search, { key: "Enter" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Find the moon content" })).toBeInTheDocument();
  });

  it("saves immediately with Ctrl+S", () => {
    render(<App />);
    fireEvent.change(screen.getByRole("textbox", { name: "Untitled content" }), { target: { value: "Saved with shortcut" } });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    expect(localStorage.getItem("dva.workspace.v1")).toContain("Saved with shortcut");
    expect(screen.getByRole("status")).toHaveTextContent("Saved locally");
  });
});
