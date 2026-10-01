"""
Pre-process the raw geohacker/india state-boundary GeoJSON (GADM-derived,
survey-grade precision, ~23MB) into a compact per-state polygon set that:

  1. Uses the SAME equirectangular projection already baked into the NCCT
     frontend (apps/web/src/scene/india.ts: LON0=82.5, LAT0=22.0, SCALE=0.3),
     so institution/region node placement (institutionPosition/regionPosition)
     keeps working unchanged against the new geometry.
  2. Simplifies each ring with Douglas-Peucker to a sane point budget for a
     real-time WebGL asset (this is a dashboard visualization, not a GIS tool).
  3. Keeps every ring (so islands/exclaves like Andaman & Nicobar, Lakshadweep
     survive) rather than only the largest polygon per state.

Output: scripts/blender-india/india_states_projected.json
  { "states": [ { "name": "Telangana", "rings": [ [[x,y], [x,y], ...], ... ] }, ... ],
    "projection": { "lon0": 82.5, "lat0": 22.0, "scale": 0.3 } }
"""
import json
import sys

LON0, LAT0, SCALE = 82.5, 22.0, 0.3

def project(lon, lat):
    return [(lon - LON0) * SCALE, (lat - LAT0) * SCALE]

def rdp(points, epsilon):
    """Ramer-Douglas-Peucker simplification, stdlib-only (no numpy/shapely)."""
    if len(points) < 3:
        return points

    def perp_dist(pt, a, b):
        (x, y), (ax, ay), (bx, by) = pt, a, b
        dx, dy = bx - ax, by - ay
        if dx == 0 and dy == 0:
            return ((x - ax) ** 2 + (y - ay) ** 2) ** 0.5
        t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)
        t = max(0, min(1, t))
        px, py = ax + t * dx, ay + t * dy
        return ((x - px) ** 2 + (y - py) ** 2) ** 0.5

    dmax, idx = 0, 0
    for i in range(1, len(points) - 1):
        d = perp_dist(points[i], points[0], points[-1])
        if d > dmax:
            dmax, idx = d, i

    if dmax > epsilon:
        left = rdp(points[: idx + 1], epsilon)
        right = rdp(points[idx:], epsilon)
        return left[:-1] + right
    return [points[0], points[-1]]

def flatten_rings(geom):
    """Yield every exterior ring (list of [lon,lat]) from a Polygon/MultiPolygon."""
    t = geom["type"]
    coords = geom["coordinates"]
    if t == "Polygon":
        yield coords[0]
    elif t == "MultiPolygon":
        for poly in coords:
            yield poly[0]

def main():
    src_path = sys.argv[1] if len(sys.argv) > 1 else "india_state.geojson"
    out_path = sys.argv[2] if len(sys.argv) > 2 else "india_states_projected.json"
    epsilon_deg = float(sys.argv[3]) if len(sys.argv) > 3 else 0.015  # ~1.6km at this latitude

    with open(src_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    MIN_RING_AREA_DEG2 = 0.0008  # drops lake-island/survey slivers, keeps real exclaves (e.g. island UTs)

    def ring_bbox_area(ring):
        lons = [p[0] for p in ring]
        lats = [p[1] for p in ring]
        return (max(lons) - min(lons)) * (max(lats) - min(lats))

    states = {}
    for feat in data["features"]:
        name = feat["properties"].get("st_nm") or feat["properties"].get("NAME_1") or "Unknown"
        states.setdefault(name, [])
        for ring in flatten_rings(feat["geometry"]):
            if ring_bbox_area(ring) < MIN_RING_AREA_DEG2:
                continue
            simplified = rdp(ring, epsilon_deg)
            if len(simplified) >= 3:
                states[name].append([project(lon, lat) for lon, lat in simplified])

    total_pts_before = sum(
        len(ring) for feat in data["features"] for ring in flatten_rings(feat["geometry"])
    )
    total_pts_after = sum(len(r) for rings in states.values() for r in rings)

    out = {
        "projection": {"lon0": LON0, "lat0": LAT0, "scale": SCALE},
        "states": [{"name": k, "rings": v} for k, v in sorted(states.items())],
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f)

    print(f"states: {len(states)}")
    print(f"points before: {total_pts_before}  after: {total_pts_after}  "
          f"({100 * total_pts_after / max(1, total_pts_before):.1f}%)")
    print(f"wrote {out_path}")

if __name__ == "__main__":
    main()
