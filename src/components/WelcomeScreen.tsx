import React from 'react';
import { FilePlus2, Download, Sparkles, Layers, Wand2, Code2 } from 'lucide-react';
import { STARTER_PROFILES } from '../utils/presets';

interface WelcomeScreenProps {
  onNewProfile: () => void;
  onImportProfile: () => void;
  onLoadStarter: (key: string) => void;
  onOpenTools: () => void;
}

/**
 * First-run surface. The builder intentionally starts with no profile: a
 * default/initial tab hid the fact that profiles are created or imported, so
 * the empty state now leads with those two actions.
 */
export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onNewProfile,
  onImportProfile,
  onLoadStarter,
  onOpenTools,
}) => {
  return (
    <div className="flex flex-1 w-full items-center justify-center overflow-y-auto bg-slate-950 px-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Gaia Profile Builder</h1>
          <p className="text-sm text-slate-400">
            Start a profile from scratch or import an existing one to restyle it.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={onNewProfile}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-600/20 to-slate-900 p-5 text-left transition-all hover:border-indigo-400 hover:from-indigo-600/30 hover:shadow-lg hover:shadow-indigo-500/10"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/25 text-indigo-200">
              <FilePlus2 className="h-4.5 w-4.5" />
            </span>
            <span className="text-sm font-semibold text-white">New Profile</span>
            <span className="text-xs leading-relaxed text-slate-400">
              Blank V2 canvas with the full Gaia component palette — details, comments,
              friends, equipment and the rest.
            </span>
            <span className="mt-1 rounded bg-slate-950/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              Ctrl / ⌘ + T
            </span>
          </button>

          <button
            onClick={onImportProfile}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-600/15 to-slate-900 p-5 text-left transition-all hover:border-cyan-400 hover:from-cyan-600/25 hover:shadow-lg hover:shadow-cyan-500/10"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/25 text-cyan-200">
              <Download className="h-4.5 w-4.5" />
            </span>
            <span className="text-sm font-semibold text-white">Import Profile</span>
            <span className="text-xs leading-relaxed text-slate-400">
              Fetch a Gaia profile by URL (or paste its HTML) and edit every scraped
              component in place, background included.
            </span>
            <span className="mt-1 rounded bg-slate-950/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
              URL or HTML paste
            </span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Or start from a starter layout
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {Object.entries(STARTER_PROFILES).map(([key, starter]) => (
              <button
                key={key}
                onClick={() => onLoadStarter(key)}
                className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-left transition-colors hover:border-indigo-500/50 hover:bg-slate-900"
              >
                <div className="text-xs font-medium text-slate-200">{starter.name}</div>
                <div className="text-[10px] leading-snug text-slate-500">
                  {starter.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: <Layers className="h-4 w-4 text-indigo-400" />,
              title: 'Gaia-first components',
              copy: 'Every category is a supported panel with real V2 markup.',
            },
            {
              icon: <Wand2 className="h-4 w-4 text-pink-400" />,
              title: 'Profile Tools',
              copy: 'Isolated labs for clips, masks, morphs, 3D and surfaces.',
              action: (
                <button
                  onClick={onOpenTools}
                  className="mt-1 text-[10px] font-semibold text-pink-300 hover:text-pink-200"
                >
                  Open Profile Tools →
                </button>
              ),
            },
            {
              icon: <Code2 className="h-4 w-4 text-cyan-400" />,
              title: 'Copy-ready output',
              copy: 'Columns HTML, CSS and BBCode only where it is required.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-3"
            >
              <div className="mb-1 flex items-center gap-1.5">
                {card.icon}
                <span className="text-[11px] font-semibold text-slate-200">{card.title}</span>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">{card.copy}</p>
              {card.action}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
