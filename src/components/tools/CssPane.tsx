import React, { useMemo, useState } from 'react';
import { ChevronRight, Copy, Check, Search } from 'lucide-react';
import { cssNodeMatches, countCssRules, parseCssTree, type CssTreeNode } from '../../utils/cssTree';

type CssViewMode = 'css' | 'tree';

interface CssPaneProps {
  /** The stylesheet to read out — normally the copy-paste override CSS. */
  css: string;
  /** Header label. */
  title?: string;
  /** Rendered before the view toggle (e.g. a rule-count chip). */
  meta?: React.ReactNode;
  className?: string;
}

interface TreeRowProps {
  node: CssTreeNode;
  depth: number;
  query: string;
  onCopy: (text: string) => void;
  copied: string | null;
}

const TreeRow: React.FC<TreeRowProps> = ({ node, depth, query, onCopy, copied }) => {
  const expandable =
    node.children.length > 0 || node.declarations.length > 0;
  const [open, setOpen] = useState(depth === 0);
  const matches = query.trim() ? cssNodeMatches(node, query) : true;
  if (!matches) return null;

  const isComment = node.kind === 'comment';
  const labelClass = isComment
    ? 'text-slate-500 italic'
    : node.kind === 'at-rule'
      ? 'text-violet-300'
      : 'text-cyan-200';

  return (
    <div>
      <div
        className="group flex items-center gap-1 py-[3px] pr-1 hover:bg-slate-800/40"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => expandable && setOpen((value) => !value)}
          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center ${
            expandable ? 'text-slate-500 hover:text-slate-200' : 'text-transparent'
          }`}
          tabIndex={expandable ? 0 : -1}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => expandable && setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-baseline gap-2 text-left font-mono text-[10px] leading-4"
        >
          <span className={`truncate ${labelClass}`}>
            {node.label}
            {node.kind === 'rule' || node.kind === 'at-rule' ? '' : ''}
          </span>
          {node.declarations.length > 0 && (
            <span className="shrink-0 text-[9px] text-slate-600">
              {node.declarations.length} decl
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onCopy(node.raw)}
          title="Copy this block"
          className="shrink-0 p-0.5 text-slate-600 opacity-0 transition-opacity hover:text-slate-200 group-hover:opacity-100"
        >
          {copied === node.raw ? (
            <Check className="h-3 w-3 text-emerald-400" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </button>
      </div>

      {open && (
        <>
          {node.declarations.map((declaration) => (
            <div
              key={`${node.id}-${declaration.property}-${declaration.value}`}
              className="flex items-baseline gap-1.5 py-[2px] pr-1 font-mono text-[10px] leading-4 hover:bg-slate-800/40"
              style={{ paddingLeft: `${depth * 12 + 26}px` }}
            >
              <span className="shrink-0 text-slate-400">{declaration.property}</span>
              <span className="shrink-0 text-slate-600">:</span>
              <span className="min-w-0 break-all text-amber-200/90">{declaration.value};</span>
            </div>
          ))}
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              query={query}
              onCopy={onCopy}
              copied={copied}
            />
          ))}
        </>
      )}
    </div>
  );
};

/**
 * The Tools' stylesheet read-out: raw CSS or an expandable rule tree, with a
 * copy-all action. Sized by the parent (the labs give it 30% of the column).
 */
export const CssPane: React.FC<CssPaneProps> = ({ css, title = 'CSS', meta, className = '' }) => {
  const [mode, setMode] = useState<CssViewMode>('css');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const tree = useMemo(() => parseCssTree(css), [css]);
  const ruleCount = useMemo(() => countCssRules(tree), [tree]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section
      className={`flex min-h-0 flex-col border border-slate-800 bg-slate-950/60 ${className}`}
      aria-label="Generated CSS"
    >
      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-slate-800 px-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <span className="font-mono text-[9px] text-slate-600">
          {ruleCount} rule{ruleCount === 1 ? '' : 's'}
        </span>
        {meta}

        <div className="ml-auto flex items-center gap-1.5">
          {mode === 'tree' && (
            <label className="flex items-center gap-1 border border-slate-800 bg-slate-950 px-1.5 py-0.5">
              <Search className="h-3 w-3 text-slate-600" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter selectors"
                className="w-28 bg-transparent text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
            </label>
          )}

          {/* View mode: segmented, flat. */}
          <div className="flex items-stretch border border-slate-800">
            {(['css', 'tree'] as CssViewMode[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => setMode(value)}
                className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  mode === value
                    ? 'bg-slate-700/70 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {value === 'css' ? 'CSS' : 'Tree'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => copy(css)}
            className="flex items-center gap-1 border border-slate-800 px-2 py-0.5 text-[10px] text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
          >
            {copied === css ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            Copy CSS
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {mode === 'css' ? (
          <pre className="p-2 font-mono text-[10px] leading-relaxed text-slate-300 whitespace-pre-wrap break-words">
            {css || '/* Nothing authored yet — this component still renders with Gaia defaults. */'}
          </pre>
        ) : (
          <div className="py-1">
            {tree.length === 0 ? (
              <p className="px-2 py-1 text-[10px] text-slate-500">
                Nothing authored yet — the tree is empty because this component still renders with
                Gaia defaults.
              </p>
            ) : (
              tree.map((node) => (
                <TreeRow
                  key={node.id}
                  node={node}
                  depth={0}
                  query={query}
                  onCopy={copy}
                  copied={copied}
                />
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
};
