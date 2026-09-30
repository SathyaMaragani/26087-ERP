import * as THREE from 'three';
import { mulberry32, projectLonLat, STATE_LONLAT, terrain } from '../scene/india';

/**
 * A region's exact centroid — no per-node jitter, since this is the camera's travel anchor.
 * Lives outside CommandCenterWorld.tsx (which pulls in @react-three/fiber) so the instrumentation
 * layer (CommandCenter.tsx) can compute a breadcrumb's target position without eagerly bundling
 * the whole lazy-loaded 3D scene — this only needs plain `three` (already loaded eagerly anyway).
 */
export function regionPosition(state: string): THREE.Vector3 {
  const ll = STATE_LONLAT[state] || STATE_LONLAT['Madhya Pradesh'];
  const [x, y] = projectLonLat(ll[0], ll[1]);
  return new THREE.Vector3(x, terrain(x, y) + 0.02, -y);
}

/** The same per-institution jittered position CommandCenterWorld's InstitutionMarker computes —
 * duplicated there for the 3D scene's own use, shared here for the command palette, which needs
 * to compute the same world point without importing the (heavy, lazy-loaded) 3D scene module. */
export function institutionPosition(state: string | null, seed: number): THREE.Vector3 {
  const ll = (state && STATE_LONLAT[state]) || STATE_LONLAT['Madhya Pradesh'];
  const jitter = mulberry32(seed || 1);
  const [x, y] = projectLonLat(ll[0] + (jitter() - 0.5) * 0.6, ll[1] + (jitter() - 0.5) * 0.6);
  return new THREE.Vector3(x, terrain(x, y) + 0.06, -y);
}
