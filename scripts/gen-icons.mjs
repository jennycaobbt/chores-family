/**
 * Generates PWA icons (192 and 512 px) in two flavours:
 *   pwa-192.png / pwa-512.png          – "any" purpose  (rounded-corner badge)
 *   pwa-192-maskable.png / pwa-512-maskable.png – "maskable" (full-bleed, broom
 *                                          scaled to 78% so it sits inside the
 *                                          Android safe zone circle)
 *
 * Run with:  node scripts/gen-icons.mjs
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = (name) => resolve(__dirname, '../public', name)

// ─── Shared broom markup ──────────────────────────────────────────────────────
// A -15° tilted broom: rounded handle, brush head, six arced bristles.
// Uses only standard SVG shapes – no text / emoji – so librsvg renders it
// perfectly.
const BROOM = `
  <g transform="translate(256,256) rotate(-15) translate(-256,-256)">
    <!-- Handle grip cap -->
    <circle cx="256" cy="65" r="32" fill="white" opacity="0.88"/>
    <!-- Handle stick -->
    <rect x="237" y="65" width="38" height="260" rx="19"
          fill="white" opacity="0.92"/>
    <!-- Brush body -->
    <rect x="92" y="305" width="328" height="64" rx="28"
          fill="white" opacity="0.90"/>
    <!-- Bristles – heights form a gentle arc (shorter at edges) -->
    <rect x="112" y="367" width="22" height="54" rx="11" fill="white" opacity="0.80"/>
    <rect x="158" y="367" width="22" height="70" rx="11" fill="white" opacity="0.80"/>
    <rect x="204" y="367" width="22" height="78" rx="11" fill="white" opacity="0.80"/>
    <rect x="250" y="367" width="22" height="78" rx="11" fill="white" opacity="0.80"/>
    <rect x="296" y="367" width="22" height="70" rx="11" fill="white" opacity="0.80"/>
    <rect x="342" y="367" width="22" height="54" rx="11" fill="white" opacity="0.80"/>
  </g>`

// ─── Gradient definition (shared) ─────────────────────────────────────────────
const GRAD = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#a855f7"/>
      <stop offset="50%"  stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>`

// ─── "any" icon – rounded-corner badge ────────────────────────────────────────
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
${GRAD}
  <rect width="512" height="512" rx="96" fill="url(#g)"/>
${BROOM}
</svg>`

// ─── "maskable" icon – full-bleed, broom scaled to ~78 % ──────────────────────
// Android launchers clip maskable icons to a circle (or squircle etc.).
// The "safe zone" is a centred circle whose radius = 40 % of the icon width.
// Scaling the artwork to 78 % keeps all important content inside that zone.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
${GRAD}
  <!-- Full-bleed background – no rounded corners -->
  <rect width="512" height="512" fill="url(#g)"/>
  <!-- Broom scaled to 78 % so it sits inside the safe-zone circle -->
  <g transform="translate(256,256) scale(0.78) rotate(-15) translate(-256,-256)">
    <circle cx="256" cy="65" r="32" fill="white" opacity="0.88"/>
    <rect x="237" y="65" width="38" height="260" rx="19" fill="white" opacity="0.92"/>
    <rect x="92" y="305" width="328" height="64" rx="28"  fill="white" opacity="0.90"/>
    <rect x="112" y="367" width="22" height="54" rx="11" fill="white" opacity="0.80"/>
    <rect x="158" y="367" width="22" height="70" rx="11" fill="white" opacity="0.80"/>
    <rect x="204" y="367" width="22" height="78" rx="11" fill="white" opacity="0.80"/>
    <rect x="250" y="367" width="22" height="78" rx="11" fill="white" opacity="0.80"/>
    <rect x="296" y="367" width="22" height="70" rx="11" fill="white" opacity="0.80"/>
    <rect x="342" y="367" width="22" height="54" rx="11" fill="white" opacity="0.80"/>
  </g>
</svg>`

// ─── Render ───────────────────────────────────────────────────────────────────
async function render(svgString, filename, size) {
  const buf = Buffer.from(svgString)
  await sharp(buf).resize(size, size).png({ compressionLevel: 9 }).toFile(out(filename))
  console.log(`✓  ${filename}  (${size}×${size})`)
}

await render(anySvg,      'pwa-192.png',          192)
await render(anySvg,      'pwa-512.png',          512)
await render(maskableSvg, 'pwa-192-maskable.png', 192)
await render(maskableSvg, 'pwa-512-maskable.png', 512)

console.log('\nAll icons written to public/')
