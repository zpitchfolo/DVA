# DVA Maintenance Guide

**Document version:** 0.1.1  
**Status:** Active handoff and recovery guide  
**Repository:** [zpitchfolo/DVA](https://github.com/zpitchfolo/DVA)

## Purpose

This file is the project's continuity anchor. A new chat or contributor should be able to resume work without guessing what was decided, rebuilding the plan from memory, or mistaking an intended feature for a working one.

Follow the [Development State Machine Workflow v1.5.0](https://github.com/zpitchfolo/Meta-Modules/blob/main/workflows/Development-State-Machine-Workflow-v1.5.0.md) and discover applicable modules from [Meta-Modules](https://github.com/zpitchfolo/Meta-Modules). For software work, use [Testing and Verification v0.1.0](https://github.com/zpitchfolo/Meta-Modules/blob/main/modules/testing-and-verification-v0.1.0.md) where applicable.

## Current project state

- DVA is a Tauri 2 + React + TypeScript + Vite desktop prototype.
- The current UI has editable panels, panel creation/closing, panel search, a Save button, autosave, and keyboard shortcuts.
- The current persistence code in `app/src/App.tsx` uses WebView `localStorage` with key `dva.workspace.v1`.
- The user reports that writing persists after closing and reopening the app. Record this as user-reported evidence, not as an independently reproduced test result.
- The app currently uses Ctrl/Cmd+P to open panel search. This conflicts with the agreed target of Ctrl/Cmd+F.
- Ctrl/Cmd+S exists in code, but the user reports that it appears to do nothing. The next implementation should make the save action observable and ensure pending writes are flushed.
- The app does not yet use the intended canonical workspace JSON file. Do not imply that native JSON persistence, migration, or workspace path selection already works.
- Latest CI: [GitHub Actions run #5](https://github.com/zpitchfolo/DVA/actions/runs/40443935029) passed `npm ci`, all 8 frontend tests, and `npm run build` on Ubuntu 24.04 / Node 22.23.3. This does not verify the Tauri desktop runtime, real close/reopen persistence, or native JSON persistence. See the [test record](DVA-Test-Record.md) for exact evidence.

## Decisions that must not be re-litigated without new evidence

### Workspace JSON and location

1. Workspace JSON is the canonical home for working content and workspace state, not merely a settings file or backup.
2. Default location: DVA's dedicated, writable app-data directory for ordinary installed builds.
3. Portable distribution may configure a dedicated `app-data` folder next to the executable, but only where that location is writable. Never assume an installed app can write to its installation directory.
4. Users must be able to choose a different workspace location. The default should work without requiring the user to make that choice.
5. Existing localStorage content must be preserved during migration. Do not clear or overwrite the old source until the new JSON has been written and read back/validated successfully.
6. Use narrowly scoped native filesystem access and validate the JSON schema. Treat invalid or old JSON as a recovery/migration case, not as permission to silently replace it with an empty workspace.

Reference: [Tauri configuration and app directory overrides](https://v2.tauri.app/reference/config/) and [Tauri filesystem plugin](https://v2.tauri.app/plugin/file-system/).

### Keyboard shortcuts and save feedback

- Ctrl/Cmd+F: Find/search.
- Ctrl/Cmd+S: Save/flush pending writes and display a clear success or failure state.
- Ctrl/Cmd+N: New panel.
- Ctrl/Cmd+P is the current prototype behavior only and must be replaced by Ctrl/Cmd+F.
- Search currently covers panel titles and content. Do not silently claim that it searches files or the entire workspace.

## Current files

- `DVAInitialDesignDoc.md`: canonical design and architecture decisions.
- `DVA-Test-Record.md`: one current record of actual verification results.
- `DVA-Maintenance.md`: this continuity, maintenance, and recovery guide.
- `app/src/App.tsx`: current prototype implementation.
- `app/src/App.test.tsx`: frontend regression tests.
- `app/package.json`: available scripts.
- `.github/workflows/ci.yml`: CI workflow for dependency installation, tests, and production build.

Keep one current copy of each document. Update in place, bump the document's own SemVer, inspect the diff, and use Git history as the archive. Do not create version-suffixed duplicates.

## Next implementation sequence

Work in small, verifiable slices. Preserve the existing writing throughout.

### 1. Establish the baseline

- Inspect the current branch, working tree, latest commit, relevant source, tests, and CI workflow.
- Read the latest design document and test record.
- Run `npm ci`, `npm test`, and `npm run build` from `app/` when the environment permits.
- Record exact commands, commit/candidate identity, exit codes, and output. If a command cannot run, mark it **NOT RUN** and state why.

### 2. Correct Find and Save behavior

- Change Ctrl/Cmd+P to Ctrl/Cmd+F.
- Update the footer hint and tests to match.
- Ensure Ctrl/Cmd+S and the Save button visibly acknowledge the action and report failures.
- Keep keyboard handlers accessible and avoid triggering shortcuts while a browser/OS-reserved context or unintended modifier combination is active.
- Run regression tests and the production build; verify shortcuts in the Tauri desktop runtime where possible.

### 3. Implement canonical JSON persistence

- Define and validate a versioned workspace JSON schema.
- Use a narrow Tauri/Rust persistence command or a suitable, permission-scoped Tauri API.
- Default to the app-specific writable data directory for installed builds.
- Add a user-selectable path workflow without making path selection mandatory for first use.
- Use safe writes: write to a temporary file, flush as supported, validate the serialized result, then replace the previous file with an appropriate backup/recovery strategy.
- Migrate `dva.workspace.v1` localStorage data only after validating the source and preserve the source until the new JSON has been verified.
- Handle missing files, malformed JSON, older schema versions, write failures, and interrupted migration without silently losing writing.
- Make the current workspace path discoverable in the UI or workspace information view.
- Avoid adding broad filesystem permissions. Keep access constrained to the intended workspace and app-data paths.

### 4. Verify migration and restart behavior

- With existing localStorage writing present, launch the app and migrate.
- Confirm the JSON exists at the reported path and contains the expected panel content and active-panel state.
- Close and reopen the desktop app; verify the same content and arrangement return from JSON.
- Test malformed JSON, missing JSON, permission/write failure, and migration retry behavior without deleting the recoverable source.
- Verify Ctrl/Cmd+F, Ctrl/Cmd+S, Ctrl/Cmd+N, Save status, and panel search.
- Run the relevant automated tests and production build again after repairs.

### 5. Record and accept

- Inspect the full diff for accidental changes, data-loss risks, permission expansion, and stale shortcut labels.
- Update the design document to distinguish decisions from implemented behavior.
- Update the test record only with checks actually run; retain user-reported results as such.
- Accept only when required automated and runtime gates pass. If a gate fails or cannot be checked, leave the candidate unaccepted and record the blocker.
- Commit with a descriptive message after reviewing the diff. If a candidate breaks the app or risks user data, stop feature work and recover using the last known good commit/diff.

## Commands

Run from the repository's `app/` directory:

```sh
npm ci
npm test
npm run build
npm run tauri dev
```

On Windows PowerShell, first enter the local clone's `app` directory. Do not assume a particular clone path.

## Stop conditions

Stop and investigate instead of continuing feature work if:

- Any existing writing disappears, is overwritten, or cannot be recovered.
- JSON migration cannot prove the new copy is valid before retiring the old source.
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

The next session should start by reading this guide, the design document, the test record, and the current diff/status. Do not restart the planning process from scratch unless the repository evidence contradicts these records.
