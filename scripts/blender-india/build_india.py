"""
NCCT India Digital Twin — headless Blender build script.

Run with:
  blender --background --python build_india.py -- <path-to-india_states_projected.json> <output.glb> <output.blend>

Builds the India landmass from real, simplified administrative-boundary data
(see simplify_geojson.py — source: udit-001/india-maps-data, current state
boundaries including Telangana/Ladakh/Odisha/Uttarakhand), projected with the
SAME equirectangular transform already used by the NCCT frontend
(apps/web/src/scene/india.ts: LON0=82.5, LAT0=22.0, SCALE=0.3), so existing
institution/region node placement keeps landing in the correct spot against
this new geometry without any change to that logic.

Scene organisation (NCCT_INDIA collection):
  INDIA_BASE   — the merged national landmass, solidified for real depth,
                 with a smooth analytic terrain relief (Himalayan uplift)
                 nudged into vertex Z after solidify. Two materials:
                 slot 0 "NCCT_Terrain" (TOP faces, stylized per-vertex-colour
                 regional zones — desert/plateau/forest/snow, computed in
                 Python, no texture images, no satellite imagery) and slot 1
                 "NCCT_Edge" (SIDE/UNDERSIDE faces, flat dark stone).
  BOUNDARIES   — thin bevelled curve objects tracing each state's perimeter,
                 sitting just above the base surface (subtle engraving, not
                 a political infographic)
  RIVERS       — a restrained set of major real river courses (Ganga, Yamuna,
                 Brahmaputra, Godavari, Krishna, Narmada, Tapti, Mahanadi,
                 Kaveri), embedded just above the terrain surface

ANCHOR_POINTS/institution nodes are intentionally NOT baked into this asset:
those are live, data-driven (real API data), computed by the existing
institutionPosition()/regionPosition() functions in the React/Three.js layer.
Baking them into the static GLB would freeze them at build time and break
"no fake data" — the GLB is geometry only; the backend remains the source of
truth for anything node-related.
"""
import bpy
import bmesh
import json
import sys
import math
from mathutils.geometry import tessellate_polygon

# ---------------------------------------------------------------- args
argv = sys.argv
argv = argv[argv.index("--") + 1:] if "--" in argv else []
DATA_PATH = argv[0] if len(argv) > 0 else "india_states_projected.json"
GLB_OUT = argv[1] if len(argv) > 1 else "ncct-india.glb"
BLEND_OUT = argv[2] if len(argv) > 2 else "ncct_india.blend"

# ---------------------------------------------------------- Monsoon Porcelain
PORCELAIN = (0.961, 0.945, 0.909, 1.0)   # #F5F1E8
WARM_WHITE = (0.984, 0.976, 0.957, 1.0)  # #FBF9F4
MIST = (0.914, 0.906, 0.871, 1.0)        # #E9E7DE
INK = (0.094, 0.125, 0.114, 1.0)         # #18201D
STONE = (0.412, 0.443, 0.420, 1.0)       # #69716B
JADE = (0.243, 0.486, 0.416, 1.0)        # #3E7C6A
PALE_JADE = (0.569, 0.702, 0.647, 1.0)   # #91B3A5
LICHEN = (0.510, 0.588, 0.424, 1.0)      # #82966C
COPPER = (0.663, 0.380, 0.231, 1.0)      # #A9613B
MARIGOLD = (0.831, 0.627, 0.302, 1.0)    # #D4A04D
RAIN = (0.471, 0.592, 0.627, 1.0)        # #7897A0
SNOW = (0.965, 0.960, 0.945, 1.0)        # cool near-white, warmer than pure white


def _mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(4))


def _hash01(x, y, seed=0.0):
    """Deterministic stdlib-only pseudo-noise in [0, 1) from position."""
    n = math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
    return n - math.floor(n)


def _smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0 + 1e-9)))
    return t * t * (3 - 2 * t)


# Regional colour-zone anchors, in the SAME projected xy space as the mesh
# (derived from real lon/lat region centres — not arbitrary). Each zone pulls
# nearby vertices toward its colour via a smooth gaussian falloff, so regions
# blend continuously into each other rather than showing hard seams.
def _proj(lon, lat):
    return ((lon - 82.5) * 0.3, (lat - 22.0) * 0.3)


ZONES = [
    # (anchor_xy, colour, sigma)
    (_proj(78.0, 32.0), _mix(PORCELAIN, STONE, 0.22), 1.7),   # Himalaya/north — warm ivory, cool stone
    (_proj(70.9, 26.9), _mix(MARIGOLD, COPPER, 0.4), 1.8),    # Rajasthan desert — sand/ochre
    (_proj(79.0, 22.0), _mix(LICHEN, STONE, 0.28), 2.0),      # Central India — warm olive/earth
    (_proj(85.8, 20.3), _mix(LICHEN, JADE, 0.5), 1.9),        # Eastern India — deeper muted green
    (_proj(78.5, 17.4), _mix(PALE_JADE, LICHEN, 0.38), 1.9),  # Deccan/south — muted jade/olive
    (_proj(91.7, 26.1), _mix(JADE, LICHEN, 0.3), 1.3),        # Northeast — rich muted green
    (_proj(77.5, 8.1), _mix(PALE_JADE, JADE, 0.3), 1.4),      # Far south tip
]


def log(msg):
    print(f"[ncct-india] {msg}")


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block_collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.objects):
        for block in list(block_collection):
            if block.users == 0:
                block_collection.remove(block)


def make_collection(name, parent=None):
    col = bpy.data.collections.new(name)
    (parent or bpy.context.scene.collection).children.link(col)
    return col


def load_data(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def terrain_height(x, y):
    """Smooth analytic relief (the same formula the old procedural JS terrain
    used — low-frequency sine/cosine waves plus a northward Himalayan uplift)
    — restrained, architectural, not a heightmap."""
    TERRAIN_SCALE = 0.05
    return TERRAIN_SCALE * (
        0.34 * math.sin(x * 1.15 + 0.6) * math.cos(y * 0.95)
        + 0.18 * math.sin(x * 2.3 - y * 1.7)
        + max(0.0, y - 2.4) * 0.22
    )


def terrain_color(x, y, z):
    """Stylized (never photographic/satellite) terrain colour for one point:
    a gaussian-weighted blend of regional colour zones, then elevation-driven
    snow/rock on high ground, then a touch of deterministic grain so flat
    areas don't read as a flat colour fill."""
    weights = []
    for (zx, zy), _color, sigma in ZONES:
        d2 = (x - zx) ** 2 + (y - zy) ** 2
        weights.append(math.exp(-d2 / (2 * sigma * sigma)))
    total = sum(weights) or 1.0
    r = g = b = 0.0
    for w, (_anchor, color, _sigma) in zip(weights, ZONES):
        wn = w / total
        r += color[0] * wn
        g += color[1] * wn
        b += color[2] * wn
    col = (r, g, b, 1.0)

    # Elevation: snow only where the Himalayan uplift term has genuinely lifted
    # the surface (not a latitude band) — real high ground, not a white stripe.
    snow_t = _smoothstep(0.085, 0.15, z)
    if snow_t > 0:
        col = _mix(col, SNOW, snow_t)

    # Deep-valley shadow: sparse, low-frequency darkening for a sense of relief
    # even where the analytic height function is near zero.
    valley = _hash01(x * 2.3, y * 2.3, 11.0)
    if valley > 0.72 and snow_t < 0.3:
        col = _mix(col, _mix(col, INK, 0.35), (valley - 0.72) / 0.28)

    # Fine grain: tiny per-point jitter so the surface reads as material, not
    # a flat colour fill. Kept deliberately subtle (±4%).
    grain = (_hash01(x * 37.0, y * 41.0, 3.0) - 0.5) * 0.08
    col = tuple(max(0.0, min(1.0, c + grain)) if i < 3 else c for i, c in enumerate(col))
    return col


def build_base_mesh(states, depth=0.12):
    """One merged landmass mesh: every state's rings tessellated FLAT (z=0)
    into faces, extruded to `depth`, THEN given terrain relief as a pure
    vertex-position post-process (see end of function).

    Tessellating with non-planar (height-perturbed) input broke badly: an
    earlier version baked terrain_height() into each ring's Z before calling
    tessellate_polygon(), which expects near-planar input for its ear-clipping
    triangulation — across ~800 independently-tessellated ring polygons this
    produced a handful of wildly degenerate triangles that solidify() then
    extruded into room-filling spikes, putting the camera inside the mesh.
    Tessellating flat first and only then nudging finished vertices up/down
    by height is topologically inert (no faces/edges change) and safe."""
    mesh = bpy.data.meshes.new("INDIA_BASE_MESH")
    bm = bmesh.new()

    # Each ring becomes ONE n-gon face (bmesh supports non-triangular faces natively) rather than
    # pre-triangulating with tessellate_polygon's ear-clipping, which produced long, thin sliver
    # triangles for India's many elongated/narrow state shapes — those slivers caught light at
    # slightly different angles along their shared edges, reading as dense parallel streaks across
    # the whole landmass. A single beauty-triangulation pass (after all n-gons exist, see below)
    # produces far more uniform triangles with none of that banding.
    total_rings = 0
    for state in states:
        for ring in state["rings"]:
            if len(ring) < 3:
                continue
            verts = [bm.verts.new((p[0], p[1], 0.0)) for p in ring]
            try:
                bm.faces.new(verts)
            except ValueError:
                # Non-simple ring (self-touching/degenerate) — fall back to ear-clipping for this one.
                try:
                    tris = tessellate_polygon([[v.co for v in verts]])
                    for tri in tris:
                        try:
                            bm.faces.new([verts[i] for i in tri])
                        except ValueError:
                            pass
                except Exception:
                    continue
            total_rings += 1

    bmesh.ops.triangulate(bm, faces=bm.faces[:], quad_method="BEAUTY", ngon_method="BEAUTY")

    # Real administrative-boundary data digitizes each state independently, so adjacent states'
    # shared borders are rarely exactly coincident vertex-for-vertex. A tight merge distance left
    # every one of the ~800 ring polygons as its own disconnected island with a full perimeter —
    # which the bevel modifier then chamfers as if it were outer silhouette, reading as a dense
    # network of streaky ridges tracing every state boundary. A more generous weld distance
    # (~1.5km at this latitude) stitches touching neighbours into one continuous surface so only
    # the true coastline/outer silhouette remains a hard edge.
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.014)
    # tessellate_polygon's triangle winding depends on each ring's own point order in the
    # source data, which is inconsistent across ~800 merged state/ring polygons — recalculate
    # so every top face normal points consistently outward (+Z) before solidifying downward.
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()

    # Resolution for the colour pass: a large state polygon built from only its own boundary
    # vertices (no interior points) triangulates into a handful of very large triangles, each
    # one a single flat vertex-colour patch — the terrain zone blend read as hard crystalline
    # facets instead of a smooth gradient. One pass of straight (non-smoothing) subdivision adds
    # interior vertices for the colour function to actually vary across, at a bounded/predictable
    # cost (~4x face count) rather than remeshing the whole landmass at arbitrary resolution.
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
    bm.normal_update()

    # Solidify (extrude down) for real 3D depth.
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=depth)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()

    # Terrain relief: nudge every vertex's Z by a smooth function of its (x, y) —
    # a pure position edit after topology is finalized, so it can't create degenerate faces.
    for v in bm.verts:
        v.co.z += terrain_height(v.co.x, v.co.y)
    bm.normal_update()

    # Material/colour pass: TOP faces (normal pointing up) get the stylized terrain colour
    # zone blend; SIDE and UNDERSIDE faces (normal pointing outward/down from solidify) get
    # a flat dark edge colour instead, so the vertical slab wall reads as a distinct material
    # from the terrain surface rather than smearing the same colour down the side.
    color_layer = bm.loops.layers.color.new("Col")
    edge_color = _mix(INK, STONE, 0.3)
    for face in bm.faces:
        is_top = face.normal.z > 0.35
        face.material_index = 0 if is_top else 1
        for loop in face.loops:
            if is_top:
                v = loop.vert
                loop[color_layer] = terrain_color(v.co.x, v.co.y, v.co.z)
            else:
                loop[color_layer] = edge_color

    bm.to_mesh(mesh)
    bm.free()
    log(f"base mesh: {total_rings} rings, {len(mesh.vertices)} verts, {len(mesh.polygons)} faces")

    obj = bpy.data.objects.new("INDIA_BASE", mesh)
    return obj


def add_edge_bevel(obj):
    """A restrained bevel on the true outer silhouette/side-wall edges only.
    Terrain relief is already baked into vertex Z in build_base_mesh (see its
    docstring for why a Displace+texture approach was abandoned); a high
    angle threshold here means only genuinely sharp edges — the vertical
    silhouette wall from solidify — get chamfered, not the gentle, low-angle
    seams between ~800 independently-tessellated ring polygons."""
    bevel = obj.modifiers.new("EdgeBevel", type="BEVEL")
    bevel.width = 0.012
    bevel.segments = 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(65)


def assign_material(obj, name, color, roughness=0.82, metallic=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
    obj.data.materials.append(mat)
    return mat


def make_vertex_color_material(name, color_attribute="Col", roughness=0.88):
    """Principled BSDF whose Base Color reads the mesh's per-loop vertex
    colour attribute — this is how the stylized terrain zones (computed in
    Python, no texture images) reach the exported GLB. Three.js's GLTFLoader
    automatically enables vertexColors on the resulting material once it sees
    a COLOR_0 accessor, so no frontend material change is needed."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    attr = nt.nodes.new("ShaderNodeAttribute")
    attr.attribute_type = "GEOMETRY"
    attr.attribute_name = color_attribute
    nt.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    if "Metallic" in bsdf.inputs:
        bsdf.inputs["Metallic"].default_value = 0.0
    return mat


RIVERS = {
    # Real major river courses, simplified to a handful of waypoints each
    # (lon, lat) — not surveyed precision, but genuine geography, not invented paths.
    "Ganga": [(79.1, 30.9), (78.2, 29.9), (80.3, 26.5), (83.0, 25.3), (85.1, 25.6), (87.9, 24.8), (88.9, 22.0)],
    "Yamuna": [(78.4, 31.0), (77.2, 28.6), (78.0, 27.2), (81.8, 25.4)],
    "Brahmaputra": [(95.7, 27.8), (94.9, 27.5), (91.7, 26.2), (90.0, 26.0)],
    "Godavari": [(73.5, 19.9), (73.8, 20.0), (77.3, 19.2), (81.8, 17.0), (82.3, 16.7)],
    "Krishna": [(73.7, 17.9), (74.6, 16.9), (78.0, 15.8), (80.6, 16.5), (81.1, 16.0)],
    "Narmada": [(81.8, 22.7), (79.9, 23.2), (77.7, 22.8), (73.0, 21.7), (72.6, 21.6)],
    "Tapti": [(78.3, 21.8), (76.2, 21.3), (72.8, 21.2), (72.6, 21.1)],
    "Mahanadi": [(81.5, 20.7), (84.0, 21.5), (85.9, 20.5), (86.4, 20.3)],
    "Kaveri": [(75.8, 12.4), (76.6, 12.3), (77.7, 11.3), (79.1, 10.8), (79.8, 10.9)],
}


def build_rivers():
    """A restrained set of major river courses, embedded just above the
    terrain surface (z = terrain_height + small offset) rather than floating
    above it. One curve object, one spline per river, like BOUNDARIES."""
    curve_data = bpy.data.curves.new("RIVERS_CURVE", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = 0.0045
    curve_data.bevel_resolution = 1

    for waypoints in RIVERS.values():
        spline = curve_data.splines.new("POLY")
        spline.points.add(len(waypoints) - 1)
        for i, (lon, lat) in enumerate(waypoints):
            x, y = _proj(lon, lat)
            z = terrain_height(x, y) + 0.018
            spline.points[i].co = (x, y, z, 1.0)

    return bpy.data.objects.new("RIVERS", curve_data)


def build_state_boundary_curves(states, z=0.07):
    """A SINGLE curve object holding one spline per state ring — a subtle
    engraved boundary line, not a bold political infographic overlay.
    (Deliberately one object/one mesh-primitive rather than hundreds: each
    separate object costs its own glTF node+accessor+material, which is
    what made an early build of this asset balloon to 14MB for ~800 rings.)"""
    curve_data = bpy.data.curves.new("BOUNDARIES_CURVE", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.bevel_depth = 0.0035
    curve_data.bevel_resolution = 0  # square-ish cross-section; plenty at this line weight

    ring_count = 0
    for state in states:
        for ring in state["rings"]:
            if len(ring) < 3:
                continue
            spline = curve_data.splines.new("POLY")
            closed_ring = ring + [ring[0]]
            spline.points.add(len(closed_ring) - 1)  # new() already provides one point
            for j, (x, y) in enumerate(closed_ring):
                spline.points[j].co = (x, y, z, 1.0)
            ring_count += 1

    obj = bpy.data.objects.new("BOUNDARIES", curve_data)
    return obj, ring_count


def build_network_surface(states, z=-0.01):
    """A very slightly larger, low-profile ground plane beneath the landmass
    — a quiet backdrop plane the institution/network layer can sit just above
    in the live Three.js scene; not a lit/emissive 'network' effect baked in."""
    xs = [p[0] for s in states for r in s["rings"] for p in r]
    ys = [p[1] for s in states for r in s["rings"] for p in r]
    pad = 0.6
    x0, x1 = min(xs) - pad, max(xs) + pad
    y0, y1 = min(ys) - pad, max(ys) + pad

    mesh = bpy.data.meshes.new("NETWORK_SURFACE_MESH")
    bm = bmesh.new()
    v0 = bm.verts.new((x0, y0, z))
    v1 = bm.verts.new((x1, y0, z))
    v2 = bm.verts.new((x1, y1, z))
    v3 = bm.verts.new((x0, y1, z))
    bm.faces.new((v0, v1, v2, v3))
    bm.to_mesh(mesh)
    bm.free()
    return bpy.data.objects.new("NETWORK_SURFACE", mesh)


def main():
    clear_scene()
    data = load_data(DATA_PATH)
    states = data["states"]
    log(f"loaded {len(states)} states/UTs from {DATA_PATH}")

    root = make_collection("NCCT_INDIA")
    col_base = make_collection("INDIA_BASE", root)
    col_boundaries = make_collection("BOUNDARIES", root)
    col_rivers = make_collection("RIVERS", root)

    base_obj = build_base_mesh(states)
    col_base.objects.link(base_obj)
    # No bevel: the base mesh is built from ~800 independently-tessellated ring polygons that
    # overlap/abut at internal state-boundary seams without being topologically welded into one
    # watertight surface. From directly above this is invisible (two coincident, equally-lit
    # top faces read as one continuous surface), but a bevel modifier chamfers EVERY one of
    # those internal seam edges exactly as it would the true outer silhouette, which is what
    # produced the dense streaky-ridge look in earlier builds. A clean flat/sharp edge avoids
    # that failure mode entirely; add_edge_bevel() is kept below for future use if the mesh is
    # ever properly unioned into one continuous surface.
    _ = add_edge_bevel  # intentionally unused for now — see note above
    # Material slot 0: TOP faces, stylized terrain colour read from the per-loop vertex colour
    # attribute baked in build_base_mesh (regional zones + elevation snow + grain, all computed
    # in Python — no texture images, no satellite photography).
    base_obj.data.materials.append(make_vertex_color_material("NCCT_Terrain"))
    # Material slot 1: SIDE/UNDERSIDE faces, flat dark stone/ink — the vertical slab wall reads
    # as a distinct physical edge rather than smearing terrain colour down the side.
    assign_material(base_obj, "NCCT_Edge", _mix(INK, STONE, 0.3), roughness=0.55)

    boundary_obj, ring_count = build_state_boundary_curves(states)
    col_boundaries.objects.link(boundary_obj)
    assign_material(boundary_obj, "NCCT_Boundary", PALE_JADE, roughness=0.5)
    log(f"built boundary curve object with {ring_count} ring splines")

    rivers_obj = build_rivers()
    col_rivers.objects.link(rivers_obj)
    assign_material(rivers_obj, "NCCT_River", RAIN, roughness=0.35)
    log(f"built {len(RIVERS)} river courses")

    # No NETWORK_SURFACE backdrop plane: it rendered as an obvious flat gray square/diamond
    # edge around the landmass at any non-top-down camera angle instead of reading as a quiet
    # backdrop. build_network_surface() is kept below if a future design wants it back with a
    # transparent/unlit material instead.
    _ = build_network_surface  # intentionally unused — see note above

    # Apply all modifiers / convert the curve objects to mesh before export
    # (GLTF exporter respects export_apply for modifiers, but the curve→mesh
    # conversion needs doing explicitly so the saved .blend and the GLB agree).
    bpy.context.view_layer.objects.active = base_obj
    for obj in bpy.data.objects:
        obj.select_set(obj in (base_obj, boundary_obj, rivers_obj))
    bpy.ops.object.convert(target="MESH")

    log(f"saving .blend to {BLEND_OUT}")
    bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)

    log(f"exporting GLB to {GLB_OUT}")
    export_kwargs = dict(
        filepath=GLB_OUT,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_materials="EXPORT",
        export_yup=True,
    )
    import os
    use_draco = os.environ.get("NCCT_NO_DRACO") != "1"
    if use_draco:
        try:
            bpy.ops.export_scene.gltf(export_draco_mesh_compression_enable=True, **export_kwargs)
        except TypeError:
            log("Draco export option unavailable on this Blender build — exporting uncompressed")
            bpy.ops.export_scene.gltf(**export_kwargs)
    else:
        log("NCCT_NO_DRACO=1 — exporting uncompressed for diagnosis")
        bpy.ops.export_scene.gltf(**export_kwargs)
    log("done")


if __name__ == "__main__":
    main()
