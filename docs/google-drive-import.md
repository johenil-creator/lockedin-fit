# Google Drive Import — Technical Documentation

## Architecture Overview

```
Import Flow:
  ImportSourcePicker → Google Sign-In → DriveFilePicker → ImportPreview → PlanContext.setPlan()
       (step 1)          (step 2)          (step 3)          (step 4)
```

The import lives as a single screen (`app/import-drive.tsx`) with an internal state machine.
No nested navigation — step transitions happen via `useState<Step>`.

## Files

| File | Purpose |
|------|---------|
| `lib/googleAuth.ts` | OAuth 2.0 sign-in, token refresh, secure storage |
| `lib/googleDrive.ts` | Drive REST API v3 — list, search, export, download |
| `app/import-drive.tsx` | Multi-step import wizard screen |
| `components/import/ImportSourcePicker.tsx` | Step 1 — choose Drive, URL, or File |
| `components/import/DriveFilePicker.tsx` | Step 2 — searchable file list with skeletons |
| `components/import/ImportPreview.tsx` | Step 3 — preview parsed plan + confirm |
| `app/settings.tsx` | Google Account section (connect/disconnect/switch) |

## Token Storage

Tokens are stored in **expo-secure-store** (iOS Keychain / Android Keystore):

| Key | Value |
|-----|-------|
| `google_access_token` | OAuth access token |
| `google_refresh_token` | OAuth refresh token (long-lived) |
| `google_token_expiry` | Unix timestamp (ms) when access token expires |
| `google_user_email` | User's Google email |
| `google_user_name` | User's display name |

`getAccessToken()` auto-refreshes when expired (60s buffer).

## APIs Used

- **Google OAuth 2.0** via `expo-auth-session` (PKCE flow)
- **Google Drive API v3** — `GET /drive/v3/files` (list/search), `GET /drive/v3/files/{id}/export` (Google Sheets → CSV), `GET /drive/v3/files/{id}?alt=media` (raw download)
- **Google UserInfo** — `GET /oauth2/v2/userinfo` (email + name after auth)

### Scopes

- `drive.readonly` — list and read files
- `spreadsheets.readonly` — export Google Sheets as CSV
- `userinfo.email` + `userinfo.profile` — display user identity

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs: **Google Drive API**, **Google Sheets API**
4. OAuth consent screen → External → add scopes listed above
5. Create credentials → OAuth 2.0 Client ID:
   - **Type**: iOS (for production) or Web (for Expo Go)
   - **Bundle ID**: `com.anonymous.LockedInFit`
6. Copy the Client ID into `lib/googleAuth.ts` → `GOOGLE_CLIENT_ID`

## Adding New Import Formats

1. Add the mime type to `SUPPORTED_MIME_TYPES` in `lib/googleDrive.ts`
2. Add a case to `getFileType()` in the same file
3. In `app/import-drive.tsx`, handle the new type in `handleFileSelect()`:
   - Download/export the file content
   - Parse it into a `string[][]` (2D array of rows/columns)
   - Pass to `smartParse()` from `lib/importPlan.ts`
4. Update `fileIconName()` in `DriveFilePicker.tsx` for the icon

## QA Checklist

### Happy Path
- [ ] Tap "Import Plan" on Plan tab → navigates to import-drive screen
- [ ] Select "Google Drive" → redirected to Google sign-in
- [ ] Complete sign-in → see list of spreadsheet files
- [ ] Search for a file → results filter correctly
- [ ] Select a Google Sheet → preview shows weeks/days/exercises
- [ ] Tap "Import Plan" → plan loads in Plan tab
- [ ] Can start a session from the imported plan

### Auth Flows
- [ ] Cancel Google sign-in → returns to source picker (no crash)
- [ ] Token expired → auto-refreshes and retries API call
- [ ] Disconnect Google in Settings → clears tokens
- [ ] Next import requires fresh sign-in after disconnect
- [ ] Switch Account → signs out then signs in with new account

### Error States
- [ ] No Drive files found → shows "No files found" empty state
- [ ] Select unsupported file → shows error message
- [ ] Network failure during file list → shows error banner with retry
- [ ] Network failure during file download → shows error
- [ ] Google Sheets returns HTML (login redirect) → shows descriptive error

### Edge Cases
- [ ] Large sheet (1000+ exercises) → imports without crash or timeout
- [ ] Sheet with missing columns → shows warning banner, applies defaults
- [ ] Sheet with no "Exercise" column → shows validation error
- [ ] Import via URL (secondary option) still works
- [ ] Import via file upload still works
- [ ] Back button navigation works at each step
- [ ] Step indicator dots update correctly

### Settings
- [ ] Google Account section shows email when connected
- [ ] Connect button works when not signed in
- [ ] Disconnect shows confirmation alert
- [ ] DEV Reset clears all data (should also clear Google tokens if added)
