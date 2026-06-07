# Task 1: Make uploaded files downloadable in the admin response detail dialog

## Summary
Fixed the admin response detail dialog to properly support file downloads for all upload field types (file_upload, image_upload, multi_upload), with download buttons, image previews, and Drive link integration.

## Changes Made

### 1. `/home/z/my-project/src/app/api/file/route.ts`
- Added support for `download=true` query parameter
- When `download=true` is present, the `Content-Disposition` header is set to `attachment` instead of `inline`, forcing the browser to download the file instead of displaying it inline

### 2. `/home/z/my-project/src/components/admin/AdminResponses.tsx`

#### Import additions
- Added `ImageIcon` from lucide-react for image field icons

#### File detection logic (lines ~1073-1089)
- Changed from `isFileField = field.type === 'file_upload'` to:
  - `isSingleFileField = field.type === 'file_upload' || field.type === 'image_upload'`
  - `isMultiFileField = field.type === 'multi_upload'`
  - `isFileField = isSingleFileField || isMultiFileField`
  - `isImageField = field.type === 'image_upload'`
- Added `hasMultiFiles` check and JSON parsing for multi_upload value field
- `multiFiles` array parsed from the JSON value containing `{ name, path, driveFileId?, driveLink? }` objects

#### Type label mapping (lines ~1099-1137)
- Changed condition from `field.type !== 'file_upload'` to `!isFileField` so file fields show badges instead of text labels
- Added more field types: email, phone, url, rating
- Added Badge component for file fields showing 'File', 'Gambar', or 'Multi File' based on field type

#### File rendering section (lines ~1141-1245)
- **Single file fields (file_upload, image_upload)**:
  - For `image_upload`: Shows a small thumbnail preview (`max-w-[200px] max-h-[150px]`) with error handling to hide broken images
  - Uses `ImageIcon` for image fields, `Paperclip` for file fields
  - View link opens file in new tab (existing behavior)
  - New download link with `Download` icon that appends `&download=true` to the filePath URL
  - Google Drive link preserved as before
  - Shows "Tidak ada file diunggah" if no file uploaded

- **Multi file fields (multi_upload)**:
  - Parses JSON array from `fieldResp.value`
  - Iterates over each file in the array
  - Shows each file with: Paperclip icon, view link, download button with `Download` icon, and optional Drive link
  - Shows "Tidak ada file diunggah" if no files uploaded

- **Non-file fields**: Shows text display value as before

## Data Format Notes
- `filePath` stored in DB for single file uploads: `/api/file?path=/upload/filename.ext`
- `value` stored in DB for multi_upload: JSON array like `[{"name":"file.pdf","path":"/api/file?path=/upload/filename.ext","driveFileId":"...","driveLink":"..."}]`
- The `/api/file` endpoint now supports `?download=true` to force download via `Content-Disposition: attachment`

## Verification
- ESLint passes with no errors in modified files
- No TypeScript compilation errors introduced
- Dev server running without issues
