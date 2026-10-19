# Titanic Website — Current Issues Register

Updated: 2026-10-05

This register separates resolved usability problems from remaining product limitations. It should be reviewed after every substantial game or data-story change.

## Critical issues addressed in this iteration

### Opening scenes could overlap

- **Observed problem:** GSAP left inline `opacity` and `visibility` values on the outgoing scene. Those values could override the CSS hidden state and leave two blocks of story text visible together.
- **Resolution:** Kill the previous timeline, clear its inline animation state before changing scenes, and return visibility control to CSS after each transition.
- **Additional protection:** Opening copy now has fluid type, height-aware sizing, a bounded scroll region, and a separate control bar.

### The cabin illustration did not explain the space

- **Observed problem:** The abstract window/bunk illustration looked decorative but did not help the player understand decks, routes, or uncertainty.
- **Resolution:** Replace it with a restrained technical deck-section diagram. It is explicitly labelled as an orientation diagram, not a map of recorded passenger locations.

### “Play as a passenger” felt like a profile picker

- **Observed problem:** Choosing one of six long passenger rows felt like selecting a database record rather than beginning a game. It also encouraged choosing an apparently favourable profile.
- **Resolution:** Remove the six-person picker. The player now opens a sealed record drawn from a varied pool, reads the inherited circumstances, and enters the night.

### The game was too short and too text-only

- **Observed problem:** Three choices, each followed by another text screen, created little sense of movement or accumulating pressure.
- **Resolution:** Expand the game to five changing situations. Add a persistent ship-time display, deck position, route condition, companion state, congestion, loading access, and a visible consequence trail.

## Remaining high-priority limitations

### Routes are still schematic

The deck section communicates vertical progress but is not a historically complete route network. A future version should use a properly sourced general arrangement plan and document which passages are interpretive.

### Crowd and route events are simplified

Congestion and access persist across choices, but there is not yet a full agent-based crowd simulation, dynamic water ingress model, or independently timed lifeboat schedule.

### The outcome model remains illustrative

The simulation combines the passenger model estimate with modest state adjustments. It is not a reconstruction of an individual's historical night and must remain labelled as a game simulation.

### More replay variation is needed

The profile pool is varied and paths differ, but future playability would benefit from sourced event variants, route closures, limited lifeboat states, and additional conditional decisions.

### Full bilingual coverage is incomplete

The opening and game are bilingual. Some analytical explanations, model evaluation details, and provenance records remain English-first.

### Mobile testing needs a physical-device pass

Responsive rules, touch targets, text reflow, and reduced motion are implemented, but final release QA should include physical iOS and Android devices at large text settings.

## Product guardrails

- Do not invent cabin locations when the field is not recorded.
- Do not imply that game choices reconstruct a historical passenger's actions.
- Do not turn survival into an arbitrary points system.
- Do not label decisions immediately as good or bad.
- Do not present model associations as causal explanations.
- Keep the data story accessible without completing the game.

## Immersive dive (added 2026-10-18)

Chapters 1–9 (`website/dive/`) are playable end to end. Known limits:

- **Image rights and quality.** The eight photographs were supplied by the project owner; the diver picture is 335×597 with a visible third-party watermark, the poster is 365×547 and the Grand Staircase is a 736×404 render. They are upscaled over a blurred copy of themselves. Replace with licensed or higher-resolution images before a public release.
- **Hotspot coordinates are hand-placed** as percentages of each image; re-check them if an image is swapped.
- **Figures** on the cards (2,229 aboard; 325/285/706 passengers; ~913 crew; ~58 cooks and kitchen staff; 8 musicians; 16 compartments; 3,840 m) come from public compilations and differ slightly between sources; the UI says so.
- **Cabin cross-section is schematic**, not a general-arrangement plan (stated on the card).
- **Next chapter not built:** the assigned passenger's night (route choices, outcome reveal) still lives in the classic game (`classic.html`).
- **Physical-device QA** (iOS/Android, large text) is still outstanding; layout was checked at 390×844 and 1280×800 in headless Chromium.
