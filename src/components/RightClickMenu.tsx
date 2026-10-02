import React, { useEffect, useRef } from 'react';
import {
  Trash2,
  Copy,
  Layers,
  ArrowUp,
  ArrowDown,
  Lock,
  Unlock,
  Sparkles,
  Scissors,
  Eye,
  BookmarkPlus,
  Code2,
  FileCode,
  Tag,
} from 'lucide-react';
import { ProfileElement } from '../types/profile';

interface ContextMenuProps {
  x: number;
  y: number;
  element: ProfileElement | null;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleLock: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onOpenClipStudio: () => void;
  onOpenMaskStudio: () => void;
  onOpenAnimationStudio: () => void;
  onSaveAsCustom: () => void;
  onCopyHtml: () => void;
  onCopyBBCode: () => void;
}

export const RightClickMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  element,
  onClose,
  onDelete,
  onDuplicate,
  onToggleLock,
  onBringToFront,
  onSendToBack,
  onMoveUp,
  onMoveDown,
  onOpenClipStudio,
  onOpenMaskStudio,
  onOpenAnimationStudio,
  onSaveAsCustom,
  onCopyHtml,
  onCopyBBCode,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust coordinates to not overflow viewport
  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 380);

  if (!element) {
    return (
      <div
        ref={menuRef}
        className="fixed z-50 w-56 rounded-xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 text-xs text-slate-300"
        style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      >
        <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Canvas Actions
        </div>
        <div className="px-3 py-2 text-slate-400 italic">Right-click an element for element actions</div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-64 rounded-xl border border-slate-700/80 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 text-xs text-slate-200 divide-y divide-slate-800"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
    >
      {/* Header Info */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-100 truncate max-w-[140px]">{element.name}</span>
          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-mono text-indigo-300">
            {element.type}
          </span>
        </div>
        <div className="mt-0.5 text-[10px] text-slate-400 font-mono flex items-center gap-1">
          <Tag className="w-3 h-3 text-cyan-400" />
          Selector: span[style*='color: {element.colorMarker}']
        </div>
      </div>

      {/* Main Actions */}
      <div className="py-1">
        <button
          onClick={() => {
            onDuplicate();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Copy className="h-3.5 w-3.5 text-indigo-400 group-hover:text-white" />
            <span>Duplicate</span>
          </div>
          <span className="text-[10px] text-slate-400">Ctrl+D</span>
        </button>

        <button
          onClick={() => {
            onToggleLock();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            {element.locked ? (
              <Unlock className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span>{element.locked ? 'Unlock Position' : 'Lock Position'}</span>
          </div>
          <span className="text-[10px] text-slate-400">Ctrl+L</span>
        </button>

        <button
          onClick={() => {
            onSaveAsCustom();
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-amber-300 hover:bg-amber-500/20 transition-colors"
        >
          <BookmarkPlus className="h-3.5 w-3.5 text-amber-400" />
          <span className="font-medium">Save as Custom Component</span>
        </button>
      </div>

      {/* Feature Studios */}
      <div className="py-1">
        <button
          onClick={() => {
            onOpenClipStudio();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Scissors className="h-3.5 w-3.5 text-emerald-400" />
            <span>Clipping & Clip Creation</span>
          </div>
          {element.clip.enabled && (
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => {
            onOpenMaskStudio();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Eye className="h-3.5 w-3.5 text-purple-400" />
            <span>Masking & Mask Creation</span>
          </div>
          {element.mask.enabled && (
            <span className="h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => {
            onOpenAnimationStudio();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Animation Modification</span>
          </div>
          {element.animation.enabled && (
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* Layer Stacking */}
      <div className="py-1">
        <div className="grid grid-cols-2 gap-1 px-1">
          <button
            onClick={() => {
              onBringToFront();
              onClose();
            }}
            className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-slate-800 text-[11px]"
          >
            <ArrowUp className="h-3 w-3 text-indigo-400" /> Front
          </button>
          <button
            onClick={() => {
              onSendToBack();
              onClose();
            }}
            className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-slate-800 text-[11px]"
          >
            <ArrowDown className="h-3 w-3 text-indigo-400" /> Back
          </button>
          <button
            onClick={() => {
              onMoveUp();
              onClose();
            }}
            className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-slate-800 text-[11px]"
          >
            <Layers className="h-3 w-3 text-indigo-400" /> Up (+1)
          </button>
          <button
            onClick={() => {
              onMoveDown();
              onClose();
            }}
            className="flex items-center gap-1.5 rounded px-2 py-1 hover:bg-slate-800 text-[11px]"
          >
            <Layers className="h-3 w-3 text-indigo-400" /> Down (-1)
          </button>
        </div>
      </div>

      {/* Code Export */}
      <div className="py-1">
        <button
          onClick={() => {
            onCopyBBCode();
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-slate-800 transition-colors"
        >
          <FileCode className="h-3.5 w-3.5 text-cyan-400" />
          <span>Copy BBCode Tag</span>
        </button>
        <button
          onClick={() => {
            onCopyHtml();
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 hover:bg-slate-800 transition-colors"
        >
          <Code2 className="h-3.5 w-3.5 text-amber-400" />
          <span>Copy HTML Tag</span>
        </button>
      </div>

      {/* Danger Zone */}
      <div className="pt-1">
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Element</span>
          </div>
          <span className="text-[10px] text-red-400/80">Del</span>
        </button>
      </div>
    </div>
  );
};
