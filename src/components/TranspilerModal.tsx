import React, { useMemo, useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Code2,
  FileText,
  Tag,
  MessageSquareQuote,
  Braces,
  Info,
  Network,
} from 'lucide-react';
import { ProfileElement, CanvasSettings } from '../types/profile';
import { celebrate } from '../utils/celebrate';
import { transpileProfile } from '../utils/bbcodeTranspiler';
import { detectGaiaComponentKind, extractColumnsHtml } from '../utils/gaiaSpec';
import { HtmlTreeView } from './HtmlTreeView';

interface TranspilerModalProps {
  elements: ProfileElement[];
  settings: CanvasSettings;
  importedProfile?: {
    rawHtml?: string;
    rawCss?: string;
  } | null;
  onClose: () => void;
}

type CodeTab = 'html' | 'css' | 'bbcode' | 'document';

export const TranspilerModal: React.FC<TranspilerModalProps> = ({
  elements,
  settings,
  importedProfile,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<CodeTab>('html');
  const [htmlView, setHtmlView] = useState<'tree' | 'source'>('tree');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const output = useMemo(() => transpileProfile(elements, settings), [elements, settings]);
  const isImported = !!importedProfile?.rawHtml;

  // Imported profiles: the HTML tab shows the scraped `#columns` structure,
  // the Full Document tab keeps the untouched import.
  const importedColumns = useMemo(() => {
    if (!isImported) return null;
    const extracted = extractColumnsHtml(importedProfile?.rawHtml || '');
    if (!extracted) return null;
    try {
      const doc = new DOMParser().parseFromString(extracted, 'text/html');
      doc.querySelectorAll('[data-bb-id]').forEach((el) => el.removeAttribute('data-bb-id'));
      return doc.getElementById('columns')?.outerHTML || extracted;
    } catch {
      return extracted;
    }
  }, [isImported, importedProfile?.rawHtml]);

  const importedComponentSummary = useMemo(() => {
    if (!isImported || !importedColumns) return [] as Array<{ label: string; column: number; id: string }>;
    try {
      const doc = new DOMParser().parseFromString(importedColumns, 'text/html');
      return [1, 2, 3].flatMap((column) =>
        Array.from(doc.querySelectorAll(`#column_${column} > .panel`)).map((panel) => ({
          label: detectGaiaComponentKind(panel) || 'custom',
          column,
          id: panel.getAttribute('id') || panel.className,
        }))
      );
    } catch {
      return [];
    }
  }, [isImported, importedColumns]);

  const htmlOutput = isImported ? importedColumns || importedProfile?.rawHtml || '' : output.columnsHtml;
  const cssOutput = isImported ? importedProfile?.rawCss || '' : output.css;
  const documentOutput = isImported ? importedProfile?.rawHtml || '' : output.fullDocument;
  const bbcodeOutput = output.bbcode;
  const bbcodeNeeded = output.bbcodeNeeded && !!bbcodeOutput.trim();

  const tabs: Array<{
    id: CodeTab;
    label: string;
    icon: React.ReactNode;
    hidden?: boolean;
    badge?: string;
  }> = [
    { id: 'html', label: 'Columns HTML', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'css', label: 'CSS (copy/paste)', icon: <Tag className="w-3.5 h-3.5" /> },
    {
      id: 'bbcode',
      label: 'BBCode',
      icon: <MessageSquareQuote className="w-3.5 h-3.5" />,
      badge: bbcodeNeeded ? 'needed' : 'not needed',
    },
    ...(isImported
      ? [{ id: 'document' as CodeTab, label: 'Full Document', icon: <Braces className="w-3.5 h-3.5" /> }]
      : []),
  ];

  const tabContent: Record<CodeTab, string> = {
    html: htmlOutput,
    css: cssOutput,
    bbcode: bbcodeOutput,
    document: documentOutput,
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    celebrate({ particleCount: 20, spread: 45, origin: { y: 0.85 } });
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownload = () => {
    const content = tabContent[activeTab];
    if (!content) return;
    const ext = activeTab === 'css' ? 'css' : activeTab === 'bbcode' ? 'bbcode.txt' : 'html';
    const filename = `${settings.profileTitle || 'profile'}.${ext}`;
    const mimeType = activeTab === 'css' ? 'text/css' : 'text/plain';
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

  const renderPanel = () => {
    if (activeTab === 'bbcode' && !bbcodeNeeded) {
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px] text-emerald-200/90 font-sans">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
            <div className="space-y-1">
              <div className="font-semibold text-emerald-100">BBCode not needed for this profile</div>
              <div>{output.bbcodeReason}</div>
              <div>
                Gaia V2 accepts the generated HTML panels directly, so no BBCode is emitted — BBCode
                is kept deliberately sparse and only appears when a section (e.g. Signature or
                Comments body) is served by Gaia through a BBCode field.
              </div>
            </div>
          </div>
        </div>
      );
    }

    const meta: Record<CodeTab, { title: string; tint: string; hint: string }> = {
      html: {
        title: 'V2 column structure',
        tint: 'text-amber-400',
        hint: isImported
          ? 'Scraped #columns structure from the imported profile — panels stay inside their original column.'
          : '#columns owns the layout — panels live inside #column_1 / #column_2 / #column_3.',
      },
      css: {
        title: 'Copy/paste this CSS into your profile',
        tint: 'text-indigo-400',
        hint: 'Selectors target Gaia-supported panels (.panel, #id_comments, .comments_panel, …).',
      },
      bbcode: {
        title: 'Sparse BBCode fallback',
        tint: 'text-pink-400',
        hint: 'Only emitted for content Gaia accepts through a BBCode field.',
      },
      document: {
        title: 'Full imported document',
        tint: 'text-cyan-400',
        hint: 'Raw imported HTML, preserved exactly as scraped (scripts stripped).',
      },
    };

    const text = tabContent[activeTab];
    const info = meta[activeTab];
    const isHtmlTab = activeTab === 'html' || activeTab === 'document';

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 text-[11px] font-sans">
          <div className={`${info.tint} font-semibold`}>{info.title}</div>
          <div className="flex items-center gap-2">
            {isHtmlTab && (
              <div className="flex rounded-md border border-slate-700 bg-slate-900 p-0.5">
                <button
                  onClick={() => setHtmlView('tree')}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    htmlView === 'tree' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Network className="h-3 w-3" />
                  Tree
                </button>
                <button
                  onClick={() => setHtmlView('source')}
                  className={`flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                    htmlView === 'source' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="h-3 w-3" />
                  Source
                </button>
              </div>
            )}
            <span className="text-slate-500">{text.length.toLocaleString()} chars</span>
          </div>
        </div>
        <div className="text-[10px] font-sans text-slate-500">{info.hint}</div>
        {isHtmlTab && htmlView === 'tree' ? (
          <HtmlTreeView
            html={text}
            hint={
              activeTab === 'html'
                ? 'Gaia V2 structure — #columns → #column_N → .panel'
                : 'Imported document (scripts removed)'
            }
          />
        ) : (
          <pre
            className={`p-3 sm:p-4 rounded-xl bg-slate-900 border border-slate-800 whitespace-pre-wrap leading-relaxed select-all overflow-x-auto text-[11px] sm:text-xs ${
              activeTab === 'css'
                ? 'text-indigo-200'
                : activeTab === 'html'
                ? 'text-amber-200'
                : activeTab === 'bbcode'
                ? 'text-pink-200'
                : 'text-cyan-200'
            }`}
          >
            {text || '/* nothing to export */'}
          </pre>
        )}
      </div>
    );
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
              <h3 className="font-semibold text-slate-100 text-xs sm:text-sm truncate">View Code</h3>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                {isImported
                  ? `Imported Gaia V2 profile — ${importedComponentSummary.length} panels inside #columns`
                  : `Gaia V2 output — ${output.gaiaComponents.length} supported components inside #columns`}
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
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`rounded px-1 py-0.5 text-[9px] font-semibold ${
                      tab.badge === 'needed'
                        ? 'bg-pink-500/25 text-pink-200'
                        : activeTab === tab.id
                        ? 'bg-slate-900/60 text-emerald-200'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              onClick={() => handleCopy(tabContent[activeTab], activeTab)}
              disabled={!tabContent[activeTab]}
              className="flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow hover:bg-indigo-500 disabled:opacity-40 transition-colors"
            >
              {copiedKey === activeTab ? (
                <Check className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === activeTab ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={!tabContent[activeTab]}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {(isImported ? importedComponentSummary.length > 0 : output.gaiaComponents.length > 0) && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800 bg-slate-950/20 px-3 sm:px-6 py-2 shrink-0 font-sans">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 shrink-0">
              Gaia components
            </span>
            {isImported
              ? importedComponentSummary.map((component, idx) => (
                  <span
                    key={`${component.id}-${idx}`}
                    className="shrink-0 rounded bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] font-mono text-indigo-200"
                    title={`column ${component.column} · ${component.id}`}
                  >
                    {component.label} · #{component.id}
                  </span>
                ))
              : output.gaiaComponents.map((component, idx) => (
                  <span
                    key={`${component.panelId}-${idx}`}
                    className="shrink-0 rounded bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] font-mono text-indigo-200"
                    title={`column ${component.column} · ${component.panelClass}`}
                  >
                    {component.label} · #{component.panelId}
                  </span>
                ))}
          </div>
        )}

        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-slate-950 font-mono text-xs text-slate-300">
          {renderPanel()}
        </div>
      </div>
    </div>
  );
};
