# Task 2 - File Handling System Update

## Summary
Updated the file handling system so that multi-upload fields store per-file drive link information, Google Sheets sync includes file links, local file URLs are complete and directly viewable/clickable, and the response detail dialog shows drive links per file for multi-upload.

## Files Modified

### 1. `/home/z/my-project/src/components/asn/FormFiller.tsx`
- **multi_upload value storage**: Changed from `JSON.stringify(allFiles.map(f => f.path))` to `JSON.stringify(allFiles.map(f => ({ path: f.path, driveFileId: f.driveFileId || null, driveLink: f.driveLink || null })))` 
- **removeMultiFile**: Same change for the removal update
- **Existing response parsing**: Now handles both old format (string array `["/uploads/file1.pdf"]`) and new format (object array `[{"path":"/uploads/file1.pdf","driveFileId":"xxx","driveLink":"https://..."}]`)

### 2. `/home/z/my-project/src/app/api/google/sheets-sync/route.ts`
- **New helper `parseMultiUploadInfo()`**: Parses multi_upload values with per-file drive links, handles both old and new formats
- **Origin extraction**: Gets request origin from headers to construct full local URLs
- **Headers**: Added "Link [field label]" extra columns for all upload field types (file_upload, image_upload, multi_upload)
- **Row building**: 
  - file_upload/image_upload: filename + Drive link or full local URL
  - multi_upload: file count + all links (Drive links or full local URLs) separated by newlines

### 3. `/home/z/my-project/src/components/admin/AdminResponses.tsx`
- **New `MultiUploadFile` interface**: `{ path: string; driveFileId: string | null; driveLink: string | null }`
- **`parseMultiUploadPaths()`**: Returns `MultiUploadFile[]` instead of `string[]`, handles both old and new formats
- **Multi-upload display**: Shows per-file Drive link badges (Cloud icon + "Drive") and Drive open buttons (ExternalLink icon), matching the single file display style

### 4. `/home/z/my-project/src/lib/google.ts`
- **`valueInputOption`**: Changed from `'RAW'` to `'USER_ENTERED'` so URLs become clickable links in Google Sheets

## Backward Compatibility
All parsing functions handle both the old format (string arrays) and new format (object arrays), so existing data continues to work without migration.

## Lint Status
✅ All changes pass ESLint with no errors
