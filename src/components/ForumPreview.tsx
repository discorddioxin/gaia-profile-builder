import React, { useState } from 'react';
import {
  MessageSquare,
  Shield,
  Calendar,
  Code,
} from 'lucide-react';
import { ProfileElement, CanvasSettings } from '../types/profile';
import { transpileProfile } from '../utils/bbcodeTranspiler';

interface ForumPreviewProps {
  elements: ProfileElement[];
  settings: CanvasSettings;
  importedProfile?: {
    rawHtml?: string;
    sourceUrl?: string;
  } | null;
  onOpenTranspiler: () => void;
}

export const ForumPreview: React.FC<ForumPreviewProps> = ({
  elements,
  settings,
  importedProfile,
  onOpenTranspiler,
}) => {
  const [viewStyle, setViewStyle] = useState<'profile' | 'post-signature'>('profile');

  const { fullOutput } = transpileProfile(elements, settings);
  const isImported = !!importedProfile?.rawHtml;
  const importedLayoutWidth = isImported && settings.width <= 480 ? 1000 : settings.width;
  const importedScale = isImported && settings.width <= 480 ? settings.width / importedLayoutWidth : 1;
  const importedHostHeight = isImported && settings.width <= 480 ? settings.height / importedScale : settings.height;

  return (
    <div className="flex-1 h-full w-full overflow-y-auto bg-slate-950 p-2 sm:p-4 md:p-8 select-none">
      {/* Top Banner Toolbar */}
      <div className="max-w-4xl mx-auto mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/90 p-3 sm:p-4 shadow-xl backdrop-blur-md text-xs text-slate-300">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-xs sm:text-sm">
              Live Forum Simulator (No Scripts)
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              Realistic profile rendering with exact forum tag classes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700">
            <button
              onClick={() => setViewStyle('profile')}
              className={`rounded-md px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium transition-all ${
                viewStyle === 'profile'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Profile
            </button>
            <button
              onClick={() => setViewStyle('post-signature')}
              className={`rounded-md px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium transition-all ${
                viewStyle === 'post-signature'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Signature
            </button>
          </div>

          <button
            onClick={onOpenTranspiler}
            className="flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/10 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
          >
            <Code className="w-3.5 h-3.5" />
            <span>BBCode</span>
          </button>
        </div>
      </div>

      {/* Forum UI Container */}
      <div className="max-w-4xl mx-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden mb-12">
        {/* Forum Window Chrome */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-3 sm:px-4 py-2 sm:py-2.5">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80 shrink-0" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80 shrink-0" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 shrink-0" />
            <span className="ml-1 sm:ml-2 font-mono text-[10px] sm:text-[11px] text-slate-400 truncate">
              {isImported ? importedProfile?.sourceUrl || 'imported Gaia V2 profile' : 'bbs.matrixzone.net/member.php?u=4092'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-indigo-400" /> Member: VIP Gold
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Jan 2024
            </span>
          </div>
        </div>

        {/* Forum Post Simulation */}
        {viewStyle === 'post-signature' && (
          <div className="border-b border-slate-800 p-4 sm:p-6 bg-slate-900/50">
            <div className="flex gap-3 sm:gap-4 mb-4">
              <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white shrink-0 text-xs sm:text-sm">
                ZC
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-400 text-xs sm:text-sm">ZeroCool</span>
                  <span className="text-[10px] text-slate-500 font-mono">Today, 04:20 PM #142</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-300 mt-1 leading-relaxed">
                  Just updated my profile layout using the drag-and-drop studio with custom clipping
                  masks and CSS attribute selectors. Check out the signature below! 🚀
                </p>
              </div>
            </div>
            <div className="border-t border-dashed border-slate-800 pt-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono block mb-2">
                — Signature —
              </span>
            </div>
          </div>
        )}

        {/* The Live Rendered Profile HTML + CSS (Horizontally scrollable if canvas is wider than phone) */}
        <div className="p-0 overflow-auto flex justify-center bg-[#070a12]">
          {isImported ? (
            <div
              className="shrink-0 overflow-hidden bg-white"
              style={{ width: `${settings.width}px`, height: `${settings.height}px` }}
            >
              <iframe
                title="Imported profile preview"
                srcDoc={importedProfile?.rawHtml || ''}
                sandbox="allow-same-origin"
                className="border-0 bg-white"
                style={{
                  width: `${importedLayoutWidth}px`,
                  height: `${importedHostHeight}px`,
                  transform: `scale(${importedScale})`,
                  transformOrigin: 'top left',
                }}
              />
            </div>
          ) : (
            <div
              className="transition-all shrink-0"
              style={{ width: `${settings.width}px` }}
              dangerouslySetInnerHTML={{ __html: fullOutput }}
            />
          )}
        </div>

        {/* Forum Footer Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-800 bg-slate-950 px-4 sm:px-6 py-2.5 text-[10px] sm:text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-3">
            <span>BBCode: Active</span>
            <span>HTML: Script-Free</span>
          </div>
          <span>BBStudio Engine</span>
        </div>
      </div>
    </div>
  );
};
