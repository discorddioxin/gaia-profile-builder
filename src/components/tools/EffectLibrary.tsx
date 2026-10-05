import React, { useMemo, useState } from 'react';
import { Copy, Check, Search } from 'lucide-react';
import { EFFECT_SNIPPETS, EffectSnippet } from '../../utils/toolPresets';
import { buildV2Document, GAIA_COLUMNS_BASE_CSS, GAIA_PANEL_BASE_CSS, getGaiaComponent } from '../../utils/gaiaSpec';
import { getAnimationKeyframes } from '../../utils/bbcodeTranspiler';
import { ToolsPreview } from './ToolsPreview';

const CATEGORIES: Array<EffectSnippet['category'] | 'All'> = [
  'All',
  'Motion',
  'Shape',
  'Surface',
  'Text',
  'Layout',
];

/**
 * Snippet library — copy-ready CSS not tied to a component instance. Each
 * snippet previews against a realistic Gaia panel document.
 */
export const EffectLibrary: React.FC = () => {
  const [category, setCategory] = useState<EffectSnippet['category'] | 'All'>('All');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(EFFECT_SNIPPETS[0].id);
  const [copied, setCopied] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      EFFECT_SNIPPETS.filter(
        (snippet) =>
          (category === 'All' || snippet.category === category) &&
          (!query.trim() ||
            `${snippet.label} ${snippet.description}`.toLowerCase().includes(query.toLowerCase()))
      ),
    [category, query]
  );

  const active = EFFECT_SNIPPETS.find((s) => s.id === activeId) || EFFECT_SNIPPETS[0];

  /** Panels + the snippet CSS + keyframes → self-contained preview document. */
  const previewDoc = useMemo(() => {
    const kinds = ['details', 'comments', 'friends', 'equipment', 'about'] as const;
    const columnsHtml = `<div id="columns">
${[1, 2, 3]
  .map((column) => {
    const panels = kinds
      .filter((_, index) => index % 3 === column - 1)
      .map((kind) => {
        const def = getGaiaComponent(kind);
        return `    <div class="panel ${def.panelClass}" id="${def.panelId || `id_${kind}`}">
      <h2>${def.defaultTitle}</h2>
      <div class="postcontent">
${def.bodyHtml}
      </div>
      <div class="clear"></div>
    </div>`;
      })
      .join('\n');
    return `  <div id="column_${column}" class="column focus_column">\n${panels}\n  </div>`;
  })
  .join('\n')}
</div>`;

    const css = [
      `body#viewer { margin: 0; background-color: #0b0f1a; color: #cbd5e1; font-family: 'Segoe UI', sans-serif; }`,
      GAIA_COLUMNS_BASE_CSS,
      GAIA_PANEL_BASE_CSS,
      ...kinds.map((kind) => getGaiaComponent(kind).defaultCss),
      getAnimationKeyframes(),
      `/* ---- snippet: ${active.label} ---- */`,
      active.css,
    ].join('\n\n');

    return buildV2Document(columnsHtml, css, 'Effect Library preview');
  }, [active]);

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
    <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] transition-colors ${
                  category === cat
                    ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950 px-2 py-1">
            <Search className="h-3.5 w-3.5 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search effects"
              className="w-36 bg-transparent text-[11px] text-slate-200 placeholder:text-slate-600 focus:outline-none"
            />
          </label>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {visible.map((snippet) => (
            <button
              key={snippet.id}
              onClick={() => setActiveId(snippet.id)}
              className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${
                activeId === snippet.id
                  ? 'border-indigo-400/70 bg-indigo-500/10'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-100">{snippet.label}</span>
                <span className="rounded bg-slate-950 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-500">
                  {snippet.category}
                </span>
              </div>
              <span className="text-[10px] leading-relaxed text-slate-400">{snippet.description}</span>
            </button>
          ))}
          {visible.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-[11px] text-slate-500">
              No snippets match that search.
            </div>
          )}
        </div>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3 border-t border-slate-800 bg-slate-950/60 p-4 lg:w-[440px] lg:border-l lg:border-t-0">
        <div className="text-[11px] font-semibold text-slate-200">
          Preview · <span className="text-indigo-300">{active.label}</span>
        </div>
        <ToolsPreview document={previewDoc} height={300} />
        <div className="relative">
          <pre className="max-h-56 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-slate-300">
            {active.css}
          </pre>
          <button
            onClick={() => copy(active.css)}
            className="absolute right-2 top-2 flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/95 px-2 py-1 text-[10px] text-slate-200 hover:border-slate-600"
          >
            {copied === active.css ? (
              <Check className="h-3 w-3 text-emerald-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            Copy
          </button>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">
          Snippets target the Gaia component ids (`#id_details`, `#id_comments`, …) so they can be
          pasted straight into a profile's CSS without touching the panel markup.
        </p>
      </div>
    </div>
  );
};
