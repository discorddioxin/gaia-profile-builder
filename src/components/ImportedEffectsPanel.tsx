import React, { useMemo } from 'react';
import { AnimationConfig, ClipConfig, MaskConfig, ProfileElement } from '../types/profile';
import { ANIMATION_PRESETS, CLIP_PRESETS } from '../utils/presets';
import { getAnimationKeyframes, getClipPathCss, getMaskCss } from '../utils/bbcodeTranspiler';
import { ClipEditor } from './ClipEditor';
import { MaskEditor } from './MaskEditor';
import { AnimationEditor } from './AnimationEditor';
import { ImportedEffectsPatch, ImportedNodeEffects, ImportedNodeInfo } from './EditableImportedCanvas';
import { Move, Sparkles, Scissors, Eye, Layers, Undo2 } from 'lucide-react';

interface ImportedEffectsPanelProps {
  node: ImportedNodeInfo;
  effects: ImportedNodeEffects | null;
  /** Which editors to show. */
  section: 'shape' | 'animation' | 'position';
  onApplyEffects: (bbId: string, patch: ImportedEffectsPatch) => void;
  onMakeAbsolute: (bbId: string) => void;
  onMakeFlow: (bbId: string) => void;
  multiSelectCount?: number;
}

/**
 * Clip / mask / animation / absolute-plane controls for an *imported* profile
 * node. The heavy lifting lives in the shared editors — this component adapts
 * the node's computed CSS into the builder's config objects, then writes the
 * result back to the live DOM as CSS.
 */
export const ImportedEffectsPanel: React.FC<ImportedEffectsPanelProps> = ({
  node,
  effects,
  section,
  onApplyEffects,
  onMakeAbsolute,
  onMakeFlow,
  multiSelectCount = 0,
}) => {
  // --- parse current CSS back into builder configs -------------------------
  const clip: ClipConfig = useMemo(
    () => parseClip(effects?.clipPath || ''),
    [effects?.clipPath]
  );
  const mask: MaskConfig = useMemo(() => parseMask(effects), [effects]);
  const animation: AnimationConfig = useMemo(
    () => parseAnimation(effects?.animation || ''),
    [effects?.animation]
  );

  /** Editors only read clip/mask/animation off this shell. */
  const shell = useMemo(
    () =>
      ({
        id: node.bbId,
        name: node.id ? `#${node.id}` : node.tag,
        type: 'box',
        content: '',
        colorMarker: '#1',
        useAttributeSelector: false,
        clip,
        mask,
        animation,
      }) as unknown as ProfileElement,
    [node.bbId, node.id, node.tag, clip, mask, animation]
  );

  const applyClip = (next: ClipConfig) => {
    const css = getClipPathCss({ clip: next } as ProfileElement);
    onApplyEffects(node.bbId, { clipPath: css || null });
  };

  const applyMask = (next: MaskConfig) => {
    const { webkitMask } = getMaskCss({ mask: next } as ProfileElement);
    onApplyEffects(node.bbId, { maskImage: webkitMask || null });
  };

  const applyAnimation = (next: AnimationConfig) => {
    if (!next.enabled) {
      onApplyEffects(node.bbId, { animation: null, hoverAnimation: null });
      return;
    }
    const rule = `${next.preset} ${next.duration}s ${next.timing} ${next.delay}s ${next.iteration} ${next.direction}`;
    if (next.trigger === 'hover') {
      // Hover rules live in the exported effects stylesheet, keyed on the node.
      onApplyEffects(node.bbId, { animation: null, hoverAnimation: `animation: ${rule};` });
    } else {
      onApplyEffects(node.bbId, { animation: rule, hoverAnimation: null });
    }
  };

  const isAbsolute = effects?.isAbsolute ?? false;

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-mono text-[11px] text-slate-200">
              {node.id ? `#${node.id}` : `<${node.tag}>`}
            </div>
            <div className="text-[10px] text-slate-500">
              {node.semanticRole !== 'generic' ? node.semanticRole : 'imported node'}
              {multiSelectCount > 1 ? ` · ${multiSelectCount} selected` : ''}
            </div>
          </div>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-mono ${
              isAbsolute
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {isAbsolute ? 'absolute' : 'in flow'}
          </span>
        </div>
      </div>

      {section === 'position' && (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
            <Move className="h-3.5 w-3.5 text-emerald-400" />
            Positioning Plane
          </div>
          <p className="text-[10px] leading-relaxed text-slate-400">
            Detach this component from the column flow to position it with absolute
            coordinates. It stays inside its Gaia column, so the profile keeps valid V2
            structure while the panel is placed freely.
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => onMakeAbsolute(node.bbId)}
              disabled={isAbsolute}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600/20 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-40"
            >
              <Layers className="h-3.5 w-3.5" />
              Make Absolute
            </button>
            <button
              onClick={() => onMakeFlow(node.bbId)}
              disabled={!isAbsolute}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-40"
            >
              <Undo2 className="h-3.5 w-3.5" />
              Return to Flow
            </button>
          </div>
          {isAbsolute && (
            <div className="rounded border border-emerald-500/25 bg-emerald-500/5 p-2 font-mono text-[10px] text-emerald-200/90">
              position: absolute · left/top set · drag the component on the canvas to move it
              {effects?.offsetParentId ? ` · relative to #${effects.offsetParentId}` : ''}
            </div>
          )}
        </div>
      )}

      {section === 'shape' && (
        <>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
              <Scissors className="h-3.5 w-3.5 text-indigo-400" />
              Clipping
              {clip.enabled && (
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 font-mono text-[9px] text-indigo-200">
                  active
                </span>
              )}
            </div>
            <ClipEditor element={shell} onUpdateClip={applyClip} />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
              <Eye className="h-3.5 w-3.5 text-cyan-400" />
              Masking
              {mask.enabled && (
                <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[9px] text-cyan-200">
                  active
                </span>
              )}
            </div>
            <MaskEditor element={shell} onUpdateMask={applyMask} />
          </div>

          {(clip.enabled || mask.enabled) && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-1.5">
              <div className="text-[10px] font-semibold text-slate-300">Generated CSS</div>
              <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-2 font-mono text-[10px] text-indigo-200">
                {[
                  clip.enabled ? `clip-path: ${getClipPathCss({ clip } as ProfileElement)};` : '',
                  mask.enabled ? `-webkit-mask-image: ${getMaskCss({ mask } as ProfileElement).webkitMask};` : '',
                  mask.enabled ? `mask-image: ${getMaskCss({ mask } as ProfileElement).mask};` : '',
                ]
                  .filter(Boolean)
                  .join('\n')}
              </pre>
            </div>
          )}
        </>
      )}

      {section === 'animation' && (
        <>
          <AnimationEditor element={shell} onUpdateAnimation={applyAnimation} />
          {animation.enabled && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
                <Sparkles className="h-3 w-3 text-pink-400" />
                Exported CSS
              </div>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-2 font-mono text-[10px] text-pink-200">
                {animation.trigger === 'hover'
                  ? `${node.id ? `#${node.id}` : `.${node.tag}`}:hover {\n  animation: ${animation.preset} ${animation.duration}s ${animation.timing} ${animation.delay}s ${animation.iteration} ${animation.direction};\n}`
                  : `animation: ${animation.preset} ${animation.duration}s ${animation.timing} ${animation.delay}s ${animation.iteration} ${animation.direction};`}
                {'\n\n'}
                {extractKeyframes(animation.preset)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* CSS → config parsing                                                        */
/* -------------------------------------------------------------------------- */

export function parseClip(value: string): ClipConfig {
  const base: ClipConfig = {
    enabled: !!value,
    type: 'polygon',
    preset: 'hexagon',
    vertices: CLIP_PRESETS.hexagon.vertices,
    circleRadius: 50,
    circleCenterX: 50,
    circleCenterY: 50,
    insetRadius: 12,
    customValue: '',
  };
  if (!value || value === 'none') return { ...base, enabled: false };

  const polygon = value.match(/polygon\(([^)]+)\)/i);
  if (polygon) {
    const points = polygon[1]
      .split(',')
      .map((part) => {
        const [x, y] = part.trim().split(/\s+/);
        return { x: parseFloat(x) || 0, y: parseFloat(y) || 0 };
      })
      .filter((p) => !Number.isNaN(p.x) && !Number.isNaN(p.y));
    if (points.length >= 3) {
      const preset = matchClipPreset(points);
      return { ...base, enabled: true, type: 'polygon', preset, vertices: points, customValue: value };
    }
  }

  const circle = value.match(/circle\(([\d.]+)%\s+at\s+([\d.]+)%\s+([\d.]+)%\)/i);
  if (circle) {
    return {
      ...base,
      enabled: true,
      type: 'circle',
      circleRadius: parseFloat(circle[1]),
      circleCenterX: parseFloat(circle[2]),
      circleCenterY: parseFloat(circle[3]),
      customValue: value,
    };
  }

  const inset = value.match(/inset\(([\d.]+)px/i);
  if (inset) {
    return { ...base, enabled: true, type: 'inset', insetRadius: parseFloat(inset[1]), customValue: value };
  }

  return { ...base, enabled: true, preset: 'custom', customValue: value };
}

function matchClipPreset(points: Array<{ x: number; y: number }>): string {
  const key = (list: Array<{ x: number; y: number }>) =>
    list.map((p) => `${Math.round(p.x)},${Math.round(p.y)}`).join(' ');
  const target = key(points);
  const found = Object.entries(CLIP_PRESETS).find(
    ([, preset]) => Array.isArray(preset.vertices) && preset.vertices.length >= 3 && key(preset.vertices) === target
  );
  return found ? found[0] : 'custom';
}

export function parseMask(effects: ImportedNodeEffects | null): MaskConfig {
  const value = effects?.webkitMaskImage || effects?.maskImage || '';
  const base: MaskConfig = {
    enabled: false,
    type: 'linear-gradient',
    preset: 'fade-bottom',
    angle: 180,
    stops: [],
    feather: 30,
    invert: false,
    shape: 'circle',
    customValue: '',
  };
  if (!value || value === 'none') return base;

  const radial = value.match(/radial-gradient\(([^)]+)\)/i);
  if (radial) {
    const inner = radial[1];
    const featherMatch = inner.match(/black\s+([\d.]+)%/);
    return {
      ...base,
      enabled: true,
      type: 'radial-gradient',
      preset: /closest-side/i.test(inner) ? 'diamond' : 'custom',
      shape: /ellipse/i.test(inner) ? 'ellipse' : 'circle',
      feather: featherMatch ? Math.max(0, 100 - parseFloat(featherMatch[1])) : 30,
      customValue: value,
    };
  }

  const linear = value.match(/linear-gradient\(([\d.]+)deg/i);
  if (linear) {
    const stops = Array.from(value.matchAll(/(black|transparent)\s+([\d.]+)%/gi)).map((m) => ({
      color: m[1].toLowerCase(),
      stop: parseFloat(m[2]),
    }));
    const solid = stops.find((stop) => stop.color === 'black');
    return {
      ...base,
      enabled: true,
      type: 'linear-gradient',
      preset: 'custom',
      angle: parseFloat(linear[1]),
      feather: solid ? Math.max(0, 100 - solid.stop) : 30,
      stops,
      customValue: value,
    };
  }

  return { ...base, enabled: true, preset: 'custom', customValue: value };
}

export function parseAnimation(value: string): AnimationConfig {
  const base: AnimationConfig = {
    enabled: false,
    preset: 'float',
    duration: 3,
    delay: 0,
    timing: 'ease-in-out',
    iteration: 'infinite',
    direction: 'normal',
    trigger: 'always',
  };
  if (!value || value === 'none') return base;

  const parts = value.trim().split(/\s+/);
  const preset = parts[0];
  const duration = parts.find((p) => /^[\d.]+m?s$/.test(p)) || '3s';
  const timing = parts.find((p) => /ease|linear|cubic-bezier/.test(p)) || 'ease-in-out';
  const delay = parts.filter((p) => /^[\d.]+m?s$/.test(p))[1] || '0s';
  const iteration = parts.find((p) => p === 'infinite' || /^\d+$/.test(p)) || 'infinite';
  const direction = parts.find((p) => ['normal', 'reverse', 'alternate', 'alternate-reverse'].includes(p)) || 'normal';

  return {
    ...base,
    enabled: true,
    preset: (ANIMATION_PRESETS.some((entry) => entry.id === preset) ? preset : 'float') as AnimationConfig['preset'],
    duration: parseFloat(duration) || 3,
    delay: parseFloat(delay) || 0,
    timing: timing as AnimationConfig['timing'],
    iteration: (iteration === 'infinite' ? 'infinite' : iteration) as AnimationConfig['iteration'],
    direction: direction as AnimationConfig['direction'],
  };
}

function extractKeyframes(preset: string): string {
  const all = getAnimationKeyframes();
  const start = all.indexOf(`@keyframes ${preset}`);
  if (start === -1) return '';
  const open = all.indexOf('{', start);
  if (open === -1) return '';
  let depth = 0;
  for (let i = open; i < all.length; i += 1) {
    if (all[i] === '{') depth += 1;
    else if (all[i] === '}') {
      depth -= 1;
      if (depth === 0) return all.slice(start, i + 1);
    }
  }
  return '';
}
