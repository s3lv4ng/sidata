import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/forms/[id] - Get a single form
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const form = await db.form.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, nip: true } },
        fields: { orderBy: { order: "asc" } },
        responses: userId
          ? {
              where: { userId },
              include: { fields: { include: { field: true } }, user: { select: { id: true, name: true, nip: true, bidang: true } } },
            }
          : {
              include: { fields: { include: { field: true } }, user: { select: { id: true, name: true, nip: true, bidang: true, jabatan: true, pangkat: true } } },
            },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/forms/[id] - Update a form
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, isActive, isClosed, deadline, fields, userId } = body;

    // If fields are provided, delete existing and recreate
    if (fields) {
      await db.formField.deleteMany({ where: { formId: id } });

      await db.form.update({
        where: { id },
        data: {
          title,
          description,
          isActive,
          isClosed,
          deadline: deadline ? new Date(deadline) : null,
          fields: {
            create: fields.map((field: any, index: number) => ({
              label: field.label,
              type: field.type,
              required: field.required || false,
              options: field.options ? JSON.stringify(field.options) : null,
              placeholder: field.placeholder || null,
              order: index,
            })),
          },
        },
      });
    } else {
      await db.form.update({
        where: { id },
        data: {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(isActive !== undefined && { isActive }),
          ...(isClosed !== undefined && { isClosed }),
          ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        },
      });
    }

    // Log activity
    if (userId) {
      await db.activityLog.create({
        data: {
          userId,
          action: "UPDATE_FORM",
          details: `Mengubah form ID: ${id}`,
        },
      });
    }

    const updatedForm = await db.form.findUnique({
      where: { id },
      include: { fields: { orderBy: { order: "asc" } } },
    });

    return NextResponse.json(updatedForm);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/forms/[id] - Delete a form
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Delete all responses and field responses first
    const responses = await db.formResponse.findMany({ where: { formId: id } });
    for (const response of responses) {
      await db.fieldResponse.deleteMany({ where: { responseId: response.id } });
    }
    await db.formResponse.deleteMany({ where: { formId: id } });
    await db.formField.deleteMany({ where: { formId: id } });
    await db.form.delete({ where: { id } });

    // Log activity
    if (userId) {
      await db.activityLog.create({
        data: {
          userId,
          action: "DELETE_FORM",
          details: `Menghapus form ID: ${id}`,
        },
      });
    }

    return NextResponse.json({ message: "Form berhasil dihapus" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
