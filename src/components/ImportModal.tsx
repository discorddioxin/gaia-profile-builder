import React, { useState } from 'react';
import {
  Download,
  X,
  Link as LinkIcon,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  Trash2,
  Code2,
  ClipboardPaste,
  Globe,
  Wand2,
  FileCode,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProfileElement, CanvasSettings } from '../types/profile';
import {
  importProfileFromUrl,
  importProfileFromHtml,
  ImportResult,
} from '../utils/profileImporter';

interface ImportModalProps {
  onClose: () => void;
  onImport: (
    elements: ProfileElement[],
    settings: Partial<CanvasSettings>,
    rawHtml: string,
    rawCss: string,
    sourceUrl: string,
    initialRenderMode: 'canvas' | 'raw'
  ) => void;
}

type ImportSourceTab = 'url' | 'html';

const SAMPLE_URLS = [
  'https://en.wikipedia.org/wiki/Cyberpunk',
  'https://motherfuckingwebsite.com/',
];

const SAMPLE_HTML_SNIPPET = `<!doctype html>
<html>
<head>
<style>
  body { margin: 0; background: #0e111a; color: #e2e8f0; font-family: Arial, sans-serif; }
  #columns { display: grid; grid-template-columns: 220px 1fr 220px; gap: 12px; width: 900px; margin: 24px auto; }
  .column { min-height: 420px; }
  .panel { margin-bottom: 12px; padding: 12px; background: rgba(15,23,42,.86); border: 1px solid rgba(99,102,241,.35); }
  .panel h2 { margin: 0 0 8px; font-size: 16px; }
</style>
</head>
<body id="viewer" class="bbcode-swap-blocked-group js">
  <div id="gaia_header"></div>
  <div id="columns">
    <div id="column_1" class="column focus_column">
      <div class="panel details_panel" id="id_details"><h2 id="details_title">Details</h2><p>Sample details panel.</p></div>
    </div>
    <div id="column_2" class="column focus_column">
      <div class="panel about_panel postcontent" id="id_about"><h2 id="about_title">About</h2><p>Sample V2 profile import.</p></div>
    </div>
    <div id="column_3" class="column focus_column">
      <div class="panel wish_list_panel profile" id="id_wishlist"><h2 id="wishlist_title">Wish List</h2></div>
    </div>
  </div>
  <div id="pictures_container"></div>
  <div id="texts_container"></div>
  <div id="footer"></div>
</body>
</html>`;

export const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [tab, setTab] = useState<ImportSourceTab>('url');

  const [url, setUrl] = useState('');
  const [htmlInput, setHtmlInput] = useState('');
  const [htmlSourceUrl, setHtmlSourceUrl] = useState('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [initialRenderMode, setInitialRenderMode] = useState<'canvas' | 'raw'>('canvas');

  const resetResult = () => {
    setResult(null);
    setStatus('idle');
    setError('');
    setProgressMsg('');
  };

  const handleFetchUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    let normalized = url.trim();
    if (!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;

    setStatus('loading');
    setError('');
    setResult(null);
    setProgressMsg('Starting…');

    try {
      const importResult = await importProfileFromUrl(normalized, (msg) => setProgressMsg(msg));
      setResult(importResult);
      setStatus('success');
      // Editable Canvas now renders the same DOM/CSS as Faithful HTML.
      setInitialRenderMode('canvas');
      celebrate();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleParseHtml = async () => {
    if (!htmlInput.trim()) return;
    setStatus('loading');
    setError('');
    setResult(null);
    setProgressMsg('Parsing HTML…');

    try {
      const source = htmlSourceUrl.trim() || undefined;
      const importResult = await importProfileFromHtml(htmlInput, source, (msg) =>
        setProgressMsg(msg)
      );
      setResult(importResult);
      setStatus('success');
      setInitialRenderMode('canvas');
      celebrate();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const celebrate = () => {
    try {
      confetti({
        particleCount: 40,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#6366f1', '#a855f7'],
      });
    } catch {
      /* ignore */
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setHtmlInput(text);
    } catch {
      setError('Clipboard access denied — please paste manually (Ctrl/Cmd + V).');
      setStatus('error');
    }
  };

  const handleApply = () => {
    if (!result) return;
    onImport(
      result.elements,
      result.settings,
      result.rawHtml,
      result.rawCss,
      result.sourceUrl,
      initialRenderMode
    );
    onClose();
  };

  const switchTab = (next: ImportSourceTab) => {
    setTab(next);
    resetResult();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-md animate-in fade-in">
      <div
        className="w-full max-w-2xl max-h-[92dvh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-14 items-center justify-between border-b border-slate-800 px-4 sm:px-6 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 shrink-0">
              <Download className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm truncate">Import Profile</h3>
                <span className="hidden sm:flex items-center gap-1 rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/30 shrink-0">
                  <ShieldCheck className="w-3 h-3" /> Scripts Stripped
                </span>
                <span className="hidden md:flex items-center gap-1 rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-300 border border-indigo-500/30 shrink-0">
                  Opens in New Tab
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Imports become a new profile tab — your current work stays untouched
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 border-b border-slate-800 px-4 sm:px-6 py-2 bg-slate-950/30 shrink-0">
          <button
            onClick={() => switchTab('url')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              tab === 'url'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Import from URL</span>
          </button>
          <button
            onClick={() => switchTab('html')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              tab === 'html'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Import with HTML</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {tab === 'url' && (
            <form onSubmit={handleFetchUrl} className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                  Profile URL
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://bbs.example.com/member.php?u=1234"
                    className="flex-1 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                    autoFocus
                    disabled={status === 'loading'}
                  />
                  <button
                    type="submit"
                    disabled={status === 'loading' || !url.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Fetching…</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span className="hidden sm:inline">Fetch</span>
                      </>
                    )}
                  </button>
                </div>
              </label>

              {status === 'idle' && (
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                  <span>Try:</span>
                  {SAMPLE_URLS.map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setUrl(sample)}
                      className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-indigo-300 hover:bg-slate-700 transition-colors truncate max-w-[220px]"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              )}

              {status === 'loading' && progressMsg && (
                <div className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-2.5 text-[11px] text-indigo-200">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span className="font-mono">{progressMsg}</span>
                </div>
              )}

              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px] text-amber-200/90 leading-relaxed">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <span>
                    Fetching goes through public CORS proxies. Sites that require login or reject
                    proxies (Gaia Online, most forum profiles) will return <b>401/403</b>. Use{' '}
                    <b>Import with HTML</b> instead — open the page, view-source, then paste the
                    markup here.
                  </span>
                </div>
              </div>
            </form>
          )}

          {tab === 'html' && (
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <LinkIcon className="w-3.5 h-3.5 text-indigo-400" />
                  Source URL <span className="text-slate-500 font-normal">(optional — helps resolve relative image paths)</span>
                </span>
                <input
                  type="text"
                  value={htmlSourceUrl}
                  onChange={(e) => setHtmlSourceUrl(e.target.value)}
                  placeholder="https://example.com/profile/user123"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none font-mono"
                />
              </label>

              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <ClipboardPaste className="w-3.5 h-3.5 text-indigo-400" />
                  Paste HTML
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHtmlInput(SAMPLE_HTML_SNIPPET)}
                    className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-indigo-300 hover:bg-slate-700 transition-colors"
                  >
                    Load sample
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    <ClipboardPaste className="w-3 h-3" />
                    Paste
                  </button>
                  {htmlInput && (
                    <button
                      type="button"
                      onClick={() => setHtmlInput('')}
                      className="flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <textarea
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                placeholder={
                  '<style>...</style>\n<div class="profile_container">\n  <span style="color: #1">...</span>\n</div>'
                }
                spellCheck={false}
                className="w-full h-48 sm:h-56 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none font-mono resize-none"
              />

              <div className="flex items-center justify-between gap-2">
                <div className="text-[10px] text-slate-500 font-mono">
                  {htmlInput.length.toLocaleString()} chars
                </div>
                <button
                  type="button"
                  onClick={handleParseHtml}
                  disabled={!htmlInput.trim() || status === 'loading'}
                  className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-500 to-cyan-500 px-4 py-2 text-sm font-semibold text-white shadow hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Parsing…</span>
                    </>
                  ) : (
                    <>
                      <Code2 className="w-4 h-4" />
                      <span>Parse HTML</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-[11px] text-emerald-200/90 leading-relaxed">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span>
                All <code className="text-emerald-300">&lt;script&gt;</code> tags, inline event
                handlers, and <code className="text-emerald-300">javascript:</code> URLs are
                stripped before parsing.
              </span>
            </div>
          </div>

          {status === 'error' && (
            <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-red-200 mb-0.5">
                  {tab === 'url' ? 'Import failed' : 'Parse failed'}
                </div>
                <div className="text-[11px] text-red-300/90 break-words whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {error}
                </div>
                {tab === 'url' && (
                  <button
                    onClick={() => switchTab('html')}
                    className="mt-2 inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-100 hover:bg-red-500/30"
                  >
                    <Code2 className="w-3 h-3" />
                    Switch to &quot;Import with HTML&quot;
                  </button>
                )}
              </div>
            </div>
          )}

          {status === 'success' && result && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-emerald-200">
                    {tab === 'url' ? 'Fetch successful' : 'HTML parsed'} — will open as a new tab
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <StatCard label="Elements" value={result.elements.length} tint="indigo" />
                  <StatCard label="Scripts Removed" value={result.scriptsRemoved} tint="red" />
                  <StatCard
                    label="HTML Size"
                    value={`${(result.rawHtml.length / 1024).toFixed(1)}KB`}
                    tint="amber"
                  />
                  <StatCard
                    label="CSS Size"
                    value={`${(result.rawCss.length / 1024).toFixed(1)}KB`}
                    tint="cyan"
                  />
                </div>
              </div>

              {/* Scrape diagnostics: stylesheets, background, Gaia components */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2.5">
                <div className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Scrape Report
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <div className="text-slate-500 uppercase tracking-wider text-[9px]">Stylesheets</div>
                    <div className="font-mono text-sm text-slate-100">
                      {result.diagnostics.stylesheetsFetched}/{result.diagnostics.stylesheetsFound}
                    </div>
                    <div className="text-slate-500">fetched via proxy</div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <div className="text-slate-500 uppercase tracking-wider text-[9px]">Background</div>
                    <div className="font-mono text-sm text-slate-100 truncate">
                      {result.diagnostics.background.detected
                        ? result.diagnostics.background.image
                          ? 'image (style)'
                          : 'color (style)'
                        : 'none'}
                    </div>
                    <div className="text-slate-500 truncate" title={result.diagnostics.background.source}>
                      {result.diagnostics.background.source}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <div className="text-slate-500 uppercase tracking-wider text-[9px]">Components</div>
                    <div className="font-mono text-sm text-slate-100">{result.diagnostics.components.length}</div>
                    <div className="text-slate-500">categories detected</div>
                  </div>
                </div>

                {result.diagnostics.background.image && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <img
                      src={result.diagnostics.background.image}
                      alt="Detected background"
                      className="h-10 w-16 object-cover border border-slate-700"
                    />
                    <div className="min-w-0 text-[10px]">
                      <div className="font-semibold text-slate-200">Background resolved from CSS</div>
                      <div className="truncate font-mono text-slate-500">
                        {result.diagnostics.background.image}
                      </div>
                    </div>
                  </div>
                )}

                {result.diagnostics.components.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.diagnostics.components.map((component) => (
                      <span
                        key={component.kind}
                        className="rounded bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] font-mono text-indigo-200"
                        title={`columns: ${component.columns.join(', ') || '—'} · ${component.panelIds.join(', ')}`}
                      >
                        {component.label} ×{component.count}
                        {component.columns.length > 0 && (
                          <span className="text-indigo-400/80"> · col {component.columns.join('/')}</span>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {result.diagnostics.warnings.length > 0 && (
                  <ul className="space-y-1 text-[10px] text-amber-300/90">
                    {result.diagnostics.warnings.map((warning) => (
                      <li key={warning} className="flex items-start gap-1.5">
                        <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-amber-400" />
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Initial render mode picker */}
              <div>
                <div className="text-[11px] font-semibold text-slate-300 mb-1.5">
                  Initial View
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setInitialRenderMode('raw')}
                    className={`flex items-start gap-2 rounded-lg border p-2.5 text-left transition-all ${
                      initialRenderMode === 'raw'
                        ? 'border-cyan-500 bg-cyan-500/15 text-cyan-100'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <FileCode className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <div className="font-semibold">Faithful HTML</div>
                      <div className="text-[10px] opacity-70 leading-snug">
                        Render page as-is in sandboxed iframe
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setInitialRenderMode('canvas')}
                    className={`flex items-start gap-2 rounded-lg border p-2.5 text-left transition-all ${
                      initialRenderMode === 'canvas'
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-100'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Wand2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-[11px]">
                      <div className="font-semibold">Editable Canvas</div>
                      <div className="text-[10px] opacity-70 leading-snug">
                        Edit the same DOM/CSS structure as Faithful HTML
                      </div>
                    </div>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                  You can switch between views anytime from the Properties panel.
                </p>
              </div>

              {result.elements.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Reconstructed Elements
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-slate-800 bg-slate-950 p-2">
                    {result.elements.slice(0, 40).map((el, idx) => (
                      <div
                        key={el.id}
                        className="flex items-center justify-between rounded px-2 py-1 text-[11px] hover:bg-slate-900"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-slate-500 shrink-0">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300 shrink-0">
                            {el.type}
                          </span>
                          <span className="text-slate-200 truncate">
                            {el.content.slice(0, 50) || el.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                          {el.width}×{el.height}
                        </span>
                      </div>
                    ))}
                    {result.elements.length > 40 && (
                      <div className="text-center text-[10px] text-slate-500 py-1">
                        …and {result.elements.length - 40} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-800 px-4 sm:px-6 py-3 bg-slate-950/60 shrink-0">
          <span className="text-[10px] text-slate-500 truncate flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
            {result ? result.sourceUrl : tab === 'url' ? 'Awaiting URL' : 'Awaiting HTML paste'}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!result}
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-1.5 text-xs font-semibold text-white shadow disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Open in New Tab
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; tint: string }> = ({
  label,
  value,
  tint,
}) => {
  const tintMap: Record<string, string> = {
    indigo: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/30',
    red: 'text-red-300 bg-red-500/10 border-red-500/30',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    cyan: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30',
  };
  return (
    <div className={`rounded-lg border p-1.5 ${tintMap[tint] || tintMap.indigo}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-70">{label}</div>
      <div className="font-mono font-bold text-sm">{value}</div>
    </div>
  );
};
