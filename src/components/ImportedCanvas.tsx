import React from 'react';
import { Globe, ExternalLink, Wand2, FileCode } from 'lucide-react';
import { Profile } from '../types/profile';

interface ImportedCanvasProps {
  profile: Profile;
  onSwitchToCanvasMode: () => void;
}

/**
 * Faithful renderer for imported HTML+CSS. Uses an <iframe srcDoc> so:
 *  - The imported document lives in an isolated document/context
 *  - Its CSS (especially resets and body styles) can't leak into the app
 *  - Any surviving <script> can't touch parent (sanitizer already removed them,
 *    but srcDoc + no `allow-scripts` sandbox is defense-in-depth)
 */
export const ImportedCanvas: React.FC<ImportedCanvasProps> = ({
  profile,
  onSwitchToCanvasMode,
}) => {
  const rawHtml = profile.rawHtml || '';
  const hasElements = profile.elements.length > 0;

  return (
    <div className="relative flex-1 h-full w-full overflow-auto bg-[#07090e] p-3 sm:p-6 md:p-8 flex flex-col">
      {/* Info Banner */}
      <div className="mx-auto w-full max-w-5xl mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-3 text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-cyan-100 truncate">
              Imported: {profile.title}
            </div>
            <div className="text-[11px] text-cyan-300/70 truncate flex items-center gap-1">
              <FileCode className="w-3 h-3 shrink-0" />
              <span className="truncate">{profile.sourceUrl}</span>
              {profile.sourceUrl && profile.sourceUrl.startsWith('http') && (
                <a
                  href={profile.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-cyan-400 hover:text-cyan-200 shrink-0"
                  title="Open source URL in new browser tab"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {hasElements && (
          <button
            onClick={onSwitchToCanvasMode}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-1.5 text-xs font-semibold text-white shadow hover:brightness-110 transition-all shrink-0"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Edit as Elements ({profile.elements.length})</span>
          </button>
        )}
      </div>

      {/* Rendered HTML in isolated iframe */}
      <div className="mx-auto w-full max-w-5xl flex-1 rounded-2xl border border-slate-800 bg-white shadow-2xl overflow-hidden">
        {rawHtml ? (
          <iframe
            title={`Imported: ${profile.title}`}
            srcDoc={rawHtml}
            sandbox="allow-same-origin"
            className="w-full h-full min-h-[600px] border-0 bg-white"
          />
        ) : (
          <div className="flex h-full min-h-[400px] items-center justify-center text-slate-400 text-sm p-8 text-center">
            No raw HTML captured for this profile.
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-5xl mt-3 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>Rendered in sandboxed iframe · scripts stripped · same-origin only</span>
        <span>
          {rawHtml ? `${(rawHtml.length / 1024).toFixed(1)}KB HTML` : '—'} ·{' '}
          {profile.rawCss ? `${(profile.rawCss.length / 1024).toFixed(1)}KB CSS` : '—'}
        </span>
      </div>
    </div>
  );
};
