# videojs-vast

Open Source VAST/VMAP plugin for Video.js by ARTE.

## mdma
- **Workflow** : `jira`
- **Git** : `jira`

## JIRA
- **Projet** : `VAST`

## Stack

```
web-front (replay)  →  @artegeie/arte-vp  →  @artegie/videojs-vast
~/Sites/web-front       ~/Sites/ARTE-Video-Player    ~/Sites/videojs-vast
yarn 4 / Turbopack      yarn / webpack               npm / esbuild
```

### Critical event chain (ad tracking)
```
videojs-vast                    → vast.complete / vast.skip
  └─ ARTE-Video-Player (arteVp) → arte_vp.stats.adFinished
       └─ ServerSideTracking     → attaches listeners on adFinished
            └─ web-front (replay) → listens to player events → sends stats
```

Any change to event triggering in videojs-vast can break stats tracking upstream.

### Local development (full stack)
```bash
~/Sites/dev-stack.sh          # Link all + start dev servers
~/Sites/dev-stack.sh --link   # Only set up yalc links
~/Sites/dev-stack.sh --clean  # Remove all yalc links
```

### Package naming
- Published as `@artegie/videojs-vast` (GitHub Packages, since VAST-73)
- arteVp still depends on `@arte/videojs-vast` (old name, to be migrated)

## Structure

```
src/
  index.js              # Main plugin class (Vast extends videojs Plugin)
  demo.js               # Demo page entry point
  features/
    icons.js            # Ad icon rendering
    eventManager.js     # Declarative event binding/unbinding
  modes/
    linear.js           # Linear ad playback
    nonlinear.js        # Non-linear ad rendering (overlay)
    companions.js       # Companion ad rendering
  lib/
    index.js            # Barrel export
    utils.js            # Utility functions
    utils.test.js       # Unit tests (vitest)
    fetchVmapUrl.js     # VMAP fetch with AbortController
    injectScriptTag.js  # Script tag injection for ad verification
docs/                   # Demo page (served by GitHub Pages)
cypress/                # E2E tests
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run build` | Build CJS + ESM |
| `npm run build:local` | Build + yalc push |
| `npm run lint` | ESLint |
| `npm run test:unit` | Vitest |
| `npm run test:e2e` | Cypress (needs server on :3333) |
| `npm test` | Unit + E2E |
| `npm start` | Dev server + watch + yalc auto-push |

## Dependencies

| Package | Role |
|---------|------|
| `@dailymotion/vast-client` | VAST XML parsing + tracking |
| `@dailymotion/vmap` | VMAP XML parsing |
| `videojs-contrib-ads` | Ad mode management for video.js |
