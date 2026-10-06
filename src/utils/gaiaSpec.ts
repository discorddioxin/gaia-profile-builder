import type { CanvasSettings, ProfileElement } from '../types/profile';
import { GAIA_NEUTRAL_FONT_SIZE } from './gaiaDefaults';
import maleAvatarUrl from '../assets/gaia-avatar-male.svg';
import femaleAvatarUrl from '../assets/gaia-avatar-female.svg';

/**
 * Gaia V2 Profile Specification — single source of truth.
 *
 * Derived directly from docs/GAIA_PROFILE_HTML_SPEC.md.
 *
 * Everything the builder emits is authored against the *real* GaiaOnline V2
 * document structure:
 *
 *   <div id="columns">
 *     <div id="column_1" class="column focus_column"></div>
 *     <div id="column_2" class="column focus_column"></div>
 *     <div id="column_3" class="column focus_column"></div>
 *   </div>
 *
 * ...with every section expressed as a dedicated, Gaia-supported panel
 * (`.panel .comments_panel#id_comments`, `.panel .details_panel#id_details`, …)
 * instead of an arbitrary free-floating box. Free-standing canvas elements are
 * still supported, but they are wrapped in a real `.panel.custom_panel` so the
 * generated layout always stays inside Gaia's column layout.
 *
 * Styling: components are authored with Gaia's *default* V2 CSS. The builder
 * never invents a theme of its own — panels start neutral (see
 * `createGaiaPanelElement`) and the generated CSS only carries the overrides a
 * user actually authored. The default look lives in `utils/gaiaDefaults.ts` and
 * is used for previews only.
 */

export const V2_UNSUPPORTED_MESSAGE =
  'Only V2 profiles supported. The imported HTML must include #columns with #column_1, #column_2, and #column_3.';

export type GaiaComponentKind =
  | 'details'
  | 'equipment'
  | 'contact'
  | 'forums'
  | 'signature'
  | 'house'
  | 'footprints'
  | 'about'
  | 'store'
  | 'badges'
  | 'comments'
  | 'wishlist'
  | 'journal'
  | 'friends'
  | 'custom';

export type GaiaComponentCategory = 'Identity' | 'Social' | 'Activity' | 'Content' | 'Layout';

export interface GaiaComponentDef {
  kind: GaiaComponentKind;
  label: string;
  category: GaiaComponentCategory;
  description: string;
  /** Column used when the component is dropped without an explicit target. */
  defaultColumn: 1 | 2 | 3;
  /** Semantic Gaia panel class, e.g. `comments_panel`. */
  panelClass: string;
  /** Fixed panel id from the spec (custom panels use a generated id). */
  panelId: string | null;
  /** Fixed <h2> id from the spec (custom panels use a generated id). */
  titleId: string | null;
  /** Default panel heading text. */
  defaultTitle: string;
  /** Markup for the panel body (everything after the <h2>). */
  bodyHtml: string;
  /** Short structural hints shown in the editor preview. */
  previewRows: string[];
  /** True when Gaia only accepts this content through a BBCode field. */
  bbcodeRequired?: boolean;
  /** Sparse BBCode fallback — only emitted when bbcodeRequired is true. */
  bbcodeTemplate?: string;
}

export const GAIA_COMPONENTS: Record<GaiaComponentKind, GaiaComponentDef> = {
  details: {
    kind: 'details',
    label: 'Details',
    category: 'Identity',
    description: 'Avatar, online status, last login and registration date.',
    defaultColumn: 1,
    panelClass: 'details_panel',
    panelId: 'id_details',
    titleId: 'details_title',
    defaultTitle: 'Details',
    bodyHtml: `<input type="hidden" id="avatarnonce" value="">
<p class="details_avatar_wrap"><img class="details_avatar" src="${maleAvatarUrl}" alt="Male avatar (default)" width="120" height="150"></p>
<div class="forum_userstatus">
  <div class="statuslinks">
    <div class="pushBox" data-uid="">&nbsp;</div>
    <span class="online">Online now</span>
  </div>
</div>
<p><strong>Last Login:</strong> Today</p>
<p><strong>Registered:</strong> Jan 2007</p>
<div class="clear"></div>`,
    previewRows: ['Avatar 120×150', 'Online status', 'Last Login / Registered'],
  },

  equipment: {
    kind: 'equipment',
    label: 'Equipped List',
    category: 'Identity',
    description: 'Currently equipped Gaia items rendered as a 30×30 item grid.',
    defaultColumn: 1,
    panelClass: 'equipped_list_panel',
    panelId: 'id_equipment',
    titleId: 'equipment_title',
    defaultTitle: 'Equipped List',
    bodyHtml: `<div class="item">
  <a href="#" class="item_info" title="Equipped item">
    <img src="" alt="Equipped item" height="30" width="30">
  </a>
</div>
<div class="item">
  <a href="#" class="item_info" title="Equipped item">
    <img src="" alt="Equipped item" height="30" width="30">
  </a>
</div>
<div class="clear"></div>`,
    previewRows: ['30×30 item grid', 'premium sparkle overlay'],
  },

  contact: {
    kind: 'contact',
    label: 'Contact',
    category: 'Social',
    description: 'Add friend, message and trade actions.',
    defaultColumn: 1,
    panelClass: 'contact_panel',
    panelId: 'id_contact',
    titleId: 'contact_title',
    defaultTitle: 'Contact',
    bodyHtml: `<ul>
  <li><a href="#">Add to Friends</a></li>
  <li><a href="#">Send Message</a></li>
  <li><a href="#">Trade Items</a></li>
</ul>`,
    previewRows: ['Add to Friends', 'Send Message', 'Trade Items'],
  },

  forums: {
    kind: 'forums',
    label: 'Forums',
    category: 'Activity',
    description: 'Posts per day, total posts and latest posts link.',
    defaultColumn: 1,
    panelClass: 'forums_panel',
    panelId: 'id_forum',
    titleId: 'forum_title',
    defaultTitle: 'Forums',
    bodyHtml: `<p><strong>Posts per Day:</strong> 0.57</p>
<p><strong>Total Posts:</strong> 4448</p>
<p><a href="#">Latest Posts</a></p>`,
    previewRows: ['Posts per Day', 'Total Posts', 'Latest Posts'],
  },

  signature: {
    kind: 'signature',
    label: 'Signature',
    category: 'Content',
    description: 'Forum signature — Gaia serves this content from BBCode.',
    defaultColumn: 2,
    panelClass: 'signature_panel',
    panelId: 'id_signature',
    titleId: 'signature_title',
    defaultTitle: 'Signature',
    bodyHtml: `<p></p>
<div class="postcontent-align-center" style="text-align: center">
  <span style="color: crimson">Signature content</span>
  <div class="clear"></div>
</div>`,
    previewRows: ['postcontent wrapper', 'centered content'],
    bbcodeRequired: true,
    bbcodeTemplate: `[center][size=12][color=#dc143c]Signature content[/color][/size][/center]`,
  },

  house: {
    kind: 'house',
    label: 'House',
    category: 'Activity',
    description: 'Gaia house object embed with a visit launcher.',
    defaultColumn: 3,
    panelClass: 'house_panel',
    panelId: 'id_house',
    titleId: 'house_title',
    defaultTitle: 'House',
    bodyHtml: `<object classid="" width="200" height="200" style=""></object>
<div align="center">
  <a href="#" class="header-launcher" data-launchtype="towns">Visit My House</a>
</div>`,
    previewRows: ['200×200 house object', 'Visit My House launcher'],
  },

  footprints: {
    kind: 'footprints',
    label: 'Recent Visitors',
    category: 'Social',
    description: 'Footprints list of recent profile visitors.',
    defaultColumn: 3,
    panelClass: 'footprints_panel',
    panelId: 'id_footprints',
    titleId: 'footprints_title',
    defaultTitle: 'Recent Visitors',
    bodyHtml: `<div class="item">
  <a href="#">Username</a> on 08/27/2026
</div>
<div class="clear"></div>`,
    previewRows: ['Visitor link', 'Visit date'],
  },

  about: {
    kind: 'about',
    label: 'About',
    category: 'Content',
    description: 'Free-form “About me” section (postcontent typography).',
    defaultColumn: 2,
    panelClass: 'about_panel postcontent',
    panelId: 'id_about',
    titleId: 'about_title',
    defaultTitle: 'About',
    bodyHtml: `<p>Tell people about yourself.</p>
<div class="clear"></div>`,
    previewRows: ['postcontent typography', 'free-form paragraph'],
  },

  store: {
    kind: 'store',
    label: 'Store',
    category: 'Activity',
    description: 'Marketplace store headline, description and link.',
    defaultColumn: 3,
    panelClass: 'store_panel postcontent',
    panelId: 'id_store',
    titleId: 'store_title',
    defaultTitle: 'Store',
    bodyHtml: `<h3></h3>
<p>&nbsp;</p>
<p><a href="#">View Store</a></p>`,
    previewRows: ['Store heading', 'Description', 'View Store link'],
  },

  badges: {
    kind: 'badges',
    label: 'Badges',
    category: 'Activity',
    description: 'Badge list plus “View More Badges” link.',
    defaultColumn: 3,
    panelClass: 'badges_panel',
    panelId: 'id_badges',
    titleId: 'badges_title',
    defaultTitle: 'Badges',
    bodyHtml: `<ul id="badges">
  <li><img src="" class="clickable badge_1" data-tooltip="Badge" alt="Badge"></li>
</ul>
<div class="clear"></div>
<a href="#" id="badge_display">View More Badges</a>`,
    previewRows: ['Badge row', 'View More Badges'],
  },

  comments: {
    kind: 'comments',
    label: 'Comments',
    category: 'Social',
    description: 'Profile comments with add/alert actions and comment threads.',
    defaultColumn: 2,
    panelClass: 'comments_panel',
    panelId: 'id_comments',
    titleId: 'comments_title',
    defaultTitle: 'Comments',
    bodyHtml: `<div>
  <span id="alert_container"><a href="#">Add Comment</a></span>
  <span id="alerts_banner"><a href="#">Alert Me of Comments</a></span>
  <div class="clear"></div>
</div>
<p><a href="#">View All Comments</a></p>
<dl class="style1">
  <dt data-comment-id="" data-user-id="">
    <span class="username"><a href="#">Username</a></span>
    <span class="date"><a href="#">Report</a> | 08/02/2026 7:18 am</span>
  </dt>
  <dd data-comment-id="" data-user-id="">
    <p class="deletecomment"><a href="#">Delete</a><br><a href="#">Comment Back</a></p>
    <div class="dropBox"><img src="${femaleAvatarUrl}" class="avatarImage" width="48" height="48" alt="Female avatar (default)"></div>
    <div class="postcontent">Comment body</div>
  </dd>
</dl>`,
    previewRows: ['Add Comment / Alert', 'Comment thread', '48×48 avatars'],
    bbcodeRequired: true,
    bbcodeTemplate: `[b]Comment[/b]\nComment body`,
  },

  wishlist: {
    kind: 'wishlist',
    label: 'Wish List',
    category: 'Activity',
    description: 'Quest / wish list items as 30×30 item cells.',
    defaultColumn: 3,
    panelClass: 'wish_list_panel profile',
    panelId: 'id_wishlist',
    titleId: 'wishlist_title',
    defaultTitle: 'Wish List',
    bodyHtml: `<div class="item">
  <a href="#" class="item_info" title="Questing">
    <img src="" alt="Item" height="30" width="30">
  </a>
</div>
<div class="clear"></div>`,
    previewRows: ['30×30 quest items'],
  },

  journal: {
    kind: 'journal',
    label: 'Journal',
    category: 'Content',
    description: 'Journal summary and dated entry list.',
    defaultColumn: 2,
    panelClass: 'journal_panel postcontent',
    panelId: 'id_journal',
    titleId: 'journal_title',
    defaultTitle: 'Journal',
    bodyHtml: `<p><a href="#">View Journal</a></p>
<h3></h3>
<p></p>
<ul id="entries">
  <li><a href="#"><span class="journal-date">08/27/2026</span></a></li>
</ul>`,
    previewRows: ['View Journal link', 'Dated entries'],
  },

  friends: {
    kind: 'friends',
    label: 'Friends',
    category: 'Social',
    description: 'Friend list rendered as ul.style2 entries.',
    defaultColumn: 3,
    panelClass: 'friends_panel',
    panelId: 'id_friends',
    titleId: 'friends_title',
    defaultTitle: 'Friends',
    bodyHtml: `<p><a href="#">View All Friends</a></p>
<ul class="style2">
  <li>
    <p><span><a href="#" title="Friend">Username</a></span></p>
  </li>
</ul>`,
    previewRows: ['View All Friends', 'Friend links'],
  },

  custom: {
    kind: 'custom',
    label: 'Custom Panel',
    category: 'Layout',
    description: 'Free-form panel — keeps arbitrary HTML inside a real Gaia panel.',
    defaultColumn: 2,
    panelClass: 'custom_panel postcontent',
    panelId: null,
    titleId: null,
    defaultTitle: 'Custom',
    bodyHtml: `<div class="custom_content">
  <p>Custom content</p>
</div>
<div class="clear"></div>`,
    previewRows: ['Arbitrary HTML', 'Kept as a panel root'],
  },
};

export const GAIA_COMPONENT_LIST: GaiaComponentDef[] = [
  GAIA_COMPONENTS.details,
  GAIA_COMPONENTS.equipment,
  GAIA_COMPONENTS.contact,
  GAIA_COMPONENTS.forums,
  GAIA_COMPONENTS.signature,
  GAIA_COMPONENTS.house,
  GAIA_COMPONENTS.footprints,
  GAIA_COMPONENTS.about,
  GAIA_COMPONENTS.store,
  GAIA_COMPONENTS.badges,
  GAIA_COMPONENTS.comments,
  GAIA_COMPONENTS.wishlist,
  GAIA_COMPONENTS.journal,
  GAIA_COMPONENTS.friends,
  GAIA_COMPONENTS.custom,
];

export const GAIA_CATEGORIES: GaiaComponentCategory[] = [
  'Identity',
  'Social',
  'Activity',
  'Content',
  'Layout',
];

export function getGaiaComponent(kind: GaiaComponentKind): GaiaComponentDef {
  return GAIA_COMPONENTS[kind] || GAIA_COMPONENTS.custom;
}

export function isGaiaComponentKind(value: unknown): value is GaiaComponentKind {
  return typeof value === 'string' && value in GAIA_COMPONENTS;
}

/**
 * Resolve a panel id / class / id prefix back to a component kind.
 * Used while scraping imported Gaia profiles so that every detected panel is
 * mapped onto a first-class editor component.
 */
export function detectGaiaComponentKind(el: Element | null | undefined): GaiaComponentKind | null {
  if (!el) return null;
  const id = (el.getAttribute('id') || '').toLowerCase();
  const className = (el.getAttribute('class') || '').toLowerCase();
  const has = (cls: string) => className.split(/\s+/).includes(cls);

  if (/^id_custom_\d+$/.test(id) || has('custom_panel')) return 'custom';
  if (id === 'id_details' || has('details_panel')) return 'details';
  if (id === 'id_equipment' || has('equipped_list_panel')) return 'equipment';
  if (id === 'id_contact' || has('contact_panel')) return 'contact';
  if (id === 'id_forum' || has('forums_panel')) return 'forums';
  if (id === 'id_signature' || has('signature_panel')) return 'signature';
  if (id === 'id_house' || has('house_panel')) return 'house';
  if (id === 'id_footprints' || id.startsWith('id_footprints_') || has('footprints_panel')) return 'footprints';
  if (id === 'id_about' || has('about_panel')) return 'about';
  if (id === 'id_store' || has('store_panel')) return 'store';
  if (id === 'id_badges' || id.startsWith('id_badges_') || has('badges_panel')) return 'badges';
  if (id === 'id_comments' || has('comments_panel')) return 'comments';
  if (id === 'id_wishlist' || has('wish_list_panel')) return 'wishlist';
  if (id === 'id_journal' || has('journal_panel')) return 'journal';
  if (id === 'id_friends' || has('friends_panel')) return 'friends';
  return null;
}

/** Every selector that identifies a dedicated Gaia component root. */
export const GAIA_COMPONENT_ROOT_SELECTOR = [
  '#id_details',
  '.details_panel',
  '#id_equipment',
  '.equipped_list_panel',
  '#id_contact',
  '.contact_panel',
  '#id_forum',
  '.forums_panel',
  '#id_signature',
  '.signature_panel',
  '#id_house',
  '.house_panel',
  '#id_footprints',
  '[id^="id_footprints_"]',
  '#id_about',
  '.about_panel',
  '#id_store',
  '.store_panel',
  '#id_badges',
  '[id^="id_badges_"]',
  '#id_comments',
  '.comments_panel',
  '#id_wishlist',
  '.wish_list_panel',
  '#id_journal',
  '.journal_panel',
  '#id_friends',
  '.friends_panel',
  '[id^="id_custom_"]',
  '.custom_panel',
].join(', ');

/** True when the element is a first-class Gaia component (never a stray box). */
export function isGaiaPanelElement(el: ProfileElement): boolean {
  return el.type === 'gaia-panel' && !!el.gaia && isGaiaComponentKind(el.gaia.kind);
}

export function panelIdFor(def: GaiaComponentDef, index: number): string {
  return def.panelId || `id_custom_${index}`;
}

export function titleIdFor(def: GaiaComponentDef, index: number): string {
  return def.titleId || `custom_${index}_title`;
}

export function contentIdFor(def: GaiaComponentDef, index: number): string {
  return def.panelId ? `${def.kind}_content` : `custom_${index}_content`;
}

/**
 * Build the `<div class="panel ...">` markup for a single component.
 * `bodyHtml` may be overridden by the element's authored content.
 */
export function buildPanelHtml(
  kind: GaiaComponentKind,
  options: {
    index?: number;
    title?: string;
    bodyHtml?: string;
    panelId?: string;
    extraClass?: string;
    extraStyle?: string;
    attributeHtml?: string;
  } = {}
): string {
  const def = getGaiaComponent(kind);
  const index = options.index ?? 1;
  const panelId = options.panelId || panelIdFor(def, index);
  const titleId = def.titleId || `custom_${index}_title`;
  const title = options.title ?? def.defaultTitle;
  const body = options.bodyHtml ?? def.bodyHtml;
  const classes = ['panel', ...def.panelClass.split(/\s+/).filter(Boolean), options.extraClass]
    .filter(Boolean)
    .join(' ');
  const styleAttr = options.extraStyle ? ` style="${options.extraStyle}"` : '';
  const attrs = options.attributeHtml ? ` ${options.attributeHtml}` : '';

  const bodyMarkup = indent(body, 2);
  const clearMarkup = /class="[^"]*\bclear\b/.test(body) ? '' : '  <div class="clear"></div>\n';

  return `<div class="${classes}" id="${panelId}"${styleAttr}${attrs}>
  <h2 id="${titleId}">${title}</h2>
${bodyMarkup}
${clearMarkup}</div>`.replace(/\n{3,}/g, '\n');
}

export function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => (line.trim() ? pad + line : line))
    .join('\n');
}

/** Full V2 document shell around a `#columns` block. */
export function buildV2Document(columnsHtml: string, css: string, title = 'Gaia Profile'): string {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=1000, initial-scale=1">
<title>${title}</title>
<style>
${css}
</style>
</head>
<body id="viewer" class="js">
${columnsHtml}
</body>
</html>`;
}

/* -------------------------------------------------------------------------- */
/* Document helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Pull just the `#columns` structure out of a full imported document so the
 * "Columns HTML" tab shows the layout the editor actually operates on.
 */
export function extractColumnsHtml(rawHtml: string): string | null {
  if (!rawHtml) return null;
  try {
    const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
    const columns = doc.getElementById('columns');
    if (!columns) return null;
    return columns.outerHTML;
  } catch {
    return null;
  }
}

/** Count the dedicated components present in an imported document. */
export function describeColumnsStructure(columnsHtml: string): string {
  try {
    const doc = new DOMParser().parseFromString(
      `<div id="columns">${columnsHtml}</div>`,
      'text/html'
    );
    const counts: string[] = [];
    [1, 2, 3].forEach((column) => {
      const col = doc.getElementById(`column_${column}`);
      if (!col) return;
      const panels = col.querySelectorAll(':scope > .panel');
      const kinds = Array.from(panels)
        .map((panel) => detectGaiaComponentKind(panel) || 'custom')
        .join(', ');
      counts.push(`column_${column}: ${panels.length}${kinds ? ` (${kinds})` : ''}`);
    });
    return counts.join(' · ');
  } catch {
    return '';
  }
}

/* -------------------------------------------------------------------------- */
/* Canvas element factory                                                      */
/* -------------------------------------------------------------------------- */

/** Column → horizontal band on the freeform canvas. */
export function columnBand(settings: CanvasSettings, column: 1 | 2 | 3) {
  const width = settings.width || 1380;
  const band = width / 3;
  const start = (column - 1) * band;
  return { start, end: start + band, width: band };
}

export function columnForX(settings: CanvasSettings, x: number, elementWidth = 0): 1 | 2 | 3 {
  const width = settings.width || 1380;
  const center = x + elementWidth / 2;
  if (center < width / 3) return 1;
  if (center < (width * 2) / 3) return 2;
  return 3;
}

export function xForColumn(settings: CanvasSettings, column: 1 | 2 | 3, elementWidth: number): number {
  const band = columnBand(settings, column);
  return Math.max(0, Math.round(band.start + (band.width - elementWidth) / 2));
}

/** Vertical gap between two components stacked in the same V2 column. */
export const COLUMN_SLOT_GAP = 12;

/** Top offset of the first component in an empty V2 column. */
export const COLUMN_SLOT_TOP = 24;

/**
 * The V2 column a canvas element belongs to. Gaia panels carry their column
 * explicitly; freeform elements derive it from the horizontal band they sit in.
 */
export function columnOfElement(
  el: ProfileElement,
  settings: CanvasSettings
): 1 | 2 | 3 {
  if (isGaiaPanelElement(el) && el.gaia) return el.gaia.column || 1;
  return columnForX(settings, el.x, el.width);
}

/**
 * Next free slot in a V2 column: everything in the column is stacked top to
 * bottom, so a new component takes the space below the current bottom.
 */
export function nextSlotInColumn(
  elements: ProfileElement[],
  column: 1 | 2 | 3,
  settings: CanvasSettings,
  size: { width: number; height: number }
): { x: number; y: number } {
  let bottom = 0;
  let occupied = false;

  elements.forEach((el) => {
    if (el.hidden) return;
    if (columnOfElement(el, settings) !== column) return;
    occupied = true;
    bottom = Math.max(bottom, el.y + el.height);
  });

  return {
    x: xForColumn(settings, column, size.width),
    y: occupied ? Math.round(bottom + COLUMN_SLOT_GAP) : COLUMN_SLOT_TOP,
  };
}

/** Create a first-class Gaia component element for the freeform/element canvas. */
export function createGaiaPanelElement(
  kind: GaiaComponentKind,
  column: 1 | 2 | 3,
  index: number,
  settings: CanvasSettings
): ProfileElement {
  const def = getGaiaComponent(kind);
  const width = Math.min(360, Math.max(240, Math.round((settings.width || 1380) / 3) - 24));
  const height = kind === 'details' ? 340 : kind === 'comments' ? 300 : kind === 'house' ? 300 : 220;
  const { x, y } = nextSlotInColumn([], column, settings, { width, height });

  return {
    id: `gaia_${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: `${def.label} Panel`,
    type: 'gaia-panel',
    content: def.defaultTitle,
    colorMarker: `#${index + 1}`,
    useAttributeSelector: true,
    x,
    y,
    width,
    height,
    zIndex: index + 1,
    rotate: 0,
    opacity: 100,
    locked: false,
    hidden: false,
    // Gaia-neutral styling: nothing here is emitted as an override, so the
    // panel renders with Gaia's default V2 CSS until the user styles it.
    color: 'inherit',
    backgroundColor: 'transparent',
    fontSize: GAIA_NEUTRAL_FONT_SIZE,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    fontFamily: 'inherit',
    borderWidth: 0,
    borderColor: 'transparent',
    borderStyle: 'none',
    borderRadius: 0,
    boxShadow: 'none',
    padding: 0,
    overflow: 'visible',
    mask: {
      enabled: false,
      type: 'linear-gradient',
      preset: 'fade-bottom',
      angle: 180,
      stops: [],
      feather: 20,
      invert: false,
      shape: 'circle',
    },
    clip: {
      enabled: false,
      type: 'polygon',
      preset: 'hexagon',
      vertices: [],
      circleRadius: 50,
      circleCenterX: 50,
      circleCenterY: 50,
      insetRadius: 0,
    },
    animation: {
      enabled: false,
      preset: 'float',
      duration: 3,
      delay: 0,
      timing: 'ease-in-out',
      iteration: 'infinite',
      direction: 'normal',
      trigger: 'always',
    },
    gaia: {
      kind,
      column,
      title: def.defaultTitle,
      panelId: def.panelId || undefined,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Editor preview helpers                                                      */
/* -------------------------------------------------------------------------- */

/** Read-only preview data used by the freeform canvas for Gaia panels. */
export interface GaiaPanelPreview {
  title: string;
  panelId: string;
  panelClass: string;
  column: 1 | 2 | 3;
  rows: string[];
  bbcodeRequired: boolean;
  cssSelector: string;
}

export function gaiaPanelPreview(
  kind: GaiaComponentKind,
  column: 1 | 2 | 3,
  title?: string,
  panelId?: string
): GaiaPanelPreview {
  const def = getGaiaComponent(kind);
  return {
    title: title || def.defaultTitle,
    panelId: panelId || def.panelId || '',
    panelClass: def.panelClass,
    column,
    rows: def.previewRows,
    bbcodeRequired: !!def.bbcodeRequired,
    cssSelector: def.panelId ? `#${def.panelId}` : `.${def.panelClass.split(' ')[0]}`,
  };
}
