import React from 'react';
import {
  PlusCircle,
  Sliders,
  Eye,
  Sparkles,
  BookmarkPlus,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Type,
  Quote as QuoteIcon,
  Image as ImageIcon,
  Video,
  Code2,
  ExternalLink,
  Minus,
  Box,
  Trash2,
  Copy,
  Lock,
  Unlock,
  EyeOff,
  GripVertical,
  X,
  MessageSquare,
  Gift,
  BookOpen,
  Users,
  Move,
} from 'lucide-react';
import {
  ProfileElement,
  CustomComponent,
  CanvasSettings,
  ClipConfig,
  MaskConfig,
  AnimationConfig,
  ElementType,
} from '../types/profile';
import { ClipEditor } from './ClipEditor';
import { MaskEditor } from './MaskEditor';
import { AnimationEditor } from './AnimationEditor';
import {
  ImportedDedicatedComponentKind,
  ImportedEffectsPatch,
  ImportedNodeEffects,
  ImportedNodeInfo,
  ImportedTreeNode,
} from './EditableImportedCanvas';
import { ImportedNodePropertiesPanel } from './ImportedNodePropertiesPanel';
import { ImportedEffectsPanel } from './ImportedEffectsPanel';
import { ImportedHierarchyTree } from './ImportedHierarchyTree';
import {
  GAIA_CATEGORIES,
  GAIA_COMPONENT_LIST,
  GaiaComponentKind,
  getGaiaComponent,
  panelIdFor,
} from '../utils/gaiaSpec';

export type DockTab =
  | 'elements'
  | 'properties'
  | 'shape'
  | 'animation'
  | 'custom'
  | 'layers'
  | 'canvas';

interface DockPanelProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  activeTab: DockTab;
  onSelectTab: (tab: DockTab) => void;
  selectedElement: ProfileElement | null;
  elements: ProfileElement[];
  settings: CanvasSettings;
  customComponents: CustomComponent[];
  onUpdateElement: (updates: Partial<ProfileElement>) => void;
  onAddElement: (type: ElementType, customProps?: Partial<ProfileElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onSelectElement: (id: string | null) => void;
  onAddCustomComponent: (comp: CustomComponent) => void;
  onDeleteCustomComponent: (id: string) => void;
  onUpdateSettings: (updates: Partial<CanvasSettings>) => void;
  onOpenSaveCustomModal: () => void;
  importedProfile: {
    renderMode: 'canvas' | 'raw';
    onSwitchRenderMode: (mode: 'canvas' | 'raw') => void;
    sourceUrl?: string;
  } | null;
  importedNode?: ImportedNodeInfo | null;
  importedInspectedNode?: ImportedNodeInfo | null;
  importedInspectedBbId?: string | null;
  onInspectImportedNode?: (bbId: string | null) => void;
  importedMultiSelectCount?: number;
  importedTree?: ImportedTreeNode[];
  /** Clip / mask / animation state for the selected imported node. */
  importedEffects?: ImportedNodeEffects | null;
  importedEffectsActions?: {
    applyEffects: (bbId: string, patch: ImportedEffectsPatch) => void;
    makeAbsolute: (bbId: string) => void;
    makeFlow: (bbId: string) => void;
  };
  importedNodeActions?: {
    selectNode: (bbId: string) => void;
    editNodeText: (bbId: string) => void;
    updateStyle: (bbId: string, styleAttr: string) => void;
    applyStyleToChildren: (bbId: string, selector: string, styleAttr: string) => number;
    groupSelected: () => string | null;
    ungroupSelected: () => void;
    applyStyleToGroup: (groupBbId: string, styleAttr: string) => void;
    updateText: (bbId: string, text: string) => void;
    updateClassName: (bbId: string, className: string) => void;
    updateAttribute: (bbId: string, name: string, value: string) => void;
    deleteNode: (bbId: string) => void;
    duplicateNode: (bbId: string) => void;
    selectParent: (bbId: string) => void;
    selectCommentsPanel: (bbId?: string) => void;
    addComment: (bbId?: string) => void;
    deleteCommentThread: (bbId: string) => void;
    selectWishlistPanel: (bbId?: string) => void;
    addWishlistItem: (bbId?: string) => void;
    deleteWishlistItem: (bbId: string) => void;
    addDedicatedComponent: (kind: ImportedDedicatedComponentKind) => void;
    addJournalEntry: (bbId?: string) => void;
    deleteJournalEntry: (bbId: string) => void;
    addFriend: (bbId?: string) => void;
    deleteFriend: (bbId: string) => void;
    addEquipmentItem: (bbId?: string) => void;
    deleteEquipmentItem: (bbId: string) => void;
    addContactAction: (bbId?: string) => void;
    deleteContactAction: (bbId: string) => void;
    addFootprint: (bbId?: string) => void;
    deleteFootprint: (bbId: string) => void;
    addBadge: (bbId?: string) => void;
    deleteBadge: (bbId: string) => void;
  };
}

export const DockPanel: React.FC<DockPanelProps> = ({
  isOpen,
  onToggleOpen,
  activeTab,
  onSelectTab,
  selectedElement,
  elements,
  settings,
  customComponents,
  onUpdateElement,
  onAddElement,
  onDeleteElement,
  onDuplicateElement,
  onSelectElement,
  onAddCustomComponent,
  onDeleteCustomComponent,
  onUpdateSettings,
  onOpenSaveCustomModal,
  importedProfile,
  importedNode,
  importedInspectedNode,
  importedInspectedBbId = null,
  onInspectImportedNode,
  importedMultiSelectCount = 0,
  importedTree = [],
  importedNodeActions,
  importedEffects = null,
  importedEffectsActions,
}) => {
  const [importedPropertiesTab, setImportedPropertiesTab] = React.useState<'global' | 'local'>('local');

  const findImportedTreeNode = React.useCallback(
    (nodes: ImportedTreeNode[], bbId: string | null): ImportedTreeNode | null => {
      if (!bbId) return null;
      for (const node of nodes) {
        if (node.bbId === bbId) return node;
        const found = findImportedTreeNode(node.children, bbId);
        if (found) return found;
      }
      return null;
    },
    []
  );

  const selectedImportedTree = importedNode?.bbId
    ? findImportedTreeNode(importedTree, importedNode.bbId)
    : null;
  const inspectedImportedTree = importedInspectedBbId
    ? findImportedTreeNode(importedTree, importedInspectedBbId)
    : null;

  const buildDynamicTargets = React.useCallback((scope: ImportedTreeNode[] | ImportedTreeNode | null): Array<{ label: string; selector: string }> => {
    const scopeNodes = Array.isArray(scope) ? scope : scope ? scope.children : importedTree;
    const seen = new Set<string>();
    const visit = (node: ImportedTreeNode) => {
      seen.add(node.tag.toLowerCase());
      node.className
        .split(/\s+/)
        .filter(Boolean)
        .forEach((cls) => seen.add(`.${cls}`));
      node.children.forEach(visit);
    };
    scopeNodes.forEach(visit);

    const options: Array<{ label: string; selector: string }> = [];
    const pushIf = (selector: string, label: string) => {
      if (seen.has(selector)) options.push({ selector, label });
    };

    pushIf('h2', 'Titles');
    pushIf('h3', 'Subtitles');
    pushIf('p', 'Text');
    pushIf('a', 'Links');
    pushIf('li', 'Rows');
    pushIf('img', 'Images');
    pushIf('.item', 'Items');
    pushIf('.postcontent', 'Content blocks');
    pushIf('.username', 'Usernames');

    if (options.length === 0) {
      Array.from(seen)
        .slice(0, 10)
        .forEach((selector) => options.push({ selector, label: selector }));
    }

    return options;
  }, [importedTree]);

  const dynamicChildTargets = React.useMemo(() => buildDynamicTargets(selectedImportedTree), [buildDynamicTargets, selectedImportedTree]);
  const inspectedChildTargets = React.useMemo(() => buildDynamicTargets(inspectedImportedTree), [buildDynamicTargets, inspectedImportedTree]);

  const selectedTreePanel = importedNodeActions ? (
    <ImportedHierarchyTree
      tree={selectedImportedTree ? [selectedImportedTree] : importedTree}
      selectedBbId={importedNode?.bbId || null}
      inspectedBbId={importedInspectedBbId}
      onSelect={(bbId) => onInspectImportedNode?.(bbId)}
      onEditText={importedNodeActions.editNodeText}
    />
  ) : null;

  const elementTemplates: Array<{
    type: ElementType;
    label: string;
    icon: React.ReactNode;
    bbcode: string;
    desc: string;
  }> = [
    { type: 'text', label: 'Styled Text', icon: <Type className="w-4 h-4 text-indigo-400" />, bbcode: '[color], [b], [i]', desc: 'Freeform text heading or paragraph' },
    { type: 'quote', label: 'Quote Block', icon: <QuoteIcon className="w-4 h-4 text-purple-400" />, bbcode: '[quote]', desc: 'Styled quote container' },
    { type: 'image', label: 'User Image', icon: <ImageIcon className="w-4 h-4 text-cyan-400" />, bbcode: '[img]', desc: 'Avatar or banner image' },
    { type: 'video', label: 'YouTube Embed', icon: <Video className="w-4 h-4 text-pink-400" />, bbcode: '[youtube]', desc: 'Embedded video player' },
    { type: 'code', label: 'Code Box', icon: <Code2 className="w-4 h-4 text-emerald-400" />, bbcode: '[code]', desc: 'Monospace code block' },
    { type: 'link', label: 'Hyperlink Button', icon: <ExternalLink className="w-4 h-4 text-amber-400" />, bbcode: '[url]', desc: 'Link badge/button' },
    { type: 'clear', label: 'Clear Float', icon: <Minus className="w-4 h-4 text-slate-400" />, bbcode: '[clear]', desc: 'Layout clearing divider' },
    { type: 'box', label: 'Container Box', icon: <Box className="w-4 h-4 text-blue-400" />, bbcode: '<span>', desc: 'Backdrop card/container' },
  ];

  /**
   * Every Gaia-supported V2 category is a first-class component.
   * Imported profiles insert real panel DOM; freeform profiles create a
   * `gaia-panel` element that code-generates the same V2 structure.
   */
  const gaiaIconFor = (kind: GaiaComponentKind): React.ReactNode => {
    switch (kind) {
      case 'details':
        return <Type className="w-4 h-4" />;
      case 'equipment':
      case 'house':
      case 'custom':
        return <Box className="w-4 h-4" />;
      case 'contact':
        return <ExternalLink className="w-4 h-4" />;
      case 'forums':
        return <Code2 className="w-4 h-4" />;
      case 'signature':
        return <QuoteIcon className="w-4 h-4" />;
      case 'footprints':
      case 'friends':
        return <Users className="w-4 h-4" />;
      case 'about':
      case 'journal':
        return <BookOpen className="w-4 h-4" />;
      case 'store':
        return <BookmarkPlus className="w-4 h-4" />;
      case 'badges':
        return <Sparkles className="w-4 h-4" />;
      case 'comments':
        return <MessageSquare className="w-4 h-4" />;
      case 'wishlist':
        return <Gift className="w-4 h-4" />;
      default:
        return <Box className="w-4 h-4" />;
    }
  };

  const addGaiaComponent = (kind: GaiaComponentKind) => {
    const def = getGaiaComponent(kind);
    if (importedProfile?.renderMode === 'canvas' && importedNodeActions) {
      importedNodeActions.addDedicatedComponent(kind as ImportedDedicatedComponentKind);
    } else {
      onAddElement('gaia-panel', {
        gaia: { kind, column: def.defaultColumn, title: def.defaultTitle },
      });
    }
    onSelectTab('properties');
  };

  const gaiaCategoryGroups = GAIA_CATEGORIES.map((category) => ({
    category,
    components: GAIA_COMPONENT_LIST.filter((def) => def.category === category),
  })).filter((group) => group.components.length > 0);

  const dockTabsConfig: Array<{ id: DockTab; label: string; icon: React.ReactNode; badge?: React.ReactNode }> = [
    { id: 'elements', label: 'Add', icon: <PlusCircle className="h-4 w-4" /> },
    { id: 'properties', label: 'Props', icon: <Sliders className="h-4 w-4" /> },
    { id: 'canvas', label: 'Canvas', icon: <SettingsIcon className="h-4 w-4" /> },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden h-14 items-center justify-around border-t border-slate-850 bg-slate-950/95 px-1 backdrop-blur-xl select-none">
        {dockTabsConfig.map((tab) => {
          const isActive = isOpen && activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                onSelectTab(tab.id);
                if (!isOpen) onToggleOpen();
              }}
              className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg transition-all ${
                isActive ? 'bg-indigo-600/30 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span className="text-[9px] mt-0.5">{tab.label}</span>
              {tab.badge && <span className="absolute top-1 right-1">{tab.badge}</span>}
            </button>
          );
        })}
      </div>

      {isOpen && (
        <div
          onClick={onToggleOpen}
          className="fixed inset-0 z-30 md:hidden bg-black/60 backdrop-blur-sm animate-in fade-in"
        />
      )}

      <aside
        className={`select-none transition-all duration-300 ease-out ${
          'md:!fixed md:!top-[84px] md:!right-0 md:!bottom-0 md:!left-auto md:!h-auto md:z-30 md:flex ' +
          (isOpen ? 'md:!w-[420px] lg:!w-[460px]' : 'md:!w-12') +
          (isOpen ? ' fixed bottom-0 left-0 right-0 z-40 h-[80dvh] rounded-t-2xl md:rounded-none' : ' hidden md:flex')
        }`}
      >
        <div className="hidden md:flex w-12 flex-col items-center justify-between border-l border-slate-800 bg-slate-950/95 py-3 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onToggleOpen}
              title={isOpen ? 'Collapse Panel' : 'Expand Panel'}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {isOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
            <div className="h-px w-6 bg-slate-800 my-1" />
            {dockTabsConfig.slice(0, 2).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  if (!isOpen) onToggleOpen();
                }}
                title={tab.label}
                className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  isOpen && activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {tab.icon}
                {tab.badge && <span className="absolute top-1 right-1">{tab.badge}</span>}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              onSelectTab('canvas');
              if (!isOpen) onToggleOpen();
            }}
            title="Profile & Canvas Settings"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              isOpen && activeTab === 'canvas'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>

        {isOpen && (
          <div className="flex-1 flex flex-col border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/98 backdrop-blur-2xl overflow-hidden shadow-2xl h-full">
            <div className="flex h-12 items-center justify-between border-b border-slate-800 px-4 bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-2">
                <span className="md:hidden h-1 w-8 rounded-full bg-slate-600 mx-auto block mb-1" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                  {activeTab === 'elements' && 'Add Elements'}
                  {activeTab === 'properties' && (selectedElement ? selectedElement.name : 'Properties')}
                  {activeTab === 'shape' && 'Mask & Clip'}
                  {activeTab === 'animation' && 'Animation Studio'}
                  {activeTab === 'custom' && 'Custom Drag-N-Drop'}
                  {activeTab === 'layers' && 'Layers & Hierarchy'}
                  {activeTab === 'canvas' && 'Profile Settings'}
                </h3>
              </div>
              <button
                onClick={onToggleOpen}
                className="flex items-center gap-1 rounded-lg bg-slate-800/80 px-2.5 py-1 text-slate-300 hover:bg-slate-700 hover:text-white text-xs transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-300 pb-20 md:pb-6">
              {activeTab === 'elements' && (
                <div className="space-y-3">
                  <section className="border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold text-cyan-200">
                        Gaia V2 Components
                      </div>
                      <span className="rounded bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-mono text-cyan-300">
                        {GAIA_COMPONENT_LIST.length} categories
                      </span>
                    </div>
                    <p className="text-[10px] leading-relaxed text-slate-400">
                      Every section the spec supports. Each one generates Gaia-native markup
                      (<code className="text-cyan-300">#columns &gt; .column &gt; .panel</code>) and
                      CSS keyed on the real panel classes and ids.
                    </p>
                    {gaiaCategoryGroups.map((group) => (
                      <div key={group.category} className="space-y-1.5">
                        <div className="text-[9px] uppercase tracking-wider text-slate-500">
                          {group.category}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {group.components.map((item) => (
                            <button
                              key={item.kind}
                              draggable
                              title={item.description}
                              onDragStart={(e) => {
                                e.dataTransfer.setData('application/imported-dedicated-kind', item.kind);
                                e.dataTransfer.setData('application/gaia-component-kind', item.kind);
                                e.dataTransfer.effectAllowed = 'copyMove';
                              }}
                              onClick={() => addGaiaComponent(item.kind)}
                              className="flex items-center gap-2 border border-slate-800 bg-slate-950/60 p-2 text-left hover:border-indigo-500 hover:bg-indigo-500/10"
                            >
                              <span className="shrink-0 text-cyan-300">{gaiaIconFor(item.kind)}</span>
                              <span className="min-w-0">
                                <span className="block truncate text-[11px] font-semibold">
                                  {item.label}
                                </span>
                                <span className="block truncate font-mono text-[9px] text-slate-500">
                                  {item.panelId || 'id_custom_####'}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </section>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
                    {elementTemplates.map((item) => (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => e.dataTransfer.setData('application/profile-element-type', item.type)}
                        onClick={() => onAddElement(item.type)}
                        className="group flex cursor-pointer items-center justify-between border border-slate-800 bg-slate-950/60 p-2.5 transition-all hover:border-indigo-500 hover:bg-indigo-500/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center bg-slate-850">
                            {item.icon}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-100 group-hover:text-indigo-300">{item.label}</div>
                            <div className="text-[10px] text-slate-400">{item.desc}</div>
                          </div>
                        </div>
                        <span className="bg-slate-800 px-1.5 py-0.5 text-[9px] font-mono text-indigo-300">{item.bbcode}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'properties' && (
                <>
                  {importedProfile && importedProfile.renderMode === 'canvas' && importedNodeActions ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-1 bg-slate-950 p-0.5 border border-slate-800">
                        <button
                          onClick={() => setImportedPropertiesTab('global')}
                          className={`px-2 py-1 text-[11px] font-semibold transition-colors ${
                            importedPropertiesTab === 'global' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Global
                        </button>
                        <button
                          onClick={() => setImportedPropertiesTab('local')}
                          className={`px-2 py-1 text-[11px] font-semibold transition-colors ${
                            importedPropertiesTab === 'local' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Local
                        </button>
                      </div>

                      {importedPropertiesTab === 'global' ? (
                        <div className="border border-slate-800 bg-slate-950 p-3 space-y-3">
                          <div className="text-[11px] font-semibold text-slate-200">Global Profile Styles</div>
                          {importedTree[0]?.bbId ? (
                            <>
                              <label className="block">
                                <span className="block text-[9px] text-slate-400 mb-1">Text color</span>
                                <input
                                  type="color"
                                  title={importedNode?.sources.globalColor || 'Global page style'}
                                  value={colorToHex(importedNode?.computed.globalColor || '#000000')}
                                  onChange={(e) => importedNodeActions.updateStyle(importedTree[0].bbId, `color: ${e.target.value} !important`)}
                                  className="h-8 w-12 border border-slate-700 bg-transparent p-0"
                                />
                              </label>
                              <label className="block">
                                <span className="block text-[9px] text-slate-400 mb-1">Background color</span>
                                <input
                                  type="color"
                                  title={importedNode?.sources.globalBackground || 'Global page style'}
                                  value={colorToHex(importedNode?.computed.globalBackground || '#000000')}
                                  onChange={(e) => importedNodeActions.updateStyle(importedTree[0].bbId, `background-color: ${e.target.value} !important`)}
                                  className="h-8 w-12 border border-slate-700 bg-transparent p-0"
                                />
                              </label>
                            </>
                          ) : (
                            <div className="text-[10px] text-slate-500">Select a node to inspect global values.</div>
                          )}
                        </div>
                      ) : (
                        <ImportedNodePropertiesPanel
                          treePanel={selectedTreePanel}
                          childTargets={dynamicChildTargets}
                          inspectedNode={importedInspectedNode || null}
                          inspectedChildTargets={inspectedChildTargets}
                          node={importedNode || null}
                          multiSelectCount={importedMultiSelectCount}
                          onGroupSelected={importedNodeActions.groupSelected}
                          onUngroupSelected={importedNodeActions.ungroupSelected}
                          onGroupStyle={(styleAttr) => importedNodeActions.applyStyleToGroup(importedNode?.bbId || '', styleAttr)}
                          onUpdateStyle={importedNodeActions.updateStyle}
                          onApplyStyleToChildren={importedNodeActions.applyStyleToChildren}
                          onUpdateText={importedNodeActions.updateText}
                          onUpdateClassName={importedNodeActions.updateClassName}
                          onUpdateAttribute={importedNodeActions.updateAttribute}
                          onDelete={importedNodeActions.deleteNode}
                          onDuplicate={importedNodeActions.duplicateNode}
                          onSelectParent={importedNodeActions.selectParent}
                          onSelectCommentsPanel={importedNodeActions.selectCommentsPanel}
                          onAddComment={importedNodeActions.addComment}
                          onDeleteCommentThread={importedNodeActions.deleteCommentThread}
                          onSelectWishlistPanel={importedNodeActions.selectWishlistPanel}
                          onAddWishlistItem={importedNodeActions.addWishlistItem}
                          onDeleteWishlistItem={importedNodeActions.deleteWishlistItem}
                          onAddJournalEntry={importedNodeActions.addJournalEntry}
                          onDeleteJournalEntry={importedNodeActions.deleteJournalEntry}
                          onAddFriend={importedNodeActions.addFriend}
                          onDeleteFriend={importedNodeActions.deleteFriend}
                          onAddEquipmentItem={importedNodeActions.addEquipmentItem}
                          onDeleteEquipmentItem={importedNodeActions.deleteEquipmentItem}
                          onAddContactAction={importedNodeActions.addContactAction}
                          onDeleteContactAction={importedNodeActions.deleteContactAction}
                          onAddFootprint={importedNodeActions.addFootprint}
                          onDeleteFootprint={importedNodeActions.deleteFootprint}
                          onAddBadge={importedNodeActions.addBadge}
                          onDeleteBadge={importedNodeActions.deleteBadge}
                          onOpenTab={(tab) => onSelectTab(tab)}
                          onMakeAbsolute={importedEffectsActions?.makeAbsolute}
                          onMakeFlow={importedEffectsActions?.makeFlow}
                          isAbsolute={importedEffects?.isAbsolute ?? false}
                          hasEffects={!!(importedEffects?.clipPath || importedEffects?.maskImage || importedEffects?.animation)}
                          onClearEffects={
                            importedEffectsActions
                              ? (bbId) =>
                                  importedEffectsActions.applyEffects(bbId, {
                                    clipPath: null,
                                    maskImage: null,
                                    animation: null,
                                    hoverAnimation: null,
                                  })
                              : undefined
                          }
                        />
                      )}
                    </div>
                  ) : selectedElement ? (
                    <div className="space-y-3">
                      <div className="border border-slate-800 bg-slate-950 p-3 space-y-2">
                        <input
                          type="text"
                          value={selectedElement.name}
                          onChange={(e) => onUpdateElement({ name: e.target.value })}
                          className="w-full bg-transparent border-b border-slate-800 px-0 py-1 text-sm font-semibold text-slate-100 focus:border-indigo-500 focus:outline-none"
                        />
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">{selectedElement.type}</div>
                        <button
                          onClick={onOpenSaveCustomModal}
                          className="bg-amber-500/20 px-2 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/30"
                        >
                          Save Custom
                        </button>
                      </div>

                      {selectedElement.type === 'gaia-panel' && selectedElement.gaia && (
                        <div className="border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-2">
                          <div className="text-[11px] font-semibold text-cyan-200">
                            Gaia V2 Component
                          </div>

                          <label className="block">
                            <span className="block text-[10px] text-slate-400 mb-1">Category</span>
                            <select
                              value={selectedElement.gaia.kind}
                              onChange={(e) => {
                                const kind = e.target.value as GaiaComponentKind;
                                const def = getGaiaComponent(kind);
                                onUpdateElement({
                                  gaia: {
                                    ...selectedElement.gaia!,
                                    kind,
                                    title: def.defaultTitle,
                                    panelId: def.panelId || undefined,
                                  },
                                });
                              }}
                              className="w-full border border-slate-700 bg-slate-950 px-2 py-1 text-slate-100 focus:border-indigo-500 focus:outline-none"
                            >
                              {GAIA_CATEGORIES.map((category) => (
                                <optgroup key={category} label={category}>
                                  {GAIA_COMPONENT_LIST.filter((d) => d.category === category).map((d) => (
                                    <option key={d.kind} value={d.kind}>
                                      {d.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </label>

                          <label className="block">
                            <span className="block text-[10px] text-slate-400 mb-1">
                              Panel title (h2)
                            </span>
                            <input
                              type="text"
                              value={selectedElement.gaia.title || ''}
                              onChange={(e) =>
                                onUpdateElement({
                                  gaia: { ...selectedElement.gaia!, title: e.target.value },
                                })
                              }
                              className="w-full border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 focus:border-indigo-500 focus:outline-none"
                            />
                          </label>

                          <label className="block">
                            <span className="block text-[10px] text-slate-400 mb-1">
                              Column placement
                            </span>
                            <div className="grid grid-cols-3 gap-1">
                              {([1, 2, 3] as const).map((column) => (
                                <button
                                  key={column}
                                  onClick={() =>
                                    onUpdateElement({
                                      gaia: { ...selectedElement.gaia!, column },
                                    })
                                  }
                                  className={`border px-2 py-1 text-[10px] font-semibold transition-colors ${
                                    selectedElement.gaia!.column === column
                                      ? 'border-cyan-500 bg-cyan-600/30 text-cyan-100'
                                      : 'border-slate-700 bg-slate-950 text-slate-400 hover:text-slate-200'
                                  }`}
                                >
                                  col {column}
                                </button>
                              ))}
                            </div>
                          </label>

                          <div className="space-y-0.5 font-mono text-[10px] text-slate-500">
                            <div>
                              panel: .panel.{getGaiaComponent(selectedElement.gaia.kind).panelClass.split(' ')[0]}
                              {selectedElement.gaia.panelId
                                ? ` #${selectedElement.gaia.panelId}`
                                : ` #${panelIdFor(getGaiaComponent(selectedElement.gaia.kind), 1)}`}
                            </div>
                            <div>layout: #columns &gt; #column_{selectedElement.gaia.column}</div>
                            {getGaiaComponent(selectedElement.gaia.kind).bbcodeRequired && (
                              <div className="text-pink-300">
                                BBCode: used only for this component&apos;s body content
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {['text', 'quote', 'code', 'link'].includes(selectedElement.type) && (
                        <textarea
                          rows={3}
                          value={selectedElement.content}
                          onChange={(e) => onUpdateElement({ content: e.target.value })}
                          className="w-full border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                        />
                      )}

                      {selectedElement.type === 'link' && (
                        <input
                          type="url"
                          value={selectedElement.linkUrl || ''}
                          onChange={(e) => onUpdateElement({ linkUrl: e.target.value })}
                          placeholder="https://example.com"
                          className="w-full border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-indigo-500 focus:outline-none"
                        />
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {numberField('Width', selectedElement.width, (v) => onUpdateElement({ width: v }))}
                        {numberField('Height', selectedElement.height, (v) => onUpdateElement({ height: v }))}
                        {numberField('X', selectedElement.x, (v) => onUpdateElement({ x: v }))}
                        {numberField('Y', selectedElement.y, (v) => onUpdateElement({ y: v }))}
                      </div>

                      <div className="border border-slate-800 bg-slate-950 p-3 space-y-2">
                        <label className="block text-[10px] text-slate-400">Text Color</label>
                        <input type="color" value={selectedElement.color || '#ffffff'} onChange={(e) => onUpdateElement({ color: e.target.value })} className="h-8 w-12 border border-slate-700 bg-transparent p-0" />
                        <label className="block text-[10px] text-slate-400">Background</label>
                        <input type="text" value={selectedElement.backgroundColor} onChange={(e) => onUpdateElement({ backgroundColor: e.target.value })} className="w-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px]" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                      <Sliders className="h-8 w-8 text-slate-600 mb-2" />
                      <p className="text-xs font-medium text-slate-300">No element selected</p>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'shape' && !selectedElement && importedNode && importedEffectsActions && (
                <>
                  <ImportedEffectsPanel
                    node={importedNode}
                    effects={importedEffects}
                    section="shape"
                    multiSelectCount={importedMultiSelectCount}
                    onApplyEffects={importedEffectsActions.applyEffects}
                    onMakeAbsolute={importedEffectsActions.makeAbsolute}
                    onMakeFlow={importedEffectsActions.makeFlow}
                  />
                  <ImportedEffectsPanel
                    node={importedNode}
                    effects={importedEffects}
                    section="position"
                    showHeader={false}
                    multiSelectCount={importedMultiSelectCount}
                    onApplyEffects={importedEffectsActions.applyEffects}
                    onMakeAbsolute={importedEffectsActions.makeAbsolute}
                    onMakeFlow={importedEffectsActions.makeFlow}
                  />
                </>
              )}

              {activeTab === 'shape' && !(!selectedElement && importedNode && importedEffectsActions) && !selectedElement && (
                <EmptyHint text="Select a component to edit clipping, masking and its positioning plane." />
              )}

              {activeTab === 'shape' && (
                selectedElement ? (
                  <div className="space-y-4">
                    <div className="border border-slate-800 bg-slate-950 p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                        <Move className="h-3.5 w-3.5 text-emerald-400" />
                        Absolute Plane
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] text-emerald-200">
                          position: absolute
                        </span>
                      </div>
                      <p className="text-[10px] leading-relaxed text-slate-400">
                        This element is positioned on the absolute plane of its Gaia custom panel —
                        left/top come from X/Y and the exported CSS pins it with{' '}
                        <span className="font-mono text-slate-300">position: absolute</span> inside{' '}
                        <span className="font-mono text-slate-300">#id_custom_N_content</span>.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {numberField('Absolute X', selectedElement.x, (v) => onUpdateElement({ x: v }))}
                        {numberField('Absolute Y', selectedElement.y, (v) => onUpdateElement({ y: v }))}
                        {numberField('Z-Index', selectedElement.zIndex, (v) => onUpdateElement({ zIndex: v }))}
                        {numberField('Rotate°', selectedElement.rotate, (v) => onUpdateElement({ rotate: v }))}
                      </div>
                    </div>
                    <div className="border border-slate-800 bg-slate-950 p-3">
                      <div className="text-[11px] font-semibold text-slate-200 mb-2">Clipping</div>
                      <ClipEditor element={selectedElement} onUpdateClip={(clip: ClipConfig) => onUpdateElement({ clip })} />
                    </div>
                    <div className="border border-slate-800 bg-slate-950 p-3">
                      <div className="text-[11px] font-semibold text-slate-200 mb-2">Masking</div>
                      <MaskEditor element={selectedElement} onUpdateMask={(mask: MaskConfig) => onUpdateElement({ mask })} />
                    </div>
                  </div>
                ) : (
                  <EmptyHint text="Select an element to edit clipping and masking." />
                )
              )}

              {activeTab === 'animation' && !selectedElement && importedNode && importedEffectsActions && (
                <ImportedEffectsPanel
                  node={importedNode}
                  effects={importedEffects}
                  section="animation"
                  multiSelectCount={importedMultiSelectCount}
                  onApplyEffects={importedEffectsActions.applyEffects}
                  onMakeAbsolute={importedEffectsActions.makeAbsolute}
                  onMakeFlow={importedEffectsActions.makeFlow}
                />
              )}

              {activeTab === 'animation' && (
                selectedElement
                  ? <AnimationEditor element={selectedElement} onUpdateAnimation={(animation: AnimationConfig) => onUpdateElement({ animation })} />
                  : (!importedEffectsActions || !importedNode) && <EmptyHint text="Select an element to edit animations." />
              )}

              {activeTab === 'custom' && (
                <div className="space-y-2">
                  {selectedElement && (
                    <button
                      onClick={onOpenSaveCustomModal}
                      className="bg-amber-500/20 px-2.5 py-1 text-[10px] font-medium text-amber-300 hover:bg-amber-500/30"
                    >
                      Save Current
                    </button>
                  )}
                  {customComponents.map((comp) => (
                    <div key={comp.id} draggable onDragStart={(e) => e.dataTransfer.setData('application/custom-component-json', JSON.stringify(comp))} className="border border-slate-800 bg-slate-950 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-100 text-xs">{comp.title}</div>
                        <span className="bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-400">{comp.category}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">{comp.description}</p>
                      <div className="flex items-center justify-between">
                        <button onClick={() => onAddCustomComponent(comp)} className="bg-amber-500/20 px-2.5 py-1 text-[10px] font-medium text-amber-300 hover:bg-amber-500/30">Add to Canvas</button>
                        <button onClick={() => onDeleteCustomComponent(comp.id)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'layers' && (
                importedProfile && importedProfile.renderMode === 'canvas' && importedNodeActions ? (
                  <ImportedHierarchyTree
                    tree={importedTree}
                    selectedBbId={importedNode?.bbId || null}
                    onSelect={importedNodeActions.selectNode}
                    onEditText={importedNodeActions.editNodeText}
                  />
                ) : (
                  <div className="space-y-1">
                    {[...elements].sort((a, b) => b.zIndex - a.zIndex).map((el) => (
                      <div
                        key={el.id}
                        onClick={() => onSelectElement(el.id)}
                        className={`flex items-center justify-between border px-2.5 py-2 cursor-pointer ${selectedElement?.id === el.id ? 'border-indigo-500 bg-indigo-500/15 text-indigo-200' : 'border-slate-800 bg-slate-950/60 text-slate-300'}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <GripVertical className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                          <div className="truncate">
                            <div className="font-medium text-xs truncate">{el.name}</div>
                            <div className="text-[9px] text-slate-400 font-mono">z-index: {el.zIndex} | {el.type}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); onUpdateElement({ hidden: !el.hidden }); }} className="p-1 text-slate-400 hover:text-slate-200">{el.hidden ? <EyeOff className="w-3.5 h-3.5 text-red-400" /> : <Eye className="w-3.5 h-3.5" />}</button>
                          <button onClick={(e) => { e.stopPropagation(); onUpdateElement({ locked: !el.locked }); }} className="p-1 text-slate-400 hover:text-slate-200">{el.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}</button>
                          <button onClick={(e) => { e.stopPropagation(); onDuplicateElement(el.id); }} className="p-1 text-slate-400 hover:text-slate-200"><Copy className="w-3.5 h-3.5" /></button>
                          <button onClick={(e) => { e.stopPropagation(); onDeleteElement(el.id); }} className="p-1 text-slate-400 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {activeTab === 'canvas' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Profile Title</label>
                    <input type="text" value={settings.profileTitle} onChange={(e) => onUpdateSettings({ profileTitle: e.target.value })} className="w-full border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {numberField('Canvas Width', settings.width, (v) => onUpdateSettings({ width: v }))}
                    {numberField('Canvas Height', settings.height, (v) => onUpdateSettings({ height: v }))}
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Background Color</label>
                    <input type="text" value={settings.backgroundColor} onChange={(e) => onUpdateSettings({ backgroundColor: e.target.value })} className="w-full border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:outline-none" />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

function colorToHex(raw: string): string {
  const match = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  return match
    ? `#${[match[1], match[2], match[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('')}`
    : raw.startsWith('#') ? raw : '#000000';
}

function numberField(label: string, value: number, onChange: (value: number) => void) {
  return (
    <div>
      <span className="text-[10px] text-slate-400">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full border border-slate-800 bg-slate-950 px-2 py-1 text-slate-100 font-mono"
      />
    </div>
  );
}

const EmptyHint: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-center py-8 text-slate-400">{text}</div>
);
