import React, { useEffect, useRef, useState } from 'react';

interface ToolsPreviewProps {
  /** A complete HTML document (head + #columns body) to render sandboxed. */
  document: string;
  height?: number;
}

/**
 * Sandboxed preview for the Profile Tools labs. A full exported document is
 * rendered in an iframe so the tools show exactly what Gaia will receive —
 * column reflow, keyframes and all.
 */
export const ToolsPreview: React.FC<ToolsPreviewProps> = ({ document: doc, height = 340 }) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [expand, setExpand] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (frame) frame.srcdoc = doc;
  }, [doc]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#0b0f1a]">
      <iframe
        ref={frameRef}
        title="Profile tools preview"
        sandbox=""
        className="w-full"
        style={{ height: expand ? height * 1.75 : height, border: 'none' }}
      />
      <button
        onClick={() => setExpand((v) => !v)}
        className="absolute bottom-1.5 right-1.5 rounded bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-300 hover:text-white"
      >
        {expand ? 'shrink' : 'expand'}
      </button>
    </div>
  );
};
