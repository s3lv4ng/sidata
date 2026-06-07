import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// GET /api/setup - Check setup status
export async function GET() {
  try {
    // Check if setup is already completed
    const setupCompleted = await db.systemSetting.findUnique({
      where: { key: "setupCompleted" },
    });

    if (setupCompleted?.value === "true") {
      return NextResponse.json({
        setupCompleted: true,
        hasAdmin: true,
        step: "completed",
      });
    }

    // Check if admin user exists
    const adminCount = await db.user.count({
      where: { role: "ADMIN" },
    });

    // Check what settings exist
    const existingSettings = await db.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    existingSettings.forEach((s) => (settingsMap[s.key] = s.value));

    return NextResponse.json({
      setupCompleted: false,
      hasAdmin: adminCount > 0,
      existingSettings: settingsMap,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/setup - Execute setup step
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { step, data } = body;

    switch (step) {
      case "app-identity": {
        const settings: Record<string, string> = {};
        if (data.appName) settings.appName = data.appName;
        if (data.appShortName) settings.appShortName = data.appShortName;
        if (data.instansiName) settings.instansiName = data.instansiName;
        if (data.daerah) settings.daerah = data.daerah;
        if (data.instansiEmail) settings.instansiEmail = data.instansiEmail;
        if (data.instansiPhone) settings.instansiPhone = data.instansiPhone;
        if (data.instansiAddress) settings.instansiAddress = data.instansiAddress;

        for (const [key, value] of Object.entries(settings)) {
          await db.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          });
        }

        return NextResponse.json({ success: true, step: "app-identity" });
      }

      case "admin-account": {
        if (!data.nip || !data.name || !data.password) {
          return NextResponse.json(
            { error: "NIP, nama, dan password harus diisi" },
            { status: 400 }
          );
        }

        if (data.password.length < 6) {
          return NextResponse.json(
            { error: "Password minimal 6 karakter" },
            { status: 400 }
          );
        }

        const existingAdmin = await db.user.findUnique({
          where: { nip: data.nip },
        });

        if (existingAdmin) {
          const hashedPassword = await bcrypt.hash(data.password, 10);
          await db.user.update({
            where: { nip: data.nip },
            data: {
              name: data.name,
              password: hashedPassword,
              email: data.email || null,
              role: "ADMIN",
              isActive: true,
            },
          });
        } else {
          const hashedPassword = await bcrypt.hash(data.password, 10);
          await db.user.create({
            data: {
              nip: data.nip,
              password: hashedPassword,
              name: data.name,
              email: data.email || null,
              role: "ADMIN",
              isActive: true,
            },
          });
        }

        return NextResponse.json({ success: true, step: "admin-account" });
      }

      case "login-methods": {
        const settings: Record<string, string> = {
          loginWithNip: data.loginWithNip !== false ? "true" : "false",
          loginWithGoogle: data.loginWithGoogle === true ? "true" : "false",
          showPasswordLogin: data.showPasswordLogin !== false ? "true" : "false",
        };

        // Also save Google OAuth credentials if provided
        if (data.googleLoginClientId !== undefined) settings.googleLoginClientId = data.googleLoginClientId;
        if (data.googleLoginClientSecret !== undefined) settings.googleLoginClientSecret = data.googleLoginClientSecret;

        for (const [key, value] of Object.entries(settings)) {
          await db.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          });
        }

        return NextResponse.json({ success: true, step: "login-methods" });
      }

      case "google-integration": {
        const settings: Record<string, string> = {};

        if (data.googleDriveClientEmail) settings.googleDriveClientEmail = data.googleDriveClientEmail;
        if (data.googleDrivePrivateKey) settings.googleDrivePrivateKey = data.googleDrivePrivateKey;
        if (data.googleDriveFolderId) settings.googleDriveFolderId = data.googleDriveFolderId;
        if (data.googleSheetsApiKey) settings.googleSheetsApiKey = data.googleSheetsApiKey;
        if (data.googleSheetsSpreadsheetId) settings.googleSheetsSpreadsheetId = data.googleSheetsSpreadsheetId;
        if (data.googleSheetsSheetName) settings.googleSheetsSheetName = data.googleSheetsSheetName;

        for (const [key, value] of Object.entries(settings)) {
          await db.systemSetting.upsert({
            where: { key },
            update: { value },
            create: { key, value },
          });
        }

        return NextResponse.json({ success: true, step: "google-integration" });
      }

      case "master-data": {
        if (data.bidangList && Array.isArray(data.bidangList)) {
          for (const name of data.bidangList) {
            if (name.trim()) {
              await db.bidang.upsert({
                where: { name: name.trim() },
                update: {},
                create: { name: name.trim() },
              });
            }
          }
        }

        if (data.statusList && Array.isArray(data.statusList)) {
          for (const name of data.statusList) {
            if (name.trim()) {
              await db.statusASN.upsert({
                where: { name: name.trim() },
                update: {},
                create: { name: name.trim() },
              });
            }
          }
        }

        return NextResponse.json({ success: true, step: "master-data" });
      }

      case "complete": {
        await db.systemSetting.upsert({
          where: { key: "setupCompleted" },
          update: { value: "true" },
          create: { key: "setupCompleted", value: "true" },
        });

        await db.systemSetting.upsert({
          where: { key: "setupCompletedAt" },
          update: { value: new Date().toISOString() },
          create: { key: "setupCompletedAt", value: new Date().toISOString() },
        });

        return NextResponse.json({ success: true, step: "complete" });
      }

      default:
        return NextResponse.json({ error: "Unknown step" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
