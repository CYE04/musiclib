# Musiclib Toolbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add four complete tool journeys without changing the current visual style.

**Architecture:** A classic-script toolbox controller mounts within #music-library. The existing host supplies metronome and chord APIs. Existing musictool editors are packaged as independent pages through the same source-sync/public-fallback pattern already used for staff assets.

**Tech Stack:** Existing JavaScript, CSS variables, Vite/React shell, Web Audio, existing ChordEngine, browser integration tests.

## Global Constraints

- Preserve all existing unrelated uncommitted changes in both repositories.
- Keep colors, fonts, spacing and button patterns consistent with musiclib.
- Keep the five-item mobile bottom navigation; add tools in the top bar.
- Stop toolbox metronome on back, close, tool switch, and page exit; retain song playback ownership.
- Do not change shared chord engine blocks.
- Do not publish or commit user changes.

### Task 1: Browser acceptance test

**Files:** Create tests/tools.e2e.mjs.

- [x] Test the public journey before implementation: open sidebar tools, inspect four cards, start/stop metronome, return/close, query a known chord, open editor pages, preserve an underlying detail on browser back, inspect mobile overflow and focus.
- [x] Run against http://127.0.0.1:5184/?key=cecp2026 and confirm the missing tools entry fails.

### Task 2: Toolbox controller and views

**Files:** Create public/musiclib-tools.js and public/musiclib-tools.css.

**Interface:** window.CECPMusicTools.create({root, icon, createMetronome, stopMetronome, getSong, chordEngine, transposeChord}) returns {open(opener), close(), back(), isOpen()}.

- [x] Render #ml-tools with #ml-tools-dialog, #ml-tools-close, #ml-tools-back, #ml-tools-title, and #ml-tools-content. Cards use data-tool="metro|chords|jf|lrc".
- [x] Implement metronome view via host.createMetronome; stop it on every exit.
- [x] Implement chord selection with root, quality, known examples and existing ChordEngine; validate through existing getChord/open APIs.
- [x] Implement jf/lrc introduction views with same-origin editor links ./musictool/index.html?tool=jf and ?tool=lrc, target=_blank, rel=noopener; clearly label new-window behavior.
- [x] Own focus trap, focus restore, scroll lock, Escape delegation, browser history, desktop side panel, mobile full screen, safe areas, reduced motion, dark theme.

### Task 3: Package existing editors

**Files:** Modify vite.config.js. Create public/musictool/index.html, editor adapter, and copies of musictool/musictool.js/css/tutorial plus tutorial renderer.

- [x] Copy current working source without rewriting the editor engine.
- [x] Add build/dev source sync with committed-public fallback, matching staffAssets behavior.
- [x] Load editor script then select allowlisted jf/lrc by clicking existing card, after all script constants initialize.
- [x] Provide correct tutorial resource paths and theme initialization; keep navigation feedback clear.
- [x] Ensure offline navigation to editor HTML never receives musiclib index.html.

### Task 4: Integrate host and validate

**Files:** Modify public/musiclib.js, src/legacy-loader.js, index.html, vite.config.js precache list, public/sw.js if necessary; build dist.

- [x] Add tools icon/sidebar/topbar entry and initialize controller outside shared rendering blocks.
- [x] Scope metronome owner updates to its actual element and preserve song metronome behavior.
- [x] Place tools before underlying detail in Escape priority; ensure tools-owned popstate cannot close the detail/player.
- [x] Include tools JS/CSS in actual requested-form precache URLs, update version strings, build dist.
- [x] Run browser journey tests, inspect screenshots in desktop/light, desktop/dark, 320px and 390px mobile.
- [x] Run npm run build, npm run conformance, npm run test:staff, review diff against before-task snapshot, run graphify update . in outer repository.

## Verification result

Production build passed. Toolbox production journeys: 26/26 passed, including transposition and both offline editors. Cache regressions: 4/4 passed. Staff conversion assertions: 152 passed. Strict-alignment copies remain consistent. The existing C6 shared-file gate has the same failure recorded at baseline (pre-existing chord-style/score-zoom edits). Navigation layout regression and final screenshots are documented in the outer repository docs/music-navigation-layout-2026-10-13.md.

## User-requested polish and chord transposition

- [x] Replace four toolbox card icons with StudioLive-style silhouettes; preserve palette and typography.
- [x] Reserve a fixed arrow column with 20–26px inner spacing; increase mobile header margins.
- [x] Add semitone controls, source/target key conversion, reset and input-state handling, using host note-name transposition without modifying shared chord engine blocks.
- [x] Test altered/extensions/slash bass, normalized 6/9 notation, live piano/fingering/audition, flat-key spelling, bounds, invalid input and 44px mobile controls.
