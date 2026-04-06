"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useScreenCapture } from "@/hooks/useScreenCapture";
import { ScreenCapture } from "@/components/recorder/ScreenCapture";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { CapturedAction } from "@/types/action";
import {
  Brain,
  Loader2,
  Save,
  Sparkles,
  AlertTriangle,
} from "lucide-react";

const MAX_RECORDING_MS = 2 * 60 * 1000;
const CAPTURE_INTERVAL_MS = 3000;

type PagePhase = "record" | "analyzing" | "inferring" | "review" | "saving";

interface InferredWorkflow {
  summary: string;
  steps: Array<{
    id: string;
    order: number;
    type: string;
    service: string | null;
    action: string;
    purpose: string;
    parameters: Record<string, unknown>;
    isConditional: boolean;
    condition: string | null;
    inputFrom: string | null;
    outputTo: string | null;
  }>;
  rules: Array<{
    id: string;
    condition: string;
    action: string;
    confidence: number;
  }>;
  variables: Array<{
    name: string;
    type: string;
    source: string;
    default: unknown;
    description: string;
  }>;
  edgeCases: Array<{
    id: string;
    scenario: string;
    response: string;
  }>;
  confidenceNotes: string[];
  services: string[];
  requiresScreenCapture: boolean;
  sourceApp: string | null;
  suggestedName: string;
  suggestedDescription: string;
}

export default function RecordPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<PagePhase>("record");
  const [actions, setActions] = useState<CapturedAction[]>([]);
  const [sessionId] = useState(() => crypto.randomUUID());
  const [aiProvider] = useState("gemini");
  const [apiKey] = useState("");

  // Collected frames
  const collectedFrames = useRef<string[]>([]);

  // Analysis progress
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisTotal, setAnalysisTotal] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("");

  // Inferred workflow
  const [inferred, setInferred] = useState<InferredWorkflow | null>(null);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDesc, setWorkflowDesc] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const onFrame = useCallback((base64: string) => {
    collectedFrames.current.push(base64);
  }, []);

  const {
    status,
    error,
    frameCount,
    elapsed,
    videoRef,
    canvasRef,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  } = useScreenCapture({ intervalMs: CAPTURE_INTERVAL_MS, onFrame });

  // Auto-stop at 2 minutes
  useEffect(() => {
    if (status === "recording" && elapsed >= MAX_RECORDING_MS) {
      stopRecording();
    }
  }, [status, elapsed, stopRecording]);

  const handleStop = useCallback(() => stopRecording(), [stopRecording]);

  // Phase 2: Analyze screenshots
  const startAnalysis = useCallback(async () => {
    const frames = collectedFrames.current;
    if (frames.length === 0) return;

    setPhase("analyzing");
    setAnalysisTotal(frames.length);
    setAnalysisProgress(0);

    const processedActions: CapturedAction[] = [];

    for (let i = 0; i < frames.length; i++) {
      setAnalysisProgress(i + 1);
      setAnalysisStatus(`Analyzing screenshot ${i + 1} of ${frames.length}...`);

      try {
        const res = await fetch("/api/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            screenshot: frames[i],
            sessionId,
            provider: aiProvider,
            apiKey: apiKey || undefined,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.action) {
            processedActions.push(data.action);
            setActions([...processedActions]);
          }
        }
      } catch (err) {
        console.error(`Failed to process frame ${i + 1}:`, err);
      }
    }

    setActions(processedActions);

    // Phase 3: Infer workflow in one shot
    setPhase("inferring");
    setAnalysisStatus("AI is analyzing your workflow...");

    try {
      const res = await fetch("/api/learning/infer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actions: processedActions,
          provider: aiProvider,
          apiKey: apiKey || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setInferred(data);
        setWorkflowName(data.suggestedName || "");
        setWorkflowDesc(data.suggestedDescription || "");
        setPhase("review");
      } else {
        const err = await res.json();
        setAnalysisStatus(`Inference failed: ${err.error}`);
      }
    } catch (err) {
      setAnalysisStatus(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  }, [sessionId, aiProvider, apiKey]);

  // Save workflow to DB
  const saveWorkflow = useCallback(async () => {
    if (!inferred) return;
    setPhase("saving");
    setSaveError(null);

    try {
      const res = await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workflowName || inferred.suggestedName || "Untitled Workflow",
          description: workflowDesc || inferred.suggestedDescription || "",
          creatorId: "dev-user",
          steps: inferred.steps,
          rules: inferred.rules,
          edgeCases: inferred.edgeCases,
          variables: inferred.variables,
          services: inferred.services,
          requiresScreenCapture: inferred.requiresScreenCapture,
          sourceApp: inferred.sourceApp,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/workflows/${data.workflow.id}`);
      } else {
        const err = await res.json();
        setSaveError(err.error || "Failed to save");
        setPhase("review");
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
      setPhase("review");
    }
  }, [inferred, workflowName, workflowDesc, router]);

  const isRecording = status === "recording";
  const isStopped = status === "stopped";
  const timeRemaining = Math.max(0, MAX_RECORDING_MS - elapsed);
  const timeRemainingStr = `${Math.floor(timeRemaining / 60000)}:${String(Math.floor((timeRemaining % 60000) / 1000)).padStart(2, "0")}`;

  // ── PHASE: REVIEW ──
  if (phase === "review" && inferred) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-7 w-7 text-primary" />
                Workflow Inferred
              </h1>
              <p className="text-muted-foreground mt-1">
                AI analyzed {actions.length} screenshots. Review and confirm.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPhase("record")}>
                Start Over
              </Button>
              <Button onClick={saveWorkflow}>
                <Save className="mr-2 h-4 w-4" />
                Save Workflow
              </Button>
            </div>
          </div>

          {saveError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {saveError}
            </div>
          )}

          {/* Name & Description */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <Input
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="Workflow name"
                className="text-lg font-semibold"
              />
              <Input
                value={workflowDesc}
                onChange={(e) => setWorkflowDesc(e.target.value)}
                placeholder="Description"
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Understanding</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {inferred.summary}
              </p>
            </CardContent>
          </Card>

          {/* Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Steps ({inferred.steps.length})
              </CardTitle>
              <CardDescription>
                The workflow broken into executable steps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {inferred.steps.map((step, i) => (
                  <div
                    key={step.id}
                    className="flex items-start gap-3 rounded-lg border p-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {step.purpose || step.action}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {step.type.replace(/_/g, " ")}
                        </Badge>
                        {step.service && (
                          <Badge variant="secondary" className="text-xs">
                            {step.service}
                          </Badge>
                        )}
                      </div>
                      {step.isConditional && step.condition && (
                        <p className="mt-1 text-xs text-amber-600">
                          IF: {step.condition}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Rules */}
          {inferred.rules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Rules ({inferred.rules.length})
                </CardTitle>
                <CardDescription>
                  IF/THEN logic inferred from your actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inferred.rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <span className="font-medium text-blue-600">IF</span>{" "}
                        {rule.condition}
                      </div>
                      <div className="mt-1">
                        <span className="font-medium text-green-600">THEN</span>{" "}
                        {rule.action}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Confidence: {Math.round(rule.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Variables */}
          {inferred.variables.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Variables ({inferred.variables.length})
                </CardTitle>
                <CardDescription>
                  Values that change between runs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inferred.variables.map((v) => (
                    <div
                      key={v.name}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <span className="font-mono font-medium">{v.name}</span>
                        <span className="ml-2 text-muted-foreground">
                          ({v.type}) — {v.description}
                        </span>
                      </div>
                      {v.default != null && (
                        <Badge variant="outline">
                          default: {String(v.default)}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edge Cases */}
          {inferred.edgeCases.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Edge Cases ({inferred.edgeCases.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inferred.edgeCases.map((e) => (
                    <div
                      key={e.id}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <div>
                        <span className="font-medium text-amber-600">WHEN</span>{" "}
                        {e.scenario}
                      </div>
                      <div className="mt-1">
                        <span className="font-medium text-green-600">THEN</span>{" "}
                        {e.response}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confidence Notes */}
          {inferred.confidenceNotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Things to verify
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {inferred.confidenceNotes.map((note, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-amber-500">*</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Bottom save */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setPhase("record")}>
              Start Over
            </Button>
            <Button size="lg" onClick={saveWorkflow}>
              <Save className="mr-2 h-4 w-4" />
              Save Workflow
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── PHASE: INFERRING ──
  if (phase === "inferring") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Brain className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold">Understanding Your Workflow</h1>
          <p className="text-muted-foreground">
            AI is analyzing all {actions.length} actions to infer steps, rules,
            and variables...
          </p>
          <div className="mx-auto max-w-sm">
            <Progress value={75} className="h-3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── PHASE: SAVING ──
  if (phase === "saving") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center space-y-6">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <h1 className="text-2xl font-bold">Saving Workflow...</h1>
        </div>
      </div>
    );
  }

  // ── PHASE: ANALYZING ──
  if (phase === "analyzing") {
    const percent =
      analysisTotal > 0
        ? Math.round((analysisProgress / analysisTotal) * 100)
        : 0;

    return (
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Brain className="h-8 w-8 text-primary animate-pulse" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              Analyzing Your Workflow
            </h1>
            <p className="mt-2 text-muted-foreground">{analysisStatus}</p>
          </div>

          <Card>
            <CardContent className="py-6 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Screenshot {analysisProgress} of {analysisTotal}
                </span>
                <span className="font-medium">{percent}%</span>
              </div>
              <Progress value={percent} className="h-3" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{actions.length} actions detected</span>
                <span>
                  {actions.filter((a) => a.extractedData).length} data points
                </span>
              </div>
            </CardContent>
          </Card>

          {actions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Detected Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {[...actions].reverse().map((action, i) => (
                    <div
                      key={action.id}
                      className="flex items-center gap-3 rounded-md border p-2 text-sm"
                    >
                      <Badge variant="outline" className="shrink-0">
                        {actions.length - i}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <span className="font-medium">{action.sourceApp}</span>
                        <span className="mx-1.5 text-muted-foreground">&middot;</span>
                        <span className="text-muted-foreground">
                          {action.action.replace(/_/g, " ")}
                        </span>
                      </div>
                      {action.extractedData && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          data
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  // ── PHASE: RECORD ──
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Record a Workflow
          </h1>
          <p className="text-muted-foreground">
            Share your screen and do your task. AI will analyze everything after
            you stop — no questions asked during recording.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ScreenCapture
              status={status}
              frameCount={frameCount}
              elapsed={elapsed}
              error={error}
              videoRef={videoRef}
              canvasRef={canvasRef}
              onStart={startRecording}
              onStop={handleStop}
              onPause={pauseRecording}
              onResume={resumeRecording}
            />
          </div>

          <div className="lg:col-span-2 space-y-4">
            {isRecording && (
              <Card>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Time Remaining</span>
                    <span
                      className={`font-mono text-lg font-bold ${timeRemaining < 30000 ? "text-destructive" : ""}`}
                    >
                      {timeRemainingStr}
                    </span>
                  </div>
                  <Progress
                    value={(elapsed / MAX_RECORDING_MS) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {collectedFrames.current.length} screenshots collected
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-2">
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="shrink-0 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    1
                  </Badge>
                  <span>
                    <strong>Record</strong> — share your screen (max 2 min)
                  </span>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="shrink-0 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    2
                  </Badge>
                  <span>
                    <strong>Analyze</strong> — AI reads every screenshot
                  </span>
                </div>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="shrink-0 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    3
                  </Badge>
                  <span>
                    <strong>Review</strong> — AI shows what it understood, you
                    confirm or correct
                  </span>
                </div>
              </CardContent>
            </Card>

            {isStopped && collectedFrames.current.length > 0 && (
              <Card>
                <CardContent className="py-4 text-center space-y-3">
                  <div className="text-sm text-muted-foreground">
                    <span className="text-2xl font-bold text-foreground block">
                      {collectedFrames.current.length}
                    </span>
                    screenshots collected
                  </div>
                  <Button size="lg" className="w-full" onClick={startAnalysis}>
                    <Brain className="mr-2 h-4 w-4" />
                    Analyze with AI
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
