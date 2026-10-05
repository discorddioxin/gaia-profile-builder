import confetti from 'canvas-confetti';
import type { Options } from 'canvas-confetti';

/**
 * `canvas-confetti` throws asynchronously (inside its own animation frame) when
 * the environment has no 2D canvas — jsdom, some embedded webviews and locked
 * down browsers. A plain try/catch around the call therefore is not enough;
 * check for a usable 2D context up front and skip the celebration instead.
 */
let canvasSupport: boolean | null = null;

function supportsCanvas(): boolean {
  if (canvasSupport !== null) return canvasSupport;
  try {
    const probe = document.createElement('canvas');
    canvasSupport = !!probe.getContext && !!probe.getContext('2d');
  } catch {
    canvasSupport = false;
  }
  return canvasSupport;
}

/** Fire confetti when the platform can render it. Never throws. */
export function celebrate(options?: Options): void {
  if (typeof document === 'undefined' || !supportsCanvas()) return;
  try {
    confetti(options);
  } catch {
    /* ignore — celebrations are cosmetic */
  }
}
