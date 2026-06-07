import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/forms - Get all forms (with optional filters)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get("isActive");
    const userId = searchParams.get("userId");

    const where: any = {};
    if (isActive === "true") where.isActive = true;
    if (isActive === "false") where.isActive = false;

    const forms = await db.form.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true, nip: true } },
        fields: { orderBy: { order: "asc" } },
        responses: userId ? { where: { userId: userId! }, select: { id: true, submittedAt: true } } : { select: { id: true, userId: true, submittedAt: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(forms);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/forms - Create a new form
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, deadline, createdById, fields } = body;

    const form = await db.form.create({
      data: {
        title,
        description,
        deadline: deadline ? new Date(deadline) : null,
        createdById,
        fields: {
          create: fields.map((field: any, index: number) => ({
            label: field.label,
            type: field.type,
            required: field.required || false,
            options: field.options ? JSON.stringify(field.options) : null,
            order: index,
          })),
        },
      },
      include: { fields: true },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: createdById,
        action: "CREATE_FORM",
        details: `Membuat form: ${title}`,
      },
    });

    return NextResponse.json(form, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
