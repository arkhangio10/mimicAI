import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/marketplace/[id]/install — Install a marketplace automation
 * Body: { userId, connectedServices: string[] }
 *
 * In production, this would trigger Auth0 Token Vault consent flow
 * for each required service. For now, we trust the client's claim
 * of connected services.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workflowId } = await params;
    const { userId, connectedServices } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Verify workflow exists and is published
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId, isPublished: true, deletedAt: null },
      select: { id: true, services: true, creatorId: true },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Automation not found or not published" },
        { status: 404 }
      );
    }

    // Prevent self-install (creator already has access)
    if (workflow.creatorId === userId) {
      return NextResponse.json(
        { error: "You cannot install your own automation" },
        { status: 400 }
      );
    }

    // Ensure user exists (upsert for dev)
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: `${userId}@mimicai.dev`,
        auth0Id: `dev|${userId}`,
        displayName: "User",
      },
    });

    // Create or reactivate installation
    const installation = await prisma.installation.upsert({
      where: {
        userId_workflowId: { userId, workflowId },
      },
      update: {
        isActive: true,
        connectedServices: connectedServices ?? workflow.services,
      },
      create: {
        userId,
        workflowId,
        connectedServices: connectedServices ?? workflow.services,
        isActive: true,
      },
    });

    return NextResponse.json({ installation }, { status: 201 });
  } catch (err) {
    console.error("[marketplace/install] POST error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to install automation",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/marketplace/[id]/install — Uninstall a marketplace automation
 * Query: ?userId=xxx
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: workflowId } = await params;
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query param is required" },
        { status: 400 }
      );
    }

    // Deactivate (soft-delete) — don't hard delete so execution history is preserved
    await prisma.installation.update({
      where: {
        userId_workflowId: { userId, workflowId },
      },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[marketplace/install] DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to uninstall automation" },
      { status: 500 }
    );
  }
}
