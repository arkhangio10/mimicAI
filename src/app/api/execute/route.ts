import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth0, CONNECTIONS } from "@/lib/auth0";
import {
  startExecution,
  validateVariableInputs,
} from "@/lib/execution";
import type { WorkflowTemplate, WorkflowVariable } from "@/types/workflow";

/**
 * POST /api/execute — Start a workflow execution
 */
export async function POST(request: NextRequest) {
  try {
    const { workflowId, userId, variableInputs, aiConfig } =
      await request.json();

    if (!workflowId || !userId) {
      return NextResponse.json(
        { error: "workflowId and userId are required" },
        { status: 400 }
      );
    }

    // Fetch workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId, deletedAt: null },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Build WorkflowTemplate from DB record
    const template: WorkflowTemplate = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      creatorId: workflow.creatorId,
      services: workflow.services,
      steps: workflow.steps as unknown as WorkflowTemplate["steps"],
      rules: workflow.rules as unknown as WorkflowTemplate["rules"],
      edgeCases: (workflow.edgeCases ?? []) as unknown as WorkflowTemplate["edgeCases"],
      variables: workflow.variables as unknown as WorkflowTemplate["variables"],
      triggerType: workflow.triggerType as WorkflowTemplate["triggerType"],
      triggerConfig: (workflow.triggerConfig ?? {}) as Record<string, unknown>,
      requiresScreenCapture: workflow.requiresScreenCapture,
      sourceApp: workflow.sourceApp,
      isPublished: workflow.isPublished,
      price: workflow.price,
    };

    // Validate variable inputs
    const variables = template.variables as WorkflowVariable[];
    const inputs = variableInputs ?? {};
    const validation = validateVariableInputs(variables, inputs);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Missing required variable inputs",
          missing: validation.missing,
          variables: variables.filter((v) => v.source === "user_input"),
        },
        { status: 400 }
      );
    }

    // Apply defaults for missing optional variables
    for (const v of variables) {
      if (!(v.name in inputs) && v.default != null) {
        inputs[v.name] = v.default;
      }
    }

    // Get Google token - try Token Vault first, fall back to Management API
    let googleToken: string | null = null;
    try {
      const tokenResponse = await auth0.getAccessTokenForConnection(
        { connection: CONNECTIONS.GOOGLE }
      );
      googleToken = tokenResponse.token;
      console.log("[execute] SUCCESS - Got Google token via Token Vault");
    } catch {
      // Token Vault failed - get token via Management API
      try {
        const session = await auth0.getSession();
        const auth0UserId = session?.user?.sub;
        if (auth0UserId) {
          // Get Management API token
          const mgmtRes = await fetch(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: process.env.AUTH0_CLIENT_ID,
              client_secret: process.env.AUTH0_CLIENT_SECRET,
              audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
              grant_type: "client_credentials",
            }),
          });
          const mgmtData = await mgmtRes.json();

          // Get user's Google identity with IDP tokens
          const userRes = await fetch(
            `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0UserId)}?fields=identities&include_fields=true`,
            { headers: { Authorization: `Bearer ${mgmtData.access_token}` } }
          );
          const userData = await userRes.json();

          const googleIdentity = userData.identities?.find(
            (id: { connection: string }) => id.connection === "google-oauth2"
          );
          if (googleIdentity?.access_token) {
            googleToken = googleIdentity.access_token;
            console.log("[execute] SUCCESS - Got Google token via Management API");
          }
        }
      } catch (err) {
        console.error("[execute] Management API fallback failed:", err instanceof Error ? err.message : err);
      }
    }

    // Start execution with pre-fetched token
    const execution = await startExecution(
      template,
      userId,
      inputs,
      aiConfig,
      googleToken
    );

    // Create DB record for tracking
    try {
      const installation = await prisma.installation.upsert({
        where: {
          userId_workflowId: { userId, workflowId },
        },
        update: { lastRunAt: new Date() },
        create: {
          userId,
          workflowId,
          connectedServices: template.services,
          isActive: true,
          lastRunAt: new Date(),
        },
      });

      await prisma.execution.create({
        data: {
          id: execution.id,
          installationId: installation.id,
          userId,
          workflowId,
          status: "running",
          stepsCompleted: 0,
          stepsTotal: template.steps.length,
          variableInputs: inputs,
        },
      });
    } catch {
      console.warn("[execute] Failed to save execution to DB");
    }

    return NextResponse.json({
      executionId: execution.id,
      status: execution.status,
      stepsTotal: execution.stepsTotal,
      variableInputs: inputs,
    });
  } catch (err) {
    console.error("[execute] POST error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to start execution",
      },
      { status: 500 }
    );
  }
}
