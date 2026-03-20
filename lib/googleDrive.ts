import * as FileSystem from 'expo-file-system/legacy';
import { getAccessToken, refreshAccessToken } from './googleAuth';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  iconLink?: string;
  size?: string;
  owners?: { displayName: string; photoLink?: string }[];
};

export type DriveFileType = 'google-sheets' | 'xlsx' | 'csv' | 'unknown';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';
const TIMEOUT_MS = 15_000;
const PAGE_SIZE = 50;
/** Safety cap — prevents runaway pagination for users with thousands of sheets. */
const MAX_FILES = 200;

const SUPPORTED_MIME_TYPES = [
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
] as const;

const FILE_FIELDS =
  'files(id,name,mimeType,modifiedTime,iconLink,size,owners),nextPageToken';

// ─────────────────────────────────────────────────────────────────────────────
// Error type
// ─────────────────────────────────────────────────────────────────────────────

export class DriveError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'DriveError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public helper
// ─────────────────────────────────────────────────────────────────────────────

/** Maps a Drive mimeType to a DriveFileType discriminant. */
export function getFileType(mimeType: string): DriveFileType {
  switch (mimeType) {
    case 'application/vnd.google-apps.spreadsheet':
      return 'google-sheets';
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return 'xlsx';
    case 'text/csv':
      return 'csv';
    default:
      return 'unknown';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal fetch helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Thin fetch wrapper that adds a 15-second AbortController timeout.
 * Network errors and timeouts are converted to DriveError.
 */
async function fetchWithAuth(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new DriveError('Request timed out. Check your connection and try again.');
    }
    throw new DriveError(e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Central Drive API request helper.
 * - Attaches the current access token.
 * - On 401, calls refreshAccessToken() and retries once.
 * - Throws DriveError for non-2xx responses and network failures.
 */
async function driveRequest(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  if (!token) {
    throw new DriveError('Not authenticated. Please sign in to Google.');
  }

  const res = await fetchWithAuth(url, token, options);

  if (res.status === 401) {
    // Token expired — refresh and retry exactly once.
    const freshToken = await refreshAccessToken();
    const retried = await fetchWithAuth(url, freshToken, options);
    if (!retried.ok) {
      throw new DriveError(`Drive API error ${retried.status}`, retried.status);
    }
    return retried;
  }

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.error?.message ?? JSON.stringify(body);
    } catch (e) { if (__DEV__) console.warn("[googleDrive] caught:", e); }
    throw new DriveError(
      detail ? `Drive API ${res.status}: ${detail}` : `Drive API error ${res.status}`,
      res.status,
    );
  }

  return res;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lists Drive files filtered to Google Sheets, .xlsx, and .csv types.
 * Results are sorted by modifiedTime descending (most recent first).
 * Paginates automatically up to MAX_FILES total entries.
 *
 * @param query  Optional name-contains search string.
 */
export async function listDriveFiles(query?: string): Promise<DriveFile[]> {
  const mimeFilter = SUPPORTED_MIME_TYPES.map((m) => `mimeType = '${m}'`).join(' or ');
  let q = `(${mimeFilter}) and trashed = false`;

  if (query?.trim()) {
    // Escape single quotes in user-supplied search strings.
    const safe = query.trim().replace(/'/g, "\\'");
    q += ` and name contains '${safe}'`;
  }

  const files: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      q,
      fields: FILE_FIELDS,
      orderBy: 'modifiedTime desc',
      pageSize: String(PAGE_SIZE),
    });
    if (pageToken) params.set('pageToken', pageToken);

    const res = await driveRequest(`${DRIVE_BASE}/files?${params.toString()}`);
    const json = (await res.json()) as {
      files?: DriveFile[];
      nextPageToken?: string;
    };

    if (json.files) files.push(...json.files);
    pageToken = json.nextPageToken;
  } while (pageToken && files.length < MAX_FILES);

  return files;
}

/**
 * Searches Drive files by name. Delegates to listDriveFiles.
 *
 * @param query  Name search string (required).
 */
export async function searchDriveFiles(query: string): Promise<DriveFile[]> {
  return listDriveFiles(query);
}

/**
 * Exports a Google Sheet as plain CSV text.
 * Uses the Drive export endpoint with mimeType=text/csv.
 *
 * @param fileId   Drive file ID of a native Google Sheet.
 * @param sheetGid Optional sheet tab GID (for multi-tab workbooks).
 */
export async function exportSheetAsCsv(
  fileId: string,
  sheetGid?: string,
): Promise<string> {
  const params = new URLSearchParams({ mimeType: 'text/csv' });
  if (sheetGid) params.set('gid', sheetGid);

  const url = `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}/export?${params.toString()}`;
  const res = await driveRequest(url);
  return res.text();
}

/**
 * Downloads a raw Drive file using alt=media as text.
 * Use for text files (.csv). For Google Sheets use exportSheetAsCsv(),
 * for binary files (.xlsx) use downloadFileAsBase64().
 */
export async function downloadFile(fileId: string): Promise<string> {
  const url = `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?alt=media`;
  const res = await driveRequest(url);
  return res.text();
}

/**
 * Downloads a raw Drive file to disk and returns the base64 content.
 * Use this for binary files like .xlsx — React Native fetch doesn't
 * reliably support arrayBuffer(), so we go through expo-file-system.
 *
 * @param fileId  Drive file ID.
 */
export async function downloadFileAsBase64(fileId: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new DriveError('Not authenticated. Please sign in to Google.');

  const url = `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?alt=media`;
  const dest = `${FileSystem.cacheDirectory}drive_download_${Date.now()}.xlsx`;

  const result = await FileSystem.downloadAsync(url, dest, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status !== 200) {
    throw new DriveError(`Drive download failed (HTTP ${result.status})`, result.status);
  }

  const b64 = await FileSystem.readAsStringAsync(result.uri, {
    encoding: 'base64' as const,
  });

  // Clean up temp file
  FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {});

  return b64;
}

/**
 * Fetches metadata for a single Drive file.
 *
 * @param fileId  Drive file ID.
 */
export async function getFileMetadata(fileId: string): Promise<DriveFile> {
  const fields = 'id,name,mimeType,modifiedTime,iconLink,size,owners';
  const url = `${DRIVE_BASE}/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(fields)}`;
  const res = await driveRequest(url);
  return (await res.json()) as DriveFile;
}
