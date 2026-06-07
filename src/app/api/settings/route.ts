import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { invalidateSettingsCache } from "@/lib/auth";

// Keys that contain sensitive data - will be returned as-is but should be handled carefully
const SENSITIVE_KEYS = [
  "googleDrivePrivateKey",
  "googleLoginClientSecret",
];

// GET /api/settings
export async function GET() {
  try {
    const settings = await db.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => {
      // Return the value but mark sensitive ones as having a value
      // The frontend handles masking of sensitive fields
      settingsMap[s.key] = s.value;
    });
    return NextResponse.json(settingsMap);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings, userId } = body;

    for (const [key, value] of Object.entries(settings)) {
      // Don't save empty values for sensitive keys (means user cleared the field without entering new value)
      if (SENSITIVE_KEYS.includes(key) && (value as string) === "") {
        // Only delete if the user explicitly wants to clear it
        // For now, allow clearing by saving empty string
      }

      await db.systemSetting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      });
    }

    // Invalidate the auth settings cache so changes take effect immediately
    invalidateSettingsCache();

    if (userId) {
      try {
        await db.activityLog.create({
          data: {
            userId,
            action: "UPDATE_SETTINGS",
            details: "Mengubah pengaturan sistem",
          },
        });
      } catch {
        // Skip activity log if userId is invalid
      }
    }

    return NextResponse.json({ message: "Pengaturan berhasil disimpan" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
