# Task 2: Add Edit ASN Data Feature on ASN Homepage

## Summary
Successfully added an "Edit Profile" feature to the ASN homepage that allows users to self-service edit their email, phone, jabatan, pangkat, and unitKerja fields.

## Changes Made

### 1. API Route Update (`src/app/api/asn/[id]/route.ts`)
- Updated the PATCH handler to accept `jabatan`, `pangkat`, and `unitKerja` in addition to existing `email` and `phone`
- Updated comment from "Self-service update (email, phone only)" to "Self-service update (email, phone, jabatan, pangkat, unitKerja)"

### 2. ASNHomepage Component Update (`src/components/asn/ASNHomepage.tsx`)
- **New imports**: Added `Pencil` icon, `Dialog/DialogContent/DialogHeader/DialogTitle/DialogDescription/DialogFooter`, `Input`, `Label`
- **New state variables**: `editProfileOpen`, `editForm`, `savingProfile`, `editSuccess`, `editError`
- **New derived variables**: `userUnitKerja`, `userEmail`, `userPhone`
- **New handlers**: `handleEditProfile()` (opens dialog pre-filled with current data), `handleSaveProfile()` (saves via PATCH API)
- **Edit button**: Added a pencil icon button on the profile card (right side, after user info)
- **Edit Profile Dialog**: Full dialog with form fields for Email, Phone, Jabatan, Pangkat, Unit Kerja, each with icon-decorated inputs, error display, success animation, and a note about contacting admin for Nama/NIP/Bidang changes

## Lint Results
- No errors in modified files (pre-existing errors in `custom-server.js` are unrelated)
- Dev server running without issues
