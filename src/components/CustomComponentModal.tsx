import React, { useState } from 'react';
import { BookmarkPlus, X, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CustomComponent, ProfileElement } from '../types/profile';

interface CustomComponentModalProps {
  element: ProfileElement;
  onSave: (comp: CustomComponent) => void;
  onClose: () => void;
}

export const CustomComponentModal: React.FC<CustomComponentModalProps> = ({
  element,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(element.name || 'My Custom Element');
  const [description, setDescription] = useState(
    `Custom ${element.type} component with custom styling, clipping & animation.`
  );
  const [category, setCategory] = useState<CustomComponent['category']>('My Saved');
  const [color, setColor] = useState('#6366f1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newComp: CustomComponent = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: title.trim(),
      description: description.trim(),
      category,
      previewColor: color,
      createdAt: Date.now(),
      // Clone element so future edits to current selection won't mutate the preset
      elements: [JSON.parse(JSON.stringify(element))],
    };

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#06b6d4', '#ec4899', '#f59e0b'],
      });
    } catch {
      // Ignore if confetti fails
    }

    onSave(newComp);
    onClose();
  };

  const categories: CustomComponent['category'][] = [
    'My Saved',
    'Avatars & Badges',
    'Cards & Quotes',
    'Media & Embeds',
    'Accents & Borders',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-in fade-in">
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl animate-in zoom-in-95 text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
              <BookmarkPlus className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Save Custom Drag-N-Drop</h3>
              <p className="text-[11px] text-slate-400">Add to your reusable component library</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Component Name</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cyberpunk Avatar Badge"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CustomComponent['category'])}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description of this component..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Card Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-12 cursor-pointer rounded border border-slate-700 bg-transparent p-0.5"
              />
              <span className="font-mono text-slate-400 text-[11px]">{color}</span>
            </div>
          </div>

          {/* Features summary badge */}
          <div className="rounded-lg bg-slate-950 p-2.5 border border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Features included:</span>
            <div className="flex gap-2">
              {element.clip.enabled && (
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-400 font-mono text-[10px]">
                  Clip: {element.clip.preset}
                </span>
              )}
              {element.mask.enabled && (
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-purple-400 font-mono text-[10px]">
                  Mask: {element.mask.preset}
                </span>
              )}
              {element.animation.enabled && (
                <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-cyan-400 font-mono text-[10px]">
                  Anim: {element.animation.preset}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-slate-400 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-indigo-600 px-4 py-1.5 font-semibold text-white shadow-lg hover:brightness-110 transition-all"
            >
              <Check className="h-4 w-4" /> Save Component
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
