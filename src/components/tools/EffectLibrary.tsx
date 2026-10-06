import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { EFFECT_SNIPPETS, EffectSnippet } from '../../utils/toolPresets';
import { buildV2Document, getGaiaComponent } from '../../utils/gaiaSpec';
import { GAIA_V2_DEFAULT_CSS } from '../../utils/gaiaDefaults';
import { getAnimationKeyframes } from '../../utils/bbcodeTranspiler';
import type { ImportedProfileSnapshot } from '../../features/shared/import';
import { ProfilePreview } from './ProfilePreview';
import { CssPane } from './CssPane';
import { buildToolsPreviewDocument } from './toolsPreviewDoc';

const CATEGORIES: Array<EffectSnippet['category'] | 'All'> = [
  'All',
  'Motion',
  'Shape',
  'Surface',
  'Text',
  'Layout',
];

interface EffectLibraryProps {
  /** The user's imported profile, when the Tools are previewing one. */
  imported?: ImportedProfileSnapshot | null;
}

/**
 * Snippet library — copy-ready CSS not tied to a component instance. Each
 * snippet previews against a realistic Gaia panel document, or against the
 * user's imported profile when one is loaded.
 */
export const EffectLibrary: React.FC<EffectLibraryProps> = ({ imported }) => {
  const [category, setCategory] = useState<EffectSnippet['category'] | 'All'>('All');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(EFFECT_SNIPPETS[0].id);

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

  const active = EFFECT_SNIPPETS.find((snippet) => snippet.id === activeId) || EFFECT_SNIPPETS[0];

  /** Sample profile used when nothing has been imported. */
  const sampleDoc = useMemo(() => {
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

    // Gaia's default V2 profile styling, then the snippet as an override —
    // exactly how a pasted snippet layers onto a live profile.
    const css = [
      GAIA_V2_DEFAULT_CSS,
      getAnimationKeyframes(),
      `/* ---- snippet: ${active.label} ---- */`,
      active.css,
    ].join('\n\n');

    return buildV2Document(columnsHtml, css, 'Effect Library preview');
  }, [active]);

  /** Overrides layered on top of the user's own stylesheet chain. */
  const snippetOverrides = useMemo(
    () => [getAnimationKeyframes(), `/* ---- snippet: ${active.label} ---- */`, active.css].join('\n\n'),
    [active]
  );

  const previewDoc = useMemo(
    () =>
      buildToolsPreviewDocument({
        imported,
        fallback: sampleDoc,
        extraCss: imported ? snippetOverrides : undefined,
      }),
    [imported, sampleDoc, snippetOverrides]
  );

  const chip = (activeChip: boolean) =>
    `border px-1.5 py-[3px] text-[10px] leading-none transition-colors ${
      activeChip
        ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
        : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
    }`;

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="w-full min-w-0 border-slate-800 p-2 lg:w-1/2 lg:overflow-y-auto lg:border-r">
        <div className="mb-2 flex flex-wrap items-center gap-1">
          {CATEGORIES.map((cat) => (
            <button key={cat} type="button" aria-pressed={category === cat} onClick={() => setCategory(cat)} className={chip(category === cat)}>
              {cat}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-1 border border-slate-800 bg-slate-950 px-1.5 py-0.5">
            <Search className="h-3 w-3 text-slate-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search effects"
              className="w-32 bg-transparent text-[10px] text-slate-200 placeholder:text-slate-600 focus:outline-none"
            />
          </label>
        </div>

        <div className="border border-slate-800">
          {visible.map((snippet) => {
            const activeRow = activeId === snippet.id;
            return (
              <button
                key={snippet.id}
                type="button"
                aria-pressed={activeRow}
                onClick={() => setActiveId(snippet.id)}
                className={`flex w-full items-baseline gap-2 border-b border-slate-800 px-2 py-1.5 text-left transition-colors last:border-b-0 ${
                  activeRow ? 'bg-indigo-500/10' : 'hover:bg-slate-800/40'
                }`}
              >
                <span
                  className={`w-40 shrink-0 truncate text-[11px] font-medium ${
                    activeRow ? 'text-indigo-100' : 'text-slate-200'
                  }`}
                >
                  {snippet.label}
                </span>
                <span className="shrink-0 border border-slate-800 px-1 text-[9px] uppercase tracking-wide text-slate-500">
                  {snippet.category}
                </span>
                <span className="min-w-0 truncate text-[10px] text-slate-500">
                  {snippet.description}
                </span>
              </button>
            );
          })}
          {visible.length === 0 && (
            <p className="px-2 py-3 text-[11px] text-slate-500">No snippets match that search.</p>
          )}
        </div>

        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          Snippets target the Gaia component ids (`#id_details`, `#id_comments`, …) so they can be
          pasted straight into a profile's CSS without touching the panel markup. Motion snippets
          need the keyframes block that ships with them.
        </p>
      </div>

      {/* ---------------------- preview (70%) + CSS (30%) ------------------- */}
      <div className="flex w-full min-h-[520px] shrink-0 flex-col gap-2 border-t border-slate-800 bg-slate-950/60 p-2 lg:w-1/2 lg:min-h-0 lg:border-t-0">
        <ProfilePreview
          document={previewDoc}
          toolbar={
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Live preview
              </span>
              <span className="border border-indigo-400/40 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[9px] text-indigo-200">
                {active.label}
              </span>
              {imported && (
                <span className="border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-200">
                  {imported.title}
                </span>
              )}
            </div>
          }
        />
        <CssPane css={active.css} title="Snippet CSS" className="flex-none basis-[30%]" />
      </div>
    </div>
  );
};
