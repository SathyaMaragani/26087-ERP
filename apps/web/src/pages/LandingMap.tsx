import { useMemo } from 'react';
import { HQ_LONLAT, ICM_LONLAT, RICM_LONLAT, VAMNICOM_LONLAT } from '../scene/india';
import { MAP_H, MAP_W, STATES, toMap } from './indiaMap';

type P = [number, number];

// Labelled hubs use the product's own institution anchors (scene/india.ts), not new coordinates.
const HUBS: Array<{ name: string; at: P; dx?: number }> = [
  { name: 'Delhi', at: toMap(...HQ_LONLAT) },
  { name: 'Bhopal', at: toMap(...RICM_LONLAT[4]) },
  { name: 'Pune', at: toMap(...VAMNICOM_LONLAT) },
  { name: 'Hyderabad', at: toMap(...RICM_LONLAT[0]) },
  { name: 'Bengaluru', at: toMap(...RICM_LONLAT[1]) },
  { name: 'Guwahati', at: toMap(...RICM_LONLAT[8]) },
];
const HUB_LINKS: Array<[number, number]> = [[0, 1], [0, 5], [1, 2], [1, 3], [2, 3], [3, 4], [2, 4], [1, 5]];
const NODES: P[] = [...RICM_LONLAT, ...ICM_LONLAT]
  .map((ll) => toMap(...ll))
  .filter((p) => !HUBS.some((h) => Math.hypot(h.at[0] - p[0], h.at[1] - p[1]) < 4));

/** A gentle quadratic arc from a to b, bowed to one side. */
function arc(a: P, b: P, bow = 0.16) {
  const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  return `M${a[0]},${a[1]} Q${mx - dy * bow},${my + dx * bow} ${b[0]},${b[1]}`;
}

/**
 * Landing-page India: real state borders (scripts/blender-india/export_svg_paths.py), shaded as
 * relief terrain with SVG lighting filters, carrying the training network as animated arcs.
 * Pure SVG + CSS animation, so it costs nothing on the GPU and degrades cleanly.
 */
export function LandingMap() {
  const { hubArcs, spokes } = useMemo(() => {
    const hubArcs = HUB_LINKS.map(([i, j]) => arc(HUBS[i].at, HUBS[j].at));
    const spokes = NODES.map((p) => {
      const near = HUBS.reduce((best, h) => (Math.hypot(h.at[0] - p[0], h.at[1] - p[1]) < Math.hypot(best.at[0] - p[0], best.at[1] - p[1]) ? h : best));
      return arc(near.at, p, 0.22);
    });
    return { hubArcs, spokes };
  }, []);

  return (
    <svg className="lp-map" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label="Map of India showing the NCCT training network">
      <defs>
        <linearGradient id="lp-land" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#8f8358" />
          <stop offset="0.16" stopColor="#6a7b45" />
          <stop offset="0.34" stopColor="#4f7d3d" />
          <stop offset="0.75" stopColor="#3f6d36" />
          <stop offset="1" stopColor="#47743f" />
        </linearGradient>
        <radialGradient id="lp-desert" cx="0.2" cy="0.36" r="0.22">
          <stop offset="0" stopColor="#cbb47c" stopOpacity="0.85" />
          <stop offset="1" stopColor="#cbb47c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lp-deccan" cx="0.42" cy="0.62" r="0.2">
          <stop offset="0" stopColor="#8a8a4e" stopOpacity="0.45" />
          <stop offset="1" stopColor="#8a8a4e" stopOpacity="0" />
        </radialGradient>
        <filter id="lp-relief" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.011" numOctaves="4" seed="11" result="noise" />
          <feDiffuseLighting in="noise" surfaceScale="2" lightingColor="#fff" result="light">
            <feDistantLight azimuth="235" elevation="48" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="light" operator="arithmetic" k1="1.15" result="lit" />
          <feComposite in="lit" in2="SourceGraphic" operator="in" />
        </filter>
        <filter id="lp-drop" x="-10%" y="-10%" width="120%" height="125%">
          <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#3a2a12" floodOpacity="0.32" />
        </filter>
        <filter id="lp-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <g id="lp-states">{STATES.map(([name, d]) => <path key={name} d={d} />)}</g>
      </defs>

      <g className="lp-map-land">
        {/* Extruded earth edge, then the lit terrain surface on top of it. */}
        <g filter="url(#lp-drop)"><use href="#lp-states" transform="translate(0 9)" fill="#6b5131" /></g>
        <use href="#lp-states" fill="url(#lp-land)" filter="url(#lp-relief)" />
        <use href="#lp-states" fill="url(#lp-desert)" />
        <use href="#lp-states" fill="url(#lp-deccan)" />
      </g>

      <g className="lp-borders">
        {STATES.map(([name, , outline], i) => <path key={name} d={outline} pathLength={1} style={{ animationDelay: `${0.5 + (i % 12) * 0.06}s` }} />)}
      </g>

      <g className="lp-spokes">
        {spokes.map((d, i) => <path key={i} d={d} pathLength={1} style={{ animationDelay: `${1.5 + i * 0.05}s` }} />)}
      </g>
      <g className="lp-arcs">
        {hubArcs.map((d, i) => <path key={i} d={d} pathLength={1} style={{ animationDelay: `${1.1 + i * 0.12}s` }} />)}
      </g>

      <g className="lp-pulses">
        {hubArcs.map((d, i) => (
          <g key={i}>
            <circle r="6" className="lp-pulse-halo" filter="url(#lp-glow)">
              <animateMotion dur={`${4.5 + (i % 3)}s`} begin={`${2.4 + i * 0.5}s`} repeatCount="indefinite" path={d} keyPoints={i % 2 ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear" />
            </circle>
            <circle r="2.6" className="lp-pulse-core">
              <animateMotion dur={`${4.5 + (i % 3)}s`} begin={`${2.4 + i * 0.5}s`} repeatCount="indefinite" path={d} keyPoints={i % 2 ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear" />
            </circle>
          </g>
        ))}
      </g>

      <g className="lp-nodes">
        {NODES.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="4" style={{ animationDelay: `${1.6 + i * 0.05}s` }} />)}
      </g>

      {HUBS.map(({ name, at: [x, y] }, i) => (
        <g key={name} className="lp-hub" style={{ animationDelay: `${1 + i * 0.1}s` }}>
          <circle cx={x} cy={y} r="11" className="lp-hub-ring" style={{ animationDelay: `${i * 0.4}s` }} />
          <circle cx={x} cy={y} r="8.5" className="lp-hub-halo" />
          <circle cx={x} cy={y} r="4.5" className="lp-hub-core" />
          <text x={x + 15} y={y + 5}>{name}</text>
        </g>
      ))}
    </svg>
  );
}
