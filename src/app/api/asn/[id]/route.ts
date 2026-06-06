import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// PUT /api/asn/[id] - Update ASN user
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, email, phone, jabatan, pangkat, unitKerja, bidang, statusASN, isActive, password, adminId } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (jabatan !== undefined) data.jabatan = jabatan;
    if (pangkat !== undefined) data.pangkat = pangkat;
    if (unitKerja !== undefined) data.unitKerja = unitKerja;
    if (bidang !== undefined) data.bidang = bidang;
    if (statusASN !== undefined) data.statusASN = statusASN;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const user = await db.user.update({ where: { id }, data });

    if (adminId) {
      await db.activityLog.create({
        data: { userId: adminId, action: "UPDATE_ASN", details: `Mengubah data ASN: ${name || id}` },
      });
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/asn/[id] - Delete ASN user
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get("userId");

    await db.fieldResponse.deleteMany({ where: { response: { userId: id } } });
    await db.formResponse.deleteMany({ where: { userId: id } });
    await db.activityLog.deleteMany({ where: { userId: id } });
    await db.announcement.deleteMany({ where: { createdById: id } });
    await db.user.delete({ where: { id } });

    if (adminId) {
      await db.activityLog.create({
        data: { userId: adminId, action: "DELETE_ASN", details: `Menghapus ASN ID: ${id}` },
      });
    }

    return NextResponse.json({ message: "ASN berhasil dihapus" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
