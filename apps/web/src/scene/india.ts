/**
 * Abstract geographic form of India: a coarse outline used only to seed a
 * particle topology (never drawn as a literal map). Coordinates are lon/lat.
 */
export const INDIA_OUTLINE: Array<[number, number]> = [
  [74.3, 34.8], [76.0, 35.6], [77.8, 35.5], [78.9, 34.3], [78.4, 32.5], [79.0, 31.0], [80.3, 30.4],
  [81.0, 30.2], [80.1, 28.8], [81.9, 27.9], [84.1, 27.4], [85.7, 26.6], [88.1, 26.5], [88.2, 27.9],
  [89.0, 27.3], [89.9, 26.7], [92.0, 26.9], [94.0, 27.2], [95.4, 28.2], [96.2, 29.0], [97.3, 28.2],
  [96.0, 26.9], [95.2, 25.6], [94.6, 24.2], [93.4, 23.0], [93.0, 22.0], [92.4, 22.9], [92.2, 24.0],
  [91.6, 24.1], [91.0, 25.1], [89.9, 25.3], [89.0, 26.0], [88.5, 24.3], [88.9, 22.5], [89.0, 21.7],
  [87.0, 21.5], [86.9, 20.4], [85.0, 19.3], [83.0, 17.7], [82.3, 16.5], [80.9, 15.8], [80.2, 13.4],
  [79.9, 11.9], [79.3, 10.3], [78.2, 8.9], [77.5, 8.1], [76.5, 8.8], [75.8, 11.0], [74.8, 12.9],
  [74.0, 15.0], [73.4, 16.9], [72.8, 19.0], [72.8, 20.9], [72.0, 21.0], [70.2, 20.8], [69.0, 22.3],
  [70.0, 22.9], [68.4, 23.6], [68.9, 23.9], [70.0, 24.3], [71.0, 24.4], [70.6, 25.6], [70.0, 26.6],
  [71.0, 27.8], [72.5, 28.9], [73.5, 29.9], [74.6, 31.0], [74.0, 32.5],
];

const LON0 = 82.5;
const LAT0 = 22.0;
const SCALE = 0.3; // world units per degree

export function projectLonLat(lon: number, lat: number): [number, number] {
  return [(lon - LON0) * SCALE, (lat - LAT0) * SCALE];
}

/** Gentle topographic relief so the plane reads as terrain, not a flat cutout. */
export function terrain(x: number, y: number): number {
  return (
    0.34 * Math.sin(x * 1.15 + 0.6) * Math.cos(y * 0.95) +
    0.18 * Math.sin(x * 2.3 - y * 1.7) +
    // Himalayan uplift toward the north
    Math.max(0, y - 2.4) * 0.22
  );
}

function inside(lon: number, lat: number): boolean {
  let c = false;
  for (let i = 0, j = INDIA_OUTLINE.length - 1; i < INDIA_OUTLINE.length; j = i++) {
    const [xi, yi] = INDIA_OUTLINE[i];
    const [xj, yj] = INDIA_OUTLINE[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleIndia(count: number, rand: () => number): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = [];
  let guard = 0;
  while (pts.length < count && guard++ < count * 60) {
    const lon = 68 + rand() * 30;
    const lat = 6.5 + rand() * 30;
    if (!inside(lon, lat)) continue;
    const [x, y] = projectLonLat(lon, lat);
    pts.push([x, y, terrain(x, y)]);
  }
  return pts;
}

/** Approximate anchor positions for institution nodes (schematic, not surveyed). */
export const HQ_LONLAT: [number, number] = [77.2, 28.6];
export const VAMNICOM_LONLAT: [number, number] = [73.9, 18.5];
export const RICM_LONLAT: Array<[number, number]> = [
  [78.5, 17.4], [77.6, 13.0], [76.8, 30.7], [72.6, 23.2], [77.4, 23.3], [80.9, 26.8], [85.8, 20.3],
  [88.4, 22.6], [91.7, 26.1], [75.8, 26.9], [85.1, 25.6], [80.3, 13.1], [76.9, 8.5], [85.3, 23.3],
];
export const ICM_LONLAT: Array<[number, number]> = [
  [81.6, 21.3], [78.0, 30.3], [91.3, 23.8], [93.9, 24.8], [80.6, 16.5],
];

/** State/UT centroids so real per-state analytics can be placed on the form. */
export const STATE_LONLAT: Record<string, [number, number]> = {
  'Andhra Pradesh': [79.7, 15.9], 'Arunachal Pradesh': [94.7, 28.2], Assam: [92.9, 26.2],
  Bihar: [85.3, 25.1], Chhattisgarh: [81.9, 21.3], Delhi: [77.1, 28.7], Goa: [74.1, 15.4],
  Gujarat: [71.2, 22.3], Haryana: [76.1, 29.1], 'Himachal Pradesh': [77.2, 31.9],
  Jharkhand: [85.3, 23.6], Karnataka: [75.7, 15.3], Kerala: [76.3, 10.5],
  'Madhya Pradesh': [78.6, 23.5], Maharashtra: [75.7, 19.7], Manipur: [93.9, 24.7],
  Meghalaya: [91.4, 25.5], Mizoram: [92.9, 23.2], Nagaland: [94.6, 26.1], Odisha: [84.8, 20.9],
  Punjab: [75.3, 31.1], Rajasthan: [74.2, 27.0], Sikkim: [88.5, 27.5], 'Tamil Nadu': [78.7, 11.1],
  Telangana: [79.0, 18.1], Tripura: [91.7, 23.9], 'Uttar Pradesh': [80.9, 26.8],
  Uttarakhand: [79.1, 30.1], 'West Bengal': [87.9, 23.0], 'Jammu and Kashmir': [75.3, 33.8],
  Ladakh: [77.6, 34.2],
};
