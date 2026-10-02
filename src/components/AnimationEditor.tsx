import React from 'react';
import { Sparkles, Check, Flame } from 'lucide-react';
import { AnimationConfig, AnimationPreset, ProfileElement } from '../types/profile';
import { ANIMATION_PRESETS } from '../utils/presets';

interface AnimationEditorProps {
  element: ProfileElement;
  onUpdateAnimation: (anim: AnimationConfig) => void;
  onClose?: () => void;
}

export const AnimationEditor: React.FC<AnimationEditorProps> = ({
  element,
  onUpdateAnimation,
  onClose,
}) => {
  const anim = element.animation || {
    enabled: false,
    preset: 'float',
    duration: 3,
    delay: 0,
    timing: 'ease-in-out',
    iteration: 'infinite',
    direction: 'alternate',
    trigger: 'always',
  };

  const update = (partial: Partial<AnimationConfig>) => {
    onUpdateAnimation({
      ...anim,
      ...partial,
      enabled: true,
    });
  };

  const animRule = `${anim.preset} ${anim.duration}s ${anim.timing} ${anim.delay}s ${anim.iteration} ${anim.direction}`;

  return (
    <div className="space-y-4 text-xs text-slate-300">
      {/* Header & Enable Switch */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-100">Animation Modification</h4>
            <p className="text-[10px] text-slate-400">Pure CSS keyframes engine (No JS)</p>
          </div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={anim.enabled}
            onChange={(e) => onUpdateAnimation({ ...anim, enabled: e.target.checked })}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-slate-700 peer-checked:bg-cyan-500 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
        </label>
      </div>

      {anim.enabled && (
        <>
          {/* Live Animation Interactive Preview Card */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Live Animation Scrubber</span>
            <div className="relative mx-auto flex h-24 w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-3 overflow-hidden">
              <div
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg select-none cursor-pointer"
                style={{
                  animation: anim.trigger === 'hover' ? 'none' : animRule,
                }}
              >
                <Flame className="w-4 h-4 text-amber-300" />
                <span>{anim.preset}</span>
              </div>
            </div>
            {anim.trigger === 'hover' && (
              <p className="text-[10px] text-cyan-400/90 text-center italic">
                (Trigger is set to &quot;On Hover&quot; — animates when hovered)
              </p>
            )}
          </div>

          {/* Preset Selector Grid */}
          <div>
            <div className="mb-1.5 text-[11px] text-slate-400 font-medium">Animation Presets</div>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
              {ANIMATION_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => update({ preset: p.id as AnimationPreset })}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-all ${
                    anim.preset === p.id
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-200 shadow'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="text-base">{p.icon}</span>
                  <div className="truncate">
                    <div className="font-semibold text-[11px] truncate">{p.label}</div>
                    <div className="text-[9px] text-slate-400 truncate">{p.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Trigger Mode: Always vs Hover */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Trigger Mode</span>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
              <button
                onClick={() => update({ trigger: 'always' })}
                className={`rounded py-1 text-center font-medium transition-colors ${
                  anim.trigger === 'always'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Always (Continuous)
              </button>
              <button
                onClick={() => update({ trigger: 'hover' })}
                className={`rounded py-1 text-center font-medium transition-colors ${
                  anim.trigger === 'hover'
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                On Hover (:hover)
              </button>
            </div>
          </div>

          {/* Timing & Sliders */}
          <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
            {/* Duration Slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Duration</span>
                <span className="font-mono text-cyan-400">{anim.duration}s</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="8"
                step="0.1"
                value={anim.duration}
                onChange={(e) => update({ duration: Number(e.target.value) })}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Delay Slider */}
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span>Start Delay</span>
                <span className="font-mono text-cyan-400">{anim.delay}s</span>
              </div>
              <input
                type="range"
                min="0"
                max="4"
                step="0.1"
                value={anim.delay}
                onChange={(e) => update({ delay: Number(e.target.value) })}
                className="w-full accent-cyan-500"
              />
            </div>

            {/* Easing / Timing Function */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Timing Function</span>
                <select
                  value={anim.timing}
                  onChange={(e) => update({ timing: e.target.value as AnimationConfig['timing'] })}
                  className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1 text-slate-200 text-[11px]"
                >
                  <option value="ease">ease</option>
                  <option value="ease-in-out">ease-in-out</option>
                  <option value="ease-out">ease-out</option>
                  <option value="linear">linear</option>
                  <option value="cubic-bezier(0.4, 0, 0.2, 1)">smooth-cubic</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Iteration</span>
                <select
                  value={anim.iteration}
                  onChange={(e) => update({ iteration: e.target.value as AnimationConfig['iteration'] })}
                  className="w-full rounded bg-slate-800 border border-slate-700 px-2 py-1 text-slate-200 text-[11px]"
                >
                  <option value="infinite">infinite</option>
                  <option value="1">1 time</option>
                  <option value="2">2 times</option>
                  <option value="3">3 times</option>
                </select>
              </div>
            </div>

            {/* Direction */}
            <div>
              <span className="text-[10px] text-slate-400 block mb-1">Direction</span>
              <div className="grid grid-cols-3 gap-1">
                {(['normal', 'alternate', 'reverse'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => update({ direction: dir })}
                    className={`rounded py-1 text-center text-[10px] capitalize transition-colors ${
                      anim.direction === dir
                        ? 'bg-slate-700 text-white font-medium'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Pure CSS Output */}
          <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400">Pure CSS Rule:</span>
            <div className="font-mono text-[10px] text-cyan-400 break-all select-all mt-0.5">
              {anim.trigger === 'hover' ? ':hover { animation: ' : 'animation: '}
              {animRule}; {anim.trigger === 'hover' ? '}' : ''}
            </div>
          </div>
        </>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-cyan-600 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> Done
        </button>
      )}
    </div>
  );
};
