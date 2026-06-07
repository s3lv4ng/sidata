# Task enhance-1: Activity Logs & Notification Bell

## Summary
Successfully created the Activity Logs admin page component and added a notification bell to the AdminLayout header.

## Changes Made

### 1. Updated API: `/src/app/api/activity-logs/route.ts`
- Added `action` query parameter for filtering by action type
- Added `search` query parameter for searching by user name
- Updated `count()` to respect the same `where` clause for accurate totals

### 2. Created: `/src/components/admin/AdminActivityLogs.tsx`
- Full-featured activity logs page with:
  - Table: No, Waktu, User, Aksi, Detail columns
  - Action type filter (13 types: LOGIN, CREATE_FORM, UPDATE_FORM, DELETE_FORM, SUBMIT_RESPONSE, UPDATE_RESPONSE, CREATE_ASN, UPDATE_ASN, DELETE_ASN, CREATE_ANNOUNCEMENT, UPDATE_ANNOUNCEMENT, DELETE_ANNOUNCEMENT, SEED_DATABASE)
  - Search by user name
  - Pagination (10 per page)
  - Auto-refresh toggle (30s interval)
  - Color-coded badges (blue=login, green=create, amber=update, red=delete, violet=seed)
  - Export to Excel
  - Total count display

### 3. Modified: `/src/components/admin/AdminLayout.tsx`
- Added notification bell (Bell icon) in top bar header
- Red dot when activities newer than 1 hour exist
- Popover showing 5 most recent activities with badges, names, time ago
- "Lihat Semua" button navigating to admin-activity-logs
- Added "Log Aktivitas" sidebar menu item with History icon (after Manajemen User)
- Auto-refreshes activities every 60 seconds

### 4. Modified: `/src/app/page.tsx`
- Added AdminActivityLogs import
- Added `admin-activity-logs` case in AdminViews switch statement

## Verification
- ESLint passes with 0 errors
- Dev server compiles successfully
- All existing functionality preserved
