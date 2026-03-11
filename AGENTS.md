# AGENTS

## Purpose
This file defines lightweight agent roles for frontend work in this repository.
Use it to assign ownership, keep changes focused, and reduce regressions.

## Scope
In scope:
- HTML, CSS, JavaScript, WebGL, and frontend behavior.
- Files under root pages, `assets/css/`, `assets/js/`, `assets/shaders/`, and `sw.js`.

Out of scope:
- Python build pipeline and image processing (`build_portfolio_json.py`, `buildPortfolio.bat`).
- Any backend or infrastructure workflow.

## Frontend Repo Map
- `index.html`: landing page structure and layered effects.
- `portfolio.html`: portfolio interactions and rendering logic.
- `me.html`: secondary page content and layout.
- `assets/css/styles.css`: styling, animation, responsive rules.
- `assets/js/tvstatic.js`: WebGL effect orchestration.
- `assets/js/noise.js`: visual effect behavior.
- `assets/js/blog.js`: content rendering and feed behavior.
- `assets/shaders/tvstatic.vert`: vertex shader.
- `assets/shaders/tvstatic.frag`: fragment shader.
- `sw.js`: service worker and cache-sensitive behavior.

## Global Rules
- Preserve the existing visual language unless a task explicitly requests redesign.
- Do not add frameworks or a build toolchain for frontend tasks.
- Do not modify `/archive/` files unless explicitly requested.
- Keep changes small and task-scoped; avoid unrelated refactors.

## Agent Roles

### 1. Page Structure Agent
Owns semantic structure and page-level integrity for `index.html`, `portfolio.html`, and `me.html`.

Responsibilities:
- Keep section hierarchy and links consistent.
- Maintain accessibility basics (alt text, labels, heading order where touched).
- Protect script/style includes and relative paths.

Done checklist:
- [ ] Desktop and mobile layout sanity check completed.
- [ ] Browser console shows no new errors on touched pages.
- [ ] Navigation and asset paths resolve correctly.
- [ ] Core page interactions still work after edits.

### 2. Styling and Motion Agent
Owns `assets/css/styles.css` and any style blocks touched in HTML files.

Responsibilities:
- Preserve blend behavior, animation intent, and responsive layout.
- Keep CSS changes localized and avoid broad selector side effects.
- Maintain readability and contrast for changed UI elements.

Done checklist:
- [ ] Desktop and mobile visual checks completed.
- [ ] Browser console shows no new CSS/JS-related errors.
- [ ] No broken backgrounds, fonts, images, or icon paths.
- [ ] Existing animation/blend behavior remains consistent on key pages.

### 3. WebGL and Effects Agent
Owns `assets/js/tvstatic.js`, `assets/js/noise.js`, and `assets/shaders/`.

Responsibilities:
- Keep shader and JS uniforms/attributes in sync.
- Avoid changes that significantly degrade frame stability or interaction feel.
- Preserve fallback behavior if effect initialization fails.

Done checklist:
- [ ] Desktop and mobile visual/effect checks completed.
- [ ] Browser console shows no WebGL runtime errors.
- [ ] Shader and script asset paths resolve correctly.
- [ ] Key effect behavior (cursor response, overlays, or noise) remains functional.

### 4. Content and Data Binding Agent
Owns frontend data consumption logic such as `assets/js/blog.js` and page bindings to `journal.json` and `portfolioTable.json`.

Responsibilities:
- Keep parsing and rendering resilient to missing/partial fields.
- Avoid silent failures; preserve graceful handling for empty data.
- Keep data contracts stable unless task explicitly updates them.

Done checklist:
- [ ] Desktop and mobile content rendering checks completed.
- [ ] Browser console shows no new parsing/render errors.
- [ ] JSON fetch paths and linked assets resolve correctly.
- [ ] Infinite scroll/loading and item rendering still work as expected.

## Validation Notes
- If a change touches `sw.js` or cache-sensitive assets, perform one hard refresh and verify updated assets load.
- If a change spans multiple role areas, run all relevant role checklists before completion.

## Change Handoff Template
When handing off work, include:
- Files changed.
- Role(s) used.
- Checklist items completed.
- Any known risks or follow-up tasks.
