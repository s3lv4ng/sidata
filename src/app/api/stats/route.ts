import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const totalASN = await db.user.count({ where: { role: "ASN" } });
    const activeASN = await db.user.count({ where: { role: "ASN", isActive: true } });
    const totalForms = await db.form.count();
    const activeForms = await db.form.count({ where: { isActive: true, isClosed: false } });
    const closedForms = await db.form.count({ where: { isClosed: true } });
    const totalResponses = await db.formResponse.count();

    // Per-form statistics
    const forms = await db.form.findMany({
      include: {
        _count: { select: { responses: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formStats = forms.map((form) => ({
      id: form.id,
      title: form.title,
      isActive: form.isActive,
      isClosed: form.isClosed,
      deadline: form.deadline,
      responseCount: form._count.responses,
      totalASN,
      completionRate: totalASN > 0 ? Math.round((form._count.responses / totalASN) * 100) : 0,
    }));

    // Per-bidang statistics
    const bidangList = await db.user.findMany({
      where: { role: "ASN", bidang: { not: null } },
      select: { bidang: true },
      distinct: ["bidang"],
    });

    const bidangStats = [];
    for (const b of bidangList) {
      if (!b.bidang) continue;
      const count = await db.user.count({ where: { role: "ASN", bidang: b.bidang } });
      bidangStats.push({ bidang: b.bidang, count });
    }

    // Per-status ASN statistics
    const statusStats = [];
    const statusList = await db.user.findMany({
      where: { role: "ASN", statusASN: { not: null } },
      select: { statusASN: true },
      distinct: ["statusASN"],
    });
    for (const s of statusList) {
      if (!s.statusASN) continue;
      const count = await db.user.count({ where: { role: "ASN", statusASN: s.statusASN } });
      statusStats.push({ status: s.statusASN, count });
    }

    // Recent activity
    const recentActivity = await db.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, nip: true } } },
    });

    // ASN yang belum mengisi per form
    const unrespondedPerForm = [];
    for (const form of forms) {
      const respondedUserIds = await db.formResponse.findMany({
        where: { formId: form.id },
        select: { userId: true },
      });
      const respondedIds = respondedUserIds.map((r) => r.userId);
      const unrespondedASN = await db.user.findMany({
        where: { role: "ASN", id: { notIn: respondedIds } },
        select: { id: true, name: true, nip: true, bidang: true },
        orderBy: { name: "asc" },
      });
      unrespondedPerForm.push({
        formId: form.id,
        formTitle: form.title,
        unrespondedCount: unrespondedASN.length,
        unrespondedASN,
      });
    }

    return NextResponse.json({
      totalASN,
      activeASN,
      totalForms,
      activeForms,
      closedForms,
      totalResponses,
      formStats,
      bidangStats,
      statusStats,
      recentActivity,
      unrespondedPerForm,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
