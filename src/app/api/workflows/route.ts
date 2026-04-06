import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/workflows — List workflows for current user
 * Query params: ?userId=xxx (temporary until auth is wired)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    const where: Record<string, unknown> = { deletedAt: null };
    if (userId) where.creatorId = userId;

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        services: true,
        steps: true,
        rules: true,
        variables: true,
        triggerType: true,
        requiresScreenCapture: true,
        sourceApp: true,
        isPublished: true,
        price: true,
        createdAt: true,
        updatedAt: true,
        creator: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        _count: {
          select: { installations: true, recordings: true },
        },
      },
    });

    return NextResponse.json({ workflows });
  } catch (err) {
    console.error("[workflows] GET error:", err);
    // Return empty list instead of 500 when DB is unavailable (demo resilience)
    if (String(err).includes("connect") || String(err).includes("ECONNREFUSED")) {
      return NextResponse.json({ workflows: [], _dbOffline: true });
    }
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows — Create a new workflow from learning results
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      creatorId,
      steps,
      rules,
      edgeCases,
      variables,
      services: requiredServices,
      requiresScreenCapture,
      sourceApp,
      triggerType,
      // Optional: recording data to link
      recordingData,
    } = body;

    if (!name || !creatorId) {
      return NextResponse.json(
        { error: "name and creatorId are required" },
        { status: 400 }
      );
    }

    // Ensure user exists (upsert for dev convenience)
    await prisma.user.upsert({
      where: { id: creatorId },
      update: {},
      create: {
        id: creatorId,
        email: `${creatorId}@mimicai.dev`,
        auth0Id: `dev|${creatorId}`,
        displayName: "Developer",
      },
    });

    const workflow = await prisma.workflow.create({
      data: {
        name: name || "Untitled Workflow",
        description: description || "",
        creatorId,
        services: requiredServices ?? [],
        steps: steps ?? [],
        rules: rules ?? [],
        edgeCases: edgeCases ?? [],
        variables: variables ?? [],
        triggerType: triggerType ?? "manual",
        requiresScreenCapture: requiresScreenCapture ?? false,
        sourceApp: sourceApp ?? null,
        isPublished: false,
        price: 0,
        recordings: recordingData
          ? {
              create: {
                learnedSteps: recordingData.learnedSteps ?? [],
                questions: recordingData.questions ?? [],
                extractedRules: recordingData.rules ?? [],
                status: "complete",
              },
            }
          : undefined,
      },
      include: {
        recordings: true,
        _count: { select: { installations: true } },
      },
    });

    return NextResponse.json({ workflow }, { status: 201 });
  } catch (err) {
    console.error("[workflows] POST error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create workflow",
      },
      { status: 500 }
    );
  }
}
