/** GLSL for the atlas terrain and signal paths. Kept apart from React so scenes stay small. */
export const NI = 24;

export const terrainVert = /* glsl */ `
  #define NI ${NI}
  uniform sampler2D uHeightTex;
  uniform vec2 uSize;
  uniform float uHScale;
  uniform vec4 uInst[NI];
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vH;
  varying float vBase;
  varying float vInst;
  varying vec2 vXZ;

  float baseH(vec2 xz) { return texture2D(uHeightTex, xz / uSize + 0.5).r * uHScale; }
  float plateauW(float dist, float r) { float t = clamp((dist - r * 0.55) / (r * 0.45), 0.0, 1.0); return 1.0 - t * t * (3.0 - 2.0 * t); }
  float lift(vec2 xz, out float m) {
    float h = 0.0; m = 0.0;
    for (int i = 0; i < NI; i++) {
      vec4 q = uInst[i];
      if (q.z > 0.0) { float k = plateauW(length(xz - q.xy), q.w); h += k * q.z; m = max(m, k); }
    }
    return h;
  }
  float H(vec2 xz) { float m; return baseH(xz) + lift(xz, m); }

  void main() {
    vec3 p = position;
    float m;
    float b = baseH(p.xz);
    p.y = b + lift(p.xz, m);
    float e = 0.07;
    float hx = H(p.xz + vec2(e, 0.0)) - H(p.xz - vec2(e, 0.0));
    float hz = H(p.xz + vec2(0.0, e)) - H(p.xz - vec2(0.0, e));
    vNormal = normalize(vec3(-hx / (2.0 * e), 1.0, -hz / (2.0 * e)));
    vH = p.y; vBase = b / uHScale; vInst = m; vXZ = p.xz;
    vec4 w = modelMatrix * vec4(p, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

export const terrainFrag = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uPaper;
  uniform vec3 uNet;
  uniform vec3 uLive;
  uniform vec2 uOrigin;
  uniform float uRad;
  uniform float uSweepA;
  uniform float uSweepB;
  uniform float uLineFade;
  uniform float uFog;
  uniform float uContrast;
  uniform float uFade;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vH;
  varying float vBase;
  varying float vInst;
  varying vec2 vXZ;

  float lines(float v, float scale, float soft) {
    float c = v / scale;
    return 1.0 - clamp(abs(fract(c - 0.5) - 0.5) / (fwidth(c) * soft), 0.0, 1.0);
  }

  void main() {
    float d0 = length(vXZ - uOrigin);
    float front = smoothstep(uRad, uRad - 3.2, d0);
    float rim0 = smoothstep(uRad - 3.2, uRad - 2.6, d0) * (1.0 - smoothstep(uRad - 2.6, uRad, d0)); // bright leading edge

    float land = smoothstep(0.03, 0.12, vBase);
    float minor = lines(vH, 0.07, 1.0);
    float major = lines(vH, 0.35, 1.3);

    vec3 L = normalize(vec3(-0.45, 0.85, 0.4));
    float diff = max(dot(vNormal, L), 0.0);
    vec3 V = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(vNormal, V), 0.0), 3.0);

    // Ground: ink with a little relief lighting; plateaus lean toward the system colour.
    vec3 ground = mix(uInk * 1.9, vec3(0.11, 0.15, 0.25), smoothstep(0.0, 1.3, vH));
    ground = mix(ground, uNet * 0.42, vInst * 0.75);
    ground *= 0.55 + diff * 0.9;
    ground += uLive * fres * 0.05 * land;

    vec3 ink = mix(uPaper, uNet + 0.25, vInst);
    float contour = (minor * 0.2 + major * (0.5 + uContrast * 0.4)) * (0.35 + land * 0.65);
    float a = land * 0.9 * front;
    vec3 col = ground;
    float alpha = a;
    col = mix(col, ink, clamp(contour * front, 0.0, 1.0));
    alpha = max(alpha, contour * front * 0.9);

    // Graticule across land and sea: the atlas frame.
    vec2 gp = vXZ * 1.0;
    float gr = max(1.0 - clamp(abs(fract(gp.x - 0.5) - 0.5) / (fwidth(gp.x) * 1.0), 0.0, 1.0), 1.0 - clamp(abs(fract(gp.y - 0.5) - 0.5) / (fwidth(gp.y) * 1.0), 0.0, 1.0));
    float grA = gr * 0.07 * front;
    col = mix(col, uPaper, grA); alpha = max(alpha, grA);

    // Leading edge of the reveal.
    col += uLive * rim0 * 0.35; alpha = max(alpha, rim0 * 0.35);

    // The two opening signals: a luminous wall sliding in x, then another sliding in z.
    float la = exp(-pow((vXZ.x - uSweepA) / 0.025, 2.0));
    float lb = exp(-pow((vXZ.y - uSweepB) / 0.025, 2.0));
    float cross = la * lb;
    vec3 sig = uLive * la + uNet * 1.6 * lb;
    float sa = clamp(la + lb, 0.0, 1.0) * uLineFade;
    col = mix(col, sig + cross * 0.8, sa); alpha = max(alpha, sa);

    // Depth fog into the ink environment.
    float dist = length(cameraPosition - vWorld);
    float fog = 1.0 - exp(-pow(uFog * dist, 2.0));
    col = mix(col, uInk, fog * 0.85);
    alpha *= (1.0 - fog * 0.55) * uFade;
    gl_FragColor = vec4(col, alpha);
  }
`;

export const pathVert = /* glsl */ `
  attribute float aT;
  attribute float aRand;
  varying float vT;
  varying float vRand;
  varying float vDist;
  void main() {
    vT = aT; vRand = aRand;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vDist = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

export const pathFrag = /* glsl */ `
  uniform float uDraw;
  uniform float uTime;
  uniform float uFade;
  uniform float uSpeed;
  uniform float uPulse;
  uniform vec3 uBase;
  uniform vec3 uHot;
  varying float vT;
  varying float vRand;
  varying float vDist;
  void main() {
    float draw = uDraw * 1.35 - vRand * 0.35;
    if (vT > draw) discard;
    float ph = fract(uTime * uSpeed * (0.5 + vRand * 0.7) + vRand * 9.0);
    float pulse = smoothstep(0.075, 0.0, abs(vT - ph)) * uPulse;
    float head = draw < 1.0 ? smoothstep(0.06, 0.0, draw - vT) : 0.0;
    vec3 c = mix(uBase, uHot, clamp(pulse + head, 0.0, 1.0));
    float depth = clamp(1.0 - (vDist - 6.0) / 30.0, 0.25, 1.0);
    float a = (0.32 + pulse * 0.85 + head * 0.6) * uFade * depth;
    gl_FragColor = vec4(c, a);
  }
`;
