# Task 2-e: Reports Page & Announcements Management

## Summary
Created two admin components for the SIDATA BKAD application: AdminReports and AdminAnnouncements.

## Files Created
1. `/home/z/my-project/src/components/admin/AdminReports.tsx` - Reports page with filters, statistics, response table, Excel/PDF export, unresponded ASN list, and rekap per bidang
2. `/home/z/my-project/src/components/admin/AdminAnnouncements.tsx` - Announcements CRUD management with search, pin/unpin, toggle active, delete confirmation

## Key Implementation Details
- AdminReports: Form selector + bidang filter + date range + "Tampilkan" button
- AdminReports: 3 stat cards (Total Responden, ASN Belum Mengisi, Tingkat Pengisian %)
- AdminReports: Response table with search, detail dialog, field value parsing
- AdminReports: Excel export via API blob download, PDF export via jspdf + jspdf-autotable
- AdminReports: Rekap per bidang table with progress bars, unresponded ASN list
- AdminAnnouncements: Card-based list with pinned/active badges, action buttons
- AdminAnnouncements: Create/edit dialog with title, content, isPinned switch
- AdminAnnouncements: Pin/unpin, toggle active/inactive, delete with confirmation
- Both components follow existing project patterns (useAppStore, useSession, shadcn/ui)
- Both components pass ESLint with no errors
- Government blue/green/amber theme consistent with existing components
