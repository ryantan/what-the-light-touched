import { mkdirSync, writeFileSync } from 'node:fs'

const plates = [
  ['entry-base', '#2a2622', 'ENTRY HALL'],
  ['living-base', '#2d2823', 'LIVING ROOM'],
  ['living-shift3', '#2d2620', 'LIVING ROOM — hallway light changed'],
  ['kitchen-base', '#282a24', 'KITCHEN'],
  ['bathroom-base', '#232629', 'BATHROOM'],
  ['bathroom-shift5', '#212327', 'BATHROOM — dimmer'],
  ['bedroom-base', '#262229', 'SECOND BEDROOM'],
  ['bedroom-shift7', '#231f27', 'SECOND BEDROOM — door now ajar'],
  ['polaroid-photo', '#1c1a17', 'POLAROID — two shadows'],
]

mkdirSync('public/photos', { recursive: true })
for (const [name, bg, label] of plates) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720">
  <rect width="1280" height="720" fill="${bg}"/>
  <text x="640" y="360" fill="#7d7468" font-size="40" text-anchor="middle"
        font-family="Georgia">${label}</text>
  <text x="640" y="410" fill="#55504a" font-size="18" text-anchor="middle"
        font-family="Georgia">placeholder plate — replace with photo</text>
</svg>`
  writeFileSync(`public/photos/${name}.svg`, svg)
}
console.log(`wrote ${plates.length} placeholder plates`)
