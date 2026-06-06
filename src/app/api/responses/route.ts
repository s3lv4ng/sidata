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
    const form = await db.form.findUnique({ where: { id: formId } });
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
            })),
          },
        },
        include: { fields: true },
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
            })),
          },
        },
        include: { fields: true },
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

    return NextResponse.json(response, { status: existingResponse ? 200 : 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
