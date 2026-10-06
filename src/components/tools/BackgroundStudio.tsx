import React, { useMemo, useState } from 'react';
import { Image as ImageIcon, Palette } from 'lucide-react';
import {
  BackgroundConfig,
  DEFAULT_BACKGROUND,
  backgroundCss,
} from '../../utils/toolPresets';
import { buildV2Document } from '../../utils/gaiaSpec';
import { GAIA_V2_DEFAULT_CSS } from '../../utils/gaiaDefaults';
import type { ImportedProfileSnapshot } from '../../features/shared/import';
import { ProfilePreview } from './ProfilePreview';
import { CssPane } from './CssPane';
import { buildToolsPreviewDocument } from './toolsPreviewDoc';

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
interface BackgroundStudioProps {
  /** The user's imported profile, when the Tools are previewing one. */
  imported?: ImportedProfileSnapshot | null;
}

export const BackgroundStudio: React.FC<BackgroundStudioProps> = ({ imported }) => {
  const [config, setConfig] = useState<BackgroundConfig>(DEFAULT_BACKGROUND);

  const css = useMemo(() => backgroundCss(config), [config]);

  /** Sample profile used when nothing has been imported. */
  const sampleDoc = useMemo(() => {
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

    // Gaia's default V2 styling, then the surface rule as an override.
    const baseCss = [GAIA_V2_DEFAULT_CSS, css].join('\n\n');

    return buildV2Document(columnsHtml, baseCss, 'Background Studio preview');
  }, [css]);

  /** The surface rule layered onto the user's own stylesheet chain. */
  const previewDoc = useMemo(
    () =>
      buildToolsPreviewDocument({
        imported,
        fallback: sampleDoc,
        extraCss: imported ? css : undefined,
      }),
    [imported, sampleDoc, css]
  );

  const update = (patch: Partial<BackgroundConfig>) => setConfig((prev) => ({ ...prev, ...patch }));

  const field =
    'w-full border border-slate-800 bg-slate-950 px-1.5 py-1 text-[10px] text-slate-100 focus:border-emerald-500 focus:outline-none';
  const fieldLabel = 'shrink-0 text-[9px] uppercase tracking-wider text-slate-500';

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      <div className="w-full min-w-0 border-slate-800 p-2 lg:w-1/2 lg:overflow-y-auto lg:border-r">
        <section className="border-b border-slate-800 pb-2">
          <header className="mb-1.5 flex items-center gap-1.5">
            <Palette className="h-3 w-3 text-emerald-400" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              Quick palettes
            </h3>
          </header>
          <div className="flex flex-wrap gap-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, ...preset.config }))}
                className="border border-slate-800 px-1.5 py-[3px] text-[10px] leading-none text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-white"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        <section className="border-b border-slate-800 py-2">
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
            Base surface
          </h3>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <label className="col-span-2 flex items-center gap-1.5">
              <span className={fieldLabel}>Colour</span>
              <input
                type="color"
                value={config.color}
                onChange={(event) => update({ color: event.target.value })}
                className="h-6 w-8 cursor-pointer border border-slate-800 bg-slate-950 p-0"
              />
              <input
                value={config.color}
                onChange={(event) => update({ color: event.target.value })}
                className={`${field} font-mono`}
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className={fieldLabel}>Gradient</span>
              <select
                value={config.gradient}
                onChange={(event) =>
                  update({ gradient: event.target.value as BackgroundConfig['gradient'] })
                }
                className={field}
              >
                <option value="none">None</option>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className={fieldLabel}>Attach</span>
              <select
                value={config.attachment}
                onChange={(event) =>
                  update({ attachment: event.target.value as BackgroundConfig['attachment'] })
                }
                className={field}
              >
                <option value="scroll">Scroll</option>
                <option value="fixed">Fixed</option>
              </select>
            </label>
          </div>

          {config.gradient !== 'none' && (
            <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <label className="flex items-center gap-1.5">
                <span className={fieldLabel}>From</span>
                <input
                  type="color"
                  value={config.gradientFrom}
                  onChange={(event) => update({ gradientFrom: event.target.value })}
                  className="h-6 w-8 cursor-pointer border border-slate-800 bg-slate-950 p-0"
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className={fieldLabel}>To</span>
                <input
                  type="color"
                  value={config.gradientTo}
                  onChange={(event) => update({ gradientTo: event.target.value })}
                  className="h-6 w-8 cursor-pointer border border-slate-800 bg-slate-950 p-0"
                />
              </label>
              <label className="col-span-2 flex items-center gap-1.5">
                <span className={fieldLabel}>
                  Angle {config.gradient === 'radial' ? 'n/a' : `${config.gradientAngle}deg`}
                </span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={config.gradientAngle}
                  disabled={config.gradient === 'radial'}
                  onChange={(event) => update({ gradientAngle: Number(event.target.value) })}
                  className="w-full accent-emerald-500 disabled:opacity-40"
                />
                <label className="flex shrink-0 items-center gap-1 text-[10px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.vignette}
                    onChange={(event) => update({ vignette: event.target.checked })}
                    className="accent-emerald-500"
                  />
                  Vignette
                </label>
              </label>
            </div>
          )}
        </section>

        <section className="py-2">
          <header className="mb-1.5 flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3 text-cyan-400" />
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
              Background image
            </h3>
          </header>
          <input
            value={config.image}
            onChange={(event) => update({ image: event.target.value })}
            placeholder="https://www.gaiaonline.com/.../background.png"
            className={`${field} font-mono`}
          />
          <div className="mt-1.5 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <label className="flex items-center gap-1.5">
              <span className={fieldLabel}>Repeat</span>
              <select
                value={config.repeat}
                onChange={(event) =>
                  update({ repeat: event.target.value as BackgroundConfig['repeat'] })
                }
                className={field}
              >
                <option value="no-repeat">no-repeat</option>
                <option value="repeat">repeat</option>
                <option value="repeat-x">repeat-x</option>
                <option value="repeat-y">repeat-y</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className={fieldLabel}>Size</span>
              <select
                value={config.size}
                onChange={(event) => update({ size: event.target.value as BackgroundConfig['size'] })}
                className={field}
              >
                <option value="cover">cover</option>
                <option value="contain">contain</option>
                <option value="auto">auto</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() =>
                update({
                  image: '',
                  gradient: 'radial',
                  gradientFrom: '#1e1b4b',
                  gradientTo: '#0b0f1a',
                  vignette: true,
                })
              }
              className="border border-slate-800 px-2 py-1 text-[10px] text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
            >
              Clear image
            </button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Gaia profiles often define their background as a CSS rule rather than an image element —
            this studio writes that rule directly, so imported backgrounds keep rendering.
          </p>
        </section>
      </div>

      {/* ---------------------- preview (70%) + CSS (30%) ------------------- */}
      <div className="flex w-full min-h-[520px] shrink-0 flex-col gap-2 border-t border-slate-800 bg-slate-950/60 p-2 lg:w-1/2 lg:min-h-0 lg:border-t-0">
        <ProfilePreview
          document={previewDoc}
          toolbar={
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Surface preview
              </span>
              {imported && (
                <span className="border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-200">
                  {imported.title}
                </span>
              )}
            </div>
          }
        />
        <CssPane css={css} title="Surface CSS" className="flex-none basis-[30%]" />
      </div>
    </div>
  );
};
