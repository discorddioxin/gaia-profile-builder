import React, { useCallback, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, FileCode2, Layers } from 'lucide-react';

/**
 * Collapsible HTML tree for the "View Code" dialog.
 *
 * Imported Gaia profiles can be very large, so the tree is built once from the
 * parsed document and rendered lazily:
 *  - only the first `DEFAULT_DEPTH` levels start expanded
 *  - a node never renders more than `CHILDREN_PAGE` children at once
 *  - the total rendered node budget is capped (`MAX_RENDERED`)
 */

interface HtmlNode {
  key: string;
  nodeType: 'element' | 'text' | 'comment';
  tag: string;
  id: string;
  className: string;
  attrs: Array<{ name: string; value: string }>;
  text: string;
  children: HtmlNode[];
  selfClosing: boolean;
}

const DEFAULT_DEPTH = 3;
const CHILDREN_PAGE = 200;
const MAX_RENDERED = 3000;

const INLINE_TAGS = new Set([
  'span', 'a', 'b', 'i', 'u', 'em', 'strong', 'small', 'sub', 'sup', 'code', 'br', 'img', 'font',
]);

const VOID_TAGS = new Set(['br', 'img', 'input', 'hr', 'meta', 'link', 'base', 'source', 'area', 'col']);

function buildNode(el: Element, key: string, depth: number, budget: { count: number }): HtmlNode | null {
  if (budget.count <= 0) return null;
  budget.count -= 1;

  const tag = el.tagName.toLowerCase();
  const children: HtmlNode[] = [];

  // Only descend a few levels deep when building — deeper levels are built on
  // demand when the user expands them.
  if (depth < 12) {
    Array.from(el.childNodes).forEach((child, index) => {
      if (budget.count <= 0) return;
      if (child.nodeType === Node.ELEMENT_NODE) {
        const built = buildNode(child as Element, `${key}.${index}`, depth + 1, budget);
        if (built) children.push(built);
      } else if (child.nodeType === Node.TEXT_NODE) {
        const text = (child.textContent || '').replace(/\s+/g, ' ').trim();
        if (text) {
          budget.count -= 1;
          children.push({
            key: `${key}.${index}`,
            nodeType: 'text',
            tag: '#text',
            id: '',
            className: '',
            attrs: [],
            text,
            children: [],
            selfClosing: false,
          });
        }
      } else if (child.nodeType === Node.COMMENT_NODE) {
        budget.count -= 1;
        children.push({
          key: `${key}.${index}`,
          nodeType: 'comment',
          tag: '#comment',
          id: '',
          className: '',
          attrs: [],
          text: (child.textContent || '').trim(),
          children: [],
          selfClosing: false,
        });
      }
    });
  }

  return {
    key,
    nodeType: 'element',
    tag,
    id: el.getAttribute('id') || '',
    className: el.getAttribute('class') || '',
    attrs: Array.from(el.attributes)
      .filter((a) => a.name !== 'id' && a.name !== 'class')
      .map((a) => ({ name: a.name, value: a.value })),
    text: '',
    children,
    selfClosing: VOID_TAGS.has(tag),
  };
}

export function parseHtmlTree(html: string): HtmlNode[] {
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const budget = { count: MAX_RENDERED };
    const roots: HtmlNode[] = [];
    if (/<!doctype/i.test(html)) {
      // Keep the doctype visible as a pseudo node for full documents.
      roots.push({
        key: 'doctype',
        nodeType: 'comment',
        tag: '!doctype',
        id: '',
        className: '',
        attrs: [],
        text: 'html',
        children: [],
        selfClosing: true,
      });
    }
    Array.from(doc.documentElement.childNodes).forEach((child, index) => {
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const built = buildNode(child as Element, `r${index}`, 0, budget);
      if (built) roots.push(built);
    });
    if (roots.length === 0 && doc.body) {
      Array.from(doc.body.children).forEach((child, index) => {
        const built = buildNode(child, `b${index}`, 0, budget);
        if (built) roots.push(built);
      });
    }
    return roots;
  } catch {
    return [];
  }
}

interface HtmlTreeViewProps {
  html: string;
  /** Optional note shown above the tree (e.g. "scraped #columns structure"). */
  hint?: string;
}

export const HtmlTreeView: React.FC<HtmlTreeViewProps> = ({ html, hint }) => {
  const roots = useMemo(() => parseHtmlTree(html), [html]);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    const seed = (nodes: HtmlNode[], depth: number) => {
      nodes.forEach((node) => {
        if (depth < DEFAULT_DEPTH) {
          initial.add(node.key);
          seed(node.children, depth + 1);
        }
      });
    };
    seed(roots, 0);
    return initial;
  });
  const [showAllRoots, setShowAllRoots] = useState(false);
  const [expandedChildren, setExpandedChildren] = useState<Record<string, number>>({});
  const [onlyStructure, setOnlyStructure] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const expandAll = () => {
    const all = new Set<string>();
    const walk = (nodes: HtmlNode[]) => {
      nodes.forEach((node) => {
        if (node.children.length > 0) {
          all.add(node.key);
          walk(node.children);
        }
      });
    };
    walk(roots);
    setExpanded(all);
  };

  const collapseAll = () => setExpanded(new Set());

  const visibleRoots = showAllRoots ? roots : roots.slice(0, 40);

  const renderNode = (node: HtmlNode, depth: number, counter: { rendered: number }): React.ReactNode => {
    if (counter.rendered >= MAX_RENDERED) return null;
    counter.rendered += 1;

    const isText = node.nodeType === 'text';
    const isComment = node.nodeType === 'comment';
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.key);
    const isSelected = selectedKey === node.key;
    const childLimit = expandedChildren[node.key] ?? CHILDREN_PAGE;
    const visibleChildren = isOpen ? node.children.slice(0, childLimit) : [];
    const hiddenCount = node.children.length - visibleChildren.length;

    return (
      <div key={node.key} className="font-mono text-[11px] leading-relaxed">
        <div
          className={`flex items-start gap-1 rounded px-1 ${
            isSelected ? 'bg-indigo-500/20 ring-1 ring-indigo-400/50' : 'hover:bg-slate-800/60'
          }`}
          style={{ paddingLeft: `${depth * 14 + 4}px` }}
          onClick={() => setSelectedKey(node.key)}
        >
          {hasChildren && !isText ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggle(node.key);
              }}
              className="mt-0.5 shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-700 hover:text-slate-100"
              title={isOpen ? 'Collapse' : 'Expand'}
            >
              {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
          ) : (
            <span className="mt-0.5 inline-block h-3 w-3 shrink-0" />
          )}

          {isText || isComment ? (
            <span className={`truncate ${isComment ? 'text-slate-500 italic' : 'text-emerald-200/80'}`}>
              {isComment ? `<!-- ${node.text.slice(0, 90)} -->` : `"${node.text.slice(0, 140)}"`}
            </span>
          ) : (
            <span className="min-w-0 flex-wrap break-words">
              <span className="text-slate-500">&lt;</span>
              <span className={INLINE_TAGS.has(node.tag) ? 'text-sky-300' : 'text-amber-300'}>
                {node.tag}
              </span>
              {node.id && (
                <span className="text-cyan-300">
                  {' '}
                  id=<span className="text-cyan-200">&quot;{node.id}&quot;</span>
                </span>
              )}
              {node.className && (
                <span className="text-violet-300">
                  {' '}
                  class=<span className="text-violet-200">&quot;{node.className}&quot;</span>
                </span>
              )}
              {node.attrs.map((attr) => (
                <span key={attr.name} className="text-slate-400">
                  {' '}
                  {attr.name}
                  <span className="text-slate-500">=</span>
                  <span className="text-slate-300">
                    &quot;{attr.value.length > 80 ? `${attr.value.slice(0, 80)}…` : attr.value}&quot;
                  </span>
                </span>
              ))}
              <span className="text-slate-500">{node.selfClosing ? ' />' : '>'}</span>
              {!isOpen && hasChildren && (
                <span className="ml-1 text-[10px] text-slate-500">
                  {node.children.length} {node.children.length === 1 ? 'child' : 'children'}…
                </span>
              )}
              {isOpen && node.selfClosing === false && !hasChildren && <span className="text-slate-600"> </span>}
            </span>
          )}
        </div>

        {isOpen && !isText && (
          <>
            {visibleChildren.map((child) => renderNode(child, depth + 1, counter))}
            {hiddenCount > 0 && (
              <button
                onClick={() => setExpandedChildren((prev) => ({ ...prev, [node.key]: childLimit + CHILDREN_PAGE }))}
                className="ml-4 my-0.5 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-indigo-300 hover:bg-slate-700"
                style={{ marginLeft: `${(depth + 1) * 14 + 4}px` }}
              >
                show {Math.min(hiddenCount, CHILDREN_PAGE)} more of {hiddenCount}
              </button>
            )}
            {counter.rendered < MAX_RENDERED && (
              <div
                className="text-slate-600"
                style={{ paddingLeft: `${(depth + 1) * 14 + 4}px` }}
              >
                {`</${node.tag}>`}
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  if (roots.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-[11px] text-slate-400">
        Nothing to display — the HTML could not be parsed into a tree.
      </div>
    );
  }

  const counter = { rendered: 0 };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-sans text-slate-400">
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          <span>{hint || 'Document tree'}</span>
        </div>
        <div className="flex items-center gap-1.5 font-sans">
          <button
            onClick={() => setOnlyStructure((v) => !v)}
            className={`rounded border px-2 py-0.5 text-[10px] transition-colors ${
              onlyStructure
                ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
            title="Hide text and comment nodes"
          >
            structure only
          </button>
          <button
            onClick={expandAll}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300 hover:text-white"
          >
            expand all
          </button>
          <button
            onClick={collapseAll}
            className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] text-slate-300 hover:text-white"
          >
            collapse
          </button>
        </div>
      </div>

      <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-800 bg-slate-900/60 p-2">
        {onlyStructure ? (
          <StructureOnlyTree
            roots={roots}
            expandAllState={expanded}
            onToggle={toggle}
          />
        ) : (
          visibleRoots.map((node) => renderNode(node, 0, counter))
        )}
        {!showAllRoots && roots.length > 40 && !onlyStructure && (
          <button
            onClick={() => setShowAllRoots(true)}
            className="mt-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] font-sans text-indigo-300 hover:bg-slate-700"
          >
            show remaining {roots.length - 40} top-level nodes
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 font-sans text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <FileCode2 className="h-3 w-3" />
          element
        </span>
        <span className="text-emerald-300/70">text</span>
        <span className="italic text-slate-500">comment</span>
        <span className="ml-auto">click a row to highlight its subtree line</span>
      </div>
    </div>
  );
};

/**
 * Compact structural view: panels/components grouped by column, without text
 * nodes. Handy for imported Gaia documents that carry a lot of copy.
 */
const StructureOnlyTree: React.FC<{
  roots: HtmlNode[];
  expandAllState: Set<string>;
  onToggle: (key: string) => void;
}> = ({ roots, expandAllState, onToggle }) => {
  const counter = { rendered: 0 };
  const render = (node: HtmlNode, depth: number): React.ReactNode => {
    if (node.nodeType !== 'element') return null;
    if (counter.rendered >= MAX_RENDERED) return null;
    counter.rendered += 1;

    const structuralChildren = node.children.filter((child) => {
      if (child.nodeType !== 'element') return false;
      // Collapse pass-through wrappers that only exist to hold one element.
      return true;
    });
    const isOpen = expandAllState.has(node.key);
    const label = node.id || (node.className ? `.${node.className.split(/\s+/)[0]}` : '');

    return (
      <div key={node.key}>
        <div
          className="flex items-center gap-1 rounded px-1 py-0.5 font-mono text-[11px] hover:bg-slate-800/60"
          style={{ paddingLeft: `${depth * 14 + 4}px` }}
        >
          <button
            onClick={() => onToggle(node.key)}
            className={`rounded p-0.5 ${structuralChildren.length ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-700'}`}
            disabled={structuralChildren.length === 0}
          >
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
          <span className="text-amber-300">{node.tag}</span>
          {label && <span className="text-cyan-300">{label}</span>}
          {structuralChildren.length > 0 && (
            <span className="text-[10px] text-slate-500">({structuralChildren.length})</span>
          )}
        </div>
        {isOpen && structuralChildren.map((child) => render(child, depth + 1))}
      </div>
    );
  };

  return <>{roots.map((node) => render(node, 0))}</>;
};
