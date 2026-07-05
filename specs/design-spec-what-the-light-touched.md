# Design Spec — *What the Light Touched*

A short psychological horror point-and-click adventure for the web.
Genre flavor: unreliable narrator / mystery. Target playthrough: ~30 minutes. Art: photo-based backgrounds.

---

## 1. High Concept

You are Mara, returning to your late sister Edith's apartment to pack it up before the lease ends. Mara narrates everything you examine — warmly, confidently, in the past tense of someone who "knew her sister better than anyone." But the apartment keeps disagreeing with her. The photographs on the wall, the contents of the drawers, the state of the second bedroom: none of it matches the story Mara is telling you.

The core horror is not a monster. It is the slowly widening gap between the narrator's voice in your ear and the physical evidence in front of your eyes — and the growing suspicion that the narrator knows exactly what she's doing.

**The one-line pitch:** a point-and-click game where the walkthrough text is lying to you, and noticing the lies *is* the game.

## 2. Design Pillars

**The narrator is a character, not a UI element.** Every examine response is written in Mara's voice, with an agenda. The player's primary verb is not "use item on object" but "catch the narration in a contradiction."

**Photographs are evidence.** Because the backgrounds are real photos, the game can trade on photographic authority — we instinctively trust what a photo shows. When narration contradicts a photo, the photo wins in the player's gut, and that dissonance is the engine of dread.

**Small, dense, complete.** Four rooms, one apartment, thirty minutes, two endings. Every hotspot earns its place. No filler puzzles, no pixel hunting, no deaths, no fail states.

## 3. Core Mechanics

### 3.1 Examine vs. Look Again

Every hotspot supports two interactions. **Examine** (single click) plays Mara's narration — subjective, warm, sometimes false. **Look Again** (click the same hotspot while the narration text is still on screen) gives a flat, objective description of what is physically there, written in clipped second person with no personality.

Most of the time the two accounts agree, which trains trust. Roughly a quarter of the time they quietly diverge. Example:

> **Examine (Mara):** "Edith's reading chair. She'd sit here every night with her tea. She was so at peace in this apartment."
>
> **Look Again:** A chair facing the wall, not the window. Deep scratches on the armrests. The floor beneath is worn through the varnish in two parallel tracks.

The player is never told which lines are lies. The design bets that spotting them unprompted is more frightening than any flagged "contradiction detected" popup.

### 3.2 Fractures

When the player has seen *both* halves of a genuine contradiction (the Examine and its Look Again), the game silently registers a **fracture**. There are seven fractures in the game. Nothing announces them — but the apartment reacts. Ambient audio degrades slightly. Mara's subsequent narration for unrelated objects gets a touch more defensive. At three, five, and seven fractures, scripted environmental shifts occur (see §5).

Fractures are the game's real progression currency. The door puzzles gate the critical path; fractures gate the truth.

### 3.3 Inventory (deliberately tiny)

Three items total, each doing double duty as a puzzle key and a narrative device: **Edith's key ring** (opens the second bedroom; Mara claims not to recognize two of the keys), **a Polaroid camera with one photo left** (used in the finale), and **a water-damaged notebook** (pages readable only under the bathroom's UV nightlight — Edith's actual voice, the counter-narrator).

### 3.4 The Doubt Prompt (endgame only)

In the final scene, the game surfaces its only explicit choice. Mara delivers her closing account of what happened to Edith. If the player has registered fewer than five fractures, the game ends there — Ending A plays and the player may never know they were lied to. At five or more fractures, a single interactive line appears in the narration text itself: one of Mara's sentences is rendered slightly wrong — a word faintly misaligned. Clicking that word is the accusation. This is the mechanical thesis of the game: the player's cursor, which has obeyed the narrator for thirty minutes, finally used against her.

## 4. Story Structure (spoilers)

**The surface story Mara tells:** Edith lived alone, struggled with her health, and died peacefully. Mara visited often. They were close.

**What the apartment shows:** Edith did not live alone — the second bedroom was inhabited until recently. The pill organizer is full. The chair faced the wall because Edith was watching the bedroom door. The notebook reveals Edith had been documenting Mara's visits with mounting fear, and that "Mara" hasn't been Mara for a long time — the sister died years ago, and the narrator is the person who has been living in the second bedroom, wearing the story of Mara. Whether that person is a stranger, a delusion, or something worse is left deliberately unresolved; the horror is the voice, not its taxonomy.

**Ending A — "The Story Holds" (default):** The player packs the last box. Mara's narration thanks you for helping her say goodbye. Over the credits, the Polaroid the player took earlier develops on screen: the framing is wrong. There are two shadows.

**Ending B — "Look Again" (5+ fractures, accusation made):** The narration text itself breaks down — Mara's voice and the objective voice begin overwriting each other mid-sentence in the text box. The final playable beat: the game gives you one last hotspot, the hallway mirror, with only **Look Again** available. What it describes is left to the writing pass, but the design requirement is fixed: it must be the only objective description in the game that the player wishes had been narration.

## 5. Room-by-Room Breakdown

The apartment has four rooms plus an entry hall, unlocked in sequence. Estimated time in parentheses.

**Entry Hall (3 min) — tutorial space.** Teaches Examine and Look Again on safe, truthful hotspots (coat rack, mail pile, light switch). One gentle contradiction hidden here for observant players to find on a second visit. Exit to living room is open.

**Living Room (8 min) — trust-building, first fractures.** The largest hotspot count (~10). Contains the reading chair, the wall of framed photos (one frame is empty; Mara narrates the photo that "is" in it), the phone with a full answering machine, and the key ring (found puzzle: under the chair cushion, hinted by the floor tracks). Two fractures live here. The kitchen unlocks when the answering machine has been played.

**Kitchen (6 min) — the calendar puzzle.** A wall calendar with Edith's handwriting contradicting Mara's stated visit dates. The core puzzle: cross-reference the calendar, the expired items in the fridge, and the two sets of dishes in the drying rack to work out that someone was eating here after Edith died. Solving it (clicking the three elements in any order after examining all) registers a double fracture and triggers the three-fracture environmental shift: the hallway at the edge of the screen is now photographed at a slightly different time of day. Bathroom unlocks.

**Bathroom (5 min) — the notebook.** Smallest room, heaviest content. The UV nightlight reveals the notebook's legible pages (interactive: player drags the notebook into the light's glow — the game's only drag interaction, kept dead simple). Edith's entries are the counter-narration and recontextualize every fracture found so far. The five-fracture shift triggers here if thresholds are met: Mara's Examine text begins responding to things the *player* does — "You keep looking at everything twice. Edith used to do that."

**Second Bedroom (8 min) — finale.** Locked until the player has the key ring *and* has read the notebook. The room Mara claims is "just storage." Inside: a made bed, recent laundry, and the Polaroid camera. The player photographs the room (using the last exposure — this is the Ending A stinger being planted). Final narration sequence and the Doubt Prompt play here.

### Puzzle dependency graph

```
Entry Hall ──► Living Room ──► answering machine ──► Kitchen
                  │                                     │
                  └─► key ring (under chair)      calendar puzzle
                                │                       │
                                │                  Bathroom ──► notebook + UV light
                                │                       │
                                └───────┬───────────────┘
                                        ▼
                               Second Bedroom ──► Polaroid ──► Finale
                                                     │
                          fractures (7 total, ≥5) ──►│──► Doubt Prompt ──► Ending B
                                                     └──► Ending A (default)
```

Design rule: the critical path (Endings A) must be completable by a player who never notices a single lie. The fractures are strictly parallel content — this keeps the game jam scope honest and makes Ending B feel earned rather than mandatory.

## 6. Art Direction — Photo Pipeline

**Shoot one real apartment.** All five rooms photographed in a single location (the developer's own home or a borrowed one) in one session, tripod-locked. Each room needs a base plate plus variant plates for state changes (drawer open/closed, bedroom door ajar, time-of-day shift for the three-fracture beat). Estimated shot list: ~25 photographs.

**Grade for unease, not for horror.** Slightly desaturated, slightly too-warm interior light, deep window shadows. Avoid horror clichés (no grime overlays, no vignetting cranked to eleven). The photos should look like a real estate listing that something is wrong with.

**Hotspots are invisible polygons** over the photo — no outlines, no sparkles. A soft cursor change is the only affordance. Pixel-hunting is prevented by a "hold spacebar to breathe" accessibility option that briefly dims everything except hotspot regions, diegetically framed as Mara steadying herself.

**State changes are photo swaps with a 400ms crossfade**, never cuts. The scariest moments in this game are two nearly identical photographs dissolving into each other.

**Practical note on the fracture shifts:** shoot the variant plates in the same session with controlled changes (move the chair 10cm, remove one frame, change a lamp). Subtle physical differences between real photos read as deeply uncanny in a way that digital edits rarely do.

## 7. Audio

One room-tone ambient loop per room (fridge hum, pipe ticks, street bleed), a single piano-and-tape-hiss motif for Mara that detunes fractionally as fractures accumulate, and hard silence — reserved exclusively for Look Again descriptions. Mara's narration is text-only in the base scope; the objective voice must never gain audio even if narration VO is added later, because the asymmetry (a voice you hear vs. text you read) reinforces which account is performing for you. Total estimated audio assets: 5 loops, 1 motif with 3 detuned variants, ~8 stingers.

## 8. UI / UX

Single fixed-resolution stage (1280×720, letterboxed) with the photo filling the frame and a translucent text band along the bottom for narration. No verb bar — one-click Examine, second-click Look Again, contextual cursor for the three item interactions. Inventory is three fixed slots in the top corner, visible only after the first item is found. A pause menu carries volume, text speed, the breathe/highlight accessibility toggle, and content notes. Autosave on every room transition; a 30-minute game earns the right to have no manual save UI at all.

Text presentation is a first-class system: narration types on at a readable pace, Look Again text appears instantly and complete (objectivity doesn't perform), and the endgame text-corruption effects (overwriting, misaligned words) are implemented in the same text renderer rather than as canned images, so they can be tuned in playtesting.

## 9. Technical Architecture

**Stack:** vanilla TypeScript + HTML/CSS on a single canvas-free DOM stage (photos as layered `<img>`, hotspots as SVG polygons, text as styled DOM). No engine dependency — the entire interaction model is "click polygon, run script, swap image, show text," which a framework would only obscure. Ships as a static site (~15 MB with compressed photos), hostable on itch.io or any static host.

**Data-driven content.** Rooms, hotspots, narration lines, contradictions, and fracture triggers live in a single `game.json`. Each hotspot entry carries `examine`, `lookAgain`, an optional `fractureId`, and optional state conditions. This makes the writing iterable without touching code and lets the full lie/truth ledger be audited in one file.

**State model:** a flat store of booleans and counters (`fractures`, `hasKeyring`, `readNotebook`, `roomStates`), serialized to `IndexedDB`-backed save (or in-memory with autosave to a downloadable save code if storage is unavailable). Deterministic and trivially testable.

**Claude-assisted workflow (why this spec fits a solo dev):** the engine, the JSON schema, and a headless validator that walks the dependency graph and proves (a) both endings reachable, (b) no hotspot unreachable, (c) all seven fractures collectible before the finale — all of that is a few sessions of Claude-driven development. The writing workflow is: developer drafts Mara's voice for 3–4 hotspots to establish tone, then uses Claude to draft the remaining ~45 narration pairs in that voice, punching up by hand. The contradiction ledger (which lies map to which truths) should be authored by the human first and treated as canon; Claude drafts *to* the ledger, never invents new lies.

## 10. Scope & Production Plan

Target: 4–6 weeks part-time, or one intense jam fortnight.

**Week 1 — Vertical slice:** engine, Entry Hall + Living Room, Examine/Look Again working, 1 fracture live. Kill criterion: if the Examine/Look Again loop isn't unsettling with placeholder photos by end of week 1, redesign before building more.
**Week 2 — Content spine:** all rooms navigable, critical path completable, photography session done.
**Week 3 — The lies:** full narration pass, all 7 fractures, environmental shift plates in.
**Week 4 — Endings, audio, corruption text effects.**
**Weeks 5–6 — Playtest and tune.** The single most important playtest question: *at what point did you first suspect the narrator?* Target answer: living room for attentive players, bathroom for everyone. If players suspect in the entry hall, the early lies are too loud; if they reach the bedroom trusting Mara, they're too quiet.

**Content totals:** 5 rooms, ~35 hotspots, ~50 narration pairs (~6,000 words), 3 items, 7 fractures, 2 endings, ~25 photos, ~17 audio assets.

## 11. Non-Goals

No voice acting in v1 (text asymmetry is load-bearing; VO would also double the budget). No mobile/touch layout (hover affordances matter; post-jam consideration). No jump scares — one is tempting in the bedroom reveal and it would cheapen everything around it. No randomization or roguelike replay structure; the two-ending replay (playing again *knowing*, watching Mara lie) is the entire replay value and it's enough. No lore expansion explaining who the narrator really is — the ambiguity is a feature and answering it is a sequel's problem, if ever.

## 12. Open Questions

For the writer (you): does Mara know she's lying, or does she believe herself? The narration reads differently depending on the answer, and it should be decided before the writing pass, even though the game never states it. For playtesting: is seven fractures the right count for a 30-minute game, or does five give better hit-rate for Ending B? For production: shoot the apartment with a phone (fast, authentic) or borrow a camera (more grading latitude)? Recommendation: phone, stabilized — authenticity beats fidelity for this aesthetic. For accessibility review: does the misaligned-word accusation mechanic in the finale work with screen readers, and what is the equivalent affordance? (Blocking before final build, not before development.)

## 13. Success Criteria

This is a jam-scope art game, so success is qualitative: median playthrough lands between 25 and 40 minutes; a majority of playtesters find at least three fractures unprompted; at least a third reach Ending B on their first run; and in exit interviews, players describe the game's scariest moment as a line of text or a photo change rather than any single event — if they do, the central design bet paid off.
