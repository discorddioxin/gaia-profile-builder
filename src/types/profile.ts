export type ElementType =
  | 'text'
  | 'quote'
  | 'image'
  | 'video'
  | 'code'
  | 'clear'
  | 'link'
  | 'box';

export interface MaskConfig {
  enabled: boolean;
  type: 'linear-gradient' | 'radial-gradient' | 'preset' | 'custom';
  preset: string; // 'fade-bottom' | 'radial-spotlight' | 'vignette' | 'diamond' | 'feather-edges' | 'brush-grunge'
  angle: number; // in deg (for linear)
  stops: Array<{ color: string; stop: number }>;
  feather: number; // 0 to 100
  invert: boolean;
  shape: 'circle' | 'ellipse';
  customValue?: string;
}

export interface ClipPoint {
  x: number; // in %
  y: number; // in %
}

export interface ClipConfig {
  enabled: boolean;
  type: 'polygon' | 'circle' | 'ellipse' | 'inset' | 'preset';
  preset: string; // 'hexagon' | 'star' | 'beveled' | 'badge' | 'rhombus' | 'chevron' | 'cyber-cut' | 'octagon'
  vertices: ClipPoint[];
  circleRadius: number; // %
  circleCenterX: number; // %
  circleCenterY: number; // %
  insetRadius: number; // px
  customValue?: string;
}

export type AnimationPreset =
  | 'float'
  | 'neonPulse'
  | 'glitchShake'
  | 'shimmerSweep'
  | 'rotate3d'
  | 'heartbeat'
  | 'bounce'
  | 'marquee'
  | 'rainbowBorder'
  | 'fadeIn'
  | 'scanline'
  | 'cyberBlink';

export interface AnimationConfig {
  enabled: boolean;
  preset: AnimationPreset;
  duration: number; // seconds
  delay: number; // seconds
  timing: 'linear' | 'ease' | 'ease-in-out' | 'ease-out' | 'cubic-bezier(0.4, 0, 0.2, 1)';
  iteration: 'infinite' | '1' | '2' | '3';
  direction: 'normal' | 'alternate' | 'reverse';
  trigger: 'always' | 'hover';
}

export interface ProfileElement {
  id: string;
  name: string;
  type: ElementType;
  content: string; // text body, quote content, image url, youtube id/url, code text
  linkUrl?: string; // target URL for [url] / <a>
  colorMarker: string; // e.g. '#1', '#2' for span[style*='color: #1']
  useAttributeSelector: boolean;

  // Geometry (Freeform canvas positioning)
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  rotate: number; // 0 - 360
  opacity: number; // 0 - 100
  locked: boolean;
  hidden: boolean;

  // Styling & Typography
  color: string;
  backgroundColor: string;
  backgroundImage?: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline' | 'line-through';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  fontFamily: string;
  borderWidth: number;
  borderColor: string;
  borderStyle: 'none' | 'solid' | 'dashed' | 'dotted' | 'double';
  borderRadius: number;
  boxShadow: string;
  backdropFilter?: string;
  padding: number;
  overflow: 'visible' | 'hidden' | 'auto';

  // Advanced features
  mask: MaskConfig;
  clip: ClipConfig;
  animation: AnimationConfig;

  // Optional custom classes or tags
  customCss?: string;
}

export interface CustomComponent {
  id: string;
  title: string;
  description: string;
  category: 'Avatars & Badges' | 'Cards & Quotes' | 'Media & Embeds' | 'Accents & Borders' | 'My Saved';
  previewColor?: string;
  elements: ProfileElement[];
  createdAt: number;
}

export interface CanvasSettings {
  width: number; // e.g. 720 (classic forum profile width) or 880 (modern) or 390 (mobile)
  height: number; // canvas height e.g. 960
  backgroundColor: string;
  backgroundImage?: string;
  backgroundRepeat?: string;
  backgroundSize?: string;
  gridSnap: boolean;
  gridSize: number;
  showGrid: boolean;
  profileTitle: string;
  forumTheme: 'dark-cyber' | 'retro-terminal' | 'anime-portal' | 'gothic-dark' | 'synthwave';
}

export interface Profile {
  id: string;
  title: string;
  elements: ProfileElement[];
  settings: CanvasSettings;
  history: Array<{ elements: ProfileElement[]; settings: CanvasSettings }>;
  historyIdx: number;
  selectedId: string | null;
  // Imported profile fields — when set, the canvas can render raw HTML directly
  isImported?: boolean;
  rawHtml?: string;
  rawCss?: string;
  sourceUrl?: string;
  renderMode?: 'canvas' | 'raw'; // 'raw' displays imported HTML+CSS verbatim, 'canvas' shows reconstructed elements
}

export interface TranspilerOutput {
  html: string;
  css: string;
  bbcode: string;
  fullOutput: string;
  mappings: Array<{
    bbcode: string;
    html: string;
    description: string;
    selector: string;
  }>;
}
