import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Maximize, Minus, Plus } from 'lucide-react';

interface ProfilePreviewProps {
  /** A complete profile document (head + `#columns` body). */
  document: string;
  /** Profile page width in px — Gaia's V2 shell is 1000px. */
  width?: number;
  /** Rendered page height in px; the viewport scrolls through it. */
  height?: number;
  /** iframe title (kept stable for the verify harness). */
  title?: string;
  /** Content rendered at the left of the preview toolbar. */
  toolbar?: React.ReactNode;
  /** Content rendered after the zoom controls. */
  actions?: React.ReactNode;
}

const ZOOM_STEPS = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.25, 1.5, 2];
const MIN_ZOOM = 0.15;
const MAX_ZOOM = 2;

const clamp = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

/**
 * Full-profile preview surface. Renders the whole V2 page (all three columns)
 * scaled inside a scrollable viewport, with zoom controls and a fit-to-width
 * action. Square, 1px-bordered chrome — no rounded corners.
 */
export const ProfilePreview: React.FC<ProfilePreviewProps> = ({
  document,
  width = 1000,
  height = 1200,
  title = 'Profile tools preview',
  toolbar,
  actions,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(0.75);
  const [fitWidth, setFitWidth] = useState(true);

  /** Zoom that makes the profile column block span the viewport. */
  const measureFit = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return null;
    const available = viewport.clientWidth - 16;
    if (available <= 0) return null;
    return clamp(available / width);
  }, [width]);

  useLayoutEffect(() => {
    const fit = measureFit();
    if (fit !== null && fitWidth) setZoom(fit);
  }, [measureFit, fitWidth]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (fitWidth) {
        const fit = measureFit();
        if (fit !== null) setZoom(fit);
      }
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [fitWidth, measureFit]);

  const step = (direction: 1 | -1) => {
    setFitWidth(false);
    setZoom((current) => {
      if (direction === 1) {
        const next = ZOOM_STEPS.find((value) => value > current + 0.001);
        return clamp(next ?? current * 1.25);
      }
      const next = [...ZOOM_STEPS].reverse().find((value) => value < current - 0.001);
      return clamp(next ?? current / 1.25);
    });
  };

  const percent = Math.round(zoom * 100);

  return (
    <div
      data-profile-preview
      className="flex min-h-0 flex-1 flex-col border border-slate-800 bg-[#0b0f1a]"
    >
      <header className="flex h-8 shrink-0 items-center gap-2 border-b border-slate-800 px-2">
        {toolbar ?? (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Live preview
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          {actions}

          {/* Zoom controls: flat, square, keyboard reachable. */}
          <div className="flex items-stretch border border-slate-800">
            <button
              type="button"
              title="Zoom out"
              aria-label="Zoom out"
              onClick={() => step(-1)}
              className="px-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Minus className="h-3 w-3" />
            </button>
            <button
              type="button"
              title="Reset to 100%"
              onClick={() => {
                setFitWidth(false);
                setZoom(1);
              }}
              className="min-w-[46px] border-x border-slate-800 px-1.5 text-center font-mono text-[10px] text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              {percent}%
            </button>
            <button
              type="button"
              title="Zoom in"
              aria-label="Zoom in"
              onClick={() => step(1)}
              className="px-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <button
            type="button"
            aria-pressed={fitWidth}
            title="Fit the profile width to this pane"
            onClick={() => {
              const fit = measureFit();
              if (fit !== null) setZoom(fit);
              setFitWidth(true);
            }}
            className={`flex items-center gap-1 border px-2 py-0.5 text-[10px] transition-colors ${
              fitWidth
                ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100'
                : 'border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Maximize className="h-3 w-3" />
            Fit
          </button>
        </div>
      </header>

      <div ref={viewportRef} className="relative min-h-0 flex-1 overflow-auto">
        <div
          className="relative"
          style={{ width: `${width * zoom}px`, height: `${height * zoom}px` }}
        >
          <iframe
            title={title}
            srcDoc={document}
            sandbox="allow-same-origin"
            style={{
              width: `${width}px`,
              height: `${height}px`,
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              border: 0,
              display: 'block',
              background: '#ffffff',
            }}
          />
        </div>
      </div>
    </div>
  );
};
