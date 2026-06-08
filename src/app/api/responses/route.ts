import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/responses - Get responses with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formId = searchParams.get("formId");
    const userId = searchParams.get("userId");

    const where: any = {};
    if (formId) where.formId = formId;
    if (userId) where.userId = userId;

    const responses = await db.formResponse.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, nip: true, bidang: true, jabatan: true, pangkat: true } },
        form: { select: { id: true, title: true } },
        fields: { include: { field: true } },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json(responses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/responses - Create or update a response
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, userId, fields } = body;

    // Check if form is still active and not past deadline
    const form = await db.form.findUnique({
      where: { id: formId },
      include: { fields: { orderBy: { order: 'asc' } } },
    });
    if (!form) {
      return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
    }
    if (!form.isActive || form.isClosed) {
      return NextResponse.json({ error: "Form sudah ditutup" }, { status: 400 });
    }
    if (form.deadline && new Date() > form.deadline) {
      return NextResponse.json({ error: "Batas waktu pengisian sudah lewat" }, { status: 400 });
    }

    // Check if response already exists
    const existingResponse = await db.formResponse.findUnique({
      where: { formId_userId: { formId, userId } },
    });

    // Get user info for auto-sync
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { nip: true, name: true, bidang: true, jabatan: true },
    });

    let response;
    if (existingResponse) {
      // Update existing response
      await db.fieldResponse.deleteMany({ where: { responseId: existingResponse.id } });

      response = await db.formResponse.update({
        where: { id: existingResponse.id },
        data: {
          submittedAt: new Date(),
          fields: {
            create: fields.map((field: any) => ({
              fieldId: field.fieldId,
              value: field.value || null,
              fileName: field.fileName || null,
              filePath: field.filePath || null,
              driveFileId: field.driveFileId || null,
              driveLink: field.driveLink || null,
            })),
          },
        },
        include: { fields: { include: { field: true } } },
      });

      // Log activity
      await db.activityLog.create({
        data: {
          userId,
          action: "UPDATE_RESPONSE",
          details: `Mengubah jawaban form: ${form.title}`,
        },
      });
    } else {
      // Create new response
      response = await db.formResponse.create({
        data: {
          formId,
          userId,
          fields: {
            create: fields.map((field: any) => ({
              fieldId: field.fieldId,
              value: field.value || null,
              fileName: field.fileName || null,
              filePath: field.filePath || null,
              driveFileId: field.driveFileId || null,
              driveLink: field.driveLink || null,
            })),
          },
        },
        include: { fields: { include: { field: true } } },
      });

      // Log activity
      await db.activityLog.create({
        data: {
          userId,
          action: "SUBMIT_RESPONSE",
          details: `Mengisi form: ${form.title}`,
        },
      });
    }

    // Auto-sync to Google Sheets (non-blocking)
    try {
      const autoSyncSetting = await db.systemSetting.findUnique({
        where: { key: 'googleSheetsAutoSync' },
      });

      if (autoSyncSetting?.value === 'true' && user) {
        // Dynamically import to avoid issues
        const { appendFormResponse } = await import('@/lib/google-sheets')

        // Build field data for sync (including Drive links)
        const fieldData = fields.map((field: any) => {
          const formField = form.fields.find((f) => f.id === field.fieldId)
          return {
            label: formField?.label || '',
            value: field.value || '',
            driveLink: field.driveLink || '',
            fileName: field.fileName || '',
          }
        })

        // Don't await - fire and forget
        appendFormResponse(formId, {
          nip: user.nip,
          name: user.name,
          bidang: user.bidang || '',
          jabatan: user.jabatan || '',
          submittedAt: new Date(),
          fields: fieldData,
        }).catch((err: any) => {
          console.error('Auto-sync to Sheets failed (non-blocking):', err?.message || err)
        })
      }
    } catch {
      // Auto-sync is optional, don't block the response
    }

    return NextResponse.json(response, { status: existingResponse ? 200 : 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
