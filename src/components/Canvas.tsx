import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ProfileElement,
  CanvasSettings,
  ElementType,
  CustomComponent,
} from '../types/profile';
import { getClipPathCss, getMaskCss } from '../utils/bbcodeTranspiler';
import {
  columnForX,
  gaiaPanelPreview,
  getGaiaComponent,
  isGaiaComponentKind,
} from '../utils/gaiaSpec';
import { FloatingMicroBar } from './FloatingMicroBar';
import { RotateCw, Lock, ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface CanvasProps {
  elements: ProfileElement[];
  settings: CanvasSettings;
  selectedId: string | null;
  zoom: number;
  onSelectElement: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<ProfileElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (id: string) => void;
  onAddElement: (type: ElementType, customProps?: Partial<ProfileElement>) => void;
  onAddCustomComponent: (comp: CustomComponent) => void;
  onContextMenu: (e: React.MouseEvent, element: ProfileElement | null) => void;
  onOpenClipStudio: () => void;
  onOpenMaskStudio: () => void;
  onOpenAnimationStudio: () => void;
  onSaveAsCustom: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const Canvas: React.FC<CanvasProps> = ({
  elements,
  settings,
  selectedId,
  zoom,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onAddElement,
  onAddCustomComponent,
  onContextMenu,
  onOpenClipStudio,
  onOpenMaskStudio,
  onOpenAnimationStudio,
  onSaveAsCustom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Guard against browser firing click immediately after drop which would deselect element
  const justDroppedRef = useRef<boolean>(false);

  // Dragging & Interaction States
  const [dragAction, setDragAction] = useState<
    | {
        type: 'move';
        startX: number;
        startY: number;
        elX: number;
        elY: number;
        hasMovedPastThreshold: boolean;
      }
    | {
        type: 'resize';
        handle: ResizeHandle;
        startX: number;
        startY: number;
        elX: number;
        elY: number;
        elW: number;
        elH: number;
      }
    | {
        type: 'rotate';
        centerX: number;
        centerY: number;
        startAngle: number;
        currentAngle: number;
      }
    | null
  >(null);

  // Inline text editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedElement = elements.find((el) => el.id === selectedId) || null;

  // Auto select all text when entering inline edit mode
  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingId]);

  // Snap helper
  const snap = useCallback(
    (val: number): number => {
      if (!settings.gridSnap) return Math.round(val);
      const size = settings.gridSize || 10;
      return Math.round(val / size) * size;
    },
    [settings.gridSnap, settings.gridSize]
  );

  // Pointer Down for Moving Element with drag threshold to avoid accidental moves when selecting text
  const handleElementPointerDown = (e: React.PointerEvent, element: ProfileElement) => {
    if (e.button !== 0) return; // only left click / primary touch

    // If already editing text or clicking in an input/textarea, do not start moving.
    // Still stop propagation so the container never receives this pointerdown
    // (otherwise it would deselect / exit editing mid-text-selection).
    const targetTag = (e.target as HTMLElement).tagName?.toLowerCase();
    if (editingId === element.id || targetTag === 'textarea' || targetTag === 'input') {
      e.stopPropagation();
      return;
    }

    e.stopPropagation();
    onSelectElement(element.id);

    if (element.locked) return;

    setDragAction({
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      elX: element.x,
      elY: element.y,
      hasMovedPastThreshold: false,
    });

    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Pointer Down for Resize Handle
  const handleResizePointerDown = (
    e: React.PointerEvent,
    handle: ResizeHandle,
    element: ProfileElement
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();

    setDragAction({
      type: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      elX: element.x,
      elY: element.y,
      elW: element.width,
      elH: element.height,
    });

    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Pointer Down for Rotate Handle
  const handleRotatePointerDown = (e: React.PointerEvent, element: ProfileElement) => {
    if (e.button !== 0 || !canvasRef.current) return;
    e.stopPropagation();

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const centerX = canvasRect.left + (element.x + element.width / 2) * zoom;
    const centerY = canvasRect.top + (element.y + element.height / 2) * zoom;

    setDragAction({
      type: 'rotate',
      centerX,
      centerY,
      startAngle: element.rotate || 0,
      currentAngle: element.rotate || 0,
    });

    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Global Pointer Move with 4px threshold for move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragAction || !selectedElement) return;

    if (dragAction.type === 'move') {
      const distance = Math.hypot(e.clientX - dragAction.startX, e.clientY - dragAction.startY);
      // Don't move element unless distance exceeds 4px (prevents text clicks from moving element)
      if (!dragAction.hasMovedPastThreshold && distance < 4) {
        return;
      }

      dragAction.hasMovedPastThreshold = true;

      const deltaX = (e.clientX - dragAction.startX) / zoom;
      const deltaY = (e.clientY - dragAction.startY) / zoom;
      const newX = snap(dragAction.elX + deltaX);
      const newY = snap(dragAction.elY + deltaY);

      onUpdateElement(selectedElement.id, { x: newX, y: newY });
    } else if (dragAction.type === 'resize') {
      const deltaX = (e.clientX - dragAction.startX) / zoom;
      const deltaY = (e.clientY - dragAction.startY) / zoom;

      let newX = dragAction.elX;
      let newY = dragAction.elY;
      let newW = dragAction.elW;
      let newH = dragAction.elH;

      const handle = dragAction.handle;

      if (handle.includes('e')) newW = Math.max(20, dragAction.elW + deltaX);
      if (handle.includes('s')) newH = Math.max(20, dragAction.elH + deltaY);
      if (handle.includes('w')) {
        const potentialW = dragAction.elW - deltaX;
        if (potentialW > 20) {
          newW = potentialW;
          newX = dragAction.elX + deltaX;
        }
      }
      if (handle.includes('n')) {
        const potentialH = dragAction.elH - deltaY;
        if (potentialH > 20) {
          newH = potentialH;
          newY = dragAction.elY + deltaY;
        }
      }

      onUpdateElement(selectedElement.id, {
        x: snap(newX),
        y: snap(newY),
        width: snap(newW),
        height: snap(newH),
      });
    } else if (dragAction.type === 'rotate') {
      const rad = Math.atan2(e.clientY - dragAction.centerY, e.clientX - dragAction.centerX);
      let deg = Math.round((rad * 180) / Math.PI) - 90;
      if (deg < 0) deg += 360;

      // Snap to 15 degrees if Shift is pressed
      if (e.shiftKey) {
        deg = Math.round(deg / 15) * 15;
      }

      onUpdateElement(selectedElement.id, { rotate: deg });
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragAction) {
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // pointer capture fallback
      }
      setDragAction(null);
    }
  };

  // Drag and Drop from external or dock onto canvas
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Mark justDropped to ignore subsequent click event that browser may fire
    justDroppedRef.current = true;
    setTimeout(() => {
      justDroppedRef.current = false;
    }, 200);

    if (!canvasRef.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const dropX = snap((e.clientX - canvasRect.left) / zoom);
    const dropY = snap((e.clientY - canvasRect.top) / zoom);

    // Check if dropping a preset component
    const customJson = e.dataTransfer.getData('application/custom-component-json');
    if (customJson) {
      try {
        const comp: CustomComponent = JSON.parse(customJson);
        const modifiedComp: CustomComponent = {
          ...comp,
          elements: comp.elements.map((el, i) => ({
            ...el,
            id: `el_${Date.now()}_${i}`,
            x: dropX + (el.x - comp.elements[0].x),
            y: dropY + (el.y - comp.elements[0].y),
          })),
        };
        onAddCustomComponent(modifiedComp);
        return;
      } catch (err) {
        console.error('Failed to parse dropped custom component', err);
      }
    }

    // Check if dropping a Gaia-supported component
    const gaiaKind = e.dataTransfer.getData('application/gaia-component-kind');
    if (gaiaKind && isGaiaComponentKind(gaiaKind)) {
      const def = getGaiaComponent(gaiaKind);
      const column = columnForX(settings, dropX);
      onAddElement('gaia-panel', {
        x: dropX,
        y: dropY,
        gaia: { kind: gaiaKind, column, title: def.defaultTitle },
      });
      return;
    }

    // Check if dropping an element type
    const elementType = e.dataTransfer.getData(
      'application/profile-element-type'
    ) as ElementType | null;

    if (elementType) {
      onAddElement(elementType, { x: dropX, y: dropY });
    }
  };

  // Keyboard Shortcuts: Delete, Nudge, Duplicate, Escape, Ctrl+A for text selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If actively editing in textarea, do not intercept normal typing or selection
      if (editingId) return;

      if (!selectedElement) return;

      // When an element is selected, pressing Ctrl+A / Cmd+A enters text edit mode and selects all text
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        const hasText = ['text', 'quote', 'link', 'code', 'box'].includes(selectedElement.type);
        if (hasText) {
          e.preventDefault();
          setEditingId(selectedElement.id);
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteElement(selectedElement.id);
      } else if (e.key === 'Escape') {
        onSelectElement(null);
      } else if (e.key === 'Enter') {
        const hasText = ['text', 'quote', 'link', 'code', 'box'].includes(selectedElement.type);
        if (hasText) {
          e.preventDefault();
          setEditingId(selectedElement.id);
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        onDuplicateElement(selectedElement.id);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;

        onUpdateElement(selectedElement.id, {
          x: selectedElement.x + dx,
          y: selectedElement.y + dy,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedElement,
    editingId,
    onDeleteElement,
    onDuplicateElement,
    onSelectElement,
    onUpdateElement,
  ]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 h-full w-full overflow-auto bg-[#07090e] p-2 sm:p-4 md:p-8 touch-pan-x touch-pan-y"
      onPointerDown={(e) => {
        // Deselect on pointerdown (NOT click!). Click events fire on the common
        // ancestor when a drag-select starts in a textarea and releases elsewhere,
        // which was wrongly exiting the editing phase. Pointerdown targets are
        // always the truly pressed node, and every interactive child
        // (elements, handles, textarea, microbar) stops propagation.
        if (justDroppedRef.current) return;
        if (e.button !== 0) return;
        onSelectElement(null);
        setEditingId(null);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu(e, null);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Centered Canvas Wrapper: explicitly sized to the scaled dimensions.
          The canvas is absolutely positioned inside so flexbox can NEVER
          shrink its 720px layout width at zoom < 1 (which previously
          collapsed the background into a narrow strip while absolutely
          positioned elements overflowed outside it). */}
      <div
        className="relative mx-auto mb-24"
        style={{
          width: `${settings.width * zoom}px`,
          height: `${settings.height * zoom}px`,
        }}
      >
        <div
          ref={canvasRef}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="absolute top-0 left-0 shadow-2xl rounded-sm border border-slate-800"
          style={{
            width: `${settings.width}px`,
            minWidth: `${settings.width}px`,
            height: `${settings.height}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            backgroundColor: settings.backgroundColor,
            backgroundImage: settings.backgroundImage
              ? `url('${settings.backgroundImage}')`
              : undefined,
            backgroundRepeat: settings.backgroundRepeat || 'no-repeat',
            backgroundSize: settings.backgroundSize || 'cover',
            backgroundPosition: 'center top',
          }}
        >
          {/* Subtle Grid Overlay */}
          {settings.showGrid && (
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle, #6366f1 1px, transparent 1px)`,
                backgroundSize: `${settings.gridSize || 10}px ${settings.gridSize || 10}px`,
              }}
            />
          )}

          {/* Render Elements */}
          {elements
            .filter((el) => !el.hidden)
            .map((el) => {
              const isSelected = selectedId === el.id;
              const clipCss = getClipPathCss(el);
              const maskCss = getMaskCss(el);

              // Pure CSS keyframe animation rule for canvas rendering
              let animCss = 'none';
              if (el.animation && el.animation.enabled && el.animation.trigger !== 'hover') {
                const a = el.animation;
                animCss = `${a.preset} ${a.duration}s ${a.timing} ${a.delay}s ${a.iteration} ${a.direction}`;
              }

              return (
                <div
                  key={el.id}
                  id={el.id}
                  onPointerDown={(e) => handleElementPointerDown(e, el)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSelectElement(el.id);
                    onContextMenu(e, el);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (['text', 'quote', 'code', 'link', 'box', 'gaia-panel'].includes(el.type)) {
                      setEditingId(el.id);
                    }
                  }}
                  className={`absolute group touch-none cursor-move transition-shadow ${
                    isSelected
                      ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900 shadow-xl'
                      : 'hover:ring-1 hover:ring-indigo-400/60'
                  }`}
                  style={{
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width}px`,
                    height: `${el.height}px`,
                    zIndex: el.zIndex,
                    transform: `rotate(${el.rotate || 0}deg)`,
                    opacity: el.opacity / 100,
                    animation: animCss,
                  }}
                >
                  {/* Element Inner Content rendered strictly according to tag specs */}
                  <div
                    className="w-full h-full overflow-hidden"
                    style={{
                      backgroundColor: el.backgroundColor,
                      backgroundImage: el.backgroundImage
                        ? `url('${el.backgroundImage}')`
                        : undefined,
                      border:
                        el.borderWidth > 0
                          ? `${el.borderWidth}px ${el.borderStyle} ${el.borderColor}`
                          : undefined,
                      borderRadius: `${el.borderRadius}px`,
                      boxShadow: el.boxShadow !== 'none' ? el.boxShadow : undefined,
                      backdropFilter: el.backdropFilter,
                      padding: `${el.padding}px`,
                      clipPath: clipCss || undefined,
                      WebkitMaskImage: maskCss.webkitMask || undefined,
                      maskImage: maskCss.mask || undefined,
                      color: el.color,
                      fontSize: `${el.fontSize}px`,
                      fontWeight: el.fontWeight,
                      fontStyle: el.fontStyle,
                      textDecoration: el.textDecoration,
                      textAlign: el.textAlign,
                      fontFamily: el.fontFamily,
                    }}
                  >
                    {/* Inline Content Editor or Display */}
                    {editingId === el.id ? (
                      <textarea
                        ref={textareaRef}
                        value={el.content}
                        onChange={(e) => onUpdateElement(el.id, { content: e.target.value })}
                        onBlur={() => setEditingId(null)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="w-full h-full bg-slate-900/95 text-white p-2 rounded border border-indigo-400 focus:outline-none resize-none font-inherit text-inherit shadow-2xl z-30"
                      />
                    ) : (
                      <>
                        {/* QUOTE: <div class="quote"> */}
                        {el.type === 'quote' && (
                          <div className="quote h-full w-full flex items-center select-text">
                            {el.content || 'Quote text'}
                          </div>
                        )}

                        {/* IMAGE: <img class="user_img"> */}
                        {el.type === 'image' && (
                          <img
                            src={
                              el.content ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80'
                            }
                            alt={el.name}
                            className="user_img w-full h-full object-cover pointer-events-none"
                          />
                        )}

                        {/* VIDEO: <iframe> */}
                        {el.type === 'video' && (
                          <div className="w-full h-full pointer-events-none bg-black flex items-center justify-center">
                            <iframe
                              src={`https://www.youtube-nocookie.com/embed/${el.content}?autoplay=0&controls=0`}
                              title={el.name}
                              className="w-full h-full border-0 pointer-events-none"
                            />
                          </div>
                        )}

                        {/* CODE: <div class="code"> */}
                        {el.type === 'code' && (
                          <div className="code h-full w-full whitespace-pre-wrap overflow-auto select-text">
                            {el.content}
                          </div>
                        )}

                        {/* CLEAR: <div class="clear"> */}
                        {el.type === 'clear' && (
                          <div className="clear w-full h-full flex items-center justify-center border border-dashed border-slate-600">
                            <span className="text-[9px] text-slate-400 font-mono">[clear ]</span>
                          </div>
                        )}

                        {/* LINK: <a> */}
                        {el.type === 'link' && (
                          <a
                            href={el.linkUrl || '#'}
                            onClick={(e) => e.preventDefault()}
                            className="w-full h-full flex items-center justify-center hover:opacity-90 select-text"
                          >
                            {el.content || 'Link Action'}
                          </a>
                        )}

                        {/* TEXT or BOX */}
                        {(el.type === 'text' || el.type === 'box') && (
                          <div className="w-full h-full flex items-center select-text">
                            {el.content}
                          </div>
                        )}

                        {/* GAIA V2 COMPONENT — rendered as its real panel structure */}
                        {el.type === 'gaia-panel' && el.gaia && (
                          <div className="w-full h-full flex flex-col bg-slate-950/85 pointer-events-none">
                            <div className="flex items-center justify-between gap-1 border-b border-cyan-500/30 bg-cyan-500/15 px-1.5 py-0.5">
                              <span className="truncate font-mono text-[9px] text-cyan-200">
                                .panel.{getGaiaComponent(el.gaia.kind).panelClass.split(' ')[0]}
                              </span>
                              <span className="shrink-0 font-mono text-[9px] text-cyan-300/80">
                                col {el.gaia.column}
                              </span>
                            </div>
                            <div className="truncate border-b border-slate-700/60 px-2 py-1 text-[11px] font-semibold text-indigo-200">
                              {el.gaia.title || el.content || getGaiaComponent(el.gaia.kind).defaultTitle}
                            </div>
                            <div className="flex-1 space-y-0.5 overflow-hidden px-2 py-1">
                              {gaiaPanelPreview(el.gaia.kind, el.gaia.column, el.gaia.title, el.gaia.panelId).rows.map(
                                (row) => (
                                  <div key={row} className="truncate font-mono text-[9px] text-slate-400">
                                    ▦ {row}
                                  </div>
                                )
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-1 border-t border-slate-800 px-1.5 py-0.5 font-mono text-[8px] text-slate-500">
                              <span className="truncate">
                                #{el.gaia.panelId || getGaiaComponent(el.gaia.kind).panelId || 'id_custom_####'}
                              </span>
                              {getGaiaComponent(el.gaia.kind).bbcodeRequired && (
                                <span className="shrink-0 text-pink-400/80">bbcode</span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Lock Indicator */}
                  {el.locked && (
                    <div className="absolute top-1 right-1 rounded bg-amber-500/80 p-0.5 text-slate-950">
                      <Lock className="w-3 h-3" />
                    </div>
                  )}

                  {/* Selection Overlay & 8-Point Bounding Box Handles */}
                  {isSelected && !el.locked && (
                    <>
                      {/* Bounding Box Border */}
                      <div className="absolute inset-0 pointer-events-none border border-indigo-400" />

                      {/* Selector Label Badge — Gaia components show their panel selector */}
                      <div className="absolute -top-5 left-0 rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-mono text-white pointer-events-none whitespace-nowrap shadow">
                        {el.type === 'gaia-panel' && el.gaia
                          ? `#${el.gaia.panelId || getGaiaComponent(el.gaia.kind).panelId || 'id_custom_####'}`
                          : `span[style*='color: ${el.colorMarker}']`}
                      </div>

                      {/* Rotate Handle */}
                      <div
                        className="absolute -top-7 left-1/2 -translate-x-1/2 flex h-5 w-5 items-center justify-center rounded-full border border-indigo-400 bg-indigo-600 text-white shadow-md cursor-grab active:cursor-grabbing hover:scale-110 transition-transform touch-none"
                        onPointerDown={(e) => handleRotatePointerDown(e, el)}
                        title="Rotate element"
                      >
                        <RotateCw className="w-3 h-3" />
                      </div>

                      {/* 8 Resize Handles */}
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, 'nw', el)}
                        className="absolute -top-1.5 -left-1.5 h-3 w-3 rounded-sm border border-indigo-400 bg-white cursor-nw-resize hover:scale-125 transition-transform touch-none"
                      />
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, 'n', el)}
                        className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-sm border border-indigo-400 bg-white cursor-n-resize hover:scale-125 transition-transform touch-none"
                      />
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, 'ne', el)}
                        className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-sm border border-indigo-400 bg-white cursor-ne-resize hover:scale-125 transition-transform touch-none"
                      />
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, 'e', el)}
                        className="absolute top-1/2 -translate-y-1/2 -right-1.5 h-3 w-3 rounded-sm border border-indigo-400 bg-white cursor-e-resize hover:scale-125 transition-transform touch-none"
                      />
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, 'se', el)}
                        className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-sm border border-indigo-400 bg-white cursor-se-resize hover:scale-125 transition-transform touch-none"
                      />
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, 's', el)}
                        className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rounded-sm border border-indigo-400 bg-white cursor-s-resize hover:scale-125 transition-transform touch-none"
                      />
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, 'sw', el)}
                        className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-sm border border-indigo-400 bg-white cursor-sw-resize hover:scale-125 transition-transform touch-none"
                      />
                      <div
                        onPointerDown={(e) => handleResizePointerDown(e, 'w', el)}
                        className="absolute top-1/2 -translate-y-1/2 -left-1.5 h-3 w-3 rounded-sm border border-indigo-400 bg-white cursor-w-resize hover:scale-125 transition-transform touch-none"
                      />
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Floating Contextual MicroBar attached near selected element */}
      {selectedElement && (
        <FloatingMicroBar
          element={selectedElement}
          zoom={zoom}
          canvasRect={canvasRef.current ? canvasRef.current.getBoundingClientRect() : null}
          onUpdate={(updates) => onUpdateElement(selectedElement.id, updates)}
          onDelete={() => onDeleteElement(selectedElement.id)}
          onDuplicate={() => onDuplicateElement(selectedElement.id)}
          onOpenClipStudio={onOpenClipStudio}
          onOpenMaskStudio={onOpenMaskStudio}
          onOpenAnimationStudio={onOpenAnimationStudio}
          onSaveAsCustom={onSaveAsCustom}
          onStartInlineEdit={() => setEditingId(selectedElement.id)}
        />
      )}

      {/* Mobile Floating Zoom Controls (Visible on mobile screens) */}
      <div
        className="fixed bottom-16 right-3 md:hidden z-20 flex flex-col gap-1.5 rounded-xl border border-slate-750 bg-slate-900/90 p-1 backdrop-blur-md shadow-xl"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {onZoomIn && (
          <button
            onClick={onZoomIn}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        )}
        {onResetZoom && (
          <button
            onClick={onResetZoom}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title="Reset Zoom"
          >
            <Maximize className="w-4 h-4" />
          </button>
        )}
        {onZoomOut && (
          <button
            onClick={onZoomOut}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Non-invasive Bottom-Left Quick Shortcut Hint (Desktop only) */}
      <div className="fixed bottom-3 left-4 z-20 hidden md:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[10px] text-slate-400 backdrop-blur-md shadow-md pointer-events-none select-none">
        <span className="flex items-center gap-1 font-mono text-slate-300">
          <kbd className="rounded bg-slate-800 px-1 py-0.5 border border-slate-700">Right-Click</kbd> Menu
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 font-mono text-slate-300">
          <kbd className="rounded bg-slate-800 px-1 py-0.5 border border-slate-700">Ctrl+A</kbd> Select Text
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 font-mono text-slate-300">
          <kbd className="rounded bg-slate-800 px-1 py-0.5 border border-slate-700">Z</kbd> Zen
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 font-mono text-slate-300">
          <kbd className="rounded bg-slate-800 px-1 py-0.5 border border-slate-700">Tab</kbd> Dock
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 font-mono text-slate-300">
          <kbd className="rounded bg-slate-800 px-1 py-0.5 border border-slate-700">Ctrl+D</kbd> Clone
        </span>
        <span>•</span>
        <span className="flex items-center gap-1 font-mono text-slate-300">
          <kbd className="rounded bg-slate-800 px-1 py-0.5 border border-slate-700">Arrows</kbd> Nudge
        </span>
      </div>
    </div>
  );
};
