import React, { useEffect, useMemo, useState } from 'react';
import {
  Eraser,
  Layers,
  Scissors,
  Sparkles,
  ChevronUp,
  Copy,
  MousePointerClick,
  Palette,
  Settings2,
  Tag,
  Trash2,
  Type,
} from 'lucide-react';
import { ImportedNodeInfo } from './EditableImportedCanvas';

interface ImportedNodePropertiesPanelProps {
  /** Number of items in the current multi-selection (including primary). 0 when no extra. */
  multiSelectCount?: number;
  /** Call to apply a style to the whole group via the canvas imperative API */
  onGroupStyle?: (styleAttr: string) => void;
  onGroupSelected?: () => void;
  onUngroupSelected?: () => void;
  /** Fixed-height tree panel shown above the local controls */
  treePanel?: React.ReactNode;
  childTargets?: Array<{ label: string; selector: string }>;
  inspectedNode?: ImportedNodeInfo | null;
  inspectedChildTargets?: Array<{ label: string; selector: string }>;
  node: ImportedNodeInfo | null;
  onUpdateStyle: (bbId: string, styleAttr: string) => void;
  onApplyStyleToChildren: (bbId: string, selector: string, styleAttr: string) => number;
  onUpdateText: (bbId: string, text: string) => void;
  onUpdateClassName: (bbId: string, className: string) => void;
  onUpdateAttribute: (bbId: string, name: string, value: string) => void;
  onDelete: (bbId: string) => void;
  onDuplicate: (bbId: string) => void;
  onSelectParent: (bbId: string) => void;
  onSelectCommentsPanel?: (bbId: string) => void;
  onAddComment?: (bbId: string) => void;
  onDeleteCommentThread?: (bbId: string) => void;
  onSelectWishlistPanel?: (bbId: string) => void;
  onAddWishlistItem?: (bbId: string) => void;
  onDeleteWishlistItem?: (bbId: string) => void;
  onAddJournalEntry?: (bbId: string) => void;
  onDeleteJournalEntry?: (bbId: string) => void;
  onAddFriend?: (bbId: string) => void;
  onDeleteFriend?: (bbId: string) => void;
  onAddEquipmentItem?: (bbId: string) => void;
  onDeleteEquipmentItem?: (bbId: string) => void;
  onAddContactAction?: (bbId: string) => void;
  onDeleteContactAction?: (bbId: string) => void;
  onAddFootprint?: (bbId: string) => void;
  onDeleteFootprint?: (bbId: string) => void;
  onAddBadge?: (bbId: string) => void;
  onDeleteBadge?: (bbId: string) => void;
  /** Jump to another dock tab (clip/mask editor, animation studio). */
  onOpenTab?: (tab: 'shape' | 'animation') => void;
  /** Absolute-plane controls for the selected imported node. */
  onMakeAbsolute?: (bbId: string) => void;
  onMakeFlow?: (bbId: string) => void;
  isAbsolute?: boolean;
  hasEffects?: boolean;
  onClearEffects?: (bbId: string) => void;
}

function parseStyle(style: string): Record<string, string> {
  const out: Record<string, string> = {};
  style.split(';').forEach((decl) => {
    const idx = decl.indexOf(':');
    if (idx === -1) return;
    const key = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (key && value) out[key] = value;
  });
  return out;
}

function stringifyStyle(style: Record<string, string>): string {
  return Object.entries(style)
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

export const ImportedNodePropertiesPanel: React.FC<ImportedNodePropertiesPanelProps> = ({
  node,
  multiSelectCount = 0,
  onGroupStyle,
  onGroupSelected,
  onUngroupSelected,
  treePanel,
  childTargets: childTargetsProp,
  inspectedNode,
  inspectedChildTargets,
  onUpdateStyle,
  onApplyStyleToChildren,
  onUpdateText,
  onUpdateClassName,
  onUpdateAttribute,
  onDelete,
  onDuplicate,
  onSelectParent,
  onSelectCommentsPanel,
  onAddComment,
  onDeleteCommentThread,
  onSelectWishlistPanel,
  onAddWishlistItem,
  onDeleteWishlistItem,
  onAddJournalEntry,
  onDeleteJournalEntry,
  onAddFriend,
  onDeleteFriend,
  onAddEquipmentItem,
  onDeleteEquipmentItem,
  onAddContactAction,
  onDeleteContactAction,
  onAddFootprint,
  onDeleteFootprint,
  onAddBadge,
  onDeleteBadge,
  onOpenTab,
  onMakeAbsolute,
  onMakeFlow,
  isAbsolute = false,
  hasEffects = false,
  onClearEffects,
}) => {
  const [classDraft, setClassDraft] = useState('');
  const [rawStyleDraft, setRawStyleDraft] = useState('');
  const [childTarget, setChildTarget] = useState('h2');
  const [childColor, setChildColor] = useState('#38bdf8');
  const [childFontSize, setChildFontSize] = useState(16);
  const [childBold, setChildBold] = useState(false);
  const [childApplyCount, setChildApplyCount] = useState<number | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [treeOpen, setTreeOpen] = useState(true);

  useEffect(() => {
    if (!node) return;
    setRawStyleDraft(node.inlineStyle);
    setClassDraft(node.className);
    setChildApplyCount(null);
  }, [node?.bbId, node?.inlineStyle, node?.className, node?.text]);

  const childTargets = childTargetsProp || [];

  const componentActions = useMemo(() => {
    if (!node) return [] as Array<{ label: string; action: () => void; danger?: boolean }>;
    const role = node.semanticRole;
    const isComment = role.includes('comment');
    const isWishlist = role.includes('wishlist');
    const isJournal = role.includes('journal');
    const isFriend = role.includes('friend');
    const isEquipment = role.includes('equipment');
    const isContact = role.includes('contact');
    const isFootprint = role.includes('footprints');
    const isBadge = role.includes('badge');

    const actions: Array<{ label: string; action: () => void; danger?: boolean }> = [];
    if (isComment) {
      actions.push({ label: 'Panel', action: () => onSelectCommentsPanel?.(node.bbId) });
      actions.push({ label: 'Add Comment', action: () => onAddComment?.(node.bbId) });
      if (role === 'comment-header' || role === 'comment-body') {
        actions.push({ label: 'Delete Comment', action: () => onDeleteCommentThread?.(node.bbId), danger: true });
      }
    }
    if (isWishlist) {
      actions.push({ label: 'Panel', action: () => onSelectWishlistPanel?.(node.bbId) });
      actions.push({ label: 'Add Item', action: () => onAddWishlistItem?.(node.bbId) });
      if (role !== 'wishlist-panel' && role !== 'wishlist-title') actions.push({ label: 'Delete Item', action: () => onDeleteWishlistItem?.(node.bbId), danger: true });
    }
    if (isJournal) {
      actions.push({ label: 'Add Entry', action: () => onAddJournalEntry?.(node.bbId) });
      if (role.includes('entry') || role === 'journal-date') actions.push({ label: 'Delete Entry', action: () => onDeleteJournalEntry?.(node.bbId), danger: true });
    }
    if (isFriend) {
      actions.push({ label: 'Add Friend', action: () => onAddFriend?.(node.bbId) });
      if (role !== 'friends-panel' && role !== 'friends-title' && role !== 'friends-list') actions.push({ label: 'Delete Friend', action: () => onDeleteFriend?.(node.bbId), danger: true });
    }
    if (isEquipment) {
      actions.push({ label: 'Add Item', action: () => onAddEquipmentItem?.(node.bbId) });
      if (role !== 'equipment-panel' && role !== 'equipment-title') actions.push({ label: 'Delete Item', action: () => onDeleteEquipmentItem?.(node.bbId), danger: true });
    }
    if (isContact) {
      actions.push({ label: 'Add Action', action: () => onAddContactAction?.(node.bbId) });
      if (role !== 'contact-panel' && role !== 'contact-title' && role !== 'contact-list') actions.push({ label: 'Delete Action', action: () => onDeleteContactAction?.(node.bbId), danger: true });
    }
    if (isFootprint) {
      actions.push({ label: 'Add Visitor', action: () => onAddFootprint?.(node.bbId) });
      if (role !== 'footprints-panel' && role !== 'footprints-title') actions.push({ label: 'Delete Visitor', action: () => onDeleteFootprint?.(node.bbId), danger: true });
    }
    if (isBadge) {
      actions.push({ label: 'Add Badge', action: () => onAddBadge?.(node.bbId) });
      if (role !== 'badges-panel' && role !== 'badges-title' && role !== 'badges-list') actions.push({ label: 'Delete Badge', action: () => onDeleteBadge?.(node.bbId), danger: true });
    }
    return actions;
  }, [
    node,
    onAddBadge,
    onAddComment,
    onAddContactAction,
    onAddEquipmentItem,
    onAddFootprint,
    onAddFriend,
    onAddJournalEntry,
    onAddWishlistItem,
    onDeleteBadge,
    onDeleteCommentThread,
    onDeleteContactAction,
    onDeleteEquipmentItem,
    onDeleteFootprint,
    onDeleteFriend,
    onDeleteJournalEntry,
    onDeleteWishlistItem,
    onSelectCommentsPanel,
    onSelectWishlistPanel,
  ]);

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
        <MousePointerClick className="h-8 w-8 text-slate-600 mb-2" />
        <p className="text-xs font-medium text-slate-300">Select something</p>
      </div>
    );
  }



  const applyChildStyle = () => {
    const rules = [`color: ${childColor} !important`, `font-size: ${childFontSize}px !important`];
    if (childBold) rules.push('font-weight: bold !important');
    const count = onApplyStyleToChildren(node.bbId, childTarget, rules.join('; '));
    setChildApplyCount(count);
  };

  return (
    <div className="space-y-3 text-xs text-slate-300">
      {treePanel && (
        <section className="w-full border border-slate-800 bg-slate-950 p-3 space-y-2">
          <button
            onClick={() => setTreeOpen((v) => !v)}
            className="flex w-full items-center justify-between border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] font-semibold text-slate-200"
          >
            <span>Children</span>
            <span className="font-mono text-[10px] text-slate-500">{treeOpen ? 'hide' : 'show'}</span>
          </button>
          {treeOpen && (
            <div className="h-72 overflow-auto border border-slate-800 bg-slate-900">
              {treePanel}
            </div>
          )}
        </section>
      )}

      <section className="border border-slate-800 bg-slate-950 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-200">Effects &amp; Plane</span>
          <span
            className={`rounded px-1.5 py-0.5 font-mono text-[9px] ${
              isAbsolute ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isAbsolute ? 'absolute' : 'in flow'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onOpenTab?.('shape')}
            className="flex items-center justify-center gap-1.5 rounded bg-slate-800 px-2 py-1.5 text-[10px] font-semibold text-slate-200 hover:bg-slate-700"
          >
            <Scissors className="h-3 w-3 text-indigo-400" />
            Clip / Mask
          </button>
          <button
            onClick={() => onOpenTab?.('animation')}
            className="flex items-center justify-center gap-1.5 rounded bg-slate-800 px-2 py-1.5 text-[10px] font-semibold text-slate-200 hover:bg-slate-700"
          >
            <Sparkles className="h-3 w-3 text-pink-400" />
            Animate
          </button>
          <button
            onClick={() => (isAbsolute ? onMakeFlow?.(node.bbId) : onMakeAbsolute?.(node.bbId))}
            disabled={!onMakeAbsolute && !onMakeFlow}
            className={`col-span-2 flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-[10px] font-semibold disabled:opacity-40 ${
              isAbsolute
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'bg-emerald-600/20 text-emerald-200 hover:bg-emerald-600/30'
            }`}
          >
            <Layers className="h-3 w-3" />
            {isAbsolute ? 'Return to Flow' : 'Make Absolute'}
          </button>
        </div>
        {hasEffects && onClearEffects && (
          <button
            onClick={() => onClearEffects(node.bbId)}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-slate-800 px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <Eraser className="h-3 w-3" />
            Clear clip / mask / animation
          </button>
        )}
      </section>

      <div className="border border-slate-800 bg-slate-950 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-200">
                {node.semanticRole !== 'generic' ? node.semanticRole : `<${node.tag}>`}
              </span>
              {multiSelectCount > 1 && (
                <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                  {multiSelectCount} selected
                </span>
              )}
            </div>
            <div className="mt-1 truncate text-[10px] font-mono text-slate-500">
              {node.id ? `#${node.id}` : node.bbId}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <IconButton title="Parent" onClick={() => onSelectParent(node.bbId)} icon={<ChevronUp className="h-3.5 w-3.5" />} />
            <IconButton title="Duplicate" onClick={() => onDuplicate(node.bbId)} icon={<Copy className="h-3.5 w-3.5" />} />
            <IconButton danger title="Delete" onClick={() => onDelete(node.bbId)} icon={<Trash2 className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </div>

      <section className="w-full border border-slate-800 bg-slate-950/70 p-3 space-y-2">
        <Label icon={<Tag className="h-3.5 w-3.5" />} text="Groups" />
        <div className="flex flex-wrap gap-1.5">
          {multiSelectCount > 1 && onGroupSelected && (
            <button
              onClick={onGroupSelected}
              className="px-2.5 py-1 text-[11px] font-semibold bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
            >
              Group
            </button>
          )}
          {onUngroupSelected && (
            <button
              onClick={onUngroupSelected}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              Ungroup
            </button>
          )}
        </div>
        {multiSelectCount > 1 && onGroupStyle && (
          <GroupStylePanel onGroupStyle={onGroupStyle} />
        )}
      </section>

      {componentActions.length > 0 && (
        <section className="w-full border border-slate-800 bg-slate-950/70 p-3 space-y-2">
          <Label icon={<Type className="h-3.5 w-3.5" />} text="Dedicated Components" />
          <div className="flex flex-wrap gap-1.5">
            {componentActions.map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className={`px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  item.danger
                    ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25'
                    : 'bg-indigo-500/15 text-indigo-200 hover:bg-indigo-500/25'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <NodeStyleColumn
          accent="blue"
          title="Main Selected Element"
          node={node}
          childTargets={childTargets}
          childTarget={childTarget}
          setChildTarget={setChildTarget}
          childColor={childColor}
          setChildColor={setChildColor}
          childFontSize={childFontSize}
          setChildFontSize={setChildFontSize}
          childBold={childBold}
          setChildBold={setChildBold}
          childApplyCount={childApplyCount}
          onApplyChildStyle={applyChildStyle}
          onUpdateText={onUpdateText}
          onUpdateStyle={onUpdateStyle}
        />
        <NodeStyleColumn
          accent="amber"
          title="Sub-selected Element"
          node={inspectedNode || null}
          childTargets={inspectedChildTargets || []}
          childTarget={childTarget}
          setChildTarget={setChildTarget}
          childColor={childColor}
          setChildColor={setChildColor}
          childFontSize={childFontSize}
          setChildFontSize={setChildFontSize}
          childBold={childBold}
          setChildBold={setChildBold}
          childApplyCount={childApplyCount}
          onApplyChildStyle={() => {
            if (!inspectedNode) return;
            const rules = [`color: ${childColor} !important`, `font-size: ${childFontSize}px !important`];
            if (childBold) rules.push('font-weight: bold !important');
            setChildApplyCount(onApplyStyleToChildren(inspectedNode.bbId, childTarget, rules.join('; ')));
          }}
          onUpdateText={onUpdateText}
          onUpdateStyle={onUpdateStyle}
        />
      </div>

      <button
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
      >
        <Settings2 className="h-3.5 w-3.5" /> {advancedOpen ? 'Hide Advanced' : 'Advanced'}
      </button>

      {advancedOpen && (
        <section className="w-full border border-slate-800 bg-slate-950 p-0">
          <div className="p-3 space-y-3">
            <label>
              <Label icon={<Tag className="h-3.5 w-3.5" />} text="Classes" />
              <input
                value={classDraft}
                onChange={(e) => {
                  setClassDraft(e.target.value);
                  onUpdateClassName(node.bbId, e.target.value);
                }}
                className="mt-1 w-full border border-slate-700 bg-slate-900 px-2 py-1.5 text-[10px] font-mono text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label>
              <Label icon={<Settings2 className="h-3.5 w-3.5" />} text="Style" />
              <textarea
                value={rawStyleDraft}
                onChange={(e) => setRawStyleDraft(e.target.value)}
                rows={3}
                spellCheck={false}
                className="mt-1 w-full border border-slate-700 bg-slate-900 px-2 py-1.5 text-[10px] font-mono text-emerald-300 focus:border-emerald-500 focus:outline-none resize-none"
              />
              <button
                onClick={() => {
                  onUpdateStyle(node.bbId, rawStyleDraft);
                }}
                className="mt-1 bg-emerald-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-emerald-500"
              >
                Apply
              </button>
            </label>
            {node.attributes.length > 0 && (
              <div className="space-y-1.5">
                <Label icon={<Tag className="h-3.5 w-3.5" />} text="Attributes" />
                {node.attributes.map((attr) => (
                  <div key={attr.name} className="grid grid-cols-[72px_1fr] items-center gap-1.5">
                    <span className="truncate text-[10px] font-mono text-cyan-400">{attr.name}</span>
                    <input
                      defaultValue={attr.value}
                      onChange={(e) => onUpdateAttribute(node.bbId, attr.name, e.target.value)}
                      className="min-w-0 border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] font-mono text-slate-100"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

const NodeStyleColumn: React.FC<{
  accent: 'blue' | 'amber';
  title: string;
  node: ImportedNodeInfo | null;
  childTargets: Array<{ label: string; selector: string }>;
  childTarget: string;
  setChildTarget: (value: string) => void;
  childColor: string;
  setChildColor: (value: string) => void;
  childFontSize: number;
  setChildFontSize: (value: number) => void;
  childBold: boolean;
  setChildBold: React.Dispatch<React.SetStateAction<boolean>>;
  childApplyCount: number | null;
  onApplyChildStyle: () => void;
  onUpdateText: (bbId: string, text: string) => void;
  onUpdateStyle: (bbId: string, styleAttr: string) => void;
}> = ({
  accent,
  title,
  node,
  childTargets,
  childTarget,
  setChildTarget,
  childColor,
  setChildColor,
  childFontSize,
  setChildFontSize,
  childBold,
  setChildBold,
  childApplyCount,
  onApplyChildStyle,
  onUpdateText,
  onUpdateStyle,
}) => {
  if (!node) {
    return (
      <section className="w-full border border-slate-800 bg-slate-950/70 p-0">
        <div className="p-3 text-[11px] text-slate-500">No sub-selected element.</div>
      </section>
    );
  }

  const selfMap = parseStyle(node.inlineStyle);
  const selfValues = {
    color: stripImportant(selfMap.color) || node.computed.selfColor || '#e2e8f0',
    background: stripImportant(selfMap['background-color']) || node.computed.selfBackground || '#000000',
    fontSize: parseInt(stripImportant(selfMap['font-size']) || node.computed.selfFontSize || '14', 10),
    padding: parseInt(stripImportant(selfMap.padding) || node.computed.selfPadding || '0', 10),
  };

  const updateSelectedStyle = (prop: string, value: string) => {
    const next = { ...selfMap };
    if (value.trim()) next[prop] = /!important/i.test(value) ? value : `${value} !important`;
    else delete next[prop];
    onUpdateStyle(node.bbId, stringifyStyle(next));
  };

  return (
    <div className="space-y-3">
      <section className="w-full border border-slate-800 bg-slate-950/70 p-0">
        <div className="p-3 space-y-2">
          <div className={`text-[11px] font-semibold ${accent === 'amber' ? 'text-amber-300' : 'text-sky-300'}`}>
            {title}
          </div>
          <div className="text-[10px] font-mono text-slate-500">{node.semanticRole !== 'generic' ? node.semanticRole : `<${node.tag}>`}</div>
          {node.isTextLeaf && (
            <textarea
              value={node.text}
              onChange={(e) => onUpdateText(node.bbId, e.target.value)}
              rows={3}
              className="w-full border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 focus:border-indigo-500 focus:outline-none resize-none"
            />
          )}
        </div>
      </section>

      <section className="w-full border border-slate-800 bg-slate-950/70 p-0">
        <div className="p-3 space-y-3">
          <Label icon={<Palette className="h-3.5 w-3.5" />} text="Selected Part" />
          <div className="grid grid-cols-2 gap-2">
            <ColorControl label="Text" title={node.sources.selfColor} value={toHexColor(selfValues.color)} onChange={(value) => updateSelectedStyle('color', value)} />
            <ColorControl label="Background" title={node.sources.selfBackground} value={toHexColor(selfValues.background)} onChange={(value) => updateSelectedStyle('background-color', value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <RangeControl label="Text size" title={node.sources.selfFontSize} value={selfValues.fontSize} min={8} max={40} suffix="px" onChange={(value) => updateSelectedStyle('font-size', `${value}px`)} />
            <RangeControl label="Spacing" title={node.sources.selfPadding} value={selfValues.padding} min={0} max={32} suffix="px" onChange={(value) => updateSelectedStyle('padding', `${value}px`)} />
          </div>
        </div>
      </section>

      {childTargets.length > 0 && (
        <section className="w-full border border-blue-500/30 bg-blue-500/5 p-0">
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label icon={<Palette className="h-3.5 w-3.5" />} text="Style Inside" />
              {childApplyCount !== null && (
                <span className="bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{childApplyCount} changed</span>
              )}
            </div>
            <select
              value={childTarget}
              onChange={(e) => setChildTarget(e.target.value)}
              className="w-full border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="" disabled>Select a part to style...</option>
              {childTargets.map((target) => (
                <option key={target.selector} value={target.selector}>{target.label}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <ColorControl label="Color" value={childColor} onChange={setChildColor} />
              <RangeControl label="Size" value={childFontSize} min={8} max={36} suffix="px" onChange={setChildFontSize} />
            </div>
            <button
              onClick={() => setChildBold((v) => !v)}
              className={`px-2 py-1.5 text-[11px] font-semibold transition-colors ${childBold ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              Bold
            </button>
            <button
              onClick={onApplyChildStyle}
              disabled={!childTarget}
              className="w-full bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
            >
              Apply Inside
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

const GroupStylePanel: React.FC<{ onGroupStyle: (styleAttr: string) => void }> = ({ onGroupStyle }) => {
  const [color, setColor] = React.useState('#38bdf8');
  const [background, setBackground] = React.useState('');
  const [fontSize, setFontSize] = React.useState(14);
  const [padding, setPadding] = React.useState(0);
  const [bold, setBold] = React.useState(false);

  const apply = () => {
    const rules: string[] = [];
    rules.push(`color: ${color} !important`);
    if (background) rules.push(`background-color: ${background} !important`);
    if (fontSize) rules.push(`font-size: ${fontSize}px !important`);
    if (padding) rules.push(`padding: ${padding}px !important`);
    if (bold) rules.push('font-weight: bold !important');
    onGroupStyle(rules.join('; '));
  };

  return (
    <section className="w-full border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-3">
      <div className="text-[11px] font-semibold text-cyan-200">Group Styles</div>
      <div className="grid grid-cols-2 gap-2">
        <ColorControl label="Text" value={color} onChange={setColor} />
        <ColorControl label="Background" value={background || '#000000'} onChange={setBackground} />
      </div>
      <RangeControl label="Text size" value={fontSize} min={8} max={40} suffix="px" onChange={setFontSize} />
      <RangeControl label="Spacing" value={padding} min={0} max={32} suffix="px" onChange={setPadding} />
      <button
        onClick={() => setBold((v) => !v)}
        className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${bold ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
      >
        Bold
      </button>
      <button
        onClick={apply}
        className="w-full rounded-lg bg-cyan-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-cyan-500"
      >
        Apply to All Selected
      </button>
    </section>
  );
};

function stripImportant(value?: string): string {
  return (value || '').replace(/!important/gi, '').trim();
}

function toHexColor(value?: string): string {
  const color = stripImportant(value);
  if (/^#[0-9a-f]{6}$/i.test(color)) return color;
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return '#000000';
  const [, r, g, b] = match;
  return `#${[r, g, b]
    .map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, '0'))
    .join('')}`;
}


const Label: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
    <span className="text-indigo-400">{icon}</span>
    {text}
  </div>
);

const IconButton: React.FC<{ title: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }> = ({
  title,
  icon,
  onClick,
  danger = false,
}) => (
  <button
    title={title}
    onClick={onClick}
    className={`rounded p-1 transition-colors ${
      danger ? 'text-red-400 hover:bg-red-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
  </button>
);

const ColorControl: React.FC<{ label: string; value: string; onChange: (value: string) => void; disabled?: boolean; title?: string }> = ({
  label,
  value,
  onChange,
  disabled = false,
  title,
}) => (
  <label title={title}>
    <span className="block text-[9px] text-slate-400 mb-0.5">{label}</span>
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 rounded border border-slate-700 bg-transparent p-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      />
      <span className="text-[10px] font-mono text-slate-400">{value}</span>
    </div>
  </label>
);

const RangeControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  disabled?: boolean;
  title?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min, max, suffix = '', disabled = false, title, onChange }) => (
  <label title={title}>
    <div className="flex justify-between text-[9px] text-slate-400 mb-0.5">
      <span>{label}</span>
      <span className="font-mono text-indigo-300">{value}{suffix}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : min}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
    />
  </label>
);