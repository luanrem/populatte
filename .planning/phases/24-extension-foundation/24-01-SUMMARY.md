---
phase: 24
plan: 01
subsystem: extension
tags: [wxt, chrome-extension, react, typescript, workspace]

requires:
  - packages/types package structure
provides:
  - WXT-based Chrome extension scaffold
  - React popup with Tailwind CSS
  - Service worker (background script)
  - Content script infrastructure
  - @populatte/types integration
affects:
  - 24-02: Extension auth will build on this foundation
  - 24-03: Popup UI will extend the App component
  - 24-04: Content script will implement form detection

tech-stack:
  added:
    - wxt: ^0.20.13
    - "@wxt-dev/module-react": ^1.1.5
    - "@types/chrome": ^0.0.287
    - lucide-react: 0.555.0
    - tailwindcss: ^4
    - "@tailwindcss/vite": ^4
  patterns:
    - WXT framework for extension development
    - React 19.2.0 for popup UI
    - Tailwind CSS v4 for styling
    - npm workspaces for monorepo

file-tracking:
  created:
    - apps/extension/package.json
    - apps/extension/wxt.config.ts
    - apps/extension/tsconfig.json
    - apps/extension/styles/globals.css
    - apps/extension/entrypoints/popup/index.html
    - apps/extension/entrypoints/popup/main.tsx
    - apps/extension/entrypoints/popup/App.tsx
    - apps/extension/entrypoints/background.ts
    - apps/extension/entrypoints/content.ts
    - apps/extension/public/icon-*.png (4 sizes)
    - packages/types/package.json
    - packages/types/src/index.ts
  modified:
    - package.json (added workspaces config, React dependencies)
    - .gitignore (added .output/, .wxt/)

decisions:
  - decision: "Use WXT 0.20.13 over CRXJS"
    rationale: "WXT provides better abstractions for storage and messaging, aligning with phase 24 research"
    impact: "All extension builds use WXT conventions and manifest generation"

  - decision: "Install React 19.2.0 at workspace root"
    rationale: "Resolves peer dependency issues with lucide-react and enables sharing across web/extension"
    impact: "All workspace apps can share React version"

  - decision: "Create minimal @populatte/types package"
    rationale: "Plan requires types to be importable, establishes shared types infrastructure"
    impact: "Foundation for type sharing across API/web/extension"

  - decision: "Use Tailwind CSS v4 with Vite plugin"
    rationale: "Matches web app styling approach, simplifies theme consistency"
    impact: "Extension UI can share design tokens with web dashboard"

metrics:
  duration: "5m 4s"
  completed: 2026-02-03
---

# Phase 24 Plan 01: Extension Foundation Summary

**One-liner:** WXT-based Chrome extension scaffold with React popup, service worker, content script, and @populatte/types integration ready for auth and UI implementation.

## What Was Built

### Core Infrastructure
Created the complete foundation for the Populatte Chrome extension:

1. **Extension Package** (`apps/extension/`)
   - WXT framework configuration with React module
   - TypeScript strict mode with @populatte/types path resolution
   - Tailwind CSS v4 integration via Vite plugin
   - Build scripts for Chrome and Firefox

2. **Three Execution Contexts**
   - **Popup**: React 19 app with Coffee icon, brand styling (amber), connection status display
   - **Background**: Service worker with initialization and install event logging
   - **Content Script**: Page load detection logging on all URLs

3. **Shared Types Package** (`packages/types/`)
   - Minimal shared types: `BaseEntity`, `User`, `Project`, `ProjectStatus`
   - Establishes monorepo pattern for type sharing

4. **Workspace Configuration**
   - Configured npm workspaces at root (`apps/*`, `packages/*`)
   - React 19.2.0 installed at root for dependency sharing
   - Build artifacts (.output, .wxt) properly gitignored

### Visual Design
- Placeholder PNG icons in brand amber color (#b45309) at 4 sizes (16, 32, 48, 128px)
- Popup dimensions: 350x500px
- Amber-themed status card with border and background
- Clean header with Coffee icon and "Populatte" branding

### Build Output
Extension builds to `.output/chrome-mv3/` with:
- Valid manifest.json (MV3)
- Popup HTML and bundled React app (195 KB)
- Background service worker (745 B)
- Content script (3.42 KB)
- Tailwind CSS (6.31 KB)
- Icons copied to output
- **Total size:** 210.24 KB

## Technical Decisions

### WXT Framework Choice
Chose WXT 0.20.13 based on phase 24 research:
- **Storage abstraction**: Built-in wrappers for chrome.storage (critical for service worker state)
- **Messaging helpers**: Simplifies popup ↔ background ↔ content communication
- **Manifest generation**: Convention-based manifest.json from wxt.config.ts
- **Multi-browser support**: Single codebase for Chrome and Firefox

### React at Workspace Root
Initially faced peer dependency resolution issue:
- lucide-react (hoisted to root) couldn't find React
- Solution: Install react@19.2.0 and react-dom@19.2.0 at root
- Benefits: Shared across web app and extension, reduces duplication

### Minimal Background Script
Background script intentionally minimal:
- Only logs initialization and install events
- Storage and messaging infrastructure deferred to plan 24-02 (auth)
- Avoids premature architecture before auth requirements clear

### TypeScript Path Resolution
Configured dual resolution for @populatte/types:
- `tsconfig.json` paths: `"@populatte/types": ["../../packages/types/src"]`
- `wxt.config.ts` Vite alias: Same path for runtime resolution
- Ensures both TypeScript compiler and Vite bundler resolve types correctly

## Deviations from Plan

### Infrastructure Setup (Rule 3 - Blocking)
**Found during:** Task 3 (Install dependencies)
**Issue:** Plan assumed existing monorepo workspace structure, but packages/ was empty and root package.json had no workspace config
**Fix:**
- Created packages/types/ with minimal shared types
- Configured npm workspaces in root package.json
- Installed React at root to resolve peer dependency hoisting
**Files created:**
- `packages/types/package.json`
- `packages/types/src/index.ts`
- Updated `package.json` with workspaces field
**Rationale:** Cannot build extension without workspace infrastructure. Plan's must_have requires "@populatte/types are importable"
**Commit:** 340c982

### Build Artifact Gitignore (Rule 2 - Missing Critical)
**Found during:** Task 3 (Verify build)
**Issue:** .output/ and .wxt/ directories not in .gitignore, would pollute git history
**Fix:** Added both to .gitignore under "Production builds" section
**Files modified:** `.gitignore`
**Rationale:** Build artifacts should never be committed (ephemeral, large, generated)
**Commit:** 340c982

## Verification Results

All success criteria met:

- ✅ WXT project structure created at apps/extension
- ✅ @populatte/types integrated and importable (no module resolution errors)
- ✅ All three entrypoints (popup, background, content) defined
- ✅ TypeScript strict mode configured with noUncheckedIndexedAccess
- ✅ Tailwind CSS configured via @tailwindcss/vite plugin
- ✅ Valid placeholder icons exist for all required sizes (16, 32, 48, 128px)
- ✅ Extension builds without errors: `npm run build` succeeds
- ✅ Build output contains valid manifest.json with "Populatte" name
- ✅ Manifest permissions: storage, activeTab, scripting, <all_urls>

**Build verification:**
```bash
cd apps/extension && npm run build
✔ Built extension in 987 ms
✔ Finished in 1.146 s
```

**Manifest verification:**
```json
{
  "manifest_version": 3,
  "name": "Populatte",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>"],
  "background": {"service_worker": "background.js"},
  "content_scripts": [{"matches": ["<all_urls>"], "js": ["content-scripts/content.js"]}]
}
```

## Next Phase Readiness

### Ready for 24-02 (Extension Auth)
- ✅ Service worker initialized (can add chrome.storage logic)
- ✅ Popup React app ready (can add auth UI components)
- ✅ WXT storage abstraction available for token persistence

### Ready for 24-03 (Popup UI)
- ✅ React + Tailwind setup complete
- ✅ lucide-react available for icons
- ✅ App.tsx ready to be extended with auth-gated screens

### Ready for 24-04 (Content Script)
- ✅ Content script entry file exists
- ✅ Messaging infrastructure ready (WXT abstractions)
- ✅ @populatte/types available for shared interfaces

### Blockers/Concerns
None. Extension foundation is complete and builds successfully.

## Commits

| Hash    | Type  | Description                                      |
|---------|-------|--------------------------------------------------|
| d334e9b | chore | Initialize WXT project with React and types      |
| d928ec5 | feat  | Create extension entrypoints and icons           |
| 340c982 | chore | Set up workspace infrastructure and dependencies |

**Total commits:** 3
**Total duration:** 5m 4s
**Lines added/changed:** ~23,200 (mostly package-lock.json)

## Key Files Reference

**Entry points:**
- `apps/extension/entrypoints/popup/App.tsx` - React popup root
- `apps/extension/entrypoints/background.ts` - Service worker
- `apps/extension/entrypoints/content.ts` - Content script

**Configuration:**
- `apps/extension/wxt.config.ts` - WXT build config, manifest generation
- `apps/extension/tsconfig.json` - TypeScript paths, strict mode
- `apps/extension/package.json` - Dependencies, build scripts

**Types:**
- `packages/types/src/index.ts` - Shared types across monorepo

**Build output:**
- `apps/extension/.output/chrome-mv3/` - Production extension (gitignored)
