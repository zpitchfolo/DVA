# DVA Test Record

**Document version:** 0.4.0  
**Current status:** Frontend automated tests and production build passed in GitHub Actions for commit `87db1615d06f85139519b04ecf71425b458102e0`. Desktop runtime, real close/reopen persistence, and native JSON persistence remain unverified by CI. User reports that content survives closing and reopening.  
**Accepted application baseline:** The earlier frontend-only run belongs to the old `zpitchfolo/DVAexe` repository and does not establish acceptance of the current `zpitchfolo/DVA` source.

## Current candidate

| Field | Result |
|---|---|
| Repository | [zpitchfolo/DVA](https://github.com/zpitchfolo/DVA) |
| Tested source commit | `87db1615d06f85139519b04ecf71425b458102e0` (docs-only commits after the implementation candidate; app source unchanged) |
| Changes included | Local-storage autosave/restore, explicit Save, Ctrl/Cmd+S, Ctrl/Cmd+N, Ctrl/Cmd+P panel search, regression tests |
| Automated tests | **PASS**: 1 test file, 8 tests passed in GitHub Actions |
| Type check and production build | **PASS**: `npm run build` completed (`tsc --noEmit && vite build`) |
| CI | **PASS**: [GitHub Actions run #5](https://github.com/zpitchfolo/DVA/actions/runs/40443935029), Ubuntu 24.04, Node 22.23.3, npm 10.9.9; `npm ci`, `npm test`, and `npm run build` all succeeded |
| Desktop launch | User reports the current app launches and panel splitting works; this is user-reported evidence, not an independent runtime check of this candidate |
| Save/restart acceptance | User reports content survives close/reopen; not independently verified in this environment |
| Dependency audit warning | `npm ci` reported 2 moderate-severity vulnerabilities; no audit remediation was attempted in this run |\n| Overall result | **FRONTEND CI PASS. APP ACCEPTANCE STILL PENDING.** |

## Latest executed run\n\n- Workflow: [DVA frontend checks, run #5](https://github.com/zpitchfolo/DVA/actions/runs/40443935029)\n- Tested commit: `87db1615d06f85139519b04ecf71425b458102e0`\n- Environment: Ubuntu 24.04.5 LTS; Node.js 22.23.3; npm 10.9.9; Vitest 4.1.11.\n- `npm ci`: PASS; installed 118 packages, audited 119; reported 2 moderate vulnerabilities.\n- `npm test`: PASS; 1 test file, 8 tests passed.\n- `npm run build`: PASS; TypeScript check and Vite production build succeeded.\n- This was a hosted frontend CI run, not a local run in the user’s Windows environment. It did not launch the Tauri desktop app or test native filesystem persistence.\n\n## Test coverage added

- Initial editable panel renders.
- Creating a panel preserves the first panel.
- Closing one panel preserves another panel.
- Empty state allows creating a panel again.
- Editing and creating panels persists and restores after remount.
- Ctrl/Cmd+N creates a panel.
- Ctrl/Cmd+P opens search and selecting a result focuses the matching panel in the current code. The agreed target is Ctrl/Cmd+F; update the test when the shortcut changes.
- Ctrl/Cmd+S writes the current workspace snapshot and reports local-save status.

## Required next verification

1. Run `npm ci` in `app/`.
2. Run `npm test`.
3. Run `npm run build`.
4. Launch the desktop app with `npm run tauri dev`.
5. Enter text, create multiple panels, close and reopen the app, and confirm all remaining panel content returns.
6. Exercise Ctrl+N, the agreed Ctrl+F search shortcut, Ctrl+S, and the Save button in the desktop runtime. Current code still uses Ctrl+P until implementation is updated.
7. Inspect the Git diff and update this record with exact outcomes only after the commands and checks actually run.

## Known gaps and stop conditions

- The current persistence implementation uses WebView local storage. The user reports that it survives closing and reopening, but it is still not the intended user-inspectable workspace JSON file or native filesystem save flow.
- User-chosen workspace paths, native JSON persistence, safe localStorage-to-JSON migration, import/export, schema migrations, history snapshots, and recovery are not implemented by this change.
- Browser/WebView storage can fail or be cleared. The UI reports a local save failure, but stronger recovery and storage-integrity behavior remains future work.
- A successful frontend test run alone does not prove that persistence survives a real desktop app restart. That must be checked separately.
- Do not mark this candidate accepted until the automated checks pass and the desktop persistence flow is verified.

## Evidence rules

- Update this record after each actual run; Git history retains previous records.
- Record date/time, OS, Node/npm/Rust/Tauri versions, commit SHA, exact commands, exit status, and concise output.
- Separate automated tests, desktop runtime checks, and manual acceptance checks.
- Mark unavailable checks as **NOT RUN** and explain why. Source review or generated tests are not a test result.
- Any failed required test blocks acceptance until repaired and rerun.
