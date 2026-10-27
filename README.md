# DVA

DVA is a panel-first, modular desktop workspace. This repository contains its current design, implementation, and verification records.

## Canonical documents

- [DVA Initial Design](DVAInitialDesignDoc.md) — the single current design document. Its current SemVer is recorded inside the file.
- [DVA Test Record](DVA-Test-Record.md) — current verification record; update in place when its status changes, keeping one current record in this folder.

## Document maintenance rule

**Keep one current file per document.** Do not create version-suffixed copies beside it.

1. Read the current file and the relevant project instructions/modules before changing it.
2. Update the existing file in place and increment that artifact's own SemVer in its contents when appropriate.
3. Inspect the changes against the previous committed state with Git diff. For example: `git diff HEAD~1 HEAD -- DVAInitialDesignDoc.md` after committing, or `git diff -- DVAInitialDesignDoc.md` before committing.
4. Verify the diff, document structure, links, and any relevant acceptance checks.
5. Commit the accepted change with a descriptive message. Git history is the version archive and recovery path; old copies do not need to remain in the working tree.
6. If a candidate fails verification, fix or restore it using the diff and Git history, and do not label it accepted until the required checks pass.

## Modular development workflow

Follow [Development State Machine Workflow v1.5.0](https://github.com/zpitchfolo/Meta-Modules/blob/main/workflows/Development-State-Machine-Workflow-v1.5.0.md). Discover and apply relevant modules from [Meta-Modules](https://github.com/zpitchfolo/Meta-Modules) instead of copying the whole workflow into this repository. For software changes, use [Testing and Verification v0.1.0](https://github.com/zpitchfolo/Meta-Modules/blob/main/modules/testing-and-verification-v0.1.0.md) when applicable.

The workflow is modular: inspect the project, select the relevant modules, scope the change, implement, review the diff, run feasible checks, record actual evidence, and preserve recoverability. Scale the process to the risk and size of the change.
