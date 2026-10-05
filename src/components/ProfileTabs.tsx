import React from 'react';
import { Plus, X, Download, FileEdit, Globe } from 'lucide-react';
import { Profile } from '../types/profile';

interface ProfileTabsProps {
  profiles: Profile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onCloseProfile: (id: string) => void;
  onNewProfile: () => void;
  onRenameProfile: (id: string, title: string) => void;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  profiles,
  activeProfileId,
  onSelectProfile,
  onCloseProfile,
  onNewProfile,
  onRenameProfile,
}) => {
  return (
    <div className="flex h-9 shrink-0 items-center gap-0.5 border-b border-slate-850 bg-slate-950/80 px-2 select-none overflow-x-auto scrollbar-none">
      {profiles.map((p) => {
        const isActive = p.id === activeProfileId;
        const Icon = p.isImported ? (p.sourceUrl === '(pasted HTML)' ? FileEdit : Globe) : Download;
        return (
          <div
            key={p.id}
            onClick={() => onSelectProfile(p.id)}
            className={`group relative flex h-8 shrink-0 items-center gap-1.5 rounded-t-lg border-b-2 pl-2.5 pr-1 cursor-pointer transition-all ${
              isActive
                ? 'border-indigo-500 bg-slate-900 text-slate-100 shadow-inner'
                : 'border-transparent bg-slate-950/40 text-slate-400 hover:bg-slate-900/70 hover:text-slate-200'
            }`}
            title={p.sourceUrl || p.title}
          >
            <Icon
              className={`w-3 h-3 shrink-0 ${
                isActive
                  ? p.isImported
                    ? 'text-cyan-400'
                    : 'text-indigo-400'
                  : 'text-slate-500'
              }`}
            />
            <span
              className="text-[11px] font-medium max-w-[140px] truncate"
              onDoubleClick={(e) => {
                e.stopPropagation();
                const next = window.prompt('Rename profile', p.title);
                if (next && next.trim()) onRenameProfile(p.id, next.trim());
              }}
            >
              {p.title}
            </span>
            {p.isImported && (
              <span className="rounded bg-cyan-500/20 px-1 py-0 text-[8px] font-mono font-semibold text-cyan-300 border border-cyan-500/30">
                IMPORT
              </span>
            )}
            {/* The last tab can be closed too — the builder returns to its welcome screen. */}
            {true && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseProfile(p.id);
                }}
                className={`ml-1 flex h-4 w-4 items-center justify-center rounded transition-opacity ${
                  isActive ? 'text-slate-400 hover:bg-slate-700 hover:text-white' : 'opacity-0 group-hover:opacity-100 text-slate-500 hover:bg-slate-800 hover:text-white'
                }`}
                title="Close tab"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      })}

      <button
        onClick={onNewProfile}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-t-lg text-slate-400 hover:bg-slate-900 hover:text-indigo-300 transition-colors"
        title="New profile"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
};
