import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// POST /api/setup/complete - Complete the setup wizard
export async function POST(request: NextRequest) {
  try {
    // Double-check: only allow setup if no admin exists
    const adminCount = await db.user.count({
      where: { role: "ADMIN" },
    });

    if (adminCount > 0) {
      return NextResponse.json(
        { error: "Setup sudah pernah dilakukan. Admin sudah ada." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { admin, settings, google } = body;

    // Validate required fields
    if (!admin?.nip || !admin?.name || !admin?.password) {
      return NextResponse.json(
        { error: "NIP, nama, dan password admin wajib diisi" },
        { status: 400 }
      );
    }

    if (!settings?.instansiName) {
      return NextResponse.json(
        { error: "Nama instansi wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Create the admin user
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    const adminUser = await db.user.create({
      data: {
        nip: admin.nip,
        name: admin.name,
        email: admin.email || null,
        password: hashedPassword,
        role: "ADMIN",
        isActive: true,
      },
    });

    // 2. Save system settings
    const settingsToSave: Array<{ key: string; value: string }> = [
      { key: "appName", value: settings.appName || "SIDATA" },
      { key: "appShortName", value: settings.appShortName || "SIDATA" },
      { key: "instansiName", value: settings.instansiName },
    ];

    if (settings.daerah) settingsToSave.push({ key: "daerah", value: settings.daerah });
    if (settings.instansiEmail) settingsToSave.push({ key: "instansiEmail", value: settings.instansiEmail });
    if (settings.instansiPhone) settingsToSave.push({ key: "instansiPhone", value: settings.instansiPhone });
    if (settings.instansiAddress) settingsToSave.push({ key: "instansiAddress", value: settings.instansiAddress });

    // 3. Save Google integration settings (if provided)
    if (google) {
      if (google.serviceAccountEmail) settingsToSave.push({ key: "googleServiceAccountEmail", value: google.serviceAccountEmail });
      if (google.privateKey) settingsToSave.push({ key: "googlePrivateKey", value: google.privateKey });
      if (google.driveFolderId) settingsToSave.push({ key: "googleDriveFolderId", value: google.driveFolderId });
      if (google.spreadsheetId) settingsToSave.push({ key: "googleSpreadsheetId", value: google.spreadsheetId });
      if (google.delegatedUser) settingsToSave.push({ key: "googleDelegatedUser", value: google.delegatedUser });
    }

    // Upsert all settings
    for (const setting of settingsToSave) {
      await db.systemSetting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: { key: setting.key, value: setting.value },
      });
    }

    // 4. Create default Bidang if they don't exist
    const defaultBidang = ["Pendapatan", "Belanja", "Aset", "Umum"];
    for (const name of defaultBidang) {
      await db.bidang.upsert({
        where: { name },
        update: {},
        create: { name, isActive: true },
      });
    }

    // 5. Create default StatusASN if they don't exist
    const defaultStatusASN = ["PNS", "PPPK", "CPNS", "Honorer"];
    for (const name of defaultStatusASN) {
      await db.statusASN.upsert({
        where: { name },
        update: {},
        create: { name, isActive: true },
      });
    }

    // 6. Log the setup activity
    await db.activityLog.create({
      data: {
        userId: adminUser.id,
        action: "SYSTEM_SETUP",
        details: "Setup awal sistem selesai. Admin dibuat, pengaturan disimpan.",
      },
    });

    return NextResponse.json({
      success: true,
      adminId: adminUser.id,
      message: "Setup berhasil diselesaikan",
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      const target = error.meta?.target as string[] | undefined;
      if (target?.includes("email")) {
        return NextResponse.json(
          { error: "Email sudah terdaftar" },
          { status: 400 }
        );
      }
      if (target?.includes("nip")) {
        return NextResponse.json(
          { error: "NIP sudah terdaftar" },
          { status: 400 }
        );
      }
    }
    return NextResponse.json(
      { error: error.message || "Terjadi kesalahan saat setup" },
      { status: 500 }
    );
  }
}
