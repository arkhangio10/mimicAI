import { NextRequest, NextResponse } from "next/server";
import { getExecution } from "@/lib/execution";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/execute/[id] — Get execution status and progress
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check in-memory first (active execution)
    const execution = getExecution(id);
    if (execution) {
      // Sync to DB if terminal state
      if (execution.status === "completed" || execution.status === "failed") {
        try {
          await prisma.execution.update({
            where: { id },
            data: {
              status: execution.status,
              stepsCompleted: execution.stepsCompleted,
              rulesApplied: execution.rulesApplied,
              error: execution.error,
              completedAt: execution.completedAt
                ? new Date(execution.completedAt)
                : null,
            },
          });
        } catch {
          // DB sync failure is non-fatal
        }
      }

      return NextResponse.json({
        id: execution.id,
        workflowId: execution.workflowId,
        status: execution.status,
        currentStepIndex: execution.currentStepIndex,
        stepsCompleted: execution.stepsCompleted,
        stepsTotal: execution.stepsTotal,
        stepResults: execution.stepResults,
        rulesApplied: execution.rulesApplied,
        variableInputs: execution.variableInputs,
        error: execution.error,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
      });
    }

    // Fall back to DB (finished execution)
    const dbExecution = await prisma.execution.findUnique({
      where: { id },
    });

    if (!dbExecution) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: dbExecution.id,
      workflowId: dbExecution.workflowId,
      status: dbExecution.status,
      stepsCompleted: dbExecution.stepsCompleted,
      stepsTotal: dbExecution.stepsTotal,
      rulesApplied: dbExecution.rulesApplied,
      variableInputs: dbExecution.variableInputs,
      error: dbExecution.error,
      startedAt: dbExecution.startedAt,
      completedAt: dbExecution.completedAt,
    });
  } catch (err) {
    console.error("[execute/[id]] GET error:", err);
    return NextResponse.json(
      { error: "Failed to fetch execution status" },
      { status: 500 }
    );
  }
}
