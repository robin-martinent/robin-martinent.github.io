# Graph Report - robin-martinent.github.io  (2026-11-06)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 79 nodes · 128 edges · 12 communities (8 shown, 4 thin omitted)
- Extraction: 75% EXTRACTED · 25% INFERRED · 0% AMBIGUOUS · INFERRED: 32 edges (avg confidence: 0.85)
- Token cost: 27,384 input · 598 output

## Community Hubs (Navigation)
- Game Core Logic
- Cookie Consent Manager
- Cookie Consent Manager
- Footer Arc Animation
- Footer Arc Animation
- Icon Sprite System
- Explosion Effects
- Typewriter Animation
- Time-Based Theming
- Game Initialization
- Lock Management
- Build Commands

## God Nodes (most connected - your core abstractions)
1. `init()` - 8 edges
2. `init()` - 8 edges
3. `accept()` - 5 edges
4. `refuse()` - 5 edges
5. `accept()` - 5 edges
6. `refuse()` - 5 edges
7. `finish()` - 5 edges
8. `enableOptional()` - 4 edges
9. `enableOptional()` - 4 edges
10. `triggerExplosion()` - 4 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (12 total, 4 thin omitted)

### Community 0 - "Game Core Logic"
Cohesion: 0.17
Nodes (7): apply(), doResize(), isLightMode(), onMove(), release(), render(), scheduleResize()

### Community 1 - "Cookie Consent Manager"
Cohesion: 0.39
Nodes (11): accept(), disableOptional(), enableOptional(), hideBanner(), init(), loadAnalytics(), readConsent(), refuse() (+3 more)

### Community 2 - "Cookie Consent Manager"
Cohesion: 0.39
Nodes (11): accept(), disableOptional(), enableOptional(), hideBanner(), init(), loadAnalytics(), readConsent(), refuse() (+3 more)

### Community 5 - "Icon Sprite System"
Cohesion: 0.53
Nodes (4): createIcon(), initIcons(), injectSprite(), replaceIcons()

### Community 6 - "Explosion Effects"
Cohesion: 0.40
Nodes (5): createSmokeParticle(), playExplosionSound(), startSmoke(), stopSmoke(), triggerExplosion()

### Community 7 - "Typewriter Animation"
Cohesion: 0.60
Nodes (5): finish(), markDone(), renderProgress(), skipToEnd(), typeNext()

### Community 8 - "Time-Based Theming"
Cohesion: 0.67
Nodes (3): getInitialTheme(), getParisHour(), getTimeBasedTheme()

### Community 9 - "Game Initialization"
Cohesion: 0.67
Nodes (3): handleClip(), openGame(), startGame()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 4 inferred relationships involving `init()` (e.g. with `cookie.js` and `accept()`) actually correct?**
  _`init()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `init()` (e.g. with `js/cookie.js` and `accept()`) actually correct?**
  _`init()` has 4 INFERRED edges - model-reasoned connections that need verification._