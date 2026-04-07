"use client";

import { useState, useEffect, useCallback } from "react";
import type { WorkflowVariable } from "@/types/workflow";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  SkipForward,
  AlertCircle,
  Monitor,
  Send,
  FileSpreadsheet,
  MessageSquare,
  RotateCcw,
  Info,
} from "lucide-react";

interface StepResult {
  stepId: string;
  stepName: string;
  stepType: string;
  service: string | null;
  status: "success" | "skipped" | "failed";
  output: Record<string, unknown>;
  error?: string;
}

interface ExecutionStatus {
  id: string;
  status: string;
  currentStepIndex: number;
  stepsCompleted: number;
  stepsTotal: number;
  stepResults: StepResult[];
  rulesApplied: string[] | null;
  error: string | null;
  startedAt: number;
  completedAt: number | null;
  demoMode: boolean;
}

interface WorkflowRunnerProps {
  workflowId: string;
  variables: WorkflowVariable[];
  stepCount?: number;
}

function getStepIcon(type: string, service: string | null) {
  if (service === "gmail") return <Send className="h-3 w-3" />;
  if (service === "sheets") return <FileSpreadsheet className="h-3 w-3" />;
  if (service === "slack") return <MessageSquare className="h-3 w-3" />;
  if (type === "read_screen") return <Monitor className="h-3 w-3" />;
  return null;
}

function getStatusColor(status: string) {
  switch (status) {
    case "success": return "border-green-200 bg-green-50";
    case "skipped": return "border-muted bg-muted/30";
    case "failed": return "border-red-200 bg-red-50";
    default: return "";
  }
}

export function WorkflowRunner({
  workflowId,
  variables,
}: WorkflowRunnerProps) {
  const safeVariables = variables ?? [];
  const userInputVars = safeVariables.filter((v) => v.source === "user_input");
  const [inputs, setInputs] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    for (const v of userInputVars) {
      defaults[v.name] = v.default != null ? String(v.default) : "";
    }
    return defaults;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [execution, setExecution] = useState<ExecutionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for execution status
  useEffect(() => {
    if (!executionId || !isRunning) return;

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/execute/${executionId}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        setExecution(data);

        if (data.status === "completed" || data.status === "failed") {
          clearInterval(poll);
          setIsRunning(false);
        }
      } catch {
        // Polling failure — will retry
      }
    }, 500);

    return () => clearInterval(poll);
  }, [executionId, isRunning]);

  const startRun = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setExecution(null);

    // Convert string inputs to proper types
    const typedInputs: Record<string, unknown> = {};
    for (const v of safeVariables) {
      const raw = inputs[v.name];
      if (raw === undefined || raw === "") {
        if (v.default != null) typedInputs[v.name] = v.default;
        continue;
      }
      if (v.type === "number") typedInputs[v.name] = Number(raw);
      else if (v.type === "boolean") typedInputs[v.name] = raw === "true";
      else typedInputs[v.name] = raw;
    }

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          userId: "dev-user",
          variableInputs: typedInputs,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.missing) {
          setError(`Missing required inputs: ${data.missing.join(", ")}`);
        } else {
          setError(data.error ?? "Failed to start execution");
        }
        setIsRunning(false);
        return;
      }

      setExecutionId(data.executionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
      setIsRunning(false);
    }
  }, [workflowId, safeVariables, inputs]);

  const resetExecution = useCallback(() => {
    setExecution(null);
    setExecutionId(null);
    setError(null);
    setIsRunning(false);
  }, []);

  const progressPct =
    execution && execution.stepsTotal > 0
      ? Math.round((execution.stepsCompleted / execution.stepsTotal) * 100)
      : 0;

  const isComplete = execution?.status === "completed" || execution?.status === "failed";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Play className="h-4 w-4" />
          Run Workflow
        </CardTitle>
        <CardDescription className="text-xs">
          {userInputVars.length > 0
            ? "Set variable values then click Run."
            : "This workflow has no required inputs. Click Run to start."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Variable Inputs */}
        {userInputVars.length > 0 && !execution && (
          <div className="space-y-3">
            {userInputVars.map((v) => (
              <div key={v.name} className="space-y-1">
                <label className="text-xs font-medium flex items-center gap-2">
                  {v.name}
                  <Badge variant="outline" className="text-[10px]">
                    {v.type}
                  </Badge>
                </label>
                <Input
                  type={v.type === "number" ? "number" : "text"}
                  placeholder={v.description}
                  value={inputs[v.name] ?? ""}
                  onChange={(e) =>
                    setInputs((prev) => ({
                      ...prev,
                      [v.name]: e.target.value,
                    }))
                  }
                  disabled={isRunning}
                  className="h-8 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  {v.description}
                </p>
              </div>
            ))}
            <Separator />
          </div>
        )}

        {/* Run / Reset Button */}
        {isComplete ? (
          <Button onClick={resetExecution} variant="outline" className="w-full">
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Run Again
          </Button>
        ) : (
          <Button
            onClick={startRun}
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Run Workflow
              </>
            )}
          </Button>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Execution Progress */}
        {execution && (
          <div className="space-y-3">
            {/* Status header */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium capitalize flex items-center gap-1.5">
                {execution.status === "completed" && (
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                )}
                {execution.status === "failed" && (
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                )}
                {execution.status === "running" && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {execution.status}
              </span>
              <span className="text-muted-foreground">
                {execution.stepsCompleted}/{execution.stepsTotal} steps
              </span>
            </div>

            <Progress value={progressPct} />

            {/* Step Results */}
            {execution.stepResults && execution.stepResults.length > 0 && (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {execution.stepResults.map((sr, idx) => (
                  <div
                    key={sr.stepId}
                    className={`flex items-center gap-2 text-xs rounded-md border px-2.5 py-2 ${getStatusColor(sr.status)}`}
                  >
                    {sr.status === "success" && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    )}
                    {sr.status === "skipped" && (
                      <SkipForward className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                    {sr.status === "failed" && (
                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">Step {idx + 1}</span>
                        {getStepIcon(sr.stepType, sr.service)}
                        <span className="truncate text-muted-foreground">
                          {sr.stepName || sr.stepType}
                        </span>
                      </div>
                      {sr.error && (
                        <p className="text-destructive mt-0.5 truncate">
                          {sr.error}
                        </p>
                      )}
                      {sr.output?._demo && (
                        <span className="text-blue-600 text-[10px]">simulated</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Waiting indicator for in-progress steps */}
            {execution.status === "running" && execution.stepsCompleted < execution.stepsTotal && (
              <div className="flex items-center gap-2 text-xs rounded-md border border-dashed px-2.5 py-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span>
                  Running step {execution.stepsCompleted + 1} of {execution.stepsTotal}...
                </span>
              </div>
            )}

            {/* Rules Applied */}
            {execution.rulesApplied && execution.rulesApplied.length > 0 && (
              <div className="text-[10px] text-muted-foreground">
                Rules applied: {execution.rulesApplied.join(", ")}
              </div>
            )}

            {/* Execution error */}
            {execution.error && (
              <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{execution.error}</span>
              </div>
            )}

            {/* Completion time */}
            {execution.completedAt && (
              <div className="text-[10px] text-muted-foreground text-right">
                Completed in{" "}
                {((execution.completedAt - execution.startedAt) / 1000).toFixed(1)}s
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
