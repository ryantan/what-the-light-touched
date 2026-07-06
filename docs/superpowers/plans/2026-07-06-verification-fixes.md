# Verification-Pass Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the four issues found while verifying the photo-plate build: the unreadable shutter line, stings swallowed by Look Again silence, the favicon 404, and readable gibberish lettering in two plates.

**Architecture:** Two small engine changes (a wait in `Finale.start()`, a one-slot sting queue in `AudioManager`), one HTML line, and one asset regeneration pass via the nanobanana MCP server. No schema or game.json prose changes.

**Tech Stack:** Vanilla TypeScript + DOM, Vitest (happy-dom), Vite, nanobanana MCP (Gemini image editing), macOS `sips` for resize/encode.

## Global Constraints

- `npm run check` (typecheck + 101 tests + reachability validator) must pass before **every** commit.
- Commits are atomic, one per task, conventional-commit style (`fix(engine): …`, `chore(ui): …`, `fix(art): …` — match `git log` conventions).
- Stage is fixed 1280×720; plates are 1280×720 JPEG, quality 85, in `public/photos/`.
- **The photo is the objective voice:** no plate may contradict any `lookAgain` line in `public/game.json`. After any plate edit, re-read the room's `lookAgain` lines against the image.
- **No readable text in any plate** (generated lettering is gibberish; all dates/names are carried by narration).
- The contradiction ledger in `docs/writing-brief.md` §4 is canon — do not alter any lie/truth axis.
- Tasks 1–4 are committed work. Task 5 is OPTIONAL and gated on an explicit go-ahead from Ryan.

**Asset inputs:** full-resolution PNGs from the generation session live in the session scratchpad (`/private/tmp/claude-501/-Users-ryantan-projects-games-what-the-light-touched-v1/bc4d4a19-427e-4258-96b7-9f6378032ab9/scratchpad/`). If that directory is gone, use the shipped JPEGs in `public/photos/` as edit inputs instead — they are 1280×720 but fine as nanobanana sources.

---

### Task 1: Finale waits for a click so the shutter Look Again is readable

The bug: `doorway-view`'s `onLookAgain` runs `startFinale` immediately, and `Finale.start()`'s first act is to show beat 1 — which overwrites the Look Again line "Through the viewfinder the room is smaller. You press the shutter…" before anyone can read it. Verified live: the text is never visible. The fix: `start()` waits for one stage click before the beats begin. Hard silence (a Look Again is on screen) also correctly holds until that click, so `exitSilence()` moves after the wait.

**Files:**
- Modify: `src/engine/finale.ts:21-27` (`start()`)
- Test: `tests/finale.test.ts`

**Interfaces:**
- Consumes: `TextBox.showObjective(sourceId: string, text: string): void`, `textBox.el: HTMLElement` (both existing).
- Produces: `Finale.start(): Promise<void>` — unchanged signature, new contract: the first beat renders only after one stage click.

- [ ] **Step 1: Write the failing test**

Append inside the `describe('Finale', …)` block in `tests/finale.test.ts`:

```ts
  it('holds the pre-finale text until a click, then shows the first beat', async () => {
    const { stageEl, finale, textBox } = setup(0)
    textBox.showObjective('doorway-view', 'You press the shutter.')
    const done = finale.start()
    await vi.advanceTimersByTimeAsync(2000)
    // the Look Again line must still be on screen — not beat 1
    expect(textBox.el.textContent).toBe('You press the shutter.')
    click(stageEl)
    await vi.advanceTimersByTimeAsync(1000)
    expect(textBox.el.textContent).toContain('She was at peace here')
    click(stageEl) // advance past the beat
    await vi.advanceTimersByTimeAsync(3000)
    click(stageEl) // advance past the ending-A line
    await vi.advanceTimersByTimeAsync(3000)
    await done
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/finale.test.ts -t "holds the pre-finale"`
Expected: FAIL — `textBox.el.textContent` is already `'She was at peace here. I am certain of that.'` (beat 1 clobbered the shutter line).

- [ ] **Step 3: Implement the wait in `start()`**

In `src/engine/finale.ts`, change the top of `start()` from:

```ts
  async start(): Promise<void> {
    this.deps.audio?.exitSilence()
    const { beats, accuseBeatIndex, accuseWord, minFractures } = this.deps.game.finale
```

to:

```ts
  async start(): Promise<void> {
    // The doorway-view Look Again ("…You press the shutter…") is on screen
    // when we're launched. Hold — silence included — until the player clicks,
    // or the first beat overwrites a line nobody got to read.
    await this.waitForAdvance()
    this.deps.audio?.exitSilence()
    const { beats, accuseBeatIndex, accuseWord, minFractures } = this.deps.game.finale
```

(`waitForAdvance()` already exists at `src/engine/finale.ts:56` and attaches its click listener synchronously, so a click immediately after `start()` is caught.)

- [ ] **Step 4: Update the five existing finale tests for the new leading click**

Every existing test in `tests/finale.test.ts` calls `finale.start()` and assumes beat 1 renders immediately. Insert one `click(stageEl)` directly after each `finale.start()` call:

```ts
    const done = finale.start()   // or: void finale.start()
    click(stageEl)                // <— new: begin the beats
```

That's tests: `'below threshold: no accuse span…'`, `'at threshold: the accuse word…'`, `'clicking the accuse word triggers Ending B…'`, `'advancing without accusing…'`, and `'exits hard silence at the start…'`.

The silence test also asserts the old timing. Change its opening from:

```ts
    void finale.start()
    expect(audio.exitSilence).toHaveBeenCalled()
```

to:

```ts
    void finale.start()
    expect(audio.exitSilence).not.toHaveBeenCalled() // silence holds on the shutter line
    click(stageEl)
    await vi.advanceTimersByTimeAsync(0) // flush the awaited click before asserting
    expect(audio.exitSilence).toHaveBeenCalled()
```

(The click resolves `waitForAdvance()`'s promise, but `exitSilence()` runs in the microtask after it — flush with a zero-length timer advance before asserting.)

- [ ] **Step 5: Run the file, then the full check**

Run: `npx vitest run tests/finale.test.ts` — Expected: all 6 tests PASS.
Run: `npm run check` — Expected: green, `OK — game is completable.`

- [ ] **Step 6: Commit**

```bash
git add src/engine/finale.ts tests/finale.test.ts
git commit -m "fix(engine): hold finale until a click so the shutter Look Again is readable"
```

---

### Task 2: Stings fired during Look Again silence queue instead of vanishing

The design rule (spec §7) is that Look Again is hard-silenced and never gains audio — but the three pickup stings (`found` ×3, `shutter`) fire from `onLookAgain` effects, so `AudioManager.sting()` currently drops them (`if (…|| this.silenced) return`). Once real audio assets exist they'd be inaudible every time. Resolution of writing-brief §2.3: keep the silence rule, queue the sting, and play it the moment silence exits — the discovery beat lands just as Mara starts talking over it. One slot is enough: two stings can't fire in one silence window (each Look Again is one hotspot, one effect list).

**Files:**
- Modify: `src/engine/audio.ts` (`sting()`, `exitSilence()`, `state()`)
- Test: `tests/audio.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `sting(id: string): void` — unchanged signature; new contract: while silenced, remembers the latest `id` and plays it on the next `exitSilence()`. `state()` gains `pendingSting: string | null`.

- [ ] **Step 1: Write the failing test**

Append inside `describe('AudioManager', …)` in `tests/audio.test.ts` (reuses the file's existing `makeStubCtx`):

```ts
  it('queues a sting fired during silence and plays it when silence exits', () => {
    let oscs = 0
    const ctx = makeStubCtx()
    const origCreate = ctx.createOscillator.bind(ctx)
    ;(ctx as unknown as { createOscillator: () => unknown }).createOscillator =
      () => { oscs++; return origCreate() }
    const a = new AudioManager(() => ctx)
    a.init()
    a.playRoomTone('entry')
    const base = oscs
    a.enterSilence()
    a.sting('found')
    expect(oscs).toBe(base)                    // not played during silence
    expect(a.state().pendingSting).toBe('found')
    a.exitSilence()
    expect(oscs).toBe(base + 1)                // plays as the silence lifts
    expect(a.state().pendingSting).toBeNull()
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run tests/audio.test.ts -t "queues a sting"`
Expected: FAIL — `state()` has no `pendingSting` property (TS error) or `oscs` stays at `base` after `exitSilence()`.

- [ ] **Step 3: Implement the one-slot queue**

In `src/engine/audio.ts`, add a field beside the other privates:

```ts
  private pendingSting: string | null = null
```

Extend `state()`:

```ts
  state() {
    return { room: this.room, silenced: this.silenced, detune: this.detune, volume: this.volume, pendingSting: this.pendingSting }
  }
```

Replace `exitSilence()` and `sting()`:

```ts
  exitSilence(): void {
    this.silenced = false
    this.applyGain()
    const queued = this.pendingSting
    this.pendingSting = null
    if (queued) this.sting(queued)
  }

  sting(id: string): void {
    if (!this.ctx || !this.master) return
    if (this.silenced) { this.pendingSting = id; return }
    const osc = this.ctx.createOscillator()
    osc.frequency.value = 220
    const g = this.ctx.createGain()
    g.gain.value = 0.1
    osc.connect(g)
    g.connect(this.master)
    osc.start()
    osc.stop((this.ctx.currentTime ?? 0) + 0.3)
  }
```

(The oscillator body is the existing placeholder-synth code, moved unchanged; the parameter was `_id` before — it is used now, so rename it `id`.)

- [ ] **Step 4: Run the file, then the full check**

Run: `npx vitest run tests/audio.test.ts` — Expected: all tests PASS, including the pre-existing `'does not throw'` silence test.
Run: `npm run check` — Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/engine/audio.ts tests/audio.test.ts
git commit -m "fix(engine): queue stings fired during Look Again silence until silence exits"
```

---

### Task 3: Favicon

Every page load 404s on `/favicon.ico` (seen in all verification runs). Inline a data-URI emoji favicon — no new asset file, nothing for the release zip to pick up.

**Files:**
- Modify: `index.html:5-6` (inside `<head>`)

**Interfaces:** none.

- [ ] **Step 1: Add the icon link**

In `index.html`, after the `<title>` line, add:

```html
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔦</text></svg>" />
```

- [ ] **Step 2: Verify the 404 is gone at the running app**

With `npm run dev` up, run (needs `puppeteer-core` — `npm i puppeteer-core` in a temp dir if absent, per `.claude/skills/verify/SKILL.md`):

```bash
node -e "
import('puppeteer-core').then(async ({default: p}) => {
  const b = await p.launch({executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new'})
  const pg = await b.newPage()
  const fails = []
  pg.on('response', r => { if (r.status() >= 400) fails.push(r.status() + ' ' + r.url()) })
  await pg.goto('http://localhost:5173/', {waitUntil: 'networkidle0'})
  await new Promise(r => setTimeout(r, 800))
  console.log(fails.join('\n') || 'no 4xx/5xx responses')
  await b.close()
})"
```

Expected: `no 4xx/5xx responses`.

- [ ] **Step 3: Run check and commit**

Run: `npm run check` — Expected: green.

```bash
git add index.html
git commit -m "chore(ui): add inline emoji favicon, silence the /favicon.ico 404"
```

---

### Task 4: Remove readable gibberish lettering from the kitchen and bedroom plates

The kitchen plate's takeaway menus and the bedroom plate's box labels carry faint generated lettering (gibberish up close). Both violate the no-readable-text rule. The bedroom base has a derived variant (`bedroom-shift7.jpg`) which **must be re-derived from the edited base** — editing only the base would make the 7-fracture crossfade flash the box labels in and out.

**Files:**
- Modify: `public/photos/kitchen-base.jpg`, `public/photos/bedroom-base.jpg`, `public/photos/bedroom-shift7.jpg` (binary replacements)

**Interfaces:**
- Consumes: nanobanana MCP (`mcp__nanobanana__generate_image` — load via ToolSearch `select:mcp__nanobanana__generate_image` first) and `sips`.
- Produces: same three file paths, same 1280×720 JPEG format — nothing else references them.

- [ ] **Step 1: Edit the kitchen plate**

Call `mcp__nanobanana__generate_image` with `input_image_path_1` = the scratchpad `kitchen-base-v2.png` (fallback: `public/photos/kitchen-base.jpg`), `aspect_ratio` `16:9`, `model_tier` `nb2`, `output_path` `<scratchpad>/kitchen-base-v3.png`, prompt:

> Edit this photograph. ONE change only: the paper takeaway menus spilling out of the open drawer — make their printed text completely illegible, just soft ink-coloured smudges and blocks, no recognizable letters. Keep the menus themselves, their colours and positions, and everything else in the image pixel-identical.

- [ ] **Step 2: Edit the bedroom base plate**

Same call shape, input = scratchpad `bedroom-base-v2.png` (fallback: `public/photos/bedroom-base.jpg`), output `<scratchpad>/bedroom-base-v3.png`, prompt:

> Edit this photograph. ONE change only: the printed labels and any lettering on the stacked cardboard boxes — replace with plain unmarked cardboard or faded illegible smudges, no recognizable letters. Everything else stays pixel-identical: bed, pillow depression, wardrobe, sleeping bag, sewing table, the Polaroid camera on the floor, laundry basket.

- [ ] **Step 3: Re-derive the shift7 variant from the edited base**

Same call shape, input = `<scratchpad>/bedroom-base-v3.png`, output `<scratchpad>/bedroom-shift7-v2.png`, prompt (same shift instruction as the shipped variant):

> Edit this photograph. TWO changes only: (1) the hallway visible through the open doorway at the top centre is now considerably darker, as if its lights went out, its far end falling into shadow; (2) the head-shaped depression in the bed's pillow is slightly deeper and more defined. Everything else stays pixel-identical: bed, sheets, wardrobe, sleeping bag, sewing table, camera, laundry basket, boxes, framing, room light.

- [ ] **Step 4: Inspect all three results with the Read tool**

Read each output PNG. Check against the room's `lookAgain` lines in `public/game.json`, specifically: kitchen rack still shows exactly two plates / two cups / two forks; bedroom still shows the pillow depression, dust-free sleeping bag, Polaroid on the floor in the desk's shadow, inside-out top shirt; shift7 differs from the new base **only** in hallway darkness and pillow depth. Any drift → rerun that single step.

- [ ] **Step 5: Convert into place**

```bash
sips -z 720 1280 <scratchpad>/kitchen-base-v3.png   -s format jpeg -s formatOptions 85 --out public/photos/kitchen-base.jpg
sips -z 720 1280 <scratchpad>/bedroom-base-v3.png   -s format jpeg -s formatOptions 85 --out public/photos/bedroom-base.jpg
sips -z 720 1280 <scratchpad>/bedroom-shift7-v2.png -s format jpeg -s formatOptions 85 --out public/photos/bedroom-shift7.jpg
```

- [ ] **Step 6: Verify at the running app and check**

With `npm run dev` up, load `http://localhost:5173/photos/kitchen-base.jpg`, `bedroom-base.jpg`, and `bedroom-shift7.jpg` in the headless browser (same pattern as Task 3 Step 2, asserting `document.images[0].naturalWidth === 1280` per URL).
Run: `npm run check` — Expected: green.

- [ ] **Step 7: Commit**

```bash
git add public/photos/kitchen-base.jpg public/photos/bedroom-base.jpg public/photos/bedroom-shift7.jpg
git commit -m "fix(art): scrub readable gibberish lettering from kitchen and bedroom plates"
```

---

### Task 5 (OPTIONAL — needs Ryan's go-ahead after playing): subtler living-shift3

The shipped `living-shift3.jpg` change is bold (whole-room cold/blue). The spec's bar is "a viewer should struggle to say what changed." Ryan may prefer the bold read — **do not start this task without an explicit yes.**

**Files:**
- Modify: `public/photos/living-shift3.jpg`

**Interfaces:** same nanobanana + sips pattern as Task 4.

- [ ] **Step 1: Regenerate gently from the base**

`mcp__nanobanana__generate_image`, input = scratchpad `living-base.png` (fallback: `public/photos/living-base.jpg`), output `<scratchpad>/living-shift3-v2.png`, prompt:

> Edit this photograph. Change ONLY the light, and only slightly: the daylight through the right window is a touch dimmer and a touch cooler, as if twenty minutes have passed, and the doorway at the far left edge now glows faintly with a warm corridor light that was off before. The room's overall exposure stays very close to the original. Every object stays pixel-identical and unmoved. A viewer flipping between the two images should struggle to say what changed.

- [ ] **Step 2: A/B against the base, convert, verify, commit**

Read the PNG next to `living-base.jpg`; the difference should be findable only on comparison. Then:

```bash
sips -z 720 1280 <scratchpad>/living-shift3-v2.png -s format jpeg -s formatOptions 85 --out public/photos/living-shift3.jpg
```

Run: `npm run check` — Expected: green.

```bash
git add public/photos/living-shift3.jpg
git commit -m "fix(art): make the three-fracture living-room shift subtler"
```

---

## Deferred (not in this plan, recorded so they aren't lost)

- **Separate wall mirror in the bathroom plate.** `mirror` and `medicine-cabinet` currently split one mirrored cabinet into top/bottom click bands. Functional, but a plate reshoot adding a distinct wall mirror means regenerating `bathroom-base` **and** re-deriving `bathroom-shift5`, then retracing both polygons — do it together with any future bathroom reshoot, not piecemeal.
- **Real audio assets** (5 room loops, motif + 3 detuned variants, ~8 stingers — spec §7). Task 2 makes sting timing correct whenever these arrive; producing them is Week-4 scope and needs a decision on tooling.
- **Institutionalizing the headless e2e drive** as `tools/` + a devDependency. The recipe lives in `.claude/skills/verify/SKILL.md`; promote it only if it starts being run often enough to rot.
