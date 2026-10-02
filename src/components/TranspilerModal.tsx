import React, { useState } from 'react';
import { X, Copy, Check, Download, Code2, FileText, Tag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProfileElement, CanvasSettings } from '../types/profile';
import { transpileProfile } from '../utils/bbcodeTranspiler';

interface TranspilerModalProps {
  elements: ProfileElement[];
  settings: CanvasSettings;
  importedProfile?: {
    rawHtml?: string;
    rawCss?: string;
  } | null;
  onClose: () => void;
}

export const TranspilerModal: React.FC<TranspilerModalProps> = ({
  elements,
  settings,
  importedProfile,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'html' | 'css'>('html');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const output = transpileProfile(elements, settings);
  const htmlOutput = importedProfile?.rawHtml || output.fullOutput;
  const cssOutput = importedProfile?.rawCss || output.css;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    try {
      confetti({ particleCount: 20, spread: 45, origin: { y: 0.85 } });
    } catch {
      // ignore
    }
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownload = () => {
    const content = activeTab === 'html' ? htmlOutput : cssOutput;
    const filename = `${settings.profileTitle || 'profile'}.${activeTab === 'html' ? 'html' : 'css'}`;
    const mimeType = activeTab === 'html' ? 'text/html' : 'text/css';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md">
      <div
        className="w-full max-w-5xl max-h-[92dvh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4 sm:px-6 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
              <Code2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-100 text-xs sm:text-sm truncate">Code</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                Full HTML and full CSS used for rendering/troubleshooting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between border-b border-slate-800 px-3 sm:px-6 py-2 bg-slate-950/30 gap-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5 scrollbar-none">
            <button
              onClick={() => setActiveTab('html')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'html' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>HTML</span>
            </button>
            <button
              onClick={() => setActiveTab('css')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === 'css' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>CSS</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              onClick={() => handleCopy(activeTab === 'html' ? htmlOutput : cssOutput, activeTab)}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-500 transition-colors"
            >
              {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-950 font-mono text-xs text-slate-300">
          {activeTab === 'html' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-amber-400 font-sans">
                <span>Full HTML used to render the profile</span>
                <span className="text-slate-400">{htmlOutput.length} chars</span>
              </div>
              <pre className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 whitespace-pre-wrap leading-relaxed text-amber-200 select-all overflow-x-auto text-[11px] sm:text-xs">
                {htmlOutput}
              </pre>
            </div>
          )}

          {activeTab === 'css' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-indigo-400 font-sans">
                <span>Full CSS used to render the profile</span>
                <span className="text-slate-400">{cssOutput.length} chars</span>
              </div>
              <pre className="p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 whitespace-pre-wrap leading-relaxed text-indigo-200 select-all overflow-x-auto text-[11px] sm:text-xs">
                {cssOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
