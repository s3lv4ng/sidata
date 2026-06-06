import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/activity-logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const action = searchParams.get("action") || undefined;
    const search = searchParams.get("search") || undefined;

    const where: any = {};
    if (action) {
      where.action = action;
    }
    if (search) {
      where.user = {
        name: { contains: search },
      };
    }

    const logs = await db.activityLog.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, nip: true, role: true } } },
    });

    const total = await db.activityLog.count({ where });

    return NextResponse.json({ logs, total });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
