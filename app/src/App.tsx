import { useState } from "react";

type Panel = { id: number; title: string; content: string };
const starterPanel: Panel = { id: 1, title: "Untitled", content: "" };

export default function App() {
  const [panels, setPanels] = useState<Panel[]>([starterPanel]);
  const [activePanelId, setActivePanelId] = useState(starterPanel.id);
  const activePanel = panels.find((panel) => panel.id === activePanelId);

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

  return (
    <main className="dva-shell">
      <header className="topbar">
        <div className="brand" aria-label="DVA workspace">
          <span className="brand-mark">D</span><span>DVA</span><span className="workspace-label">WORKSPACE</span>
        </div>
        <div className="topbar-actions"><span className="status-dot" aria-hidden="true" /><span className="status-label">Local workspace</span><button className="primary-button" onClick={createPanel}>+ New panel</button></div>
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
      <footer className="hint-layer" aria-label="Keyboard hints"><span><kbd>Ctrl</kbd> <span className="hint-plus">+</span> <kbd>N</kbd> New panel</span><span><kbd>Ctrl</kbd> <span className="hint-plus">+</span> <kbd>P</kbd> Find anything</span><span className="hint-note">A workspace that follows the work.</span></footer>
      <span className="sr-only" aria-live="polite">{activePanel ? `Active panel: ${activePanel.title}` : "No panels open"}</span>
    </main>
  );
}
