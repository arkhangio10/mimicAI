import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/marketplace/[id] — Get full marketplace listing detail
 * Query: ?userId=xxx to include installation status
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = request.nextUrl.searchParams.get("userId");

    const workflow = await prisma.workflow.findUnique({
      where: { id, isPublished: true, deletedAt: null },
      include: {
        creator: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        _count: {
          select: { installations: true },
        },
        ...(userId
          ? {
              installations: {
                where: { userId },
                select: {
                  id: true,
                  isActive: true,
                  connectedServices: true,
                  lastRunAt: true,
                  createdAt: true,
                },
                take: 1,
              },
            }
          : {}),
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Automation not found" },
        { status: 404 }
      );
    }

    const steps = Array.isArray(workflow.steps)
      ? (workflow.steps as unknown[])
      : [];
    const rules = Array.isArray(workflow.rules)
      ? (workflow.rules as unknown[])
      : [];
    const edgeCases = Array.isArray(workflow.edgeCases)
      ? (workflow.edgeCases as unknown[])
      : [];
    const variables = Array.isArray(workflow.variables)
      ? (workflow.variables as unknown[])
      : [];

    // Build detail response — show step purposes but not raw parameters
    const listing = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      creator: {
        id: workflow.creator.id,
        name: workflow.creator.displayName ?? "Anonymous",
        avatar: workflow.creator.avatarUrl,
      },
      services: workflow.services,
      requiresScreenCapture: workflow.requiresScreenCapture,
      sourceApp: workflow.sourceApp,
      triggerType: workflow.triggerType,
      price: workflow.price,
      installCount: workflow._count.installations,
      createdAt: workflow.createdAt.toISOString(),

      // Show step overview (purpose + type) without exposing internal params
      steps: steps.map((s: unknown) => {
        const step = s as Record<string, unknown>;
        return {
          order: step.order,
          type: step.type,
          purpose: step.purpose ?? step.action,
          service: step.service,
          isConditional: step.isConditional ?? false,
        };
      }),

      // Show rules for transparency (buyers see what logic drives the automation)
      rules: rules.map((r: unknown) => {
        const rule = r as Record<string, unknown>;
        return {
          condition: rule.condition,
          action: rule.action,
          confidence: rule.confidence,
        };
      }),

      // Show edge cases
      edgeCases: edgeCases.map((e: unknown) => {
        const edge = e as Record<string, unknown>;
        return {
          scenario: edge.scenario,
          response: edge.response,
        };
      }),

      // Show variables (buyer needs to know what inputs are required)
      variables: variables.map((v: unknown) => {
        const variable = v as Record<string, unknown>;
        return {
          name: variable.name,
          type: variable.type,
          source: variable.source,
          description: variable.description,
          default: variable.default,
        };
      }),

      // Current user's installation status
      ...(userId && "installations" in workflow
        ? {
            installation:
              (
                workflow.installations as {
                  id: string;
                  isActive: boolean;
                  connectedServices: string[];
                  lastRunAt: Date | null;
                  createdAt: Date;
                }[]
              )[0] ?? null,
          }
        : {}),
    };

    return NextResponse.json({ listing });
  } catch (err) {
    console.error("[marketplace/[id]] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 }
    );
  }
}
