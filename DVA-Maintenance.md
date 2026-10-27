# DVA Maintenance Guide

**Document version:** 0.1.2  
**Status:** Active handoff and recovery guide  
**Repository:** [zpitchfolo/DVA](https://github.com/zpitchfolo/DVA)

## Purpose

This file is the project's continuity anchor. A new chat or contributor should be able to resume work without guessing what was decided, rebuilding the plan from memory, or mistaking an intended feature for a working one.

Follow the [Development State Machine Workflow v1.5.0](https://github.com/zpitchfolo/Meta-Modules/blob/main/workflows/Development-State-Machine-Workflow-v1.5.0.md) and discover applicable modules from [Meta-Modules](https://github.com/zpitchfolo/Meta-Modules). For software implementation, apply [Testing and Verification v0.1.0](https://github.com/zpitchfolo/Meta-Modules/blob/main/modules/testing-and-verification-v0.1.0.md) where applicable.

## Current project state

- DVA is a Tauri 2 + React + TypeScript + Vite desktop prototype.
- The current UI supports editable panels, panel creation/closing, panel search, a Save action, autosave, and keyboard shortcuts.
- Search is Ctrl/Cmd+F, New Panel is Ctrl/Cmd+N, and Save is Ctrl/Cmd+S.
- Current persistence uses WebView `localStorage` with key `dva.workspace.v1`. This is temporary implementation storage, not the agreed canonical workspace JSON file.
- The user reports that writing survives closing and reopening the app. Keep this labeled as user-reported until the desktop restart flow is independently tested.
- Native JSON persistence, schema validation, user-selectable workspace location, localStorage-to-JSON migration, and recovery from malformed or interrupted writes are not implemented yet.
- Dependency update: Vitest and the `@vitest/*` family are at 4.1.12.
- Verified CI: [GitHub Actions run #20](https://github.com/zpitchfolo/DVA/actions/runs/40445241936) passed on the documentation-update commit `7237356dbb809efeba28cfcd72687e051a8062ca`. The preceding tested dependency candidate, commit `18840cc589d560c2e03edf30e44d82db0833b95c`, passed `npm ci`, `npm audit` (0 vulnerabilities), `npm test` (8 tests), and `npm run build` in [run #18](https://github.com/zpitchfolo/DVA/actions/runs/40445179309). These are hosted frontend checks, not a Windows desktop-runtime or native-persistence test.
- See [DVA-Test-Record.md](DVA-Test-Record.md) for the detailed evidence. Keep older conflicting text corrected in that file rather than treating it as current.

## Decisions that must not be re-litigated without new evidence

### Workspace JSON and location

1. Workspace JSON is the canonical home for working content and workspace state, not merely a settings file or backup.
2. Default location: DVA's dedicated, writable app-data directory for ordinary installed builds.
3. A portable distribution may configure a dedicated `app-data` folder beside the executable, but only where writable. Never assume an installed app can write to its installation directory.
4. Users must be able to choose a different workspace location. The default should work without requiring the user to make that choice.
5. Existing localStorage content must be preserved during migration. Do not clear or overwrite the old source until the new JSON has been written and read back/validated successfully.
6. Validate the JSON schema. Treat invalid or older JSON as a recovery/migration case, not as permission to silently replace it with an empty workspace.
7. Use narrowly scoped native filesystem access; do not grant the frontend unrestricted filesystem access.

Reference: [Tauri configuration](https://v2.tauri.app/reference/config/) and [Tauri filesystem plugin](https://v2.tauri.app/plugin/file-system/).

### Keyboard shortcuts and save feedback

- Ctrl/Cmd+F: Find/search.
- Ctrl/Cmd+S: Save/flush pending writes and display a clear success or failure state.
- Ctrl/Cmd+N: New panel.
- Search currently covers panel titles and content. Do not claim it searches files or the entire workspace.
- Keep shortcut labels, implementation, tests, and documentation aligned.

## Current files

- `DVAInitialDesignDoc.md`: canonical design and architecture decisions.
- `DVA-Test-Record.md`: current verification evidence.
- `DVA-Maintenance.md`: this continuity, maintenance, and recovery guide.
- `app/src/App.tsx`: current prototype implementation.
- `app/src/App.test.tsx`: frontend regression tests.
- `app/package.json` and `app/package-lock.json`: dependencies and lockfile.
- `.github/workflows/ci.yml`: CI workflow for dependency installation, audit details, tests, and production build.

Keep one current copy of each document. Update in place, bump that document's own SemVer, inspect the diff, and use Git history as the archive. Do not create version-suffixed duplicates.

## Next implementation sequence

The next milestone is **canonical JSON persistence with safe migration**, not adding more surface features. Work in small, verifiable slices.

### 1. Establish the baseline

- Inspect the current branch, working tree, latest commit, relevant source, tests, and CI workflow.
- Read the latest design document, this guide, and the test record.
- Run `npm ci`, `npm audit`, `npm test`, and `npm run build` from `app/` when the environment permits.
- Record exact commands, candidate commit, exit codes, and output. If a command cannot run, mark it **NOT RUN** and explain why.
- Keep the current user data and last known good commit recoverable before implementation.

### 2. Specify the smallest safe persistence slice

Before coding, define observable acceptance checks and settle only the schema details needed for the first migration:
- A versioned workspace JSON document contains panel content and the active-panel/workspace state currently persisted by the prototype.
- DVA uses an app-specific writable data directory by default.
- The application can report the actual workspace path.
- Missing data, invalid JSON, unsupported schema versions, and write failures produce explicit recoverable outcomes.
- Existing `dva.workspace.v1` localStorage data remains untouched until the JSON copy is successfully written and read back/validated.
- No broad filesystem permissions or silent fallback to an empty workspace.

Do not prematurely implement every future workspace concept in the design document. Preserve a clear path to extend the schema.

### 3. Implement native JSON persistence and migration

- Choose a narrowly scoped Tauri/Rust command or permission-scoped Tauri API appropriate to the current Tauri configuration.
- Add schema validation and a clear schema version.
- Implement safe writes using a temporary file and validated replacement/backup strategy.
- Migrate localStorage content without discarding the source before verification.
- Handle first launch, repeat launch, malformed source, malformed target, unsupported versions, write/permission errors, and retry after interruption.
- Make the current workspace path and save status discoverable in the UI.
- Keep migration idempotent: retrying after a partial failure must not duplicate or erase content.

### 4. Test persistence and recovery

Automated checks should cover at least:
- Serialization/deserialization round-trip of panels and active-panel state.
- Schema validation and unsupported versions.
- Migration from valid localStorage data.
- Preservation of source data on write/validation failure.
- Missing, malformed, and partially written JSON recovery behavior.
- Repeat migration/startup without data loss or duplication.
- Save status and relevant keyboard behavior.

Then run `npm ci`, `npm audit`, `npm test`, and `npm run build`. Add native Rust/Tauri tests where the chosen implementation allows them.

### 5. Verify the actual desktop flow

In a real Tauri desktop run, verify:
- Existing localStorage writing migrates to the expected JSON path.
- The resulting JSON contains the expected panel content and state.
- Closing and reopening restores the workspace from JSON.
- Ctrl/Cmd+F, Ctrl/Cmd+S, Ctrl/Cmd+N, the Save button, and search behave correctly.
- Malformed JSON and write failures preserve recoverable content and provide understandable feedback.
- The app can start and continue writing without requiring the user to manually choose a path on first launch.

CI passing alone does not satisfy this gate. If the Windows desktop runtime cannot be tested, record that limitation and do not claim desktop acceptance.

### 6. Review, record, and accept

- Inspect the full diff for accidental changes, data-loss risks, permission expansion, and stale labels.
- Update the design document only where implementation reveals a confirmed decision or changes the implementation boundary.
- Update the test record with checks actually run; keep user-reported observations separate from independently verified results.
- Accept only when the required automated and runtime gates pass. If a required gate fails or cannot be checked, leave acceptance pending and record the blocker.
- Commit with a descriptive message after reviewing the diff. If a candidate breaks the app or risks user data, stop feature work and recover from the last known good commit/diff.

## Commands

Run from the repository's `app/` directory:

```sh
npm ci
npm audit
npm test
npm run build
npm run tauri dev
```

On Windows PowerShell, first enter the local clone's `app` directory. Do not assume a particular clone path.

## Stop conditions

Stop and investigate instead of continuing feature work if:

- Any existing writing disappears, is overwritten, or cannot be recovered.
- Migration cannot prove the new copy is valid before retiring the old source.
- A required test fails.
- A required check cannot run and the missing evidence affects data safety or core behavior.
- A change broadens filesystem permissions beyond the intended paths.
- Design docs, code, tests, and visible shortcuts disagree.
- The current baseline or candidate commit cannot be identified.

## Recovery rules

1. Preserve the current working tree and user data before attempting repair.
2. Identify the last known good commit and inspect `git diff` before reverting anything.
3. Revert or restore only the broken change when possible; do not discard unrelated user work.
4. After repair, rerun the failed check and relevant regression tests.
5. Update the test record with the failure, repair, and rerun result.
6. If the cause is unclear or recovery could destroy user data, stop and ask rather than guessing.

## Handoff template

At the end of a work session, leave a short handoff containing:

- Current branch and candidate commit.
- Files changed.
- What is implemented versus merely designed.
- Exact tests/build/runtime checks run and results.
- Remaining blockers and next smallest action.
- Any data-safety or migration concerns.

The next session should start by reading this guide, the design document, the test record, and the current diff/status. Do not restart the planning process from scratch unless repository evidence contradicts these records.
