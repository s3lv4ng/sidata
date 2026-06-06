import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const adminId = formData.get("adminId") as string;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(Buffer.from(buffer));
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    const results = { success: 0, failed: 0, errors: [] as string[] };
    const hashedPassword = await bcrypt.hash("asn123", 10); // Default password

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const nip = String(row["NIP"] || row["nip"] || "").trim();
        const name = String(row["Nama"] || row["nama"] || row["Nama Lengkap"] || "").trim();

        if (!nip || !name) {
          results.errors.push(`Baris ${i + 2}: NIP dan Nama wajib diisi`);
          results.failed++;
          continue;
        }

        // Check if NIP already exists
        const existing = await db.user.findUnique({ where: { nip } });
        if (existing) {
          results.errors.push(`Baris ${i + 2}: NIP ${nip} sudah terdaftar`);
          results.failed++;
          continue;
        }

        await db.user.create({
          data: {
            nip,
            password: hashedPassword,
            name,
            role: "ASN",
            email: String(row["Email"] || row["email"] || "").trim() || null,
            phone: String(row["No HP"] || row["Phone"] || row["phone"] || "").trim() || null,
            jabatan: String(row["Jabatan"] || row["jabatan"] || "").trim() || null,
            pangkat: String(row["Pangkat"] || row["pangkat"] || "").trim() || null,
            unitKerja: String(row["Unit Kerja"] || row["unitKerja"] || "").trim() || "BKAD Kabupaten Seruyan",
            bidang: String(row["Bidang"] || row["bidang"] || "").trim() || null,
            statusASN: String(row["Status"] || row["statusASN"] || row["Status ASN"] || "PNS").trim(),
          },
        });
        results.success++;
      } catch (err: any) {
        results.errors.push(`Baris ${i + 2}: ${err.message}`);
        results.failed++;
      }
    }

    // Log activity
    if (adminId) {
      await db.activityLog.create({
        data: {
          userId: adminId,
          action: "IMPORT_ASN",
          details: `Import ${results.success} ASN (${results.failed} gagal)`,
        },
      });
    }

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
