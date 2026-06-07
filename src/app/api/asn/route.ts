import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// GET /api/asn - Get all ASN users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bidang = searchParams.get("bidang");
    const statusASN = searchParams.get("statusASN");
    const search = searchParams.get("search");

    const where: any = { role: "ASN" };
    if (bidang) where.bidang = bidang;
    if (statusASN) where.statusASN = statusASN;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nip: { contains: search } },
        { jabatan: { contains: search } },
      ];
    }

    const asnList = await db.user.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        nip: true,
        name: true,
        email: true,
        phone: true,
        jabatan: true,
        pangkat: true,
        unitKerja: true,
        bidang: true,
        statusASN: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(asnList);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/asn - Create a new ASN user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nip, name, email, phone, jabatan, pangkat, unitKerja, bidang, statusASN, password, adminId } = body;

    const hashedPassword = await bcrypt.hash(password || nip, 10);

    const user = await db.user.create({
      data: {
        nip,
        password: hashedPassword,
        name,
        role: "ASN",
        email,
        phone,
        jabatan,
        pangkat,
        unitKerja,
        bidang,
        statusASN,
      },
    });

    // Log activity
    if (adminId) {
      await db.activityLog.create({
        data: {
          userId: adminId,
          action: "CREATE_ASN",
          details: `Menambah ASN: ${name} (${nip})`,
        },
      });
    }

    return NextResponse.json(user, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "NIP sudah terdaftar" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
