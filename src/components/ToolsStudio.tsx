import React, { useState } from 'react';
import { FlaskConical, Boxes, Sparkles, ImageDown, ArrowLeft } from 'lucide-react';
import { ProfileElement } from '../types/profile';
import { ComponentLab } from './tools/ComponentLab';
import { EffectLibrary } from './tools/EffectLibrary';
import { BackgroundStudio } from './tools/BackgroundStudio';

export type ToolsTab = 'component' | 'effects' | 'background';

interface ToolsStudioProps {
  onSendToBuilder: (element: ProfileElement) => void;
  onBackToBuilder: () => void;
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
    icon: <Boxes className="h-4 w-4" />,
  },
  {
    id: 'effects',
    label: 'Effect Library',
    blurb: 'Copy-ready CSS effects for any Gaia panel',
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: 'background',
    label: 'Background Studio',
    blurb: 'Build the body surface rule for a profile',
    icon: <ImageDown className="h-4 w-4" />,
  },
];

/**
 * Profile Tools — a self-contained workbench. Nothing here touches the active
 * profile until a tool result is explicitly sent back to the builder.
 */
export const ToolsStudio: React.FC<ToolsStudioProps> = ({ onSendToBuilder, onBackToBuilder }) => {
  const [tab, setTab] = useState<ToolsTab>('component');

  return (
    <div className="flex flex-1 min-h-0 w-full">
      <aside className="hidden w-48 shrink-0 flex-col gap-1 border-r border-slate-800 bg-slate-950/80 p-2 md:flex">
        <div className="flex items-center gap-1.5 px-1 pb-1">
          <FlaskConical className="h-4 w-4 text-pink-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            Profile Tools
          </span>
        </div>
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setTab(tool.id)}
            className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-colors ${
              tab === tool.id
                ? 'border-pink-400/60 bg-pink-500/10'
                : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
            }`}
          >
            <span className={tab === tool.id ? 'text-pink-300' : 'text-slate-400'}>{tool.icon}</span>
            <span className="min-w-0">
              <span
                className={`block text-xs font-semibold ${
                  tab === tool.id ? 'text-pink-100' : 'text-slate-200'
                }`}
              >
                {tool.label}
              </span>
            </span>
          </button>
        ))}

        <button
          onClick={onBackToBuilder}
          className="mt-auto flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 px-2 py-2 text-[11px] text-slate-300 hover:border-slate-700 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Profile Builder
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile tool switcher */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-800 bg-slate-950/80 p-2 md:hidden">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setTab(tool.id)}
              className={`shrink-0 rounded-lg border px-2.5 py-1 text-[11px] ${
                tab === tool.id
                  ? 'border-pink-400/60 bg-pink-500/10 text-pink-100'
                  : 'border-slate-800 text-slate-400'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>

        {tab === 'component' && <ComponentLab onSendToBuilder={onSendToBuilder} />}
        {tab === 'effects' && <EffectLibrary />}
        {tab === 'background' && <BackgroundStudio />}
      </div>
    </div>
  );
};
