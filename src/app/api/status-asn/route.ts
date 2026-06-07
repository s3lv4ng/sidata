import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/status-asn
export async function GET() {
  try {
    const statusList = await db.statusASN.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(statusList);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/status-asn
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama status ASN harus diisi" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.statusASN.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Status ASN dengan nama tersebut sudah ada" }, { status: 400 });
    }

    const statusASN = await db.statusASN.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(statusASN, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/status-asn
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama status ASN harus diisi" }, { status: 400 });
    }

    // Check for duplicate name (excluding current item)
    const existing = await db.statusASN.findFirst({
      where: { name: name.trim(), NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Status ASN dengan nama tersebut sudah ada" }, { status: 400 });
    }

    const statusASN = await db.statusASN.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json(statusASN);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/status-asn
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    // Get the status name first
    const statusASN = await db.statusASN.findUnique({ where: { id } });
    if (!statusASN) {
      return NextResponse.json({ error: "Status ASN tidak ditemukan" }, { status: 404 });
    }

    // Count ASN using this status
    const asnCount = await db.user.count({
      where: { statusASN: statusASN.name },
    });

    if (asnCount > 0) {
      return NextResponse.json(
        { error: `Status ASN "${statusASN.name}" masih digunakan oleh ${asnCount} ASN. Ubah status ASN terlebih dahulu.` },
        { status: 400 }
      );
    }

    await db.statusASN.delete({ where: { id } });

    return NextResponse.json({ message: "Status ASN berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
