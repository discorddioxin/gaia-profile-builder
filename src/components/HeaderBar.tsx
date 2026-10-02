import React, { useState } from 'react';
import {
  Code2,
  Eye,
  Layout,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Share2,
  Sparkles,
  FolderOpen,
  MoreVertical,
  Download,
} from 'lucide-react';
import { CanvasSettings } from '../types/profile';
import { STARTER_PROFILES } from '../utils/presets';

export type AppViewMode = 'canvas' | 'forum-preview' | 'transpiler';

interface HeaderBarProps {
  viewMode: AppViewMode;
  onChangeViewMode: (mode: AppViewMode) => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  zenMode: boolean;
  onToggleZenMode: () => void;
  onOpenExportModal: () => void;
  onOpenImportModal: () => void;
  onLoadStarterProfile: (key: string) => void;
  settings: CanvasSettings;
  onChangeCanvasWidth: (width: number) => void;
  importedEditorControls?: {
    enabled: boolean;
    selectionMode: 'component' | 'deep';
    onSelectionModeChange: (mode: 'component' | 'deep') => void;
    draftSize: { width: number; height: number } | null;
    onDraftSizeChange: (size: { width: number; height: number } | null) => void;
    onCommitSize: (size: { width: number; height: number }) => void;
    onViewportPreset: (mode: 'desktop' | 'mobile') => void;
    onViewFaithful: () => void;
  };
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  viewMode,
  onChangeViewMode,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  zenMode,
  onToggleZenMode,
  onOpenExportModal,
  onOpenImportModal,
  onLoadStarterProfile,
  settings,
  onChangeCanvasWidth,
  importedEditorControls,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const widthPresets = [
    { label: 'V2 Desktop (1380px)', width: 1380 },
    { label: 'Forum (720px)', width: 720 },
    { label: 'Wide (880px)', width: 880 },
    { label: 'Retro (640px)', width: 640 },
    { label: 'Mobile (390px)', width: 390 },
  ];

  return (
    <header className="h-12 w-full bg-slate-950 border-b border-slate-850 px-2 sm:px-3 flex items-center justify-between select-none z-40 text-xs text-slate-200 shrink-0">
      {/* Left: Branding & Profile Preset Dropdown */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-indigo-500/20">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1 font-bold tracking-wide text-white text-xs">
              <span>BBSTUDIO</span>
            </div>
          </div>
        </div>

        {/* Profile Presets dropdown (Desktop) */}
        <div className="relative hidden md:block">
          <button
            onClick={() => setTemplatesOpen((p) => !p)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
          >
            <FolderOpen className="w-3 h-3 text-indigo-400" />
            <span className="max-w-[90px] truncate">{settings.profileTitle}</span>
          </button>
          {templatesOpen && (
            <div
              className="absolute top-full left-0 mt-1 w-56 rounded-xl border border-slate-800 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-md z-50 animate-in fade-in"
              onMouseLeave={() => setTemplatesOpen(false)}
            >
              <div className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Starter Templates
              </div>
              {Object.entries(STARTER_PROFILES).map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => {
                    onLoadStarterProfile(key);
                    setTemplatesOpen(false);
                  }}
                  className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-indigo-600 hover:text-white transition-colors flex flex-col"
                >
                  <span className="font-medium text-slate-200">{p.name}</span>
                  <span className="text-[10px] text-slate-400 line-clamp-1">{p.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5 sm:border-l border-slate-800 sm:pl-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-25 transition-opacity"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="p-1 rounded text-slate-400 hover:text-slate-200 disabled:opacity-25 transition-opacity"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center: View modes + imported profile controls */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex items-center rounded-xl bg-slate-900 p-0.5 border border-slate-800 shadow-inner">
          <button
            onClick={() => onChangeViewMode('canvas')}
            title="Studio Canvas"
            className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1 text-xs font-medium transition-all ${
              viewMode === 'canvas'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Canvas</span>
          </button>

          <button
            onClick={() => onChangeViewMode('forum-preview')}
            title="Forum Preview"
            className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1 text-xs font-medium transition-all ${
              viewMode === 'forum-preview'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            onClick={() => onChangeViewMode('transpiler')}
            title="BBCode & CSS Transpiler"
            className={`flex items-center gap-1 rounded-lg px-2 sm:px-3 py-1 text-xs font-medium transition-all ${
              viewMode === 'transpiler'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
          <Code2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Code</span>
          </button>
        </div>

        {importedEditorControls?.enabled && viewMode === 'canvas' && (
          <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-300">
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
              <button
                onClick={() => importedEditorControls.onViewportPreset('desktop')}
                className={`rounded px-2 py-1 font-semibold ${settings.width > 480 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Desktop
              </button>
              <button
                onClick={() => importedEditorControls.onViewportPreset('mobile')}
                className={`rounded px-2 py-1 font-semibold ${settings.width <= 480 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Mobile
              </button>
            </div>

            {(['width', 'height'] as const).map((axis) => {
              const current = importedEditorControls.draftSize || { width: settings.width, height: settings.height };
              const value = current[axis];
              return (
                <label key={axis} className="flex items-center gap-1">
                  <span className="uppercase">{axis[0]}</span>
                  <input
                    type="range"
                    min="1"
                    max={axis === 'width' ? 2500 : 1600}
                    value={value}
                    onChange={(e) =>
                      importedEditorControls.onDraftSizeChange({
                        width: axis === 'width' ? Number(e.target.value) : current.width,
                        height: axis === 'height' ? Number(e.target.value) : current.height,
                      })
                    }
                    onPointerUp={() => importedEditorControls.onCommitSize(current)}
                    className="w-24 accent-blue-500"
                  />
                  <input
                    type="number"
                    min="1"
                    value={value}
                    onChange={(e) =>
                      importedEditorControls.onCommitSize({
                        width: axis === 'width' ? Number(e.target.value) : current.width,
                        height: axis === 'height' ? Number(e.target.value) : current.height,
                      })
                    }
                    className="w-14 rounded border border-slate-700 bg-slate-900 px-1 py-0.5 text-[10px] font-mono text-blue-300"
                  />
                </label>
              );
            })}

            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
              <button
                onClick={() => importedEditorControls.onSelectionModeChange('component')}
                className={`rounded px-2 py-1 font-semibold ${importedEditorControls.selectionMode === 'component' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Component
              </button>
              <button
                onClick={() => importedEditorControls.onSelectionModeChange('deep')}
                className={`rounded px-2 py-1 font-semibold ${importedEditorControls.selectionMode === 'deep' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Deep
              </button>
            </div>

            <button
              onClick={importedEditorControls.onViewFaithful}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 font-semibold text-cyan-300 hover:bg-cyan-500/20"
            >
              Faithful
            </button>
          </div>
        )}
      </div>

      {/* Right: Width presets, Zoom controls, Zen Mode & Export */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Profile Width Preset selector (Desktop) */}
        <div className="hidden lg:flex items-center gap-1 text-[11px]">
          <select
            value={settings.width}
            onChange={(e) => onChangeCanvasWidth(Number(e.target.value))}
            className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-1 text-slate-300 text-xs focus:outline-none"
          >
            {widthPresets.map((wp) => (
              <option key={wp.width} value={wp.width}>
                {wp.label}
              </option>
            ))}
          </select>
        </div>

        {/* Zoom Controls (Desktop) */}
        <div className="hidden md:flex items-center gap-0.5 bg-slate-900 rounded-lg px-1 py-0.5 border border-slate-800">
          <button
            onClick={onZoomOut}
            title="Zoom Out"
            className="text-slate-400 hover:text-slate-200 p-0.5"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <button
            onClick={onResetZoom}
            title="Reset Zoom (100%)"
            className="font-mono text-[10px] text-slate-300 w-8 text-center hover:text-indigo-400"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            title="Zoom In"
            className="text-slate-400 hover:text-slate-200 p-0.5"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>

        {/* Zen Mode Toggle */}
        <button
          onClick={onToggleZenMode}
          title={zenMode ? 'Exit Zen Mode (Z)' : 'Zen Mode: Full Screen (Z)'}
          className={`hidden sm:flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
            zenMode
              ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
              : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
          }`}
        >
          {zenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Import from URL button */}
        <button
          onClick={onOpenImportModal}
          title="Import profile from URL (strips scripts)"
          className="hidden sm:flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2 sm:px-3 py-1.5 font-semibold text-cyan-300 hover:bg-cyan-500/20 hover:text-white active:scale-95 transition-all text-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Import</span>
        </button>

        {/* Export / Transpiler button */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 px-2 sm:px-3 py-1.5 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:brightness-110 active:scale-95 transition-all text-xs"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>

        {/* Mobile Quick Overflow Menu Button */}
        <div className="relative md:hidden">
          <button
            onClick={() => setMobileMenuOpen((p) => !p)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            title="More Options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {mobileMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-slate-800 bg-slate-900/98 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in divide-y divide-slate-800 text-xs"
              onClick={() => setMobileMenuOpen(false)}
            >
              {/* Templates */}
              <div className="pb-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">
                  Templates
                </div>
                {Object.entries(STARTER_PROFILES).map(([key, p]) => (
                  <button
                    key={key}
                    onClick={() => onLoadStarterProfile(key)}
                    className="w-full text-left px-2 py-1 rounded hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>

              {/* Canvas width selection */}
              <div className="py-2">
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 px-1">
                  Profile Width
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {widthPresets.map((wp) => (
                    <button
                      key={wp.width}
                      onClick={() => onChangeCanvasWidth(wp.width)}
                      className={`text-center px-1.5 py-1 rounded text-[10px] border transition-colors ${
                        settings.width === wp.width
                          ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                          : 'border-slate-800 text-slate-400'
                      }`}
                    >
                      {wp.label.split(' ')[0]} ({wp.width}px)
                    </button>
                  ))}
                </div>
              </div>

              {/* Import & Zen Mode */}
              <div className="pt-2 space-y-1">
                <button
                  onClick={onOpenImportModal}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800 text-cyan-300"
                >
                  <span>Import from URL</span>
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onToggleZenMode}
                  className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-800 text-slate-300"
                >
                  <span>Zen Mode (Full Screen)</span>
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
