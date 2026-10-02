import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ProfileElement,
  CanvasSettings,
  ElementType,
  CustomComponent,
  Profile,
} from './types/profile';
import {
  STARTER_PROFILES,
  DEFAULT_CUSTOM_COMPONENTS,
  CLIP_PRESETS,
} from './utils/presets';
import { createGaiaPanelElement, getGaiaComponent } from './utils/gaiaSpec';
import { HeaderBar, AppViewMode } from './components/HeaderBar';
import { Canvas } from './components/Canvas';
import { DockPanel, DockTab } from './components/DockPanel';
import { RightClickMenu } from './components/RightClickMenu';
import { CustomComponentModal } from './components/CustomComponentModal';
import { TranspilerModal } from './components/TranspilerModal';
import { ForumPreview } from './components/ForumPreview';
import { ImportModal } from './components/ImportModal';
import { ProfileTabs } from './components/ProfileTabs';
import { ImportedCanvas } from './components/ImportedCanvas';
import {
  EditableImportedCanvas,
  EditableImportedCanvasApi,
  ImportedNodeInfo,
  ImportedTreeNode,
} from './components/EditableImportedCanvas';

const LOCAL_STORAGE_CUSTOM_KEY = 'bbstudio_custom_components_v1';

/** Create a fresh Profile from starter data or blank */
function makeProfile(overrides: Partial<Profile> = {}): Profile {
  const starter = STARTER_PROFILES.cyberpunk;
  const starterSettings: CanvasSettings = { ...starter.settings, width: 1380 };
  const base: Profile = {
    id: `profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: 'Untitled Profile',
    elements: starter.elements,
    settings: starterSettings,
    history: [{ elements: starter.elements, settings: starterSettings }],
    historyIdx: 0,
    selectedId: null,
    renderMode: 'canvas',
  };
  return { ...base, ...overrides };
}

function makeBlankProfile(index: number): Profile {
  const settings: CanvasSettings = {
    width: 1380,
    height: 600,
    backgroundColor: '#0e111a',
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    gridSnap: true,
    gridSize: 10,
    showGrid: false,
    profileTitle: `Untitled Profile ${index}`,
    forumTheme: 'dark-cyber',
  };
  return makeProfile({
    title: `Untitled ${index}`,
    elements: [],
    settings,
    history: [{ elements: [], settings }],
  });
}

export const App: React.FC = () => {
  // ============================================================
  // MULTI-PROFILE STATE (each tab = one Profile with its own history)
  // ============================================================
  const initialProfile = makeProfile({ title: STARTER_PROFILES.cyberpunk.settings.profileTitle });
  const [profiles, setProfiles] = useState<Profile[]>([initialProfile]);
  const [activeProfileId, setActiveProfileId] = useState<string>(initialProfile.id);

  // Derived: the currently active profile & its state
  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0];
  const elements = activeProfile.elements;
  const settings = activeProfile.settings;
  const selectedId = activeProfile.selectedId;

  /** Update a single profile by id (immutable) */
  const updateProfile = useCallback(
    (id: string, updater: (p: Profile) => Profile) => {
      setProfiles((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));
    },
    []
  );

  /** Update the currently active profile */
  const updateActiveProfile = useCallback(
    (updater: (p: Profile) => Profile) => updateProfile(activeProfileId, updater),
    [updateProfile, activeProfileId]
  );

  // ============================================================
  // UI STATE (shared across tabs)
  // ============================================================
  const [viewMode, setViewMode] = useState<AppViewMode>('canvas');

  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return Math.max(0.25, Math.round(((window.innerWidth - 32) / 1380) * 100) / 100);
    }
    return 1;
  });

  const [isDockOpen, setIsDockOpen] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.innerWidth >= 768;
  });

  const [dockTab, setDockTab] = useState<DockTab>('properties');
  const [zenMode, setZenMode] = useState<boolean>(false);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    element: ProfileElement | null;
  } | null>(null);
  const [showTranspilerModal, setShowTranspilerModal] = useState<boolean>(false);
  const [showSaveCustomModal, setShowSaveCustomModal] = useState<boolean>(false);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

  // Editable imported canvas: track the currently-selected imported node so
  // the DockPanel can show property editors, and hold a ref to the canvas
  // instance so property edits flow back into the shadow DOM.
  const [importedNode, setImportedNode] = useState<ImportedNodeInfo | null>(null);
  const [importedInspectedBbId, setImportedInspectedBbId] = useState<string | null>(null);
  const [importedInspectedNode, setImportedInspectedNode] = useState<ImportedNodeInfo | null>(null);
  const [importedMultiSelectCount, setImportedMultiSelectCount] = useState(0);
  const [importedTree, setImportedTree] = useState<ImportedTreeNode[]>([]);
  const [importedSelectionMode, setImportedSelectionMode] = useState<'component' | 'deep'>('component');
  const [draftImportedSize, setDraftImportedSize] = useState<{ width: number; height: number } | null>(null);
  const importedCanvasRef = useRef<EditableImportedCanvasApi | null>(null);

  // Custom drag-n-drop library persisted in localStorage (shared across tabs)
  const [customComponents, setCustomComponents] = useState<CustomComponent[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_CUSTOM_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return DEFAULT_CUSTOM_COMPONENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_CUSTOM_KEY, JSON.stringify(customComponents));
    } catch (e) {
      console.error('Failed to save custom components to localStorage', e);
    }
  }, [customComponents]);

  // ============================================================
  // HISTORY / UNDO / REDO (per-profile)
  // ============================================================
  const isUndoRedoAction = useRef(false);

  const recordHistory = useCallback(
    (newElements: ProfileElement[], newSettings: CanvasSettings) => {
      if (isUndoRedoAction.current) {
        isUndoRedoAction.current = false;
        return;
      }
      updateActiveProfile((p) => {
        const trimmed = p.history.slice(0, p.historyIdx + 1);
        const nextHistory = [...trimmed, { elements: newElements, settings: newSettings }];
        // Cap history length to prevent unbounded growth
        const capped = nextHistory.length > 60 ? nextHistory.slice(-60) : nextHistory;
        return {
          ...p,
          history: capped,
          historyIdx: capped.length - 1,
        };
      });
    },
    [updateActiveProfile]
  );

  const handleUndo = useCallback(() => {
    if (activeProfile.historyIdx <= 0) return;
    isUndoRedoAction.current = true;
    const target = activeProfile.history[activeProfile.historyIdx - 1];
    updateActiveProfile((p) => ({
      ...p,
      elements: target.elements,
      settings: target.settings,
      historyIdx: p.historyIdx - 1,
    }));
  }, [activeProfile, updateActiveProfile]);

  const handleRedo = useCallback(() => {
    if (activeProfile.historyIdx >= activeProfile.history.length - 1) return;
    isUndoRedoAction.current = true;
    const target = activeProfile.history[activeProfile.historyIdx + 1];
    updateActiveProfile((p) => ({
      ...p,
      elements: target.elements,
      settings: target.settings,
      historyIdx: p.historyIdx + 1,
    }));
  }, [activeProfile, updateActiveProfile]);

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  const focusSelectedElementPane = useCallback(() => {
    setDockTab((prev) => {
      // Gently switch to properties if we are on a non-editing tab,
      // but do NOT forcefully open the dock if the user closed it.
      if (prev === 'elements' || prev === 'custom' || prev === 'canvas' || prev === 'layers') {
        return 'properties';
      }
      return prev;
    });
  }, []);

  // ============================================================
  // ELEMENT / SETTINGS OPERATIONS (target the active profile)
  // ============================================================
  const setSelectedId = useCallback(
    (id: string | null) => {
      updateActiveProfile((p) => ({ ...p, selectedId: id }));
    },
    [updateActiveProfile]
  );

  const handleUpdateElement = useCallback(
    (id: string, updates: Partial<ProfileElement>) => {
      const nextElements = elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      );
      updateActiveProfile((p) => ({ ...p, elements: nextElements }));
      recordHistory(nextElements, settings);
    },
    [elements, settings, updateActiveProfile, recordHistory]
  );

  const handleAddElement = useCallback(
    (type: ElementType, customProps?: Partial<ProfileElement>) => {
      const newId = `el_${Date.now()}`;
      const marker = `#${elements.length + 1}`;

      let defaultContent = 'New Styled Text';
      let defaultWidth = 240;
      let defaultHeight = 60;
      let defaultBg = 'rgba(15, 23, 42, 0.7)';
      let defaultColor = '#e2e8f0';

      // Gaia-supported components are authored with real V2 panel structure.
      if (type === 'gaia-panel' || customProps?.gaia) {
        const kind = customProps?.gaia?.kind || 'custom';
        const column = customProps?.gaia?.column || getGaiaComponent(kind).defaultColumn;
        const panel = createGaiaPanelElement(kind, column, elements.length, settings);
        const merged: ProfileElement = {
          ...panel,
          ...customProps,
          id: newId,
          gaia: {
            ...panel.gaia!,
            ...(customProps?.gaia || {}),
          },
        };
        updateActiveProfile((p) => ({
          ...p,
          elements: [...p.elements, merged],
          selectedId: newId,
        }));
        recordHistory([...elements, merged], settings);
        focusSelectedElementPane();
        return;
      }

      if (type === 'quote') {
        defaultContent = '"Add your signature quote or testimonial here."';
        defaultWidth = 380;
        defaultHeight = 90;
        defaultBg = 'rgba(22, 27, 46, 0.85)';
      } else if (type === 'image') {
        defaultContent =
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80';
        defaultWidth = 140;
        defaultHeight = 140;
        defaultBg = 'transparent';
      } else if (type === 'video') {
        defaultContent = '5qap5aO4i9A';
        defaultWidth = 320;
        defaultHeight = 180;
      } else if (type === 'code') {
        defaultContent = `// [STATUS: ONLINE]\nconst profile = "active";`;
        defaultWidth = 280;
        defaultHeight = 120;
        defaultColor = '#34d399';
        defaultBg = '#090d16';
      } else if (type === 'link') {
        defaultContent = '★ VISIT MY WEBSITE ★';
        defaultWidth = 220;
        defaultHeight = 44;
        defaultBg = 'rgba(99, 102, 241, 0.2)';
        defaultColor = '#818cf8';
      } else if (type === 'clear') {
        defaultContent = '';
        defaultWidth = settings.width - 80;
        defaultHeight = 10;
        defaultBg = 'transparent';
      } else if (type === 'box') {
        defaultContent = '';
        defaultWidth = 260;
        defaultHeight = 160;
        defaultBg = 'rgba(30, 41, 59, 0.7)';
      }

      const newElement: ProfileElement = {
        id: newId,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} #${elements.length + 1}`,
        type,
        content: defaultContent,
        linkUrl: type === 'link' ? 'https://example.com' : undefined,
        colorMarker: marker,
        useAttributeSelector: true,
        x: Math.max(20, Math.min(settings.width - defaultWidth - 20, 40 + (elements.length % 5) * 30)),
        y: Math.max(20, Math.min(settings.height - defaultHeight - 20, 60 + (elements.length % 5) * 30)),
        width: defaultWidth,
        height: defaultHeight,
        zIndex: elements.length + 1,
        rotate: 0,
        opacity: 100,
        locked: false,
        hidden: false,
        color: defaultColor,
        backgroundColor: defaultBg,
        fontSize: 14,
        fontWeight: 'normal',
        fontStyle: type === 'quote' ? 'italic' : 'normal',
        textDecoration: 'none',
        textAlign: 'left',
        fontFamily: 'inherit',
        borderWidth: 1,
        borderColor: '#4f46e5',
        borderStyle: 'solid',
        borderRadius: 6,
        boxShadow: 'none',
        padding: 10,
        overflow: 'hidden',
        mask: {
          enabled: false,
          type: 'linear-gradient',
          preset: 'fade-bottom',
          angle: 180,
          stops: [],
          feather: 20,
          invert: false,
          shape: 'circle',
        },
        clip: {
          enabled: false,
          type: 'polygon',
          preset: 'hexagon',
          vertices: CLIP_PRESETS.hexagon.vertices,
          circleRadius: 50,
          circleCenterX: 50,
          circleCenterY: 50,
          insetRadius: 0,
        },
        animation: {
          enabled: false,
          preset: 'float',
          duration: 3,
          delay: 0,
          timing: 'ease-in-out',
          iteration: 'infinite',
          direction: 'alternate',
          trigger: 'always',
        },
        ...customProps,
      };

      updateActiveProfile((p) => ({
        ...p,
        elements: [...p.elements, newElement],
        selectedId: newId,
      }));
      recordHistory([...elements, newElement], settings);
      focusSelectedElementPane();
    },
    [elements, settings, updateActiveProfile, recordHistory]
  );

  const handleDeleteElement = useCallback(
    (id: string) => {
      const nextElements = elements.filter((el) => el.id !== id);
      updateActiveProfile((p) => ({
        ...p,
        elements: nextElements,
        selectedId: p.selectedId === id ? null : p.selectedId,
      }));
      recordHistory(nextElements, settings);
    },
    [elements, settings, updateActiveProfile, recordHistory]
  );

  const handleDuplicateElement = useCallback(
    (id: string) => {
      const source = elements.find((el) => el.id === id);
      if (!source) return;
      const cloned: ProfileElement = {
        ...JSON.parse(JSON.stringify(source)),
        id: `el_${Date.now()}`,
        name: `${source.name} (Copy)`,
        x: source.x + 20,
        y: source.y + 20,
        zIndex: elements.length + 1,
        colorMarker: `#${elements.length + 1}`,
      };
      const nextElements = [...elements, cloned];
      updateActiveProfile((p) => ({
        ...p,
        elements: nextElements,
        selectedId: cloned.id,
      }));
      recordHistory(nextElements, settings);
      focusSelectedElementPane();
    },
    [elements, settings, updateActiveProfile, recordHistory]
  );

  const handleBringToFront = useCallback(() => {
    if (!selectedId) return;
    const maxZ = Math.max(...elements.map((e) => e.zIndex), 0);
    handleUpdateElement(selectedId, { zIndex: maxZ + 1 });
  }, [selectedId, elements, handleUpdateElement]);

  const handleSendToBack = useCallback(() => {
    if (!selectedId) return;
    const minZ = Math.min(...elements.map((e) => e.zIndex), 1);
    handleUpdateElement(selectedId, { zIndex: Math.max(1, minZ - 1) });
  }, [selectedId, elements, handleUpdateElement]);

  const handleMoveUp = useCallback(() => {
    if (!selectedElement) return;
    handleUpdateElement(selectedElement.id, { zIndex: selectedElement.zIndex + 1 });
  }, [selectedElement, handleUpdateElement]);

  const handleMoveDown = useCallback(() => {
    if (!selectedElement) return;
    handleUpdateElement(selectedElement.id, {
      zIndex: Math.max(1, selectedElement.zIndex - 1),
    });
  }, [selectedElement, handleUpdateElement]);

  const handleUpdateSettings = useCallback(
    (updates: Partial<CanvasSettings>) => {
      const nextSettings = { ...settings, ...updates };
      updateActiveProfile((p) => ({ ...p, settings: nextSettings }));
      recordHistory(elements, nextSettings);
    },
    [elements, settings, updateActiveProfile, recordHistory]
  );

  const handleLoadStarterProfile = useCallback(
    (key: string) => {
      const starter = STARTER_PROFILES[key];
      if (!starter) return;
      updateActiveProfile((p) => ({
        ...p,
        title: starter.settings.profileTitle,
        elements: starter.elements,
        settings: starter.settings,
        history: [{ elements: starter.elements, settings: starter.settings }],
        historyIdx: 0,
        selectedId: null,
      }));
    },
    [updateActiveProfile]
  );

  const handleAddCustomComponent = useCallback(
    (comp: CustomComponent) => {
      if (!comp.elements || comp.elements.length === 0) return;
      const newElements = comp.elements.map((el, idx) => ({
        ...JSON.parse(JSON.stringify(el)),
        id: `el_${Date.now()}_${idx}`,
        x: Math.max(20, Math.min(settings.width - el.width - 20, el.x + 20)),
        y: Math.max(20, Math.min(settings.height - el.height - 20, el.y + 20)),
        zIndex: elements.length + 1 + idx,
        colorMarker: `#${elements.length + 1 + idx}`,
      })) as ProfileElement[];

      const merged = [...elements, ...newElements];
      updateActiveProfile((p) => ({
        ...p,
        elements: merged,
        selectedId: newElements[0]?.id ?? p.selectedId,
      }));
      recordHistory(merged, settings);
      focusSelectedElementPane();
    },
    [elements, settings, updateActiveProfile, recordHistory]
  );

  const handleDeleteCustomComponent = useCallback((id: string) => {
    setCustomComponents((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleSaveCustomComponent = useCallback((comp: CustomComponent) => {
    setCustomComponents((prev) => [comp, ...prev]);
  }, []);

  // ============================================================
  // MULTI-PROFILE TAB OPERATIONS
  // ============================================================
  const handleNewProfile = useCallback(() => {
    const blank = makeBlankProfile(profiles.length + 1);
    setProfiles((prev) => [...prev, blank]);
    setActiveProfileId(blank.id);
  }, [profiles.length]);

  const handleCloseProfile = useCallback(
    (id: string) => {
      setProfiles((prev) => {
        if (prev.length <= 1) return prev; // never close the last tab
        const next = prev.filter((p) => p.id !== id);
        if (activeProfileId === id) {
          const closedIdx = prev.findIndex((p) => p.id === id);
          const fallback = next[Math.max(0, closedIdx - 1)] || next[0];
          if (fallback) setActiveProfileId(fallback.id);
        }
        return next;
      });
    },
    [activeProfileId]
  );

  const handleRenameProfile = useCallback((id: string, title: string) => {
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, title, settings: { ...p.settings, profileTitle: title } }
          : p
      )
    );
  }, []);

  /** Called by ImportModal — always creates a new tab */
  const handleImportProfile = useCallback(
    (
      importedElements: ProfileElement[],
      importedSettings: Partial<CanvasSettings>,
      rawHtml: string,
      rawCss: string,
      sourceUrl: string,
      initialRenderMode: 'canvas' | 'raw'
    ) => {
      const baseSettings: CanvasSettings = {
        width: 1380,
        height: 720,
        backgroundColor: '#0e111a',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        gridSnap: true,
        gridSize: 10,
        showGrid: false,
        profileTitle: 'Imported Profile',
        forumTheme: 'dark-cyber',
        ...importedSettings,
      };

      // Friendly title from URL or generic name
      let title = 'Imported Profile';
      if (sourceUrl && sourceUrl.startsWith('http')) {
        try {
          const u = new URL(sourceUrl);
          title = `${u.hostname.replace(/^www\./, '')}${u.pathname.length > 1 ? u.pathname : ''}`.slice(0, 60);
        } catch {
          /* keep default */
        }
      } else if (sourceUrl === '(pasted HTML)') {
        title = 'Pasted HTML';
      }

      const newProfile: Profile = makeProfile({
        title,
        elements: importedElements,
        settings: baseSettings,
        history: [{ elements: importedElements, settings: baseSettings }],
        historyIdx: 0,
        selectedId: null,
        isImported: true,
        rawHtml,
        rawCss,
        sourceUrl,
        renderMode: initialRenderMode,
      });

      setProfiles((prev) => [...prev, newProfile]);
      setActiveProfileId(newProfile.id);
      setDockTab('properties');
      setIsDockOpen(true);
    },
    []
  );

  const handleSwitchRenderMode = useCallback(
    (mode: 'canvas' | 'raw') => {
      updateActiveProfile((p) => ({ ...p, renderMode: mode }));
      setImportedNode(null);
      setImportedInspectedBbId(null);
      setImportedInspectedNode(null);
    },
    [updateActiveProfile]
  );

  // Clear imported selection when switching to a non-imported tab or when
  // switching between profiles altogether.
  useEffect(() => {
    if (!activeProfile.isImported || activeProfile.renderMode !== 'canvas') {
      setImportedNode(null);
      setImportedInspectedBbId(null);
      setImportedInspectedNode(null);
      setImportedTree([]);
    }
  }, [activeProfileId, activeProfile.isImported, activeProfile.renderMode]);

  // ============================================================
  // GLOBAL KEYBOARD SHORTCUTS
  // ============================================================
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleNewProfile();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        handleCloseProfile(activeProfileId);
      } else if (e.key.toLowerCase() === 'z' && !e.ctrlKey && !e.metaKey) {
        setZenMode((prev) => !prev);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setIsDockOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleUndo, handleRedo, handleNewProfile, handleCloseProfile, activeProfileId]);

  const handleZoomIn = () => setZoom((z) => Math.min(2.0, Math.round((z + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoom((z) => Math.max(0.3, Math.round((z - 0.1) * 10) / 10));
  const handleResetZoom = () => {
    if (window.innerWidth < 768) {
      setZoom(Math.max(0.4, Math.round(((window.innerWidth - 32) / settings.width) * 100) / 100));
    } else {
      setZoom(1);
    }
  };

  return (
    <div className="flex h-[100dvh] w-screen flex-col overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {!zenMode && (
        <HeaderBar
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          canUndo={activeProfile.historyIdx > 0}
          canRedo={activeProfile.historyIdx < activeProfile.history.length - 1}
          onUndo={handleUndo}
          onRedo={handleRedo}
          zenMode={zenMode}
          onToggleZenMode={() => setZenMode(true)}
          onOpenExportModal={() => setShowTranspilerModal(true)}
          onOpenImportModal={() => setShowImportModal(true)}
          onLoadStarterProfile={handleLoadStarterProfile}
          settings={settings}
          onChangeCanvasWidth={(w) => handleUpdateSettings({ width: w })}
          importedEditorControls={
            activeProfile.isImported
              ? {
                  enabled: activeProfile.renderMode !== 'raw',
                  selectionMode: importedSelectionMode,
                  onSelectionModeChange: setImportedSelectionMode,
                  draftSize: draftImportedSize,
                  onDraftSizeChange: setDraftImportedSize,
                  onCommitSize: (size) => {
                    const next = {
                      width: Math.max(1, Math.round(size.width || 1)),
                      height: Math.max(1, Math.round(size.height || 1)),
                    };
                    handleUpdateSettings(next);
                    setDraftImportedSize(null);
                  },
                  onViewportPreset: (mode) => {
                    setDraftImportedSize(null);
                    handleUpdateSettings(mode === 'desktop' ? { width: 1380, height: 720 } : { width: 390, height: 720 });
                  },
                  onViewFaithful: () => handleSwitchRenderMode('raw'),
                }
              : undefined
          }
        />
      )}

      {!zenMode && (
        <ProfileTabs
          profiles={profiles}
          activeProfileId={activeProfileId}
          onSelectProfile={setActiveProfileId}
          onCloseProfile={handleCloseProfile}
          onNewProfile={handleNewProfile}
          onRenameProfile={handleRenameProfile}
        />
      )}

      {zenMode && (
        <button
          onClick={() => setZenMode(false)}
          className="fixed top-3 left-3 z-50 rounded-lg bg-slate-900/90 border border-slate-700 px-3 py-1.5 text-xs text-slate-300 shadow-xl backdrop-blur-md hover:bg-indigo-600 hover:text-white transition-colors"
        >
          Exit Zen Mode (Press Z)
        </button>
      )}

      <div className="relative flex flex-1 w-full overflow-hidden">
        {viewMode === 'canvas' && (
          <>
            {activeProfile.isImported && activeProfile.renderMode === 'raw' && (
              <ImportedCanvas
                profile={activeProfile}
                onSwitchToCanvasMode={() => handleSwitchRenderMode('canvas')}
              />
            )}
            {activeProfile.isImported && activeProfile.renderMode !== 'raw' && (
              <EditableImportedCanvas
                key={activeProfileId}
                ref={importedCanvasRef}
                profile={activeProfile}
                settings={settings}
                zoom={zoom}
                selectionMode={importedSelectionMode}
                draftSize={draftImportedSize}
                inspectedBbId={importedInspectedBbId}
                onUpdateSettings={handleUpdateSettings}
                onCommit={(newHtml) => {
                  updateActiveProfile((p) => ({ ...p, rawHtml: newHtml }));
                }}
                onSelectNode={(info) => {
                  setImportedNode(info);
                  setImportedInspectedBbId(null);
                  setImportedInspectedNode(null);
                  if (info) {
                    focusSelectedElementPane();
                  }
                }}
                onMultiSelectChange={setImportedMultiSelectCount}
                onTreeChange={setImportedTree}
                onSwitchToRaw={() => handleSwitchRenderMode('raw')}
              />
            )}
            {!activeProfile.isImported && (
              <Canvas
                key={activeProfileId}
                elements={elements}
                settings={settings}
                selectedId={selectedId}
                zoom={zoom}
                onSelectElement={(id) => {
                  setSelectedId(id);
                  if (id) focusSelectedElementPane();
                }}
                onUpdateElement={handleUpdateElement}
                onDeleteElement={handleDeleteElement}
                onDuplicateElement={handleDuplicateElement}
                onAddElement={handleAddElement}
                onAddCustomComponent={handleAddCustomComponent}
                onContextMenu={(e, el) => {
                  setContextMenu({ x: e.clientX, y: e.clientY, element: el });
                }}
                onOpenClipStudio={() => {
                  setDockTab('shape');
                  setIsDockOpen(true);
                }}
                onOpenMaskStudio={() => {
                  setDockTab('shape');
                  setIsDockOpen(true);
                }}
                onOpenAnimationStudio={() => {
                  setDockTab('animation');
                  setIsDockOpen(true);
                }}
                onSaveAsCustom={() => setShowSaveCustomModal(true)}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetZoom={handleResetZoom}
              />
            )}

            {!zenMode && (
              <DockPanel
                isOpen={isDockOpen}
                onToggleOpen={() => setIsDockOpen((prev) => !prev)}
                activeTab={dockTab}
                onSelectTab={setDockTab}
                selectedElement={selectedElement}
                elements={elements}
                settings={settings}
                customComponents={customComponents}
                onUpdateElement={(updates) => {
                  if (selectedId) handleUpdateElement(selectedId, updates);
                }}
                onAddElement={handleAddElement}
                onDeleteElement={handleDeleteElement}
                onDuplicateElement={handleDuplicateElement}
                onSelectElement={(id) => {
                  setSelectedId(id);
                  if (id) focusSelectedElementPane();
                }}
                onAddCustomComponent={handleAddCustomComponent}
                onDeleteCustomComponent={handleDeleteCustomComponent}
                onUpdateSettings={handleUpdateSettings}
                onOpenSaveCustomModal={() => setShowSaveCustomModal(true)}
                importedProfile={
                  activeProfile.isImported
                    ? {
                        renderMode: activeProfile.renderMode || 'canvas',
                        onSwitchRenderMode: handleSwitchRenderMode,
                        sourceUrl: activeProfile.sourceUrl,
                      }
                    : null
                }
                importedNode={importedNode}
                importedInspectedNode={importedInspectedNode}
                importedInspectedBbId={importedInspectedBbId}
                onInspectImportedNode={(bbId) => {
                  setImportedInspectedBbId(bbId);
                  setImportedInspectedNode(
                    bbId ? importedCanvasRef.current?.getNodeInfo(bbId) ?? null : null
                  );
                }}
                importedMultiSelectCount={importedMultiSelectCount}
                importedTree={importedTree}
                importedNodeActions={
                  activeProfile.isImported && activeProfile.renderMode === 'canvas'
                    ? {
                        selectNode: (bbId) =>
                          importedCanvasRef.current?.selectNode(bbId),
                        editNodeText: (bbId) =>
                          importedCanvasRef.current?.editNodeText(bbId),
                        updateStyle: (bbId, styleAttr) =>
                          importedCanvasRef.current?.updateStyle(bbId, styleAttr),
                        applyStyleToChildren: (bbId, selector, styleAttr) =>
                          importedCanvasRef.current?.applyStyleToChildren(bbId, selector, styleAttr) ?? 0,
                        updateText: (bbId, text) =>
                          importedCanvasRef.current?.updateText(bbId, text),
                        updateClassName: (bbId, className) =>
                          importedCanvasRef.current?.updateClassName(bbId, className),
                        updateAttribute: (bbId, name, value) =>
                          importedCanvasRef.current?.updateAttribute(bbId, name, value),
                        deleteNode: (bbId) =>
                          importedCanvasRef.current?.deleteNode(bbId),
                        duplicateNode: (bbId) =>
                          importedCanvasRef.current?.duplicateNode(bbId),
                        selectParent: (bbId) =>
                          importedCanvasRef.current?.selectParent(bbId),
                        selectCommentsPanel: (bbId) =>
                          importedCanvasRef.current?.selectCommentsPanel(bbId),
                        addComment: (bbId) =>
                          importedCanvasRef.current?.addComment(bbId),
                        deleteCommentThread: (bbId) =>
                          importedCanvasRef.current?.deleteCommentThread(bbId),
                        selectWishlistPanel: (bbId) =>
                          importedCanvasRef.current?.selectWishlistPanel(bbId),
                        addWishlistItem: (bbId) =>
                          importedCanvasRef.current?.addWishlistItem(bbId),
                        deleteWishlistItem: (bbId) =>
                          importedCanvasRef.current?.deleteWishlistItem(bbId),
                        addDedicatedComponent: (kind) =>
                          importedCanvasRef.current?.addDedicatedComponent(kind),
                        addJournalEntry: (bbId) =>
                          importedCanvasRef.current?.addJournalEntry(bbId),
                        deleteJournalEntry: (bbId) =>
                          importedCanvasRef.current?.deleteJournalEntry(bbId),
                        addFriend: (bbId) =>
                          importedCanvasRef.current?.addFriend(bbId),
                        deleteFriend: (bbId) =>
                          importedCanvasRef.current?.deleteFriend(bbId),
                        addEquipmentItem: (bbId) =>
                          importedCanvasRef.current?.addEquipmentItem(bbId),
                        deleteEquipmentItem: (bbId) =>
                          importedCanvasRef.current?.deleteEquipmentItem(bbId),
                        addContactAction: (bbId) =>
                          importedCanvasRef.current?.addContactAction(bbId),
                        deleteContactAction: (bbId) =>
                          importedCanvasRef.current?.deleteContactAction(bbId),
                        addFootprint: (bbId) =>
                          importedCanvasRef.current?.addFootprint(bbId),
                        deleteFootprint: (bbId) =>
                          importedCanvasRef.current?.deleteFootprint(bbId),
                        addBadge: (bbId) =>
                          importedCanvasRef.current?.addBadge(bbId),
                        deleteBadge: (bbId) =>
                          importedCanvasRef.current?.deleteBadge(bbId),
                        groupSelected: () =>
                          importedCanvasRef.current?.groupSelected() ?? null,
                        ungroupSelected: () =>
                          importedCanvasRef.current?.ungroupSelected(),
                        applyStyleToGroup: (groupBbId, styleAttr) =>
                          importedCanvasRef.current?.applyStyleToGroup(groupBbId, styleAttr),
                      }
                    : undefined
                }
              />
            )}
          </>
        )}

        {viewMode === 'forum-preview' && (
          <ForumPreview
            elements={elements}
            settings={settings}
            importedProfile={
              activeProfile.isImported
                ? { rawHtml: activeProfile.rawHtml, sourceUrl: activeProfile.sourceUrl }
                : null
            }
            onOpenTranspiler={() => setShowTranspilerModal(true)}
          />
        )}

        {viewMode === 'transpiler' && (
          <div className="flex-1 h-full w-full">
            <TranspilerModal
              elements={elements}
              settings={settings}
              importedProfile={
                activeProfile.isImported
                  ? { rawHtml: activeProfile.rawHtml, rawCss: activeProfile.rawCss }
                  : null
              }
              onClose={() => setViewMode('canvas')}
            />
          </div>
        )}
      </div>

      {contextMenu && (
        <RightClickMenu
          x={contextMenu.x}
          y={contextMenu.y}
          element={contextMenu.element}
          onClose={() => setContextMenu(null)}
          onDelete={() => {
            if (contextMenu.element) handleDeleteElement(contextMenu.element.id);
          }}
          onDuplicate={() => {
            if (contextMenu.element) handleDuplicateElement(contextMenu.element.id);
          }}
          onToggleLock={() => {
            if (contextMenu.element) {
              handleUpdateElement(contextMenu.element.id, {
                locked: !contextMenu.element.locked,
              });
            }
          }}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onMoveUp={handleMoveUp}
          onMoveDown={handleMoveDown}
          onOpenClipStudio={() => {
            setDockTab('shape');
            setIsDockOpen(true);
          }}
          onOpenMaskStudio={() => {
            setDockTab('shape');
            setIsDockOpen(true);
          }}
          onOpenAnimationStudio={() => {
            setDockTab('animation');
            setIsDockOpen(true);
          }}
          onSaveAsCustom={() => setShowSaveCustomModal(true)}
          onCopyHtml={() => {
            if (contextMenu.element) {
              navigator.clipboard.writeText(
                `<span style="color: ${contextMenu.element.colorMarker}">\n  ${contextMenu.element.content}\n</span>`
              );
            }
          }}
          onCopyBBCode={() => {
            if (contextMenu.element) {
              navigator.clipboard.writeText(
                `[color=${contextMenu.element.colorMarker}]\n${contextMenu.element.content}\n[/color]`
              );
            }
          }}
        />
      )}

      {showSaveCustomModal && selectedElement && (
        <CustomComponentModal
          element={selectedElement}
          onSave={handleSaveCustomComponent}
          onClose={() => setShowSaveCustomModal(false)}
        />
      )}

      {showTranspilerModal && viewMode !== 'transpiler' && (
        <TranspilerModal
          elements={elements}
          settings={settings}
          importedProfile={
            activeProfile.isImported
              ? { rawHtml: activeProfile.rawHtml, rawCss: activeProfile.rawCss }
              : null
          }
          onClose={() => setShowTranspilerModal(false)}
        />
      )}

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportProfile}
        />
      )}
    </div>
  );
};

export default App;
