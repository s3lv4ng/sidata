import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/status-asn/[id] - Get single status ASN by id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const statusASN = await db.statusASN.findUnique({ where: { id } });

    if (!statusASN) {
      return NextResponse.json({ error: "Status ASN tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(statusASN);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/status-asn/[id] - Update status ASN
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, isActive, adminId } = body;

    // Check if status ASN exists
    const existing = await db.statusASN.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Status ASN tidak ditemukan" }, { status: 404 });
    }

    // Validate name uniqueness if changed
    if (name !== undefined && name.trim() !== existing.name) {
      if (name.trim() === "") {
        return NextResponse.json({ error: "Nama status ASN wajib diisi" }, { status: 400 });
      }
      const duplicate = await db.statusASN.findUnique({ where: { name: name.trim() } });
      if (duplicate) {
        return NextResponse.json({ error: "Nama status ASN sudah digunakan" }, { status: 400 });
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (isActive !== undefined) data.isActive = isActive;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada data untuk diperbarui" }, { status: 400 });
    }

    const statusASN = await db.statusASN.update({
      where: { id },
      data,
    });

    // Log activity
    if (adminId) {
      await db.activityLog.create({
        data: {
          userId: adminId,
          action: "UPDATE_STATUS_ASN",
          details: `Mengubah status ASN: ${statusASN.name}`,
        },
      });
    }

    return NextResponse.json(statusASN);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/status-asn/[id] - Delete status ASN
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("adminId");

    // Check if status ASN exists
    const existing = await db.statusASN.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Status ASN tidak ditemukan" }, { status: 404 });
    }

    // Check if any User references this status name
    const userCount = await db.user.count({
      where: { statusASN: existing.name },
    });

    if (userCount > 0) {
      return NextResponse.json(
        { error: `Status ASN masih digunakan oleh ${userCount} ASN` },
        { status: 400 }
      );
    }

    await db.statusASN.delete({ where: { id } });

    // Log activity
    if (adminId) {
      await db.activityLog.create({
        data: {
          userId: adminId,
          action: "DELETE_STATUS_ASN",
          details: `Menghapus status ASN: ${existing.name}`,
        },
      });
    }

    return NextResponse.json({ message: "Status ASN berhasil dihapus" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
