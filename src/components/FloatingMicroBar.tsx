import React from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Scissors,
  Eye,
  Sparkles,
  Copy,
  Trash2,
  Lock,
  Unlock,
  BookmarkPlus,
  Palette,
  Edit3,
} from 'lucide-react';
import { ProfileElement } from '../types/profile';

interface FloatingMicroBarProps {
  element: ProfileElement;
  zoom: number;
  canvasRect: DOMRect | null;
  onUpdate: (updates: Partial<ProfileElement>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onOpenClipStudio: () => void;
  onOpenMaskStudio: () => void;
  onOpenAnimationStudio: () => void;
  onSaveAsCustom: () => void;
  onStartInlineEdit?: () => void;
}

export const FloatingMicroBar: React.FC<FloatingMicroBarProps> = ({
  element,
  zoom,
  canvasRect,
  onUpdate,
  onDelete,
  onDuplicate,
  onOpenClipStudio,
  onOpenMaskStudio,
  onOpenAnimationStudio,
  onSaveAsCustom,
  onStartInlineEdit,
}) => {
  if (!canvasRect) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Calculate position in viewport based on element canvas coordinates and canvas rect
  const screenX = canvasRect.left + element.x * zoom;
  const rawScreenY = canvasRect.top + element.y * zoom;

  // Position above if there is space, otherwise below
  const placeAbove = rawScreenY > 70;
  const screenY = placeAbove ? rawScreenY - 48 : rawScreenY + element.height * zoom + 12;

  // Constrain horizontally for desktop
  const constrainedX = Math.max(12, Math.min(screenX, window.innerWidth - 420));

  const quickColors = ['#e2e8f0', '#38bdf8', '#a855f7', '#ec4899', '#10b981', '#f59e0b'];
  const hasText = ['text', 'quote', 'link', 'code', 'box'].includes(element.type);

  return (
    <div
      className={`fixed z-40 flex items-center gap-1 rounded-xl border border-slate-700/90 bg-slate-900/95 px-2 py-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 text-xs text-slate-200 select-none overflow-x-auto max-w-[calc(100vw-24px)] ${
        isMobile ? 'bottom-16 left-1/2 -translate-x-1/2 shadow-indigo-950/60' : ''
      }`}
      style={
        isMobile
          ? { maxWidth: 'calc(100vw - 20px)' }
          : {
              left: `${constrainedX}px`,
              top: `${screenY}px`,
            }
      }
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Element Name Tag */}
      <span className="font-semibold text-slate-200 max-w-[80px] sm:max-w-[100px] truncate text-[11px] px-1 shrink-0">
        {element.name}
      </span>

      {/* Edit / Select All Text button for text elements */}
      {hasText && onStartInlineEdit && (
        <button
          onClick={onStartInlineEdit}
          title="Select all text & edit inline"
          className="flex items-center gap-1 rounded bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600 hover:text-white px-2 py-1 text-[10px] font-medium transition-colors shrink-0"
        >
          <Edit3 className="w-3 h-3" />
          <span>Edit Text</span>
        </button>
      )}

      <div className="h-4 w-px bg-slate-700/70 mx-0.5 shrink-0" />

      {/* Typography Quick Toggles for text-like elements */}
      {['text', 'quote', 'link', 'code'].includes(element.type) && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            title="Bold [b] -> <b>"
            onClick={() =>
              onUpdate({ fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' })
            }
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              element.fontWeight === 'bold' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            title="Italic [i] -> <i>"
            onClick={() =>
              onUpdate({ fontStyle: element.fontStyle === 'italic' ? 'normal' : 'italic' })
            }
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              element.fontStyle === 'italic' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            title="Underline [u] -> <span>"
            onClick={() =>
              onUpdate({
                textDecoration: element.textDecoration === 'underline' ? 'none' : 'underline',
              })
            }
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              element.textDecoration === 'underline' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button
            title="Strikethrough [strike] -> <span>"
            onClick={() =>
              onUpdate({
                textDecoration: element.textDecoration === 'line-through' ? 'none' : 'line-through',
              })
            }
            className={`p-1.5 rounded hover:bg-slate-800 transition-colors ${
              element.textDecoration === 'line-through' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          {/* Font Size controls */}
          <div className="flex items-center bg-slate-800 rounded px-1.5 py-0.5 ml-0.5 shrink-0">
            <button
              onClick={() => onUpdate({ fontSize: Math.max(9, element.fontSize - 1) })}
              className="text-[11px] px-1 hover:text-indigo-400"
            >
              -
            </button>
            <span className="text-[11px] font-mono w-4 text-center">{element.fontSize}</span>
            <button
              onClick={() => onUpdate({ fontSize: Math.min(48, element.fontSize + 1) })}
              className="text-[11px] px-1 hover:text-indigo-400"
            >
              +
            </button>
          </div>

          <div className="h-4 w-px bg-slate-700/70 mx-0.5 shrink-0" />
        </div>
      )}

      {/* Quick Color Swatches */}
      <div className="flex items-center gap-1 shrink-0">
        {quickColors.slice(0, 4).map((c) => (
          <button
            key={c}
            onClick={() => onUpdate({ color: c })}
            className="w-3.5 h-3.5 rounded-full border border-slate-700 hover:scale-110 transition-transform"
            style={{ backgroundColor: c }}
          />
        ))}
        <label className="cursor-pointer p-1 text-slate-400 hover:text-indigo-400 shrink-0" title="Custom color">
          <Palette className="w-3.5 h-3.5" />
          <input
            type="color"
            value={element.color || '#e2e8f0'}
            onChange={(e) => onUpdate({ color: e.target.value })}
            className="sr-only"
          />
        </label>
      </div>

      <div className="h-4 w-px bg-slate-700/70 mx-0.5 shrink-0" />

      {/* Feature Studio Launchers */}
      <button
        title="Clip Studio (clip-path)"
        onClick={onOpenClipStudio}
        className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] hover:bg-slate-800 transition-colors shrink-0 ${
          element.clip.enabled ? 'text-emerald-400 font-semibold' : 'text-slate-400'
        }`}
      >
        <Scissors className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Clip</span>
      </button>

      <button
        title="Mask Studio (mask-image)"
        onClick={onOpenMaskStudio}
        className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] hover:bg-slate-800 transition-colors shrink-0 ${
          element.mask.enabled ? 'text-purple-400 font-semibold' : 'text-slate-400'
        }`}
      >
        <Eye className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Mask</span>
      </button>

      <button
        title="Animation Studio (keyframes)"
        onClick={onOpenAnimationStudio}
        className={`flex items-center gap-1 px-1.5 py-1 rounded text-[11px] hover:bg-slate-800 transition-colors shrink-0 ${
          element.animation.enabled ? 'text-cyan-400 font-semibold' : 'text-slate-400'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Anim</span>
      </button>

      <div className="h-4 w-px bg-slate-700/70 mx-0.5 shrink-0" />

      {/* Quick Action buttons */}
      <button
        title="Save as Custom Component"
        onClick={onSaveAsCustom}
        className="p-1.5 text-amber-400 hover:bg-amber-400/20 rounded transition-colors shrink-0"
      >
        <BookmarkPlus className="w-3.5 h-3.5" />
      </button>

      <button
        title="Duplicate (Ctrl+D)"
        onClick={onDuplicate}
        className="p-1.5 text-slate-300 hover:bg-slate-800 rounded transition-colors shrink-0"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      <button
        title={element.locked ? 'Unlock' : 'Lock'}
        onClick={() => onUpdate({ locked: !element.locked })}
        className="p-1.5 text-slate-300 hover:bg-slate-800 rounded transition-colors shrink-0"
      >
        {element.locked ? <Unlock className="w-3.5 h-3.5 text-amber-400" /> : <Lock className="w-3.5 h-3.5" />}
      </button>

      <button
        title="Delete"
        onClick={onDelete}
        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-colors shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
