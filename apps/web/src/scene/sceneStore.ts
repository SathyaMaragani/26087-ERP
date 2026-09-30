/**
 * Imperative bridge between React (routes, scroll, forms) and the WebGL loop.
 * The scene reads this every frame; writing to it never triggers a React render.
 */
export const sceneStore = {
  /** Position along the lifecycle, 0 (enter) .. 1 (command). */
  target: 0,
  /** Follow speed: higher = snappier. Scroll uses a tight value; role previews a slow one. */
  damping: 5,
  /** Camera parallax strength (0 disables). */
  parallax: 1,
  /** Whether the certificate specimen may render (only meaningful near the verify stage). */
  showCertificate: true,
  /** Tint blended into institution/signal colours (linear RGB), null = none. */
  tint: null as [number, number, number] | null,
  /** 1 shifts the scene off-centre per stage so copy and form never overlap; 0 keeps it centred. */
  composition: 0,
  /** Constant horizontal camera shift (positive moves the scene left). Sign-in uses it to keep the form off the network. */
  shiftX: 0,
  /** Seconds since the opening sequence began (8+ means finished). Landing reads it to time typography. */
  introT: 0,
  /** Set true to jump straight to the end of the opening sequence. */
  introSkip: false,
  /** Live counters published by the scene while the network forms (real, not scripted). */
  nodesOnline: 0,
  linksOnline: 0,
  /** Distance from camera to its focal point (drives depth of field). */
  focus: 14,
  /** Depth-of-field strength. */
  aperture: 0.03,
  /** 0..1 smoothed scroll speed; speeds information flow. */
  scrollVel: 0,
  /** 0..1, fades the whole scene (used when entering the application). */
  fade: 1,
};

export const STAGE_STEP = 1 / 6;
export const stageToProgress = (stage: number) => stage * STAGE_STEP;

export const CAMERA_STATES = ['INTRO', 'NETWORK', 'LEARNING', 'CREDENTIAL', 'EMPLOYMENT', 'OUTCOME', 'COMMAND_CENTER'] as const;
export type CameraState = (typeof CAMERA_STATES)[number];
export const INTRO_SEEN_KEY = 'ncct_intro_seen';
export const INTRO_LENGTH = 8.4;
