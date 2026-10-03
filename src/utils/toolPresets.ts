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
/* Effect library (copy-ready snippets)                                        */
/* -------------------------------------------------------------------------- */

export interface EffectSnippet {
  id: string;
  label: string;
  description: string;
  category: 'Motion' | 'Shape' | 'Surface' | 'Text' | 'Layout';
  css: string;
}

export const EFFECT_SNIPPETS: EffectSnippet[] = [
  {
    id: 'float-loop',
    label: 'Levitation Loop',
    description: 'Endless gentle float — pair with any panel',
    category: 'Motion',
    css: `@keyframes float {\n  0%, 100% { transform: translateY(0); }\n  50% { transform: translateY(-10px); }\n}\n#id_details {\n  animation: float 3s ease-in-out infinite;\n}`,
  },
  {
    id: 'glow-pulse',
    label: 'Neon Pulse',
    description: 'Breathing neon glow using drop-shadow',
    category: 'Motion',
    css: `@keyframes neonPulse {\n  0%, 100% { filter: drop-shadow(0 0 4px currentColor) brightness(1); }\n  50% { filter: drop-shadow(0 0 16px currentColor) brightness(1.35); }\n}\n#id_comments {\n  color: #22d3ee;\n  animation: neonPulse 2.4s ease-in-out infinite;\n}`,
  },
  {
    id: 'morph-blob',
    label: 'Blob Morph',
    description: 'Liquid shape-shifting corners',
    category: 'Shape',
    css: `@keyframes morphBlob {\n  0%, 100% { border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%; }\n  34% { border-radius: 70% 30% 46% 54% / 30% 62% 38% 70%; }\n  67% { border-radius: 33% 67% 58% 42% / 63% 35% 65% 37%; }\n}\n#id_about {\n  animation: morphBlob 9s ease-in-out infinite;\n}`,
  },
  {
    id: 'hex-clip',
    label: 'Hexagon Clip',
    description: 'Clip any panel or avatar into a hexagon',
    category: 'Shape',
    css: `#id_equipment {\n  clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);\n}`,
  },
  {
    id: 'vignette-mask',
    label: 'Vignette Fade',
    description: 'Feathered mask that fades the panel edges',
    category: 'Shape',
    css: `#id_journal {\n  -webkit-mask-image: radial-gradient(ellipse, black 40%, transparent 100%);\n  mask-image: radial-gradient(ellipse, black 40%, transparent 100%);\n}`,
  },
  {
    id: 'glass-panel',
    label: 'Frosted Glass',
    description: 'Blurred translucent surface for any panel',
    category: 'Surface',
    css: `#id_friends, #id_comments {\n  background-color: rgba(15, 23, 42, 0.5);\n  backdrop-filter: blur(10px) saturate(140%);\n  -webkit-backdrop-filter: blur(10px) saturate(140%);\n}`,
  },
  {
    id: 'gradient-edge',
    label: 'Gradient Border',
    description: 'Two-layer background trick for gradient borders',
    category: 'Surface',
    css: `#id_details {\n  border: 2px solid transparent;\n  background-image: linear-gradient(rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.92)),\n    linear-gradient(120deg, #22d3ee, #a855f7, #f472b6);\n  background-origin: border-box;\n  background-clip: padding-box, border-box;\n}`,
  },
  {
    id: 'scanline-overlay',
    label: 'CRT Scanlines',
    description: 'Retro monitor texture overlay',
    category: 'Surface',
    css: `#column_1, #column_2, #column_3 {\n  background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.045) 0px, rgba(255,255,255,0.045) 1px, transparent 1px, transparent 3px);\n}`,
  },
  {
    id: 'neon-heading',
    label: 'Neon Heading',
    description: 'Glowing section titles',
    category: 'Text',
    css: `#id_details h2, #id_comments h2 {\n  color: #7dd3fc;\n  letter-spacing: 0.08em;\n  text-transform: uppercase;\n  text-shadow: 0 0 6px rgba(125, 211, 252, 0.9), 0 0 18px rgba(56, 189, 248, 0.5);\n}`,
  },
  {
    id: 'gradient-text',
    label: 'Gradient Text',
    description: 'Background-clipped gradient headline text',
    category: 'Text',
    css: `#id_about h2 {\n  background: linear-gradient(90deg, #f472b6, #a855f7, #22d3ee);\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n}`,
  },
  {
    id: 'stack-columns',
    label: 'Stack Columns',
    description: 'Force a single-column mobile-style stack',
    category: 'Layout',
    css: `#columns {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  width: 640px;\n  max-width: 100%;\n}`,
  },
  {
    id: 'sticky-panel',
    label: 'Sticky Panel',
    description: 'Keep a panel pinned inside its column while scrolling',
    category: 'Layout',
    css: `#id_details {\n  position: sticky;\n  top: 12px;\n  z-index: 5;\n}`,
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
