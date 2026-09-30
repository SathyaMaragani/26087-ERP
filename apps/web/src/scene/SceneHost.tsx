import { lazy, Suspense, useEffect } from 'react';
import { useDeviceTier } from '../lib/device';
import { sceneStore } from './sceneStore';

// The whole 3D stack (three + fiber + the atlas) is split out of the initial bundle.
const NetworkScene = lazy(() => import('../3d/AtlasScene'));

/**
 * Persistent full-viewport environment behind the landing, sign-in and boot screens.
 * It never blocks first paint: the CSS backdrop renders immediately and the canvas
 * fades in once the chunk and context are ready.
 */
export function SceneHost({ hidden = false }: { hidden?: boolean }) {
  const tier = useDeviceTier();

  useEffect(() => {
    sceneStore.fade = hidden ? 0 : 1;
  }, [hidden]);

  return (
    <div className={`scene-host${hidden ? ' scene-host--hidden' : ''}`} aria-hidden="true">
      <div className="scene-backdrop" />
      {tier.webgl && (
        <Suspense fallback={null}>
          <div className="scene-canvas">
            <NetworkScene tier={tier} />
          </div>
        </Suspense>
      )}
      <div className="scene-vignette" />
    </div>
  );
}
