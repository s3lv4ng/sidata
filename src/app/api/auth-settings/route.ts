import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/auth-settings - Public endpoint for login page configuration
export async function GET() {
  try {
    const settings = await db.systemSetting.findMany({
      where: {
        key: {
          in: [
            "passwordLoginEnabled",
            "googleLoginEnabled",
            "googleLoginClientId",
          ],
        },
      },
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => (settingsMap[s.key] = s.value));

    return NextResponse.json({
      passwordLoginEnabled: settingsMap.passwordLoginEnabled !== "false", // default true
      googleLoginEnabled: settingsMap.googleLoginEnabled === "true", // default false
      googleLoginClientId: settingsMap.googleLoginClientId || "", // for frontend
    });
  } catch (error: any) {
    // Return defaults on error
    return NextResponse.json({
      passwordLoginEnabled: true,
      googleLoginEnabled: false,
      googleLoginClientId: "",
    });
  }
}
