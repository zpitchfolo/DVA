# DVA: Design Document

**Version:** 0.8.0  
**Status:** Provisional. Working design model, not an implementation specification.  
**Previous version:** 0.7.0  
**Motto:** Evidence over speculation.

## Version 0.8.0: Change Summary

This update defines the first concrete workspace JSON schema and records the implementation boundary for native persistence and guarded migration. Code is now present for the first schema and save/load path, but automated CI and real desktop restart acceptance must still verify it before it can be called working.

### Workspace persistence decision

- The canonical workspace is a JSON file containing writing and the current panel/workspace state.
- The current first schema is intentionally small and versioned. It records only what the prototype currently needs; it is not the final full workspace model.
- The default location is Tauri's app-specific writable data directory, in `workspace.json`. Never assume the installed application's directory is writable.
- Portable builds may configure a dedicated writable `app-data` directory. User-selected workspace locations remain a planned extension, not implemented behavior.
- The existing `dva.workspace.v1` localStorage source is retained after migration. It is not removed as part of migration.
- Native load/save commands and a guarded localStorage migration path are now implemented in source. They are not considered verified until CI passes and the actual desktop close/reopen flow is tested.

#### First workspace JSON schema (schemaVersion 1)

```json
{
  "schemaVersion": 1,
  "panels": [
    {
      "id": 1,
      "title": "Untitled",
      "content": "Your writing goes here."
    }
  ],
  "activePanelId": 1
}
```

Field meanings and validation:
- `schemaVersion`: required integer identifying the document format. The first implementation accepts version `1`; unknown versions are rejected rather than guessed at.
- `panels`: ordered array of panel records. Each has a positive, unique numeric `id`, a string `title`, and string `content`. An empty array is valid when the user closes the final panel.
- `activePanelId`: ID of the currently active panel. For a non-empty panel list it must reference an existing panel. When the list is empty, the current prototype uses `0`.
- Future workspace fields such as windows, panes, tabs, marks, file references, cursor positions, settings, history, and relationships should be added through deliberate schema evolution rather than silently inferred from this first schema.

#### File lifecycle and recovery contract

- Native path: Tauri app-data directory + `workspace.json`; the resolved path is shown in the workspace's bottom hint layer.
- Save strategy: serialize to `workspace.json.tmp`, flush and read it back, validate it, preserve the previous file as `workspace.json.bak` when replacing an existing file, then verify the installed document.
- Startup: if valid JSON exists, load it. If it is missing, migrate a valid `dva.workspace.v1` browser-storage snapshot; if neither exists, create the initial workspace JSON.
- Migration only runs when the native JSON file is missing. The old localStorage value is not deleted.
- Malformed localStorage, invalid JSON, unsupported schema versions, or native load errors pause initialization and autosave. DVA must not silently initialize a starter workspace over data it could not read.
- A failed save is reported visibly. The in-memory text remains available while the app is open, but the user must not assume that a failed save has reached disk.
- The backup file is a recovery aid, not yet a user-facing version-history system. Restore UI, user-selected locations, and broader import/export remain future work.

Tauri supports app-specific data directories and explicit directory overrides, including portable-build layouts. The implementation must account for platform-specific writability and use least-privilege filesystem access: [Tauri configuration reference](https://v2.tauri.app/reference/config/) and [Tauri filesystem plugin](https://v2.tauri.app/plugin/file-system/).

### Keyboard and save behavior

- The agreed search/find shortcut is Ctrl/Cmd+F. Ctrl/Cmd+P is not the intended shortcut.
- The current source implements Ctrl/Cmd+F; verify the shortcut in automated tests and the desktop runtime before accepting it.
- Ctrl/Cmd+S must produce an observable result. It should flush pending workspace writes and communicate success or failure, rather than appearing inert when autosave has already run.
- Search scope for the current prototype is panel titles and panel content. Broader file/workspace search is future behavior, not implied by this shortcut change.

### Existing implementation boundary

The current source stores the canonical desktop workspace in native `workspace.json` through narrow Rust commands and keeps browser localStorage as a migration source/fallback for non-Tauri preview. The code also pauses initialization when stored data cannot be validated. These are source-level implementation facts, not proof that the native runtime works: CI, Rust tests, and real desktop close/reopen acceptance must establish that.

### Maintenance and recovery

- Keep one canonical current design document and one current test record; use Git history for older versions.
- Maintain a separate [DVA Maintenance Guide](DVA-Maintenance.md) as the handoff and recovery checklist.
- The maintenance guide must preserve the last known baseline, exact outstanding work, test gates, and recovery rules so a new session can resume without re-deriving decisions.

## Version 0.6.9: Change Summary

This patch establishes the first persistence and keyboard-shortcut slice in the running prototype. The frontend now autosaves panel content and active-panel state to local storage, offers an explicit Save action and Ctrl/Cmd+S, creates panels with Ctrl/Cmd+N, and currently opens panel search with Ctrl/Cmd+P. The agreed target shortcut is Ctrl/Cmd+F; the mismatch remains outstanding. These are implementation changes, not yet verified by an executed test run or restart acceptance check.

### Added in this version

- Autosave the current panel collection and active panel to versioned local-storage key `dva.workspace.v1`.
- Restore saved panels on startup and tolerate missing, malformed, or incompatible saved data by starting with a starter panel.
- Show a visible local-save status and expose an explicit Save button.
- Implement Ctrl/Cmd+S, Ctrl/Cmd+N, and Ctrl/Cmd+P; panel search filters panel titles and content and opens a selected result.
- Add regression tests for persistence, keyboard shortcuts, and panel search. The tests must be executed before the candidate is accepted.
- Add automated CI checks for dependency installation, tests, and production build.

### Current implementation boundary

This is a prototype persistence layer, not yet the intended canonical workspace JSON file. Browser/WebView local storage is convenient for immediate persistence, but it is origin-specific and does not yet provide user-chosen workspace files, export/import, history snapshots, migration tooling, or recovery from storage-device failure. Those remain separate work. See the current test record for actual execution evidence.

## Version 0.6.7: Change Summary

This patch records the repository's single-current-document maintenance rule and adopts the current modular development workflow. The design document now has a stable filename; its SemVer version is maintained inside the document, and Git history plus diffs preserve and expose earlier states without keeping versioned copies in the working tree.

### Workflow and document maintenance

- Adopt [Development State Machine Workflow v1.5.0](https://github.com/zpitchfolo/Meta-Modules/blob/main/workflows/Development-State-Machine-Workflow-v1.5.0.md).
- Use the modular workflow and discover relevant modules from the Meta-Modules repository; for software implementation, apply [Testing and Verification v0.1.0](https://github.com/zpitchfolo/Meta-Modules/blob/main/modules/testing-and-verification-v0.1.0.md) when relevant.
- Keep one canonical current file per document in its project folder. Update that file in place and increment the document's own SemVer in its header; do not create side-by-side version-suffixed copies.
- Before accepting a document update, inspect the diff against the previous committed state, verify the changes and relevant links/structure, and commit the accepted state. Git commit history is the recovery and version archive.
- Preserve candidate status honestly. If a candidate is not accepted, use the diff and Git history to repair or restore it; do not describe it as accepted merely because it was written.
- The workflow itself remains a separate reusable module. This project-specific file records how DVA adopts it rather than copying its entire contents.

### Added or clarified in this version

- Panel-first interaction: panels are the primary workspace units; tabs are an optional way to organize or switch between panel contents, not the foundation of the entire workspace.
- Modular app surfaces: DVA should support running our own apps inside the workspace when their architecture and runtime allow it, with clear interfaces for presentation, state, and communication.
- Reusable app capabilities: where appropriate, an app's core functionality should be separable from its full-window presentation so DVA can host that functionality in a panel or launch the app independently.
- Broad compatibility goal: support a range of embedded web apps, purpose-built DVA modules, connected tools, and external native applications, while being honest about technical and security limits.
- Mark Index: provide a dedicated, viewable index of marks that can be browsed like an outline and used to jump to each mark's location.
- Inspectable workspace: file views, indexes, app/workspace JSON, and relevant metadata can be opened as panels and edited in place where appropriate.

### Established or clarified in this version

- DVA is a full desktop application, not merely a webpage.
- Initial implementation stack: Tauri 2 + React + TypeScript + Vite, reusing the stack already established in the Git Visual project.
- This stack choice is a starting decision, not a claim that Tauri is automatically faster in every workload. Verify startup, typing, panel drag/resize, file operations, and large-workspace behavior against acceptance checks.
- Workspace content and working state remain JSON-first.
- Native file and operating-system access must pass through narrowly scoped Tauri commands and capabilities; the frontend must not receive unrestricted filesystem access.
- DVA adopts [Development State Machine Workflow v1.5.0](https://github.com/zpitchfolo/Meta-Modules/blob/main/workflows/Development-State-Machine-Workflow-v1.5.0.md) for design, implementation, source inspection, AI-owned testing, stop gates, recovery, and maintenance evidence.
- AI is responsible for executing available automated tests and applicable runtime/acceptance checks, reporting exact commands and results, and stopping at failed or unverified gates.
- Technology decisions, planned features, implemented behavior, and tested behavior must remain distinguishable.

This document describes intended behavior and current design decisions. A design decision is not evidence that the feature has been implemented or tested.

### Established in this version

- The workspace is JSON-first. The workspace JSON contains working content and layout, not just configuration.
- Writing does not require creating or naming files.
- Windows, panes, tabs, and items form the working environment.
- Marks are anchored in text. Their definitions and appearance settings are global.
- Mark delimiters remain visible in Full view. Their visual emphasis changes with cursor and selection context, not their existence.
- Everyday editing uses Full view by default.
- Mark appearance is customizable through settings.
- Workspace history behaves like a game's save system: automatic snapshots, optional names, flags, and user-defined tags.
- Earlier snapshots can be inspected and opened alongside current work without replacing it.
- Restoring a snapshot is a deliberate operation. The current state must be preserved first.
- Git is an optional additional version-control layer, not a requirement for ordinary workspace history.
- Save-history storage remains an implementation question.

This document describes intended behavior. A design decision is not evidence that the feature has been implemented or tested.

---

## 1. Core Idea

DVA is a writing-first workspace for creating, exploring, revising, comparing, and connecting long-form work.

**Structure should emerge from the work, not be defined before it.**

The user writes, experiments, connects, and organizes without stopping to manage files, names, or categories. Structure appears when it becomes useful.

DVA combines the freedom of an open writing space with the navigability of a structured environment. Its purpose is not to make writers manage information more efficiently. Its purpose is to make the work easier to create and understand.

## 2. Primary User

The writer or creator.

The system exists to help a person create, explore, revise, compare, connect, and navigate. It should support incomplete ideas, alternate possibilities, temporary material, and evolving structures without requiring premature decisions.

## 3. The Problem

Most tools separate creating from organizing. Users must name, file, categorize, and link material before it exists, then maintain that organization as the work grows.

That separation creates friction.

The intended process is:

`create → work → notice a relationship → mark or connect`

Structure is a byproduct of writing, not a prerequisite.

## 4. Principles

**Visible structure.** Don't make users remember where something lives.

**Visible actions.** Don't make users remember commands.

**Multiple interaction paths.** Keyboard, mouse, right-click, drag, and typed commands should reach the same actions. No single interaction method is required.

**Don't hide context unnecessarily.** Opening or interacting with one thing should not require forgetting another.

**Preserve possibility.** Exploration and abandoned alternatives can remain available without being treated as current or canonical.

**Evidence over speculation.** Distinguish established behavior from assumptions, hypotheses, and untested implementation ideas.

The context principle is load-bearing.

## 5. North Star

The user creates naturally. The structure of their work becomes context. The user navigates that context rather than having to remember everything.

Make these transitions inexpensive:

- What is happening now?
- What caused it?
- Who is involved?
- What do they know?
- What has changed?
- What remains unresolved?
- What else could have happened?

DVA preserves not only what exists, but how it developed and what alternatives remain possible.

## 6. Architecture

The workspace is a JSON file containing the working state and content.

It is not merely layout or configuration. Content itself belongs in the workspace by default.

Embedded content lives directly inside the workspace JSON. This is the default.

Standalone text files are optional. The workspace can reference files on disk when independent file identity becomes useful.

The workspace JSON may contain:

- Windows, panes, tabs, and items
- Embedded content
- File references
- Cursor and scroll positions
- Layout and active-tab state
- Workspace-specific settings and overrides
- Metadata and connections associated with workspace content

System-wide settings live separately.

The workspace is intended to be inspectable, portable, understandable, and versionable. The design does not require a hidden database to be the authoritative home of the writing.

### Layered model

```text
Workspace (JSON)
└── Windows
    └── Panes
        └── Tabs
            └── Open items
                ├── Embedded: content in workspace JSON
                ├── File: content on disk
                └── View: search, history, settings, etc.
```

| Layer | Meaning |
|---|---|
| Workspace | The working environment and its content |
| Window | An operating-system window |
| Pane | A split region containing tabs |
| Tab | A view of an item, with its own navigation state |
| Open item | Content or a tool view displayed in a tab |

A item can be open in multiple tabs. Tabs can move between panes and windows. A tab can be torn off into a new window and moved back, browser-style.

An embedded item can be promoted to a file or a separate workspace.

Writing does not require understanding the internal data model. The user works with panes, tabs, and content.

### Architectural principle

Content has a home by default. A separate file is an optional change of representation, not a prerequisite for existence.

Consequences:

- Creating content does not require a naming dialog.
- Autosave preserves new work without requiring a separate file.
- Panes and references can operate on content regardless of file identity.
- Promotion is an explicit decision to give content an independent representation.
- A workspace can travel as a self-contained unit, subject to any separately referenced files.

DVA is not a file editor that happens to have panes. It is a workspace where work can exist before it has a file identity and can remain that way indefinitely.

### Technology Stack

DVA's initial implementation direction is **Tauri 2 + React + TypeScript + Vite**, reusing the stack already in use for Git Visual. This avoids maintaining two separate desktop/frontend approaches while the user is learning and testing reusable interface patterns.

| Area | Decision | Status / boundary |
|---|---|---|
| Desktop runtime | Tauri 2 | Initial choice. Uses the operating system's webview rather than bundling its own browser runtime. |
| UI framework | React | Chosen for component-based panels and independently updated interface regions. Keep state boundaries deliberate to avoid unnecessary rerenders. |
| Language | TypeScript | Chosen for clearer interfaces between workspace data, panel state, and native commands. |
| Frontend tooling | Vite | Reuse the Git Visual stack. |
| Native layer | Rust commands through Tauri | Handle filesystem access, workspace persistence, and OS integration behind narrow, explicit interfaces. |
| Workspace representation | JSON-first | Workspace JSON remains the canonical home for working content and layout. A database is not required as the source of truth. |
| Source control | Git and GitHub | Used for development. Git integration inside DVA remains optional for end users. |
| Tests | Automated tests plus runtime/acceptance checks | AI must execute available tests and report actual evidence. A test plan or generated test code alone does not count as a test run. |

#### Why start with Tauri + React

- The Git Visual project already establishes this stack, so patterns, tooling, and lessons can be reused.
- Tauri's use of the system webview generally reduces packaged runtime size, while React provides reusable UI components.
- The writing workspace, panel system, and persistence layer can be separated so performance problems can be measured and addressed without replacing the whole application.
- The choice avoids assuming that Electron is necessary for a desktop writing workspace.

#### Trade-offs and validation

Tauri does not guarantee that the app's interface will be faster. Performance depends on rendering strategy, state management, file operations, and background work. The system webview also means browser behavior can differ between operating systems. On Windows, Tauri uses WebView2.

Before expanding the feature set, build a small vertical slice and test startup, typing latency, panel drag/resize, save/reopen correctness, and responsiveness with a representative larger workspace. If the stack fails a required check, stop and investigate before building more features. Reconsider the framework only with evidence that the problem cannot reasonably be addressed within the current architecture.

#### Security baseline

- Use Tauri's capability/permission model with least privilege.
- Keep file access in narrow Rust commands or approved plugins; validate paths and inputs at the native boundary.
- Do not expose arbitrary filesystem access to the frontend.
- Treat workspace JSON as untrusted input: validate its shape and handle invalid or older versions without destroying user data.
- Do not treat a technology choice or security checklist as evidence that implementation is already secure.

#### Decision status

Tauri 2 + React + TypeScript + Vite is the initial stack for the prototype. It is not an irreversible commitment. Any reconsideration must compare observed results against the same behavioral and performance checks. The development workflow remains separate from app architecture and is adopted at version 1.2.0.

## 7. Where Things Live

Content belongs in one of two conceptual places.

**In the text:** Position-anchored marks, comments, iterations, and other inline structures. They render at their anchors and travel with the text.

**In a pane:** Views projected from content and its metadata, such as an index, outline, tree, iteration view, search results, save history, or comparison.

Views may derive information from content, but they should not silently become competing sources of truth.

## 8. Open Items

A item is the content or view a tab points to.

### Embedded

- Stored inline in workspace JSON.
- Persistent without requiring a file.
- The default for new content.
- Can be promoted to a file or workspace.
- Can remain embedded permanently.

A user can create an entire project from embedded content without ever turning pieces into separate files.

### File

- Text stored on disk.
- Referenced by workspace JSON.
- Can be opened in multiple tabs.
- Can be versioned with Git if the user chooses to use Git.
- Can be created by promoting an embedded item.

### View

A tool view is not ordinary writing content. It displays or operates on other content.

Examples include search, settings, file exploration, save history, comparison, and version-control interfaces.

## 9. Windows, Panes, and Tabs

**Windows** are operating-system windows. They hold panes and can be torn off or restored. Their positions can be remembered.

**Panes** are split regions within a window. They hold tabs and can be split horizontally or vertically.

**Tabs** point to items. They maintain their own cursor, scroll position, and view settings. Tabs can be moved between panes, opened in separate windows, or closed independently.

### Intended behavior

- Drag a tab out of a window to create a new window.
- Drag a tab back to merge it into another window.
- Open the same item in multiple tabs.
- Restore the previous working arrangement when reopening a workspace.
- Keep source and destination files accessible side by side while the user works between them.
- Opening an item from the file finder should not unexpectedly replace the current item or destroy the working arrangement. Prefer opening alongside the current item, or let the user choose the destination pane.
- Remember the arrangement so the user can return to the same set of files and panes later.

The goal is to reduce tab juggling and repeated split-panel setup. The user should not need to reconstruct the workspace every time they move information between files.

Session restoration preserves panes, tabs, active tabs, cursor and scroll positions, and window positions where supported.

Exact split defaults and edge cases remain subject to refinement.

## 10. Panel Content and Navigation

A panel is a flexible view surface, not a fixed-size text box. Its content and navigation behavior should fit what it displays. **Any panel may contain long, scrollable content, paginated content, or other appropriate interaction models.** These capabilities are not restricted to PDF panels or to one special kind of panel.

Examples include:

- Long-form writing that scrolls vertically within the panel.
- Documents divided into pages, with page navigation and continuous scrolling where appropriate.
- Images that can be zoomed, panned, or inspected at different scales.
- Lists, indexes, trees, search results, and other views that can grow beyond the visible panel area.
- Content with its own navigation state, selection, annotations, or contextual controls.

### Panel behavior principles

- Each panel manages its own content navigation, including scroll position, current page, zoom, and selection where applicable.
- Content should not become inaccessible merely because it exceeds the panel's visible dimensions.
- Panels should not force the entire workspace to scroll when the intended behavior is for the content inside an individual panel to scroll.
- A panel may offer both continuous scrolling and page-by-page navigation when the content type supports both.
- Navigation state should be preserved when switching tabs or restoring the workspace, where meaningful and technically supported.
- Panels remain resizable and rearrangeable. Their content should adapt to available space without losing its underlying identity or relationships.
- Content-specific interactions should be provided where useful, rather than assuming every panel is only an editable text area.

This is a general workspace capability, not a requirement that every panel implement every interaction. The content type determines which behaviors make sense.

## 11. External Documents, Images, and PDF Annotations

DVA should allow users to drag supported external files, including PDFs and images, from the operating system into the workspace. Dropping a file should open or add it in a suitable panel while preserving the user's existing workspace and working context. The user should not have to close or replace an existing item just to inspect another file.

External files remain distinct from embedded workspace content. The workspace may reference the source file and store DVA-specific viewing state and annotation metadata without silently rewriting the original file. The exact import, linking, copying, and embedded-asset policies remain implementation decisions and must be made explicit in the interface.

### PDF viewing

- Display PDF pages within a resizable panel.
- Support page-by-page navigation and, where practical, continuous vertical scrolling.
- Preserve relevant per-tab viewing state, such as current page, scroll position, zoom, and selected annotation.
- Keep document navigation inside the PDF panel so that reading a long document does not unnecessarily move the entire workspace.
- Allow related notes or other panels to remain open beside the PDF.

### Annotations and contextual comments

Users should be able to select text or mark a region of a PDF and attach a comment to that annotation. The comment appears in a small contextual panel beside the relevant page, in a familiar webpage-style layout. It should be visually clear which annotation the comment refers to.

The annotation relationship is semantic, not positional: an annotation has a stable identity and a reference to its location in the source document, while the comment panel has its own layout position in the DVA workspace. Moving or resizing a comment panel must not change what the comment refers to.

Intended behavior:

- Selecting an annotation can reveal or focus its associated comment panel.
- Comments remain associated with the relevant page and annotation while the user scrolls, navigates between pages, or changes zoom.
- When practical, the relevant page location and its comment should be visible together; if not, DVA should provide a clear navigation or focus cue rather than implying the comment is still visibly beside an off-screen location.
- Comments may be edited, reopened, or dismissed without deleting the source document or annotation unintentionally.
- Users can keep multiple comments available and navigate between their annotations.
- The annotation and comment relationship should survive workspace save/reopen and layout changes.
- Moving, resizing, or rearranging panels must not break the annotation's document reference.
- DVA-specific annotations should not silently alter the original PDF. Whether annotations can also be exported or embedded into a copied PDF is a separate, explicit capability.

### Annotation location and persistence

Store enough information to reconnect an annotation to its source document and location. Possible anchors include selected text plus page identity and/or page-relative geometry. The implementation must account for zoom, scrolling, and PDF rendering changes; raw screen coordinates alone are not a reliable anchor. The exact anchor format, behavior when the source PDF changes, and support for scanned/image-only PDFs remain open implementation questions.

Comments and annotation metadata belong to DVA's workspace data unless a later explicit export or interoperability feature says otherwise. The source PDF remains the source document, and a comment's on-screen panel location is not the annotation's identity.

## 12. Panel-First Workspace and Modular Applications

DVA is **panel-first**, not tab-first. Panels are the primary units of workspace composition. Tabs remain available as a useful way to group, stack, or switch between panel contents, but the workspace should not assume that the user thinks of work primarily as a row of tabs. A panel may hold a document, a native DVA feature, an app surface, or a connected tool, and panels can be arranged together according to the task.

Zed is a useful reference for editor panes and project-aware tools; tmux is a reference for composable, persistent work surfaces. DVA takes the broader direction: a flexible workspace where different kinds of content and applications can coexist, with panels supporting more than text editors and terminal sessions.

### Run our apps inside DVA

A core goal is to run other applications we create inside DVA when practical, so our apps can become modular parts of a larger workflow rather than isolated full-window destinations. For example, a visual Git client, file browser, Soundthing, or future tools could be opened as panel surfaces alongside writing, documents, and each other.

The design should favor reusable capabilities and explicit app interfaces over assuming every tool must own the whole window. Where an app can separate its core functionality from its presentation, DVA should be able to host its UI or a suitable view inside a panel while preserving the app's own identity and data. A tool should also be able to run independently when that is useful.

### Integration modes

DVA should support a set of integration modes rather than treating every app as the same kind of embedded object:

1. **Native DVA panels:** functionality built directly into DVA, such as writing, file browsing, search, history, PDF viewing, and workspace controls.
2. **DVA modules and app surfaces:** purpose-built modules or our own apps that expose a supported interface for being hosted in a DVA panel.
3. **Embedded web apps:** web-based tools displayed in a panel where browser, authentication, embedding, and security constraints allow it.
4. **Connected tools:** apps or services accessed through an API, plugin, local protocol, or another explicit integration, even when their full UI is not embedded.
5. **External native applications:** desktop apps that run in their own OS window when direct embedding is unavailable or unsuitable.

The goal is broad capability and modularity, not an inaccurate promise that literally every application can be embedded inside DVA. The workspace should make the best supported integration mode feel coherent.

### Panel behavior for app surfaces

Where technically supported, an app surface should participate in DVA's common workspace behavior:

- Open in a panel and coexist with other panel contents.
- Be split, resized, moved, grouped, or switched through tabs as the user chooses.
- Preserve relevant state when the workspace is saved and restored.
- Support multiple instances where the app's data and runtime model permit them.
- Respect the same content-area principles as other panels, including scrolling, pagination, and content-specific navigation.
- Communicate with DVA and other modules through explicit, documented interfaces rather than relying on hidden coupling.
- Keep app state and data identity separate from the panel's current size, position, or tab grouping.

Not every app must support every operation. The integration contract should declare which capabilities it supports, such as multiple instances, persistence, file access, drag-and-drop, or cross-panel messaging.

### Modularity and boundaries

DVA should make it possible to add or replace modules without redesigning the entire workspace. A module should have a defined entry point, supported lifecycle, clear data ownership, and an explicit way to communicate with DVA. The exact module API, discovery mechanism, permissions, and packaging strategy remain open design questions.

Security is part of the architecture. Embedded websites and external tools must not automatically gain unrestricted access to DVA's files, workspace data, or native commands. Access should be explicit and scoped. Arbitrary native desktop windows cannot be assumed to behave like React components, and some websites cannot be embedded because of their own policies or authentication constraints.

This is a long-term architectural goal, not a requirement to ship universal app hosting in the first prototype. Start with the panel abstraction and a small number of controlled module types, then validate the interface with our own apps before expanding compatibility.

## 13. Marks

A mark is a position in text, not a container.

The mark is attached to its position. When text moves, the mark moves with it.

This may produce awkward results in some cases. Consistency is preferable to unpredictable behavior. The rule remains consistent and understandable, so the user can decide how to work with it.

### Default mark types

| Mark | Default meaning |
|---|---|
| `//` | Inline comment |
| `@` | Query that opens a panel |
| `#` | Tag or declaration that can feed an index |
| `/` | Command |
| `*` | Flexible, user-defined mark |
| `()` | Aside or softer comment |
| `[]` | Reference |
| `|` | Attribute or key-value structure |

These are sane defaults, not a mandatory universal vocabulary. Users can remap mark syntax and define additional mark types.

### Mark Index and navigation

Marks have their own **browsable index**, available as a workspace view or panel. It functions like an outline: users can inspect the marks collected from the relevant workspace scope and jump directly to the source location of a chosen mark.

- Selecting an index entry navigates to the source content and positions the relevant mark for inspection or editing.
- Index entries should identify the mark's type and provide enough context to distinguish nearby or similar marks.
- The index is a navigational view over existing marks, not a separate owner of the marked content. Editing, moving, or deleting source content follows the mark's underlying position and lifecycle rules.
- The index should respect DVA's global mark definitions while allowing useful grouping or filtering by mark type, source, or workspace scope where appropriate.
- The index itself should be available as a panel and participate in DVA's panel-first layout, so users can keep it beside the writing or other content they are navigating.
- If a source location is no longer available, the entry should make that state clear rather than jumping to an unrelated location.

The exact grouping, filtering, hierarchy, and whether the index is workspace-wide or scoped to a chosen document remain open UI decisions. The core requirement is that users can browse marks and jump to their locations without manually searching the text.

### Global mark definitions

Mark definitions and mark appearance settings are global.

A user does not have to define a different meaning for `#`, `[]`, or another mark in each pane. The same mark grammar applies throughout the application.

Mark meaning and theme selection are separate concerns. A theme can affect the surrounding visual environment, but changing a theme does not redefine mark behavior.

### Mark rendering: established behavior

Everyday editing uses **Full view** by default.

Full view displays the complete mark syntax. Mark delimiters remain visible alongside their contents. They are not removed, hidden, or replaced merely because the cursor moves away.

The visual emphasis of delimiters changes according to context:

- When the cursor is inside a mark, its delimiters become prominent.
- When a selection touches a mark, its delimiters become prominent.
- When a selection spans multiple marks, each touched mark receives the appropriate emphasis.
- When the user works with surrounding text, unrelated delimiters can become subdued.
- The underlying text and mark structure remain unchanged by these visual transitions.

For example, `[color]` continues to display both brackets and its contents. The brackets may be emphasized or subdued, but they do not disappear.

### Custom appearance

Users can customize how each mark type appears through settings.

Appearance options use the visual treatments supported by DVA, potentially including color, weight, italics, underline, background, and other styles.

Defaults are sensible and editable. Users should not need to accept the author's preferred appearance as a permanent constraint.

The exact settings interface and complete list of supported treatments remain implementation questions.

### Commands

Commands use `/`.

They execute an action and may disappear or leave a trace in history, depending on the command's behavior.

Example:

`/[setting: add more]`

This is a proposed syntax example, not a finalized grammar. The exact rules for combining command and reference syntax remain open.

### References

References use `[]` by default.

They persist inline and can act as links to items. They may support collapsed presentations while retaining the underlying syntax in Full view.

Clicking a reference can navigate to its item.

Deleting a mark must not automatically delete content it previously referenced or appended. A reference is not an owner.

### View modes

Three transparency levels are retained:

- **Clean:** Prose-focused rendering with marks hidden from the reading presentation.
- **Markers:** Margin indicators for working with marks.
- **Full:** Complete mark syntax remains visible and can be inspected or edited.

These are alternative presentations of the same underlying content. Different tabs may use different view modes simultaneously.

Full is the everyday default. Clean and Markers remain optional views, not requirements for editing.

Text can also use either a scrollable, webpage-style presentation or a fixed, pane-sized presentation. Ordinary writing views avoid horizontal scrolling.

## 14. Aggregation

Aggregation is appending content to an item, not a separate kind of view.

For example, typing `[setting: add world stuff]` can append the associated content to the bottom of the `setting` item.

The mark remains at its original position as a pointer to the destination.

- The source text shows the reference.
- Following the reference navigates to the destination.
- The destination contains the appended content.
- Deleting the reference does not automatically delete the appended content.

The item is the aggregation. The mark is the reference.

The exact syntax, duplicate handling, and undo behavior require prototype testing.

## 15. Iteration

An iteration creates another possibility without destroying the current one.

The intended interaction is:

1. The user invokes an iteration at a position.
2. An adjacent tab opens for the alternate version.
3. Both versions remain available for comparison.
4. The iteration can be revisited or cycled through without requiring elaborate setup.

Iteration is designed to feel inexpensive, closer to a keystroke than a project-management operation.

Export options may include inline iterations, separate versions, or both. Exact defaults remain open.

## 16. Branches, Possibility Space, and Status

A user can branch from any point without committing the main line to that alternative.

Not every branch belongs in the current story. It should not need to be discarded simply because it is not currently used.

DVA preserves possibility space, not just finished work.

Provisional statuses include:

- Canon
- Provisional
- Archived

Branch structure should be expressed by the relationship between pieces of work, rather than requiring a status for every branch.

An unused branch is not wasted work.

## 17. Naming

Naming is earned, not required.

Internal identifiers let DVA locate each item reliably. Human-readable names are optional annotations.

- IDs are required internally.
- Names may remain blank.
- A blank name must not be replaced with a timestamp pretending to be a name.
- Content remains findable through its contents and relationships.
- Users can name an item when a name becomes useful.

The first experience does not force a naming system onto new content.

## 18. Promotion

Promotion is not saving. The content already exists in the workspace and is autosaved there.

Three operations remain distinct:

| Operation | Purpose | Effect on original |
|---|---|---|
| Autosave | Preserve the working environment | Unchanged |
| Promote to file | Give an item its own file identity | Open item becomes file-backed |
| Export | Produce a separate `.txt` or `.md` file | Unchanged |

**Autosave preserves. Promotion transforms. Export duplicates.**

### Promotion to file

- Write the content to a file.
- Replace the embedded content representation with a file reference.
- Update tabs pointing to that item.
- Preserve the item's identity and working relationships where possible.

The intended user experience is simply: “I want this to be its own file now.”

### Promotion to workspace

A item can become a separate workspace file with the minimum structure needed to contain it.

This is a change of representation, not duplication. The original workspace no longer contains the promoted item as its own embedded content.

Exact creation and failure-handling behavior remains an implementation concern.

## 19. Context Layers

Long work accumulates structure over time. Provisional layers include:

- Text
- Characters
- World
- Relationships
- Events
- State
- Knowledge
- Threads
- Provenance

These layers emerge from marks and connections. DVA does not require users to declare all categories before writing.

One particularly useful distinction is knowledge versus truth: characters do not automatically know what the author knows.

## 20. Navigation, Not Memory

Local context is easy to summarize. Global narrative context may live many scenes earlier.

The workspace preserves progression, not merely current facts.

For example:

`Alice trusts Daniel → Daniel lies → Alice becomes suspicious → Alice discovers the lie → Alice distrusts Daniel`

The current state is a view over a progression. Earlier states and causal connections remain available.

Save history extends this principle to the workspace itself: not only the development of the writing, but earlier arrangements of the writing environment can be revisited.

## 21. The Writer's Workflow

The intended flow is:

`write → mark → connect → branch → iterate → compare → explore`

Every step is designed as a natural extension of writing. Structure is a byproduct, not a prerequisite.

## 22. Day One

The app opens to one empty pane and a faint contextual control layer.

No required template, category picker, or onboarding process interrupts the first act of writing.

The tool makes possible actions visible without making them mandatory.

## 23. The Control Layer

A contextual action list appears at the bottom of the workspace.

It reflects what is possible given the focused pane, cursor, selection, and open panes.

It changes as the user works and helps teach the application's grammar.

The control layer:

- Contains actions, not writing content.
- Is present by default at low opacity.
- Has user-controllable opacity, including fully hidden.
- Shows the actions most likely to be relevant rather than every available command.

Commands, marks, right-click menus, keyboard actions, and the control layer are alternate routes to the same underlying operations.

## 24. Search, Files, History, Git, and Settings

These are plain-named views that may overlap in purpose.

**Search:** Find files, marks, positions, content, tags, save states, and actions. Search is designed to support combinations of content and tags, such as finding content matching `card` and `game`, or combining tag filters like `tag:card` and `tag:game`. Exact query syntax remains open.

**Files:** An in-app folder explorer. Multiple folder panes may remain open. Drag-and-drop supports movement between panes. The file browser itself is an ordinary panel, not a special navigation layer that hides the real file structure. Users should be able to open files and supported metadata/configuration files as panels, and edit them in place when appropriate.

**Inspectable Workspace and App Data:** The workspace structure should be visible from within DVA. Users can open the workspace JSON, app/module configuration JSON, indexes, and relevant metadata as panels alongside the content they describe. Where a file or data object is editable, users should be able to edit it directly and see the effects reflected in the workspace, subject to validation and clear error handling. A readable property editor and a raw JSON/text view may both be offered over the same underlying data; they must not become competing sources of truth.

**Drag-to-Append:** Select text in an open document and drag that selection onto a file in the file finder. Dropping onto a file appends the selected text to the end of the destination by default. The destination does not need to be opened first, and the source document remains available. This supports sorting rough notes into established files without tab juggling or manual copy-and-paste.

The operation should be undoable and make it clear whether the text is being moved or copied. Avoid forcing a destination-location dialog: appending is the simple default, and the user can reorganize the destination later. The exact move/copy gesture remains to be finalized.

**Mark Index Pane:** A dedicated pane gathers marks from the current workspace into a navigable index. It helps users find and browse marked content without searching every document manually. Selecting an index entry takes the user to its mark in the source text. The index is a view derived from marks, not a separate source of truth. Mark types such as `#` declarations can contribute entries; grouping, filters, and exact presentation remain open design details.

**Save History:** Browse earlier workspace snapshots, inspect their contents and metadata, compare versions, and restore a previous state deliberately.

**Git:** An optional version-control interface for users who want commits, branches, diffs, remotes, and related operations.

**Settings:** Preferences, themes, mark definitions, mark appearance, and other configurable behavior.

Everyday history must not require the user to understand Git.

## 25. Settings and Themes

Settings and themes are related but distinct.

### Settings scope

- System-wide settings: defaults and preferences across DVA, stored separately.
- Workspace settings: preferences specific to a workspace, stored in its JSON.
- Panel or tab settings: preferences specific to a panel or tab, stored with its definition where appropriate.

### Theme scope

Themes can be selected or overridden at three levels:

`System-wide theme → Workspace theme → Panel theme`

A panel inherits from its workspace, which inherits from the system-wide default unless an override is selected.

Theme availability and theme selection are separate. System-wide settings define which themes are available, while workspace and panel settings determine which theme is active.

### Global mark settings

Mark definitions and mark appearance are global. They are not redefined independently by each pane.

Themes do not silently overwrite explicit mark-style preferences. The precise precedence rules between theme defaults and explicit style settings should be defined before implementation.

Non-theme settings inheritance remains an open question. The default assumption is that mark definitions and appearance remain global regardless of that future decision.

## 26. Save History and Version Control

### Purpose

Save history preserves the development of a workspace and makes earlier states easy to find and use.

The user should be able to:

- Inspect previous workspace states.
- Revisit an earlier version.
- Compare current and past work.
- Open an earlier state in another pane.
- Continue developing from an earlier state.
- Restore a previous state intentionally.
- Attach their own context to saved states.

The design requirement is the user experience, not a specific storage mechanism.

### Automatic snapshots

DVA creates history snapshots automatically. Normal writing does not require the user to remember to save a named version.

Autosave and save history are related but distinct:

- **Autosave** preserves the latest working state and supports recovery.
- **Save history** preserves earlier states so the user can revisit, compare, and restore them.

A rapidly changing working state must not make all earlier states indistinguishable or inaccessible.

Snapshot frequency, deduplication, retention, and storage costs require implementation testing.

### Optional names, flags, and tags

A user may annotate a snapshot with:

- **Name:** A human-readable label, such as `Before rewriting the ending`.
- **Flags:** Lightweight markers for states worth revisiting or distinguishing.
- **Tags:** User-defined metadata for searching, filtering, and organizing history.

These annotations are optional. Automatic snapshots remain useful even when unnamed and untagged.

Save states have their own metadata. This is another layer of the same general DVA principle: the application uses structure to make work navigable without requiring users to organize everything in advance.

**A snapshot records what the workspace was. Its metadata records what that snapshot means to the user.**

Changing a snapshot's name, flags, or tags must not silently change the content recorded in the snapshot.

The exact flag model and tagging interface remain open.

### Browsing and comparison

The user sees a plain-named Save History view containing browsable snapshots.

Selecting a snapshot allows inspection or preview without replacing the current workspace.

The user can open a past state in another pane and compare it with current work. This should feel like opening another view, not checking out an old commit.

The interface clearly distinguishes the current state from the state being inspected.

### Restore

Restoring a snapshot is a deliberate operation.

Before restoration, DVA preserves the current state so that the user does not accidentally destroy the work they were doing.

Inspection and comparison must not implicitly restore or replace the current workspace.

Exact confirmation and recovery behavior should be established through usability testing.

### Git is optional

Git is an additional version-control capability, not a requirement for ordinary workspace history.

DVA's everyday history interface does not force users to think in terms of commits, branches, staging, or working trees.

For users who choose to use Git, an advanced interface may expose those concepts directly.

Workspace history and versioning of standalone files are separate concerns. A file can use Git when it lives in a repository, while workspace history should remain useful without Git.

The design does not yet choose whether history snapshots are stored as separate JSON files, in a companion folder, through Git, or through a combination of mechanisms.

### Branching from history

Opening an old state for inspection does not change the current state.

Developing from an earlier state should create a distinguishable continuation or alternative rather than silently overwriting the current version. The exact data model and interaction for this remain open.

This preserves DVA's broader principle: alternate possibilities should remain available without forcing the user to choose a single canonical path too early.

### Workspace location

The workspace lives at a user-chosen location, with a convenient default. Choosing where the workspace is stored should not force the user to choose how history works.

### Recovery

Automatic crash recovery is a separate responsibility from browsing history. It preserves recent work even if the user has not created a named save.

The relationship between recovery checkpoints and user-visible snapshots must be designed so that recovery remains reliable without flooding the history interface with confusing entries.

## 27. Autosave

Autosave preserves the current working state without requiring explicit user action.

Intended save triggers include:

- A short periodic timer, initially proposed at five seconds.
- Loss of focus or window blur.
- Explicit save.
- Workspace close or application quit.

The implementation must handle unsaved changes and write failures safely.

Expected destinations:

- Embedded content → workspace JSON.
- File-backed content → its file on disk.
- Layout, cursor, and scroll state → workspace JSON.
- System-wide settings → settings file.
- Workspace-specific settings → workspace JSON.
- Historical snapshots and their annotations → the selected history-storage mechanism.

The five-second interval is a starting value, not a verified guarantee. Crash-loss bounds must be tested in the actual implementation.

## 28. Export

Export is non-destructive duplication into a new file.

It does not replace the original item or change its identity.

### Export formats

**Clean:** Marks are stripped to produce prose-focused output.

**Full:** Marks remain inline as literal text, readable and searchable.

**Structured:** Content can be exported with companion data for comments, iterations, or metadata.

Iteration output may be inline, separated, omitted from the main text, or presented in both forms.

The user chooses the output. Defaults can evolve from observed use.

An exported file behaves like any other file. It can be opened, edited, referenced, versioned, and exported again.

## 29. Cross-Workspace Opening

Users can open content from another workspace without abandoning the current one.

The intended flow is to find an item, open it in the current workspace, then reference, compare, or develop it there.

Exact handling of external file references and workspace ownership remains an implementation question.

## 30. Related Context

Links and tags are distinct but related.

Links point to other items. Tags label or group material. Metadata records these connections and properties.

Connections may exist at inline, item, or workspace scope. Their visibility is independently configurable.

Users can create links and tags through inline marks, selection actions, or context menus.

Selecting or clicking a line can temporarily surface related panels. The user can pin those panels, add them permanently, or enable a mode that keeps them open.

A Related Context view brings together material that works together without necessarily belonging to the same document or category.

For example, two stories may share a universe; a lore entry explains technology in one story; a character's discovery in another changes how that technology is understood. These connections remain outside the prose unless the user chooses to show them.

## 31. Workspace JSON Schema

The following is a conceptual shape, not a finalized or validated schema.

```json
{
  "version": "0.2.0",
  "workspace": {
    "id": "ws-example",
    "name": "",
    "created": "2026-10-20T12:00:00Z",
    "modified": "2026-10-20T12:05:00Z"
  },
  "windows": [
    {
      "id": "win-1",
      "panes": ["pane-1"],
      "activePane": "pane-1",
      "layout": "single"
    }
  ],
  "panes": [
    {
      "id": "pane-1",
      "tabs": ["tab-1"],
      "activeTab": "tab-1"
    }
  ],
  "tabs": [
    {
      "id": "tab-1",
      "item": {
        "kind": "embeddedContent",
        "id": "embedded-main"
      },
      "view": "full",
      "scroll": "vertical",
      "cursor": {
        "line": 1,
        "col": 1
      },
      "scrollTop": 0,
      "themeOverride": null
    }
  ],
  "files": [],
  "embeddedContent": [
    {
      "id": "embedded-main",
      "name": "",
      "content": "Begin writing here.",
      "created": "2026-10-20T12:00:00Z",
      "modified": "2026-10-20T12:05:00Z",
      "tags": [],
      "links": []
    }
  ],
  "settings": {
    "theme": null,
    "themeOverrides": null,
    "workspaceOverrides": null
  }
}
```

### Inspectability and direct editing

The workspace JSON is not an inaccessible implementation detail. It is part of the inspectable workspace model and may be opened as a panel beside the workspace it describes. The same principle applies to app/module JSON, supported configuration files, indexes, and metadata that users are permitted to edit.

- Provide a direct route from a panel or file entry to the underlying file or data representation.
- Make it clear which file or data object is being viewed or edited, and whether changes are saved.
- Validate structured edits before applying them; malformed JSON or invalid references should produce actionable feedback rather than silently corrupting the workspace.
- Changes made through a friendly UI and changes made through the raw representation must resolve to the same underlying data. Avoid separate shadow copies that drift apart.
- Keep a safe recovery path for invalid edits, such as retaining the last valid workspace state or offering an explicit revert.
- Do not expose secrets, credentials, or privileged runtime internals simply because a JSON/configuration panel exists. Inspectability applies to user-owned workspace data and explicitly permitted configuration.

The goal is one visible layer of abstraction: users can work through a purpose-built view when that is convenient, but can inspect the real files, metadata, and configuration without having to discover hidden storage layers or leave the workspace.

### Schema notes

- `embeddedContent[]` contains inline content.
- `files[]` contains references to external files.
- `tabs[].item` identifies an embedded, file, or view.
- `tabs[].themeOverride` can select a tab-specific theme.
- Names may remain blank.
- System-wide settings live separately.
- Mark definitions and mark appearance are global settings, not pane-specific mark dialects.
- Workspace history does not need to be embedded as a `history[]` array. It may live in a separate storage structure.
- Snapshot annotations must be associated reliably with the snapshots they describe, regardless of the storage mechanism.

The schema will need versioning, validation, and migration rules as the app evolves. Flexibility does not remove the need for a consistent structure.

## 32. Three Formats

| Format | Purpose |
|---|---|
| Workspace JSON | Continuing the work and preserving the working environment |
| Exported manuscript | Reading or sharing the work |
| Save history | Inspecting, comparing, and managing earlier working states |

These formats serve different needs without competing to become the single representation of everything.

## 33. Current Design Goals

The intended design supports:

- Multiple splits, tabs, panes, and windows.
- A multi-purpose workspace that can host supported app views and connected tools alongside writing and documents.
- Distinct integration modes for native DVA panels, embedded web content, integrated tools, and external native applications.
- App surfaces that participate in tabbing, splitting, resizing, and restoration where technically supported.
- Persistent side-by-side access to source and destination files.
- Dragging selected text onto a file to append it to the destination.
- A dedicated, navigable Mark Index Pane.
- The same item open in multiple tabs.
- Browser-style tab tear-off and reintegration.
- Content that exists without file identity.
- Generic saving without forced naming.
- A writing-first workspace model.
- Inline marks that create structure.
- Aggregation through references and appending.
- Commands distinct from persistent references.
- Autosave and recovery.
- Browsable save history independent of Git.
- Optional snapshot names, flags, and tags.
- Opening and comparing older snapshots without replacing current work.
- Deliberate restoration with current-state preservation.
- Optional Git integration.
- Non-destructive export.
- Links and tags at multiple scopes.
- Related Context views.
- Globally consistent mark definitions and appearance.
- Customizable mark rendering with persistent visible delimiters in Full view.

These are design goals, not a claim that each has been implemented or verified.

## 34. Open Questions for Future Refinement

### Marks and writing

- Exact mark syntax and triggering rules.
- Exact behavior of combined command and reference syntax.
- Undo behavior for commands, references, and appended content.
- How mark styles are configured and previewed.
- Which visual treatments are supported.
- How Clean and Markers views interact with the Full-view editing behavior.

### Layout and navigation

- Whether a new split initially duplicates the current tab or opens a new item.
- Exact split behavior and tab movement.
- Default behavior when opening an item from the file finder while another item is active.
- The simplest clear move-versus-copy behavior for drag-to-append, including undo.
- Mark Index Pane grouping, filters, sorting, and navigation behavior.
- How cross-workspace content is opened and referenced.
- Folder explorer operations.
- Search result presentation and filtering.
- How transient related panels appear and disappear.

### Save history

- Snapshot storage mechanism.
- Snapshot frequency, deduplication, and retention.
- How named saves, flags, and tags appear in the interface.
- Whether flags have predefined meanings or are entirely user-defined.
- How snapshot annotations are stored and migrated.
- How an older snapshot becomes a new continuation.
- How to distinguish automatic recovery points from browsable history.
- How large workspaces and external files are represented in snapshots.
- How the interface communicates current state versus historical inspection.

### Settings and themes

- Exact precedence between theme defaults and explicit global mark styles.
- Which non-theme settings, if any, should inherit across scopes.
- Theme file format and discovery behavior.
- Exact settings editor and JSON editing experience.

These questions remain open intentionally. Decisions follow discussion, prototypes, and evidence rather than speculation.

## 35. Design Vocabulary

| Term | Meaning |
|---|---|
| Workspace | The container for working state and content, represented by JSON |
| Window | Operating-system window containing panes |
| Pane | Split region containing tabs |
| Tab | View of an item with its own navigation state |
| Open item | Content or view opened in a tab |
| Embedded content | Writing stored directly inside workspace JSON by default |
| File | Text stored separately on disk |
| View | A presentation or tool operating on content |
| Mark | A position-anchored structure in text |
| Command | A mark that triggers an action |
| Reference | A persistent mark pointing to an item |
| Aggregation | Appending content to an item |
| Promotion | Moving embedded content into its own file or workspace |
| Export | Non-destructive duplication into a new file |
| Controls | Contextual action layer |
| Save history | Automatic, browsable snapshots of workspace states |
| Snapshot | A preserved historical workspace state |
| Snapshot metadata | Optional name, flags, and tags associated with a snapshot |
| Restore | Deliberately replacing the current working state with an earlier snapshot after preserving the current state |
| Git | Optional version-control integration |
| Settings | Preferences scoped to system, workspace, or panel as appropriate |
| Theme | Visual treatment inherited from system to workspace to panel |
| Link | A connection to another piece of content or tool view |
| Tag | A label or grouping |
| Related Context | A view over connected material across documents |
| App surface | A supported app or tool view displayed in or associated with a workspace panel |
| Integrated tool | An external service or app that communicates with DVA through an explicit integration |

## 36. Inline Queries (`@`)

`@` is the default mark for an inline query. It provides a way to consult an external model from inside the text.

Intended behavior:

1. Type `@` followed by a question or prompt.
2. A panel opens beside the text.
3. The response appears in its own panel.
4. The user may copy, reference, develop, ignore, or delete the response.

The response is a suggestion, not canon. Nothing writes into canonical content automatically.

The query and response are stored as workspace content and autosaved like other embedded material.

The model provider and configuration are implementation details. If no model is configured, the query mark can still open an empty panel for manual use.

External responses must remain visible, attributable, and rejectable.

## 37. The Thesis, Restated

Structure is a byproduct of writing, not a prerequisite.

New writing lives inside the workspace by default. A separate file is optional.

The center is the continuity of the creative process. The user starts writing, notices something, branches it, connects it, compares it, or develops it elsewhere. DVA supports those actions without requiring the user to stop and decide how everything must be filed, named, or classified.

History is part of that continuity. Earlier work remains available to inspect and develop. Names, flags, and tags help the user find meaningful states without requiring manual save management.

Git may provide additional power, but ordinary writing history does not depend on understanding version-control machinery.

The app is the app is the app: content, structure, navigation, and history use consistent concepts wherever possible.

DVA doesn't need to persuade writers to adopt a new philosophy of file management. It needs to make writing easier.

**Everything else is implementation.**

---

## 38. AI Testing, Evidence, and Stop Gates

Testing is required development work, not an optional final review. AI must run the available tests for each implementation candidate and record what actually happened.

### Required stop gates

1. **Before implementation:** identify the last accepted baseline, define observable acceptance checks, and confirm the change is scoped.
2. **After implementation:** inspect the diff and run available formatting, type-checking, linting, and unit/integration tests.
3. **Runtime gate:** run the app where the environment permits and test the relevant user flows, including persistence and recovery where applicable.
4. **Acceptance gate:** compare results against each required acceptance check. Any failure, skipped required check, or unverified critical behavior blocks acceptance.
5. **After repair:** rerun the failed check and the relevant regression suite. Do not treat a code edit as proof of a fix.
6. **Before recording acceptance:** verify the diff, record exact commands and outcomes, and update the latest test record and maintenance document only with supported results.

### AI test execution rules

- Run tests rather than merely suggesting tests or writing a test plan.
- Record exact commands, environment, commit or candidate identity, pass/fail status, and relevant output.
- Separate automated results from manual/runtime checks.
- Clearly label tests that could not be run and why. Never describe an unrun or skipped test as passed.
- If a required check fails, stop feature expansion, report the failure, and repair or ask for a decision if the cause is ambiguous.
- Preserve the last accepted version and keep candidate changes recoverable.
- A passing test suite does not prove untested behavior; list coverage gaps and remaining risks.

### Test record

Maintain one current DVA test record describing the most recent test run: [DVA Test Record](DVA-Test-Record.md). Update it after actual test execution. It must state explicitly when no tests have yet been run. The record is evidence of a run, not a substitute for executable tests.

These gates apply to the initial vertical slice and later changes. They are intended to prevent the project from accumulating features on top of an unverified foundation.

End of document.
