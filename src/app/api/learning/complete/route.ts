import { NextRequest, NextResponse } from "next/server";
import {
  getLearningSession,
  deleteLearningSession,
} from "@/lib/learning-sessions";
import { generateWorkflow } from "@/lib/ai/learning";
import type { AIProviderConfig, AIProviderType } from "@/lib/ai/provider";

/**
 * POST /api/learning/complete
 * Finalize the learning session, generate a workflow, and optionally save to DB.
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, workflowName, workflowDescription, saveToDb } =
      (await request.json()) as {
        sessionId: string;
        workflowName?: string;
        workflowDescription?: string;
        saveToDb?: boolean;
      };

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const session = getLearningSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: "Learning session not found" },
        { status: 404 }
      );
    }

    // Capture results before cleanup
    const results = {
      learnedSteps: session.learnedSteps,
      rules: session.extractedRules,
      edgeCases: session.extractedEdgeCases,
      variables: session.detectedVariables,
      questionsAnswered: session.allQuestions.length,
      actionsReviewed: session.actions.length,
    };

    // Generate workflow via AI if API key is available
    let generatedWorkflow: {
      steps: unknown[];
      services: string[];
      requiresScreenCapture: boolean;
      sourceApp: string | null;
      suggestedName: string;
      suggestedDescription: string;
    } | null = null;

    // Resolve API key: session key > env var
    const resolvedKey =
      session.apiKey ||
      (session.provider === "gemini" ? process.env.GEMINI_API_KEY : null) ||
      (session.provider === "openai" ? process.env.OPENAI_API_KEY : null) ||
      (session.provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : null) ||
      null;

    if (resolvedKey) {
      try {
        const aiConfig: AIProviderConfig = {
          provider: session.provider as AIProviderType,
          apiKey: resolvedKey,
        };

        // Build step understandings from learned steps
        const stepUnderstandings = session.learnedSteps.map((ls) => ({
          actionId: ls.id,
          purposeDescription: ls.understanding.purposeDescription,
          conditionLogic: ls.understanding.conditionLogic,
          isConditional: ls.understanding.isConditional,
          condition: ls.understanding.condition,
          consequences: ls.understanding.consequences,
        }));

        generatedWorkflow = await generateWorkflow(
          aiConfig,
          session.actions,
          session.allQuestions,
          session.extractedRules,
          session.extractedEdgeCases,
          session.detectedVariables,
          stepUnderstandings
        );
      } catch (err) {
        console.warn(
          "[learning/complete] Workflow generation failed:",
          err instanceof Error ? err.message : err
        );
        // Non-fatal — return results without generated workflow
      }
    }

    // Build workflow data
    const workflowData = generatedWorkflow
      ? {
          name:
            workflowName ||
            generatedWorkflow.suggestedName ||
            "Untitled Workflow",
          description:
            workflowDescription ||
            generatedWorkflow.suggestedDescription ||
            "",
          steps: generatedWorkflow.steps,
          rules: session.extractedRules,
          edgeCases: session.extractedEdgeCases,
          variables: session.detectedVariables,
          services: generatedWorkflow.services,
          requiresScreenCapture: generatedWorkflow.requiresScreenCapture,
          sourceApp: generatedWorkflow.sourceApp,
        }
      : {
          name: workflowName || "Untitled Workflow",
          description: workflowDescription || "",
          steps: [],
          rules: session.extractedRules,
          edgeCases: session.extractedEdgeCases,
          variables: session.detectedVariables,
          services: Array.from(
            new Set(
              session.actions
                .map((a) => a.destinationService)
                .filter((s) => !!s && s !== "browser" && s !== "unknown") as string[]
            )
          ),
          requiresScreenCapture: session.actions.some(
            (a) => !a.destinationService || a.destinationService === "browser"
          ),
          sourceApp:
            session.actions.find(
              (a) =>
                !["gmail", "sheets", "slack", "browser", "unknown"].includes(
                  a.sourceApp
                )
            )?.sourceApp ?? null,
        };

    // Save to DB if requested
    let savedWorkflowId: string | null = null;
    if (saveToDb) {
      try {
        const { prisma } = await import("@/lib/prisma");

        // Create a dev user if needed
        const userId = "dev-user";
        await prisma.user.upsert({
          where: { id: userId },
          update: {},
          create: {
            id: userId,
            email: "dev@mimicai.dev",
            auth0Id: "dev|local",
            displayName: "Developer",
          },
        });

        const workflow = await prisma.workflow.create({
          data: {
            name: workflowData.name,
            description: workflowData.description,
            creatorId: userId,
            services: workflowData.services,
            steps: workflowData.steps as unknown as import("@prisma/client").Prisma.InputJsonValue,
            rules: workflowData.rules as unknown as import("@prisma/client").Prisma.InputJsonValue,
            edgeCases: workflowData.edgeCases as unknown as import("@prisma/client").Prisma.InputJsonValue,
            variables: workflowData.variables as unknown as import("@prisma/client").Prisma.InputJsonValue,
            requiresScreenCapture: workflowData.requiresScreenCapture,
            sourceApp: workflowData.sourceApp,
            isPublished: false,
            price: 0,
            recordings: {
              create: {
                learnedSteps: session.learnedSteps as unknown as import("@prisma/client").Prisma.InputJsonValue,
                questions: session.allQuestions as unknown as import("@prisma/client").Prisma.InputJsonValue,
                extractedRules: session.extractedRules as unknown as import("@prisma/client").Prisma.InputJsonValue,
                status: "complete",
              },
            },
          },
        });

        savedWorkflowId = workflow.id;
      } catch (dbErr) {
        console.warn(
          "[learning/complete] DB save failed:",
          dbErr instanceof Error ? dbErr.message : dbErr
        );
        // Non-fatal — still return results
      }
    }

    session.phase = "complete";
    session.completedAt = Date.now();

    // Clean up screenshots and session
    deleteLearningSession(sessionId);

    return NextResponse.json({
      success: true,
      ...results,
      workflow: workflowData,
      workflowId: savedWorkflowId,
    });
  } catch (err) {
    console.error("[learning/complete] Error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to complete learning session",
      },
      { status: 500 }
    );
  }
}
