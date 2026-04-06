import { NextRequest, NextResponse } from "next/server";
import { getLearningSession } from "@/lib/learning-sessions";

/**
 * PATCH /api/learning/rules
 * Edit or delete rules, edge cases, or variables in the learning session.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      sessionId: string;
      type: "rule" | "edgeCase" | "variable";
      action: "update" | "delete";
      id: string; // ruleId, edgeCaseId, or variable name
      updates?: Record<string, unknown>;
    };

    const { sessionId, type, action, id, updates } = body;

    if (!sessionId || !type || !action || !id) {
      return NextResponse.json(
        { error: "sessionId, type, action, and id are required" },
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

    if (type === "rule") {
      if (action === "delete") {
        session.extractedRules = session.extractedRules.filter(
          (r) => r.id !== id
        );
      } else if (action === "update" && updates) {
        const rule = session.extractedRules.find((r) => r.id === id);
        if (rule) {
          Object.assign(rule, updates);
        }
      }
      return NextResponse.json({ rules: session.extractedRules });
    }

    if (type === "edgeCase") {
      if (action === "delete") {
        session.extractedEdgeCases = session.extractedEdgeCases.filter(
          (e) => e.id !== id
        );
      } else if (action === "update" && updates) {
        const ec = session.extractedEdgeCases.find((e) => e.id === id);
        if (ec) {
          Object.assign(ec, updates);
        }
      }
      return NextResponse.json({ edgeCases: session.extractedEdgeCases });
    }

    if (type === "variable") {
      if (action === "delete") {
        session.detectedVariables = session.detectedVariables.filter(
          (v) => v.name !== id
        );
      } else if (action === "update" && updates) {
        const variable = session.detectedVariables.find((v) => v.name === id);
        if (variable) {
          Object.assign(variable, updates);
        }
      }
      return NextResponse.json({ variables: session.detectedVariables });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (err) {
    console.error("[learning/rules] Error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to update rules",
      },
      { status: 500 }
    );
  }
}
