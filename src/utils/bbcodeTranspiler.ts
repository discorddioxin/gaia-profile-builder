import { ProfileElement, CanvasSettings, TranspilerOutput } from '../types/profile';

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

/**
 * Transpile ProfileElements & Canvas Settings to:
 * 1. Pure HTML (No scripts allowed!)
 * 2. Pure CSS (Using CSS Attribute selectors span[style*='color: #1'])
 * 3. Exact BBCode
 */
export function transpileProfile(
  elements: ProfileElement[],
  settings: CanvasSettings
): TranspilerOutput {
  const visibleElements = elements.filter((el) => !el.hidden);

  // 1. Generate CSS
  let cssRules: string[] = [];

  // Canvas profile container rule
  cssRules.push(`/* Profile Root Container */
.profile_container {
  position: relative;
  width: ${settings.width}px;
  min-height: ${settings.height}px;
  margin: 0 auto;
  background-color: ${settings.backgroundColor || '#0e111a'};
  ${settings.backgroundImage ? `background-image: url('${settings.backgroundImage}');` : ''}
  ${settings.backgroundRepeat ? `background-repeat: ${settings.backgroundRepeat};` : 'background-repeat: no-repeat;'}
  ${settings.backgroundSize ? `background-size: ${settings.backgroundSize};` : 'background-size: cover;'}
  background-position: center top;
  overflow: hidden;
  box-sizing: border-box;
  font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
  color: #e2e8f0;
}`);

  // Base rules for required tags
  cssRules.push(`/* Base Mappings Styles */
.quote {
  background: rgba(22, 27, 46, 0.85);
  border-left: 3px solid #6366f1;
  padding: 12px 16px;
  font-style: italic;
  border-radius: 4px;
}

.user_img {
  display: block;
  max-width: 100%;
  height: auto;
  object-fit: cover;
}

.code {
  background: #090d16;
  border: 1px solid #1e293b;
  font-family: 'Courier New', Courier, monospace;
  padding: 10px 14px;
  border-radius: 6px;
  white-space: pre-wrap;
}

.clear {
  clear: both;
  height: 0;
  overflow: hidden;
}`);

  // Per-element rules using CSS Attribute Selectors: span[style*='color: #1']
  visibleElements.forEach((el, idx) => {
    const marker = el.colorMarker || `#${idx + 1}`;
    const selector = `span[style*='color: ${marker}']`;

    const clipCss = getClipPathCss(el);
    const maskCss = getMaskCss(el);

    let animCss = '';
    if (el.animation && el.animation.enabled) {
      const a = el.animation;
      const animRule = `${a.preset} ${a.duration}s ${a.timing} ${a.delay}s ${a.iteration} ${a.direction}`;
      if (a.trigger === 'hover') {
        animCss = `\n  /* Animation triggered on hover */\n  transition: transform 0.3s ease;`;
      } else {
        animCss = `\n  animation: ${animRule};`;
      }
    }

    const ruleLines: string[] = [
      `/* Element: ${el.name} (${el.type}) - Target via CSS Attribute Selector */`,
      `${selector} {`,
      `  position: absolute;`,
      `  left: ${el.x}px;`,
      `  top: ${el.y}px;`,
      `  width: ${el.width}px;`,
      `  height: ${el.height}px;`,
      `  z-index: ${el.zIndex};`,
      `  display: block;`,
      `  box-sizing: border-box;`,
      el.rotate ? `  transform: rotate(${el.rotate}deg);` : '',
      el.opacity < 100 ? `  opacity: ${(el.opacity / 100).toFixed(2)};` : '',
      el.backgroundColor ? `  background-color: ${el.backgroundColor};` : '',
      el.backgroundImage ? `  background-image: url('${el.backgroundImage}');\n  background-size: cover;\n  background-position: center;` : '',
      el.borderWidth > 0 ? `  border: ${el.borderWidth}px ${el.borderStyle} ${el.borderColor};` : '',
      el.borderRadius > 0 ? `  border-radius: ${el.borderRadius}px;` : '',
      el.padding > 0 ? `  padding: ${el.padding}px;` : '',
      el.boxShadow && el.boxShadow !== 'none' ? `  box-shadow: ${el.boxShadow};` : '',
      el.backdropFilter ? `  backdrop-filter: ${el.backdropFilter};` : '',
      el.overflow ? `  overflow: ${el.overflow};` : '',
      clipCss ? `  clip-path: ${clipCss};` : '',
      maskCss.webkitMask ? `  -webkit-mask-image: ${maskCss.webkitMask};\n  mask-image: ${maskCss.mask};` : '',
      animCss,
      el.customCss ? `  ${el.customCss}` : '',
      `}`,
    ].filter(Boolean);

    // If hover animation trigger
    if (el.animation && el.animation.enabled && el.animation.trigger === 'hover') {
      const a = el.animation;
      ruleLines.push(
        `${selector}:hover {`,
        `  animation: ${a.preset} ${a.duration}s ${a.timing} ${a.delay}s ${a.iteration} ${a.direction};`,
        `}`
      );
    }

    // Inner element styling if needed (e.g. typography or child elements)
    const typographyLines: string[] = [
      `${selector} * {`,
      el.color ? `  color: ${el.color};` : '',
      el.fontSize ? `  font-size: ${el.fontSize}px;` : '',
      el.fontFamily ? `  font-family: ${el.fontFamily};` : '',
      el.textAlign ? `  text-align: ${el.textAlign};` : '',
      `}`,
    ].filter(Boolean);

    cssRules.push(ruleLines.join('\n'));
    if (typographyLines.length > 2) {
      cssRules.push(typographyLines.join('\n'));
    }
  });

  // Append Keyframes
  cssRules.push(getAnimationKeyframes());

  const fullCss = cssRules.join('\n\n');

  // 2. Generate Pure HTML (No scripts allowed!)
  const htmlElements = visibleElements.map((el, idx) => {
    const marker = el.colorMarker || `#${idx + 1}`;
    let innerHtml = '';

    // Apply inline typography spans/tags if specified
    const styledContent = formatStyledHtml(el);

    switch (el.type) {
      case 'quote':
        innerHtml = `<div class="quote">${styledContent}</div>`;
        break;
      case 'image':
        innerHtml = `<img class="user_img" src="${escapeHtml(el.content || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80')}" alt="${escapeHtml(el.name)}" />`;
        break;
      case 'code':
        innerHtml = `<div class="code">${escapeHtml(el.content || 'const profile = "epic";')}</div>`;
        break;
      case 'clear':
        innerHtml = `<div class="clear"></div>`;
        break;
      case 'video': {
        const ytid = extractYoutubeId(el.content);
        innerHtml = `<iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${ytid}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        break;
      }
      case 'link':
        innerHtml = `<a href="${escapeHtml(el.linkUrl || '#')}" target="_blank" rel="noopener noreferrer">${styledContent}</a>`;
        break;
      case 'text':
      case 'box':
      default:
        innerHtml = styledContent;
        break;
    }

    // Wrap in CSS Attribute Selector carrier: <span style="color: #1">
    return `  <!-- ${el.name} (${el.type}) -->\n  <span style="color: ${marker}">\n    ${innerHtml}\n  </span>`;
  });

  const fullHtml = `<div class="profile_container">\n${htmlElements.join('\n\n')}\n</div>`;

  // 3. Generate BBCode
  // Using the mappings:
  // [color], [strike], [u] -> <span>
  // [b], [i] -> <b>, <i>
  // [quote] -> <div class="quote">
  // [url] -> <a>
  // [clear ] -> <div class="clear">
  // [youtube] -> <iframe>
  // [img] -> <img class="user_img">
  // [code] -> <div class="code">
  const bbcodeElements = visibleElements.map((el, idx) => {
    const marker = el.colorMarker || `#${idx + 1}`;
    let innerBB = '';

    const contentBB = formatStyledBBCode(el);

    switch (el.type) {
      case 'quote':
        innerBB = `[quote]${contentBB}[/quote]`;
        break;
      case 'image':
        innerBB = `[img]${el.content || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'}[/img]`;
        break;
      case 'code':
        innerBB = `[code]${el.content || 'const profile = "epic";'}[/code]`;
        break;
      case 'clear':
        innerBB = `[clear ]`;
        break;
      case 'video': {
        const ytid = extractYoutubeId(el.content);
        innerBB = `[youtube]${ytid}[/youtube]`;
        break;
      }
      case 'link':
        innerBB = `[url=${el.linkUrl || 'https://example.com'}]${contentBB}[/url]`;
        break;
      case 'text':
      case 'box':
      default:
        innerBB = contentBB;
        break;
    }

    // The [color=#X] tag transpiles directly to <span style="color: #X">
    return `[color=${marker}]\n${innerBB}\n[/color]`;
  });

  const fullBBCode = `[style]\n${fullCss}\n[/style]\n\n${bbcodeElements.join('\n\n')}`;

  const mappings = [
    { bbcode: `[color=${visibleElements[0]?.colorMarker || '#1'}]`, html: `<span style="color: ${visibleElements[0]?.colorMarker || '#1'}">`, description: 'Attribute Selector anchor & color styling', selector: `span[style*='color: ${visibleElements[0]?.colorMarker || '#1'}']` },
    { bbcode: '[strike]text[/strike]', html: '<span style="text-decoration: line-through">text</span>', description: 'Strikethrough text decoration', selector: 'span' },
    { bbcode: '[u]text[/u]', html: '<span style="text-decoration: underline">text</span>', description: 'Underline text decoration', selector: 'span' },
    { bbcode: '[b]bold text[/b]', html: '<b>bold text</b>', description: 'Bold font styling', selector: 'b' },
    { bbcode: '[i]italic text[/i]', html: '<i>italic text</i>', description: 'Italic font styling', selector: 'i' },
    { bbcode: '[quote]...[/quote]', html: '<div class="quote">...</div>', description: 'Quote block container', selector: 'div.quote' },
    { bbcode: '[url=https://...]text[/url]', html: '<a href="https://...">text</a>', description: 'Hyperlink anchor', selector: 'a' },
    { bbcode: '[clear ]', html: '<div class="clear"></div>', description: 'Clear floats element', selector: 'div.clear' },
    { bbcode: '[youtube]VIDEO_ID[/youtube]', html: '<iframe src="..."></iframe>', description: 'Embedded video player', selector: 'iframe' },
    { bbcode: '[img]URL[/img]', html: '<img class="user_img" src="URL">', description: 'User image component', selector: 'img.user_img' },
    { bbcode: '[code]...[/code]', html: '<div class="code">...</div>', description: 'Code block component', selector: 'div.code' },
  ];

  return {
    html: fullHtml,
    css: fullCss,
    bbcode: fullBBCode,
    fullOutput: `<style>\n${fullCss}\n</style>\n\n${fullHtml}`,
    mappings,
  };
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
