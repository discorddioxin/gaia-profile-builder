import type { CanvasSettings, ProfileElement } from '../../../types/profile';
import type { ImportResult } from './profileImporter';

/**
 * Everything a consumer that only needs to *render* a profile keeps around
 * after an import — the Builder stores this on a profile tab, the Profile Tools
 * use it to drive the live preview (their CSS, their column layout).
 */
export interface ImportedProfileSnapshot {
  title: string;
  sourceUrl: string;
  elements: ProfileElement[];
  settings: Partial<CanvasSettings>;
  /** Self-contained document: the profile's markup with its CSS chain inlined. */
  rawHtml: string;
  /** The extracted stylesheet chain on its own (for read-outs and overrides). */
  rawCss: string;
  scriptsRemoved: number;
  /** Column the imported profile's first Gaia panel lives in. */
  defaultColumn: 1 | 2 | 3;
  /** Number of Gaia V2 panels found in the imported profile. */
  panelCount: number;
}

/** Friendly label for the import source (URL or pasted markup). */
export function importSourceTitle(sourceUrl: string, fallback = 'Imported profile'): string {
  if (sourceUrl && sourceUrl.startsWith('http')) {
    try {
      const url = new URL(sourceUrl);
      const path = url.pathname.length > 1 ? url.pathname : '';
      return `${url.hostname.replace(/^www\./, '')}${path}`.slice(0, 60);
    } catch {
      /* fall through */
    }
  }
  if (sourceUrl === '(pasted HTML)') return 'Pasted HTML';
  return fallback;
}

/**
 * Reduce a full import result to the snapshot the preview surfaces need.
 * Keeps the column layout Gaia panels already carry so tools append into the
 * same column the profile uses.
 */
export function snapshotFromImportResult(
  result: ImportResult,
  title?: string
): ImportedProfileSnapshot {
  const panels = result.elements.filter((element) => element.gaia);
  return {
    title: title || importSourceTitle(result.sourceUrl),
    sourceUrl: result.sourceUrl,
    elements: result.elements,
    settings: result.settings,
    rawHtml: result.rawHtml,
    rawCss: result.rawCss,
    scriptsRemoved: result.scriptsRemoved,
    defaultColumn: panels[0]?.gaia?.column ?? 2,
    panelCount: panels.length,
  };
}
