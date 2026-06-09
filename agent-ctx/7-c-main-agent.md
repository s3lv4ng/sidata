# Task 7-c: Enhance FormBuilder with New Field Types

## Work Summary

Updated `/home/z/my-project/src/components/admin/FormBuilder.tsx` to add 8 new field types and enhance the form builder.

## Changes Made

### 1. Added New Icon Imports
- `Clock as ClockIcon` - for time field
- `Files as FilesIcon` - for multi upload field
- `Star as StarIcon` - for rating field
- `Mail as MailIcon` - for email field
- `Phone as PhoneIcon` - for phone field
- `Link2 as LinkIcon` - for URL field
- `Image as ImageIcon` - for image upload field
- `SlidersHorizontal as SlidersIcon` - for scale field

### 2. Updated FieldType Type
Added 8 new field types: `time`, `multi_upload`, `rating`, `email`, `phone`, `url`, `image_upload`, `scale`

### 3. Updated FIELD_TYPES Constant
Added 8 new entries with appropriate icons and Indonesian labels:
- `time` → "Waktu" (ClockIcon)
- `multi_upload` → "Multi Upload" (FilesIcon)
- `rating` → "Rating / Skala" (StarIcon)
- `email` → "Email" (MailIcon)
- `phone` → "Nomor Telepon" (PhoneIcon)
- `url` → "URL / Tautan" (LinkIcon)
- `image_upload` → "Upload Gambar" (ImageIcon)
- `scale` → "Skala (1-10)" (SlidersIcon)

### 4. Updated CHOICE_TYPES
Added `rating` and `scale` to the choice types array so they show the options editor.

### 5. Updated updateField Function
Added auto-populate logic:
- When type changes to `rating` and no options exist → auto-populate with `['1', '2', '3', '4', '5']`
- When type changes to `scale` and no options exist → auto-populate with `['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']`

### 6. Updated renderPreviewField Function
Added preview rendering for all 8 new field types:
- `time` → disabled time input
- `multi_upload` → dashed upload area with "Upload multiple files" text
- `rating` → row of star icons based on options count
- `email` → disabled email input with placeholder
- `phone` → disabled tel input with placeholder
- `url` → disabled url input with placeholder
- `image_upload` → dashed upload area with ImageIcon and "Upload gambar" text
- `scale` → numbered boxes (1-10) with border styling

## Verification
- Lint: 0 errors ✅
