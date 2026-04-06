import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/workflows/[id] — Get workflow details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const workflow = await prisma.workflow.findUnique({
      where: { id, deletedAt: null },
      include: {
        creator: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        recordings: {
          select: {
            id: true,
            status: true,
            learnedSteps: true,
            questions: true,
            createdAt: true,
          },
        },
        _count: {
          select: { installations: true },
        },
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ workflow });
  } catch (err) {
    console.error("[workflows/[id]] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workflows/[id] — Update workflow
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "name",
      "description",
      "steps",
      "rules",
      "edgeCases",
      "variables",
      "services",
      "triggerType",
      "triggerConfig",
      "requiresScreenCapture",
      "sourceApp",
      "isPublished",
      "price",
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) data[field] = body[field];
    }

    const workflow = await prisma.workflow.update({
      where: { id },
      data,
      include: {
        creator: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        _count: { select: { installations: true } },
      },
    });

    return NextResponse.json({ workflow });
  } catch (err) {
    console.error("[workflows/[id]] PATCH error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update workflow",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/[id] — Soft-delete workflow
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    await prisma.workflow.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[workflows/[id]] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
