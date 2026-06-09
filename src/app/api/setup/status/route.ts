import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/setup/status - Check if setup is needed (no admin users exist)
export async function GET() {
  try {
    const adminCount = await db.user.count({
      where: { role: "ADMIN" },
    });

    return NextResponse.json({ needsSetup: adminCount === 0 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
