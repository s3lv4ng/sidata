import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";

// GET /api/reports - Generate reports with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get("formId");
    const bidang = searchParams.get("bidang");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "json"; // json, excel, pdf

    if (!formId) {
      return NextResponse.json({ error: "Form ID diperlukan" }, { status: 400 });
    }

    const form = await db.form.findUnique({
      where: { id: formId },
      include: { fields: { orderBy: { order: "asc" } } },
    });

    if (!form) {
      return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
    }

    const where: any = { formId };
    if (bidang) {
      where.user = { bidang };
    }
    if (startDate || endDate) {
      where.submittedAt = {};
      if (startDate) where.submittedAt.gte = new Date(startDate);
      if (endDate) where.submittedAt.lte = new Date(endDate);
    }

    const responses = await db.formResponse.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, nip: true, bidang: true, jabatan: true, pangkat: true, unitKerja: true } },
        fields: { include: { field: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Get unresponded ASN
    const respondedUserIds = responses.map((r) => r.userId);
    const unrespondedWhere: any = { role: "ASN" };
    if (bidang) unrespondedWhere.bidang = bidang;
    if (respondedUserIds.length > 0) {
      unrespondedWhere.id = { notIn: respondedUserIds };
    }
    const unrespondedASN = await db.user.findMany({
      where: unrespondedWhere,
      select: { id: true, name: true, nip: true, bidang: true, jabatan: true },
      orderBy: { name: "asc" },
    });

    if (format === "excel") {
      // Generate Excel
      const headers = ["No", "Nama", "NIP", "Bidang", "Jabatan", "Pangkat/Golongan"];
      form.fields.forEach((field) => headers.push(field.label));
      headers.push("Tanggal Pengisian");

      const rows = responses.map((response, idx) => {
        const row: any[] = [
          idx + 1,
          response.user.name,
          response.user.nip,
          response.user.bidang || "-",
          response.user.jabatan || "-",
          response.user.pangkat || "-",
        ];
        form.fields.forEach((field) => {
          const fieldResponse = response.fields.find((f) => f.fieldId === field.id);
          let value = fieldResponse?.value || "-";
          // Parse JSON arrays for checkbox/multiple_choice
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) value = parsed.join(", ");
          } catch {}
          row.push(value);
        });
        row.push(new Date(response.submittedAt).toLocaleDateString("id-ID"));
        return row;
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Responden");

      // Add unresponded sheet
      const unrespondedHeaders = ["No", "Nama", "NIP", "Bidang", "Jabatan"];
      const unrespondedRows = unrespondedASN.map((asn, idx) => [
        idx + 1, asn.name, asn.nip, asn.bidang || "-", asn.jabatan || "-"
      ]);
      const ws2 = XLSX.utils.aoa_to_sheet([unrespondedHeaders, ...unrespondedRows]);
      XLSX.utils.book_append_sheet(wb, ws2, "Belum Mengisi");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="laporan-${form.title.replace(/\s+/g, "-")}.xlsx"`,
        },
      });
    }

    return NextResponse.json({
      form: { id: form.id, title: form.title, description: form.description, fields: form.fields },
      responses,
      unrespondedASN,
      totalResponded: responses.length,
      totalUnresponded: unrespondedASN.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
