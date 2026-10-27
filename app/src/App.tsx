import { useEffect, useState } from "react";

type Panel = { id: number; title: string; content: string };
type WorkspaceSnapshot = { panels: Panel[]; activePanelId: number };
const STORAGE_KEY = "dva.workspace.v1";
const starterPanel: Panel = { id: 1, title: "Untitled", content: "" };

function loadWorkspace(): WorkspaceSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { panels: [starterPanel], activePanelId: starterPanel.id };
    const saved: unknown = JSON.parse(raw);
    if (
      typeof saved !== "object" || saved === null ||
      !("panels" in saved) || !Array.isArray(saved.panels) ||
      !saved.panels.every((panel) =>
        typeof panel === "object" && panel !== null &&
        typeof panel.id === "number" &&
        typeof panel.title === "string" &&
        typeof panel.content === "string"
      ) ||
      !("activePanelId" in saved) || typeof saved.activePanelId !== "number"
    ) {
      return { panels: [starterPanel], activePanelId: starterPanel.id };
    }
    const panels = saved.panels as Panel[];
    const activePanelId = panels.some((panel) => panel.id === saved.activePanelId)
      ? saved.activePanelId as number
      : panels[0]?.id ?? 0;
    return { panels, activePanelId };
  } catch {
    return { panels: [starterPanel], activePanelId: starterPanel.id };
  }
}

export default function App() {
  const [initialWorkspace] = useState(loadWorkspace);
  const [panels, setPanels] = useState<Panel[]>(initialWorkspace.panels);
  const [activePanelId, setActivePanelId] = useState(initialWorkspace.activePanelId);
  const [saveStatus, setSaveStatus] = useState("Saved locally");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const activePanel = panels.find((panel) => panel.id === activePanelId);

  function saveWorkspace() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ panels, activePanelId }));
      setSaveStatus("Saved locally");
    } catch {
      setSaveStatus("Save failed");
    }
  }

  useEffect(() => {
    saveWorkspace();
    // Save after workspace changes so text and panel layout survive restarts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels, activePanelId]);

  function createPanel() {
    const id = Math.max(0, ...panels.map((panel) => panel.id)) + 1;
    setPanels((current) => [...current, { id, title: "Untitled", content: "" }]);
    setActivePanelId(id);
  }

  function updateContent(id: number, content: string) {
    setPanels((current) => current.map((panel) => panel.id === id ? {
      ...panel,
      content,
      title: content.trim().split("\n")[0]?.slice(0, 32) || "Untitled",
    } : panel));
  }

  function closePanel(id: number) {
    const next = panels.filter((panel) => panel.id !== id);
    setPanels(next);
    if (activePanelId === id) setActivePanelId(next[next.length - 1]?.id ?? 0);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        createPanel();
      } else if (key === "f") {
        event.preventDefault();
        setSearchOpen(true);
        setSearchQuery("");
      } else if (key === "s") {
        event.preventDefault();
        saveWorkspace();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // Rebind so shortcuts use the latest workspace state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels, activePanelId]);

  function openPanelFromSearch(id: number) {
    setActivePanelId(id);
    setSearchOpen(false);
    setSearchQuery("");
  }

  const matchingPanels = panels.filter((panel) =>
    panel.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    panel.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="dva-shell">
      <header className="topbar">
        <div className="brand" aria-label="DVA workspace">
          <span className="brand-mark">D</span><span>DVA</span><span className="workspace-label">WORKSPACE</span>
        </div>
        <div className="topbar-actions">
          <span className={saveStatus === "Save failed" ? "status-dot status-error" : "status-dot"} aria-hidden="true" />
          <span className="status-label" role="status">{saveStatus}</span>
          <button className="secondary-button" onClick={saveWorkspace}>Save</button>
          <button className="primary-button" onClick={createPanel}>+ New panel</button>
        </div>
      </header>
      <section className="workspace" aria-label="Workspace panels">
        {panels.length === 0 ? (
          <div className="empty-state"><p className="eyebrow">OPEN SPACE</p><h1>Start anywhere.</h1><p>Create a panel and let structure emerge as you work.</p><button className="primary-button" onClick={createPanel}>Create a panel</button></div>
        ) : (
          <div className="panel-grid">{panels.map((panel) => (
            <article className={panel.id === activePanelId ? "panel panel-active" : "panel"} key={panel.id} onClick={() => setActivePanelId(panel.id)} aria-label={panel.title}>
              <header className="panel-header">
                <button className="panel-handle" aria-label={`Focus ${panel.title} panel`} onClick={(event) => { event.stopPropagation(); setActivePanelId(panel.id); }}><span className="grip" aria-hidden="true">⠿</span><span>{panel.title}</span></button>
                <button className="icon-button" aria-label={`Close ${panel.title} panel`} onClick={(event) => { event.stopPropagation(); closePanel(panel.id); }}>×</button>
              </header>
              <textarea aria-label={`${panel.title} content`} placeholder="Write something. You can organize it later." value={panel.content} onFocus={() => setActivePanelId(panel.id)} onChange={(event) => updateContent(panel.id, event.currentTarget.value)} spellCheck />
            </article>
          ))}</div>
        )}
      </section>
      <footer className="hint-layer" aria-label="Keyboard hints">
        <span><kbd>Ctrl</kbd> <span className="hint-plus">+</span> <kbd>N</kbd> New panel</span>
        <span><kbd>Ctrl</kbd> <span className="hint-plus">+</span> <kbd>F</kbd> Find anything</span>
        <span><kbd>Ctrl</kbd> <span className="hint-plus">+</span> <kbd>S</kbd> Save</span>
        <span className="hint-note">{saveStatus === "Save failed" ? "Could not save locally. Check app storage." : "A workspace that follows the work."}</span>
      </footer>
      {searchOpen && (
        <div className="search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
          <section className="search-dialog" role="dialog" aria-modal="true" aria-labelledby="search-title">
            <h2 id="search-title">Find anything</h2>
            <input autoFocus aria-label="Search panels" placeholder="Search panel titles and writing…" value={searchQuery} onChange={(event) => setSearchQuery(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); if (event.key === "Enter" && matchingPanels[0]) openPanelFromSearch(matchingPanels[0].id); }} />
            <div className="search-results">
              {matchingPanels.map((panel) => <button key={panel.id} className="search-result" onClick={() => openPanelFromSearch(panel.id)}><strong>{panel.title}</strong><span>{panel.content.slice(0, 100) || "Empty panel"}</span></button>)}
              {matchingPanels.length === 0 && <p className="search-empty">No matching panels.</p>}
            </div>
            <p className="search-help">Enter to open the first result · Esc to close</p>
          </section>
        </div>
      )}
      <span className="sr-only" aria-live="polite">{activePanel ? `Active panel: ${activePanel.title}` : "No panels open"}</span>
    </main>
  );
}
