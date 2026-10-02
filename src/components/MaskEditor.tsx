import React from 'react';
import { Eye, RotateCw, Check, Sparkles } from 'lucide-react';
import { MaskConfig, ProfileElement } from '../types/profile';
import { MASK_PRESETS } from '../utils/presets';

interface MaskEditorProps {
  element: ProfileElement;
  onUpdateMask: (mask: MaskConfig) => void;
  onClose?: () => void;
}

export const MaskEditor: React.FC<MaskEditorProps> = ({ element, onUpdateMask, onClose }) => {
  const mask = element.mask || {
    enabled: false,
    type: 'linear-gradient',
    preset: 'fade-bottom',
    angle: 180,
    stops: [],
    feather: 30,
    invert: false,
    shape: 'circle',
  };

  const update = (partial: Partial<MaskConfig>) => {
    onUpdateMask({
      ...mask,
      ...partial,
      enabled: true,
    });
  };

  const handleApplyPreset = (p: (typeof MASK_PRESETS)[0]) => {
    update({
      preset: p.id,
      type: p.type as MaskConfig['type'],
      angle: p.angle,
      feather: p.feather,
    });
  };

  // Preview gradient
  const previewGradient =
    mask.type === 'radial-gradient'
      ? `radial-gradient(circle, #a855f7 ${Math.max(0, 100 - mask.feather)}%, transparent 100%)`
      : `linear-gradient(${mask.angle}deg, #a855f7 0%, #a855f7 ${Math.max(0, 100 - mask.feather)}%, transparent 100%)`;

  return (
    <div className="space-y-4 text-xs text-slate-300">
      {/* Header & Enable Toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
            <Eye className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-100">Masking & Mask Creation</h4>
            <p className="text-[10px] text-slate-400">CSS mask-image gradient generator</p>
          </div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={mask.enabled}
            onChange={(e) => onUpdateMask({ ...mask, enabled: e.target.checked })}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-slate-700 peer-checked:bg-purple-500 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
        </label>
      </div>

      {mask.enabled && (
        <>
          {/* Mask Presets */}
          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                Mask Presets
              </span>
              <span className="text-[10px]">Click to apply</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MASK_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleApplyPreset(p)}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-all ${
                    mask.preset === p.id
                      ? 'border-purple-500 bg-purple-500/20 text-purple-200 shadow'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="h-6 w-6 rounded border border-slate-700 shrink-0"
                    style={{ background: p.preview }}
                  />
                  <div className="truncate">
                    <div className="font-medium text-[11px] truncate">{p.label}</div>
                    <div className="text-[9px] text-slate-400 capitalize">{p.type.replace('-gradient', '')}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Type Selector: Linear vs Radial */}
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => update({ type: 'linear-gradient', preset: 'custom' })}
              className={`rounded py-1 text-center font-medium transition-colors ${
                mask.type === 'linear-gradient'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Linear Gradient
            </button>
            <button
              onClick={() => update({ type: 'radial-gradient', preset: 'custom' })}
              className={`rounded py-1 text-center font-medium transition-colors ${
                mask.type === 'radial-gradient'
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Radial Spotlight
            </button>
          </div>

          {/* Interactive Mask Visual Preview */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-slate-400 font-medium">Mask Preview & Blend</span>
            <div className="relative mx-auto flex h-28 w-full items-center justify-center rounded-xl border border-slate-800 bg-slate-950 p-2 overflow-hidden">
              {/* Checkerboard transparency background */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage:
                    'linear-gradient(45deg, #475569 25%, transparent 25%), linear-gradient(-45deg, #475569 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #475569 75%), linear-gradient(-45deg, transparent 75%, #475569 75%)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                }}
              />
              <div
                className="relative h-20 w-3/4 rounded-lg shadow-lg flex items-center justify-center text-xs font-semibold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #ec4899)',
                  WebkitMaskImage: previewGradient,
                  maskImage: previewGradient,
                }}
              >
                Mask Result
              </div>
            </div>
          </div>

          {/* Linear Angle Dial/Slider */}
          {mask.type === 'linear-gradient' && (
            <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1 text-slate-300">
                  <RotateCw className="w-3.5 h-3.5 text-purple-400" />
                  Gradient Angle
                </span>
                <span className="font-mono text-purple-400">{mask.angle}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={mask.angle}
                onChange={(e) => update({ angle: Number(e.target.value), preset: 'custom' })}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <button onClick={() => update({ angle: 0, preset: 'custom' })}>Top (0°)</button>
                <button onClick={() => update({ angle: 90, preset: 'custom' })}>Right (90°)</button>
                <button onClick={() => update({ angle: 180, preset: 'custom' })}>Down (180°)</button>
                <button onClick={() => update({ angle: 270, preset: 'custom' })}>Left (270°)</button>
              </div>
            </div>
          )}

          {/* Feathering / Softness Slider */}
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">Feather / Soft Edge Blur</span>
              <span className="font-mono text-purple-400">{mask.feather}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="95"
              value={mask.feather}
              onChange={(e) => update({ feather: Number(e.target.value), preset: 'custom' })}
              className="w-full accent-purple-500"
            />
            <p className="text-[10px] text-slate-400">
              Higher values create softer, ghosted edge transparency.
            </p>
          </div>

          {/* Live CSS Code */}
          <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400">CSS Output:</span>
            <div className="font-mono text-[10px] text-purple-400 break-all select-all mt-0.5">
              -webkit-mask-image: {previewGradient};
            </div>
          </div>
        </>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-purple-600 py-1.5 text-xs font-semibold text-white hover:bg-purple-500 transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> Done
        </button>
      )}
    </div>
  );
};
