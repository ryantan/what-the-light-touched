---
name: verify
description: Drive the game end-to-end in headless Chrome and capture evidence. Use when verifying changes to game.json, plates, or engine code at the real surface.
---

# Verifying What the Light Touched

The surface is a DOM point-and-click game on a fixed 1280×720 stage. `npm run check` proves structure (types, tests, both endings reachable) but NOT that hotspot polygons align with the photo plates or that text/images render — drive the real game for that.

## Handle

```bash
npm run dev   # vite on http://localhost:5173/
```

Headless drive (claude-in-chrome extension is often not connected; puppeteer-core against the installed Chrome works and needs no download):

```bash
cd <scratchpad> && npm init -y && npm i puppeteer-core
```

```js
import puppeteer from 'puppeteer-core'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 720 })  // stage maps 1:1 to viewport
```

## Driving

- Examine = click a hotspot polygon; text types at 40 chars/sec — wait ~4.5s for a full line before reading `.textband` textContent.
- Look Again = click the same hotspot again while text is showing (appears instantly).
- Later hotspots in the room's array render on top; exits render on top of everything. Aim clicks away from polygon boundaries.
- Notebook drag (bathroom): pointer events — `mouse.down()` at spawnAt (200,620), step-move to the glowPolygon centre, `mouse.up()`. Full reveal passage takes ~23s to type.
- Finale: beats advance on stage click (wait ~7.5s per beat for typing). At 5+ fractures beat 3 renders a `span.accuse` — click it via `page.$('.accuse')` for Ending B; below 5 it must be absent. Ending B mirror = `.mirror-hotspot`, final line lands in `.ending-b`. Ending A credits image = `.ending-a img` (check `naturalWidth > 0`).
- Fracture route for Ending B: f1 shoe-mat, f2 chair, f3 photo-wall (pairs); f4+f5 = examine calendar+fridge+drying-rack; f6 medicine cabinet (avoid the mirror hotspot on the cabinet's top band); f7 bed.
- Fresh headless profile = no IndexedDB save; each run starts clean.

## Gotchas

- No audio assets exist yet — sting 404s in console are pre-existing noise.
- favicon.ico 404s on every load — noise.
- Screenshot the three shift plates (living at 3 fractures, bathroom at 5, bedroom at 7) — plate-swap regressions are invisible to the validator.
