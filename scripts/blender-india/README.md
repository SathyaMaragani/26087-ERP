# NCCT India digital twin — Blender build pipeline

Produces `apps/web/public/models/ncct-india.glb`: a real, Blender-built 3D India
landmass derived from current administrative-boundary data (not a procedural
approximation, not a flat image).

## Pipeline

```
raw state GeoJSON (udit-001/india-maps-data)
        │
        ▼
simplify_geojson.py   — Douglas-Peucker simplify + project into the SAME
                         equirectangular space apps/web/src/scene/india.ts
                         already uses (LON0=82.5, LAT0=22.0, SCALE=0.3)
        │
        ▼
india_states_projected.json   — committed; ~1000 points/state, ~1MB
        │
        ▼
build_india.py  (run inside Blender, headless)
        │
        ▼
ncct-india.glb  — committed to this folder AND copied to
                  apps/web/public/models/ncct-india.glb (the one the app serves)
ncct_india.blend — committed; the editable Blender source scene
```

## Reproducing from scratch

```bash
# 1. Fetch current India state boundaries (has Telangana/Ladakh/Odisha/Uttarakhand —
#    the geohacker/india dataset commonly linked elsewhere is pre-2014 and lacks these)
curl -sL https://raw.githubusercontent.com/udit-001/india-maps-data/main/geojson/india.geojson \
  -o india_states_v2.geojson

# 2. Simplify + project (stdlib-only Python, no deps)
python simplify_geojson.py india_states_v2.geojson india_states_projected.json 0.01

# 3. Build the GLB (Blender must be installed; no GUI/MCP connection needed)
"/path/to/blender" --background --python build_india.py -- \
  india_states_projected.json ncct-india.glb ncct_india.blend

# 4. Copy into the web app
cp ncct-india.glb ../../apps/web/public/models/ncct-india.glb
```

Set `NCCT_NO_DRACO=1` before the Blender call to export uncompressed (useful
only for diagnosing Draco-specific issues — the shipped asset uses Draco,
~950KB vs ~9MB uncompressed).

## Notable implementation decisions (read before changing the geometry)

- **Each boundary ring is one bmesh n-gon face**, triangulated afterward with
  `bmesh.ops.triangulate(..., quad_method="BEAUTY", ngon_method="BEAUTY")` —
  NOT `mathutils.geometry.tessellate_polygon`'s ear-clipping. Ear-clipping on
  India's many long, narrow state shapes produced thin sliver triangles whose
  shared edges caught light at slightly different angles, reading as dense
  parallel streaks across the whole landmass. Beauty-triangulation avoids that.
- **Terrain relief is a smooth analytic height function** (`terrain_height()`
  — the same sine/cosine formula the old procedural JS terrain used), applied
  as a **post-process vertex-position nudge after solidify**, never baked into
  the ring vertices before triangulation. Baking non-planar height into
  `tessellate_polygon`'s input produced a handful of degenerate triangles that
  `solidify()` then extruded into room-filling spikes (camera ends up inside
  the mesh). Nudging finished vertices is topologically inert and safe.
- **No bevel modifier on the base mesh.** The ~800 state/ring polygons are
  independently tessellated islands that overlap/abut at internal seams
  without being topologically welded into one watertight surface — invisible
  from directly above (two coincident top faces read as one surface), but a
  bevel modifier chamfers those internal seam edges exactly as it would the
  true outer silhouette, which is what caused the streaking in earlier
  attempts even after the n-gon/beauty-triangulation fix was tried alongside
  it. `add_edge_bevel()` is kept in the script for if the mesh is ever
  properly boolean-unioned into one continuous watertight surface.
- **Coordinate system matches the existing frontend exactly on purpose.**
  Export uses Blender's Y-up glTF convention (Blender Z→glTF Y, Blender Y→glTF
  -Z), which already matches `nodePosition()`'s `z = -y` convention in
  `CommandCenterWorld.tsx` — institution markers need no coordinate changes.
