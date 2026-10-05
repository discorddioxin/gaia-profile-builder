import React, { useMemo, useState } from 'react';
import {
  Scissors,
  Eye,
  Sparkles,
  Shapes,
  Box,
  Wand2,
  Copy,
  Check,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  AnimationPreset,
  CanvasSettings,
  ClipConfig,
  MaskConfig,
  ProfileElement,
} from '../../types/profile';
import {
  CLIP_PRESETS,
  MASK_PRESETS,
  ANIMATION_PRESETS,
} from '../../utils/presets';
import {
  createGaiaPanelElement,
  GAIA_CATEGORIES,
  GAIA_COMPONENT_LIST,
  getGaiaComponent,
  xForColumn,
  GaiaComponentKind,
} from '../../utils/gaiaSpec';
import { transpileProfile } from '../../utils/bbcodeTranspiler';
import {
  MORPH_PRESETS,
  SURFACE_TOKENS,
  THREE_D_PRESETS,
} from '../../utils/toolPresets';
import { ToolsPreview } from './ToolsPreview';

const LAB_SETTINGS: CanvasSettings = {
  width: 1380,
  height: 720,
  backgroundColor: '#0b0f1a',
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

interface ComponentLabProps {
  onSendToBuilder: (element: ProfileElement) => void;
}

/**
 * Component Lab — pick a Gaia content type, stack tooling onto it (clip, mask,
 * motion, morph, 3D, surface) and export the result as real builder markup.
 */
export const ComponentLab: React.FC<ComponentLabProps> = ({ onSendToBuilder }) => {
  const [kind, setKind] = useState<GaiaComponentKind>('comments');
  const [column, setColumn] = useState<1 | 2 | 3>(2);
  const [title, setTitle] = useState('');
  const [accent, setAccent] = useState('#8b5cf6');
  const [clipPresetId, setClipPresetId] = useState<string | null>(null);
  const [maskPresetId, setMaskPresetId] = useState<string | null>(null);
  const [motionIds, setMotionIds] = useState<string[]>([]);
  const [motion, setMotion] = useState<MotionState>(DEFAULT_MOTION);
  const [surfaceIds, setSurfaceIds] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

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
        clip.vertices = preset.vertices.map((v) => ({ ...v }));
      }
    } else {
      clip.enabled = false;
    }

    const maskPreset = maskPresetId ? MASK_PRESETS.find((m) => m.id === maskPresetId) : null;
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
      .map((token) => token.css(accent))
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
      ].filter(Boolean).join(' ' ) || undefined,
    };
  }, [kind, column, title, def, clipPresetId, maskPresetId, motionIds, motion, surfaceIds, accent]);

  const output = useMemo(() => transpileProfile([element], LAB_SETTINGS), [element]);

  const selectedMotionPresets = ALL_MOTION_PRESETS.filter((preset) => motionIds.includes(preset.id));

  const toggleMotion = (id: string) =>
    setMotionIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const toggleSurface = (id: string) =>
    setSurfaceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const activeTools = [
    clipPresetId ? 'clip' : '',
    maskPresetId ? 'mask' : '',
    motionIds.length ? `motion:${motionIds.length}` : '',
    surfaceIds.length ? `surface:${surfaceIds.length}` : '',
  ].filter(Boolean);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  const reset = () => {
    setClipPresetId(null);
    setMaskPresetId(null);
    setMotionIds([]);
    setMotion(DEFAULT_MOTION);
    setSurfaceIds([]);
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
      {/* -------------------------------- controls ------------------------- */}
      <div className="w-full min-w-0 overflow-y-auto p-2.5 space-y-2.5 lg:w-1/2">
        {/* content type */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              1 · Gaia content type
            </h3>
            <span className="text-right font-mono text-[9px] leading-tight text-indigo-300" title="Root ID / title ID / Gaia panel class">
              {def.panelId ? `#${def.panelId} · #${def.titleId}` : `#id_custom_1 · #custom_1_title`} · .{def.panelClass.split(' ')[0]}
            </span>
          </div>
          <div className="space-y-3">
            {GAIA_CATEGORIES.map((category) => {
              const items = GAIA_COMPONENT_LIST.filter((d) => d.category === category);
              if (!items.length) return null;
              return (
                <div key={category}>
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {category}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => {
                      const active = item.kind === kind;
                      return (
                        <button
                          key={item.kind}
                          onClick={() => {
                            setKind(item.kind);
                            setColumn(item.defaultColumn);
                            setTitle('');
                          }}
                          title={item.description}
                          className={`rounded-lg border px-2 py-1 text-[11px] transition-colors ${
                            active
                              ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
                              : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Panel title</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={def.defaultTitle}
                className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] text-slate-500">Accent</span>
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-[30px] w-12 cursor-pointer rounded border border-slate-700 bg-slate-950 p-0.5"
              />
            </label>
          </div>
        </section>

        {/* clip + mask */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-2.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
            2 · Shape tooling
          </h3>

          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-200">
              <Scissors className="h-3.5 w-3.5 text-indigo-400" />
              Clip
              {clipPresetId && (
                <button
                  onClick={() => setClipPresetId(null)}
                  className="ml-auto text-[10px] text-slate-500 hover:text-slate-300"
                >
                  clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(CLIP_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => setClipPresetId(clipPresetId === key ? null : key)}
                  className={`rounded-lg border px-2 py-1 text-[11px] transition-colors ${
                    clipPresetId === key
                      ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-200">
              <Eye className="h-3.5 w-3.5 text-cyan-400" />
              Mask
              {maskPresetId && (
                <button
                  onClick={() => setMaskPresetId(null)}
                  className="ml-auto text-[10px] text-slate-500 hover:text-slate-300"
                >
                  clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MASK_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setMaskPresetId(maskPresetId === preset.id ? null : preset.id)}
                  className={`rounded-lg border px-2 py-1 text-[11px] transition-colors ${
                    maskPresetId === preset.id
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* motion */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              3 · Motion tooling
            </h3>
            {motionIds.length > 0 && (
              <button
                onClick={() => setMotionIds([])}
                className="text-[10px] text-slate-500 hover:text-slate-300"
              >
                clear selection
              </button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {MOTION_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{group.label}</div>
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
                        className={`rounded-lg border px-2 py-1 text-[10px] transition-colors ${active ? 'border-pink-400 bg-pink-500/20 text-pink-100' : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'}`}
                      >
                        <span className="mr-1">{preset.icon}</span>{preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Duration (s)</span><input type="number" min={0.2} step={0.2} value={motion.duration} onChange={(e) => setMotion((prev) => ({ ...prev, duration: Number(e.target.value) || 1 }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100" /></label>
            <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Delay (s)</span><input type="number" min={0} step={0.1} value={motion.delay} onChange={(e) => setMotion((prev) => ({ ...prev, delay: Number(e.target.value) || 0 }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100" /></label>
            <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Easing</span><select value={motion.timing} onChange={(e) => setMotion((prev) => ({ ...prev, timing: e.target.value as MotionState['timing'] }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"><option value="ease-in-out">ease-in-out</option><option value="ease">ease</option><option value="ease-out">ease-out</option><option value="linear">linear</option></select></label>
            <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Iterations</span><select value={motion.iteration} onChange={(e) => setMotion((prev) => ({ ...prev, iteration: e.target.value as MotionState['iteration'] }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"><option value="infinite">infinite</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label>
          </div>
          <details className="rounded-lg border border-slate-800 bg-slate-950/50 px-2.5 py-2">
            <summary className="cursor-pointer text-[10px] font-medium text-slate-300">Advanced motion properties · timing, playback and 3D depth</summary>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Direction</span><select value={motion.direction} onChange={(e) => setMotion((prev) => ({ ...prev, direction: e.target.value as MotionState['direction'] }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"><option value="normal">Normal</option><option value="alternate">Alternate</option><option value="reverse">Reverse</option></select></label>
              <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Stagger (s)</span><input type="number" min={0} step={0.1} value={motion.stagger} onChange={(e) => setMotion((prev) => ({ ...prev, stagger: Number(e.target.value) || 0 }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Fill mode</span><select value={motion.fillMode} onChange={(e) => setMotion((prev) => ({ ...prev, fillMode: e.target.value as MotionState['fillMode'] }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"><option value="none">None</option><option value="forwards">Forwards</option><option value="backwards">Backwards</option><option value="both">Both</option></select></label>
              <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Playback</span><select value={motion.playState} onChange={(e) => setMotion((prev) => ({ ...prev, playState: e.target.value as MotionState['playState'] }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"><option value="running">Running</option><option value="paused">Paused</option></select></label>
              <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Perspective (px)</span><input type="number" min={200} max={3000} step={50} value={motion.perspective} onChange={(e) => setMotion((prev) => ({ ...prev, perspective: Number(e.target.value) || 900 }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Rotate X (°)</span><input type="number" min={-90} max={90} value={motion.rotateX} onChange={(e) => setMotion((prev) => ({ ...prev, rotateX: Number(e.target.value) || 0 }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Rotate Y (°)</span><input type="number" min={-90} max={90} value={motion.rotateY} onChange={(e) => setMotion((prev) => ({ ...prev, rotateY: Number(e.target.value) || 0 }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100" /></label>
              <label className="flex flex-col gap-1"><span className="text-[10px] text-slate-500">Depth (px)</span><input type="number" min={-200} max={300} value={motion.depth} onChange={(e) => setMotion((prev) => ({ ...prev, depth: Number(e.target.value) || 0 }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100" /></label>
              <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-[10px] text-slate-500">Transform origin</span><select value={motion.origin} onChange={(e) => setMotion((prev) => ({ ...prev, origin: e.target.value as MotionState['origin'] }))} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"><option value="center center">Center</option><option value="top center">Top center</option><option value="bottom center">Bottom center</option><option value="left center">Left center</option><option value="right center">Right center</option></select></label>
            </div>
          </details>
          <p className="text-[10px] text-slate-500">Select and combine multiple animation, morph, and 3D layers. Advanced 3D controls drive perspective, axis rotation, transform origin, and depth.</p>
        </section>

        {/* surface */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
              4 · Surface tooling
            </h3>
            <span className="text-[10px] text-slate-500">stack as many as you like</span>
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {SURFACE_TOKENS.map((token) => {
              const active = surfaceIds.includes(token.id);
              return (
                <button
                  key={token.id}
                  onClick={() => toggleSurface(token.id)}
                  className={`flex items-start gap-2 rounded-xl border p-2 text-left transition-colors ${
                    active
                      ? 'border-emerald-400/60 bg-emerald-500/10'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <span className="text-base leading-none">{token.icon}</span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[11px] font-medium ${
                        active ? 'text-emerald-100' : 'text-slate-300'
                      }`}
                    >
                      {token.label}
                    </span>
                    <span className="block text-[10px] leading-snug text-slate-500">
                      {token.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* -------------------------------- preview -------------------------- */}
      <div className="flex w-full min-h-[440px] shrink-0 flex-col gap-2 border-t border-slate-800 bg-slate-950/60 p-2.5 lg:w-1/2 lg:min-h-0 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1.5">
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Column</span>
          <div className="flex min-w-0 flex-1 justify-end gap-1">
            {([
              { value: 1 as const, label: 'Left' },
              { value: 2 as const, label: 'Middle' },
              { value: 3 as const, label: 'Right' },
            ]).map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={column === option.value}
                title={`${option.label} column · default panel width ${DEFAULT_GAIA_COLUMN_WIDTH}px`}
                onClick={() => setColumn(option.value)}
                className={`rounded-md border px-2 py-1 text-[10px] transition-colors ${column === option.value ? 'border-indigo-400 bg-indigo-500/20 text-indigo-100' : 'border-slate-700 text-slate-400 hover:text-white'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className="shrink-0 font-mono text-[9px] text-slate-500">{DEFAULT_GAIA_COLUMN_WIDTH}px</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
            <Wand2 className="h-3.5 w-3.5 text-pink-400" />
            Live preview
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={reset}
              className="flex items-center gap-1 rounded-lg border border-slate-800 px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
            <button
              onClick={() => onSendToBuilder(element)}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-500 to-pink-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:brightness-110"
            >
              <Plus className="h-3.5 w-3.5" />
              Add to builder
            </button>
          </div>
        </div>

        <ToolsPreview document={output.fullDocument} />

        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
          {activeTools.length === 0 ? (
            <span>No tooling applied yet — the panel renders with its Gaia defaults.</span>
          ) : (
            activeTools.map((tool) => (
              <span
                key={tool}
                className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-indigo-300"
              >
                {tool}
              </span>
            ))
          )}
          {selectedMotionPresets.map((preset) => (
            <span key={preset.id} className="rounded bg-pink-500/10 px-1.5 py-0.5 font-mono text-[10px] text-pink-200">{preset.label}</span>
          ))}
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => copy('css', output.css)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 hover:border-slate-700"
          >
            {copied === 'css' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            Copy CSS
          </button>
          <button
            onClick={() => copy('html', output.columnsHtml)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 hover:border-slate-700"
          >
            {copied === 'html' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            Copy HTML
          </button>
        </div>

        <pre className="max-h-40 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-[10px] leading-relaxed text-slate-400">
          {[
            `/* ${def.label} — ${def.panelClass} */`,
            def.panelId ? `#${def.panelId} {` : `.${def.panelClass.split(' ')[0]} {`,
            row('min-height', `${element.height}px`),
            clipPresetId ? row('clip-path', CLIP_PRESETS[clipPresetId] ? 'polygon(…)' : 'none') : '',
            maskPresetId ? row('mask-image', `preset:${maskPresetId}`) : '',
            motionIds.length
              ? row('animation', `${motionIds.join(', ')} · ${motion.duration}s ${motion.timing}`)
              : '',
            surfaceIds.length ? row('surface', surfaceIds.join(', ')) : '',
            '}',
          ]
            .filter(Boolean)
            .join('\n')}
        </pre>
      </div>
    </div>
  );
};

const row = (prop: string, value: string) => `  ${prop}: ${value};`;
