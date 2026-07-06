# Photo Plate Prompt Pack — *What the Light Touched*

Prompts for generating the 8 photorealistic plates that replace the placeholder SVGs in `public/photos/`. Written for an image model with **image-to-image editing** (Gemini / Imagen / Nano Banana class). Midjourney works for the base plates but will not hold consistency for the shift variants — use an editing model for those.

## Workflow (order matters)

1. Generate the **5 base plates** first, ideally in one session/conversation so the model holds the flat's identity (same floor, same wall paint, same light).
2. Generate each **shift variant by editing its base plate** ("edit this image: …"), never from scratch. The horror of the shifts is two nearly-identical photos crossfading; independent generations will differ everywhere and read as a glitch, not a haunting.
3. Export at **1280×720** (or any 16:9 you then downscale). Save into `public/photos/` with these exact names, then tell Claude — the `src` strings in `game.json` point at `.svg` and need a one-line swap each:
   - `entry-base.jpg`
   - `living-base.jpg`, `living-shift3.jpg`
   - `kitchen-base.jpg`
   - `bathroom-base.jpg`, `bathroom-shift5.jpg`
   - `bedroom-base.jpg`, `bedroom-shift7.jpg`

## Two hard constraints

**Composition is load-bearing.** The clickable hotspot polygons are fixed pixel coordinates over a 1280×720 frame. Each prompt below includes a layout spec ("left third", "lower-right") derived from those polygons. If a generated image puts the fridge on the wrong side, either regenerate or budget an engineering pass to re-trace polygons. Getting composition ~80% right in the prompt is much cheaper.

**The photo is the objective voice.** The game's premise is that the narration lies and the photograph doesn't. Every "must show" item below comes from a Look Again line — if the plate contradicts one (three plates in the drying rack, chair facing the window), the game breaks silently. Check each plate against its list before saving.

## Shared style block (prepend to every prompt)

> Interior photograph of an older Singapore HDB flat, occupied by an elderly woman for decades. Shot on a tripod at eye level, wide angle (~24mm equivalent), straight-on, level horizon. Late-afternoon light through louvred windows, warm tungsten interior bulbs, deep shadows in corners. Slightly desaturated, muted colour grade — composed and tidy like a property listing, but lived-in: 1980s teak and rattan furniture, terrazzo or old vinyl flooring, faint wall discolouration around switches and frames. No people, no pets, no visible readable text anywhere (labels, calendars and letters present but illegible at this distance). Photorealistic, natural grain, no HDR glow, no horror styling, no grime, no vignette. 16:9.

The "no readable text" rule is deliberate — generated lettering comes out as gibberish, and every date and name in this game is carried by narration, not pixels.

---

## 1. `entry-base.jpg` — Entry Hall

**Layout (1280×720):** narrow entryway seen from inside the flat. Wooden coat rack against the **left wall** (x 80–220, mid-height). A small pile of unopened mail on the floor or a low shelf, **left-of-centre, low** (x 300–520, y 480–600). A light switch on the wall **centre, mid-height** (x 600–650). A shoe mat **lower-right of centre** (x 700–950, y 560–680). The open doorway into the living room fills the **right edge** (x 1080–1280).

**Must show (Look Again facts):**
- Coat rack: four hooks, a blue wool coat on the third, a scarf, an umbrella
- A drift of unopened mail, clearly weeks of it
- **Two pairs of shoes on the mat, visibly different sizes, mud at both heels** — this is fracture f1; both pairs must read as recently worn
- The switch plate cleaner than the wall around it (subtle)

**Prompt (after style block):** Entry hall of the flat, front door behind camera, metal gate shadow on floor. Teak coat rack on the left wall with a blue wool ladies' coat, a scarf and an umbrella on four hooks. A sliding pile of unopened envelopes low on the left. A worn shoe mat lower right with two pairs of shoes side by side — one pair of small ladies' walking shoes, one larger pair of boots, both with fresh mud on the heels. Doorway on the far right opening into a warmer-lit living room.

---

## 2. `living-base.jpg` — Living Room

**Layout:** the largest room. Bookshelf **upper left** (x 60–350, y 120–380). Telephone table with corded phone and answering machine **lower left** (x 120–300, y 400–580). Reading armchair **dead centre** (x 420–640, y 320–560) — **facing the left wall / toward the camera-left, decisively NOT facing the window**. Scuffed parallel drag-tracks in the floor varnish running from the chair toward the wall, **below the chair** (y 570–640). Framed photo wall **upper right of centre** (x 700–1050, y 120–420). A teacup on the chair's arm (x 660–730, y 470–540). Window with net curtain **right** (x 900–1060, y 440–620). A half-packed cardboard box **lower right** (x 780–900, y 560–660). Door to entry at far left edge, door to kitchen at far right edge.

**Must show:**
- **Armchair facing the wall, not the window** (fracture f2 — the flagship image of the game); visible scratching on the armrests if resolution allows; two parallel worn tracks in the floor from chair to wall
- **Six picture frames, five photographs — one frame conspicuously empty** (fracture f3); make the empty one the middle frame
- Corded telephone + old answering machine with a message light
- One full shelf row of paperbacks shelved backwards, spines to the wall
- Net curtain over the window, hem pinned flat to the sill
- Half-filled packing box with a tape gun on it; a teacup on the chair arm

**Prompt:** Living room of the flat. A rattan-and-cushion reading armchair in the centre of the room turned to face the blank left wall, away from the window; the floor varnish behind it worn in two parallel tracks. On the upper-right wall, an arranged grid of six wooden picture frames — five hold old family photographs, the middle frame is empty glass. Teak bookshelf upper left, one entire row of paperbacks shelved backwards with pages facing out. Small telephone table lower left with a corded phone and a plastic answering machine, red light on. A teacup on the chair's arm. Louvred window on the right behind a net curtain pressed flat against the sill. A half-packed cardboard moving box lower right with a tape gun resting on it.

---

## 3. `living-shift3.jpg` — Living Room, three-fracture shift

**Edit instruction on `living-base.jpg`:** Change only the light: the daylight through the right window is now later, dimmer and bluer, and the doorway on the far right edge (into the kitchen/hallway) now glows with the corridor light switched on, casting a longer doorway shadow into the room. Everything else — furniture, frames, box — must remain pixel-identical.

Per the spec, this shift is "the hallway at the edge of the screen photographed at a slightly different time of day." The player should be able to stare at the two images and struggle to say what changed.

---

## 4. `kitchen-base.jpg` — Kitchen

**Layout:** wall calendar **upper left** (x 100–320, y 140–420). Refrigerator **left of centre, full height** (x 360–560) with a small card taped to its door (the memorial card — visible, not legible). Kettle on the counter **centre** (x 640–760, y 280–360). Dish drying rack **centre-right, counter level** (x 620–820, y 380–520). Weekly pill organizer on the counter **right** (x 860–1000, y 300–380). A counter drawer **lower right** (x 860–1040, y 440–540), slightly ajar. Doors at far left (living room) and far right (bathroom) edges.

**Must show:**
- Wall calendar with handwritten entries (illegible scribbles, but clearly *dense, weekly, regular*)
- A small white card taped to the fridge door
- **Exactly two plates, two cups, two forks in the drying rack** (fracture f5 — the single most checkable image in the game; no third plate, no single plate)
- Seven-day pill organizer, all lids shut, faint dust
- Old kettle; an empty tea box and a newer jar of instant coffee beside it

**Prompt:** Small HDB kitchen. A paper wall calendar upper left, its grid dense with small handwritten entries, illegible. An older refrigerator left of centre with a single small white card taped at eye level. Formica counter running right: an aged stovetop kettle, then a wire dish drying rack holding exactly two plates, two cups and two forks, still wet. Further right a plastic seven-day pill organizer with all lids closed, slightly dusty, and a lower counter drawer left slightly ajar with takeaway menus visible inside. Fluorescent tube light, terrazzo floor.

---

## 5. `bathroom-base.jpg` — Bathroom

**Layout:** the smallest room. Towel rail **left** (x 160–380, y 300–560) with two towels. Mirror **top centre** (x 540–700, y 60–130) above a mirrored medicine cabinet **centre** (x 520–720, y 140–360) — cabinet door closed. Sink **centre, below cabinet** (x 520–720, y 400–560) with one toothbrush and a worn soap bar. A small violet nightlight plugged into a socket **right** (x 840–1000, y 420–560), glowing faintly even in daylight. Door at far left edge (kitchen), and the locked second-bedroom door visible at the far right edge.

**Must show:**
- Two towels: one stiff and dry, one visibly damp/darker
- One toothbrush; soap worn to a sliver
- A plugged-in **UV/violet nightlight, glowing** — its faint purple pool on the tile is the drag target, make it read
- Prescription bottles are inside the cabinet (door closed — do not show them)
- In the mirror above, the reflection of the room's door behind the camera — **the reflected door open at a noticeably wider angle than feels right** (subtle; if the model can't do it, a normal reflection is acceptable, the text carries it)

**Prompt:** Small tiled HDB bathroom. Chrome towel rail on the left with two folded towels, one visibly damp and darker than the other. Centre: a mirrored medicine cabinet, closed, above a ceramic sink holding a single toothbrush in a cup and a bar of soap worn thin. In the mirror, the dim reflection of a hallway door standing open behind the camera. On the right wall a small violet ultraviolet nightlight plugged into the socket, casting a faint purple glow across the wall tiles and grout. Slightly humid atmosphere, old grout, one frosted louvred window high up.

---

## 6. `bathroom-shift5.jpg` — Bathroom, five-fracture shift

**Edit instruction on `bathroom-base.jpg`:** Two changes only. (1) The mirrored medicine-cabinet door is now open a few centimetres — just enough to break its reflection. (2) The violet nightlight's glow is slightly stronger, its purple pool reaching further up the grout, where faint handprint-shaped smudges are now barely visible in the glow. Everything else pixel-identical.

This plate is live while the player reads Edith's notebook. The handprints pay off the `uv-nightlight` Look Again line.

---

## 7. `bedroom-base.jpg` — Second Bedroom

**Layout:** built-in wardrobe/closet **left, full height** (x 100–320, y 140–600), door ajar. The view back toward the doorway/hallway **top centre** (x 420–860, y 80–280) — this region is the finale photo target, keep it uncluttered. Single bed **centre** (x 380–760, y 320–600). Old sewing desk **upper right** (x 820–1060, y 180–420). Laundry basket **lower right** (x 820–1000, y 460–620). Door at far left edge (bathroom). A few stacked cardboard boxes allowed at edges — Mara calls this room "storage," and the room must quietly falsify her.

**Must show:**
- **A neatly made single bed with a clear head-shaped depression in the pillow** (fracture f7 — the room's thesis in one detail)
- Closet ajar: hangers half empty, a **sleeping bag rolled tight on the closet floor, dust-free**
- Sewing desk with a **Polaroid-style instant camera tucked in the desk's knee-well/drawer shadow** — visible to a player who looks, not spotlit
- Laundry basket of folded adult clothes, top shirt inside out
- Fewer boxes than "storage" implies; the room reads *inhabited last week*

**Prompt:** A small second bedroom in the flat, afternoon light. A single bed in the centre, neatly made with tucked sheets, but the pillow holds a deep head-shaped depression. Built-in wardrobe on the left with its door ajar: half-empty hangers above a tightly rolled sleeping bag on the closet floor. An old sewing desk on the right; in the shadow of its knee-well an instant Polaroid camera sits on the floor. A laundry basket of folded adult clothing lower right, the top shirt inside out. Two or three cardboard boxes stacked against a wall. The open doorway at the top centre of frame looks back into a dim hallway.

---

## 8. `bedroom-shift7.jpg` — Second Bedroom, seven-fracture shift

**Edit instruction on `bedroom-base.jpg`:** One change. The doorway at the top centre of frame — the dim hallway beyond it is now darker, and the door itself stands open wider than in the base image. Nothing else moves. (Optional, only if it stays subtle: the pillow's depression very slightly deeper.)

This fires at all seven fractures, usually while the player is standing in this room, as a 400ms crossfade. It is the last environmental beat before the finale — the change should be felt before it is found.

---

## After generation

Drop the files into `public/photos/` and ask Claude to swap the `src` extensions in `game.json` and re-run `npm run check`. Keep the SVGs in the folder until the swap is verified — the game hard-fails on a missing plate.

Sanity pass, per plate, before calling it done: read the room's `lookAgain` lines out of `game.json` with the image open. Every physical claim the objective voice makes should be either visible or plausibly out of frame — never contradicted.
