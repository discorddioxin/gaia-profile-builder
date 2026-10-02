import React, { useState, useRef } from 'react';
import { Scissors, Plus, Trash2, RotateCcw, Check, Sparkles } from 'lucide-react';
import { ClipConfig, ClipPoint, ProfileElement } from '../types/profile';
import { CLIP_PRESETS } from '../utils/presets';

interface ClipEditorProps {
  element: ProfileElement;
  onUpdateClip: (clip: ClipConfig) => void;
  onClose?: () => void;
}

export const ClipEditor: React.FC<ClipEditorProps> = ({ element, onUpdateClip, onClose }) => {
  const clip = element.clip || {
    enabled: false,
    type: 'polygon',
    preset: 'hexagon',
    vertices: CLIP_PRESETS.hexagon.vertices,
    circleRadius: 50,
    circleCenterX: 50,
    circleCenterY: 50,
    insetRadius: 12,
  };

  const [activePointIdx, setActivePointIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const update = (partial: Partial<ClipConfig>) => {
    onUpdateClip({
      ...clip,
      ...partial,
      enabled: true,
    });
  };

  // Convert SVG coordinates to percentage (0-100)
  const handleSvgPointerDown = (index: number, e: React.PointerEvent) => {
    e.stopPropagation();
    setActivePointIdx(index);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handleSvgPointerMove = (e: React.PointerEvent) => {
    if (activePointIdx === null || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;

    const clampedX = Math.round(Math.max(0, Math.min(100, rawX)));
    const clampedY = Math.round(Math.max(0, Math.min(100, rawY)));

    const newVertices = [...(clip.vertices || [])];
    newVertices[activePointIdx] = { x: clampedX, y: clampedY };
    update({ vertices: newVertices, type: 'polygon', preset: 'custom' });
  };

  const handleSvgPointerUp = (e: React.PointerEvent) => {
    if (activePointIdx !== null) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture fallback
      }
      setActivePointIdx(null);
    }
  };

  const handleAddVertex = () => {
    const vertices = clip.vertices || [];
    // Place new vertex roughly between last vertex and first vertex or center
    const newPoint: ClipPoint = { x: 50, y: 50 };
    update({
      vertices: [...vertices, newPoint],
      type: 'polygon',
      preset: 'custom',
    });
    setActivePointIdx(vertices.length);
  };

  const handleRemoveVertex = (index: number) => {
    if ((clip.vertices || []).length <= 3) return; // keep at least triangle
    const newVertices = clip.vertices.filter((_, i) => i !== index);
    update({ vertices: newVertices, type: 'polygon', preset: 'custom' });
    setActivePointIdx(null);
  };

  const handleApplyPreset = (presetKey: string) => {
    const preset = CLIP_PRESETS[presetKey];
    if (!preset) return;
    update({
      enabled: true,
      type: 'polygon',
      preset: presetKey,
      vertices: preset.vertices.map((v) => ({ ...v })),
    });
  };

  // Generate polygon SVG points
  const polygonPointsStr = (clip.vertices || [])
    .map((v) => `${(v.x / 100) * 200},${(v.y / 100) * 200}`)
    .join(' ');

  const clipPathCss =
    clip.type === 'circle'
      ? `circle(${clip.circleRadius}% at ${clip.circleCenterX}% ${clip.circleCenterY}%)`
      : clip.type === 'inset'
      ? `inset(0px round ${clip.insetRadius}px)`
      : `polygon(${(clip.vertices || []).map((v) => `${v.x}% ${v.y}%`).join(', ')})`;

  return (
    <div className="space-y-4 text-xs text-slate-300">
      {/* Header & Toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
            <Scissors className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-100">Clipping & Clip Creation</h4>
            <p className="text-[10px] text-slate-400">CSS clip-path geometry engine</p>
          </div>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={clip.enabled}
            onChange={(e) => onUpdateClip({ ...clip, enabled: e.target.checked })}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-slate-700 peer-checked:bg-emerald-500 after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full" />
        </label>
      </div>

      {clip.enabled && (
        <>
          {/* Mode Selector */}
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-900 p-1 border border-slate-800">
            <button
              onClick={() => update({ type: 'polygon' })}
              className={`rounded py-1 text-center font-medium transition-colors ${
                clip.type === 'polygon' || clip.type === 'preset'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Polygon
            </button>
            <button
              onClick={() => update({ type: 'circle' })}
              className={`rounded py-1 text-center font-medium transition-colors ${
                clip.type === 'circle'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Circle
            </button>
            <button
              onClick={() => update({ type: 'inset' })}
              className={`rounded py-1 text-center font-medium transition-colors ${
                clip.type === 'inset'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cut Rounded
            </button>
          </div>

          {/* Polygon Presets Chips */}
          {clip.type !== 'circle' && clip.type !== 'inset' && (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-400">
                <span>Presets</span>
                <span className="text-[10px] text-slate-400">Click to apply</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {Object.entries(CLIP_PRESETS).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => handleApplyPreset(key)}
                    className={`rounded-lg border px-1.5 py-1 text-center text-[10px] transition-all ${
                      clip.preset === key
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-semibold'
                        : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Visual Interactive Polygon Editor Canvas */}
          {clip.type !== 'circle' && clip.type !== 'inset' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Interactive Vertex Canvas
                </span>
                <span className="text-[10px] text-slate-400">Drag points to reshape</span>
              </div>

              {/* 200x200 Visual Interactive Workpad */}
              <div className="relative mx-auto flex h-[200px] w-[200px] items-center justify-center rounded-xl border border-slate-700/80 bg-slate-950 p-2 shadow-inner overflow-hidden">
                {/* Background grid */}
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle, #6ee7b7 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}
                />

                <svg
                  ref={svgRef}
                  viewBox="0 0 200 200"
                  className="h-full w-full touch-none select-none cursor-crosshair"
                  onPointerMove={handleSvgPointerMove}
                  onPointerUp={handleSvgPointerUp}
                >
                  {/* Ghost outline */}
                  <rect
                    x="2"
                    y="2"
                    width="196"
                    height="196"
                    fill="none"
                    stroke="#334155"
                    strokeDasharray="4 4"
                  />

                  {/* Polygon Shape */}
                  <polygon
                    points={polygonPointsStr}
                    className="fill-emerald-500/25 stroke-emerald-400 stroke-2"
                  />

                  {/* Draggable Point Handles */}
                  {(clip.vertices || []).map((v, i) => {
                    const px = (v.x / 100) * 200;
                    const py = (v.y / 100) * 200;
                    const isActive = activePointIdx === i;

                    return (
                      <g key={i}>
                        <circle
                          cx={px}
                          cy={py}
                          r={isActive ? 9 : 7}
                          className={`cursor-grab active:cursor-grabbing transition-all ${
                            isActive
                              ? 'fill-white stroke-emerald-500 stroke-2'
                              : 'fill-emerald-400 stroke-slate-900 stroke-2 hover:r-9 hover:fill-emerald-200'
                          }`}
                          onPointerDown={(e) => handleSvgPointerDown(i, e)}
                        />
                        <text
                          x={px}
                          y={py - 10}
                          textAnchor="middle"
                          className="text-[9px] fill-slate-300 font-mono pointer-events-none select-none font-bold"
                        >
                          {i + 1}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Point Coordinates & Actions */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handleAddVertex}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                >
                  <Plus className="h-3 w-3" /> Add Point
                </button>

                {activePointIdx !== null && (clip.vertices || []).length > 3 && (
                  <button
                    onClick={() => handleRemoveVertex(activePointIdx)}
                    className="flex items-center gap-1 rounded-lg bg-red-500/20 px-2.5 py-1 text-[11px] text-red-300 hover:bg-red-500/30 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Remove #{activePointIdx + 1}
                  </button>
                )}

                <button
                  onClick={() => handleApplyPreset('hexagon')}
                  className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>

              {/* Numerical vertex adjustments */}
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                {(clip.vertices || []).map((v, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded px-2 py-1 border transition-colors ${
                      activePointIdx === idx
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-800 bg-slate-900/50'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-slate-400">P{idx + 1}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">X:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={v.x}
                          onChange={(e) => {
                            const newVerts = [...(clip.vertices || [])];
                            newVerts[idx] = { ...newVerts[idx], x: Number(e.target.value) };
                            update({ vertices: newVerts, type: 'polygon', preset: 'custom' });
                          }}
                          className="w-12 rounded bg-slate-800 px-1 py-0.5 text-center font-mono text-[10px] text-slate-100"
                        />
                        <span className="text-[10px] text-slate-400">%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400">Y:</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={v.y}
                          onChange={(e) => {
                            const newVerts = [...(clip.vertices || [])];
                            newVerts[idx] = { ...newVerts[idx], y: Number(e.target.value) };
                            update({ vertices: newVerts, type: 'polygon', preset: 'custom' });
                          }}
                          className="w-12 rounded bg-slate-800 px-1 py-0.5 text-center font-mono text-[10px] text-slate-100"
                        />
                        <span className="text-[10px] text-slate-400">%</span>
                      </div>
                      {(clip.vertices || []).length > 3 && (
                        <button
                          onClick={() => handleRemoveVertex(idx)}
                          className="text-red-400 hover:text-red-300 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Circle Mode Controls */}
          {clip.type === 'circle' && (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span>Circle Radius</span>
                  <span className="font-mono text-emerald-400">{clip.circleRadius}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={clip.circleRadius}
                  onChange={(e) => update({ circleRadius: Number(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400">Center X</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={clip.circleCenterX}
                    onChange={(e) => update({ circleCenterX: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Center Y</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={clip.circleCenterY}
                    onChange={(e) => update({ circleCenterY: Number(e.target.value) })}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Inset Mode Controls */}
          {clip.type === 'inset' && (
            <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-3">
              <div className="flex justify-between text-[11px] mb-1">
                <span>Corner Rounding</span>
                <span className="font-mono text-emerald-400">{clip.insetRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                value={clip.insetRadius}
                onChange={(e) => update({ insetRadius: Number(e.target.value) })}
                className="w-full accent-emerald-500"
              />
            </div>
          )}

          {/* Live CSS Output Snippet */}
          <div className="rounded-lg bg-slate-950 p-2 border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400">CSS Output:</span>
            <div className="font-mono text-[10px] text-emerald-400 break-all select-all mt-0.5">
              clip-path: {clipPathCss};
            </div>
          </div>
        </>
      )}

      {onClose && (
        <button
          onClick={onClose}
          className="flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-600 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> Done
        </button>
      )}
    </div>
  );
};
