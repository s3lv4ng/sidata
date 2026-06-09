# Task 1 - Fix Google Drive Upload: Use Shared Drive for Service Account uploads

## Summary
Successfully implemented Shared Drive support for Google Drive uploads to fix the "Service Accounts do not have storage quota" error. Service Accounts cannot upload to "My Drive" - they can only upload to Shared Drives.

## Changes Made

### 1. `/home/z/my-project/src/lib/google.ts`
- **Added `createSharedDrive()`**: Creates a new Google Shared Drive with a unique request ID
- **Added `createFolderInDrive()`**: Creates a folder inside a Shared Drive with `supportsAllDrives: true`
- **Added `ensureSharedDriveUploadFolder()`**: Smart function that:
  - Checks if a Shared Drive folder ID is already stored in `googleSharedDriveFolderId` system setting
  - If exists, verifies the folder is still accessible
  - If not, creates a new Shared Drive named "SIDATA BKAD Uploads" + an "Uploads" folder inside it
  - Saves both `googleSharedDriveFolderId` and `googleSharedDriveId` to system settings
  - Returns `{ driveId, folderId, folderLink, isNew }`
- **Modified `uploadToDrive()`**:
  - Now prefers the Shared Drive folder if `googleSharedDriveFolderId` setting exists
  - Return type expanded to include `usedSharedDrive` and `sharedDriveLink`
  - Added automatic fallback: if upload fails with "storage quota" error, it automatically creates a Shared Drive and retries the upload

### 2. `/home/z/my-project/src/app/api/upload/route.ts`
- Updated Google Drive upload logic:
  - Removed requirement for `googleDriveFolderId` (only needs `googleServiceAccountEmail` + `googlePrivateKey`)
  - Checks for `googleSharedDriveFolderId` setting first, falls back to `googleDriveFolderId`
  - Added Shared Drive fallback in catch block: if quota error, creates Shared Drive and retries upload
  - Logs clearly whether file was uploaded to Shared Drive or regular Drive

### 3. `/home/z/my-project/src/app/api/google/ensure-shared-drive/route.ts` (NEW)
- POST endpoint that calls `ensureSharedDriveUploadFolder()`
- Returns `{ success, driveId, folderId, folderLink, isNew, message }`
- Error handling with proper HTTP status codes

### 4. `/home/z/my-project/src/components/admin/AdminSettings.tsx`
- Added state: `creatingSharedDrive`, `sharedDriveResult`
- Added `handleCreateSharedDrive()` handler:
  - Saves any unsaved Google settings first
  - Calls `/api/google/ensure-shared-drive` endpoint
  - Shows success/error toast notifications
  - Re-fetches settings after creation
- Added "Buat Shared Drive Otomatis" button in Google Integration section:
  - Green/emerald styled button with Cloud icon
  - Disabled when Service Account email or private key is not configured
  - Shows spinner while creating
  - Shows result panel with link to Google Drive folder

## Verification
- `bun run lint` passed with no errors
- Dev server log shows no compilation errors
