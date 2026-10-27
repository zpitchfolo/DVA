# DVA Test Record

**Document version:** 0.6.0  
**Current status:** New candidate adds native versioned workspace JSON, guarded localStorage migration, recovery UI, regression tests, and a Rust schema-validation test suite. Frontend runs #24 and #25 passed for the relevant source commits; native Rust CI was added in run #26 and is pending at the time this record is written. Desktop runtime and real close/reopen persistence remain unverified. Do not mark application acceptance complete until the native job and desktop runtime gate are checked.  
**Accepted application baseline:** The earlier frontend-only run belongs to the old `zpitchfolo/DVAexe` repository and does not establish acceptance of the current `zpitchfolo/DVA` source.

## Current candidate

| New persistence slice | Current source status |
|---|---|
| Native JSON | Rust commands load and save `workspace.json` under Tauri's app-data directory |
| JSON shape | `schemaVersion: 1`, `panels[]` with `id/title/content`, and `activePanelId`; see design doc v0.8.0 |
| Migration | Only when JSON is missing; validates localStorage data, writes and verifies JSON, retains original localStorage |
| Recovery | Malformed/invalid saved data pauses initialization and autosave instead of silently replacing it |
| Write strategy | Temporary file + flush/readback validation + prior-file `.bak` copy before replacement |
| Native schema tests | Added Rust unit tests; see the new native CI job |
| Desktop acceptance | **NOT RUN** in this environment | 

## Current candidate

| Field | Result |
|---|---|
| Repository | [zpitchfolo/DVA](https://github.com/zpitchfolo/DVA) |
| Tested source commit | `18840cc589d560c2e03edf30e44d82db0833b95c` (includes the Ctrl+F shortcut and Vitest 4.1.12 dependency update) |
| Changes included | Local-storage autosave/restore, explicit Save, Ctrl/Cmd+S, Ctrl/Cmd+N, Ctrl/Cmd+F panel search, regression tests |
| Automated tests | **PASS**: 1 test file, 8 tests passed in GitHub Actions |
| Type check and production build | **PASS**: `npm run build` completed (`tsc --noEmit && vite build`) |
| CI | **PASS**: [GitHub Actions run #5](https://github.com/zpitchfolo/DVA/actions/runs/40443935029), Ubuntu 24.04, Node 22.23.3, npm 10.9.9; `npm ci`, `npm test`, and `npm run build` all succeeded |
| Desktop launch | User reports the current app launches and panel splitting works; this is user-reported evidence, not an independent runtime check of this candidate |
| Save/restart acceptance | User reports content survives close/reopen; not independently verified in this environment |
| Dependency audit warning | `npm ci` reported 2 moderate-severity vulnerabilities; no audit remediation was attempted in this run |\n| Overall result | **FRONTEND CI PASS. APP ACCEPTANCE STILL PENDING.** |

## Latest verified source checks

- Frontend run #24: [tests for guarded recovery](https://github.com/zpitchfolo/DVA/actions/runs/40446583175), passed on commit `053aba3042e80161ef72e63a67899e536d670f30`.
- Frontend run #25: [design schema documentation](https://github.com/zpitchfolo/DVA/actions/runs/40446600224), passed on commit `2cf62f5de4d3fcc76a956e3a99ca5fe5fb1a1cee`.
- Native Rust CI was added in [run #26](https://github.com/zpitchfolo/DVA/actions/runs/40446618518) for commit `eef50ffcd7eb09e4d94fbfa3cb0969083bdb4e77`; its final status must be checked before acceptance.

## Earlier dependency baseline

- Workflow: [DVA frontend checks, run #18](https://github.com/zpitchfolo/DVA/actions/runs/40445179309)
- Tested commit: `18840cc589d560c2e03edf30e44d82db0833b95c`
- Environment: Ubuntu 24.04.5 LTS; Node.js 22.23.3; npm 10.9.9; Vitest 4.1.12.
- `npm ci`: PASS.
- `npm audit`: PASS; 0 vulnerabilities reported.
- `npm test`: PASS; 1 test file, 8 tests passed.
- `npm run build`: PASS; TypeScript check and Vite production build succeeded.
- This was a hosted frontend CI run, not a local run in the user’s Windows environment. It did not launch the Tauri desktop app or test native filesystem persistence.

## Current test coverage

- Initial editable panel renders.
- Creating a panel preserves the first panel.
- Closing one panel preserves another panel.
- Empty state allows creating a panel again.
- Editing and creating panels persists and restores after remount.
- Ctrl/Cmd+N creates a panel.
- Ctrl/Cmd+F opens search and selecting a result focuses the matching panel.
- Ctrl/Cmd+S writes the current workspace snapshot and reports save status.
- Malformed localStorage is preserved and triggers recovery UI without autosaving over the source.
- Structurally invalid localStorage is preserved and does not become a starter workspace.
- Rust schema round-trip, unsupported schema version, duplicate panel ID, invalid active-panel ID, and empty-workspace validation tests are included in the new native CI job.

## Required next verification

1. Run `npm ci` in `app/`.
2. Run `npm test`.
3. Run `npm run build`.
4. Launch the desktop app with `npm run tauri dev`.
5. Enter text, create multiple panels, close and reopen the app, and confirm all remaining panel content returns.
6. Exercise Ctrl+N, Ctrl+F search, Ctrl+S, and the Save button in the desktop runtime. The shortcut is Ctrl+F in the current implementation.
7. Inspect the Git diff and update this record with exact outcomes only after the commands and checks actually run.

## Known gaps and stop conditions

- Native JSON persistence and guarded localStorage migration are now implemented in source, but must not be described as accepted until native CI and desktop runtime verification pass.
- User-chosen workspace paths, import/export, schema migrations beyond version 1, history snapshots, and a dedicated recovery/restore UI for malformed native JSON remain unimplemented.
- Browser/WebView storage can fail or be cleared. The source now pauses autosave when stored data cannot be validated, but native write-failure and backup-restore behavior still require execution evidence.
- A successful frontend test run alone does not prove that persistence survives a real desktop app restart. That must be checked separately.
- Do not mark this candidate accepted until the automated checks pass and the desktop persistence flow is verified.

## Evidence rules

- Update this record after each actual run; Git history retains previous records.
- Record date/time, OS, Node/npm/Rust/Tauri versions, commit SHA, exact commands, exit status, and concise output.
- Separate automated tests, desktop runtime checks, and manual acceptance checks.
- Mark unavailable checks as **NOT RUN** and explain why. Source review or generated tests are not a test result.
- Any failed required test blocks acceptance until repaired and rerun.
