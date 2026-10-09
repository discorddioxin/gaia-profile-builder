import React, { createContext, useContext, useEffect, useId, useRef, useState } from 'react';

/**
 * What the shared Tools preview area (right side) renders. Each lab publishes
 * its state here, so switching tabs only swaps the left-hand options while the
 * preview and CSS pane stay put (same components → zoom, scroll and pane view
 * survive a tab switch).
 */
export interface ToolsPreviewState {
  /** Complete profile document for the preview iframe. */
  document: string;
  /** Profile page width in px (Gaia's default shell is 1005px). */
  width: number;
  /** Stylesheet shown in the CSS pane. */
  css: string;
  /** CSS pane title, e.g. "Panel CSS". */
  cssTitle: string;
  /** Chips/labels for the preview toolbar. */
  header?: React.ReactNode;
  /** Buttons at the right of the preview toolbar. */
  actions?: React.ReactNode;
  /** Optional strip above the preview (the Component Lab's column chooser). */
  strip?: React.ReactNode;
}

interface ToolsPreviewContextValue {
  preview: ToolsPreviewState | null;
  setPreview: (state: ToolsPreviewState | null) => void;
  /**
   * id of the lab that last published the preview. Only the owner may clear it
   * on unmount — see `useToolsPreview` for why an unconditional clear breaks
   * the import flow.
   */
  ownerRef: React.RefObject<string | null>;
}

const ToolsPreviewContext = createContext<ToolsPreviewContextValue | null>(null);

export const ToolsPreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preview, setPreview] = useState<ToolsPreviewState | null>(null);
  const ownerRef = useRef<string | null>(null);
  return (
    <ToolsPreviewContext.Provider value={{ preview, setPreview, ownerRef }}>
      {children}
    </ToolsPreviewContext.Provider>
  );
};

export function useToolsPreviewContext(): ToolsPreviewContextValue {
  const value = useContext(ToolsPreviewContext);
  if (!value) throw new Error('useToolsPreviewContext must be used inside ToolsPreviewProvider');
  return value;
}

/**
 * Publish a lab's preview state while it is the active tab. The state object
 * must be memoized by the caller (`useMemo`) so this effect only fires when the
 * preview really changes; inactive labs stay mounted (so their options survive a
 * tab switch) without overwriting the active preview.
 *
 * Clearing on unmount is ownership-guarded: importing (or clearing) a profile
 * remounts both labs at once, and React's StrictMode (dev) additionally runs
 * each new lab through a destroy/re-create cycle. The inactive lab's unmount
 * cleanup used to fire *after* the active lab had already republished, leaving
 * the preview permanently on its "Building preview…" placeholder. Only the lab
 * that last published is allowed to clear the shared state now.
 */
export function useToolsPreview(state: ToolsPreviewState, active = true): void {
  const { setPreview, ownerRef } = useToolsPreviewContext();
  const id = useId();

  useEffect(() => {
    if (!active) return;
    ownerRef.current = id;
    setPreview(state);
  }, [setPreview, state, active, ownerRef, id]);

  useEffect(
    () => () => {
      if (ownerRef.current === id) {
        ownerRef.current = null;
        setPreview(null);
      }
    },
    [setPreview, ownerRef, id]
  );
}
