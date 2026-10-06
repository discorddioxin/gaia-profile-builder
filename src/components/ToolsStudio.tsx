import React, { useState } from 'react';
import { FlaskConical, Boxes, Sparkles, ImageDown, Upload, X } from 'lucide-react';
import { ProfileElement } from '../types/profile';
import { ComponentLab } from './tools/ComponentLab';
import { EffectLibrary } from './tools/EffectLibrary';
import { BackgroundStudio } from './tools/BackgroundStudio';
import {
  ImportProfileDialog,
  snapshotFromImportResult,
  type ImportedProfileSnapshot,
  type ImportResult,
} from '../features/shared/import';

export type ToolsTab = 'component' | 'effects' | 'background';

interface ToolsStudioProps {
  onSendToBuilder: (element: ProfileElement) => void;
}

const TOOLS: Array<{
  id: ToolsTab;
  label: string;
  blurb: string;
  icon: React.ReactNode;
}> = [
  {
    id: 'component',
    label: 'Component Lab',
    blurb: 'Content type + clips, masks, morphs, 3D and surfaces',
    icon: <Boxes className="h-3.5 w-3.5" />,
  },
  {
    id: 'effects',
    label: 'Effect Library',
    blurb: 'Copy-ready CSS effects for any Gaia panel',
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  {
    id: 'background',
    label: 'Background Studio',
    blurb: 'Build the body surface rule for a profile',
    icon: <ImageDown className="h-3.5 w-3.5" />,
  },
];

/**
 * Profile Tools — a self-contained workbench. Nothing here touches the active
 * profile until a tool result is explicitly sent back to the builder. An
 * imported profile (shared import feature) supplies the live preview's CSS and
 * column layout, so tooling is previewed against the real thing.
 */
export const ToolsStudio: React.FC<ToolsStudioProps> = ({ onSendToBuilder }) => {
  const [tab, setTab] = useState<ToolsTab>('component');
  const [imported, setImported] = useState<ImportedProfileSnapshot | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleImportResult = (result: ImportResult) => {
    setImported(snapshotFromImportResult(result));
  };

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      {/* Tool tabs — a flat bar directly under the app bar. */}
      <nav
        role="tablist"
        aria-label="Profile Tools"
        className="flex shrink-0 items-center gap-5 overflow-x-auto border-b border-slate-800 bg-slate-950/80 px-3"
      >
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <FlaskConical className="h-3.5 w-3.5 text-pink-400" />
          Profile Tools
        </span>
        {TOOLS.map((tool) => {
          const active = tab === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              role="tab"
              aria-selected={active}
              title={tool.blurb}
              onClick={() => setTab(tool.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 py-2 text-[11px] font-semibold transition-colors ${
                active
                  ? 'border-pink-400 text-pink-100'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={active ? 'text-pink-300' : 'text-slate-500'}>{tool.icon}</span>
              {tool.label}
            </button>
          );
        })}
      </nav>

      {/* Profile context for the live preview: the user's own profile, or the
          tool's sample V2 profile when nothing is imported. */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-800 bg-slate-950/60 px-3 py-1">
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="flex shrink-0 items-center gap-1 border border-slate-800 px-2 py-[3px] text-[10px] text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
        >
          <Upload className="h-3 w-3 text-cyan-400" />
          Import profile
        </button>

        {imported ? (
          <>
            <span className="flex shrink-0 items-center gap-1.5 border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-[3px] font-mono text-[10px] text-cyan-200">
              {imported.title}
              <span className="text-cyan-300/60">
                · {imported.panelCount} panel{imported.panelCount === 1 ? '' : 's'} · col{' '}
                {imported.defaultColumn}
              </span>
            </span>
            <span className="hidden truncate font-mono text-[9px] text-slate-500 sm:inline">
              {imported.sourceUrl}
            </span>
            <button
              type="button"
              onClick={() => setImported(null)}
              title="Preview the sample profile again"
              className="flex shrink-0 items-center gap-1 border border-slate-800 px-1.5 py-[3px] text-[10px] text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </>
        ) : (
          <span className="truncate text-[10px] text-slate-500">
            Previews use a sample V2 profile — import yours to see tooling on your own CSS and
            columns.
          </span>
        )}
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {tab === 'component' && (
          <ComponentLab
            key={imported?.sourceUrl || 'sample'}
            onSendToBuilder={onSendToBuilder}
            imported={imported}
          />
        )}
        {tab === 'effects' && <EffectLibrary imported={imported} />}
        {tab === 'background' && <BackgroundStudio imported={imported} />}
      </div>

      {importOpen && (
        <ImportProfileDialog
          variant="tools"
          onClose={() => setImportOpen(false)}
          onImportResult={handleImportResult}
        />
      )}
    </div>
  );
};
