import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function POST() {
  try {
    // Check if already seeded
    const existingAdmin = await db.user.findFirst({ where: { role: "ADMIN" } });
    if (existingAdmin) {
      return NextResponse.json({ message: "Database sudah di-seed", seeded: false });
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    // Create admin user
    const admin = await db.user.create({
      data: {
        nip: "admin",
        password: hashedPassword,
        name: "Administrator BKAD",
        role: "ADMIN",
        email: "admin@bkad-seruyan.go.id",
        phone: "0531-123456",
        jabatan: "Kepala Badan",
        pangkat: "IV/c",
        unitKerja: "BKAD Kabupaten Seruyan",
        bidang: "Umum",
        statusASN: "PNS",
      },
    });

    // Create ASN users
    const asnData = [
      { nip: "198501012010011001", name: "Budi Santoso", jabatan: "Kepala Bidang Pendapatan", pangkat: "III/d", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Pendapatan", statusASN: "PNS", phone: "081234567890", email: "budi.santoso@bkad-seruyan.go.id" },
      { nip: "199001152015022001", name: "Siti Rahmawati", jabatan: "Kepala Seksi Pajak", pangkat: "III/c", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Pendapatan", statusASN: "PNS", phone: "081234567891", email: "siti.rahmawati@bkad-seruyan.go.id" },
      { nip: "198703202012011002", name: "Ahmad Fauzi", jabatan: "Analis Keuangan", pangkat: "III/b", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Pendapatan", statusASN: "PNS", phone: "081234567892", email: "ahmad.fauzi@bkad-seruyan.go.id" },
      { nip: "199205102018022003", name: "Dewi Lestari", jabatan: "Kepala Bidang Belanja", pangkat: "III/c", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Belanja", statusASN: "PNS", phone: "081234567893", email: "dewi.lestari@bkad-seruyan.go.id" },
      { nip: "198912052014011003", name: "Rudi Hartono", jabatan: "Kepala Seksi Belanja Langsung", pangkat: "III/b", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Belanja", statusASN: "PNS", phone: "081234567894", email: "rudi.hartono@bkad-seruyan.go.id" },
      { nip: "199108252019022004", name: "Rina Wulandari", jabatan: "Bendahara Pengeluaran", pangkat: "III/a", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Belanja", statusASN: "PNS", phone: "081234567895", email: "rina.wulandari@bkad-seruyan.go.id" },
      { nip: "198604302011011004", name: "Eko Prasetyo", jabatan: "Kepala Bidang Aset", pangkat: "III/d", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Aset", statusASN: "PNS", phone: "081234567896", email: "eko.prasetyo@bkad-seruyan.go.id" },
      { nip: "199301122020022005", name: "Fitri Handayani", jabatan: "Pengelola Aset", pangkat: "III/a", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Aset", statusASN: "PPPK", phone: "081234567897", email: "fitri.handayani@bkad-seruyan.go.id" },
      { nip: "199507182021022006", name: "Dimas Ari Wibowo", jabatan: "Staff Tata Usaha", pangkat: "II/c", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Umum", statusASN: "PPPK", phone: "081234567898", email: "dimas.wibowo@bkad-seruyan.go.id" },
      { nip: "198802142013011005", name: "Nur Aini", jabatan: "Kepala Seksi Perencanaan", pangkat: "III/c", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Umum", statusASN: "PNS", phone: "081234567899", email: "nur.aini@bkad-seruyan.go.id" },
      { nip: "199412012022012001", name: "Reza Mahendra", jabatan: "Analis Kebijakan", pangkat: "III/a", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Pendapatan", statusASN: "PPPK", phone: "081234567800", email: "reza.mahendra@bkad-seruyan.go.id" },
      { nip: "199206282017011006", name: "Putri Anggraeni", jabatan: "PPK", pangkat: "III/b", unitKerja: "BKAD Kabupaten Seruyan", bidang: "Belanja", statusASN: "PNS", phone: "081234567801", email: "putri.anggraeni@bkad-seruyan.go.id" },
    ];

    const hashedAsnPassword = await bcrypt.hash("asn123", 10);

    for (const asn of asnData) {
      await db.user.create({
        data: {
          nip: asn.nip,
          password: hashedAsnPassword,
          name: asn.name,
          role: "ASN",
          email: asn.email,
          phone: asn.phone,
          jabatan: asn.jabatan,
          pangkat: asn.pangkat,
          unitKerja: asn.unitKerja,
          bidang: asn.bidang,
          statusASN: asn.statusASN,
        },
      });
    }

    // Create sample forms
    const now = new Date();
    const deadline1 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const deadline2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

    const form1 = await db.form.create({
      data: {
        title: "Data Aset Pribadi ASN 2025",
        description: "Form pengumpulan data aset pribadi ASN BKAD Kabupaten Seruyan untuk tahun 2025. Harap diisi dengan lengkap dan benar.",
        isActive: true,
        deadline: deadline1,
        createdById: admin.id,
        fields: {
          create: [
            { label: "Nama Lengkap", type: "short_text", required: true, order: 1 },
            { label: "NIP", type: "short_text", required: true, order: 2 },
            { label: "Jumlah Aset Tanah", type: "number", required: true, order: 3 },
            { label: "Luas Tanah (m²)", type: "number", required: true, order: 4 },
            { label: "Lokasi Aset Tanah", type: "paragraph", required: false, order: 5 },
            { label: "Jumlah Kendaraan", type: "dropdown", required: true, options: JSON.stringify(["0", "1", "2", "3", "4", "5 atau lebih"]), order: 6 },
            { label: "Jenis Kendaraan", type: "checkbox", required: false, options: JSON.stringify(["Mobil", "Motor", "Sepeda", "Lainnya"]), order: 7 },
            { label: "Kepemilikan Rumah", type: "multiple_choice", required: true, options: JSON.stringify(["Milik Sendiri", "Kontrak/Sewa", "Rumah Dinas", "Menumpang"]), order: 8 },
            { label: "Tanggal Pengisian LHKPN", type: "date", required: false, order: 9 },
            { label: "Keterangan Tambahan", type: "paragraph", required: false, order: 10 },
          ],
        },
      },
    });

    const form2 = await db.form.create({
      data: {
        title: "Kebutuhan Pelatihan ASN Semester I 2025",
        description: "Form untuk mengidentifikasi kebutuhan pelatihan dan pengembangan kompetensi ASN BKAD Kabupaten Seruyan semester I tahun 2025.",
        isActive: true,
        deadline: deadline2,
        createdById: admin.id,
        fields: {
          create: [
            { label: "Nama Lengkap", type: "short_text", required: true, order: 1 },
            { label: "Bidang", type: "dropdown", required: true, options: JSON.stringify(["Pendapatan", "Belanja", "Aset", "Umum"]), order: 2 },
            { label: "Jenis Pelatihan yang Dibutuhkan", type: "paragraph", required: true, order: 3 },
            { label: "Prioritas Pelatihan", type: "multiple_choice", required: true, options: JSON.stringify(["Sangat Urgent", "Urgent", "Biasa", "Tidak Urgent"]), order: 4 },
            { label: "Metode Pelatihan yang Diinginkan", type: "checkbox", required: true, options: JSON.stringify(["Offline/In-person", "Online/Daring", "Blended", "Self-learning"]), order: 5 },
            { label: "Estimasi Biaya (Rp)", type: "number", required: false, order: 6 },
            { label: "Tanggal Pelaksanaan yang Diinginkan", type: "date", required: false, order: 7 },
            { label: "Upload Proposal/Surat Permohonan", type: "file_upload", required: false, order: 8 },
          ],
        },
      },
    });

    const form3 = await db.form.create({
      data: {
        title: "Absensi Rapat Koordinasi Januari 2025",
        description: "Form konfirmasi kehadiran rapat koordinasi bulanan BKAD Kabupaten Seruyan.",
        isActive: false,
        isClosed: true,
        deadline: new Date(2025, 0, 15),
        createdById: admin.id,
        fields: {
          create: [
            { label: "Nama Lengkap", type: "short_text", required: true, order: 1 },
            { label: "Kehadiran", type: "multiple_choice", required: true, options: JSON.stringify(["Hadir", "Tidak Hadir", "Izin", "Sakit"]), order: 2 },
            { label: "Alasan Ketidakhadiran", type: "paragraph", required: false, order: 3 },
          ],
        },
      },
    });

    // Create sample responses - fetch fields separately since nested create doesn't return them
    const asn1 = await db.user.findFirst({ where: { nip: "198501012010011001" } });
    const asn2 = await db.user.findFirst({ where: { nip: "199001152015022001" } });
    const asn3 = await db.user.findFirst({ where: { nip: "198703202012011002" } });
    const asn4 = await db.user.findFirst({ where: { nip: "199205102018022003" } });

    if (asn1) {
      const fields1 = await db.formField.findMany({ where: { formId: form1.id }, orderBy: { order: "asc" } });
      await db.formResponse.create({
        data: {
          formId: form1.id,
          userId: asn1.id,
          fields: {
            create: [
              { fieldId: fields1[0].id, value: "Budi Santoso" },
              { fieldId: fields1[1].id, value: "198501012010011001" },
              { fieldId: fields1[2].id, value: "2" },
              { fieldId: fields1[3].id, value: "500" },
              { fieldId: fields1[4].id, value: "Jl. Trans Kalimantan, Kec. Seruyan Hilir" },
              { fieldId: fields1[5].id, value: "2" },
              { fieldId: fields1[6].id, value: JSON.stringify(["Mobil", "Motor"]) },
              { fieldId: fields1[7].id, value: "Milik Sendiri" },
              { fieldId: fields1[8].id, value: "2025-01-10" },
              { fieldId: fields1[9].id, value: "Tidak ada keterangan tambahan" },
            ],
          },
        },
      });
    }

    if (asn2) {
      const fields1 = await db.formField.findMany({ where: { formId: form1.id }, orderBy: { order: "asc" } });
      await db.formResponse.create({
        data: {
          formId: form1.id,
          userId: asn2.id,
          fields: {
            create: [
              { fieldId: fields1[0].id, value: "Siti Rahmawati" },
              { fieldId: fields1[1].id, value: "199001152015022001" },
              { fieldId: fields1[2].id, value: "1" },
              { fieldId: fields1[3].id, value: "200" },
              { fieldId: fields1[4].id, value: "Kec. Seruyan Tengah" },
              { fieldId: fields1[5].id, value: "1" },
              { fieldId: fields1[6].id, value: JSON.stringify(["Motor"]) },
              { fieldId: fields1[7].id, value: "Milik Sendiri" },
              { fieldId: fields1[8].id, value: "2025-01-12" },
              { fieldId: fields1[9].id, value: "" },
            ],
          },
        },
      });
    }

    if (asn3) {
      const fields2 = await db.formField.findMany({ where: { formId: form2.id }, orderBy: { order: "asc" } });
      await db.formResponse.create({
        data: {
          formId: form2.id,
          userId: asn3.id,
          fields: {
            create: [
              { fieldId: fields2[0].id, value: "Ahmad Fauzi" },
              { fieldId: fields2[1].id, value: "Pendapatan" },
              { fieldId: fields2[2].id, value: "Pelatihan Manajemen Keuangan Daerah dan Pelatihan Pajak Daerah" },
              { fieldId: fields2[3].id, value: "Urgent" },
              { fieldId: fields2[4].id, value: JSON.stringify(["Offline/In-person", "Online/Daring"]) },
              { fieldId: fields2[5].id, value: "5000000" },
              { fieldId: fields2[6].id, value: "2025-03-15" },
            ],
          },
        },
      });
    }

    if (asn4) {
      const fields3 = await db.formField.findMany({ where: { formId: form3.id }, orderBy: { order: "asc" } });
      await db.formResponse.create({
        data: {
          formId: form3.id,
          userId: asn4.id,
          fields: {
            create: [
              { fieldId: fields3[0].id, value: "Dewi Lestari" },
              { fieldId: fields3[1].id, value: "Hadir" },
              { fieldId: fields3[2].id, value: "" },
            ],
          },
        },
      });
    }

    // Create sample announcements
    await db.announcement.createMany({
      data: [
        {
          title: "Pengumpulan Data Aset Pribadi ASN 2025",
          content: "Diberitahukan kepada seluruh ASN BKAD Kabupaten Seruyan untuk segera mengisi form Data Aset Pribadi ASN 2025 sebelum batas waktu yang ditentukan. Pengisian data wajib dilakukan secara online melalui sistem ini.",
          isPinned: true,
          isActive: true,
          createdById: admin.id,
        },
        {
          title: "Jadwal Rapat Koordinasi Bulanan",
          content: "Rapat koordinasi bulanan akan dilaksanakan pada tanggal 20 Januari 2025 di Ruang Rapat Utama BKAD. Seluruh ASN diharapkan hadir tepat waktu.",
          isPinned: false,
          isActive: true,
          createdById: admin.id,
        },
        {
          title: "Pembaruan Sistem Pengumpulan Data",
          content: "Sistem pengumpulan data ASN telah diperbarui dengan fitur baru. Jika mengalami kendala, silakan hubungi admin di ext. 1234.",
          isPinned: false,
          isActive: true,
          createdById: admin.id,
        },
      ],
    });

    // Create system settings
    await db.systemSetting.createMany({
      data: [
        { key: "app_name", value: "Sistem Pengumpulan Data ASN BKAD Kabupaten Seruyan" },
        { key: "app_short_name", value: "SIDATA BKAD" },
        { key: "instansi", value: "Badan Keuangan dan Aset Daerah Kabupaten Seruyan" },
        { key: "daerah", value: "Kabupaten Seruyan, Kalimantan Tengah" },
        { key: "email_instansi", value: "bkad@seruyankab.go.id" },
        { key: "telepon_instansi", value: "0531-891234" },
        { key: "alamat_instansi", value: "Jl. Trans Kalimantan, Kuala Pembuang, Kab. Seruyan, Kalimantan Tengah" },
      ],
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: admin.id,
        action: "SEED_DATABASE",
        details: "Database telah di-seed dengan data awal",
      },
    });

    return NextResponse.json({ message: "Database berhasil di-seed", seeded: true });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
