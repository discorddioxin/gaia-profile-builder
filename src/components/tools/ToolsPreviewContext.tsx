import React, { createContext, useContext, useEffect, useState } from 'react';

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
}

const ToolsPreviewContext = createContext<ToolsPreviewContextValue | null>(null);

export const ToolsPreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preview, setPreview] = useState<ToolsPreviewState | null>(null);
  return (
    <ToolsPreviewContext.Provider value={{ preview, setPreview }}>
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
 */
export function useToolsPreview(state: ToolsPreviewState, active = true): void {
  const { setPreview } = useToolsPreviewContext();
  useEffect(() => {
    if (!active) return;
    setPreview(state);
  }, [setPreview, state, active]);
  useEffect(
    () => () => {
      setPreview(null);
    },
    [setPreview]
  );
}
