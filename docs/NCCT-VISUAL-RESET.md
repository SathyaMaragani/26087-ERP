# NCCT — Visual Reset

The previous look (black ground, cream serif, copper accent, glowing nodes, rounded dark cards) was one formula applied to every screen. This document records why it fails, what replaces it, and how each part is built. Product architecture, routes, auth, data contracts and the backend are unchanged.

## 1. What was wrong

| Problem | Evidence in the old build |
| --- | --- |
| One accent everywhere | Copper marked buttons, active states, numbers, links and warnings alike, so colour carried no meaning. |
| Generic 3D | A cloud of glowing points joined by thin lines. It read as decoration; nothing in it could be read as an institution, a programme or a learner. |
| Static hero | Background + particles + large headline. The "sequence" only faded things in. |
| Loading screen as a mock-up | A counter list ("NODES 0853") over blurred lines. |
| Every module identical | Dark ground, network lines, big serif heading, rounded cards, the same empty state. |
| Card dependence | Nearly every block was `rounded rectangle → title → subtitle → empty state`. |
| Slow, floaty motion | 600–900 ms fades on ordinary UI. |
| Serif everywhere | The editorial serif was on every page heading, so it stopped meaning "story". |

## 2. Art direction: the NCCT Atlas

The whole ecosystem is a **computational atlas**: a terrain in which institutions are raised ground, programmes are structures standing on it, learners are markers, and signals travel between them. It is neither a literal map nor a galaxy. Ground is ink; information is paper; the system is ultramarine.

Three registers, kept apart on purpose:

- **Story** (landing, cold open): large grotesk display type, asymmetry, silence, one idea per screen.
- **System** (the ERP): neo-grotesk, flat open layouts, hairline rules, dense data, few boxes.
- **Data** (numbers, ids, coordinates): monospace with tabular figures.

## 3. Colour — semantic, not decorative

| Token | Hex | Meaning |
| --- | --- | --- |
| `--ink-0/1/2` | `#070B14 · #0C1220 · #121A2B` | The system environment (ground, raised, inset). |
| `--paper` | `#F0EDE6` | Human content and editorial information. |
| `--net` (ultramarine) | `#4E63FF` | Network, information, the active system, primary action. |
| `--live` (cyan) | `#6FD3DB` | Live, connected, synchronised. |
| `--ok` (sage) | `#84B9A6` | Stable, healthy, completed. |
| `--alert` (vermillion) | `#EE5B49` | Warning, conflict, attention. Used sparingly. |

Copper/orange is retired. Modules take a signature from this set — timetable *live*, attendance *net*, hostel *ok*, ecosystem *net*, analytics *paper* — so a page's colour tells you what kind of surface it is.

## 4. Typography

- **Bricolage Grotesque** — story/display: hero, chapter titles, module mastheads.
- **Geist** — the ERP: headings, body, controls. Tight tracking, sentence case.
- **Geist Mono** — data, ids, coordinates, timestamps, micro-labels (uppercase, tracked).

No serif anywhere. Emphasis is colour and weight, not italics.

## 5. The 3D concept

`src/3d` builds a **topographic atlas** from real primitives:

- **Terrain** — a displaced heightfield of the Indian landmass (mask texture from an outline polygon). A shader draws **contour lines** from height with derivative-based anti-aliasing, lights the surface from the height gradient, and fades into ink-blue fog. Seas stay flat and dim.
- **Institutions** — raised plateaus with prisms on them, placed by geography.
- **Signals** — arcs between institutions carrying travelling pulses, so information visibly moves through a hierarchy (NCCT → VAMNICOM → RICMs → ICMs).
- **Programmes** — hex prisms clustered at institutions, height = fill.
- **Learners** — instanced slim markers; **credentials/employment** — paths leaving the landmass.
- **Depth** — foreground structure, active midground, distant terrain, and the type plane, each parallaxing at its own rate.

If an object has no conceptual purpose it is not in the scene. No spheres, rings, halos or orbiting anything.

## 6. Motion system (`src/motion`)

Fast where the user acts (110–200 ms, springs), long only where a scene changes. Motion happens because state changes: a QR rotates because the token expired; a session enters the timeline because it was scheduled; a bed changes state because it was allocated. Primitives: `Reveal`, `TextMask`, `SignalLine`, `SpatialZoom`, `AtlasCamera`, `SceneTransition`, `TimelineMotion`, `VerificationPulse`, `ResourceTransfer`, `CountUp`, `MagneticInteraction`.

## 7. Hero sequence (≈ 8 s, skippable, once per session)

1. **Black** — grain only.
2. **Signal** — a single luminous line crosses the terrain and stops; a point appears where it stops.
3. **Second signal** — a perpendicular path arrives; the crossing becomes a system.
4. **Atlas** — contours propagate outward from the crossing; the landmass reveals; the camera rises.
5. **Human presence** — institutions rise, programme prisms and learner markers appear, signals begin to travel.
6. **Title** — magazine-cover typography: masked lines, tracking settle, depth. Chapters follow on scroll.

## 8. Cold open (app entry, ≈ 3 s)

Dark frame with `NCCT / DIGITAL INFRASTRUCTURE` → a horizontal signal scans → it meets a node → the node opens into a hexagonal structure → structures link → the wordmark resolves → the interface **cuts** in with a clip-path wipe. Real health/session checks run underneath and surface as one quiet line. Click or press a key to skip.

## 9. Module personalities

| Module | Identity | Signature |
| --- | --- | --- |
| Timetable | Temporal instrument | Full-width hour axis, live *now* marker, one lane per day/room, conflicts drawn as collisions. |
| Attendance | Live verification | A centred instrument: the rotating credential inside a graduated ring, no cards. |
| Hostel & logistics | Resource map | Buildings as elevations of floors and rooms; bed states AVAILABLE → RESERVED → OCCUPIED; supply as a flow of lanes. |
| Ecosystem | The Atlas | Full-bleed terrain; national → institution → programme → learner by camera. |
| Analytics | Editorial data | Large numerals, column layouts, questions as headlines. |

## 10. Navigation

A slim coordinate rail: each module has an index (`01 … 14`); hover or keyboard focus widens it to reveal labels; the active module carries a marker and its coordinate is echoed at the foot. A thin top strip holds context, a system-status point, the command line and identity. The lifecycle bar stays as a hairline scale.

## 11. Responsive

Mobile keeps the same story with adapted interaction: the atlas frames vertically and uses fewer instances; the timetable stacks days; attendance is one focused instrument; the rail becomes a bottom bar; the explorer's list drives the camera.

## 12. Performance

Scenes are lazy-loaded; terrain is one draw call (displacement in the vertex shader); learners and programme prisms are `InstancedMesh`; arcs share one geometry pool; DPR adapts to frame time; particle-like counts drop on phones; everything disposes on unmount. No post-processing library — grain and vignette are CSS.

## Anti-slop rules applied

No decorative glow, blur or gradient washes; no floating spheres; no repeated identical cards; radii are small and geometric; shadows are rare; empty states explain the system; every animation answers a state change.

## Implementation status

Done and verified in the running app (desktop 1440×900, mobile 390×844, SwiftShader WebGL):

- Atlas palette/type tokens, grain and graticule layer, retired cream serif and orange/copper.
- `3d/` Atlas: displaced topographic terrain, contour shader, institution plateaus, prisms and learner markers, signal arcs, credential plane, spring camera with portrait framing.
- Cinematic landing with scroll-travelled chapters; cold-open boot (real health checks; short for returning sessions).
- Coordinate rail (numbered index), quiet top bar, faster non-blurred spatial page transitions, per-module accent via `data-module`.
- Timetable as a temporal instrument (hour ruling and a live now-marker; clashes marked from real conflict data).
- Ecosystem explorer rebuilt on prisms and contour rings over a ground plane (no glowing spheres).
- Explanatory empty states (Hostel states only what the backend supports: available, occupied, maintenance; no fabricated "reserved" state).

Known remaining work: further module-specific spatial treatments (Attendance live verification instrument, Hostel room map), a `design-system/` folder extraction, and an ESLint config (none exists in the repo).
