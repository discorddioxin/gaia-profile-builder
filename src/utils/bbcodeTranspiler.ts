import {
  ProfileElement,
  CanvasSettings,
  TranspilerOutput,
  GaiaComponentUsage,
} from '../types/profile';
import {
  buildPanelHtml,
  buildV2Document,
  getGaiaComponent,
  indent,
  isGaiaComponentKind,
  isGaiaPanelElement,
} from './gaiaSpec';
import {
  GAIA_NEUTRAL_FONT_SIZE,
  GAIA_DEFAULT_PAGE_BACKGROUND,
  GAIA_V2_DEFAULT_CSS,
} from './gaiaDefaults';

/**
 * Exact Mappings according to specification:
 * [color], [strike], [u] -> <span>
 * [b], [i] -> <b>, <i>
 * [quote] -> <div class="quote">
 * [url] -> <a>
 * [clear ] -> <div class="clear">
 * [youtube] -> <iframe>
 * [img] -> <img class="user_img">
 * [code] -> <div class="code">
 *
 * CSS Attribute selectors substitute for HTML IDs:
 * span[style*='color: #1']
 * span[style*='color: #2']
 */

export function extractYoutubeId(urlOrId: string): string {
  if (!urlOrId) return 'dQw4w9WgXcQ';
  const match = urlOrId.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : urlOrId.trim();
}

export function getClipPathCss(element: ProfileElement): string {
  const { clip } = element;
  if (!clip || !clip.enabled) return '';

  if (clip.type === 'circle') {
    return `circle(${clip.circleRadius}% at ${clip.circleCenterX}% ${clip.circleCenterY}%)`;
  }
  if (clip.type === 'polygon' || clip.type === 'preset') {
    if (clip.vertices && clip.vertices.length >= 3) {
      return `polygon(${clip.vertices.map((v) => `${v.x}% ${v.y}%`).join(', ')})`;
    }
  }
  if (clip.type === 'inset') {
    return `inset(0px round ${clip.insetRadius}px)`;
  }
  if (clip.customValue) {
    return clip.customValue;
  }
  return '';
}

export function getMaskCss(element: ProfileElement): { webkitMask: string; mask: string } {
  const { mask } = element;
  if (!mask || !mask.enabled) return { webkitMask: '', mask: '' };

  let maskVal = '';
  if (mask.type === 'radial-gradient') {
    const shape = mask.shape || 'circle';
    const solidEnd = Math.max(0, 100 - mask.feather);
    maskVal = `radial-gradient(${shape}, black ${solidEnd}%, transparent 100%)`;
  } else if (mask.type === 'linear-gradient') {
    const angle = mask.angle ?? 180;
    const solidEnd = Math.max(0, 100 - mask.feather);
    maskVal = `linear-gradient(${angle}deg, black 0%, black ${solidEnd}%, transparent 100%)`;
  } else if (mask.preset === 'vignette') {
    maskVal = `radial-gradient(ellipse at center, black 40%, rgba(0,0,0,0.5) 75%, transparent 100%)`;
  } else if (mask.preset === 'diamond') {
    maskVal = `radial-gradient(circle closest-side, black 30%, transparent 100%)`;
  } else if (mask.preset === 'fade-bottom') {
    maskVal = `linear-gradient(180deg, black 60%, transparent 100%)`;
  } else if (mask.preset === 'fade-horizontal') {
    maskVal = `linear-gradient(90deg, transparent 0%, black 20%, black 80%, transparent 100%)`;
  } else if (mask.customValue) {
    maskVal = mask.customValue;
  } else {
    maskVal = `linear-gradient(180deg, black 70%, transparent 100%)`;
  }

  return {
    webkitMask: maskVal,
    mask: maskVal,
  };
}

export function getAnimationKeyframes(): string {
  return `/* CSS Keyframes for Forum Profile Animations */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
}

@keyframes neonPulse {
  0%, 100% {
    filter: drop-shadow(0 0 4px currentColor) brightness(1);
  }
  50% {
    filter: drop-shadow(0 0 16px currentColor) brightness(1.35);
  }
}

@keyframes glitchShake {
  0%, 100% { transform: translate(0); }
  20% { transform: translate(-3px, 2px); }
  40% { transform: translate(2px, -2px); }
  60% { transform: translate(-2px, -1px); }
  80% { transform: translate(3px, 1px); }
}

@keyframes shimmerSweep {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes rotate3d {
  0% { transform: perspective(700px) rotateY(0deg); }
  100% { transform: perspective(700px) rotateY(360deg); }
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.12); }
  30% { transform: scale(1.02); }
  45% { transform: scale(1.15); }
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-16px); }
  60% { transform: translateY(-8px); }
}

@keyframes marquee {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

@keyframes rainbowBorder {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

@keyframes fadeIn {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}

@keyframes scanline {
  0% { background-position: 0 0; }
  100% { background-position: 0 100%; }
}

@keyframes cyberBlink {
  0%, 49.9% { opacity: 1; }
  50%, 100% { opacity: 0.35; }
}

/* Shape morphs — border-radius / squash cycles */
@keyframes morphBlob {
  0%, 100% { border-radius: 42% 58% 63% 37% / 41% 44% 56% 59%; }
  34% { border-radius: 70% 30% 46% 54% / 30% 62% 38% 70%; }
  67% { border-radius: 33% 67% 58% 42% / 63% 35% 65% 37%; }
}

@keyframes morphLiquid {
  0%, 100% { border-radius: 50% 50% 50% 50% / 60% 40% 60% 40%; transform: scale(1); }
  50% { border-radius: 60% 40% 45% 55% / 45% 60% 40% 55%; transform: scale(1.03); }
}

@keyframes morphCorners {
  0%, 100% { border-radius: 4px; }
  50% { border-radius: 999px; }
}

@keyframes morphJelly {
  0%, 100% { transform: scale(1, 1); }
  25% { transform: scale(1.08, 0.92); }
  50% { transform: scale(0.94, 1.06); }
  75% { transform: scale(1.04, 0.96); }
}

/* 3D presentation — always paired with perspective() so the depth reads */
@keyframes tilt3d {
  0%, 100% { transform: perspective(var(--tool-perspective, 900px)) rotateY(0deg) rotateX(0deg); }
  25% { transform: perspective(var(--tool-perspective, 900px)) rotateY(calc(var(--tool-rotate-y, 12deg) * -1)) rotateX(var(--tool-rotate-x, 6deg)); }
  75% { transform: perspective(var(--tool-perspective, 900px)) rotateY(var(--tool-rotate-y, 12deg)) rotateX(calc(var(--tool-rotate-x, 6deg) * -1)); }
}

@keyframes flip3d {
  0% { transform: perspective(var(--tool-perspective, 1000px)) rotateY(0deg); }
  100% { transform: perspective(var(--tool-perspective, 1000px)) rotateY(var(--tool-flip-turn, 360deg)); }
}

@keyframes swing3d {
  0%, 100% { transform: perspective(var(--tool-perspective, 800px)) rotateX(0deg); transform-origin: var(--tool-origin, top center); }
  50% { transform: perspective(var(--tool-perspective, 800px)) rotateX(var(--tool-rotate-x, 24deg)); transform-origin: var(--tool-origin, top center); }
}

@keyframes depthPop {
  0%, 100% { transform: perspective(var(--tool-perspective, 700px)) translateZ(0px); }
  50% { transform: perspective(var(--tool-perspective, 700px)) translateZ(var(--tool-depth, 46px)) scale(1.02); }
}

@keyframes orbit3d {
  0%, 100% { transform: perspective(var(--tool-perspective, 900px)) rotateX(0deg) rotateY(0deg); }
  25% { transform: perspective(var(--tool-perspective, 900px)) rotateX(var(--tool-rotate-x, 12deg)) rotateY(calc(var(--tool-rotate-y, 18deg) * -1)); }
  75% { transform: perspective(var(--tool-perspective, 900px)) rotateX(calc(var(--tool-rotate-x, 12deg) * -1)) rotateY(var(--tool-rotate-y, 18deg)); }
}

@keyframes cubeTurn {
  0% { transform: perspective(var(--tool-perspective, 900px)) rotate3d(1, 1, 0, 0deg); }
  100% { transform: perspective(var(--tool-perspective, 900px)) rotate3d(1, 1, 0, 360deg); }
}

@keyframes cardHover3d {
  0%, 100% { transform: perspective(var(--tool-perspective, 900px)) translateZ(0) rotateX(0) rotateY(0); }
  50% { transform: perspective(var(--tool-perspective, 900px)) translateZ(var(--tool-depth, 34px)) rotateX(var(--tool-rotate-x, 8deg)) rotateY(var(--tool-rotate-y, 10deg)); }
}

@keyframes roll3d {
  0%, 100% { transform: perspective(var(--tool-perspective, 900px)) rotateZ(0deg) translateZ(0); }
  50% { transform: perspective(var(--tool-perspective, 900px)) rotateZ(180deg) translateZ(var(--tool-depth, 24px)); }
}

@keyframes parallax3d {
  0%, 100% { transform: perspective(var(--tool-perspective, 900px)) translate3d(0, 0, 0) rotateX(0) rotateY(0); }
  50% { transform: perspective(var(--tool-perspective, 900px)) translate3d(0, -8px, var(--tool-depth, 32px)) rotateX(var(--tool-rotate-x, 8deg)) rotateY(var(--tool-rotate-y, 12deg)); }
}`;
}

/**
 * Returns the CSS selector for an element.
 * By default, uses the exact CSS attribute selector required:
 * span[style*='color: #1'], span[style*='color: #2'], etc.
 */
export function getElementSelector(element: ProfileElement, index: number): string {
  if (element.useAttributeSelector) {
    const marker = element.colorMarker || `#${index + 1}`;
    return `span[style*='color: ${marker}']`;
  }
  // If specific class mapping applies:
  switch (element.type) {
    case 'quote':
      return `.quote:nth-of-type(${index + 1})`;
    case 'image':
      return `.user_img:nth-of-type(${index + 1})`;
    case 'code':
      return `.code:nth-of-type(${index + 1})`;
    case 'clear':
      return `.clear`;
    default:
      return `span[style*='color: #${index + 1}']`;
  }
}

/* -------------------------------------------------------------------------- */
/* Gaia-first code generation                                                  */
/* -------------------------------------------------------------------------- */

type Column = 1 | 2 | 3;

interface GaiaPanelSlot {
  slotKind: 'gaia';
  element: ProfileElement;
  def: ReturnType<typeof getGaiaComponent>;
  column: Column;
  panelId: string;
  index: number;
}

interface FreeformSlot {
  slotKind: 'freeform';
  column: Column;
  elements: ProfileElement[];
  /** Custom panel index used for `id_custom_####`. */
  customIndex: number;
  /** Vertical space the absolutely positioned children need. */
  contentHeight: number;
  /** X offset of the column band, subtracted from child positions. */
  originX: number;
}

type ColumnSlot = GaiaPanelSlot | FreeformSlot;

const BBCODE_ONLY_TYPES: ProfileElement['type'][] = ['quote', 'code', 'video', 'link', 'image', 'clear'];

function styleLines(pairs: Array<[string, string | number | undefined | null]>): string[] {
  return pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== '' && value !== 'none')
    .map(([prop, value]) => `  ${prop}: ${value};`);
}

/**
 * Overrides for a single Gaia panel instance, keyed on its Gaia selector.
 *
 * These are *overrides only*: anything still at its Gaia-neutral value is left
 * out so the pasted CSS layers on top of Gaia's default V2 stylesheet instead
 * of restating (or fighting) it.
 */
function buildPanelCss(slot: GaiaPanelSlot): string {
  const el = slot.element;
  const def = slot.def;
  const selector = `#${slot.panelId}`;
  const lines: string[] = [];

  const bodyLines = styleLines([
    // Width is owned by the V2 column, not the panel — the spec requires
    // #columns/#column_N to control reflow.
    ['background-color', el.backgroundColor !== 'transparent' ? el.backgroundColor : undefined],
    ['background-image', el.backgroundImage ? `url('${el.backgroundImage}')` : undefined],
    ['background-size', el.backgroundImage ? 'cover' : undefined],
    ['background-position', el.backgroundImage ? 'center' : undefined],
    ['border', el.borderWidth > 0 && el.borderStyle !== 'none' ? `${el.borderWidth}px ${el.borderStyle} ${el.borderColor}` : undefined],
    ['border-radius', el.borderRadius > 0 ? `${el.borderRadius}px` : undefined],
    ['padding', el.padding > 0 ? `${el.padding}px` : undefined],
    ['box-shadow', el.boxShadow],
    ['backdrop-filter', el.backdropFilter],
    ['overflow', el.overflow !== 'visible' ? el.overflow : undefined],
    ['color', el.color !== 'inherit' ? el.color : undefined],
    ['text-align', el.textAlign !== 'left' ? el.textAlign : undefined],
    ['font-size', el.fontSize !== GAIA_NEUTRAL_FONT_SIZE ? `${el.fontSize}px` : undefined],
    ['font-family', el.fontFamily && el.fontFamily !== 'inherit' ? el.fontFamily : undefined],
    ['font-weight', el.fontWeight !== 'normal' ? el.fontWeight : undefined],
    ['font-style', el.fontStyle !== 'normal' ? el.fontStyle : undefined],
    ['transform', el.rotate ? `rotate(${el.rotate}deg)` : undefined],
    ['opacity', el.opacity < 100 ? (el.opacity / 100).toFixed(2) : undefined],
    ['z-index', el.zIndex > 1 ? el.zIndex : undefined],
  ]);
  const clipCss = getClipPathCss(el);
  const maskCss = getMaskCss(el);
  const hasAnimation = !!el.animation?.enabled && el.animation.trigger === 'always';
  const hasHoverAnimation = !!el.animation?.enabled && el.animation.trigger === 'hover';

  const headingLines = styleLines([
    ['color', el.color !== 'inherit' ? el.color : undefined],
    ['font-size', el.fontSize !== GAIA_NEUTRAL_FONT_SIZE ? `${Math.max(12, Math.round(el.fontSize + 2))}px` : undefined],
    ['font-weight', el.fontWeight !== 'normal' ? el.fontWeight : undefined],
    ['text-align', el.textAlign !== 'left' ? el.textAlign : undefined],
  ]);

  const styled =
    bodyLines.length > 0 ||
    headingLines.length > 0 ||
    !!clipCss ||
    !!maskCss.webkitMask ||
    hasAnimation ||
    hasHoverAnimation ||
    !!el.customCss;
  if (!styled) return '';

  lines.push(`/* ${def.label} — override for the Gaia V2 component root ${selector} (${def.panelClass.split(' ')[0]}) */`);
  lines.push(`${selector} {`);
  lines.push(...bodyLines);
  if (clipCss) lines.push(`  clip-path: ${clipCss};`);
  if (maskCss.webkitMask) {
    lines.push(`  -webkit-mask-image: ${maskCss.webkitMask};`);
    lines.push(`  mask-image: ${maskCss.mask};`);
  }
  if (hasAnimation) {
    const a = el.animation!;
    lines.push(`  animation: ${a.preset} ${a.duration}s ${a.timing} ${a.delay}s ${a.iteration} ${a.direction};`);
  }
  if (el.customCss) lines.push(`  ${el.customCss}`);
  lines.push('}');

  if (hasHoverAnimation) {
    const a = el.animation!;
    lines.push(`${selector}:hover {`);
    lines.push(`  animation: ${a.preset} ${a.duration}s ${a.timing} ${a.delay}s ${a.iteration} ${a.direction};`);
    lines.push('}');
  }

  // Title + inner typography overrides, still authored against the Gaia panel
  // classes and only when the user actually changed the panel typography.
  if (headingLines.length > 0) {
    lines.push(`${selector} > h2 {`);
    lines.push(...headingLines);
    lines.push('}');
  }

  return lines.join('\n');
}

/** Single-element entry point used by the builder canvas preview. */
export function buildGaiaPanelOverrideCss(el: ProfileElement, panelId: string): string {
  const kind = el.gaia?.kind;
  const def = getGaiaComponent(kind && isGaiaComponentKind(kind) ? kind : 'custom');
  return buildPanelCss({ slotKind: 'gaia', element: el, def, column: el.gaia?.column || 1, panelId, index: 1 });
}

/** CSS for a freeform group wrapped in a Gaia custom panel (`.panel.custom_panel`). */
function buildFreeformCss(slot: FreeformSlot): string {
  const panelId = `id_custom_${slot.customIndex}`;
  const contentId = `custom_${slot.customIndex}_content`;
  const parts: string[] = [];

  parts.push(`/* Freeform canvas content wrapped in a Gaia custom panel */`);
  parts.push(`#${panelId} #${contentId} {`);
  parts.push(`  position: relative;`);
  parts.push(`  min-height: ${Math.max(40, Math.round(slot.contentHeight))}px;`);
  parts.push(`}`);

  slot.elements.forEach((el, idx) => {
    const marker = el.colorMarker || `#${idx + 1}`;
    // `[style*=...]` matches both the spec's span carrier and the div carrier
    // used for block-level payloads.
    const selector = `#${panelId} #${contentId} [style*='color: ${marker}']`;
    const clipCss = getClipPathCss(el);
    const maskCss = getMaskCss(el);

    parts.push(`/* ${el.name} (${el.type}) */`);
    parts.push(`${selector} {`);
    parts.push(...styleLines([
      ['position', 'absolute'],
      ['left', `${Math.round(el.x - slot.originX)}px`],
      ['top', `${Math.round(el.y)}px`],
      ['width', `${el.width}px`],
      ['height', `${el.height}px`],
      ['z-index', el.zIndex],
      ['box-sizing', 'border-box'],
      ['transform', el.rotate ? `rotate(${el.rotate}deg)` : undefined],
      ['opacity', el.opacity < 100 ? (el.opacity / 100).toFixed(2) : undefined],
      ['background-color', el.backgroundColor],
      ['background-image', el.backgroundImage ? `url('${el.backgroundImage}')` : undefined],
      ['background-size', el.backgroundImage ? 'cover' : undefined],
      ['border', el.borderWidth > 0 ? `${el.borderWidth}px ${el.borderStyle} ${el.borderColor}` : undefined],
      ['border-radius', el.borderRadius > 0 ? `${el.borderRadius}px` : undefined],
      ['padding', el.padding > 0 ? `${el.padding}px` : undefined],
      ['box-shadow', el.boxShadow],
      ['overflow', el.overflow],
      ['clip-path', clipCss || undefined],
      ['-webkit-mask-image', maskCss.webkitMask || undefined],
      ['mask-image', maskCss.mask || undefined],
      ['color', el.color],
      ['font-size', `${el.fontSize}px`],
      ['font-family', el.fontFamily && el.fontFamily !== 'inherit' ? el.fontFamily : undefined],
      ['text-align', el.textAlign],
    ]));
    if (el.animation?.enabled && el.animation.trigger === 'always') {
      const a = el.animation;
      parts.push(`  animation: ${a.preset} ${a.duration}s ${a.timing} ${a.delay}s ${a.iteration} ${a.direction};`);
    }
    if (el.customCss) parts.push(`  ${el.customCss}`);
    parts.push('}');

    if (el.animation?.enabled && el.animation.trigger === 'hover') {
      const a = el.animation;
      parts.push(`${selector}:hover {`);
      parts.push(`  animation: ${a.preset} ${a.duration}s ${a.timing} ${a.delay}s ${a.iteration} ${a.direction};`);
      parts.push('}');
    }
  });

  return parts.join('\n');
}

function bandStart(settings: CanvasSettings, column: Column): number {
  const width = settings.width || 1380;
  return Math.round(((column - 1) * width) / 3);
}

function collectColumnSlots(
  visibleElements: ProfileElement[],
  settings: CanvasSettings
): { slots: ColumnSlot[]; customPanelCount: number } {
  const slots: ColumnSlot[] = [];
  const freeformByColumn = new Map<Column, ProfileElement[]>();
  // Custom panel ids must stay unique across authored and freeform panels.
  let customPanelCount = 0;

  visibleElements.forEach((el, index) => {
    if (isGaiaPanelElement(el) && el.gaia) {
      const column = el.gaia.column || 1;
      const def = getGaiaComponent(el.gaia.kind);
      let panelId = el.gaia.panelId || def.panelId || '';
      if (!panelId) {
        customPanelCount += 1;
        panelId = `id_custom_${customPanelCount}`;
      }
      slots.push({
        slotKind: 'gaia',
        element: el,
        def,
        column,
        panelId,
        index,
      });
      return;
    }

    const width = settings.width || 1380;
    const center = el.x + el.width / 2;
    const column: Column = center < width / 3 ? 1 : center < (width * 2) / 3 ? 2 : 3;
    const list = freeformByColumn.get(column) || [];
    list.push(el);
    freeformByColumn.set(column, list);
  });

  freeformByColumn.forEach((list, column) => {
    customPanelCount += 1;
    const ordered = [...list].sort((a, b) => a.y - b.y);
    const contentHeight = ordered.reduce((max, el) => Math.max(max, el.y + el.height), 0) + 16;
    slots.push({
      slotKind: 'freeform',
      column,
      elements: ordered,
      customIndex: customPanelCount,
      contentHeight,
      originX: bandStart(settings, column),
    });
  });

  const columnRank = (slot: ColumnSlot) => {
    const order = slot.slotKind === 'gaia' ? slot.element.y : Math.min(...slot.elements.map((e) => e.y));
    const tie = slot.slotKind === 'gaia' ? slot.index : 0;
    return [slot.column, order, tie] as const;
  };

  slots.sort((a, b) => {
    const ra = columnRank(a);
    const rb = columnRank(b);
    return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2];
  });

  return { slots, customPanelCount };
}

/**
 * Transpile ProfileElements & Canvas Settings to:
 * 1. Pure HTML — a real `#columns` V2 structure with Gaia-supported panels
 * 2. Pure CSS — selectors that target `.panel`, the component panel classes and ids
 * 3. BBCode — only when Gaia actually requires it (kept deliberately sparse)
 */
export function transpileProfile(
  elements: ProfileElement[],
  settings: CanvasSettings
): TranspilerOutput {
  const visibleElements = elements.filter((el) => !el.hidden);
  const { slots } = collectColumnSlots(visibleElements, settings);

  const gaiaSlots = slots.filter((s): s is GaiaPanelSlot => s.slotKind === 'gaia');
  const freeformSlots = slots.filter((s): s is FreeformSlot => s.slotKind === 'freeform');

  /* ----------------------------- CSS ------------------------------------- */

  const cssBlocks: string[] = [];

  cssBlocks.push(`/* ==========================================================================
   Gaia V2 profile overrides — generated by BBStudio
   Pasted into the profile's custom CSS box, so every rule here layers on top of
   Gaia's own V2 stylesheet (#columns, .panel, .panel > h2, panel body type).
   Nothing is emitted for a component that is still at its Gaia default.
   ========================================================================== */`);

  // Gaia already owns the page surface — only override it when the user
  // actually authored a background.
  const hasCustomBackground =
    !!settings.backgroundImageLayers ||
    !!settings.backgroundImage ||
    (!!settings.backgroundColor && settings.backgroundColor !== GAIA_DEFAULT_PAGE_BACKGROUND);

  if (hasCustomBackground) {
    cssBlocks.push(`/* Page surface override (body-level CSS is preserved by Gaia V2 profiles) */
body#viewer {
  ${
    settings.backgroundColor
      ? `background-color: ${settings.backgroundColor};`
      : ''
  }
  ${
    settings.backgroundImageLayers
      ? `background-image: ${settings.backgroundImageLayers};`
      : settings.backgroundImage
        ? `background-image: url('${settings.backgroundImage}');`
        : ''
  }
  ${settings.backgroundRepeat ? `background-repeat: ${settings.backgroundRepeat};` : 'background-repeat: no-repeat;'}
  ${settings.backgroundSize ? `background-size: ${settings.backgroundSize};` : 'background-size: cover;'}
  background-position: center top;
  background-attachment: ${settings.backgroundAttachment || 'scroll'};
}`);
  }

  // Per-instance overrides + freeform content. Components with nothing
  // authored emit no CSS at all, so they render with Gaia's defaults.
  gaiaSlots.forEach((slot) => {
    const block = buildPanelCss(slot);
    if (block) cssBlocks.push(block);
  });
  freeformSlots.forEach((slot) => cssBlocks.push(buildFreeformCss(slot)));

  const hasAnimation = visibleElements.some((el) => el.animation?.enabled);
  if (hasAnimation) cssBlocks.push(getAnimationKeyframes());

  const fullCss = cssBlocks.join('\n\n');

  /* ----------------------------- HTML ------------------------------------ */

  const renderGaiaSlot = (slot: GaiaPanelSlot): string => {
    const el = slot.element;
    const bodyHtml = el.gaia?.bodyHtml ?? slot.def.bodyHtml;
    // No inline min-height: Gaia's default CSS sizes the panel from its content
    // and the canvas height stays an editor-only concern.
    return buildPanelHtml(slot.def.kind, {
      index: slot.index + 1,
      title: el.gaia?.title || el.content || slot.def.defaultTitle,
      bodyHtml,
      panelId: slot.panelId,
      extraClass: el.gaia?.extraClass,
    });
  };

  const renderFreeformSlot = (slot: FreeformSlot): string => {
    const panelId = `id_custom_${slot.customIndex}`;
    const contentId = `custom_${slot.customIndex}_content`;
    const inner = slot.elements
      .map((el) => {
        const marker = el.colorMarker || '#1';
        // Block-level payloads use a <div> carrier (valid nesting) while inline
        // payloads keep the spec's `<span style="color: #N">` marker. The CSS
        // targets both through the attribute selector.
        const carrier = ['quote', 'code', 'clear', 'video'].includes(el.type) ? 'div' : 'span';
        return `    <${carrier} style="color: ${marker}">\n${indent(renderElementHtml(el), 6)}\n    </${carrier}>`;
      })
      .join('\n');
    return `<div class="panel custom_panel postcontent" id="${panelId}">
  <h2 id="custom_${slot.customIndex}_title">Custom</h2>
  <div id="${contentId}">
${inner}
  </div>
  <div class="clear"></div>
</div>`;
  };

  const renderColumn = (column: Column): string => {
    const columnSlots = slots.filter((slot) => slot.column === column);
    const body = columnSlots
      .map((slot) => indent(slot.slotKind === 'gaia' ? renderGaiaSlot(slot) : renderFreeformSlot(slot), 4))
      .join('\n');
    return `  <div id="column_${column}" class="column focus_column">
${body || '    <!-- empty column -->'}
  </div>`;
  };

  const columnsHtml = `<div id="columns">
${[1, 2, 3].map((c) => renderColumn(c as Column)).join('\n')}
</div>`;

  // The standalone document is what every preview renders (Tools, code view):
  // Gaia's default V2 stylesheet first, then the profile's overrides. The
  // copy-paste CSS (`fullCss`) stays override-only.
  const previewCss = [
    '/* --- Gaia V2 defaults (preview only — Gaia serves these on the real page) --- */',
    GAIA_V2_DEFAULT_CSS,
    '/* --- Profile overrides --- */',
    fullCss,
  ].join('\n\n');
  const fullDocument = buildV2Document(columnsHtml, previewCss, settings.profileTitle || 'Gaia Profile');

  /* ----------------------------- BBCode ---------------------------------- */

  const bbcodeRequiredComponents = gaiaSlots.filter((slot) => slot.def.bbcodeRequired);
  const bbcodeOnlyFreeform = freeformSlots
    .flatMap((slot) => slot.elements)
    .filter((el) => BBCODE_ONLY_TYPES.includes(el.type));
  const bbcodeNeeded = bbcodeRequiredComponents.length > 0 || (gaiaSlots.length === 0 && bbcodeOnlyFreeform.length > 0);

  let bbcode = '';
  let bbcodeReason = 'Not needed — every section is authored as a Gaia-supported HTML panel.';

  if (bbcodeNeeded) {
    const bbParts: string[] = [];
    if (bbcodeRequiredComponents.length > 0) {
      bbcodeReason = `Needed for ${bbcodeRequiredComponents
        .map((slot) => slot.def.label)
        .join(', ')} — Gaia serves this content from a BBCode field.`;
      bbcodeRequiredComponents.forEach((slot) => {
        if (!slot.def.bbcodeTemplate) return;
        bbParts.push(`[/${slot.def.label}]`.replace('[/', '[')); // placeholder replaced below
        bbParts.pop();
        bbParts.push(`[b]${slot.def.label}[/b]\n${slot.def.bbcodeTemplate}`);
      });
    } else {
      bbcodeReason =
        'Needed for freeform content (quotes, code, embeds, images, links) that Gaia only accepts through BBCode.';
    }
    if (bbcodeOnlyFreeform.length > 0) {
      bbParts.push(bbcodeOnlyFreeform.map((el) => renderElementBbcode(el)).join('\n\n'));
    }

    if (bbcodeRequiredComponents.length > 0) {
      // HTML panels carry the layout; BBCode is limited to the payloads Gaia
      // serves from a BBCode field (signature / comment bodies).
      bbcode = bbParts.join('\n\n');
    } else {
      // Freeform-only profile: the CSS must travel with the BBCode.
      bbcode = `[style]\n${fullCss}\n[/style]\n\n${bbParts.join('\n\n')}`;
    }
  }

  /* --------------------------- Registry ---------------------------------- */

  const gaiaComponents: GaiaComponentUsage[] = gaiaSlots.map((slot) => ({
    kind: slot.def.kind,
    label: slot.def.label,
    column: slot.column,
    panelId: slot.panelId,
    panelClass: slot.def.panelClass,
    selector: `#${slot.panelId}`,
  }));

  const mappings = [
    { bbcode: '[style]...[/style]', html: '<style> in <head>', description: 'Profile CSS block', selector: '#columns, .panel' },
    ...gaiaComponents.map((component) => ({
      bbcode: component.kind === 'custom' ? '(HTML only)' : `[${component.kind}]`,
      html: `<div class="panel ${component.panelClass}" id="${component.panelId}">`,
      description: `${component.label} panel in column ${component.column}`,
      selector: component.selector,
    })),
  ];

  return {
    html: columnsHtml,
    columnsHtml,
    css: fullCss,
    bbcode,
    bbcodeNeeded,
    bbcodeReason,
    fullOutput: `<style>\n${fullCss}\n</style>\n\n${columnsHtml}`,
    fullDocument,
    gaiaComponents,
    mappings,
  };
}

/** Render a freeform element as export HTML (used inside custom panels). */
function renderElementHtml(el: ProfileElement): string {
  const styledContent = formatStyledHtml(el);
  switch (el.type) {
    case 'quote':
      return `<div class="quote">${styledContent}</div>`;
    case 'image':
      return `<img class="user_img" src="${escapeHtml(el.content || '')}" alt="${escapeHtml(el.name)}">`;
    case 'code':
      return `<div class="code">${escapeHtml(el.content || '')}</div>`;
    case 'clear':
      return '<div class="clear"></div>';
    case 'video': {
      const ytid = extractYoutubeId(el.content);
      return `<iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${ytid}" frameborder="0" allowfullscreen></iframe>`;
    }
    case 'link':
      return `<a href="${escapeHtml(el.linkUrl || '#')}" target="_blank" rel="noopener noreferrer">${styledContent}</a>`;
    case 'box':
    case 'text':
    default:
      return styledContent;
  }
}

/** BBCode is only emitted for content Gaia cannot express as panel HTML. */
function renderElementBbcode(el: ProfileElement): string {
  const contentBB = formatStyledBBCode(el);
  switch (el.type) {
    case 'quote':
      return `[quote]${contentBB}[/quote]`;
    case 'image':
      return `[img]${el.content || ''}[/img]`;
    case 'code':
      return `[code]${el.content || ''}[/code]`;
    case 'clear':
      return '[clear ]';
    case 'video':
      return `[youtube]${extractYoutubeId(el.content)}[/youtube]`;
    case 'link':
      return `[url=${el.linkUrl || '#'}]${contentBB}[/url]`;
    default:
      return contentBB;
  }
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatStyledHtml(el: ProfileElement): string {
  let text = el.content || '';
  if (!text && el.type === 'box') text = '&nbsp;';

  if (el.fontWeight === 'bold') {
    text = `<b>${text}</b>`;
  }
  if (el.fontStyle === 'italic') {
    text = `<i>${text}</i>`;
  }
  if (el.textDecoration === 'underline') {
    text = `<span style="text-decoration: underline;">${text}</span>`;
  } else if (el.textDecoration === 'line-through') {
    text = `<span style="text-decoration: line-through;">${text}</span>`;
  }

  // If specific color applied to inner text
  if (el.color && el.color !== '#e2e8f0') {
    text = `<span style="color: ${el.color};">${text}</span>`;
  }

  return text;
}

function formatStyledBBCode(el: ProfileElement): string {
  let text = el.content || '';
  if (!text && el.type === 'box') text = ' ';

  if (el.fontWeight === 'bold') {
    text = `[b]${text}[/b]`;
  }
  if (el.fontStyle === 'italic') {
    text = `[i]${text}[/i]`;
  }
  if (el.textDecoration === 'underline') {
    text = `[u]${text}[/u]`;
  } else if (el.textDecoration === 'line-through') {
    text = `[strike]${text}[/strike]`;
  }

  if (el.color && el.color !== '#e2e8f0' && !el.color.startsWith('#1')) {
    text = `[color=${el.color}]${text}[/color]`;
  }

  return text;
}
