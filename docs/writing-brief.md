# Writing Brief — *What the Light Touched*

This is the working brief for the narration pass. It tells you (the writer) exactly **what to write**, **where it lives**, and **which structural rules the story must obey** — because in this game the structure is not a suggestion: the engine enforces it, and an automated validator re-proves the game completable after every edit.

Companion documents: `specs/design-spec-what-the-light-touched.md` (the design bible) and `public/game.json` (the single file you will edit — all prose lives there and nowhere else).

---

## 1. How the pipeline works

- **Every line of the game is a string in `public/game.json`.** You edit that file only. No code changes, ever.
- Every placeholder line is marked `[PLACEHOLDER]` (variants: `[PLACEHOLDER LIE]`, `[PLACEHOLDER DEFENSIVE]`, `[PLACEHOLDER META]`, `[PLACEHOLDER LOCK]`, `[PLACEHOLDER STINGER]`). The writing pass is done when no `[PLACEHOLDER` remains in the file.
- After any edit, someone runs `npm run check`. This validates the file's structure and re-proves that both endings are reachable and all 7 fractures collectible. If you break a rule in §5, this command tells you, by name.
- The placeholder copy currently in the file is **scaffolding in the right shape** — it demonstrates the register, length, and function of each slot. Treat it as a stage direction, not a draft to polish.

## 2. Decide these before writing a single line

These are open questions from the spec that change how everything reads. Decide them first; they are cheap to decide and expensive to retrofit.

1. **Does Mara know she's lying, or does she believe herself?** (Spec §12.) The game never states the answer, but every examine line leans one way or the other. A knowing narrator performs; a believing narrator flinches. Pick one and hold it.
2. **The Edith notebook voice.** The single `revealText` slot is currently one journal entry. Edith is the counter-narrator — the only other voice in the game. Decide her register (clipped? precise? frightened-but-controlled?) before writing her one big moment.
3. **Sting placement** (engineering decision that affects your text): several audio stings currently fire during Look Again moments, where the game is hard-silenced by design — meaning they are inaudible. Either the stings move to examine beats (then your examine lines should carry the "discovery" beat) or the rule changes. Ask before writing the pickup lines (`chair-cushion`, `junk-drawer`, `desk`).

## 3. The two voices (style guide)

### Mara — the `examine` fields
- First person, past tense, warm, possessive of the story: *"She'd sit here every night with her tea."*
- She is performing intimacy for you. She volunteers detail nobody asked for. She editorializes.
- She may address the player directly ("you"), affectionately, escalating to defensively at higher fracture tiers.
- Length: 1–3 sentences, ~15–40 words. Text types on at 40 chars/sec — a 40-word line takes ~6 seconds; respect the player's patience.
- **Never signal a lie.** No tremor, no ellipsis-heavy hesitation on the lying lines. The lie must be *findable only by comparison with the Look Again*. If the lie is audible in her voice, the mechanic dies.

### The objective voice — the `lookAgain` fields
- Second person, present tense, clipped, zero personality: *"A chair facing the wall, not the window."*
- Sentence fragments welcome. No metaphor, no judgment, no fear. It describes; it never interprets. ("The door in the reflection is open wider than the door" is as far as it ever goes — a fact that happens to be impossible.)
- Length: 1–3 short sentences, ~8–25 words. This text appears instantly and silently — it should read in one glance.
- **It never gains audio and it never emotes.** The one exception to its restraint is the very last line of the game (§8.3), which stays objective in grammar while being devastating in content — that contrast is the design's final beat.

### The trust ratio
Roughly **three quarters of pairs must agree**. Where they agree, the Look Again should *confirm and slightly enrich* Mara's account — that's what trains the player to trust her. Only the ledger lines (§4) may contradict. If a neutral pair drifts into accidental contradiction, the early game gets too loud and players suspect her in the entry hall (spec's failure condition).

## 4. Canon: the contradiction ledger

**This table is canon and human-owned.** Every lie in the game maps to exactly one row. Do not invent new lies outside it; do not soften a truth so far the contradiction disappears. If a draft is written to the ledger, the ledger governs; if you want to change a row, change the ledger first, deliberately.

| id | where (hotspot) | Mara's lie (examine) | The physical truth (lookAgain) |
|----|-----------------|----------------------|--------------------------------|
| f1 | entry / `shoe-mat` | The second pair of shoes is "my old boots," left years ago | Two pairs, different sizes, **both** freshly muddy |
| f2 | living / `reading-chair` | Edith at peace, tea by the window | Chair faces the wall (watching the bedroom door); scratched armrests; drag tracks |
| f3 | living / `photo-wall` | Narrates a specific photo in a frame that is empty | Six frames, five photos; the empty one's glass freshly handled |
| f4 | kitchen puzzle (`calendar`) | "I visited every week" | The visit entries continue past Edith's death date |
| f5 | kitchen puzzle (`drying-rack`) | "She ate alone" | Two of everything in the rack, still wet |
| f6 | bathroom / `medicine-cabinet` | "I counted her pills with her on Sundays" | Seals intact; fills stop eleven weeks ago |
| f7 | bedroom / `bed` | "Just storage / a guest bed never used" | Made bed, head-shaped pillow, sheets washed this week |

Notes:
- **f1** is the "gentle" tutorial-adjacent lie — it should be the *quietest*, deniable on first read.
- **f4/f5** are registered by the kitchen puzzle, not by the two-click pair — but the calendar and drying-rack text still carry the lie/truth pair the player reasons over.
- The lie's *content* can be redrafted freely (better boots, different photo anecdote) as long as the **lie→truth axis of each row survives**, because the environmental storytelling (and eventually the photography) is built on these specific contradictions.

## 5. Structural rules the story must conform to

These are enforced by the engine and/or validator. Breaking one either fails `npm run check` or silently breaks the game.

**Hard structure (do not fight it):**
1. **Room order is fixed:** Entry → Living → Kitchen → Bathroom → Bedroom. Gates: the answering machine must be examined to open the kitchen; the calendar+fridge+dishes must all be examined to open the bathroom; the key ring must be found *and* the notebook read to open the bedroom.
2. **Every hotspot has exactly two texts** (examine + lookAgain). There is no third click, no follow-up line, no branching within a hotspot.
3. **A fracture registers when the player has seen both halves** of a ledger pair. Nothing announces it. Never reference "fractures," counts, or the mechanic in any text.
4. **Ending A must read complete and warm to a player who caught nothing.** The critical path is playable while trusting Mara entirely; nothing on it may *require* the player to have understood a lie. (Ending A players still solved the kitchen puzzle — they noticed the timeline is strange — so Mara's post-kitchen lines can carry the faintest strain, but her story must hold.)
5. **The accusation word** (`finale.accuseWord`) must appear **verbatim** inside the beat at `finale.accuseBeatIndex`. If you rewrite beat 3, keep one word that can carry the whole game when clicked (currently *"afraid"*). One word, present exactly once in that beat. The validator checks this.
6. **Escalating narration is tier-gated, not rewritten.** The `examineTiered` variants replace the base examine when the player has found enough fractures (tier 1 = 3+ fractures, tier 2 = 5+). Base text must work for a player who never triggers them.
7. **Locked-exit lines are Mara steering you.** They are her *excuses* (`lockedText`), and they double as soft hints toward the actual unlock condition. The bathroom→bedroom one is, per the spec, the biggest lie in the game ("just storage").
8. **The notebook is legible exactly once**, in the bathroom, under the UV light (`drag.revealText`). This is Edith's only speaking slot and it recontextualizes every fracture found so far. It fires after the kitchen (notebook found there) and before the bedroom can open.

**Tone rules from the spec (design-enforced):**
- No jump scares, no gore, no monster. The horror is the gap between the two voices.
- Target suspicion curve: attentive players first doubt Mara in the **living room**; everyone doubts her by the **bathroom**. If your entry-hall lines already feel wrong, quiet them; if playtesters reach the bedroom trusting her, the living-room lies are too subtle.
- Whether the narrator is a stranger, a delusion, or something worse **stays unresolved**. No text may answer it — including Edith's journal and the mirror line.

## 6. What you may edit vs. what you must not touch

**Freely editable (your canvas) — all of these are plain strings:**
`examine`, `examineTiered[].text`, `lookAgain`, `lockedText`, `drag.revealText`, `finale.beats[]`, `finale.endingA[]`, `finale.endingB.corrupt[][]`, `finale.endingB.mirrorLookAgain`, room `name`s.

**Do not touch without an engineer (these are load-bearing):**
- Any `id` (rooms, hotspots, fractures, puzzles) — flags and saves reference them by name.
- Anything inside `polygon`, `plates`, `onExamine`, `onLookAgain`, `onSolve`, `onRevealed`, `visibleWhen`, `unlockedWhen`, `fractureShifts`, `spawnAt`, `glowPolygon`.
- `accuseBeatIndex` / `minFractures` / `fractureIds` — tuning knobs, not prose.
- You **may** change `accuseWord`, but it must match a word in the accuse beat exactly (see §5.5).

**Adding hotspots:** the spec budgets ~35 hotspots; we shipped 30. You may propose up to ~5 more (each is a full examine/lookAgain pair plus a polygon an engineer must trace over the final photos). Propose them as text first; don't add them to the file yourself.

## 7. Slot inventory — everything to be written

~50 narration pairs and singletons, ~6,000 words total budget. Every slot below currently holds shaped placeholder copy. Column key: **L** = ledger lie (write to §4), **T** = tiered variant exists, **fn** = the line has a mechanical function your text must honor.

### Entry Hall (tutorial: teach trust) — 4 pairs
| hotspot | notes |
|---|---|
| `coat-rack` | Truthful pair. Warm, unremarkable. Teaches the two-voice rhythm. |
| `mail-pile` | Truthful pair. The "eleven weeks" postmark detail quietly seeds the timeline — keep a duration fact here. |
| `light-switch` | Truthful pair. Small, domestic. |
| `shoe-mat` | **L (f1)** — the gentle lie. Must read innocent on a first visit; damning on a second. |

### Living Room (trust-building, first fractures) — 10 pairs + 1 lock
| hotspot | notes |
|---|---|
| `reading-chair` | **L (f2), T (tier 1 defensive)**. The spec's flagship example pair — the anchor of the whole voice. |
| `chair-cushion` | **fn:** Look Again finds the key ring. Mara's examine should *discourage* the second look without forbidding it. |
| `floor-tracks` | Truthful-ish pair, **fn:** the hint chain to the cushion. Objective text must point at the cushion ("they pass under…"). |
| `photo-wall` | **L (f3), T (tier 1 defensive)**. Mara's examine must narrate a *specific, vivid* photo — the one that isn't there. Make it her best story in the game. |
| `answering-machine` | **fn:** examining unlocks the kitchen. Mara plays and paraphrases the messages, then dismisses them. The Look Again ("played before, recently") is one of the quietest horror lines — keep it. |
| `telephone` | Truthful pair; the overwritten emergency number is a free unease detail. |
| `tea-cup` | Truthful pair; sensory contradiction (she "smells" it; it smells of nothing) — this one flirts with the line, keep it deniable. |
| `bookshelf` | Truthful pair; spine-in books = someone hiding titles. |
| `window` | Truthful pair; nailed curtain. |
| `last-box` | Truthful pair; "the tape gun is warm" — someone was just here. Meta-adjacent; keep dry. |
| exit→kitchen `lockedText` | Mara's excuse + hint: play the messages. |

### Kitchen (the calendar puzzle) — 6 pairs + 1 lock
| hotspot | notes |
|---|---|
| `calendar` | **L (f4), fn: puzzle 1/3.** Mara reads the calendar *as proof of devotion*. The Look Again must state the date overrun plainly enough to cross-reference. |
| `fridge` | **fn: puzzle 2/3.** Examine is chore-talk; Look Again carries fresh-food-after-death evidence. |
| `drying-rack` | **L (f5), fn: puzzle 3/3.** "She ate alone" vs. two of everything. |
| `pill-organizer` | Truthful pair that *rhymes with* f6 (full wells, dust). Foreshadows the bathroom. |
| `kettle` | Truthful pair; chamomile gone, coffee new — someone else's habits. |
| `junk-drawer` | **fn:** Look Again finds the notebook. Mara's examine should wave you off the drawer. The "ink only ghosts" line sets up the UV reveal — keep that causality. |
| exit→bathroom `lockedText` | Mara *keeps you in the kitchen* — she wants her version of the timeline admired. Doubles as the puzzle hint (calendar, fridge, dishes). |

### Bathroom (the notebook; heaviest room) — 5 pairs + 1 lock + Edith
| hotspot | notes |
|---|---|
| `uv-nightlight` | **fn: drag target.** The examine/lookAgain should teach that the violet light *reveals* (grout handprints) so the player thinks to drag the notebook into it. |
| `medicine-cabinet` | **L (f6), T (tier 2 META)**. The tier-2 variant is the spec's turn: Mara starts narrating *the player's behavior* ("You keep looking at everything twice. Edith used to do that."). Preserve that function exactly. |
| `sink` | Truthful pair; dry toothbrush, wet soap. |
| `towels` | Truthful pair; one towel damp. |
| `mirror` | Truthful-ish; the reflection line is the game's one permitted impossible fact. Also plants the Ending B mirror. |
| exit→bedroom `lockedText` | **The biggest lie in the game.** "Just storage." Write it tender. |
| `drag.revealText` | **EDITH'S VOICE.** The counter-narration. Currently one entry; you have one string — you may write 2–4 short dated entries within it (it renders as a single typed passage). It must recontextualize the fractures found so far *without naming the narrator's nature* (§5, tone rules). This is the game's largest single writing slot. |

### Second Bedroom (finale room) — 5 pairs
| hotspot | notes |
|---|---|
| `bed` | **L (f7).** The room itself falsifies "storage" — Mara's line should be almost bored. |
| `laundry` | Truthful pair; inside-out shirt. |
| `closet` | Truthful pair; sleeping bag "rolled tight, recently used." |
| `desk` | **fn:** Look Again finds the Polaroid (counter shows 1 — the last exposure; Ending A's stinger is planted here). |
| `doorway-view` | **fn: takes the photo, starts the finale.** Appears only once the camera is held. Mara's examine hands you the camera ("Frame it kindly") — her last act of directing your eyes. The Look Again is the shutter beat. |

### The Finale (see §8) — 3 beats + 2 Ending-A lines + 3 corrupt pairs + 1 mirror line

## 8. The finale — special mechanics

### 8.1 Mara's closing account (`finale.beats`, 3 beats)
Three text boxes, clicked through. This is Mara's summation — her story, complete, told beautifully. Rules:
- Beat 3 (index 2) carries the **accuse word**. At 5+ fractures it renders *very slightly wrong* — misaligned by a pixel and a fraction of a degree. Nothing else marks it. Your job: make beat 3 a sentence where one word bears all the weight, so clicking it *feels like an accusation*, not a UI action.
- Below 5 fractures the word is inert and the beats must read as a clean, moving eulogy — Ending A players see nothing else.

### 8.2 Ending A — "The Story Holds" (`finale.endingA`, 2 lines)
Line 1: closure in Mara's voice — she thanks you. Line 2 accompanies the credits stinger: the Polaroid develops on screen with **two shadows** in the frame. The line should *not* explain the shadows; understate it or say nothing about them at all (the image does the work — this line can be pure credits text).

### 8.3 Ending B — "Look Again"
- **`corrupt` pairs (3):** Mara's voice and the objective voice overwrite each other word-by-word on screen. Each pair = [her claim, cut off mid-sentence] + [the fact that interrupts it]. Write them as collisions: her line should break at the exact point the fact contradicts. The current three (gently— / chair faced the door; every week— / calendar kept counting; I am Mara. I am— / the second bed is warm) show the escalation shape: circumstance → timeline → identity. Keep that ladder.
- **`mirrorLookAgain` (one line):** the last text in the game. Objective voice, objective grammar — *and it must be the only objective description in the game the player wishes had been narration* (spec §4, fixed design requirement). It renders alone over black, in the objective voice's typeface. It must not resolve who the narrator is. This is the hardest line in the project; budget real time for it.

## 9. Delivery checklist

- [ ] All `[PLACEHOLDER` markers gone from `public/game.json`
- [ ] Every ledger row (§4) intact: lie in the examine, truth in the lookAgain, same hotspot
- [ ] No non-ledger pair accidentally contradicts itself
- [ ] `accuseWord` appears exactly once, verbatim, in `beats[accuseBeatIndex]`
- [ ] Tiered variants read as escalations of their base line, not replacements of its facts
- [ ] Each `lockedText` still hints its own unlock (messages / calendar-fridge-dishes / keys+notebook)
- [ ] Word count in the neighborhood of 6,000; no examine over ~45 words
- [ ] `npm run check` passes (validates structure + proves both endings still reachable)
- [ ] Read-aloud pass: Mara's lines in one sitting, in order — her arc (warm → proud → defensive → performing) should be audible with the truths removed

## 10. Reference: current word-shape of the placeholder copy

The shipped placeholders average ~20 words per examine and ~14 per lookAgain. That proportion (Mara talks more than the world does) is deliberate — she is filling silence; the apartment only answers questions. Keep her wordier than the truth, always.
