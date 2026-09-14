// Génère les icônes PNG de la PWA à partir du logo SVG (à relancer si le logo change) :
//   node scripts/generate-icons.mjs
import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const gradient = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B4CFF"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient>`;
const mark = (scale = 1, cx = 256, cy = 267) => {
  // Le "Y" du logo, centré sur (cx, cy) et mis à l'échelle.
  const s = scale;
  const p = (x, y) => `${cx + (x - 256) * s} ${cy + (y - 267) * s}`;
  return `
  <path d="M${p(156, 150)} L${p(256, 272)} L${p(356, 150)}" fill="none" stroke="#fff" stroke-width="${58 * s}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M${p(256, 272)} L${p(256, 384)}" fill="none" stroke="#fff" stroke-width="${58 * s}" stroke-linecap="round"/>`;
};

const rounded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${gradient}</defs><rect width="512" height="512" rx="112" fill="url(#g)"/>${mark()}</svg>`;
// Version "maskable" : fond plein bord, contenu réduit dans la zone sûre (80 % centrale).
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>${gradient}</defs><rect width="512" height="512" fill="url(#g)"/>${mark(0.8)}</svg>`;

await mkdir("public/icons", { recursive: true });
const jobs = [
  ["public/icons/icon-192.png", rounded, 192],
  ["public/icons/icon-512.png", rounded, 512],
  ["public/icons/icon-maskable-512.png", maskable, 512],
  ["public/icons/apple-touch-icon.png", maskable, 180],
];
for (const [file, svg, size] of jobs) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(file);
  console.log("✓", file);
}
