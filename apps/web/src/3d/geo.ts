import {
  HQ_LONLAT, ICM_LONLAT, INDIA_OUTLINE, RICM_LONLAT, VAMNICOM_LONLAT, mulberry32, projectLonLat, sampleIndia,
} from '../scene/india';

/** World layout of the atlas. y is up; north is −z so the landmass reads the right way up from the south. */
export const TERRAIN = { w: 24, d: 20, tw: 256, th: 214, hScale: 1.4 } as const;

export const toWorld = (lon: number, lat: number): [number, number] => {
  const [x, y] = projectLonLat(lon, lat);
  return [x, -y];
};

export type InstKind = 'hq' | 'vam' | 'ricm' | 'icm';
export interface Inst { kind: InstKind; x: number; z: number; lift: number; r: number; parent: number }

/** NCCT HQ → VAMNICOM → 14 RICMs → 5 ICMs, placed by geography (schematic). */
export function buildInstitutions(): Inst[] {
  const out: Inst[] = [];
  const [hx, hz] = toWorld(...HQ_LONLAT);
  out.push({ kind: 'hq', x: hx, z: hz, lift: 0.95, r: 0.5, parent: -1 });
  const [vx, vz] = toWorld(...VAMNICOM_LONLAT);
  out.push({ kind: 'vam', x: vx, z: vz, lift: 0.7, r: 0.42, parent: 0 });
  RICM_LONLAT.forEach((g) => { const [x, z] = toWorld(...g); out.push({ kind: 'ricm', x, z, lift: 0.5, r: 0.34, parent: 1 }); });
  ICM_LONLAT.forEach((g) => {
    const [x, z] = toWorld(...g);
    let best = 2, bd = Infinity;
    for (let i = 2; i < 2 + RICM_LONLAT.length; i++) { const d = Math.hypot(out[i].x - x, out[i].z - z); if (d < bd) { bd = d; best = i; } }
    out.push({ kind: 'icm', x, z, lift: 0.4, r: 0.3, parent: best });
  });
  return out;
}

/* ------------------------------------------------------------ height map */
function lattice(ix: number, iy: number, seed: number) {
  return mulberry32((ix * 73856093) ^ (iy * 19349663) ^ seed)();
}
function valueNoise(x: number, y: number, seed: number) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = lattice(ix, iy, seed), b = lattice(ix + 1, iy, seed), c = lattice(ix, iy + 1, seed), d = lattice(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const fbm = (x: number, y: number) => 0.55 * valueNoise(x, y, 11) + 0.3 * valueNoise(x * 2.1, y * 2.1, 23) + 0.15 * valueNoise(x * 4.3, y * 4.3, 37);

export interface HeightMap { data: Uint8Array; heightAt: (x: number, z: number) => number }

/** Landmass mask → soft coast → relief. Shared by the shader (as a texture) and the CPU, so structures sit exactly on the ground. */
export function buildHeightMap(): HeightMap {
  const { tw: W, th: H, w, d, hScale } = TERRAIN;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#fff';
  g.beginPath();
  INDIA_OUTLINE.forEach(([lon, lat], i) => {
    const [x, z] = toWorld(lon, lat);
    const px = (x / w + 0.5) * W, pz = (z / d + 0.5) * H;
    if (i === 0) g.moveTo(px, pz); else g.lineTo(px, pz);
  });
  g.closePath(); g.fill();
  const img = g.getImageData(0, 0, W, H).data;
  let mask = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) mask[i] = img[i * 4] / 255;

  // Separable box blur ×2 → soft coastline without relying on canvas filters.
  const blur = (src: Float32Array, r: number) => {
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < W) { s += src[y * W + xx]; n++; } } tmp[y * W + x] = s / n; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < H) { s += tmp[yy * W + x]; n++; } } out[y * W + x] = s / n; }
    return out;
  };
  mask = blur(blur(mask, 3), 3);

  const data = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = (i / (W - 1) - 0.5) * w, z = (j / (H - 1) - 0.5) * d;
    const m = mask[j * W + i];
    const land = Math.min(1, Math.max(0, (m - 0.12) / 0.6));
    const north = Math.max(0, -z - 2.2) * 0.16; // Himalayan uplift
    const relief = 0.3 + 0.32 * fbm(x * 0.55 + 4, z * 0.55 + 9) + north * (0.6 + fbm(x * 1.3, z * 1.3));
    data[j * W + i] = Math.round(Math.min(1, (land * relief) / hScale) * 255);
  }

  const heightAt = (x: number, z: number) => {
    const fx = Math.min(W - 1.001, Math.max(0, (x / w + 0.5) * W - 0.5)), fz = Math.min(H - 1.001, Math.max(0, (z / d + 0.5) * H - 0.5));
    const ix = Math.floor(fx), iz = Math.floor(fz), ax = fx - ix, az = fz - iz;
    const v = (a: number, b: number) => data[b * W + a] / 255;
    return hScale * (v(ix, iz) * (1 - ax) * (1 - az) + v(ix + 1, iz) * ax * (1 - az) + v(ix, iz + 1) * (1 - ax) * az + v(ix + 1, iz + 1) * ax * az);
  };
  return { data, heightAt };
}

/** Plateau profile shared by shader and CPU: flat top, sloped shoulder. */
export const plateau = (dist: number, r: number) => {
  const t = Math.min(1, Math.max(0, (dist - r * 0.55) / (r * 0.45)));
  return 1 - t * t * (3 - 2 * t);
};

export { sampleIndia, mulberry32 };
