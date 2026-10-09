import { AnimationPreset } from '../types/profile';

/* -------------------------------------------------------------------------- */
/* Motion: morphs + 3D presets                                                 */
/* -------------------------------------------------------------------------- */

export interface MotionPreset {
  id: AnimationPreset;
  label: string;
  description: string;
  icon: string;
}

/** Shape morphology — the element continually reshapes itself. */
export const MORPH_PRESETS: MotionPreset[] = [
  {
    id: 'morphBlob',
    label: 'Blob Morph',
    description: 'Organic blob cycling through liquid corner radii',
    icon: '🫧',
  },
  {
    id: 'morphLiquid',
    label: 'Liquid Wobble',
    description: 'Soft pulsing blob with drifting border radius',
    icon: '💧',
  },
  {
    id: 'morphCorners',
    label: 'Corner Shift',
    description: 'Square ↔ capsule corner transformation',
    icon: '🔲',
  },
  {
    id: 'morphJelly',
    label: 'Jelly Squash',
    description: 'Squash-and-stretch elasticity',
    icon: '🍮',
  },
];

/** Dimensional presentation — CSS 3D transforms with perspective. */
export const THREE_D_PRESETS: MotionPreset[] = [
  {
    id: 'tilt3d',
    label: '3D Tilt Sway',
    description: 'Panel gently sways on the Y and X axes',
    icon: '🎴',
  },
  {
    id: 'flip3d',
    label: '3D Flip Card',
    description: 'Full Y-axis card flip with perspective',
    icon: '🃏',
  },
  {
    id: 'swing3d',
    label: 'Hanging Swing',
    description: 'Top-hinged 3D pendulum swing',
    icon: '🕰️',
  },
  {
    id: 'depthPop',
    label: 'Depth Pop',
    description: 'Pulses toward the viewer on the Z axis',
    icon: '🔭',
  },
  {
    id: 'orbit3d',
    label: 'Orbital Tilt',
    description: 'Smooth two-axis orbital rotation through 3D space',
    icon: '🪐',
  },
  {
    id: 'cubeTurn',
    label: 'Cube Turn',
    description: 'Rotates around a diagonal 3D axis',
    icon: '🎲',
  },
  {
    id: 'cardHover3d',
    label: 'Card Lift',
    description: 'Lifts toward the viewer while tilting like a card',
    icon: '🪪',
  },
  {
    id: 'roll3d',
    label: 'Depth Roll',
    description: 'Rolls around the Z axis with perspective depth',
    icon: '🌀',
  },
  {
    id: 'parallax3d',
    label: 'Parallax Drift',
    description: 'Moves along all three axes for a layered parallax feel',
    icon: '🌌',
  },
];

/* -------------------------------------------------------------------------- */
/* Surface tokens (static, composable)                                         */
/* -------------------------------------------------------------------------- */

export interface SurfaceToken {
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Single-line CSS declarations appended to the element's customCss. */
  css: (accent: string) => string;
}

export const SURFACE_TOKENS: SurfaceToken[] = [
  {
    id: 'neonGlow',
    label: 'Neon Glow',
    description: 'Outer + inset glow in the accent colour',
    icon: '💡',
    css: (accent) =>
      `box-shadow: 0 0 26px ${accent}88, inset 0 0 18px ${accent}33`,
  },
  {
    id: 'glass',
    label: 'Glass Blur',
    description: 'Frosted translucent panel surface',
    icon: '🧊',
    css: () =>
      'background-color: rgba(15, 23, 42, 0.55); backdrop-filter: blur(10px) saturate(140%); -webkit-backdrop-filter: blur(10px) saturate(140%)',
  },
  {
    id: 'edgeBeam',
    label: 'Gradient Edge',
    description: 'Animated-style gradient border via background clipping',
    icon: '🔆',
    css: (accent) =>
      `border: 2px solid transparent; background-image: linear-gradient(rgba(15,23,42,0.92), rgba(15,23,42,0.92)), linear-gradient(120deg, ${accent}, #f472b6); background-origin: border-box; background-clip: padding-box, border-box`,
  },
  {
    id: 'scanlines',
    label: 'CRT Scanlines',
    description: 'Retro overlay line texture',
    icon: '📺',
    css: () =>
      'background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)',
  },
  {
    id: 'tiltPlane',
    label: '3D Plane',
    description: 'Static perspective tilt — the "absolute plane" look',
    icon: '🧱',
    css: () => 'transform: perspective(900px) rotateY(-9deg) rotateX(5deg)',
  },
  {
    id: 'innerFrame',
    label: 'Inner Frame',
    description: 'Refined double-edge framing',
    icon: '🖼️',
    css: (accent) => `outline: 1px solid ${accent}55; outline-offset: -6px`,
  },
];

/* -------------------------------------------------------------------------- */
/* Background studio                                                           */
/* -------------------------------------------------------------------------- */

export interface BackgroundConfig {
  color: string;
  gradient: 'none' | 'linear' | 'radial';
  gradientFrom: string;
  gradientTo: string;
  gradientAngle: number;
  image: string;
  repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  size: 'cover' | 'contain' | 'auto';
  attachment: 'scroll' | 'fixed';
  vignette: boolean;
}

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  color: '#0e111a',
  gradient: 'none',
  gradientFrom: '#1e1b4b',
  gradientTo: '#0e111a',
  gradientAngle: 160,
  image: '',
  repeat: 'no-repeat',
  size: 'cover',
  attachment: 'scroll',
  vignette: false,
};

/** `body#viewer { … }` surface rule — the same contract the exporter emits. */
export function backgroundCss(config: BackgroundConfig): string {
  const layers: string[] = [];
  if (config.vignette) {
    layers.push(
      'radial-gradient(ellipse at center, transparent 45%, rgba(0, 0, 0, 0.65) 100%)'
    );
  }
  if (config.gradient === 'linear') {
    layers.push(
      `linear-gradient(${config.gradientAngle}deg, ${config.gradientFrom}, ${config.gradientTo})`
    );
  } else if (config.gradient === 'radial') {
    layers.push(`radial-gradient(circle at center, ${config.gradientFrom}, ${config.gradientTo})`);
  }
  if (config.image.trim()) {
    layers.push(`url('${config.image.trim()}')`);
  }

  const lines = [
    'body#viewer {',
    `  background-color: ${config.color};`,
    layers.length ? `  background-image: ${layers.join(', ')};` : '',
    layers.length ? `  background-repeat: ${layers.map(() => config.repeat).join(', ')};` : '',
    layers.length ? `  background-size: ${layers.map(() => config.size).join(', ')};` : '',
    '  background-position: center top;',
    `  background-attachment: ${config.attachment};`,
    '}',
  ].filter(Boolean);
  return lines.join('\n');
}
