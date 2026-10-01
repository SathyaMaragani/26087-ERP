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
  INDIA_BASE   — the merged national landmass, solidified + bevelled + a
                 subtle Himalayan-biased displacement for terrain relief
  BOUNDARIES   — thin bevelled curve objects tracing each state's perimeter,
                 sitting just above the base surface (subtle engraving, not
                 a political infographic)
  NETWORK_SURFACE — a slightly larger, very low-opacity ground plane used as
                 a soft contact-shadow catcher / network backdrop

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
INK = (0.094, 0.125, 0.114, 1.0)         # #18201D
JADE = (0.243, 0.486, 0.416, 1.0)        # #3E7C6A
PALE_JADE = (0.569, 0.702, 0.647, 1.0)   # #91B3A5


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

    # Solidify (extrude down) for real 3D depth.
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=depth)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()

    # Terrain relief: nudge every vertex's Z by a smooth function of its (x, y) —
    # a pure position edit after topology is finalized, so it can't create degenerate faces.
    for v in bm.verts:
        v.co.z += terrain_height(v.co.x, v.co.y)
    bm.normal_update()

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
    col_network = make_collection("NETWORK_SURFACE", root)

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
    assign_material(base_obj, "NCCT_Porcelain", PORCELAIN, roughness=0.78)

    boundary_obj, ring_count = build_state_boundary_curves(states)
    col_boundaries.objects.link(boundary_obj)
    assign_material(boundary_obj, "NCCT_Boundary", PALE_JADE, roughness=0.5)
    log(f"built boundary curve object with {ring_count} ring splines")

    network_obj = build_network_surface(states)
    col_network.objects.link(network_obj)
    assign_material(network_obj, "NCCT_NetworkSurface", WARM_WHITE, roughness=0.95)

    # Apply all modifiers / convert the boundary curve to a mesh before export
    # (GLTF exporter respects export_apply for modifiers, but the curve→mesh
    # conversion needs doing explicitly so the saved .blend and the GLB agree).
    bpy.context.view_layer.objects.active = base_obj
    for obj in bpy.data.objects:
        obj.select_set(obj in (base_obj, boundary_obj))
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
