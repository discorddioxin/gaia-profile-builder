import React, { useCallback, useMemo, useState } from 'react';
import { Scissors, Eye, Wand2, Plus, RotateCcw, X } from 'lucide-react';
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
  measureColumnShell,
  shellColumnWidth,
  xForColumn,
  GAIA_CATEGORIES,
  GAIA_COMPONENT_LIST,
  GAIA_SHELL_WIDTH,
  getGaiaComponent,
  GaiaComponentKind,
} from '../../utils/gaiaSpec';
import { transpileProfile } from '../../utils/bbcodeTranspiler';
import { GAIA_DEFAULT_PAGE_BACKGROUND } from '../../utils/gaiaDefaults';
import { MORPH_PRESETS, SURFACE_TOKENS, THREE_D_PRESETS } from '../../utils/toolPresets';
import type { ImportedProfileSnapshot } from '../../features/shared/import';
import { OptionDropdown, type DropdownOption } from './OptionDropdown';
import { buildToolsPreviewDocument } from './toolsPreviewDoc';
import { useToolsPreview } from './ToolsPreviewContext';

const LAB_SETTINGS: CanvasSettings = {
  width: GAIA_SHELL_WIDTH,
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

/** Accent used by the surface tokens (the lab exposes no colour control). */
const SURFACE_ACCENT = '#8b5cf6';

/** Per-layer motion settings — every selected layer has its own row. */
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

interface MotionLayer {
  id: string;
  settings: MotionState;
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

const MOTION_OPTIONS: DropdownOption[] = [
  ...ANIMATION_PRESETS.slice(0, 11).map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    icon: <span>{preset.icon}</span>,
    group: 'Animations',
  })),
  ...MORPH_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    icon: <span>{preset.icon}</span>,
    group: 'Morphs',
  })),
  ...THREE_D_PRESETS.map((preset) => ({
    id: preset.id,
    label: preset.label,
    description: preset.description,
    icon: <span>{preset.icon}</span>,
    group: '3D',
  })),
];

const ALL_MOTION_PRESETS = [...ANIMATION_PRESETS.slice(0, 11), ...MORPH_PRESETS, ...THREE_D_PRESETS];

const chipClass = (active: boolean) =>
  `border px-1.5 py-[3px] text-[10px] leading-none transition-colors ${
    active
      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
      : 'border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
  }`;

const fieldClass =
  'w-full border border-slate-800 bg-slate-950 px-1.5 py-1 text-[10px] text-slate-100 focus:border-indigo-500 focus:outline-none';

const labelClass = 'shrink-0 text-[9px] uppercase tracking-wider text-slate-500';

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
  /** Whether this lab is the visible tab (its preview is the one on screen). */
  active?: boolean;
}

/**
 * Component Lab — pick a Gaia content type, stack tooling onto it (clip, mask,
 * motion, morph, 3D, surface) and export the result as real builder markup. The
 * controls live in the left-hand 30% column; the preview and CSS belong to the
 * Tools shell, so this component only publishes them.
 */
export const ComponentLab: React.FC<ComponentLabProps> = ({ onSendToBuilder, imported, active = true }) => {
  const [kind, setKind] = useState<GaiaComponentKind>('comments');
  const [column, setColumn] = useState<1 | 2 | 3>(imported?.defaultColumn ?? 2);
  const [title, setTitle] = useState('');
  const [clipPresetId, setClipPresetId] = useState<string | null>(null);
  const [maskPresetId, setMaskPresetId] = useState<string | null>(null);
  const [motionLayers, setMotionLayers] = useState<MotionLayer[]>([]);
  const [surfaceIds, setSurfaceIds] = useState<string[]>([]);

  const def = useMemo(() => getGaiaComponent(kind), [kind]);
  // The preview is laid out with the profile's own column geometry: Gaia's
  // stock 230 / 500 / 230 shell, or the imported profile's overrides.
  const shell = useMemo(
    () => measureColumnShell(imported ? imported.rawCss : null),
    [imported]
  );
  const panelWidth = shellColumnWidth(shell, column);
  const previewWidth = shell.total;

  const toggleMotion = useCallback((id: string) => {
    setMotionLayers((current) =>
      current.some((layer) => layer.id === id)
        ? current.filter((layer) => layer.id !== id)
        : [...current, { id, settings: { ...DEFAULT_MOTION } }]
    );
  }, []);

  const updateMotion = useCallback((id: string, patch: Partial<MotionState>) => {
    setMotionLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, settings: { ...layer.settings, ...patch } } : layer))
    );
  }, []);

  const removeMotion = useCallback((id: string) => {
    setMotionLayers((current) => current.filter((layer) => layer.id !== id));
  }, []);

  const toggleSurface = useCallback((id: string) => {
    setSurfaceIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }, []);

  const reset = useCallback(() => {
    setClipPresetId(null);
    setMaskPresetId(null);
    setMotionLayers([]);
    setSurfaceIds([]);
  }, []);

  /** The lab output is a genuine gaia-panel element, so exports match the builder. */
  const element = useMemo<ProfileElement>(() => {
    const base = createGaiaPanelElement(kind, column, 0, LAB_SETTINGS);
    const resolvedTitle = title.trim() || def.defaultTitle;

    const clip: ClipConfig = { ...base.clip };
    const clipPreset = clipPresetId ? CLIP_PRESETS[clipPresetId] : null;
    if (clipPreset) {
      clip.enabled = true;
      clip.type = 'polygon';
      clip.preset = clipPresetId!;
      clip.vertices = clipPreset.vertices.map((vertex) => ({ ...vertex }));
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

    // Each layer keeps its own timing (and its own play state), so one panel can
    // run a slow morph next to a fast 3D tilt. The 3D context variables are
    // element-scoped — CSS variables cannot vary per animation — so the first
    // layer carries them.
    const first = motionLayers[0]?.settings;
    const animationList = motionLayers
      .map(
        (layer) =>
          `${layer.id} ${layer.settings.duration}s ${layer.settings.timing} ${layer.settings.delay}s ${layer.settings.iteration} ${layer.settings.direction} ${layer.settings.fillMode}`
      )
      .join(', ');
    const playStates = motionLayers.map((layer) => layer.settings.playState).join(', ');

    return {
      ...base,
      // Where Gaia itself would put the panel inside #columns.
      x: xForColumn(LAB_SETTINGS, column, panelWidth, shell),
      width: panelWidth,
      name: `${def.label} (tool)`,
      content: resolvedTitle,
      gaia: { ...base.gaia!, title: resolvedTitle },
      clip,
      mask,
      animation: motionLayers.length
        ? {
            enabled: true,
            preset: motionLayers[0].id as AnimationPreset,
            duration: motionLayers[0].settings.duration,
            delay: motionLayers[0].settings.delay,
            timing: motionLayers[0].settings.timing,
            iteration: motionLayers[0].settings.iteration,
            direction: motionLayers[0].settings.direction,
            trigger: 'always',
          }
        : { ...base.animation, enabled: false },
      // A comma-separated animation list lets independent keyframes run at once.
      // `animation-composition: add` helps transform-based 3D/morph layers combine.
      customCss: [
        surfaceCss,
        motionLayers.length
          ? `animation: ${animationList} !important; animation-play-state: ${playStates}; animation-composition: add; transform-style: preserve-3d; transform-origin: ${first!.origin}; perspective: ${first!.perspective}px; --tool-perspective: ${first!.perspective}px; --tool-rotate-x: ${first!.rotateX}deg; --tool-rotate-y: ${first!.rotateY}deg; --tool-depth: ${first!.depth}px; --tool-origin: ${first!.origin};`
          : '',
      ]
        .filter(Boolean)
        .join(' ') || undefined,
    };
  }, [kind, column, panelWidth, shell, title, def, clipPresetId, maskPresetId, motionLayers, surfaceIds]);

  const output = useMemo(() => transpileProfile([element], LAB_SETTINGS), [element]);

  const previewDoc = useMemo(
    () =>
      buildToolsPreviewDocument({
        imported,
        fallback: output.fullDocument,
        extraCss: imported ? output.css : undefined,
        panel: imported
          ? {
              html: buildPanelHtml(kind, {
                index: 1,
                title: element.gaia?.title || def.defaultTitle,
                bodyHtml: def.bodyHtml,
                panelId: def.panelId || 'id_custom_1',
              }),
              column,
            }
          : undefined,
      }),
    [imported, output.fullDocument, output.css, kind, element.gaia?.title, def, column]
  );

  const activeToolCount =
    (clipPresetId ? 1 : 0) + (maskPresetId ? 1 : 0) + motionLayers.length + surfaceIds.length;

  const strip = useMemo(
    () => (
      <div
        data-column-chooser
        className="flex shrink-0 items-center gap-2 border border-slate-800 px-2 py-1"
      >
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Column
        </span>
        <div className="flex items-stretch border border-slate-800">
          {(
            [
              { value: 1 as const, label: 'Left' },
              { value: 2 as const, label: 'Middle' },
              { value: 3 as const, label: 'Right' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={column === option.value}
              title={`${option.label} column · column width ${shellColumnWidth(shell, option.value)}px`}
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
          column {panelWidth}px · shell {shell.total}px ·{' '}
          {shell.stock ? 'Gaia defaults' : 'your profile'}
        </span>
      </div>
    ),
    [column, panelWidth, shell]
  );

  const header = useMemo(
    () => (
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
        <span className="font-mono text-[9px] text-slate-500">
          {activeToolCount === 0 ? 'no tooling applied' : `${activeToolCount} tool layer(s)`}
        </span>
      </div>
    ),
    [imported, activeToolCount]
  );

  const actions = useMemo(
    () => (
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
    ),
    [reset, onSendToBuilder, element]
  );

  useToolsPreview(
    useMemo(
      () => ({
        document: previewDoc,
        width: previewWidth,
        css: output.css,
        cssTitle: 'Panel CSS',
        header,
        actions,
        strip,
      }),
      [previewDoc, previewWidth, output.css, header, actions, strip]
    ),
    active
  );

  const clipOptions: DropdownOption[] = useMemo(
    () =>
      Object.entries(CLIP_PRESETS).map(([key, preset]) => ({
        id: key,
        label: preset.label,
      })),
    []
  );

  const surfaceOptions: DropdownOption[] = useMemo(
    () =>
      SURFACE_TOKENS.map((token) => ({
        id: token.id,
        label: token.label,
        description: token.description,
      })),
    []
  );

  return (
    /* ------------------------------ options (30%) ------------------------------ */
    <div className="w-full min-w-0">
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
              {def.panelId
                ? `#${def.panelId} · #${def.titleId} · .${def.panelClass.split(' ')[0]}`
                : '#id_custom_1 · #custom_1_title · .panel'}
            </span>
          }
        />

        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3">
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
          <span className={labelClass}>Panel title</span>
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
        <div className="grid gap-1.5 sm:grid-cols-2">
          <OptionDropdown
            name="clip"
            label="Clip"
            icon={<Scissors className="h-3 w-3 text-indigo-400" />}
            summary={clipPresetId ? CLIP_PRESETS[clipPresetId]?.label || clipPresetId : 'none'}
            options={clipOptions}
            selected={clipPresetId ? [clipPresetId] : []}
            onToggle={(id) => setClipPresetId((current) => (current === id ? null : id))}
            onClear={() => setClipPresetId(null)}
            hint="Clip the panel into a polygon shape."
          />
          <OptionDropdown
            name="mask"
            label="Mask"
            icon={<Eye className="h-3 w-3 text-cyan-400" />}
            summary={maskPresetId ? MASK_PRESETS.find((m) => m.id === maskPresetId)?.label || maskPresetId : 'none'}
            options={MASK_PRESETS.map((preset) => ({ id: preset.id, label: preset.label }))}
            selected={maskPresetId ? [maskPresetId] : []}
            onToggle={(id) => setMaskPresetId((current) => (current === id ? null : id))}
            onClear={() => setMaskPresetId(null)}
            accent="cyan"
            hint="Feather, fade or spot-light the panel edges."
          />
        </div>
      </section>

      {/* motion */}
      <section className="border-b border-slate-800 p-2">
        <SectionHeader
          step="3"
          label="Motion tooling"
          right={
            <span className="text-[9px] text-slate-500">
              {motionLayers.length === 0
                ? 'none selected'
                : `${motionLayers.length} layer${motionLayers.length === 1 ? '' : 's'}`}
            </span>
          }
        />

        <OptionDropdown
          name="motion"
          label="Motion layers"
          icon={<Wand2 className="h-3 w-3 text-pink-400" />}
          summary={
            motionLayers.length === 0
              ? 'none'
              : motionLayers
                  .map((layer) => ALL_MOTION_PRESETS.find((preset) => preset.id === layer.id)?.label || layer.id)
                  .join(', ')
          }
          options={MOTION_OPTIONS}
          selected={motionLayers.map((layer) => layer.id)}
          onToggle={toggleMotion}
          onClear={() => setMotionLayers([])}
          accent="pink"
          hint="Pick as many animation, morph and 3D layers as you like — each gets its own row below."
        />

        {/* One row per selected layer: each tool is tuned on its own. */}
        <div className="mt-1.5 space-y-1.5">
          {motionLayers.map((layer, index) => {
            const preset = ALL_MOTION_PRESETS.find((item) => item.id === layer.id);
            const settings = layer.settings;
            const first = index === 0;
            return (
              <div key={layer.id} data-motion-layer={layer.id} className="border border-slate-800">
                <div className="flex items-center gap-1.5 border-b border-slate-800 bg-slate-900/50 px-1.5 py-1">
                  <span className="shrink-0">{preset?.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-pink-100">
                    {preset?.label || layer.id}
                  </span>
                  <button
                    type="button"
                    title="Reset this layer"
                    onClick={() => updateMotion(layer.id, DEFAULT_MOTION)}
                    className="shrink-0 p-0.5 text-slate-500 transition-colors hover:text-slate-200"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    title="Remove this layer"
                    onClick={() => removeMotion(layer.id)}
                    className="shrink-0 p-0.5 text-slate-500 transition-colors hover:text-slate-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5 p-1.5 sm:grid-cols-4">
                  <label className="flex items-center gap-1.5">
                    <span className={labelClass}>Dur</span>
                    <input
                      type="number"
                      min={0.2}
                      step={0.2}
                      value={settings.duration}
                      onChange={(event) =>
                        updateMotion(layer.id, { duration: Number(event.target.value) || 1 })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className={labelClass}>Delay</span>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={settings.delay}
                      onChange={(event) =>
                        updateMotion(layer.id, { delay: Number(event.target.value) || 0 })
                      }
                      className={fieldClass}
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className={labelClass}>Ease</span>
                    <select
                      value={settings.timing}
                      onChange={(event) =>
                        updateMotion(layer.id, { timing: event.target.value as MotionState['timing'] })
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
                    <span className={labelClass}>Iter</span>
                    <select
                      value={settings.iteration}
                      onChange={(event) =>
                        updateMotion(layer.id, {
                          iteration: event.target.value as MotionState['iteration'],
                        })
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

                <details className="border-t border-slate-800">
                  <summary className="cursor-pointer px-1.5 py-1 text-[10px] text-slate-400">
                    {preset?.label} · advanced — direction, playback, 3D context
                  </summary>
                  <div className="grid grid-cols-2 gap-1.5 border-t border-slate-800 p-1.5 sm:grid-cols-4">
                    <label className="flex items-center gap-1.5">
                      <span className={labelClass}>Dir</span>
                      <select
                        value={settings.direction}
                        onChange={(event) =>
                          updateMotion(layer.id, {
                            direction: event.target.value as MotionState['direction'],
                          })
                        }
                        className={fieldClass}
                      >
                        <option value="normal">Normal</option>
                        <option value="alternate">Alternate</option>
                        <option value="reverse">Reverse</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className={labelClass}>Fill</span>
                      <select
                        value={settings.fillMode}
                        onChange={(event) =>
                          updateMotion(layer.id, {
                            fillMode: event.target.value as MotionState['fillMode'],
                          })
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
                      <span className={labelClass}>Play</span>
                      <select
                        value={settings.playState}
                        onChange={(event) =>
                          updateMotion(layer.id, {
                            playState: event.target.value as MotionState['playState'],
                          })
                        }
                        className={fieldClass}
                      >
                        <option value="running">Running</option>
                        <option value="paused">Paused</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <span className={labelClass}>Stagger</span>
                      <input
                        type="number"
                        min={0}
                        step={0.1}
                        value={settings.stagger}
                        onChange={(event) =>
                          updateMotion(layer.id, { stagger: Number(event.target.value) || 0 })
                        }
                        className={fieldClass}
                      />
                    </label>

                    {/* CSS variables are element-scoped, so the 3D context is
                        shared — the first layer's values are the ones emitted. */}
                    <label
                      className={`flex items-center gap-1.5 ${first ? '' : 'opacity-60'}`}
                      title={first ? 'Element-scoped 3D context' : '3D context is shared — the first layer carries it'}
                    >
                      <span className={labelClass}>Persp</span>
                      <input
                        type="number"
                        min={200}
                        max={3000}
                        step={50}
                        value={settings.perspective}
                        onChange={(event) =>
                          updateMotion(layer.id, { perspective: Number(event.target.value) || 900 })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className={`flex items-center gap-1.5 ${first ? '' : 'opacity-60'}`}>
                      <span className={labelClass}>Rot X</span>
                      <input
                        type="number"
                        min={-90}
                        max={90}
                        value={settings.rotateX}
                        onChange={(event) =>
                          updateMotion(layer.id, { rotateX: Number(event.target.value) || 0 })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className={`flex items-center gap-1.5 ${first ? '' : 'opacity-60'}`}>
                      <span className={labelClass}>Rot Y</span>
                      <input
                        type="number"
                        min={-90}
                        max={90}
                        value={settings.rotateY}
                        onChange={(event) =>
                          updateMotion(layer.id, { rotateY: Number(event.target.value) || 0 })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className={`flex items-center gap-1.5 ${first ? '' : 'opacity-60'}`}>
                      <span className={labelClass}>Depth</span>
                      <input
                        type="number"
                        min={-200}
                        max={300}
                        value={settings.depth}
                        onChange={(event) =>
                          updateMotion(layer.id, { depth: Number(event.target.value) || 0 })
                        }
                        className={fieldClass}
                      />
                    </label>
                    <label className={`col-span-2 flex items-center gap-1.5 ${first ? '' : 'opacity-60'}`}>
                      <span className={labelClass}>Origin</span>
                      <select
                        value={settings.origin}
                        onChange={(event) =>
                          updateMotion(layer.id, {
                            origin: event.target.value as MotionState['origin'],
                          })
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
                    {!first && (
                      <p className="col-span-2 text-[9px] leading-snug text-slate-600 sm:col-span-4">
                        3D context (perspective, rotation, depth, origin) is element-scoped and taken
                        from the first layer; timing above applies to this layer alone.
                      </p>
                    )}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </section>

      {/* surface */}
      <section className="p-2">
        <SectionHeader step="4" label="Surface tooling" />
        <OptionDropdown
          name="surface"
          label="Surfaces"
          summary={surfaceIds.length === 0 ? 'none' : `${surfaceIds.length} token(s)`}
          options={surfaceOptions}
          selected={surfaceIds}
          onToggle={toggleSurface}
          onClear={() => setSurfaceIds([])}
          accent="emerald"
          hint="Stack as many surface tokens as you like."
        />
      </section>
    </div>
  );
};
