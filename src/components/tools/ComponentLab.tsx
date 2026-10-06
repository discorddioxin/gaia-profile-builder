import React, { useMemo, useState } from 'react';
import { Scissors, Eye, Wand2, Plus, RotateCcw } from 'lucide-react';
import {
  AnimationPreset,
  CanvasSettings,
  ClipConfig,
  MaskConfig,
  ProfileElement,
} from '../../types/profile';
import { ANIMATION_PRESETS, CLIP_PRESETS, MASK_PRESETS } from '../../utils/presets';
import {
  buildPanelHtml,
  createGaiaPanelElement,
  GAIA_CATEGORIES,
  GAIA_COMPONENT_LIST,
  getGaiaComponent,
  xForColumn,
  GaiaComponentKind,
} from '../../utils/gaiaSpec';
import { transpileProfile } from '../../utils/bbcodeTranspiler';
import { GAIA_DEFAULT_PAGE_BACKGROUND } from '../../utils/gaiaDefaults';
import { MORPH_PRESETS, SURFACE_TOKENS, THREE_D_PRESETS } from '../../utils/toolPresets';
import type { ImportedProfileSnapshot } from '../../features/shared/import';
import { ProfilePreview } from './ProfilePreview';
import { CssPane } from './CssPane';
import { buildToolsPreviewDocument } from './toolsPreviewDoc';

const LAB_SETTINGS: CanvasSettings = {
  width: 1380,
  height: 720,
  // Gaia's own page surface: the lab previews the stock V2 look, not a theme.
  backgroundColor: GAIA_DEFAULT_PAGE_BACKGROUND,
  backgroundRepeat: 'no-repeat',
  backgroundSize: 'cover',
  gridSnap: false,
  gridSize: 10,
  showGrid: false,
  profileTitle: 'Profile Tools Preview',
  forumTheme: 'dark-cyber',
};

// Gaia's documented profile shell caps #columns at 1000px. With 12px column
// gaps and 8px outer padding, this is the natural panel width in each column.
const DEFAULT_GAIA_COLUMN_WIDTH = Math.floor((Math.min(LAB_SETTINGS.width, 1000) - 40) / 3);

/** Accent used by the surface tokens (the lab exposes no colour control). */
const SURFACE_ACCENT = '#8b5cf6';

interface MotionState {
  duration: number;
  delay: number;
  stagger: number;
  timing: 'linear' | 'ease' | 'ease-in-out' | 'ease-out';
  iteration: 'infinite' | '1' | '2' | '3';
  direction: 'normal' | 'alternate' | 'reverse';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
  playState: 'running' | 'paused';
  perspective: number;
  rotateX: number;
  rotateY: number;
  depth: number;
  origin: 'center center' | 'top center' | 'bottom center' | 'left center' | 'right center';
}

const DEFAULT_MOTION: MotionState = {
  duration: 3,
  delay: 0,
  stagger: 0,
  timing: 'ease-in-out',
  iteration: 'infinite',
  direction: 'normal',
  fillMode: 'both',
  playState: 'running',
  perspective: 900,
  rotateX: 12,
  rotateY: 18,
  depth: 32,
  origin: 'center center',
};

const MOTION_GROUPS = [
  { label: 'Animations', ids: ANIMATION_PRESETS.slice(0, 11).map((preset) => preset.id) },
  { label: 'Morphs', ids: MORPH_PRESETS.map((preset) => preset.id) },
  { label: '3D', ids: THREE_D_PRESETS.map((preset) => preset.id) },
];
const ALL_MOTION_PRESETS = [
  ...ANIMATION_PRESETS.slice(0, 11),
  ...MORPH_PRESETS,
  ...THREE_D_PRESETS,
];

/** Flat chip used across the lab's option groups. */
const chipClass = (active: boolean) =>
  `border px-1.5 py-[3px] text-[10px] leading-none transition-colors ${
    active
      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
      : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
  }`;

const fieldClass =
  'w-full border border-slate-800 bg-slate-950 px-1.5 py-1 text-[10px] text-slate-100 focus:border-indigo-500 focus:outline-none';

const SectionHeader: React.FC<{ step: string; label: string; right?: React.ReactNode }> = ({
  step,
  label,
  right,
}) => (
  <header className="mb-1.5 flex items-center justify-between gap-2">
    <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-300">
      {step} · {label}
    </h3>
    {right}
  </header>
);

interface ComponentLabProps {
  onSendToBuilder: (element: ProfileElement) => void;
  /** The user's imported profile, when the Tools are previewing one. */
  imported?: ImportedProfileSnapshot | null;
}

/**
 * Component Lab — pick a Gaia content type, stack tooling onto it (clip, mask,
 * motion, morph, 3D, surface) and export the result as real builder markup.
 */
export const ComponentLab: React.FC<ComponentLabProps> = ({ onSendToBuilder, imported }) => {
  const [kind, setKind] = useState<GaiaComponentKind>('comments');
  const [column, setColumn] = useState<1 | 2 | 3>(imported?.defaultColumn ?? 2);
  const [title, setTitle] = useState('');
  const [clipPresetId, setClipPresetId] = useState<string | null>(null);
  const [maskPresetId, setMaskPresetId] = useState<string | null>(null);
  const [motionIds, setMotionIds] = useState<string[]>([]);
  const [motion, setMotion] = useState<MotionState>(DEFAULT_MOTION);
  const [surfaceIds, setSurfaceIds] = useState<string[]>([]);

  const def = useMemo(() => getGaiaComponent(kind), [kind]);

  /** The lab output is a genuine gaia-panel element, so exports match the builder. */
  const element = useMemo<ProfileElement>(() => {
    const base = createGaiaPanelElement(kind, column, 0, LAB_SETTINGS);
    const resolvedTitle = title.trim() || def.defaultTitle;
    const panelWidth = DEFAULT_GAIA_COLUMN_WIDTH;
    const panelX = xForColumn(LAB_SETTINGS, column, panelWidth);

    const clip: ClipConfig = { ...base.clip };
    if (clipPresetId) {
      const preset = CLIP_PRESETS[clipPresetId];
      if (preset) {
        clip.enabled = true;
        clip.type = 'polygon';
        clip.preset = clipPresetId;
        clip.vertices = preset.vertices.map((vertex) => ({ ...vertex }));
      }
    } else {
      clip.enabled = false;
    }

    const maskPreset = maskPresetId ? MASK_PRESETS.find((mask) => mask.id === maskPresetId) : null;
    const mask: MaskConfig = { ...base.mask };
    if (maskPreset) {
      mask.enabled = true;
      mask.preset = maskPreset.id;
      mask.type = maskPreset.type as MaskConfig['type'];
      mask.angle = maskPreset.angle;
      mask.feather = maskPreset.feather;
    } else {
      mask.enabled = false;
    }

    const surfaceCss = SURFACE_TOKENS.filter((token) => surfaceIds.includes(token.id))
      .map((token) => token.css(SURFACE_ACCENT))
      .join('; ');

    return {
      ...base,
      x: panelX,
      width: panelWidth,
      name: `${def.label} (tool)`,
      content: resolvedTitle,
      gaia: { ...base.gaia!, title: resolvedTitle },
      clip,
      mask,
      animation: motionIds.length
        ? {
            enabled: true,
            preset: motionIds[0] as AnimationPreset,
            duration: motion.duration,
            delay: motion.delay,
            timing: motion.timing,
            iteration: motion.iteration,
            direction: motion.direction,
            trigger: 'always',
          }
        : { ...base.animation, enabled: false },
      // A comma-separated animation list lets independent keyframes run at once.
      // `animation-composition: add` helps transform-based 3D/morph layers combine.
      customCss: [
        surfaceCss,
        motionIds.length
          ? `animation: ${motionIds.map((id, index) => `${id} ${motion.duration}s ${motion.timing} ${motion.delay + index * motion.stagger}s ${motion.iteration} ${motion.direction} ${motion.fillMode}`).join(', ')} !important; animation-play-state: ${motion.playState}; animation-composition: add; transform-style: preserve-3d; transform-origin: ${motion.origin}; perspective: ${motion.perspective}px; --tool-perspective: ${motion.perspective}px; --tool-rotate-x: ${motion.rotateX}deg; --tool-rotate-y: ${motion.rotateY}deg; --tool-depth: ${motion.depth}px; --tool-origin: ${motion.origin};`
          : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined,
    };
  }, [kind, column, title, def, clipPresetId, maskPresetId, motionIds, motion, surfaceIds]);

  const output = useMemo(() => transpileProfile([element], LAB_SETTINGS), [element]);

  /** The component as real V2 markup — appended to the imported profile's column. */
  const panelMarkup = useMemo(
    () =>
      buildPanelHtml(kind, {
        index: 1,
        title: element.gaia?.title || def.defaultTitle,
        bodyHtml: def.bodyHtml,
        panelId: def.panelId || 'id_custom_1',
      }),
    [kind, element.gaia?.title, def]
  );

  const previewDoc = useMemo(
    () =>
      buildToolsPreviewDocument({
        imported,
        fallback: output.fullDocument,
        extraCss: imported ? output.css : undefined,
        panel: imported ? { html: panelMarkup, column } : undefined,
      }),
    [imported, output.fullDocument, output.css, panelMarkup, column]
  );

  const selectedMotionPresets = ALL_MOTION_PRESETS.filter((preset) => motionIds.includes(preset.id));

  const toggleMotion = (id: string) =>
    setMotionIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );

  const toggleSurface = (id: string) =>
    setSurfaceIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const activeTools = [
    clipPresetId ? 'clip' : '',
    maskPresetId ? 'mask' : '',
    motionIds.length ? `motion:${motionIds.length}` : '',
    surfaceIds.length ? `surface:${surfaceIds.length}` : '',
  ].filter(Boolean);

  const reset = () => {
    setClipPresetId(null);
    setMaskPresetId(null);
    setMotionIds([]);
    setMotion(DEFAULT_MOTION);
    setSurfaceIds([]);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
      {/* -------------------------------- controls ------------------------- */}
      <div className="w-full min-w-0 border-slate-800 lg:w-1/2 lg:overflow-y-auto lg:border-r">
        {/* content type */}
        <section className="border-b border-slate-800 p-2">
          <SectionHeader
            step="1"
            label="Gaia content type"
            right={
              <span
                className="shrink-0 font-mono text-[9px] text-indigo-300"
                title="Root ID / title ID / Gaia panel class"
              >
                {def.panelId ? `#${def.panelId} · #${def.titleId} · .${def.panelClass.split(' ')[0]}` : '#id_custom_1 · #custom_1_title · .panel'}
              </span>
            }
          />

          {/* Dense category matrix — five columns of small chips, like the
              reference layout, so every content type fits without scrolling. */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3 xl:grid-cols-5">
            {GAIA_CATEGORIES.map((category) => {
              const items = GAIA_COMPONENT_LIST.filter((item) => item.category === category);
              if (!items.length) return null;
              return (
                <div key={category}>
                  <div className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                    {category}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {items.map((item) => (
                      <button
                        key={item.kind}
                        type="button"
                        title={item.description}
                        aria-pressed={item.kind === kind}
                        onClick={() => {
                          setKind(item.kind);
                          setColumn(item.defaultColumn);
                          setTitle('');
                        }}
                        className={chipClass(item.kind === kind)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <label className="mt-2 flex items-center gap-2">
            <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">
              Panel title
            </span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={def.defaultTitle}
              className={`${fieldClass} font-mono`}
            />
          </label>
        </section>

        {/* clip + mask */}
        <section className="border-b border-slate-800 p-2">
          <SectionHeader step="2" label="Shape tooling" />
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center gap-1 text-[10px] text-slate-400">
                <Scissors className="h-3 w-3 text-indigo-400" />
                Clip
                {clipPresetId && (
                  <button
                    type="button"
                    onClick={() => setClipPresetId(null)}
                    className="ml-auto text-[9px] text-slate-500 hover:text-slate-300"
                  >
                    clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(CLIP_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={clipPresetId === key}
                    onClick={() => setClipPresetId(clipPresetId === key ? null : key)}
                    className={chipClass(clipPresetId === key)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center gap-1 text-[10px] text-slate-400">
                <Eye className="h-3 w-3 text-cyan-400" />
                Mask
                {maskPresetId && (
                  <button
                    type="button"
                    onClick={() => setMaskPresetId(null)}
                    className="ml-auto text-[9px] text-slate-500 hover:text-slate-300"
                  >
                    clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {MASK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={maskPresetId === preset.id}
                    onClick={() => setMaskPresetId(maskPresetId === preset.id ? null : preset.id)}
                    className={chipClass(maskPresetId === preset.id)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* motion */}
        <section className="border-b border-slate-800 p-2">
          <SectionHeader
            step="3"
            label="Motion tooling"
            right={
              motionIds.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setMotionIds([])}
                  className="text-[9px] text-slate-500 hover:text-slate-300"
                >
                  clear selection
                </button>
              ) : undefined
            }
          />

          <div className="grid gap-x-3 gap-y-1.5 sm:grid-cols-3">
            {MOTION_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                  <Wand2 className="h-2.5 w-2.5 text-pink-400" />
                  {group.label}
                </div>
                <div className="flex flex-wrap gap-1">
                  {group.ids.map((id) => {
                    const preset = ALL_MOTION_PRESETS.find((item) => item.id === id);
                    if (!preset) return null;
                    const active = motionIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleMotion(id)}
                        title={preset.description}
                        className={`${chipClass(active)} ${
                          active ? '!border-pink-400 !bg-pink-500/20 !text-pink-100' : ''
                        }`}
                      >
                        <span className="mr-0.5">{preset.icon}</span>
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <label className="flex items-center gap-1.5">
              <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Dur</span>
              <input
                type="number"
                min={0.2}
                step={0.2}
                value={motion.duration}
                onChange={(event) =>
                  setMotion((prev) => ({ ...prev, duration: Number(event.target.value) || 1 }))
                }
                className={fieldClass}
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Delay</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={motion.delay}
                onChange={(event) =>
                  setMotion((prev) => ({ ...prev, delay: Number(event.target.value) || 0 }))
                }
                className={fieldClass}
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Ease</span>
              <select
                value={motion.timing}
                onChange={(event) =>
                  setMotion((prev) => ({ ...prev, timing: event.target.value as MotionState['timing'] }))
                }
                className={fieldClass}
              >
                <option value="ease-in-out">ease-in-out</option>
                <option value="ease">ease</option>
                <option value="ease-out">ease-out</option>
                <option value="linear">linear</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Iter</span>
              <select
                value={motion.iteration}
                onChange={(event) =>
                  setMotion((prev) => ({
                    ...prev,
                    iteration: event.target.value as MotionState['iteration'],
                  }))
                }
                className={fieldClass}
              >
                <option value="infinite">infinite</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </label>
          </div>

          <details className="mt-1.5 border border-slate-800">
            <summary className="cursor-pointer px-2 py-1 text-[10px] text-slate-400">
              Advanced motion properties — timing, playback and 3D depth
            </summary>
            <div className="grid grid-cols-2 gap-1.5 border-t border-slate-800 p-2 sm:grid-cols-4">
              <label className="flex items-center gap-1.5">
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Dir</span>
                <select
                  value={motion.direction}
                  onChange={(event) =>
                    setMotion((prev) => ({
                      ...prev,
                      direction: event.target.value as MotionState['direction'],
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="normal">Normal</option>
                  <option value="alternate">Alternate</option>
                  <option value="reverse">Reverse</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Stagger</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={motion.stagger}
                  onChange={(event) =>
                    setMotion((prev) => ({ ...prev, stagger: Number(event.target.value) || 0 }))
                  }
                  className={fieldClass}
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Fill</span>
                <select
                  value={motion.fillMode}
                  onChange={(event) =>
                    setMotion((prev) => ({
                      ...prev,
                      fillMode: event.target.value as MotionState['fillMode'],
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="none">None</option>
                  <option value="forwards">Forwards</option>
                  <option value="backwards">Backwards</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Play</span>
                <select
                  value={motion.playState}
                  onChange={(event) =>
                    setMotion((prev) => ({
                      ...prev,
                      playState: event.target.value as MotionState['playState'],
                    }))
                  }
                  className={fieldClass}
                >
                  <option value="running">Running</option>
                  <option value="paused">Paused</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5">
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Persp</span>
                <input
                  type="number"
                  min={200}
                  max={3000}
                  step={50}
                  value={motion.perspective}
                  onChange={(event) =>
                    setMotion((prev) => ({ ...prev, perspective: Number(event.target.value) || 900 }))
                  }
                  className={fieldClass}
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Rot X</span>
                <input
                  type="number"
                  min={-90}
                  max={90}
                  value={motion.rotateX}
                  onChange={(event) =>
                    setMotion((prev) => ({ ...prev, rotateX: Number(event.target.value) || 0 }))
                  }
                  className={fieldClass}
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Rot Y</span>
                <input
                  type="number"
                  min={-90}
                  max={90}
                  value={motion.rotateY}
                  onChange={(event) =>
                    setMotion((prev) => ({ ...prev, rotateY: Number(event.target.value) || 0 }))
                  }
                  className={fieldClass}
                />
              </label>
              <label className="flex items-center gap-1.5">
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Depth</span>
                <input
                  type="number"
                  min={-200}
                  max={300}
                  value={motion.depth}
                  onChange={(event) =>
                    setMotion((prev) => ({ ...prev, depth: Number(event.target.value) || 0 }))
                  }
                  className={fieldClass}
                />
              </label>
              <label className="col-span-2 flex items-center gap-1.5">
                <span className="shrink-0 text-[9px] uppercase tracking-wider text-slate-500">Origin</span>
                <select
                  value={motion.origin}
                  onChange={(event) =>
                    setMotion((prev) => ({ ...prev, origin: event.target.value as MotionState['origin'] }))
                  }
                  className={fieldClass}
                >
                  <option value="center center">Center</option>
                  <option value="top center">Top center</option>
                  <option value="bottom center">Bottom center</option>
                  <option value="left center">Left center</option>
                  <option value="right center">Right center</option>
                </select>
              </label>
            </div>
          </details>
        </section>

        {/* surface */}
        <section className="p-2">
          <SectionHeader
            step="4"
            label="Surface tooling"
            right={<span className="text-[9px] text-slate-500">stack as many as you like</span>}
          />
          <div className="grid gap-1 sm:grid-cols-2">
            {SURFACE_TOKENS.map((token) => {
              const active = surfaceIds.includes(token.id);
              return (
                <button
                  key={token.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleSurface(token.id)}
                  title={token.description}
                  className={`flex items-baseline gap-1.5 border px-1.5 py-1 text-left transition-colors ${
                    active
                      ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-100'
                      : 'border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="text-[11px] leading-none">{token.icon}</span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-medium leading-tight">{token.label}</span>
                    <span className="block text-[9px] leading-tight text-slate-500">
                      {token.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* ---------------------- preview (70%) + CSS (30%) ------------------- */}
      <div className="flex w-full min-h-[520px] shrink-0 flex-col gap-2 border-t border-slate-800 bg-slate-950/60 p-2 lg:w-1/2 lg:min-h-0 lg:border-t-0">
        {/* Column the component is built into — also the column it is appended
            to in the preview (and exported into). */}
        <div
          data-column-chooser
          className="flex shrink-0 items-center gap-2 border border-slate-800 px-2 py-1"
        >
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Column
          </span>
          <div className="flex items-stretch border border-slate-800">
            {([
              { value: 1 as const, label: 'Left' },
              { value: 2 as const, label: 'Middle' },
              { value: 3 as const, label: 'Right' },
            ]).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={column === option.value}
                title={`${option.label} column · ${DEFAULT_GAIA_COLUMN_WIDTH}px panel width`}
                onClick={() => setColumn(option.value)}
                className={`border-r border-slate-800 px-2 py-[3px] text-[10px] last:border-r-0 ${
                  column === option.value
                    ? 'bg-slate-700/70 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="ml-auto font-mono text-[9px] text-slate-500">
            {DEFAULT_GAIA_COLUMN_WIDTH}px
            {imported ? ' · appends to your profile' : ' · sample profile'}
          </span>
        </div>

        <ProfilePreview
          document={previewDoc}
          toolbar={
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Live preview
              </span>
              {imported ? (
                <span className="border border-cyan-500/40 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[9px] text-cyan-200">
                  imported · {imported.title}
                </span>
              ) : (
                <span className="border border-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-500">
                  sample profile
                </span>
              )}
            </div>
          }
          actions={
            <>
              <button
                type="button"
                onClick={reset}
                title="Clear every tooling layer"
                className="flex items-center gap-1 border border-slate-800 px-2 py-0.5 text-[10px] text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
              <button
                type="button"
                onClick={() => onSendToBuilder(element)}
                className="flex items-center gap-1 border border-indigo-400/60 bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-100 transition-colors hover:bg-indigo-500/30"
              >
                <Plus className="h-3 w-3" />
                Add to builder
              </button>
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-1 font-mono text-[9px] text-slate-500">
          {activeTools.length === 0 ? (
            <span>No tooling applied — the panel renders with its Gaia defaults.</span>
          ) : (
            activeTools.map((tool) => (
              <span key={tool} className="border border-slate-800 px-1.5 py-0.5 text-indigo-300">
                {tool}
              </span>
            ))
          )}
          {selectedMotionPresets.map((preset) => (
            <span key={preset.id} className="border border-pink-500/30 px-1.5 py-0.5 text-pink-200">
              {preset.label}
            </span>
          ))}
        </div>

        {/* 30% of the column height, with the CSS/Tree toggle and Copy CSS. */}
        <CssPane css={output.css} className="flex-none basis-[30%]" />
      </div>
    </div>
  );
};
