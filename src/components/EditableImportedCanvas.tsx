import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import {
  Trash2,
  Copy,
  Edit3,
  ChevronUp,
  X,
  Wand2,
  FileCode,
  Check,
  ChevronDown,
  EyeOff,
  Move,
  Layers,
} from 'lucide-react';
import { CanvasSettings, Profile } from '../types/profile';

/**
 * Public info about the currently selected imported node.
 * Sent to the parent so the DockPanel can render property editors.
 */
export interface ImportedNodeInfo {
  bbId: string;
  tag: string;
  id: string;
  className: string;
  semanticRole: ImportedSemanticRole;
  commentId?: string;
  userId?: string;
  text: string; // .textContent of the element (may be long, truncated by consumer)
  hasChildren: boolean;
  isTextLeaf: boolean; // true if the element only contains text nodes (safe to inline-edit)
  inlineStyle: string; // raw style attribute
  computed: {
    selfColor: string;
    selfBackground: string;
    selfFontSize: string;
    selfPadding: string;
    parentColor: string;
    parentBackground: string;
    parentFontSize: string;
    parentPadding: string;
    globalColor: string;
    globalBackground: string;
    globalFontSize: string;
    globalPadding: string;
  };
  sources: {
    selfColor: string;
    selfBackground: string;
    selfFontSize: string;
    selfPadding: string;
    parentColor: string;
    parentBackground: string;
    parentFontSize: string;
    parentPadding: string;
    globalColor: string;
    globalBackground: string;
    globalFontSize: string;
    globalPadding: string;
  };
  attributes: Array<{ name: string; value: string }>;
}

export interface ImportedTreeNode {
  bbId: string;
  tag: string;
  id: string;
  className: string;
  semanticRole: ImportedSemanticRole;
  commentId?: string;
  userId?: string;
  text: string;
  depth: number;
  children: ImportedTreeNode[];
}

export type ImportedSemanticRole =
  | 'comments-panel'
  | 'comments-title'
  | 'comments-actions'
  | 'comments-action-link'
  | 'comments-view-all'
  | 'comments-list'
  | 'comment-header'
  | 'comment-body'
  | 'comment-username'
  | 'comment-date'
  | 'comment-actions'
  | 'comment-action-link'
  | 'comment-avatar-box'
  | 'comment-avatar'
  | 'comment-content'
  | 'wishlist-panel'
  | 'wishlist-title'
  | 'wishlist-item'
  | 'wishlist-item-link'
  | 'wishlist-item-image'
  | 'wishlist-owner-checkmark'
  | 'journal-panel'
  | 'journal-title'
  | 'journal-view-link'
  | 'journal-heading'
  | 'journal-summary'
  | 'journal-entries'
  | 'journal-entry'
  | 'journal-entry-link'
  | 'journal-date'
  | 'friends-panel'
  | 'friends-title'
  | 'friends-view-all'
  | 'friends-list'
  | 'friend-item'
  | 'friend-name'
  | 'friend-link'
  | 'details-panel'
  | 'details-title'
  | 'details-avatar-nonce'
  | 'details-avatar-wrap'
  | 'details-avatar'
  | 'details-status'
  | 'details-status-links'
  | 'details-pushbox'
  | 'details-online'
  | 'details-last-login'
  | 'details-registered'
  | 'equipment-panel'
  | 'equipment-title'
  | 'equipment-item'
  | 'equipment-item-link'
  | 'equipment-item-image'
  | 'equipment-premium-sparkle'
  | 'contact-panel'
  | 'contact-title'
  | 'contact-list'
  | 'contact-action'
  | 'contact-add-friend'
  | 'contact-message'
  | 'contact-trade'
  | 'forum-panel'
  | 'forum-title'
  | 'forum-posts-per-day'
  | 'forum-total-posts'
  | 'forum-latest-posts'
  | 'signature-panel'
  | 'signature-title'
  | 'signature-content'
  | 'signature-align'
  | 'house-panel'
  | 'house-title'
  | 'house-object'
  | 'house-launcher'
  | 'footprints-panel'
  | 'footprints-title'
  | 'footprints-item'
  | 'footprints-link'
  | 'about-panel'
  | 'about-title'
  | 'about-content'
  | 'store-panel'
  | 'store-title'
  | 'store-heading'
  | 'store-description'
  | 'store-link'
  | 'badges-panel'
  | 'badges-title'
  | 'badges-list'
  | 'badge-item'
  | 'badge-image'
  | 'badge-display-link'
  | 'custom-panel'
  | 'custom-title'
  | 'custom-content'
  | 'generic';

export type ImportedDedicatedComponentKind =
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
  | 'friends';

export type GroupAction = 'group' | 'ungroup';

export interface EditableImportedCanvasApi {
  selectNode(bbId: string): void;
  getNodeInfo(bbId: string): ImportedNodeInfo | null;
  editNodeText(bbId: string): void;
  /** Returns the group's wrapper bbId, or null if fewer than 2 items selected */
  groupSelected(): string | null;
  ungroupSelected(): void;
  applyStyleToGroup(groupBbId: string, styleAttr: string): void;
  selectCommentsPanel(bbId?: string): void;
  addComment(bbId?: string): void;
  deleteCommentThread(bbId: string): void;
  selectWishlistPanel(bbId?: string): void;
  addWishlistItem(bbId?: string): void;
  deleteWishlistItem(bbId: string): void;
  addDedicatedComponent(kind: ImportedDedicatedComponentKind): void;
  addJournalEntry(bbId?: string): void;
  deleteJournalEntry(bbId: string): void;
  addFriend(bbId?: string): void;
  deleteFriend(bbId: string): void;
  addEquipmentItem(bbId?: string): void;
  deleteEquipmentItem(bbId: string): void;
  addContactAction(bbId?: string): void;
  deleteContactAction(bbId: string): void;
  addFootprint(bbId?: string): void;
  deleteFootprint(bbId: string): void;
  addBadge(bbId?: string): void;
  deleteBadge(bbId: string): void;
  updateStyle(bbId: string, styleAttr: string): void;
  applyStyleToChildren(bbId: string, selector: string, styleAttr: string): number;
  updateText(bbId: string, text: string): void;
  updateClassName(bbId: string, className: string): void;
  updateAttribute(bbId: string, name: string, value: string): void;
  deleteNode(bbId: string): void;
  duplicateNode(bbId: string): void;
  selectParent(bbId: string): void;
  clearSelection(): void;
}

interface EditableImportedCanvasProps {
  profile: Profile;
  settings: CanvasSettings;
  zoom: number;
  selectionMode: 'component' | 'deep';
  draftSize: { width: number; height: number } | null;
  inspectedBbId?: string | null;
  onUpdateSettings: (updates: Partial<CanvasSettings>) => void;
  onCommit: (rawHtml: string) => void;
  onSelectNode: (info: ImportedNodeInfo | null) => void;
  onMultiSelectChange: (count: number) => void;
  onTreeChange: (tree: ImportedTreeNode[]) => void;
  onSwitchToRaw: () => void;
}

// Editor style block markers so we can identify & strip them during serialization
const EDITOR_STYLE_MARK = 'data-bb-editor-style';
const SURFACE_STYLE_MARK = 'data-bb-surface-style';
const HEAD_NODE_MARK = 'data-bb-head-node';

const EDITOR_CSS = `
  :host {
    display: block;
    position: relative;
    min-height: 100%;
  }
  *[data-bb-id]:hover:not([data-bb-selected]) {
    outline: 1px dashed rgba(99, 102, 241, 0.6) !important;
    outline-offset: 1px;
    cursor: pointer;
  }
  *[data-bb-selected] {
    outline: 2px solid #6366f1 !important;
    outline-offset: 1px;
  }
  *[data-bb-multi-selected] {
    outline: 2px solid #06b6d4 !important;
    outline-offset: 2px;
    box-shadow: 0 0 0 1px rgba(6, 182, 212, 0.25) !important;
  }
  *[data-bb-in-group] {
    outline: 2px solid #a855f7 !important;
    outline-offset: 2px;
  }
  *[data-bb-editing] {
    outline: 2px solid #f59e0b !important;
    outline-offset: 2px;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.15) !important;
    cursor: text;
  }
  *[data-bb-moving] {
    opacity: 0.55 !important;
    outline: 2px dashed #22c55e !important;
    cursor: grabbing !important;
  }
  a[data-bb-id] {
    /* Prevent link nav on click */
    pointer-events: auto;
  }
  body[data-bb-import-body] {
    display: block;
    width: 100%;
    min-height: 100%;
  }
`;

/**
 * True when a selector's final compound addresses the document root
 * (`html`, `body`, `body#viewer`, `body.js`, `:root`, …).
 */
function isRootSurfaceSelector(selector: string): boolean {
  const last = selector.split(/[\s>+~]+/).filter(Boolean).pop() || '';
  return /^(html|body|:root)([#.][\w-]+|:{1,2}[\w-]+(\([^)]*\))?)*$/i.test(last);
}

/**
 * Shadow DOM has no real document <html>, and the editor keeps the imported
 * <body> inside a shadow root. Gaia themes usually paint the surface with
 * `body { background: ... }` or `html, body { background: ... }` (a *style*,
 * not an <img>), so those declarations are aliased onto `:host` and the
 * shadow body. Export/serialization is untouched.
 */
type Rect = { left: number; top: number; width: number; height: number };
type MultiRect = Rect & { bbId: string };

/**
 * Overlay rects are recomputed every frame while something is selected (so
 * CSS-animated panels keep their outline in sync). Without change detection
 * every frame would allocate a new object and force a full app re-render at
 * 60fps, which pegs the CPU for as long as a node stays selected.
 */
function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

/**
 * Cheap fingerprint of the emitted hierarchy tree. The ResizeObserver fires in
 * bursts while imported CSS/images resolve, and rebuilding + re-setting the
 * whole tree each time churns the properties panel for no visible change.
 */
function treeSignature(nodes: ImportedTreeNode[]): string {
  let signature = '';
  const walk = (list: ImportedTreeNode[], depth: number) => {
    list.forEach((node) => {
      signature += `${depth}:${node.bbId}:${node.tag}:${node.semanticRole}:${node.text.length}|`;
      walk(node.children, depth + 1);
    });
  };
  walk(nodes, 0);
  return signature;
}

function sameMultiRects(a: MultiRect[], b: MultiRect[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((rect, i) => rect.bbId === b[i].bbId && sameRect(rect, b[i]));
}

function adaptImportedCssForShadow(css: string): string {
  return css.replace(/(^|})\s*([^{}@]+)\{([^{}]*)\}/g, (match, brace, selectorText, body) => {
    const selectors = String(selectorText)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (selectors.length === 0) return match;

    const aliases: string[] = [];
    const bodyHasBackground = /background(-image|-color|-repeat|-size|-position|-attachment)?\s*:/i.test(
      String(body)
    );

    selectors.forEach((selector) => {
      const exactRoot = selector === 'html' || selector === 'body' || selector === 'html body';
      if (exactRoot || (bodyHasBackground && isRootSurfaceSelector(selector))) {
        aliases.push(':host', 'body[data-bb-import-body]');
      }
    });

    const merged = [...selectors, ...aliases].filter((s, i, arr) => arr.indexOf(s) === i);
    return `${brace}\n${merged.join(', ')} {${body}}`;
  });
}

/**
 * Fallback surface styles derived from the scraped import (settings carry the
 * background detected from CSS), rendered *before* imported styles so the
 * original cascade still wins when it defines its own background.
 */
function buildSurfaceFallbackCss(settings: CanvasSettings): string {
  const hasImage = !!settings.backgroundImage;
  const color = settings.backgroundColor;
  if (!hasImage && (!color || color === 'transparent')) return '';
  return `:host {
  background-color: ${color || 'transparent'};
  ${hasImage ? `background-image: url('${settings.backgroundImage}');` : ''}
  background-repeat: ${settings.backgroundRepeat || (hasImage ? 'repeat' : 'no-repeat')};
  background-size: ${settings.backgroundSize || 'auto'};
  background-position: ${settings.backgroundPosition || 'left top'};
  background-attachment: ${settings.backgroundAttachment || 'scroll'};
}`;
}

export const EditableImportedCanvas = forwardRef<
  EditableImportedCanvasApi,
  EditableImportedCanvasProps
>(({ profile, settings, zoom, selectionMode, draftSize, inspectedBbId = null, onCommit, onSelectNode, onMultiSelectChange, onTreeChange }, ref) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);
  const lastCommittedHtml = useRef<string>('');
  const overlayContainerRef = useRef<HTMLDivElement>(null);
  const suppressNextClickRef = useRef(false);
  const lastTreeSignature = useRef<string>('');
  const isMountedRef = useRef(true);
  const resyncTimersRef = useRef<number[]>([]);
  const debounceTimerRef = useRef<number | null>(null);

  const [selectedBbId, setSelectedBbId] = useState<string | null>(null);
  // Extra bbIds added by Shift+Click. Primary selection stays in selectedBbId.
  const [selectedBbIds, setSelectedBbIds] = useState<Set<string>>(new Set());
  const [editingBbId, setEditingBbId] = useState<string | null>(null);
  const [selectionRect, setSelectionRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [inspectRect, setInspectRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [multiSelectionRects, setMultiSelectionRects] = useState<
    Array<{ bbId: string; left: number; top: number; width: number; height: number }>
  >([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    bbId: string;
    tag: string;
    semanticRole: ImportedSemanticRole;
    isTextLeaf: boolean;
  } | null>(null);
  const [moveAction, setMoveAction] = useState<{
    bbId: string;
    startX: number;
    startY: number;
    originalLeft: number;
    originalTop: number;
    originalPosition: string;
    hasMovedPastThreshold: boolean;
  } | null>(null);
  const [contentBottomHeight, setContentBottomHeight] = useState<number | null>(null);

  // ---- Helpers -------------------------------------------------------------

  const findElementByBbId = useCallback(
    (bbId: string): HTMLElement | null => {
      const shadow = shadowRef.current;
      if (!shadow) return null;
      return shadow.querySelector(`[data-bb-id="${CSS.escape(bbId)}"]`) as HTMLElement | null;
    },
    []
  );

  const componentRootSelector =
    '#id_forum, .forums_panel, #id_signature, .signature_panel, #id_house, .house_panel, #id_footprints, [id^="id_footprints_"], #id_about, .about_panel, #id_store, .store_panel, #id_badges, [id^="id_badges_"], #id_details, .details_panel, #id_equipment, .equipped_list_panel, #id_contact, .contact_panel, #id_comments, .comments_panel, #id_wishlist, .wish_list_panel, #id_journal, .journal_panel, #id_friends, .friends_panel, [id^="id_custom_"], .custom_panel';

  const getComponentRoot = (el: HTMLElement): HTMLElement | null => {
    return el.closest(componentRootSelector) as HTMLElement | null;
  };

  const getGroupWrapper = (el: HTMLElement): HTMLElement | null => {
    if (el.hasAttribute('data-bb-group')) return el;
    const groupBbId = el.getAttribute('data-bb-in-group');
    if (!groupBbId || !shadowRef.current) return null;
    return shadowRef.current.querySelector(`[data-bb-id="${CSS.escape(groupBbId)}"]`) as HTMLElement | null;
  };

  const getGroupMemberIds = (groupEl: HTMLElement | null): Set<string> => {
    if (!groupEl || !shadowRef.current) return new Set();
    const groupId = groupEl.getAttribute('data-bb-group') || groupEl.getAttribute('data-bb-id');
    if (!groupId) return new Set();
    return new Set(
      Array.from(
        shadowRef.current.querySelectorAll(`[data-bb-in-group="${CSS.escape(groupId)}"]`)
      )
        .map((el) => (el as HTMLElement).getAttribute('data-bb-id'))
        .filter(Boolean) as string[]
    );
  };

  const getCssSourceHint = (el: HTMLElement, prop: string): string => {
    const styleAttr = el.getAttribute('style') || '';
    const inline = styleAttr.toLowerCase();
    if (inline.includes(`${prop.toLowerCase()}:`)) {
      if (el.hasAttribute('data-bb-builder-local')) return 'Profile Builder (local style)';
      if (el.hasAttribute('data-bb-builder-group')) return 'Profile Builder (group style)';
      if (el.hasAttribute('data-bb-builder-global')) return 'Profile Builder (global style)';
      return 'Inline style on element';
    }

    const css = profile.rawCss || '';
    const linkedRegex = /\/\*\s*From\s+([^*]+?)\s*\*\/([\s\S]*?)(?=(\/\*\s*From\s+[^*]+?\s*\*\/)|$)/g;
    const customPart = css.split(/\/\*\s*From\s+[^*]+?\s*\*\//)[0] || '';
    const hasRuleMatch = (block: string) => {
      const ruleRegex = /([^{}@]+)\{([^{}]*)\}/g;
      let match: RegExpExecArray | null;
      while ((match = ruleRegex.exec(block)) !== null) {
        const selectors = match[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const body = match[2].toLowerCase();
        if (!body.includes(`${prop.toLowerCase()}:`)) continue;
        for (const selector of selectors) {
          try {
            if (el.matches(selector)) return true;
          } catch {
            /* ignore invalid selectors */
          }
        }
      }
      return false;
    };

    if (hasRuleMatch(customPart)) return 'Custom <style> in <head>';

    let linkedMatch: RegExpExecArray | null;
    while ((linkedMatch = linkedRegex.exec(css)) !== null) {
      const url = linkedMatch[1].trim();
      const block = linkedMatch[2] || '';
      if (hasRuleMatch(block)) return `Linked stylesheet in <head> (${url})`;
    }

    return 'Inherited / browser default';
  };

  const getV2Columns = (): HTMLElement[] => {
    const shadow = shadowRef.current;
    if (!shadow) return [];
    return ['column_1', 'column_2', 'column_3']
      .map((id) => shadow.querySelector(`#${id}`) as HTMLElement | null)
      .filter(Boolean) as HTMLElement[];
  };

  const getDefaultInsertionParent = (): HTMLElement | ShadowRoot | null => {
    const columns = getV2Columns();
    if (columns.length === 3) return columns[0];
    return shadowRef.current;
  };

  const relocateComponentByPointer = (bbId: string, clientX: number, clientY: number) => {
    const root = findElementByBbId(bbId);
    if (root) insertElementByPointer(root, clientX, clientY);
  };

  const insertElementByPointer = (root: HTMLElement, clientX: number, clientY: number) => {
    const columns = getV2Columns();
    if (columns.length !== 3) return;

    let targetColumn = columns.find((col) => {
      const rect = col.getBoundingClientRect();
      return clientX >= rect.left && clientX <= rect.right;
    });

    if (!targetColumn) {
      targetColumn = columns.reduce((nearest, col) => {
        const nr = nearest.getBoundingClientRect();
        const cr = col.getBoundingClientRect();
        const nd = Math.abs(clientX - (nr.left + nr.width / 2));
        const cd = Math.abs(clientX - (cr.left + cr.width / 2));
        return cd < nd ? col : nearest;
      }, columns[0]);
    }

    const siblings = Array.from(targetColumn.children).filter(
      (child) => child instanceof HTMLElement && child !== root
    ) as HTMLElement[];
    const before = siblings.find((child) => {
      const rect = child.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });

    // The V2 column layout controls position. Remove old manual movement styles.
    root.style.left = '';
    root.style.top = '';
    root.style.position = '';
    targetColumn.insertBefore(root, before || null);
  };

  const insertDedicatedComponentAtPointer = (
    kind: ImportedDedicatedComponentKind,
    clientX: number,
    clientY: number
  ) => {
    const component = makeDedicatedComponent(kind);
    const columns = getV2Columns();
    if (columns.length === 3) {
      insertElementByPointer(component, clientX, clientY);
    } else {
      getDefaultInsertionParent()?.appendChild(component);
    }
    commitToProfile();
    setEditingBbId(null);
    setSelectedBbId(component.getAttribute('data-bb-id'));
    requestAnimationFrame(() => {
      component.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    });
  };



  const getSemanticRole = (el: HTMLElement): ImportedSemanticRole => {
    if (/^id_custom_\d+$/i.test(el.id) || (el.classList.contains('panel') && el.classList.contains('custom_panel'))) return 'custom-panel';
    if (/^custom_\d+_title$/i.test(el.id)) return 'custom-title';
    if (/^custom_\d+_content$/i.test(el.id)) return 'custom-content';

    if (el.id === 'id_forum' || (el.classList.contains('panel') && el.classList.contains('forums_panel'))) return 'forum-panel';
    if (el.id === 'forum_title') return 'forum-title';
    if (el.closest('#id_forum, .forums_panel') && el.tagName === 'P' && /posts per day:/i.test(el.textContent || '')) return 'forum-posts-per-day';
    if (el.closest('#id_forum, .forums_panel') && el.tagName === 'P' && /total posts:/i.test(el.textContent || '')) return 'forum-total-posts';
    if (el.closest('#id_forum, .forums_panel') && el.tagName === 'A' && /latest posts/i.test(el.textContent || '')) return 'forum-latest-posts';

    if (el.id === 'id_signature' || (el.classList.contains('panel') && el.classList.contains('signature_panel'))) return 'signature-panel';
    if (el.id === 'signature_title') return 'signature-title';
    if (el.closest('#id_signature, .signature_panel') && el.classList.contains('postcontent-align-center')) return 'signature-align';
    if (el.closest('#id_signature, .signature_panel') && el.classList.contains('postcontent')) return 'signature-content';

    if (el.id === 'id_house' || (el.classList.contains('panel') && el.classList.contains('house_panel'))) return 'house-panel';
    if (el.id === 'house_title') return 'house-title';
    if (el.closest('#id_house, .house_panel') && el.tagName === 'OBJECT') return 'house-object';
    if (el.closest('#id_house, .house_panel') && el.classList.contains('header-launcher')) return 'house-launcher';

    if (el.id === 'id_footprints') return 'footprints-panel';
    if (el.id === 'footprints_title') return 'footprints-title';
    if (el.closest('#id_footprints') && el.classList.contains('item')) return 'footprints-item';
    if (el.closest('#id_footprints') && el.tagName === 'A') return 'footprints-link';

    if (el.id === 'id_about' || (el.classList.contains('panel') && el.classList.contains('about_panel'))) return 'about-panel';
    if (el.id === 'about_title') return 'about-title';
    if (el.closest('#id_about, .about_panel') && el.classList.contains('postcontent')) return 'about-content';

    if (el.id === 'id_store' || (el.classList.contains('panel') && el.classList.contains('store_panel'))) return 'store-panel';
    if (el.id === 'store_title') return 'store-title';
    if (el.closest('#id_store, .store_panel') && el.tagName === 'H3') return 'store-heading';
    if (el.closest('#id_store, .store_panel') && el.tagName === 'P' && !el.querySelector('a')) return 'store-description';
    if (el.closest('#id_store, .store_panel') && el.tagName === 'A') return 'store-link';

    if (el.id === 'id_badges') return 'badges-panel';
    if (el.id === 'badges_title') return 'badges-title';
    if (el.id === 'badges') return 'badges-list';
    if (el.closest('#id_badges') && el.tagName === 'LI') return 'badge-item';
    if (el.closest('#id_badges') && el.tagName === 'IMG' && el.className.includes('badge_')) return 'badge-image';
    if (el.id === 'badge_display') return 'badge-display-link';

    if (el.id === 'id_details' || (el.classList.contains('panel') && el.classList.contains('details_panel'))) return 'details-panel';
    if (el.id === 'details_title') return 'details-title';
    if (el.id === 'avatarnonce') return 'details-avatar-nonce';
    if (el.closest('#id_details, .details_panel') && el.tagName === 'P' && el.querySelector('img[width="120"], img[height="150"]')) return 'details-avatar-wrap';
    if (el.closest('#id_details, .details_panel') && el.tagName === 'IMG') return 'details-avatar';
    if (el.classList.contains('forum_userstatus') && el.closest('#id_details, .details_panel')) return 'details-status';
    if (el.classList.contains('statuslinks') && el.closest('#id_details, .details_panel')) return 'details-status-links';
    if (el.classList.contains('pushBox') && el.closest('#id_details, .details_panel')) return 'details-pushbox';
    if (el.classList.contains('online') && el.closest('#id_details, .details_panel')) return 'details-online';
    if (el.closest('#id_details, .details_panel') && el.tagName === 'P' && /last login:/i.test(el.textContent || '')) return 'details-last-login';
    if (el.closest('#id_details, .details_panel') && el.tagName === 'P' && /registered:/i.test(el.textContent || '')) return 'details-registered';

    if (el.id === 'id_equipment' || (el.classList.contains('panel') && el.classList.contains('equipped_list_panel'))) return 'equipment-panel';
    if (el.id === 'equipment_title') return 'equipment-title';
    if (el.classList.contains('item') && el.closest('#id_equipment, .equipped_list_panel')) return 'equipment-item';
    if (el.classList.contains('item_info') && el.closest('#id_equipment, .equipped_list_panel')) return 'equipment-item-link';
    if (el.classList.contains('premium_sparkle') && el.closest('#id_equipment, .equipped_list_panel')) return 'equipment-premium-sparkle';
    if (el.tagName === 'IMG' && el.closest('a.item_info') && el.closest('#id_equipment, .equipped_list_panel')) return 'equipment-item-image';

    if (el.id === 'id_contact' || (el.classList.contains('panel') && el.classList.contains('contact_panel'))) return 'contact-panel';
    if (el.id === 'contact_title') return 'contact-title';
    if (el.closest('#id_contact, .contact_panel') && el.tagName === 'UL') return 'contact-list';
    if (el.closest('#id_contact, .contact_panel') && el.tagName === 'LI') return 'contact-action';
    if (el.closest('#id_contact, .contact_panel') && el.tagName === 'A' && /add to friends/i.test(el.textContent || '')) return 'contact-add-friend';
    if (el.closest('#id_contact, .contact_panel') && el.tagName === 'A' && /send message/i.test(el.textContent || '')) return 'contact-message';
    if (el.closest('#id_contact, .contact_panel') && el.tagName === 'A' && /trade items/i.test(el.textContent || '')) return 'contact-trade';

    if (el.id === 'id_wishlist' || (el.classList.contains('panel') && el.classList.contains('wish_list_panel'))) return 'wishlist-panel';
    if (el.id === 'wishlist_title') return 'wishlist-title';
    if (el.classList.contains('item') && el.closest('#id_wishlist, .wish_list_panel')) return 'wishlist-item';
    if (el.classList.contains('item_info') && el.closest('#id_wishlist, .wish_list_panel')) return 'wishlist-item-link';
    if (el.classList.contains('owner_checkmark') && el.closest('#id_wishlist, .wish_list_panel')) return 'wishlist-owner-checkmark';
    if (el.tagName === 'IMG' && el.closest('a.item_info') && el.closest('#id_wishlist, .wish_list_panel')) return 'wishlist-item-image';

    if (el.id === 'id_journal' || (el.classList.contains('panel') && el.classList.contains('journal_panel'))) return 'journal-panel';
    if (el.id === 'journal_title') return 'journal-title';
    if (el.closest('#id_journal, .journal_panel') && el.tagName === 'A' && el.textContent?.trim().toLowerCase() === 'view journal') return 'journal-view-link';
    if (el.closest('#id_journal, .journal_panel') && el.tagName === 'H3') return 'journal-heading';
    if (el.closest('#id_journal, .journal_panel') && el.tagName === 'P') return 'journal-summary';
    if (el.id === 'entries' && el.closest('#id_journal, .journal_panel')) return 'journal-entries';
    if (el.closest('#id_journal, .journal_panel') && el.tagName === 'LI') return 'journal-entry';
    if (el.closest('#id_journal, .journal_panel') && el.tagName === 'A') return 'journal-entry-link';
    if (el.classList.contains('journal-date') && el.closest('#id_journal, .journal_panel')) return 'journal-date';

    if (el.id === 'id_friends' || (el.classList.contains('panel') && el.classList.contains('friends_panel'))) return 'friends-panel';
    if (el.id === 'friends_title') return 'friends-title';
    if (el.closest('#id_friends, .friends_panel') && el.tagName === 'A' && el.textContent?.trim().toLowerCase() === 'view all friends') return 'friends-view-all';
    if (el.closest('#id_friends, .friends_panel') && el.tagName === 'UL' && el.classList.contains('style2')) return 'friends-list';
    if (el.closest('#id_friends, .friends_panel') && el.tagName === 'LI') return 'friend-item';
    if (el.closest('#id_friends, .friends_panel') && el.tagName === 'SPAN') return 'friend-name';
    if (el.closest('#id_friends, .friends_panel') && el.tagName === 'A') return 'friend-link';

    if (el.id === 'id_comments' || (el.classList.contains('panel') && el.classList.contains('comments_panel'))) return 'comments-panel';
    if (el.id === 'comments_title') return 'comments-title';
    if (el.id === 'alert_container' || el.id === 'alerts_banner') return 'comments-actions';
    if (el.closest('#alert_container, #alerts_banner')) return 'comments-action-link';
    if (el.tagName === 'P' && el.querySelector('a')?.textContent?.trim().toLowerCase().includes('view all comments')) return 'comments-view-all';
    if (el.tagName === 'DL' && el.classList.contains('style1') && el.closest('#id_comments, .comments_panel')) return 'comments-list';
    if (el.tagName === 'DT' && el.hasAttribute('data-comment-id')) return 'comment-header';
    if (el.tagName === 'DD' && el.hasAttribute('data-comment-id')) return 'comment-body';
    if (el.classList.contains('username')) return 'comment-username';
    if (el.classList.contains('date')) return 'comment-date';
    if (el.classList.contains('deletecomment')) return 'comment-actions';
    if (el.closest('.deletecomment')) return 'comment-action-link';
    if (el.classList.contains('dropBox')) return 'comment-avatar-box';
    if (el.classList.contains('avatarImage')) return 'comment-avatar';
    if (el.classList.contains('postcontent') && el.closest('#id_comments, .comments_panel')) return 'comment-content';
    return 'generic';
  };

  const findWishlistPanel = (start?: HTMLElement | null): HTMLElement | null => {
    const shadow = shadowRef.current;
    if (!shadow) return null;
    const scoped = start?.closest('#id_wishlist, .wish_list_panel') as HTMLElement | null;
    return scoped || (shadow.querySelector('#id_wishlist, .wish_list_panel') as HTMLElement | null);
  };

  const findWishlistItem = (bbId: string): HTMLElement | null => {
    const el = findElementByBbId(bbId);
    return (el?.closest('#id_wishlist .item, .wish_list_panel .item') as HTMLElement | null) || el;
  };

  const makeSampleWishlistItem = (): HTMLElement => {
    const stamp = String(Date.now());
    const item = document.createElement('div');
    item.className = 'item';
    item.setAttribute('data-bb-id', `bb-wishlist-item-${stamp}`);
    item.innerHTML = `<a href="#" class="item_info" name="" id="_imported_${stamp}" title="New Wishlist Item" data-bb-id="bb-wishlist-link-${stamp}"><img src="https://graphics.gaiaonline.com/images/thumbnails/ec39bd6a5959.png" title="New Wishlist Item" alt="New Wishlist Item" height="30" width="30" data-bb-id="bb-wishlist-img-${stamp}"></a>`;
    return item;
  };

  const makeSampleEquipmentItem = (): HTMLElement => {
    const stamp = String(Date.now()) + Math.random().toString(36).slice(2, 5);
    const item = document.createElement('div');
    item.className = 'item';
    item.setAttribute('data-bb-id', `bb-equipment-item-${stamp}`);
    item.innerHTML = `<a href="#" class="item_info" id="_equip_${stamp}" name="" title="Equipped Item" data-bb-id="bb-equipment-link-${stamp}"><img src="https://graphics.gaiaonline.com/images/thumbnails/ec39bd6a5959.png" alt="Equipped Item" height="30" width="30" data-bb-id="bb-equipment-img-${stamp}"></a>`;
    return item;
  };

  const makeSampleContactAction = (): HTMLElement => {
    const stamp = String(Date.now());
    const li = document.createElement('li');
    li.setAttribute('data-bb-id', `bb-contact-action-${stamp}`);
    li.innerHTML = `<a href="#" data-bb-id="bb-contact-link-${stamp}">New Contact Action</a>`;
    return li;
  };

  const makeSampleFootprint = (): HTMLElement => {
    const stamp = String(Date.now());
    const item = document.createElement('div');
    item.className = 'item';
    item.id = `yui-gen-${stamp}`;
    item.setAttribute('data-bb-id', `bb-footprint-item-${stamp}`);
    item.innerHTML = `<a href="#" data-bb-id="bb-footprint-link-${stamp}">New Visitor</a> on ${new Date().toLocaleDateString()}`;
    return item;
  };

  const makeSampleBadge = (): HTMLElement => {
    const stamp = String(Date.now());
    const li = document.createElement('li');
    li.setAttribute('data-bb-id', `bb-badge-item-${stamp}`);
    li.innerHTML = `<img src="" class="clickable badge_${stamp}" data-tooltip="New Badge" alt="Badge" data-bb-id="bb-badge-img-${stamp}">`;
    return li;
  };

  const makeDedicatedComponent = (kind: ImportedDedicatedComponentKind): HTMLElement => {
    const stamp = String(Date.now());
    const wrapper = document.createElement('div');

    if (kind === 'forums') {
      wrapper.className = 'panel forums_panel';
      wrapper.id = 'id_forum';
      wrapper.setAttribute('data-bb-id', `bb-forum-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="forum_title" data-bb-id="bb-forum-title-${stamp}">Forums</h2><p data-bb-id="bb-forum-ppd-${stamp}"><strong data-bb-id="bb-forum-ppd-label-${stamp}">Posts per Day:</strong> 0.00</p><p data-bb-id="bb-forum-total-${stamp}"><strong data-bb-id="bb-forum-total-label-${stamp}">Total Posts:</strong> 0</p><p data-bb-id="bb-forum-latest-wrap-${stamp}"><a href="#" data-bb-id="bb-forum-latest-${stamp}">Latest Posts</a></p>`;
      return wrapper;
    }

    if (kind === 'signature') {
      wrapper.className = 'panel postcontent signature_panel';
      wrapper.id = 'id_signature';
      wrapper.setAttribute('data-bb-id', `bb-signature-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="signature_title" data-bb-id="bb-signature-title-${stamp}">Signature</h2><p data-bb-id="bb-signature-empty-${stamp}"></p><div class="postcontent-align-center" style="text-align: center" data-bb-id="bb-signature-align-${stamp}"><span style="color: crimson" data-bb-id="bb-signature-text-${stamp}">New signature text</span><div class="clear" data-bb-id="bb-signature-clear-${stamp}"></div></div>`;
      return wrapper;
    }

    if (kind === 'house') {
      wrapper.className = 'panel house_panel';
      wrapper.id = 'id_house';
      wrapper.setAttribute('data-bb-id', `bb-house-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="house_title" data-bb-id="bb-house-title-${stamp}">House</h2><object classid="" width="200" height="200" style="" data-bb-id="bb-house-object-${stamp}"></object><div align="center" data-bb-id="bb-house-center-${stamp}"><a href="#" class="header-launcher" data-launchtype="towns" data-bb-id="bb-house-launcher-${stamp}">Visit My House</a><br><br></div>`;
      return wrapper;
    }

    if (kind === 'footprints') {
      wrapper.className = 'panel';
      wrapper.id = 'id_footprints';
      wrapper.setAttribute('data-bb-id', `bb-footprints-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="footprints_title" data-bb-id="bb-footprints-title-${stamp}">Recent Visitors</h2><div class="clear" data-bb-id="bb-footprints-clear-${stamp}"></div>`;
      wrapper.insertBefore(makeSampleFootprint(), wrapper.querySelector('.clear'));
      return wrapper;
    }

    if (kind === 'about') {
      wrapper.className = 'panel about_panel postcontent';
      wrapper.id = 'id_about';
      wrapper.setAttribute('data-bb-id', `bb-about-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="about_title" data-bb-id="bb-about-title-${stamp}">About</h2><div data-bb-id="bb-about-content-${stamp}">Tell people about yourself.</div><div class="clear" data-bb-id="bb-about-clear-${stamp}"></div>`;
      return wrapper;
    }

    if (kind === 'store') {
      wrapper.className = 'panel store_panel postcontent';
      wrapper.id = 'id_store';
      wrapper.setAttribute('data-bb-id', `bb-store-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="store_title" data-bb-id="bb-store-title-${stamp}">Store</h2><h3 data-bb-id="bb-store-heading-${stamp}">Store Header</h3><p data-bb-id="bb-store-description-${stamp}">&nbsp;</p><p data-bb-id="bb-store-link-wrap-${stamp}"><a href="#" data-bb-id="bb-store-link-${stamp}">View Store</a></p>`;
      return wrapper;
    }

    if (kind === 'badges') {
      wrapper.className = 'panel';
      wrapper.id = 'id_badges';
      wrapper.setAttribute('data-bb-id', `bb-badges-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="badges_title" data-bb-id="bb-badges-title-${stamp}">Badges</h2><ul id="badges" data-bb-id="bb-badges-list-${stamp}"></ul><div class="clear" data-bb-id="bb-badges-clear-${stamp}"></div><a href="#" id="badge_display" data-bb-id="bb-badges-display-${stamp}">View More Badges</a>`;
      wrapper.querySelector('#badges')?.appendChild(makeSampleBadge());
      return wrapper;
    }

    if (kind === 'details') {
      wrapper.className = 'panel details_panel';
      wrapper.id = 'id_details';
      wrapper.setAttribute('data-bb-id', `bb-details-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="details_title" class="2170553" data-bb-id="bb-details-title-${stamp}">Profile Details</h2><input type="hidden" id="avatarnonce" value="" data-bb-id="bb-details-nonce-${stamp}"><p data-bb-id="bb-details-avatar-wrap-${stamp}"><img src="" alt="Avatar" width="120" height="150" data-bb-id="bb-details-avatar-${stamp}"></p><div class="forum_userstatus" data-bb-id="bb-details-status-${stamp}"><div class="statuslinks" data-bb-id="bb-details-statuslinks-${stamp}"><div class="pushBox" data-uid="" data-bb-id="bb-details-pushbox-${stamp}">&nbsp;</div><span class="online" data-bb-id="bb-details-online-${stamp}">Online</span></div></div><p data-bb-id="bb-details-lastlogin-${stamp}"><strong data-bb-id="bb-details-lastlogin-label-${stamp}">Last Login:</strong> </p><p data-bb-id="bb-details-registered-${stamp}"><strong data-bb-id="bb-details-registered-label-${stamp}">Registered:</strong> </p>`;
      return wrapper;
    }

    if (kind === 'equipment') {
      wrapper.className = 'panel equipped_list_panel';
      wrapper.id = 'id_equipment';
      wrapper.setAttribute('data-bb-id', `bb-equipment-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="equipment_title" data-bb-id="bb-equipment-title-${stamp}">Equipped List</h2><div class="clear" data-bb-id="bb-equipment-clear-${stamp}"></div>`;
      wrapper.insertBefore(makeSampleEquipmentItem(), wrapper.querySelector('.clear'));
      wrapper.insertBefore(makeSampleEquipmentItem(), wrapper.querySelector('.clear'));
      return wrapper;
    }

    if (kind === 'contact') {
      wrapper.className = 'panel contact_panel';
      wrapper.id = 'id_contact';
      wrapper.setAttribute('data-bb-id', `bb-contact-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="contact_title" data-bb-id="bb-contact-title-${stamp}">Contact</h2><ul data-bb-id="bb-contact-list-${stamp}"><li data-bb-id="bb-contact-add-li-${stamp}"><a href="#" data-bb-id="bb-contact-add-${stamp}">Add to Friends</a></li><li data-bb-id="bb-contact-message-li-${stamp}"><a href="#" data-bb-id="bb-contact-message-${stamp}">Send Message</a></li><li data-bb-id="bb-contact-trade-li-${stamp}"><a href="#" data-bb-id="bb-contact-trade-${stamp}">Trade Items</a></li></ul>`;
      return wrapper;
    }

    if (kind === 'comments') {
      wrapper.className = 'panel comments_panel';
      wrapper.id = 'id_comments';
      wrapper.setAttribute('data-bb-id', `bb-comments-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="comments_title" data-bb-id="bb-comments-title-${stamp}">Comments</h2><div data-bb-id="bb-comments-actions-${stamp}"><span id="alert_container" data-bb-id="bb-comments-alert-${stamp}"><a href="#" data-bb-id="bb-comments-add-link-${stamp}">Add Comment</a></span><span id="alerts_banner" data-bb-id="bb-comments-banner-${stamp}"><a href="#" data-bb-id="bb-comments-alert-link-${stamp}">Alert Me of Comments</a></span><div class="clear" data-bb-id="bb-comments-clear-${stamp}"></div></div><p data-bb-id="bb-comments-viewall-wrap-${stamp}"><a href="#" data-bb-id="bb-comments-viewall-${stamp}">View All Comments</a></p><dl class="style1" data-bb-id="bb-comments-list-${stamp}"></dl>`;
      const list = wrapper.querySelector('dl.style1') as HTMLElement;
      const { dt, dd } = makeSampleCommentPair();
      list.appendChild(dt);
      list.appendChild(dd);
      return wrapper;
    }

    if (kind === 'wishlist') {
      wrapper.className = 'panel wish_list_panel profile';
      wrapper.id = 'id_wishlist';
      wrapper.setAttribute('data-bb-id', `bb-wishlist-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="wishlist_title" data-bb-id="bb-wishlist-title-${stamp}">Wish List</h2>`;
      wrapper.appendChild(makeSampleWishlistItem());
      return wrapper;
    }

    if (kind === 'journal') {
      wrapper.className = 'panel journal_panel postcontent';
      wrapper.id = 'id_journal';
      wrapper.setAttribute('data-bb-id', `bb-journal-panel-${stamp}`);
      wrapper.innerHTML = `<h2 id="journal_title" data-bb-id="bb-journal-title-${stamp}">Journal</h2><p data-bb-id="bb-journal-view-wrap-${stamp}"><a href="#" data-bb-id="bb-journal-view-${stamp}">View Journal</a></p><h3 data-bb-id="bb-journal-heading-${stamp}">Latest Entry</h3><p data-bb-id="bb-journal-summary-${stamp}">A short journal preview goes here.</p><ul id="entries" data-bb-id="bb-journal-entries-${stamp}"><li data-bb-id="bb-journal-entry-${stamp}"><a href="#" data-bb-id="bb-journal-entry-link-${stamp}">New journal entry <span class="journal-date" data-bb-id="bb-journal-date-${stamp}">${new Date().toLocaleDateString()}</span></a></li></ul>`;
      return wrapper;
    }

    wrapper.className = 'panel friends_panel';
    wrapper.id = 'id_friends';
    wrapper.setAttribute('data-bb-id', `bb-friends-panel-${stamp}`);
    wrapper.innerHTML = `<h2 id="friends_title" data-bb-id="bb-friends-title-${stamp}">Friends</h2><div data-bb-id="bb-friends-clearwrap-${stamp}"><div class="clear" data-bb-id="bb-friends-clear-${stamp}"></div></div><p data-bb-id="bb-friends-view-wrap-${stamp}"><a href="#" data-bb-id="bb-friends-viewall-${stamp}">View All Friends</a></p><p data-bb-id="bb-friends-note-${stamp}">Featured friends</p><ul class="style2" data-bb-id="bb-friends-list-${stamp}"><li data-bb-id="bb-friend-item-${stamp}"><p data-bb-id="bb-friend-p-${stamp}"><span data-bb-id="bb-friend-name-${stamp}"><a href="#" title="Friend" data-bb-id="bb-friend-link-${stamp}">New Friend</a></span></p></li></ul><div class="clear" data-bb-id="bb-friends-clear2-${stamp}"></div>`;
    return wrapper;
  };

  const findJournalPanel = (start?: HTMLElement | null): HTMLElement | null => {
    const shadow = shadowRef.current;
    if (!shadow) return null;
    const scoped = start?.closest('#id_journal, .journal_panel') as HTMLElement | null;
    return scoped || (shadow.querySelector('#id_journal, .journal_panel') as HTMLElement | null);
  };

  const makeSampleJournalEntry = (): HTMLElement => {
    const stamp = String(Date.now());
    const li = document.createElement('li');
    li.setAttribute('data-bb-id', `bb-journal-entry-${stamp}`);
    li.innerHTML = `<a href="#" data-bb-id="bb-journal-entry-link-${stamp}">New journal entry <span class="journal-date" data-bb-id="bb-journal-date-${stamp}">${new Date().toLocaleDateString()}</span></a>`;
    return li;
  };

  const findJournalEntry = (bbId: string): HTMLElement | null => {
    const el = findElementByBbId(bbId);
    return (el?.closest('#id_journal li, .journal_panel li') as HTMLElement | null) || el;
  };

  const findFriendsPanel = (start?: HTMLElement | null): HTMLElement | null => {
    const shadow = shadowRef.current;
    if (!shadow) return null;
    const scoped = start?.closest('#id_friends, .friends_panel') as HTMLElement | null;
    return scoped || (shadow.querySelector('#id_friends, .friends_panel') as HTMLElement | null);
  };

  const makeSampleFriend = (): HTMLElement => {
    const stamp = String(Date.now());
    const li = document.createElement('li');
    li.setAttribute('data-bb-id', `bb-friend-item-${stamp}`);
    li.innerHTML = `<p data-bb-id="bb-friend-p-${stamp}"><span data-bb-id="bb-friend-name-${stamp}"><a href="#" title="Friend" data-bb-id="bb-friend-link-${stamp}">New Friend</a></span></p>`;
    return li;
  };

  const findFriendItem = (bbId: string): HTMLElement | null => {
    const el = findElementByBbId(bbId);
    return (el?.closest('#id_friends li, .friends_panel li') as HTMLElement | null) || el;
  };

  const findEquipmentPanel = (start?: HTMLElement | null): HTMLElement | null => {
    const shadow = shadowRef.current;
    if (!shadow) return null;
    const scoped = start?.closest('#id_equipment, .equipped_list_panel') as HTMLElement | null;
    return scoped || (shadow.querySelector('#id_equipment, .equipped_list_panel') as HTMLElement | null);
  };

  const findEquipmentItem = (bbId: string): HTMLElement | null => {
    const el = findElementByBbId(bbId);
    return (el?.closest('#id_equipment .item, .equipped_list_panel .item') as HTMLElement | null) || el;
  };

  const findContactPanel = (start?: HTMLElement | null): HTMLElement | null => {
    const shadow = shadowRef.current;
    if (!shadow) return null;
    const scoped = start?.closest('#id_contact, .contact_panel') as HTMLElement | null;
    return scoped || (shadow.querySelector('#id_contact, .contact_panel') as HTMLElement | null);
  };

  const findContactAction = (bbId: string): HTMLElement | null => {
    const el = findElementByBbId(bbId);
    return (el?.closest('#id_contact li, .contact_panel li') as HTMLElement | null) || el;
  };

  const findFootprintsPanel = (start?: HTMLElement | null): HTMLElement | null => {
    const shadow = shadowRef.current;
    if (!shadow) return null;
    const scoped = start?.closest('#id_footprints, [id^="id_footprints_"]') as HTMLElement | null;
    return scoped || (shadow.querySelector('#id_footprints, [id^="id_footprints_"]') as HTMLElement | null);
  };

  const findFootprintItem = (bbId: string): HTMLElement | null => {
    const el = findElementByBbId(bbId);
    return (el?.closest('#id_footprints .item, [id^="id_footprints_"] .item') as HTMLElement | null) || el;
  };

  const findBadgesPanel = (start?: HTMLElement | null): HTMLElement | null => {
    const shadow = shadowRef.current;
    if (!shadow) return null;
    const scoped = start?.closest('#id_badges, [id^="id_badges_"]') as HTMLElement | null;
    return scoped || (shadow.querySelector('#id_badges, [id^="id_badges_"]') as HTMLElement | null);
  };

  const findBadgeItem = (bbId: string): HTMLElement | null => {
    const el = findElementByBbId(bbId);
    return (el?.closest('#id_badges li, [id^="id_badges_"] li') as HTMLElement | null) || el;
  };

  const findCommentsPanel = (start?: HTMLElement | null): HTMLElement | null => {
    const shadow = shadowRef.current;
    if (!shadow) return null;
    const scoped = start?.closest('#id_comments, .comments_panel') as HTMLElement | null;
    return scoped || (shadow.querySelector('#id_comments, .comments_panel') as HTMLElement | null);
  };

  const findCommentPair = (bbId: string): { dt: HTMLElement | null; dd: HTMLElement | null } => {
    const el = findElementByBbId(bbId);
    if (!el) return { dt: null, dd: null };
    const holder = el.closest('dt[data-comment-id], dd[data-comment-id]') as HTMLElement | null;
    if (!holder) return { dt: null, dd: null };
    const commentId = holder.getAttribute('data-comment-id');
    if (!commentId) return { dt: holder.tagName === 'DT' ? holder : null, dd: holder.tagName === 'DD' ? holder : null };
    const dl = holder.closest('dl') || holder.parentElement;
    return {
      dt: dl?.querySelector(`dt[data-comment-id="${CSS.escape(commentId)}"]`) as HTMLElement | null,
      dd: dl?.querySelector(`dd[data-comment-id="${CSS.escape(commentId)}"]`) as HTMLElement | null,
    };
  };

  const makeSampleCommentPair = (): { dt: HTMLElement; dd: HTMLElement } => {
    const doc = document;
    const stamp = String(Date.now());
    const commentId = `imported-${stamp}`;
    const userId = '0';

    const dt = doc.createElement('dt');
    dt.setAttribute('data-comment-id', commentId);
    dt.setAttribute('data-user-id', userId);
    dt.setAttribute('data-bb-id', `bb-comment-dt-${stamp}`);
    dt.innerHTML = `<span class="username" data-bb-id="bb-comment-user-${stamp}"><a href="#" title="Imported commenter" data-bb-id="bb-comment-user-link-${stamp}">New Commenter</a></span><span class="date" data-bb-id="bb-comment-date-${stamp}"><a href="#" data-bb-id="bb-comment-report-${stamp}">Report</a> | ${new Date().toLocaleString()}</span>`;

    const dd = doc.createElement('dd');
    dd.setAttribute('data-comment-id', commentId);
    dd.setAttribute('data-user-id', userId);
    dd.setAttribute('data-bb-id', `bb-comment-dd-${stamp}`);
    dd.innerHTML = `<p class="deletecomment" data-bb-id="bb-comment-actions-${stamp}"><a href="#" class="profile-delete-comment" data-bb-id="bb-comment-delete-${stamp}">Delete</a><br><a href="#" data-bb-id="bb-comment-back-${stamp}">Comment Back</a></p><div class="dropBox" data-bb-id="bb-comment-dropbox-${stamp}"><img src="" alt="" class="avatarImage" width="48" height="48" data-bb-id="bb-comment-avatar-${stamp}"></div><div class="postcontent" data-bb-id="bb-comment-content-${stamp}">New imported comment content.</div>`;

    return { dt, dd };
  };

  const nodeInfoFromElement = (el: HTMLElement): ImportedNodeInfo => {
    const hasElementChildren = Array.from(el.children).length > 0;
    const semanticRole = getSemanticRole(el);
    const selfComputed = window.getComputedStyle(el);
    const parentComputed = el.parentElement ? window.getComputedStyle(el.parentElement) : selfComputed;
    const globalEl = shadowRef.current?.querySelector('body[data-bb-import-body]') as HTMLElement | null;
    const globalComputed = globalEl ? window.getComputedStyle(globalEl) : selfComputed;
    return {
      bbId: el.getAttribute('data-bb-id') || '',
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      className: el.getAttribute('class') || '',
      semanticRole,
      commentId: el.getAttribute('data-comment-id') || undefined,
      userId: el.getAttribute('data-user-id') || undefined,
      text: el.textContent || '',
      hasChildren: hasElementChildren,
      isTextLeaf: !hasElementChildren,
      inlineStyle: el.getAttribute('style') || '',
      computed: {
        selfColor: selfComputed.color,
        selfBackground: selfComputed.backgroundColor,
        selfFontSize: selfComputed.fontSize,
        selfPadding: selfComputed.paddingTop,
        parentColor: parentComputed.color,
        parentBackground: parentComputed.backgroundColor,
        parentFontSize: parentComputed.fontSize,
        parentPadding: parentComputed.paddingTop,
        globalColor: globalComputed.color,
        globalBackground: globalComputed.backgroundColor,
        globalFontSize: globalComputed.fontSize,
        globalPadding: globalComputed.paddingTop,
      },
      sources: {
        selfColor: getCssSourceHint(el, 'color'),
        selfBackground: getCssSourceHint(el, 'background-color'),
        selfFontSize: getCssSourceHint(el, 'font-size'),
        selfPadding: getCssSourceHint(el, 'padding'),
        parentColor: el.parentElement ? getCssSourceHint(el.parentElement, 'color') : 'Inherited / browser default',
        parentBackground: el.parentElement ? getCssSourceHint(el.parentElement, 'background-color') : 'Inherited / browser default',
        parentFontSize: el.parentElement ? getCssSourceHint(el.parentElement, 'font-size') : 'Inherited / browser default',
        parentPadding: el.parentElement ? getCssSourceHint(el.parentElement, 'padding') : 'Inherited / browser default',
        globalColor: globalEl ? getCssSourceHint(globalEl, 'color') : 'Inherited / browser default',
        globalBackground: globalEl ? getCssSourceHint(globalEl, 'background-color') : 'Inherited / browser default',
        globalFontSize: globalEl ? getCssSourceHint(globalEl, 'font-size') : 'Inherited / browser default',
        globalPadding: globalEl ? getCssSourceHint(globalEl, 'padding') : 'Inherited / browser default',
      },
      attributes: Array.from(el.attributes)
        .filter((a) => !a.name.startsWith('data-bb-') && a.name !== 'style' && a.name !== 'class')
        .map((a) => ({ name: a.name, value: a.value })),
    };
  };

  const buildTreeFromElement = (el: HTMLElement, depth: number): ImportedTreeNode => {
    const text = Array.from(el.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent || '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const children = Array.from(el.children)
      .filter((child) => child instanceof HTMLElement && child.hasAttribute('data-bb-id'))
      .map((child) => buildTreeFromElement(child as HTMLElement, depth + 1));

    return {
      bbId: el.getAttribute('data-bb-id') || '',
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      className: el.getAttribute('class') || '',
      semanticRole: getSemanticRole(el),
      commentId: el.getAttribute('data-comment-id') || undefined,
      userId: el.getAttribute('data-user-id') || undefined,
      text: text.slice(0, 80),
      depth,
      children,
    };
  };

  const emitTree = useCallback(() => {
    const shadow = shadowRef.current;
    if (!shadow) {
      onTreeChange([]);
      return;
    }
    const roots = Array.from(shadow.children)
      .filter((el) =>
        el instanceof HTMLElement &&
        el.hasAttribute('data-bb-id') &&
        !(el.tagName === 'STYLE')
      )
      .map((el) => buildTreeFromElement(el as HTMLElement, 0));
    // The ResizeObserver can fire in bursts (linked CSS landing, image decode,
    // CSS animations). Skip the parent update when the tree is unchanged.
    const signature = treeSignature(roots);
    if (signature === lastTreeSignature.current) return;
    lastTreeSignature.current = signature;
    onTreeChange(roots);
  }, [onTreeChange]);

  const ensureBbIds = (root: ParentNode) => {
    let counter = Date.now();
    root.querySelectorAll('*').forEach((el) => {
      if (el instanceof HTMLElement && !el.hasAttribute('data-bb-id')) {
        el.setAttribute('data-bb-id', `bb-${counter++}`);
      }
    });
  };

  const recomputeSelectionRect = useCallback(() => {
    const shadow = shadowRef.current;
    const host = hostRef.current;
    const overlay = overlayContainerRef.current;
    if (!shadow || !host) {
      setSelectionRect(null);
      setInspectRect(null);
      setMultiSelectionRects([]);
      return;
    }

    const overlayRect = (overlay || host).getBoundingClientRect();

    const nextSelectionRect: Rect | null = (() => {
      if (!selectedBbId) return null;
      const el = findElementByBbId(selectedBbId);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        left: rect.left - overlayRect.left,
        top: rect.top - overlayRect.top,
        width: rect.width,
        height: rect.height,
      };
    })();
    // Bail out when nothing moved — prevents a re-render per animation frame.
    setSelectionRect((prev) => (sameRect(prev, nextSelectionRect) ? prev : nextSelectionRect));

    const nextInspectRect: Rect | null = (() => {
      if (!inspectedBbId || inspectedBbId === selectedBbId) return null;
      const inspectedEl = findElementByBbId(inspectedBbId);
      if (!inspectedEl) return null;
      const rect = inspectedEl.getBoundingClientRect();
      return {
        left: rect.left - overlayRect.left,
        top: rect.top - overlayRect.top,
        width: rect.width,
        height: rect.height,
      };
    })();
    setInspectRect((prev) => (sameRect(prev, nextInspectRect) ? prev : nextInspectRect));

    const rects = Array.from(selectedBbIds)
      .filter((bbId) => bbId !== selectedBbId)
      .map((bbId) => {
        const el = findElementByBbId(bbId);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return {
          bbId,
          left: rect.left - overlayRect.left,
          top: rect.top - overlayRect.top,
          width: rect.width,
          height: rect.height,
        };
      })
      .filter(Boolean) as MultiRect[];
    setMultiSelectionRects((prev) => (sameMultiRects(prev, rects) ? prev : rects));
  }, [selectedBbId, selectedBbIds, inspectedBbId, findElementByBbId]);

  const parseCssPixels = (value: string): number => {
    const parsed = parseFloat(value || '0');
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const startMoveElement = (bbId: string, clientX: number, clientY: number) => {
    const el = findElementByBbId(bbId);
    if (!el) return;

    // Disable text selection immediately so dragging text-heavy components
    // can't start a native text highlight before the move lifecycle begins.
    document.documentElement.style.userSelect = 'none';
    document.body.style.userSelect = 'none';
    window.getSelection()?.removeAllRanges();

    const computed = window.getComputedStyle(el);
    const originalPosition = el.style.position || computed.position || 'static';

    setMoveAction({
      bbId,
      startX: clientX,
      startY: clientY,
      originalLeft: parseCssPixels(el.style.left || computed.left),
      originalTop: parseCssPixels(el.style.top || computed.top),
      originalPosition,
      hasMovedPastThreshold: false,
    });
  };

  const startMoveNode = (bbId: string, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startMoveElement(bbId, e.clientX, e.clientY);
  };

  const measureContentBottom = useCallback(() => {
    const shadow = shadowRef.current;
    if (!shadow) return;
    const body = shadow.querySelector('body[data-bb-import-body]') as HTMLElement | null;
    if (!body) return;
    const columns = body.querySelector('#columns') as HTMLElement | null;
    if (!columns) {
      setContentBottomHeight(Math.ceil(body.scrollHeight));
      return;
    }
    const bodyRect = body.getBoundingClientRect();
    let maxBottom = columns.getBoundingClientRect().bottom - bodyRect.top;
    columns.querySelectorAll('.column').forEach((col) => {
      const rect = (col as HTMLElement).getBoundingClientRect();
      maxBottom = Math.max(maxBottom, rect.bottom - bodyRect.top);
    });
    const nextHeight = Math.max(1, Math.ceil(maxBottom));
    setContentBottomHeight((prev) => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const refreshAfterMutation = (bbId?: string) => {
    requestAnimationFrame(() => {
      emitTree();
      measureContentBottom();
      recomputeSelectionRect();
      const targetId = bbId || selectedBbId;
      if (targetId) {
        const el = findElementByBbId(targetId);
        if (el) onSelectNode(nodeInfoFromElement(el));
      }
    });
  };

  // ---- Selection sync ------------------------------------------------------

  useEffect(() => {
    const shadow = shadowRef.current;
    if (!shadow) return;
    // Clear previous single-select marker
    shadow.querySelectorAll('[data-bb-selected]').forEach((el) => {
      el.removeAttribute('data-bb-selected');
    });
    // Clear multi-select markers
    shadow.querySelectorAll('[data-bb-multi-selected]').forEach((el) => {
      el.removeAttribute('data-bb-multi-selected');
    });
    if (selectedBbId) {
      const el = findElementByBbId(selectedBbId);
      if (el) el.setAttribute('data-bb-selected', '');
      onSelectNode(el ? nodeInfoFromElement(el) : null);
    } else {
      onSelectNode(null);
    }
    const allSelected = new Set([...(selectedBbId ? [selectedBbId] : []), ...selectedBbIds]);
    // Apply multi-select markers (all *other* selected nodes except primary)
    allSelected.forEach((bbId) => {
      if (bbId === selectedBbId) return;
      const el = findElementByBbId(bbId);
      if (el) el.setAttribute('data-bb-multi-selected', '');
    });
    const primaryIsGroup = !!(selectedBbId && findElementByBbId(selectedBbId)?.hasAttribute('data-bb-group'));
    onMultiSelectChange(primaryIsGroup ? selectedBbIds.size : allSelected.size);
    recomputeSelectionRect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBbId, selectedBbIds]);

  useEffect(() => {
    const shadow = shadowRef.current;
    if (!shadow) return;
    shadow.querySelectorAll('[data-bb-editing]').forEach((el) => {
      el.removeAttribute('data-bb-editing');
      (el as HTMLElement).removeAttribute('contenteditable');
    });
    if (editingBbId) {
      const el = findElementByBbId(editingBbId);
      if (el) {
        el.setAttribute('data-bb-editing', '');
        el.setAttribute('contenteditable', 'true');
        (el as HTMLElement).focus();
        // Select all text on entering edit mode
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBbId]);

  // ---- Serialize shadow → rawHtml -----------------------------------------

  const commitToProfile = useCallback(() => {
    const shadow = shadowRef.current;
    if (!shadow) return;

    const stripEditorCruft = (root: HTMLElement) => {
      root.removeAttribute('data-bb-selected');
      root.removeAttribute('data-bb-editing');
      root.removeAttribute('data-bb-moving');
      root.removeAttribute('data-bb-builder-local');
      root.removeAttribute('data-bb-builder-group');
      root.removeAttribute('data-bb-builder-global');
      root.removeAttribute('contenteditable');
      root.removeAttribute(HEAD_NODE_MARK);
      root.querySelectorAll('[data-bb-hover]').forEach((n) => n.removeAttribute('data-bb-hover'));
      root.querySelectorAll('[data-bb-selected]').forEach((n) => n.removeAttribute('data-bb-selected'));
      root.querySelectorAll('[data-bb-editing]').forEach((n) => n.removeAttribute('data-bb-editing'));
      root.querySelectorAll('[data-bb-moving]').forEach((n) => n.removeAttribute('data-bb-moving'));
      root.querySelectorAll('[data-bb-builder-local]').forEach((n) => n.removeAttribute('data-bb-builder-local'));
      root.querySelectorAll('[data-bb-builder-group]').forEach((n) => n.removeAttribute('data-bb-builder-group'));
      root.querySelectorAll('[data-bb-builder-global]').forEach((n) => n.removeAttribute('data-bb-builder-global'));
      root.querySelectorAll(`[${HEAD_NODE_MARK}]`).forEach((n) => n.removeAttribute(HEAD_NODE_MARK));
      root.querySelectorAll('[contenteditable]').forEach((n) => n.removeAttribute('contenteditable'));
    };

    const headParts: string[] = [];
    Array.from(shadow.childNodes).forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      if (el.tagName === 'STYLE' && el.hasAttribute(EDITOR_STYLE_MARK)) return;
      if (el.tagName === 'STYLE' && el.hasAttribute(SURFACE_STYLE_MARK)) return;
      if (!el.hasAttribute(HEAD_NODE_MARK)) return;
      const clone = el.cloneNode(true) as HTMLElement;
      stripEditorCruft(clone);
      headParts.push(clone.outerHTML);
    });

    if (!headParts.some((part) => /meta\s+charset=/i.test(part))) {
      headParts.unshift('<meta charset="utf-8">');
    }
    if (!headParts.some((part) => /name="viewport"/i.test(part))) {
      headParts.unshift('<meta name="viewport" content="width=1000, initial-scale=1">');
    }

    const bodyShell = shadow.querySelector('body[data-bb-import-body]') as HTMLBodyElement | null;
    let bodyAttrs = '';
    let bodyHtml = '';

    if (bodyShell) {
      const clone = bodyShell.cloneNode(true) as HTMLBodyElement;
      stripEditorCruft(clone);
      clone.removeAttribute('data-bb-import-body');
      bodyAttrs = Array.from(clone.attributes)
        .map((a) => `${a.name}="${a.value.replace(/"/g, '&quot;')}"`)
        .join(' ');
      bodyHtml = clone.innerHTML;
    }

    const newHtml = `<!doctype html>
<html>
<head>${headParts.join('')}</head>
<body${bodyAttrs ? ` ${bodyAttrs}` : ''}>${bodyHtml}</body>
</html>`;

    if (newHtml !== lastCommittedHtml.current) {
      lastCommittedHtml.current = newHtml;
      onCommit(newHtml);
      emitTree();
    }
  }, [onCommit, emitTree]);

  /**
   * Request a layout resync (tree + content height + selection rects) after the
   * browser has had a chance to reflow. Timers are tracked so they cannot fire
   * after unmount or after the canvas was rebuilt for another profile.
   */
  const scheduleAssetResync = useCallback(
    (prevScroll?: { x: number; y: number }) => {
      const run = () => {
        requestAnimationFrame(() => {
          if (!isMountedRef.current) return;
          const host = hostRef.current;
          if (host && prevScroll) {
            host.scrollLeft = prevScroll.x;
            host.scrollTop = prevScroll.y;
          }
          emitTree();
          measureContentBottom();
          recomputeSelectionRect();
        });
      };

      const clearScheduled = () => {
        resyncTimersRef.current.forEach((timer) => window.clearTimeout(timer));
        resyncTimersRef.current = [];
        debounceTimerRef.current = null;
      };

      if (prevScroll) {
        // After a (re)build: restore scroll now, then re-measure as linked CSS,
        // images and webfonts settle. Any stale timer from the previous build is
        // dropped so timers cannot accumulate.
        clearScheduled();
        run();
        [150, 600, 1200].forEach((delay) => {
          const id = window.setTimeout(() => {
            resyncTimersRef.current = resyncTimersRef.current.filter((t) => t !== id);
            run();
          }, delay);
          resyncTimersRef.current.push(id);
        });
        return;
      }

      // Steady state (ResizeObserver bursts / asset events): collapse to one
      // deferred pass instead of one per event.
      if (debounceTimerRef.current !== null) return;
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        run();
      }, 80);
    },
    [emitTree, measureContentBottom, recomputeSelectionRect]
  );

  // ---- Shadow DOM lifecycle -----------------------------------------------

  // Track mount state + release deferred resync timers when the canvas goes away.
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      resyncTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      resyncTimersRef.current = [];
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!hostRef.current) return;

    // Attach shadow only once
    if (!shadowRef.current) {
      shadowRef.current = hostRef.current.attachShadow({ mode: 'open' });
    }
    const shadow = shadowRef.current;

    // Skip rebuild if this is our own committed HTML
    if (profile.rawHtml === lastCommittedHtml.current) return;

    // Extract body from rawHtml. We preserve the body element itself in
    // the shadow DOM so imported `body { background: ... }` CSS keeps
    // working in Editable Canvas, not just in the iframe preview.
    const rawHtml = profile.rawHtml || '';
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, 'text/html');
    const sourceBody = doc.body;
    const bodyContent = sourceBody?.innerHTML || '';

    // Preserve scroll position across rebuilds
    const prevScroll = { x: hostRef.current.scrollLeft, y: hostRef.current.scrollTop };

    // Build shadow content by preserving original head node order as closely
    // as possible. Complex Gaia layouts depend heavily on stylesheet order.
    shadow.innerHTML = '';

    // Scraped background (often a CSS `background:` rule rather than an <img>)
    // is applied as a base layer so it always renders, even if the original
    // selector cannot match inside this shadow root.
    const surfaceCss = buildSurfaceFallbackCss(settings);
    if (surfaceCss) {
      const surfaceStyle = document.createElement('style');
      surfaceStyle.setAttribute(SURFACE_STYLE_MARK, '');
      surfaceStyle.textContent = surfaceCss;
      shadow.appendChild(surfaceStyle);
    }

    const stylesheetLinks: HTMLLinkElement[] = [];
    Array.from(doc.head?.childNodes || []).forEach((node) => {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as HTMLElement;
      if (el.tagName === 'SCRIPT') return;

      const clone = el.cloneNode(true) as HTMLElement;
      clone.setAttribute(HEAD_NODE_MARK, '');

      if (clone.tagName === 'STYLE') {
        clone.textContent = adaptImportedCssForShadow(clone.textContent || '');
      }
      if (clone.tagName === 'LINK' && (clone as HTMLLinkElement).rel === 'stylesheet') {
        stylesheetLinks.push(clone as HTMLLinkElement);
      }
      shadow.appendChild(clone);
    });

    // Editor chrome styles must come after imported styles so outlines are visible.
    const editorStyle = document.createElement('style');
    editorStyle.setAttribute(EDITOR_STYLE_MARK, '');
    editorStyle.textContent = EDITOR_CSS;
    shadow.appendChild(editorStyle);

    // Fallback adapted CSS only if there were no head style/link nodes at all.
    if (!shadow.querySelector(`[${HEAD_NODE_MARK}]`)) {
      const fallbackStyle = document.createElement('style');
      fallbackStyle.setAttribute(HEAD_NODE_MARK, '');
      fallbackStyle.textContent = adaptImportedCssForShadow(profile.rawCss || '');
      shadow.appendChild(fallbackStyle);
    }

    const bodyShell = document.createElement('body');
    bodyShell.setAttribute('data-bb-import-body', '');
    if (sourceBody) {
      Array.from(sourceBody.attributes).forEach((attr) => {
        bodyShell.setAttribute(attr.name, attr.value);
      });
    }
    bodyShell.innerHTML = bodyContent;
    shadow.appendChild(bodyShell);
    ensureBbIds(bodyShell);

    lastCommittedHtml.current = rawHtml;
    lastTreeSignature.current = '';
    scheduleAssetResync(prevScroll);
  }, [profile.rawHtml, profile.rawCss, scheduleAssetResync]);

  /**
   * Re-measure after async assets settle (linked CSS, image decode, fonts) and
   * on layout changes inside #columns. Complex imported profiles depend on all
   * of them. Owns its listeners so a rebuild cannot leave them dangling, and
   * clears its timers on unmount.
   */
  useEffect(() => {
    const shadow = shadowRef.current;
    if (!shadow) return;
    const bodyShell = shadow.querySelector('body[data-bb-import-body]') as HTMLElement | null;
    if (!bodyShell) return;

    const sync = () => scheduleAssetResync();
    const stylesheetLinks = Array.from(shadow.querySelectorAll(`link[rel="stylesheet"]`));
    stylesheetLinks.forEach((link) => {
      link.addEventListener('load', sync);
      link.addEventListener('error', sync);
    });

    const images = Array.from(bodyShell.querySelectorAll('img'));
    images.forEach((img) => {
      img.addEventListener('load', sync);
      img.addEventListener('error', sync);
    });

    const columnsObserver = new ResizeObserver(sync);
    const observedColumns = bodyShell.querySelector('#columns') as HTMLElement | null;
    if (observedColumns) {
      columnsObserver.observe(observedColumns);
      observedColumns
        .querySelectorAll('.column')
        .forEach((col) => columnsObserver.observe(col as Element));
    }

    sync();

    return () => {
      stylesheetLinks.forEach((link) => {
        link.removeEventListener('load', sync);
        link.removeEventListener('error', sync);
      });
      images.forEach((img) => {
        img.removeEventListener('load', sync);
        img.removeEventListener('error', sync);
      });
      columnsObserver.disconnect();
    };
  }, [profile.rawHtml, profile.rawCss, scheduleAssetResync]);

  // ---- Event handlers on the shadow root ----------------------------------

  useEffect(() => {
    const shadow = shadowRef.current;
    if (!shadow) return;

    const findBbTarget = (e: Event, mode: 'component' | 'deep' = selectionMode): HTMLElement | null => {
      const path = e.composedPath();
      let deepest: HTMLElement | null = null;
      for (const n of path) {
        if (n instanceof HTMLElement && n.hasAttribute('data-bb-id')) {
          deepest = n;
          break;
        }
        if (n === shadow) break;
      }
      if (!deepest) return null;
      // Alt forces deep selection. Shift is reserved for multi-select and should
      // still honor component-mode root selection.
      if (mode === 'deep' || (e instanceof MouseEvent && e.altKey)) return deepest;

      // Component mode: if a click lands inside a grouped component, select the
      // group wrapper first. Otherwise, if it lands inside a dedicated Gaia panel,
      // select the panel root instead of a child. Hold Alt or use the Tree view
      // to inspect children directly.
      const group = getGroupWrapper(deepest);
      if (group && group.hasAttribute('data-bb-id')) return group;
      const root = getComponentRoot(deepest);
      return root && root.hasAttribute('data-bb-id') ? root : deepest;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || editingBbId) return;
      const path = e.composedPath();
      const deepest = path.find(
        (n) => n instanceof HTMLElement && n.hasAttribute('data-bb-id')
      ) as HTMLElement | undefined;
      if (!deepest) return;

      const root = getComponentRoot(deepest);
      const shouldMoveComponent =
        root && root.hasAttribute('data-bb-id') && !e.altKey && !e.shiftKey;

      if (!shouldMoveComponent) return;

      const rootId = root.getAttribute('data-bb-id');
      if (!rootId) return;
      e.preventDefault();
      e.stopPropagation();
      setContextMenu(null);
      setSelectedBbId(rootId);
      startMoveElement(rootId, e.clientX, e.clientY);
    };

    const onClick = (e: MouseEvent) => {
      if (suppressNextClickRef.current) {
        e.preventDefault();
        e.stopPropagation();
        suppressNextClickRef.current = false;
        return;
      }
      setContextMenu(null);
      // Prevent link navigation
      const link = e.composedPath().find((n) => n instanceof HTMLElement && n.tagName === 'A') as
        | HTMLAnchorElement
        | undefined;
      if (link) {
        e.preventDefault();
      }

      const target = findBbTarget(e);
      if (!target) {
        setSelectedBbId(null);
        setSelectedBbIds(new Set());
        setEditingBbId(null);
        return;
      }
      // If in editing mode and click is inside the editing node, let native editing take over
      if (editingBbId && target.closest(`[data-bb-id="${CSS.escape(editingBbId)}"]`)) return;

      const bbId = target.getAttribute('data-bb-id');
      if (e.shiftKey && bbId) {
        // Shift+Click: toggle this node in/out of the multi-selection
        setSelectedBbIds((prev) => {
          const next = new Set(prev);
          if (selectedBbId) next.add(selectedBbId);
          if (next.has(bbId)) next.delete(bbId);
          else next.add(bbId);
          return next;
        });
        setSelectedBbId(bbId);
      } else {
        // Normal click: if this is a group wrapper, restore its member selection.
        const groupMembers = target.hasAttribute('data-bb-group') ? getGroupMemberIds(target) : new Set<string>();
        setSelectedBbIds(groupMembers);
        setEditingBbId(null);
        setSelectedBbId(bbId);
      }
      e.stopPropagation();
    };

    const onDblClick = (e: MouseEvent) => {
      const target = findBbTarget(e, 'deep');
      if (!target) return;
      const bbId = target.getAttribute('data-bb-id');
      if (!bbId) return;
      // Only allow inline editing for text-leaf elements
      const hasElementChildren = Array.from(target.children).length > 0;
      if (!hasElementChildren) {
        setSelectedBbId(bbId);
        setEditingBbId(bbId);
        e.stopPropagation();
        e.preventDefault();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      const target = findBbTarget(e);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      const bbId = target.getAttribute('data-bb-id');
      if (!bbId) return;
      const groupMembers = target.hasAttribute('data-bb-group') ? getGroupMemberIds(target) : new Set<string>();
      setEditingBbId(null);
      setSelectedBbIds(groupMembers);
      setSelectedBbId(bbId);
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        bbId,
        tag: target.tagName.toLowerCase(),
        semanticRole: getSemanticRole(target),
        isTextLeaf: Array.from(target.children).length === 0,
      });
    };

    const onInput = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.hasAttribute('data-bb-editing')) return;
      commitToProfile();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && contextMenu) {
        setContextMenu(null);
        e.preventDefault();
        return;
      }
      if (e.key === 'Escape' && editingBbId) {
        setEditingBbId(null);
        e.preventDefault();
      }
    };

    const shadowNode = shadow as unknown as EventTarget;
    shadowNode.addEventListener('pointerdown', onPointerDown as EventListener, true);
    shadowNode.addEventListener('click', onClick as EventListener, true);
    shadowNode.addEventListener('dblclick', onDblClick as EventListener, true);
    shadowNode.addEventListener('contextmenu', onContextMenu as EventListener, true);
    shadowNode.addEventListener('input', onInput as EventListener, true);
    shadowNode.addEventListener('keydown', onKeyDown as EventListener, true);

    return () => {
      shadowNode.removeEventListener('pointerdown', onPointerDown as EventListener, true);
      shadowNode.removeEventListener('click', onClick as EventListener, true);
      shadowNode.removeEventListener('dblclick', onDblClick as EventListener, true);
      shadowNode.removeEventListener('contextmenu', onContextMenu as EventListener, true);
      shadowNode.removeEventListener('input', onInput as EventListener, true);
      shadowNode.removeEventListener('keydown', onKeyDown as EventListener, true);
    };
  }, [editingBbId, contextMenu, selectionMode, commitToProfile]);

  useEffect(() => {
    if (!moveAction) return;

    const previousDocUserSelect = document.documentElement.style.userSelect;
    const previousBodyUserSelect = document.body.style.userSelect;
    document.documentElement.style.userSelect = 'none';
    document.body.style.userSelect = 'none';
    window.getSelection()?.removeAllRanges();

    const onPointerMove = (e: PointerEvent) => {
      const el = findElementByBbId(moveAction.bbId);
      if (!el) return;
      const dx = e.clientX - moveAction.startX;
      const dy = e.clientY - moveAction.startY;
      if (!moveAction.hasMovedPastThreshold && Math.hypot(dx, dy) < 4) return;
      moveAction.hasMovedPastThreshold = true;
      el.setAttribute('data-bb-moving', '');
      window.getSelection()?.removeAllRanges();
      relocateComponentByPointer(moveAction.bbId, e.clientX, e.clientY);
      recomputeSelectionRect();
    };

    const onPointerUp = (e: PointerEvent) => {
      const el = findElementByBbId(moveAction.bbId);
      el?.removeAttribute('data-bb-moving');
      document.documentElement.style.userSelect = previousDocUserSelect;
      document.body.style.userSelect = previousBodyUserSelect;
      setMoveAction(null);
      if (moveAction.hasMovedPastThreshold) {
        relocateComponentByPointer(moveAction.bbId, e.clientX, e.clientY);
        suppressNextClickRef.current = true;
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 0);
        commitToProfile();
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
    return () => {
      document.documentElement.style.userSelect = previousDocUserSelect;
      document.body.style.userSelect = previousBodyUserSelect;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [moveAction, findElementByBbId, recomputeSelectionRect, commitToProfile]);

  // Keep selection rect updated on scroll/resize
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const handler = () => recomputeSelectionRect();
    host.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      host.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, [recomputeSelectionRect]);

  // Poll for size changes on the selected element (handles style edits, animations, etc.)
  // `recomputeSelectionRect` only commits state when a rect actually moved, and
  // the loop parks itself while the tab is hidden.
  useEffect(() => {
    if (!selectedBbId) return;
    let raf = 0;
    const tick = () => {
      // Pause while the tab is actually hidden; 'prerender' (and any other
      // non-visible state that still reports layout) stays live.
      if (document.visibilityState !== 'hidden') recomputeSelectionRect();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selectedBbId, recomputeSelectionRect]);

  // ---- Imperative API exposed to parent ----------------------------------

  useImperativeHandle(
    ref,
    () => ({
      groupSelected() {
        const shadow = shadowRef.current;
        const allIds = new Set([...(selectedBbId ? [selectedBbId] : []), ...selectedBbIds]);
        if (!shadow || allIds.size < 2) return null;
        const members = Array.from(allIds)
          .map((id) => findElementByBbId(id))
          .filter((el): el is HTMLElement => !!el && !!el.parentNode);
        if (members.length < 2) return null;

        const stamp = Date.now();
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-bb-group', stamp.toString());
        wrapper.setAttribute('data-bb-id', `bb-group-${stamp}`);
        wrapper.style.cssText = 'display: contents;';

        // Insert wrapper before the first member in DOM order
        const sortedByDomOrder = [...members].sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
        );
        sortedByDomOrder[0].parentNode!.insertBefore(wrapper, sortedByDomOrder[0]);
        sortedByDomOrder.forEach((el) => {
          el.setAttribute('data-bb-in-group', `bb-group-${stamp}`);
          wrapper.appendChild(el);
        });

        commitToProfile();
        setSelectedBbIds(new Set(Array.from(allIds)));
        setSelectedBbId(`bb-group-${stamp}`);
        emitTree();
        return `bb-group-${stamp}`;
      },
      ungroupSelected() {
        const shadow = shadowRef.current;
        if (!shadow) return;
        const groups = Array.from(shadow.querySelectorAll('[data-bb-group]')) as HTMLElement[];
        groups.forEach((group) => {
          if (!group.parentNode) return;
          Array.from(group.children).forEach((child) => {
            (child as HTMLElement).removeAttribute('data-bb-in-group');
            group.parentNode!.insertBefore(child, group);
          });
          group.parentNode!.removeChild(group);
        });
        commitToProfile();
        setSelectedBbIds(new Set());
        setSelectedBbId(null);
        emitTree();
      },
      applyStyleToGroup(groupBbId: string, styleAttr: string) {
        const shadow = shadowRef.current;
        if (!shadow || !styleAttr.trim()) return;
        const groupEl = findElementByBbId(groupBbId);
        const explicitGroupId = groupEl?.getAttribute('data-bb-group');
        const inheritedGroupId = groupEl?.getAttribute('data-bb-in-group');

        let targets: HTMLElement[] = [];

        const targetGroupId = explicitGroupId || inheritedGroupId;
        if (targetGroupId) {
          targets = Array.from(
            shadow.querySelectorAll(`[data-bb-in-group="${CSS.escape(targetGroupId)}"]`)
          ) as HTMLElement[];
        }

        if (targets.length === 0) {
          const allIds = new Set([...(selectedBbId ? [selectedBbId] : []), ...selectedBbIds]);
          targets = Array.from(allIds)
            .map((id) => findElementByBbId(id))
            .filter((el): el is HTMLElement => !!el);
        }

        if (targets.length === 0 && groupEl) {
          targets = [groupEl];
        }

        targets.forEach((el) => {
          const existing = el.getAttribute('style') || '';
          const joined = existing.trim() ? `${existing.replace(/;\s*$/, '')}; ${styleAttr}` : styleAttr;
          el.setAttribute('style', joined);
          el.setAttribute('data-bb-builder-group', '');
        });
        commitToProfile();
        refreshAfterMutation(groupBbId);
      },
      getNodeInfo(bbId: string) {
        const el = findElementByBbId(bbId);
        return el ? nodeInfoFromElement(el) : null;
      },
      selectNode(bbId: string) {
        const el = findElementByBbId(bbId);
        if (!el) return;
        const groupMembers = el.hasAttribute('data-bb-group') ? getGroupMemberIds(el) : new Set<string>();
        setEditingBbId(null);
        setSelectedBbIds(groupMembers);
        setSelectedBbId(bbId);
        requestAnimationFrame(() => {
          el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        });
      },
      editNodeText(bbId: string) {
        const el = findElementByBbId(bbId);
        if (!el || Array.from(el.children).length > 0) return;
        setSelectedBbIds(new Set());
        setSelectedBbId(bbId);
        setEditingBbId(bbId);
      },
      selectCommentsPanel(bbId?: string) {
        const start = bbId ? findElementByBbId(bbId) : null;
        const panel = findCommentsPanel(start);
        if (!panel) return;
        const id = panel.getAttribute('data-bb-id');
        if (id) {
          setEditingBbId(null);
          setSelectedBbId(id);
          panel.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        }
      },
      addComment(bbId?: string) {
        const start = bbId ? findElementByBbId(bbId) : null;
        const panel = findCommentsPanel(start);
        if (!panel) return;
        let list = panel.querySelector('dl.style1') as HTMLElement | null;
        if (!list) {
          list = document.createElement('dl');
          list.className = 'style1';
          list.setAttribute('data-bb-id', `bb-comments-list-${Date.now()}`);
          panel.appendChild(list);
        }
        const { dt, dd } = makeSampleCommentPair();
        list.appendChild(dt);
        list.appendChild(dd);
        commitToProfile();
        setSelectedBbId(dd.getAttribute('data-bb-id'));
      },
      deleteCommentThread(bbId: string) {
        const { dt, dd } = findCommentPair(bbId);
        const fallback = findElementByBbId(bbId);
        dt?.remove();
        dd?.remove();
        if (!dt && !dd) fallback?.remove();
        setSelectedBbId(null);
        setEditingBbId(null);
        commitToProfile();
      },
      selectWishlistPanel(bbId?: string) {
        const start = bbId ? findElementByBbId(bbId) : null;
        const panel = findWishlistPanel(start);
        if (!panel) return;
        const id = panel.getAttribute('data-bb-id');
        if (id) {
          setEditingBbId(null);
          setSelectedBbId(id);
          panel.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        }
      },
      addWishlistItem(bbId?: string) {
        const start = bbId ? findElementByBbId(bbId) : null;
        const panel = findWishlistPanel(start);
        if (!panel) return;
        const item = makeSampleWishlistItem();
        panel.appendChild(item);
        commitToProfile();
        setSelectedBbId(item.getAttribute('data-bb-id'));
      },
      deleteWishlistItem(bbId: string) {
        const item = findWishlistItem(bbId);
        if (!item) return;
        item.remove();
        setSelectedBbId(null);
        setEditingBbId(null);
        commitToProfile();
      },
      addDedicatedComponent(kind: ImportedDedicatedComponentKind) {
        const parent = getDefaultInsertionParent();
        if (!parent) return;
        const component = makeDedicatedComponent(kind);
        parent.appendChild(component);
        commitToProfile();
        setEditingBbId(null);
        setSelectedBbId(component.getAttribute('data-bb-id'));
        requestAnimationFrame(() => {
          component.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        });
      },
      addJournalEntry(bbId?: string) {
        const panel = findJournalPanel(bbId ? findElementByBbId(bbId) : null);
        if (!panel) return;
        let list = panel.querySelector('#entries') as HTMLElement | null;
        if (!list) {
          list = document.createElement('ul');
          list.id = 'entries';
          list.setAttribute('data-bb-id', `bb-journal-entries-${Date.now()}`);
          panel.appendChild(list);
        }
        const entry = makeSampleJournalEntry();
        list.appendChild(entry);
        commitToProfile();
        setSelectedBbId(entry.getAttribute('data-bb-id'));
      },
      deleteJournalEntry(bbId: string) {
        const entry = findJournalEntry(bbId);
        entry?.remove();
        setSelectedBbId(null);
        setEditingBbId(null);
        commitToProfile();
      },
      addFriend(bbId?: string) {
        const panel = findFriendsPanel(bbId ? findElementByBbId(bbId) : null);
        if (!panel) return;
        let list = panel.querySelector('ul.style2') as HTMLElement | null;
        if (!list) {
          list = document.createElement('ul');
          list.className = 'style2';
          list.setAttribute('data-bb-id', `bb-friends-list-${Date.now()}`);
          panel.appendChild(list);
        }
        const friend = makeSampleFriend();
        list.appendChild(friend);
        commitToProfile();
        setSelectedBbId(friend.getAttribute('data-bb-id'));
      },
      deleteFriend(bbId: string) {
        const friend = findFriendItem(bbId);
        friend?.remove();
        setSelectedBbId(null);
        setEditingBbId(null);
        commitToProfile();
      },
      addEquipmentItem(bbId?: string) {
        const panel = findEquipmentPanel(bbId ? findElementByBbId(bbId) : null);
        if (!panel) return;
        const clear = panel.querySelector('.clear');
        const item = makeSampleEquipmentItem();
        if (clear) panel.insertBefore(item, clear);
        else panel.appendChild(item);
        commitToProfile();
        setSelectedBbId(item.getAttribute('data-bb-id'));
      },
      deleteEquipmentItem(bbId: string) {
        const item = findEquipmentItem(bbId);
        item?.remove();
        setSelectedBbId(null);
        setEditingBbId(null);
        commitToProfile();
      },
      addContactAction(bbId?: string) {
        const panel = findContactPanel(bbId ? findElementByBbId(bbId) : null);
        if (!panel) return;
        let list = panel.querySelector('ul') as HTMLElement | null;
        if (!list) {
          list = document.createElement('ul');
          list.setAttribute('data-bb-id', `bb-contact-list-${Date.now()}`);
          panel.appendChild(list);
        }
        const action = makeSampleContactAction();
        list.appendChild(action);
        commitToProfile();
        setSelectedBbId(action.getAttribute('data-bb-id'));
      },
      deleteContactAction(bbId: string) {
        const action = findContactAction(bbId);
        action?.remove();
        setSelectedBbId(null);
        setEditingBbId(null);
        commitToProfile();
      },
      addFootprint(bbId?: string) {
        const panel = findFootprintsPanel(bbId ? findElementByBbId(bbId) : null);
        if (!panel) return;
        const clear = panel.querySelector('.clear');
        const item = makeSampleFootprint();
        if (clear) panel.insertBefore(item, clear);
        else panel.appendChild(item);
        commitToProfile();
        setSelectedBbId(item.getAttribute('data-bb-id'));
      },
      deleteFootprint(bbId: string) {
        const item = findFootprintItem(bbId);
        item?.remove();
        setSelectedBbId(null);
        setEditingBbId(null);
        commitToProfile();
      },
      addBadge(bbId?: string) {
        const panel = findBadgesPanel(bbId ? findElementByBbId(bbId) : null);
        if (!panel) return;
        let list = panel.querySelector('#badges') as HTMLElement | null;
        if (!list) {
          list = document.createElement('ul');
          list.id = 'badges';
          list.setAttribute('data-bb-id', `bb-badges-list-${Date.now()}`);
          panel.insertBefore(list, panel.querySelector('#badge_display'));
        }
        const badge = makeSampleBadge();
        list.appendChild(badge);
        commitToProfile();
        setSelectedBbId(badge.getAttribute('data-bb-id'));
      },
      deleteBadge(bbId: string) {
        const badge = findBadgeItem(bbId);
        badge?.remove();
        setSelectedBbId(null);
        setEditingBbId(null);
        commitToProfile();
      },
      updateStyle(bbId: string, styleAttr: string) {
        const el = findElementByBbId(bbId);
        if (!el) return;
        if (styleAttr.trim()) {
          el.setAttribute('style', styleAttr);
          const globalRoot = shadowRef.current?.querySelector('body[data-bb-import-body]') as HTMLElement | null;
          if (globalRoot && el === globalRoot) el.setAttribute('data-bb-builder-global', '');
          else el.setAttribute('data-bb-builder-local', '');
        } else {
          el.removeAttribute('style');
          el.removeAttribute('data-bb-builder-local');
          el.removeAttribute('data-bb-builder-global');
        }
        commitToProfile();
        refreshAfterMutation(bbId);
      },
      applyStyleToChildren(bbId: string, selector: string, styleAttr: string) {
        const el = findElementByBbId(bbId);
        if (!el || !selector.trim() || !styleAttr.trim()) return 0;
        let matches: HTMLElement[] = [];
        try {
          matches = Array.from(el.querySelectorAll(selector.trim())).filter(
            (node): node is HTMLElement => node instanceof HTMLElement
          );
        } catch {
          return 0;
        }
        matches.forEach((child) => {
          const existing = child.getAttribute('style') || '';
          const joined = existing.trim()
            ? `${existing.replace(/;\s*$/, '')}; ${styleAttr}`
            : styleAttr;
          child.setAttribute('style', joined);
          child.setAttribute('data-bb-builder-local', '');
        });
        commitToProfile();
        refreshAfterMutation(bbId);
        return matches.length;
      },
      updateText(bbId: string, text: string) {
        const el = findElementByBbId(bbId);
        if (!el) return;
        // Only replace text if this is a text-leaf (no element children)
        if (Array.from(el.children).length === 0) {
          el.textContent = text;
          commitToProfile();
          refreshAfterMutation(bbId);
        }
      },
      updateClassName(bbId: string, className: string) {
        const el = findElementByBbId(bbId);
        if (!el) return;
        if (className.trim()) el.setAttribute('class', className);
        else el.removeAttribute('class');
        commitToProfile();
        refreshAfterMutation(bbId);
      },
      updateAttribute(bbId: string, name: string, value: string) {
        const el = findElementByBbId(bbId);
        if (!el || name.startsWith('data-bb-')) return;
        if (value === '') el.removeAttribute(name);
        else el.setAttribute(name, value);
        commitToProfile();
        refreshAfterMutation(bbId);
      },
      deleteNode(bbId: string) {
        const el = findElementByBbId(bbId);
        if (!el || !el.parentNode) return;
        el.parentNode.removeChild(el);
        if (bbId === selectedBbId) {
          setSelectedBbId(null);
          setEditingBbId(null);
        }
        commitToProfile();
      },
      duplicateNode(bbId: string) {
        const el = findElementByBbId(bbId);
        if (!el || !el.parentNode) return;
        const clone = el.cloneNode(true) as HTMLElement;
        // Give the clone (and its descendants) fresh bb-ids so they can be
        // independently selected/edited.
        const nextId = () => `bb-clone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        clone.setAttribute('data-bb-id', nextId());
        clone.querySelectorAll('[data-bb-id]').forEach((n) => n.setAttribute('data-bb-id', nextId()));
        el.parentNode.insertBefore(clone, el.nextSibling);
        commitToProfile();
        setSelectedBbId(clone.getAttribute('data-bb-id'));
      },
      selectParent(bbId: string) {
        const el = findElementByBbId(bbId);
        if (!el) return;
        const parent = el.parentElement;
        if (parent && parent.hasAttribute('data-bb-id')) {
          setSelectedBbId(parent.getAttribute('data-bb-id'));
        }
      },
      clearSelection() {
        setSelectedBbId(null);
        setEditingBbId(null);
      },
    }),
    [findElementByBbId, commitToProfile, selectedBbId, onSelectNode]
  );

  // ---- Render --------------------------------------------------------------

  const hasElements = (profile.rawHtml || '').length > 0;
  const committedSize = { width: settings.width || 1000, height: settings.height || 720 };
  const isMobileViewport = committedSize.width <= 480;
  const layoutWidth = isMobileViewport ? 1000 : committedSize.width;
  const mobileFitScale = isMobileViewport ? committedSize.width / layoutWidth : 1;
  const contentScale = mobileFitScale * zoom;
  const actualContentHeight = contentBottomHeight || committedSize.height;
  const visibleHeight = Math.min(committedSize.height, actualContentHeight);
  const hostHeight = isMobileViewport ? visibleHeight / mobileFitScale : visibleHeight;

  return (
    <div className="relative flex-1 h-full w-full overflow-auto bg-[#07090e] p-0 flex flex-col">
      {/* Shadow DOM host + overlay layer share the same containing block */}
      <div
        ref={overlayContainerRef}
        className="relative mx-auto rounded-2xl border border-slate-800 bg-white shadow-2xl overflow-visible transition-[width,height] duration-200"
        style={{
          width: `${Math.max(1, layoutWidth * contentScale)}px`,
          height: `${Math.max(1, visibleHeight * zoom)}px`,
          // Scraped surface (usually a CSS background, not an <img>) as a
          // fallback behind the shadow DOM content.
          backgroundColor: settings.backgroundColor || (settings.backgroundImage ? 'transparent' : undefined),
          backgroundImage: settings.backgroundImage
            ? `url('${settings.backgroundImage}')`
            : undefined,
          backgroundRepeat: settings.backgroundRepeat || 'no-repeat',
          backgroundSize: settings.backgroundSize || 'cover',
          backgroundPosition: settings.backgroundPosition || 'center top',
          backgroundAttachment: settings.backgroundAttachment || 'scroll',
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes('application/imported-dedicated-kind')) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }
        }}
        onDrop={(e) => {
          const kind = e.dataTransfer.getData('application/imported-dedicated-kind') as ImportedDedicatedComponentKind;
          if (!kind) return;
          e.preventDefault();
          insertDedicatedComponentAtPointer(kind, e.clientX, e.clientY);
        }}
      >
        {draftSize && (
          <div
            className="pointer-events-none absolute left-0 top-0 z-[60] rounded-xl border-2 border-blue-400 bg-blue-500/10 shadow-[0_0_0_9999px_rgba(59,130,246,0.05)]"
            style={{
              width: `${Math.max(1, (draftSize.width <= 480 ? 1000 : draftSize.width) * (draftSize.width <= 480 ? draftSize.width / 1000 : 1) * zoom)}px`,
              height: `${Math.max(1, Math.min(draftSize.height, actualContentHeight) * zoom)}px`,
            }}
          >
            <div className="absolute right-2 top-2 rounded bg-blue-600 px-2 py-0.5 text-[10px] font-mono font-bold text-white shadow">
              {draftSize.width} x {draftSize.height}
            </div>
          </div>
        )}
        {hasElements ? (
          <div
            ref={hostRef}
            className="w-full h-full overflow-auto"
            style={{
              width: `${layoutWidth}px`,
              height: `${hostHeight}px`,
              transform: `scale(${contentScale})`,
              transformOrigin: 'top left',
            }}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('application/imported-dedicated-kind')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDrop={(e) => {
              const kind = e.dataTransfer.getData('application/imported-dedicated-kind') as ImportedDedicatedComponentKind;
              if (!kind) return;
              e.preventDefault();
              insertDedicatedComponentAtPointer(kind, e.clientX, e.clientY);
            }}
          />
        ) : (
          <div className="flex h-full min-h-[400px] items-center justify-center text-slate-400 text-sm p-8 text-center">
            No HTML captured for this profile.
          </div>
        )}

        {/* Selection overlay + toolbar */}
        {multiSelectionRects.map((rect) => (
          <div
            key={rect.bbId}
            className="pointer-events-none absolute border-[3px] border-sky-400 z-40"
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
              boxShadow: '0 0 10px rgba(56, 189, 248, 0.45)',
            }}
          />
        ))}
        {inspectRect && (
          <div
            className="pointer-events-none absolute border-[3px] border-amber-400 z-40"
            style={{
              left: inspectRect.left,
              top: inspectRect.top,
              width: inspectRect.width,
              height: inspectRect.height,
              boxShadow: '0 0 10px rgba(251, 191, 36, 0.45)',
            }}
          />
        )}
        {selectionRect && selectedBbId && (
          <>
            <div
              className="pointer-events-none absolute border-[3px] border-sky-400 z-40"
              style={{
                left: selectionRect.left,
                top: selectionRect.top,
                width: selectionRect.width,
                height: selectionRect.height,
                boxShadow: '0 0 10px rgba(56, 189, 248, 0.45)',
              }}
            />

            {/* Floating micro-toolbar above (or below if no room) the selection */}
            <div
              className="absolute z-50 flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-900 px-1 py-0.5 text-xs text-slate-200 shadow-2xl animate-in fade-in zoom-in-95"
              style={{
                left: Math.max(4, selectionRect.left),
                top: selectionRect.top > 34 ? selectionRect.top - 32 : selectionRect.top + selectionRect.height + 6,
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="font-mono text-[10px] text-indigo-300 px-1.5">
                {(findElementByBbId(selectedBbId)?.tagName || '').toLowerCase() || 'node'}
              </span>
              <div className="h-3 w-px bg-slate-700" />
              <button
                onPointerDown={(e) => startMoveNode(selectedBbId, e)}
                title="Drag selected node/component"
                className="p-1 rounded text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-grab active:cursor-grabbing"
              >
                <Move className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  const el = findElementByBbId(selectedBbId);
                  if (el && Array.from(el.children).length === 0) setEditingBbId(selectedBbId);
                }}
                title="Edit inline text (double-click)"
                className="p-1 rounded hover:bg-indigo-600 hover:text-white transition-colors disabled:opacity-30"
                disabled={(() => {
                  const el = findElementByBbId(selectedBbId);
                  return !el || Array.from(el.children).length > 0;
                })()}
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  const el = findElementByBbId(selectedBbId);
                  const parent = el?.parentElement;
                  if (parent && parent.hasAttribute('data-bb-id')) {
                    setSelectedBbId(parent.getAttribute('data-bb-id'));
                  }
                }}
                title="Select parent"
                className="p-1 rounded hover:bg-slate-700 transition-colors"
              >
                <ChevronUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  const el = findElementByBbId(selectedBbId);
                  if (!el || !el.parentNode) return;
                  const clone = el.cloneNode(true) as HTMLElement;
                  const nextId = () => `bb-clone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                  clone.setAttribute('data-bb-id', nextId());
                  clone.querySelectorAll('[data-bb-id]').forEach((n) => n.setAttribute('data-bb-id', nextId()));
                  el.parentNode.insertBefore(clone, el.nextSibling);
                  commitToProfile();
                  setSelectedBbId(clone.getAttribute('data-bb-id'));
                }}
                title="Duplicate"
                className="p-1 rounded hover:bg-slate-700 transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  const el = findElementByBbId(selectedBbId);
                  if (!el || !el.parentNode) return;
                  el.parentNode.removeChild(el);
                  setSelectedBbId(null);
                  setEditingBbId(null);
                  commitToProfile();
                }}
                title="Delete"
                className="p-1 rounded text-red-400 hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <div className="h-3 w-px bg-slate-700" />
              {editingBbId === selectedBbId ? (
                <button
                  onClick={() => setEditingBbId(null)}
                  title="Finish editing"
                  className="p-1 rounded text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                >
                  <Check className="w-3 h-3" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedBbId(null);
                    setEditingBbId(null);
                  }}
                  title="Deselect"
                  className="p-1 rounded hover:bg-slate-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </>
        )}

        {/* Right-click context menu for imported DOM nodes */}
        {contextMenu && (
          <div
            className="fixed z-[70] w-60 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 text-xs text-slate-200 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 250),
              top: Math.min(contextMenu.y, window.innerHeight - 300),
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2.5 py-1.5 border-b border-slate-800 mb-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-100">Inspect &lt;{contextMenu.tag}&gt;</span>
                <span className="font-mono text-[10px] text-indigo-300">{contextMenu.bbId}</span>
              </div>
              {contextMenu.semanticRole !== 'generic' && (
                <div className="mt-1 inline-flex rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                  {contextMenu.semanticRole}
                </div>
              )}
            </div>

            {/* Group / Ungroup actions – shown when there's a multi-selection or a group is targeted */}
            {(() => {
              const allIds = new Set([...(selectedBbId ? [selectedBbId] : []), ...selectedBbIds]);
              const hasMultiSelect = allIds.size >= 2;
              const isGroupWrapper = !!findElementByBbId(contextMenu.bbId)?.hasAttribute('data-bb-group');
              const inGroup = !!findElementByBbId(contextMenu.bbId)?.getAttribute('data-bb-in-group');
              const shadow = shadowRef.current;
              const hasAnyGroup = !!shadow?.querySelector('[data-bb-group]');
              return (
                <>
                  {hasMultiSelect && (
                    <ContextButton
                      label="Group"
                      icon={<Layers className="w-3.5 h-3.5" />}
                      onClick={() => {
                        const sh = shadowRef.current;
                        if (!sh || allIds.size < 2) return;
                        const members = Array.from(allIds)
                          .map((id) => findElementByBbId(id))
                          .filter((el): el is HTMLElement => !!el && !!el.parentNode);
                        if (members.length < 2) return;
                        const stamp = Date.now();
                        const wrapper = document.createElement('div');
                        wrapper.setAttribute('data-bb-group', stamp.toString());
                        wrapper.setAttribute('data-bb-id', `bb-group-${stamp}`);
                        wrapper.style.cssText = 'display: contents;';
                        const sorted = [...members].sort((a, b) =>
                          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
                        );
                        sorted[0].parentNode!.insertBefore(wrapper, sorted[0]);
                        sorted.forEach((el) => {
                          el.setAttribute('data-bb-in-group', `bb-group-${stamp}`);
                          wrapper.appendChild(el);
                        });
                        commitToProfile();
                        setSelectedBbIds(new Set(Array.from(allIds)));
                        setSelectedBbId(`bb-group-${stamp}`);
                        emitTree();
                        setContextMenu(null);
                      }}
                    />
                  )}
                  {(isGroupWrapper || inGroup || hasAnyGroup) && (
                    <ContextButton
                      label="Ungroup"
                      icon={<Layers className="w-3.5 h-3.5" />}
                      onClick={() => {
                        const sh = shadowRef.current;
                        if (!sh) return;
                        const current = findElementByBbId(contextMenu.bbId);
                        const activeGroupId = current?.getAttribute('data-bb-group') || current?.getAttribute('data-bb-in-group');
                        const groups = activeGroupId
                          ? Array.from(sh.querySelectorAll(`[data-bb-group="${CSS.escape(activeGroupId)}"]`) as NodeListOf<HTMLElement>)
                          : Array.from(sh.querySelectorAll('[data-bb-group]') as NodeListOf<HTMLElement>);
                        groups.forEach((group) => {
                          if (!group.parentNode) return;
                          Array.from(group.children).forEach((child) => {
                            (child as HTMLElement).removeAttribute('data-bb-in-group');
                            group.parentNode!.insertBefore(child, group);
                          });
                          group.parentNode!.removeChild(group);
                        });
                        commitToProfile();
                        setSelectedBbIds(new Set());
                        setSelectedBbId(null);
                        emitTree();
                        setContextMenu(null);
                      }}
                    />
                  )}
                </>
              );
            })()}

            {(() => {
              const currentNode = findElementByBbId(contextMenu.bbId);
              const root = currentNode ? getComponentRoot(currentNode) : null;
              const rootId = root?.getAttribute('data-bb-id');
              const isDifferentRoot = rootId && rootId !== contextMenu.bbId;
              return isDifferentRoot ? (
                <ContextButton
                  label="Select Whole Component"
                  icon={<Wand2 className="w-3.5 h-3.5" />}
                  onClick={() => {
                    setSelectedBbId(rootId || null);
                    setContextMenu(null);
                  }}
                />
              ) : null;
            })()}

            {contextMenu.semanticRole.startsWith('comment') && (
              <ContextButton
                label="Select Comments Panel"
                icon={<Wand2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  const panel = findCommentsPanel(findElementByBbId(contextMenu.bbId));
                  const id = panel?.getAttribute('data-bb-id');
                  if (id) setSelectedBbId(id);
                  setContextMenu(null);
                }}
              />
            )}
            {(contextMenu.semanticRole === 'comments-panel' || contextMenu.semanticRole.startsWith('comment')) && (
              <ContextButton
                label="Add Comment"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => {
                  const panel = findCommentsPanel(findElementByBbId(contextMenu.bbId));
                  if (panel) {
                    let list = panel.querySelector('dl.style1') as HTMLElement | null;
                    if (!list) {
                      list = document.createElement('dl');
                      list.className = 'style1';
                      list.setAttribute('data-bb-id', `bb-comments-list-${Date.now()}`);
                      panel.appendChild(list);
                    }
                    const { dt, dd } = makeSampleCommentPair();
                    list.appendChild(dt);
                    list.appendChild(dd);
                    commitToProfile();
                    setSelectedBbId(dd.getAttribute('data-bb-id'));
                  }
                  setContextMenu(null);
                }}
              />
            )}
            {(contextMenu.semanticRole === 'comment-header' || contextMenu.semanticRole === 'comment-body') && (
              <ContextButton
                label="Delete Whole Comment"
                danger
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  const { dt, dd } = findCommentPair(contextMenu.bbId);
                  dt?.remove();
                  dd?.remove();
                  setSelectedBbId(null);
                  setEditingBbId(null);
                  commitToProfile();
                  setContextMenu(null);
                }}
              />
            )}

            {contextMenu.semanticRole.startsWith('wishlist') && contextMenu.semanticRole !== 'wishlist-panel' && (
              <ContextButton
                label="Select Wishlist Panel"
                icon={<Wand2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  const panel = findWishlistPanel(findElementByBbId(contextMenu.bbId));
                  const id = panel?.getAttribute('data-bb-id');
                  if (id) setSelectedBbId(id);
                  setContextMenu(null);
                }}
              />
            )}
            {contextMenu.semanticRole.startsWith('wishlist') && (
              <ContextButton
                label="Add Wishlist Item"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => {
                  const panel = findWishlistPanel(findElementByBbId(contextMenu.bbId));
                  if (panel) {
                    const item = makeSampleWishlistItem();
                    panel.appendChild(item);
                    commitToProfile();
                    setSelectedBbId(item.getAttribute('data-bb-id'));
                  }
                  setContextMenu(null);
                }}
              />
            )}
            {(contextMenu.semanticRole === 'wishlist-item' ||
              contextMenu.semanticRole === 'wishlist-item-link' ||
              contextMenu.semanticRole === 'wishlist-item-image' ||
              contextMenu.semanticRole === 'wishlist-owner-checkmark') && (
              <ContextButton
                label="Delete Wishlist Item"
                danger
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  const item = findWishlistItem(contextMenu.bbId);
                  item?.remove();
                  setSelectedBbId(null);
                  setEditingBbId(null);
                  commitToProfile();
                  setContextMenu(null);
                }}
              />
            )}

            {contextMenu.semanticRole.startsWith('journal') && (
              <ContextButton
                label="Add Journal Entry"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => {
                  const panel = findJournalPanel(findElementByBbId(contextMenu.bbId));
                  if (panel) {
                    let list = panel.querySelector('#entries') as HTMLElement | null;
                    if (!list) {
                      list = document.createElement('ul');
                      list.id = 'entries';
                      list.setAttribute('data-bb-id', `bb-journal-entries-${Date.now()}`);
                      panel.appendChild(list);
                    }
                    const entry = makeSampleJournalEntry();
                    list.appendChild(entry);
                    commitToProfile();
                    setSelectedBbId(entry.getAttribute('data-bb-id'));
                  }
                  setContextMenu(null);
                }}
              />
            )}
            {(contextMenu.semanticRole === 'journal-entry' || contextMenu.semanticRole === 'journal-entry-link' || contextMenu.semanticRole === 'journal-date') && (
              <ContextButton
                label="Delete Journal Entry"
                danger
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  findJournalEntry(contextMenu.bbId)?.remove();
                  setSelectedBbId(null);
                  setEditingBbId(null);
                  commitToProfile();
                  setContextMenu(null);
                }}
              />
            )}

            {(contextMenu.semanticRole.startsWith('friend') || contextMenu.semanticRole.startsWith('friends')) && (
              <ContextButton
                label="Add Friend"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => {
                  const panel = findFriendsPanel(findElementByBbId(contextMenu.bbId));
                  if (panel) {
                    let list = panel.querySelector('ul.style2') as HTMLElement | null;
                    if (!list) {
                      list = document.createElement('ul');
                      list.className = 'style2';
                      list.setAttribute('data-bb-id', `bb-friends-list-${Date.now()}`);
                      panel.appendChild(list);
                    }
                    const friend = makeSampleFriend();
                    list.appendChild(friend);
                    commitToProfile();
                    setSelectedBbId(friend.getAttribute('data-bb-id'));
                  }
                  setContextMenu(null);
                }}
              />
            )}
            {(contextMenu.semanticRole === 'friend-item' || contextMenu.semanticRole === 'friend-name' || contextMenu.semanticRole === 'friend-link') && (
              <ContextButton
                label="Delete Friend"
                danger
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  findFriendItem(contextMenu.bbId)?.remove();
                  setSelectedBbId(null);
                  setEditingBbId(null);
                  commitToProfile();
                  setContextMenu(null);
                }}
              />
            )}

            {contextMenu.semanticRole.startsWith('equipment') && (
              <ContextButton
                label="Add Equipped Item"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => {
                  const panel = findEquipmentPanel(findElementByBbId(contextMenu.bbId));
                  if (panel) {
                    const clear = panel.querySelector('.clear');
                    const item = makeSampleEquipmentItem();
                    if (clear) panel.insertBefore(item, clear);
                    else panel.appendChild(item);
                    commitToProfile();
                    setSelectedBbId(item.getAttribute('data-bb-id'));
                  }
                  setContextMenu(null);
                }}
              />
            )}
            {(contextMenu.semanticRole === 'equipment-item' || contextMenu.semanticRole === 'equipment-item-link' || contextMenu.semanticRole === 'equipment-item-image' || contextMenu.semanticRole === 'equipment-premium-sparkle') && (
              <ContextButton
                label="Delete Equipped Item"
                danger
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  findEquipmentItem(contextMenu.bbId)?.remove();
                  setSelectedBbId(null);
                  setEditingBbId(null);
                  commitToProfile();
                  setContextMenu(null);
                }}
              />
            )}

            {contextMenu.semanticRole.startsWith('contact') && (
              <ContextButton
                label="Add Contact Action"
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => {
                  const panel = findContactPanel(findElementByBbId(contextMenu.bbId));
                  if (panel) {
                    let list = panel.querySelector('ul') as HTMLElement | null;
                    if (!list) {
                      list = document.createElement('ul');
                      list.setAttribute('data-bb-id', `bb-contact-list-${Date.now()}`);
                      panel.appendChild(list);
                    }
                    const action = makeSampleContactAction();
                    list.appendChild(action);
                    commitToProfile();
                    setSelectedBbId(action.getAttribute('data-bb-id'));
                  }
                  setContextMenu(null);
                }}
              />
            )}
            {(contextMenu.semanticRole === 'contact-action' || contextMenu.semanticRole === 'contact-add-friend' || contextMenu.semanticRole === 'contact-message' || contextMenu.semanticRole === 'contact-trade') && (
              <ContextButton
                label="Delete Contact Action"
                danger
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={() => {
                  findContactAction(contextMenu.bbId)?.remove();
                  setSelectedBbId(null);
                  setEditingBbId(null);
                  commitToProfile();
                  setContextMenu(null);
                }}
              />
            )}

            <ContextButton
              label="Select Parent"
              icon={<ChevronUp className="w-3.5 h-3.5" />}
              onClick={() => {
                const el = findElementByBbId(contextMenu.bbId);
                const parent = el?.parentElement;
                if (parent?.hasAttribute('data-bb-id')) {
                  setSelectedBbId(parent.getAttribute('data-bb-id'));
                }
                setContextMenu(null);
              }}
            />
            <ContextButton
              label="Select First Child"
              icon={<ChevronDown className="w-3.5 h-3.5" />}
              onClick={() => {
                const el = findElementByBbId(contextMenu.bbId);
                const child = Array.from(el?.children || []).find((c) =>
                  c.hasAttribute('data-bb-id')
                ) as HTMLElement | undefined;
                if (child) setSelectedBbId(child.getAttribute('data-bb-id'));
                setContextMenu(null);
              }}
            />
            {contextMenu.isTextLeaf && (
              <ContextButton
                label="Edit Text Inline"
                icon={<Edit3 className="w-3.5 h-3.5" />}
                onClick={() => {
                  setSelectedBbId(contextMenu.bbId);
                  setEditingBbId(contextMenu.bbId);
                  setContextMenu(null);
                }}
              />
            )}
            <ContextButton
              label="Duplicate Node"
              icon={<Copy className="w-3.5 h-3.5" />}
              onClick={() => {
                const el = findElementByBbId(contextMenu.bbId);
                if (el?.parentNode) {
                  const clone = el.cloneNode(true) as HTMLElement;
                  const nextId = () =>
                    `bb-clone-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
                  clone.setAttribute('data-bb-id', nextId());
                  clone
                    .querySelectorAll('[data-bb-id]')
                    .forEach((n) => n.setAttribute('data-bb-id', nextId()));
                  el.parentNode.insertBefore(clone, el.nextSibling);
                  commitToProfile();
                  setSelectedBbId(clone.getAttribute('data-bb-id'));
                }
                setContextMenu(null);
              }}
            />
            <ContextButton
              label="Hide Node"
              icon={<EyeOff className="w-3.5 h-3.5" />}
              onClick={() => {
                const el = findElementByBbId(contextMenu.bbId);
                if (el) {
                  const existing = el.getAttribute('style') || '';
                  el.setAttribute('style', `${existing}; display: none;`);
                  commitToProfile();
                }
                setContextMenu(null);
              }}
            />
            <ContextButton
              label="Copy Outer HTML"
              icon={<FileCode className="w-3.5 h-3.5" />}
              onClick={() => {
                const el = findElementByBbId(contextMenu.bbId);
                if (el) navigator.clipboard.writeText(el.outerHTML);
                setContextMenu(null);
              }}
            />
            <ContextButton
              label="Delete Node"
              danger
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={() => {
                const el = findElementByBbId(contextMenu.bbId);
                if (el?.parentNode) {
                  el.parentNode.removeChild(el);
                  setSelectedBbId(null);
                  setEditingBbId(null);
                  commitToProfile();
                }
                setContextMenu(null);
              }}
            />
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-5xl mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>
          Shadow-DOM rendered · imported CSS scoped ·{' '}
          {selectedBbId ? (
            <span className="text-indigo-400">selected: {selectedBbId}</span>
          ) : (
            'click a node to select'
          )}
        </span>
        <span>
          {profile.rawHtml ? `${(profile.rawHtml.length / 1024).toFixed(1)}KB HTML` : '—'} ·{' '}
          {profile.rawCss ? `${(profile.rawCss.length / 1024).toFixed(1)}KB CSS` : '—'}
        </span>
      </div>
    </div>
  );
});

EditableImportedCanvas.displayName = 'EditableImportedCanvas';

const ContextButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}> = ({ label, icon, onClick, danger = false }) => (
  <button
    onClick={onClick}
    className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
      danger
        ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300'
        : 'text-slate-200 hover:bg-indigo-600 hover:text-white'
    }`}
  >
    <span className={danger ? 'text-red-400' : 'text-indigo-300'}>{icon}</span>
    <span>{label}</span>
  </button>
);
