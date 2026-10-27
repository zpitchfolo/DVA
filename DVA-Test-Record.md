# DVA Test Record

**Document version:** 0.2.0  
**Current status:** Candidate implementation committed; automated tests and build for this candidate have not yet been executed.  
**Accepted application baseline:** The earlier frontend-only run belongs to the old `zpitchfolo/DVAexe` repository and does not establish acceptance of the current `zpitchfolo/DVA` source.

## Current candidate

| Field | Result |
|---|---|
| Repository | [zpitchfolo/DVA](https://github.com/zpitchfolo/DVA) |
| Candidate implementation commit | `f7578d65893ba92430261dee11f623934f7b90ac` |
| Changes included | Local-storage autosave/restore, explicit Save, Ctrl/Cmd+S, Ctrl/Cmd+N, Ctrl/Cmd+P panel search, regression tests |
| Automated tests | **NOT RUN** in this environment |
| Type check and production build | **NOT RUN** in this environment |
| CI | Workflow added for dependency installation, tests, and production build; run result not yet observed |
| Desktop launch | User reports the current app launches and panel splitting works; this is user-reported evidence, not an independent runtime check of this candidate |
| Save/restart acceptance | **NOT RUN** for this candidate |
| Overall result | **CANDIDATE ONLY. NOT YET ACCEPTED.** |

## Test coverage added

- Initial editable panel renders.
- Creating a panel preserves the first panel.
- Closing one panel preserves another panel.
- Empty state allows creating a panel again.
- Editing and creating panels persists and restores after remount.
- Ctrl/Cmd+N creates a panel.
- Ctrl/Cmd+P opens search and selecting a result focuses the matching panel.
- Ctrl/Cmd+S writes the current workspace snapshot and reports local-save status.

## Required next verification

1. Run `npm ci` in `app/`.
2. Run `npm test`.
3. Run `npm run build`.
4. Launch the desktop app with `npm run tauri dev`.
5. Enter text, create multiple panels, close and reopen the app, and confirm all remaining panel content returns.
6. Exercise Ctrl+N, Ctrl+P, Ctrl+S, and the Save button in the desktop runtime.
7. Inspect the Git diff and update this record with exact outcomes only after the commands and checks actually run.

## Known gaps and stop conditions

- The current persistence implementation uses WebView local storage. It is an immediate prototype save layer, not yet the intended user-inspectable workspace JSON file or native filesystem save flow.
- User-chosen workspace paths, import/export, schema migrations, history snapshots, and recovery are not implemented by this change.
- Browser/WebView storage can fail or be cleared. The UI reports a local save failure, but stronger recovery and storage-integrity behavior remains future work.
- A successful frontend test run alone does not prove that persistence survives a real desktop app restart. That must be checked separately.
- Do not mark this candidate accepted until the automated checks pass and the desktop persistence flow is verified.

## Evidence rules

- Update this record after each actual run; Git history retains previous records.
- Record date/time, OS, Node/npm/Rust/Tauri versions, commit SHA, exact commands, exit status, and concise output.
- Separate automated tests, desktop runtime checks, and manual acceptance checks.
- Mark unavailable checks as **NOT RUN** and explain why. Source review or generated tests are not a test result.
- Any failed required test blocks acceptance until repaired and rerun.
