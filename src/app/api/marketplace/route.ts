import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/marketplace — List published workflows for the marketplace
 * Query params:
 *   ?search=term    — filter by name/description
 *   ?service=gmail  — filter by required service
 *   ?sort=popular|newest|price_asc|price_desc
 *   ?userId=xxx     — include installation status for this user
 */
export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get("search");
    const service = request.nextUrl.searchParams.get("service");
    const sort = request.nextUrl.searchParams.get("sort") ?? "popular";
    const userId = request.nextUrl.searchParams.get("userId");

    // Build where clause — only published, non-deleted workflows
    const where: Record<string, unknown> = {
      isPublished: true,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (service) {
      where.services = { has: service };
    }

    // Build orderBy
    let orderBy: Record<string, unknown>;
    switch (sort) {
      case "newest":
        orderBy = { createdAt: "desc" };
        break;
      case "price_asc":
        orderBy = { price: "asc" };
        break;
      case "price_desc":
        orderBy = { price: "desc" };
        break;
      case "popular":
      default:
        orderBy = { installations: { _count: "desc" } };
        break;
    }

    const workflows = await prisma.workflow.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
        description: true,
        services: true,
        steps: true,
        rules: true,
        requiresScreenCapture: true,
        sourceApp: true,
        price: true,
        createdAt: true,
        creator: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        _count: {
          select: { installations: true },
        },
        // Include current user's installation if userId provided
        ...(userId
          ? {
              installations: {
                where: { userId },
                select: { id: true, isActive: true },
                take: 1,
              },
            }
          : {}),
      },
    });

    // Map to marketplace listing format
    const listings = workflows.map((wf) => ({
      id: wf.id,
      workflowId: wf.id,
      name: wf.name,
      description: wf.description,
      creatorName: wf.creator.displayName ?? "Anonymous",
      creatorId: wf.creator.id,
      creatorAvatar: wf.creator.avatarUrl,
      services: wf.services,
      stepCount: Array.isArray(wf.steps) ? (wf.steps as unknown[]).length : 0,
      ruleCount: Array.isArray(wf.rules) ? (wf.rules as unknown[]).length : 0,
      requiresScreenCapture: wf.requiresScreenCapture,
      sourceApp: wf.sourceApp,
      price: wf.price,
      installCount: wf._count.installations,
      createdAt: wf.createdAt.toISOString(),
      // Current user's install status (if userId provided)
      ...(userId && "installations" in wf
        ? {
            installed:
              (wf.installations as { id: string; isActive: boolean }[]).length >
              0,
            installationId:
              (wf.installations as { id: string; isActive: boolean }[])[0]
                ?.id ?? null,
          }
        : {}),
    }));

    return NextResponse.json({ listings });
  } catch (err) {
    console.error("[marketplace] GET error:", err);
    // Return empty list instead of 500 when DB is unavailable (demo resilience)
    if (String(err).includes("connect") || String(err).includes("ECONNREFUSED")) {
      return NextResponse.json({ listings: [], _dbOffline: true });
    }
    return NextResponse.json(
      { error: "Failed to fetch marketplace listings" },
      { status: 500 }
    );
  }
}
