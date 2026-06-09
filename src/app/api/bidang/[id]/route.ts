import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/bidang/[id] - Get single bidang by id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bidang = await db.bidang.findUnique({ where: { id } });

    if (!bidang) {
      return NextResponse.json({ error: "Bidang tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(bidang);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/bidang/[id] - Update bidang
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, isActive, adminId } = body;

    // Check if bidang exists
    const existing = await db.bidang.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bidang tidak ditemukan" }, { status: 404 });
    }

    // Validate name uniqueness if changed
    if (name !== undefined && name.trim() !== existing.name) {
      if (name.trim() === "") {
        return NextResponse.json({ error: "Nama bidang wajib diisi" }, { status: 400 });
      }
      const duplicate = await db.bidang.findUnique({ where: { name: name.trim() } });
      if (duplicate) {
        return NextResponse.json({ error: "Nama bidang sudah digunakan" }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (isActive !== undefined) data.isActive = isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada data untuk diperbarui" }, { status: 400 });
    }

    const bidang = await db.bidang.update({
      where: { id },
      data,
    });

    // Log activity
    if (adminId) {
      await db.activityLog.create({
        data: {
          userId: adminId,
          action: "UPDATE_BIDANG",
          details: `Mengubah bidang: ${bidang.name}`,
        },
      });
    }

    return NextResponse.json(bidang);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/bidang/[id] - Delete bidang
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");

    // Check if bidang exists
    const existing = await db.bidang.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bidang tidak ditemukan" }, { status: 404 });
    }

    // Check if any User references this bidang name
    const userCount = await db.user.count({
      where: { bidang: existing.name },
    });

    if (userCount > 0) {
      return NextResponse.json(
        { error: `Bidang masih digunakan oleh ${userCount} ASN` },
        { status: 400 }
      );
    }

    await db.bidang.delete({ where: { id } });

    // Log activity
    if (adminId) {
      await db.activityLog.create({
        data: {
          userId: adminId,
          action: "DELETE_BIDANG",
          details: `Menghapus bidang: ${existing.name}`,
        },
      });
    }

    return NextResponse.json({ message: "Bidang berhasil dihapus" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
