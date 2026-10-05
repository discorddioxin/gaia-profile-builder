import React, { useMemo, useState } from 'react';
import { Copy, Check, Image as ImageIcon, Palette, Layers } from 'lucide-react';
import {
  BackgroundConfig,
  DEFAULT_BACKGROUND,
  backgroundCss,
} from '../../utils/toolPresets';
import { buildV2Document, GAIA_COLUMNS_BASE_CSS, GAIA_PANEL_BASE_CSS } from '../../utils/gaiaSpec';
import { ToolsPreview } from './ToolsPreview';

const PRESETS: Array<{ label: string; config: Partial<BackgroundConfig> }> = [
  { label: 'Midnight', config: { color: '#0b0f1a', gradient: 'none', vignette: false } },
  {
    label: 'Nebula',
    config: { color: '#0b0f1a', gradient: 'radial', gradientFrom: '#3b0764', gradientTo: '#020617', vignette: true },
  },
  {
    label: 'Sunset',
    config: { color: '#1c1917', gradient: 'linear', gradientFrom: '#f97316', gradientTo: '#7c3aed', gradientAngle: 165 },
  },
  {
    label: 'Deep Sea',
    config: { color: '#03151f', gradient: 'linear', gradientFrom: '#0e7490', gradientTo: '#020617', gradientAngle: 200, vignette: true },
  },
  {
    label: 'Starfield',
    config: {
      color: '#050510',
      gradient: 'radial',
      gradientFrom: '#1e1b4b',
      gradientTo: '#020208',
      image: 'https://www.gaiaonline.com/images/gaia_global/starfield.png',
      repeat: 'repeat',
      size: 'auto',
    },
  },
];

/**
 * Background Studio — builds the `body#viewer { … }` surface rule that Gaia V2
 * profiles keep, including backgrounds that only exist as CSS (never an <img>).
 */
export const BackgroundStudio: React.FC = () => {
  const [config, setConfig] = useState<BackgroundConfig>(DEFAULT_BACKGROUND);
  const [copied, setCopied] = useState(false);

  const css = useMemo(() => backgroundCss(config), [config]);

  const previewDoc = useMemo(() => {
    const columnsHtml = `<div id="columns">
  <div id="column_1" class="column focus_column">
    <div class="panel details_panel" id="id_details">
      <h2>Details</h2>
      <div class="postcontent"><p>Background preview</p></div>
      <div class="clear"></div>
    </div>
  </div>
  <div id="column_2" class="column focus_column">
    <div class="panel comments_panel" id="id_comments">
      <h2>Comments</h2>
      <div class="postcontent"><p>The surface rule sits behind every panel.</p></div>
      <div class="clear"></div>
    </div>
  </div>
  <div id="column_3" class="column focus_column"></div>
</div>`;

    const baseCss = [
      `body#viewer { margin: 0; color: #e2e8f0; font-family: 'Segoe UI', sans-serif; }`,
      GAIA_COLUMNS_BASE_CSS,
      GAIA_PANEL_BASE_CSS,
      css,
    ].join('\n\n');

    return buildV2Document(columnsHtml, baseCss, 'Background Studio preview');
  }, [css]);

  const update = (patch: Partial<BackgroundConfig>) => setConfig((prev) => ({ ...prev, ...patch }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
      <div className="flex-1 min-w-0 overflow-y-auto p-4 space-y-4">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <Palette className="h-3.5 w-3.5 text-emerald-400" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Quick palettes
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setConfig((prev) => ({ ...prev, ...preset.config }))}
                className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-slate-300 hover:border-emerald-500/50 hover:text-white"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            Base surface
          </h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Background colour</span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.color}
                  onChange={(e) => update({ color: e.target.value })}
                  className="h-8 w-12 cursor-pointer rounded border border-slate-700 bg-slate-950 p-0.5"
                />
                <input
                  value={config.color}
                  onChange={(e) => update({ color: e.target.value })}
                  className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-[11px] text-slate-200"
                />
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Gradient</span>
              <select
                value={config.gradient}
                onChange={(e) => update({ gradient: e.target.value as BackgroundConfig['gradient'] })}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-100"
              >
                <option value="none">None</option>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Attachment</span>
              <select
                value={config.attachment}
                onChange={(e) => update({ attachment: e.target.value as BackgroundConfig['attachment'] })}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-100"
              >
                <option value="scroll">Scroll</option>
                <option value="fixed">Fixed</option>
              </select>
            </label>
          </div>

          {config.gradient !== 'none' && (
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500">From</span>
                <input
                  type="color"
                  value={config.gradientFrom}
                  onChange={(e) => update({ gradientFrom: e.target.value })}
                  className="h-8 w-full cursor-pointer rounded border border-slate-700 bg-slate-950 p-0.5"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500">To</span>
                <input
                  type="color"
                  value={config.gradientTo}
                  onChange={(e) => update({ gradientTo: e.target.value })}
                  className="h-8 w-full cursor-pointer rounded border border-slate-700 bg-slate-950 p-0.5"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500">
                  Angle · {config.gradient === 'radial' ? 'n/a' : `${config.gradientAngle}°`}
                </span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={config.gradientAngle}
                  disabled={config.gradient === 'radial'}
                  onChange={(e) => update({ gradientAngle: Number(e.target.value) })}
                  className="accent-emerald-500 disabled:opacity-40"
                />
              </label>
              <label className="flex items-center gap-2 pt-4 text-[11px] text-slate-300">
                <input
                  type="checkbox"
                  checked={config.vignette}
                  onChange={(e) => update({ vignette: e.target.checked })}
                  className="accent-emerald-500"
                />
                Vignette
              </label>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5 text-cyan-400" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              Background image
            </h3>
          </div>
          <input
            value={config.image}
            onChange={(e) => update({ image: e.target.value })}
            placeholder="https://www.gaiaonline.com/…/background.png"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Repeat</span>
              <select
                value={config.repeat}
                onChange={(e) => update({ repeat: e.target.value as BackgroundConfig['repeat'] })}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-100"
              >
                <option value="no-repeat">no-repeat</option>
                <option value="repeat">repeat</option>
                <option value="repeat-x">repeat-x</option>
                <option value="repeat-y">repeat-y</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Size</span>
              <select
                value={config.size}
                onChange={(e) => update({ size: e.target.value as BackgroundConfig['size'] })}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-100"
              >
                <option value="cover">cover</option>
                <option value="contain">contain</option>
                <option value="auto">auto</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                onClick={() =>
                  update({
                    image: '',
                    gradient: 'radial',
                    gradientFrom: '#1e1b4b',
                    gradientTo: '#0b0f1a',
                    vignette: true,
                  })
                }
                className="w-full rounded-lg border border-slate-800 px-2 py-1.5 text-[11px] text-slate-400 hover:text-slate-200"
              >
                Clear image
              </button>
            </div>
          </div>
          <p className="text-[10px] leading-relaxed text-slate-500">
            Gaia profiles often define their background as a CSS rule rather than an image element —
            this studio writes that rule directly, so imported backgrounds keep rendering.
          </p>
        </section>
      </div>

      <div className="flex w-full shrink-0 flex-col gap-3 border-t border-slate-800 bg-slate-950/60 p-4 lg:w-[460px] lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            Surface preview
          </div>
          <button
            onClick={copy}
            className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-[10px] text-slate-200 hover:border-slate-700"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            Copy CSS
          </button>
        </div>
        <ToolsPreview document={previewDoc} height={280} />
        <pre className="overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[10px] leading-relaxed text-emerald-200">
          {css}
        </pre>
      </div>
    </div>
  );
};
