import { getVersion } from "@tauri-apps/api/app";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";

type Panel = { id: number; title: string; content: string };
type WorkspaceSnapshot = { panels: Panel[]; activePanelId: number };
type WorkspaceDocument = WorkspaceSnapshot & { schemaVersion: number };
type NativeWorkspaceLoad = { workspace: WorkspaceDocument | null; path: string };

const STORAGE_KEY = "dva.workspace.v1";
const DEVELOPMENT_VERSION = "0.2.0";
const starterPanel: Panel = { id: 1, title: "Untitled", content: "" };
const starterWorkspace = (): WorkspaceSnapshot => ({
  panels: [{ ...starterPanel }],
  activePanelId: starterPanel.id,
});

function parseWorkspace(raw: string): WorkspaceSnapshot {
  const saved: unknown = JSON.parse(raw);
  if (
    typeof saved !== "object" || saved === null ||
    !("panels" in saved) || !Array.isArray(saved.panels) ||
    !saved.panels.every((panel) =>
      typeof panel === "object" && panel !== null &&
      "id" in panel && typeof panel.id === "number" &&
      "title" in panel && typeof panel.title === "string" &&
      "content" in panel && typeof panel.content === "string"
    ) ||
    !("activePanelId" in saved) || typeof saved.activePanelId !== "number"
  ) {
    throw new Error("The saved workspace does not match the expected panel format.");
  }

  const panels = saved.panels as Panel[];
  if (panels.some((panel) => !Number.isSafeInteger(panel.id) || panel.id <= 0)) {
    throw new Error("The saved workspace contains an invalid panel ID.");
  }
  if (new Set(panels.map((panel) => panel.id)).size !== panels.length) {
    throw new Error("The saved workspace contains duplicate panel IDs.");
  }
  if (panels.length > 0 && !panels.some((panel) => panel.id === saved.activePanelId)) {
    throw new Error("The saved workspace points to an active panel that does not exist.");
  }

  return { panels, activePanelId: saved.activePanelId };
}

export default function App() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [activePanelId, setActivePanelId] = useState(0);
  const [saveStatus, setSaveStatus] = useState("Loading workspace…");
  const [saveError, setSaveError] = useState("");
  const [appVersion, setAppVersion] = useState(`${DEVELOPMENT_VERSION} · preview`);
  const saveQueue = useRef<Promise<unknown>>(Promise.resolve());
  const [workspacePath, setWorkspacePath] = useState("");
  const [ready, setReady] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState("");
  const [recoveryData, setRecoveryData] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const activePanel = panels.find((panel) => panel.id === activePanelId);
  const recoveryRequired = recoveryMessage.length > 0;

  useEffect(() => {
    let cancelled = false;
    if (isTauri()) {
      void getVersion().then((version) => {
        if (!cancelled) setAppVersion(version);
      }).catch(() => {
        if (!cancelled) setAppVersion(DEVELOPMENT_VERSION + " · version unavailable");
      });
    }
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initializeWorkspace() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);

        if (isTauri()) {
          const native = await invoke<NativeWorkspaceLoad>("load_workspace");
          if (cancelled) return;
          setWorkspacePath(native.path);

          if (native.workspace) {
            const restored = parseWorkspace(JSON.stringify(native.workspace));
            setPanels(restored.panels);
            setActivePanelId(restored.activePanelId);
            setSaveStatus("Loaded workspace JSON");
            setReady(true);
            return;
          }

          if (raw !== null) {
            let migrated: WorkspaceSnapshot;
            try {
              migrated = parseWorkspace(raw);
            } catch (error) {
              setRecoveryMessage("DVA found saved browser data but could not safely migrate it: " + String(error));
              setRecoveryData(raw);
              setSaveStatus("Recovery needed");
              return;
            }

            const document: WorkspaceDocument = { schemaVersion: 1, ...migrated };
            const verifiedPath = await invoke<string>("save_workspace", { workspace: document });
            if (cancelled) return;
            setWorkspacePath(verifiedPath);
            setPanels(migrated.panels);
            setActivePanelId(migrated.activePanelId);
            setSaveStatus("Migrated and verified workspace JSON");
            setReady(true);
            return;
          }

          const initial = starterWorkspace();
          const verifiedPath = await invoke<string>("save_workspace", {
            workspace: { schemaVersion: 1, ...initial },
          });
          if (cancelled) return;
          setWorkspacePath(verifiedPath);
          setPanels(initial.panels);
          setActivePanelId(initial.activePanelId);
          setSaveStatus("Created workspace JSON");
          setReady(true);
          return;
        }

        if (raw !== null) {
          try {
            const restored = parseWorkspace(raw);
            if (cancelled) return;
            setPanels(restored.panels);
            setActivePanelId(restored.activePanelId);
            setSaveStatus("Loaded browser workspace");
          } catch (error) {
            setRecoveryMessage("DVA found saved browser data but could not safely load it: " + String(error));
            setRecoveryData(raw);
            setSaveStatus("Recovery needed");
            return;
          }
        } else {
          const initial = starterWorkspace();
          setPanels(initial.panels);
          setActivePanelId(initial.activePanelId);
          setSaveStatus("New browser workspace");
        }
        if (!cancelled) setReady(true);
      } catch (error) {
        if (cancelled) return;
        setRecoveryMessage(
          "DVA could not safely load the workspace. No replacement workspace was written. " + String(error)
        );
        setSaveStatus("Recovery needed");
      }
    }

    void initializeWorkspace();
    return () => { cancelled = true; };
  }, []);

  async function saveWorkspace() {
    if (!ready || recoveryRequired) return;
    const snapshot: WorkspaceSnapshot = { panels, activePanelId };
    setSaveError("");
    setSaveStatus("Saving…");

    const performSave = async () => {
      if (isTauri()) {
        const path = await invoke<string>("save_workspace", {
          workspace: { schemaVersion: 1, ...snapshot },
        });
        setWorkspacePath(path);
        setSaveStatus("Saved workspace JSON");
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        setSaveStatus("Saved locally");
      }
    };

    // Native saves share one temporary file. Serialize calls so autosave and Ctrl/Cmd+S
    // cannot overwrite each other's temporary write.
    const queuedSave = saveQueue.current.catch(() => undefined).then(performSave);
    saveQueue.current = queuedSave;
    try {
      await queuedSave;
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setSaveStatus("Save failed");
      setSaveError(detail);
      console.error("DVA workspace save failed:", error);
    }
  }

  useEffect(() => {
    if (ready && !recoveryRequired) void saveWorkspace();
    // Save after workspace changes, but never while initialization or recovery is unresolved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, recoveryRequired, panels, activePanelId]);

  function createPanel() {
    if (recoveryRequired) return;
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
      if (!(event.ctrlKey || event.metaKey) || event.altKey || recoveryRequired || !ready) return;
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
        void saveWorkspace();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // Rebind so shortcuts use the latest workspace state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels, activePanelId, ready, recoveryRequired]);

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
          <span className="brand-mark">D</span><span>DVA</span><span className="workspace-label">WORKSPACE</span><span className="workspace-version" aria-label={"App version " + appVersion}>v{appVersion}</span>
        </div>
        <div className="topbar-actions">
          <span className={saveStatus === "Save failed" || recoveryRequired ? "status-dot status-error" : "status-dot"} aria-hidden="true" />
          <span className="status-label" role="status">{saveStatus}</span>
          <button className="secondary-button" onClick={() => void saveWorkspace()} disabled={!ready || recoveryRequired}>Save</button>
          <button className="primary-button" onClick={createPanel} disabled={!ready || recoveryRequired}>+ New panel</button>
        </div>
      </header>

      {recoveryRequired ? (
        <section className="workspace" aria-label="Workspace recovery">
          <div className="empty-state">
            <p className="eyebrow">RECOVERY NEEDED</p>
            <h1>Your saved writing was not replaced.</h1>
            <p>{recoveryMessage}</p>
            {workspacePath && <p>Workspace file: <code>{workspacePath}</code></p>}
            {recoveryData && (
              <>
                <p>Copy this original browser-storage data somewhere safe before attempting manual repair.</p>
                <textarea aria-label="Original saved workspace data" readOnly value={recoveryData} />
              </>
            )}
            <button className="secondary-button" onClick={() => window.location.reload()}>Try loading again</button>
          </div>
        </section>
      ) : !ready ? (
        <section className="workspace" aria-label="Loading workspace">
          <div className="empty-state"><p className="eyebrow">LOADING</p><h1>Opening your workspace…</h1><p>DVA is checking your saved writing before enabling autosave.</p></div>
        </section>
      ) : (
        <section className="workspace" aria-label="Workspace panels">
          {panels.length === 0 ? (
            <div className="empty-state"><p className="eyebrow">OPEN SPACE</p><h1>Start anywhere.</h1><p>Create a panel and let structure emerge as you work.</p><button className="primary-button" onClick={createPanel}>Create a panel</button></div>
          ) : (
            <div className="panel-grid">{panels.map((panel) => (
              <article className={panel.id === activePanelId ? "panel panel-active" : "panel"} key={panel.id} onClick={() => setActivePanelId(panel.id)} aria-label={panel.title}>
                <header className="panel-header">
                  <button className="panel-handle" aria-label={"Focus " + panel.title + " panel"} onClick={(event) => { event.stopPropagation(); setActivePanelId(panel.id); }}><span className="grip" aria-hidden="true">⠿</span><span>{panel.title}</span></button>
                  <button className="icon-button" aria-label={"Close " + panel.title + " panel"} onClick={(event) => { event.stopPropagation(); closePanel(panel.id); }}>×</button>
                </header>
                <textarea aria-label={panel.title + " content"} placeholder="Write something. You can organize it later." value={panel.content} onFocus={() => setActivePanelId(panel.id)} onChange={(event) => updateContent(panel.id, event.currentTarget.value)} spellCheck />
              </article>
            ))}</div>
          )}
        </section>
      )}

      <footer className="hint-layer" aria-label="Keyboard hints">
        <span><kbd>Ctrl</kbd> <span className="hint-plus">+</span> <kbd>N</kbd> New panel</span>
        <span><kbd>Ctrl</kbd> <span className="hint-plus">+</span> <kbd>F</kbd> Find anything</span>
        <span><kbd>Ctrl</kbd> <span className="hint-plus">+</span> <kbd>S</kbd> Save</span>
        <span className="hint-note">{recoveryRequired ? "Autosave paused to protect saved data." : saveStatus === "Save failed" ? "Could not save: " + (saveError || "unknown error") : workspacePath || "A workspace that follows the work."}</span>
      </footer>

      {searchOpen && ready && !recoveryRequired && (
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
      <span className="sr-only" aria-live="polite">{activePanel ? "Active panel: " + activePanel.title : "No panels open"}</span>
    </main>
  );
}
