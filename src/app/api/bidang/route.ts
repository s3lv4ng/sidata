import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/bidang
export async function GET() {
  try {
    const bidangList = await db.bidang.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(bidangList);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/bidang
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama bidang harus diisi" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await db.bidang.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ error: "Bidang dengan nama tersebut sudah ada" }, { status: 400 });
    }

    const bidang = await db.bidang.create({
      data: { name: name.trim() },
    });

    return NextResponse.json(bidang, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/bidang
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }
    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama bidang harus diisi" }, { status: 400 });
    }

    // Check for duplicate name (excluding current item)
    const existing = await db.bidang.findFirst({
      where: { name: name.trim(), NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: "Bidang dengan nama tersebut sudah ada" }, { status: 400 });
    }

    const bidang = await db.bidang.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json(bidang);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/bidang
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });
    }

    // Check if any ASN uses this bidang
    const asnUsingBidang = await db.user.findFirst({
      where: { bidang: { not: null } },
    });

    // Get the bidang name first
    const bidang = await db.bidang.findUnique({ where: { id } });
    if (!bidang) {
      return NextResponse.json({ error: "Bidang tidak ditemukan" }, { status: 404 });
    }

    // Count ASN using this bidang
    const asnCount = await db.user.count({
      where: { bidang: bidang.name },
    });

    if (asnCount > 0) {
      return NextResponse.json(
        { error: `Bidang "${bidang.name}" masih digunakan oleh ${asnCount} ASN. Ubah bidang ASN terlebih dahulu.` },
        { status: 400 }
      );
    }

    await db.bidang.delete({ where: { id } });

    return NextResponse.json({ message: "Bidang berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
