import type { ImportedProfileSnapshot } from '../../features/shared/import';

export interface ToolsPreviewDocumentOptions {
  /** The user's imported profile, when one is loaded into the Tools. */
  imported?: ImportedProfileSnapshot | null;
  /** Document rendered when nothing has been imported (tools' own sample). */
  fallback: string;
  /** Override CSS layered on top of the imported stylesheet chain. */
  extraCss?: string;
  /** Component markup appended to one of the profile's columns. */
  panel?: { html: string; column: 1 | 2 | 3 };
}

function appendStyle(doc: Document, css: string): void {
  const style = doc.createElement('style');
  style.setAttribute('data-tools-preview', 'override');
  style.textContent = css;
  (doc.head || doc.documentElement).appendChild(style);
}

/**
 * Append a component to the profile's V2 column layout, creating the column
 * shell when the imported document is missing it. Returns the column used.
 */
export function injectPanelIntoDocument(
  doc: Document,
  panel: { html: string; column: 1 | 2 | 3 }
): 1 | 2 | 3 {
  let column = doc.getElementById(`column_${panel.column}`) as HTMLElement | null;

  if (!column) {
    let columns = doc.getElementById('columns');
    if (!columns) {
      columns = doc.createElement('div');
      columns.id = 'columns';
      (doc.body || doc.documentElement).appendChild(columns);
    }
    column = doc.createElement('div');
    column.id = `column_${panel.column}`;
    column.className = 'column focus_column';
    columns.appendChild(column);
  }

  // A <template> parses the fragment without running anything.
  const template = doc.createElement('template');
  template.innerHTML = panel.html;
  column.appendChild(template.content);

  return panel.column;
}

/**
 * The Tools' live-preview document.
 *
 * • No import: the tools' own fully-styled document is used as-is.
 * • Import: the user's profile document (markup + its inlined CSS chain) is the
 *   base, the tooling's override CSS is layered on top, and the component being
 *   built is appended to its column — so the preview shows the tooling landing
 *   in the real profile, in the real column, with the real CSS.
 */
export function buildToolsPreviewDocument({
  imported,
  fallback,
  extraCss,
  panel,
}: ToolsPreviewDocumentOptions): string {
  if (!imported?.rawHtml) {
    if (!extraCss) return fallback;
    const doc = new DOMParser().parseFromString(fallback, 'text/html');
    appendStyle(doc, extraCss);
    return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  }

  const doc = new DOMParser().parseFromString(imported.rawHtml, 'text/html');
  if (panel) injectPanelIntoDocument(doc, panel);
  if (extraCss) appendStyle(doc, extraCss);

  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}
