/**
 * Shared profile import feature.
 *
 * The Builder uses it to open an imported profile in a new tab; the Profile
 * Tools use it to render the user's real profile (its CSS chain and column
 * layout) inside the live preview. Both consume the same engine and dialog:
 *
 *   import { ImportProfileDialog, snapshotFromImportResult } from '@/features/shared/import';
 */
export {
  importProfileFromUrl,
  importProfileFromHtml,
  fetchProfileHtml,
  extractCss,
  detectProfileBackground,
  augmentCssWithBackground,
  reconstructElements,
  sanitizeHtml,
  injectBbIds,
  sleep,
} from './profileImporter';
export { ImportAbortedError } from './profileImporter';
export type { FetchHtmlOptions } from './profileImporter';
export type {
  ImportResult,
  ImportDiagnostics,
  DetectedBackground,
  StylesheetRecord,
} from './profileImporter';

export { readTextFile, extractCanonicalUrl, formatBytes } from './importFile';

export { ImportProfileDialog } from './ImportProfileDialog';
export type { ImportProfileDialogProps } from './ImportProfileDialog';

export { snapshotFromImportResult, importSourceTitle } from './importedProfile';
export type { ImportedProfileSnapshot } from './importedProfile';
