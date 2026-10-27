# DVA Test Record

**Document version:** 0.1.0  
**Current status:** Frontend CI passed; desktop runtime and full acceptance remain unverified.  
**Accepted application baseline:** Not yet established

## Latest completed run

| Field | Result |
|---|---|
| Candidate commit | `73edcdd32a26f3c6666a3940dadf9d0fafbfe303` |
| CI run | [DVA frontend checks, run 10](https://github.com/zpitchfolo/DVAexe/actions/runs/40257085080) |
| Environment | GitHub Actions, Ubuntu 24.04, Node.js 22.23.3, npm 11 |
| Dependency installation | PASS |
| Production dependency audit (`npm audit --omit=dev --audit-level=high`) | PASS |
| Automated tests (`npm test`) | PASS, 4 tests passed |
| Type check and production build (`npm run build`) | PASS |
| Tauri desktop launch | NOT RUN |
| Manual acceptance / persistence checks | NOT RUN; persistence is not implemented in this slice |
| Overall result | **FRONTEND CHECKS PASS. APP NOT YET ACCEPTED.** |

## Test coverage in this run

- Initial editable panel renders.
- Creating a panel preserves the first panel.
- Closing one panel preserves another panel.
- Empty state allows the user to create a panel again.

## Known gaps and stop conditions

- The desktop window has not been launched in CI or locally as part of this recorded run.
- Panels are in-memory only. Saving, reopening, JSON validation/migration, drag/resize, history, and filesystem access are not implemented or tested.
- Earlier CI runs exposed test-isolation and TypeScript/Vite configuration problems. Those were corrected; this run is the first passing frontend test + build run.
- Do not expand into persistence or filesystem integration until the current scaffold is locally launchable and the next acceptance checks are defined.

## Evidence rules

- Update this section after each actual run; Git history retains previous records.
- Record date/time, OS, Node/npm/Rust/Tauri versions, commit SHA, exact commands, exit status, and concise output.
- Separate automated tests, desktop runtime checks, and manual acceptance checks.
- Mark unavailable checks as **NOT RUN** and explain why. A generated test or source review is not a test result.
- Any failed required test blocks acceptance until repaired and rerun.
