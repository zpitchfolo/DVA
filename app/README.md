# DVA app prototype

This folder contains the first Tauri 2 + React + TypeScript vertical slice for DVA.

## Current scope

- Desktop shell and dark workspace surface
- Create and close editable panels
- Independent panel content in the current session
- Automated frontend tests for the initial panel lifecycle
- Tauri 2 native shell scaffold

## Run locally

Install a current Node.js toolchain and the platform prerequisites documented by Tauri. From this folder:

```sh
npm install
npm test
npm run build
npm run tauri dev
```

The initial slice is intentionally not yet persistent. Workspace JSON persistence, safe file access, drag/resize, and history are not implemented. Do not treat this scaffold as an accepted or fully tested app until the latest test record shows real results.

Test evidence: [DVA Test Record](../DVA-Test-Record-v0.1.0.md)
Design: [DVA Initial Design v0.6.0](../DVAInitialDesignDoc-v0.6.0.md)
