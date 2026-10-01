import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import { INDIA_OUTLINE, projectLonLat, RICM_LONLAT, HQ_LONLAT } from '../scene/india';

const VIEW_W = 420;
const VIEW_H = 460;
const PAD = 30;

/** Projects the same lon/lat data the Command Center uses into a small, static SVG viewBox. */
function useProjection() {
  return useMemo(() => {
    const projected = INDIA_OUTLINE.map(([lon, lat]) => projectLonLat(lon, lat));
    const xs = projected.map((p) => p[0]);
    const ys = projected.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX || 1, h = maxY - minY || 1;
    const scale = Math.min((VIEW_W - PAD * 2) / w, (VIEW_H - PAD * 2) / h);
    const offX = (VIEW_W - w * scale) / 2;
    const offY = (VIEW_H - h * scale) / 2;
    const toSvg = (lon: number, lat: number): [number, number] => {
      const [x, y] = projectLonLat(lon, lat);
      return [offX + (x - minX) * scale, offY + (maxY - y) * scale];
    };
    const outlinePath =
      INDIA_OUTLINE.map(([lon, lat], i) => {
        const [sx, sy] = toSvg(lon, lat);
        return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
      }).join(' ') + ' Z';
    return { toSvg, outlinePath };
  }, []);
}

/**
 * NCCT NETWORK GATEWAY — a lightweight, login-page-only visual (pure SVG, no
 * WebGL/R3F) representing the same real national network the dashboard's
 * Command Center shows, at the scale a sign-in screen needs. Institution
 * positions reuse the product's own real lon/lat anchors (scene/india.ts) —
 * not fabricated coordinates — but no live counts are claimed here: nothing
 * on this page reads the authenticated /organizations endpoint, since the
 * visitor hasn't signed in yet.
 */
export function NCCTNetworkGateway() {
  const reduce = useReducedMotion();
  const { toSvg, outlinePath } = useProjection();

  const institution = toSvg(RICM_LONLAT[0][0], RICM_LONLAT[0][1]); // RICM Hyderabad — the product's real anchor institution
  const hub = toSvg(HQ_LONLAT[0], HQ_LONLAT[1]); // NCCT HQ, Delhi
  const texture = [2, 4, 6, 9, 11].map((i) => toSvg(RICM_LONLAT[i % RICM_LONLAT.length][0], RICM_LONLAT[i % RICM_LONLAT.length][1]));

  // Conceptual downstream stages — not geographic, placed to read as a journey exiting the landmass.
  const training: [number, number] = [institution[0] + 54, institution[1] - 36];
  const credential: [number, number] = [VIEW_W - 36, institution[1] + 18];
  const employment: [number, number] = [VIEW_W + 6, institution[1] + 70];

  const journey = [institution, training, credential, employment];
  const journeyPath = journey.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');

  const connections: Array<[[number, number], [number, number]]> = [
    [hub, institution],
    [hub, texture[0]],
    [hub, texture[1]],
    [institution, texture[2]],
    [hub, texture[3]],
    [texture[3], texture[4]],
  ];

  return (
    <div className="gateway" aria-hidden="true">
      <svg viewBox={`-10 -10 ${VIEW_W + 40} ${VIEW_H + 20}`} className="gateway-svg" role="presentation">
        <path d={outlinePath} className="gateway-india" />

        {connections.map(([a, b], i) => (
          <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="gateway-link" style={reduce ? undefined : { animationDelay: `${0.6 + i * 0.12}s` }} />
        ))}

        <g className="gateway-journey" style={reduce ? undefined : { animationDelay: '1.4s' }}>
          <path d={journeyPath} className="gateway-journey-path" />
          {!reduce && (
            <circle r="3.2" className="gateway-journey-dot">
              <animateMotion dur="11s" repeatCount="indefinite" path={journeyPath} rotate="auto" begin="2.2s" />
            </circle>
          )}
        </g>

        {texture.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="2.6" className="gateway-node gateway-node--dim" style={reduce ? undefined : { animationDelay: `${0.3 + i * 0.1}s` }} />
        ))}

        <g className="gateway-node-group" style={reduce ? undefined : { animationDelay: '0.2s' }}>
          <circle cx={hub[0]} cy={hub[1]} r="5.5" className="gateway-node gateway-node--hub" />
          <text x={hub[0] + 11} y={hub[1] - 8} className="gateway-label">NATIONAL NETWORK</text>
        </g>

        <g className="gateway-node-group" style={reduce ? undefined : { animationDelay: '0.5s' }}>
          <circle cx={institution[0]} cy={institution[1]} r="5" className="gateway-node gateway-node--primary" />
          <text x={institution[0] - 11} y={institution[1] + 18} textAnchor="end" className="gateway-label">RICM HYDERABAD</text>
        </g>

        <g className="gateway-node-group" style={reduce ? undefined : { animationDelay: '0.8s' }}>
          <circle cx={training[0]} cy={training[1]} r="4" className="gateway-node gateway-node--stage" />
          <text x={training[0] + 14} y={training[1] + 3} className="gateway-label">TRAINING</text>
        </g>

        <g className="gateway-node-group" style={reduce ? undefined : { animationDelay: '1.0s' }}>
          <circle cx={credential[0]} cy={credential[1]} r="4" className="gateway-node gateway-node--stage" />
          <text x={credential[0] - 10} y={credential[1] - 9} textAnchor="end" className="gateway-label">CREDENTIAL</text>
        </g>

        <g className="gateway-node-group" style={reduce ? undefined : { animationDelay: '1.2s' }}>
          <circle cx={employment[0]} cy={employment[1]} r="4.5" className="gateway-node gateway-node--accent" />
          <text x={employment[0] - 10} y={employment[1] + 18} textAnchor="end" className="gateway-label">EMPLOYMENT</text>
        </g>
      </svg>

      <div className="gateway-status">
        <i /> NCCT demo network · ready
      </div>
    </div>
  );
}
