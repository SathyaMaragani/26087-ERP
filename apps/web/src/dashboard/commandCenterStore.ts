/**
 * A thin imperative bridge between the global ⌘K command palette (mounted once in AppShell,
 * outside the 'home' module's React tree) and the live CommandCenter instance (mounted only while
 * the user is actually looking at /app, the 'home' module). CommandCenter registers its real
 * control functions here on mount and clears them on unmount; the palette calls through this
 * object rather than holding a direct reference, since the two components don't share a parent
 * that could otherwise pass callbacks down.
 *
 * Every field is optional and starts undefined — the palette must treat a missing function as
 * "not available right now" (e.g. the user isn't on the command-center screen yet) rather than
 * assume it's always there.
 */
export interface CommandCenterHandle {
  regions: string[];
  institutions: Array<{ id: string; name: string }>;
  hasCredentialInView: boolean;
  focusNational: () => void;
  focusRegion: (state: string) => void;
  focusInstitution: (id: string) => void;
  runPulse: () => void;
  returnToNational: () => void;
  setLayer: (key: 'institutions' | 'training' | 'learning' | 'credentials' | 'employment', on: boolean) => void;
  verifyCredentialInView: () => void;
}

export const commandCenterStore: { current: CommandCenterHandle | null } = { current: null };
