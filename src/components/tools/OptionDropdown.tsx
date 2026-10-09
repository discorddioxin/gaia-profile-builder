import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  id: string;
  label: string;
  description?: string;
  /** Rows are grouped under this heading when set. */
  group?: string;
  icon?: React.ReactNode;
}

interface OptionDropdownProps {
  /** Button label, e.g. "Motion". */
  label: string;
  icon?: React.ReactNode;
  /** Right-hand summary in the closed button, e.g. "2 layers" / "none". */
  summary: string;
  options: DropdownOption[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear?: () => void;
  /** Tailwind text/border tint for checked rows. */
  accent?: 'indigo' | 'cyan' | 'pink' | 'emerald';
  /** Detail line under the header when nothing is selected. */
  hint?: string;
  /** data attribute prefix, used by the verify harness. */
  name: string;
}

const ACCENTS: Record<string, string> = {
  indigo: 'accent-indigo-400',
  cyan: 'accent-cyan-400',
  pink: 'accent-pink-400',
  emerald: 'accent-emerald-400',
};

/**
 * Compact multi-select: a flat button that opens a checkbox list. Options are
 * grouped by `option.group` when present, so a single dropdown can carry the
 * animation / morph / 3D families at once.
 */
export const OptionDropdown: React.FC<OptionDropdownProps> = ({
  label,
  icon,
  summary,
  options,
  selected,
  onToggle,
  onClear,
  accent = 'indigo',
  hint,
  name,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  let lastGroup: string | undefined;

  return (
    <div ref={rootRef} className="relative" data-dropdown={name}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
        className={`flex w-full items-center gap-1.5 border px-1.5 py-1 text-left text-[10px] transition-colors ${
          open ? 'border-slate-600 text-slate-100' : 'border-slate-800 text-slate-300 hover:border-slate-600'
        }`}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="shrink-0 font-medium">{label}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-slate-500">{summary}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-px max-h-72 w-60 overflow-y-auto border border-slate-700 bg-slate-950 shadow-xl">
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-2 py-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-500">
              {selected.length} selected
            </span>
            {onClear && selected.length > 0 && (
              <button
                type="button"
                onClick={onClear}
                className="text-[9px] text-slate-500 transition-colors hover:text-slate-200"
              >
                clear
              </button>
            )}
          </div>

          {options.map((option) => {
            const heading = option.group && option.group !== lastGroup ? option.group : null;
            lastGroup = option.group;
            const checked = selected.includes(option.id);
            return (
              <React.Fragment key={option.id}>
                {heading && (
                  <div className="border-b border-slate-800 bg-slate-900/60 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                    {heading}
                  </div>
                )}
                <label
                  title={option.description}
                  className={`flex cursor-pointer items-center gap-2 px-2 py-1 text-[10px] transition-colors hover:bg-slate-800/50 ${
                    checked ? 'text-slate-100' : 'text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(option.id)}
                    className={`h-3 w-3 shrink-0 ${ACCENTS[accent]}`}
                  />
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                </label>
              </React.Fragment>
            );
          })}

          {selected.length === 0 && hint && (
            <p className="px-2 py-1 text-[9px] leading-snug text-slate-600">{hint}</p>
          )}
        </div>
      )}
    </div>
  );
};
