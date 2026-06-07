import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/settings
export async function GET() {
  try {
    const settings = await db.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => (settingsMap[s.key] = s.value));
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
      await db.systemSetting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      });
    }

    if (userId) {
      await db.activityLog.create({
        data: {
          userId,
          action: "UPDATE_SETTINGS",
          details: "Mengubah pengaturan sistem",
        },
      });
    }

    return NextResponse.json({ message: "Pengaturan berhasil disimpan" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
