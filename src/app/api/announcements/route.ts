import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/announcements
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");

    const where: any = {};
    if (isActive === "true") where.isActive = true;

    const announcements = await db.announcement.findMany({
      where,
      include: { createdBy: { select: { id: true, name: true } } },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(announcements);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/announcements
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, isPinned, createdById } = body;

    const announcement = await db.announcement.create({
      data: { title, content, isPinned: isPinned || false, createdById },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: createdById,
        action: "CREATE_ANNOUNCEMENT",
        details: `Membuat pengumuman: ${title}`,
      },
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/announcements
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, content, isPinned, isActive, userId } = body;

    const announcement = await db.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    if (userId) {
      await db.activityLog.create({
        data: {
          userId,
          action: "UPDATE_ANNOUNCEMENT",
          details: `Mengubah pengumuman: ${title || id}`,
        },
      });
    }

    return NextResponse.json(announcement);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/announcements
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    await db.announcement.delete({ where: { id } });

    if (userId) {
      await db.activityLog.create({
        data: {
          userId,
          action: "DELETE_ANNOUNCEMENT",
          details: `Menghapus pengumuman ID: ${id}`,
        },
      });
    }

    return NextResponse.json({ message: "Pengumuman berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
