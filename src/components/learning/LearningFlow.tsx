"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLearning } from "@/hooks/useLearning";
import { LearningProgress } from "./LearningProgress";
import { ActionReview } from "./ActionReview";
import { ConversationPanel } from "./ConversationPanel";
import { UnderstandingPanel } from "./UnderstandingPanel";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowLeft,
  Save,
  ExternalLink,
} from "lucide-react";

interface LearningFlowProps {
  sessionId: string;
  provider: string;
  apiKey: string;
  actions?: import("@/types/action").CapturedAction[];
  onBack: () => void;
}

export function LearningFlow({
  sessionId,
  provider,
  apiKey,
  actions: preloadedActions,
  onBack,
}: LearningFlowProps) {
  const router = useRouter();
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDesc, setWorkflowDesc] = useState("");

  const {
    phase,
    currentAction,
    currentActionIndex,
    totalActions,
    currentQuestion,
    conversation,
    rules,
    edgeCases,
    variables,
    learnedSteps,
    questionsAnswered,
    screenshotFilename,
    isLoading,
    error,
    workflowId,
    startLearning,
    submitAnswer,
    skipQuestion,
    synthesize,
    updateRule,
    deleteRule,
    updateEdgeCase,
    deleteEdgeCase,
    updateVariable,
    deleteVariable,
    finalize,
  } = useLearning({ sessionId, provider, apiKey, actions: preloadedActions });

  // Start learning on mount
  useEffect(() => {
    if (phase === "idle") {
      startLearning();
    }
  }, [phase, startLearning]);

  // Auto-trigger synthesis when questioning completes
  useEffect(() => {
    if (phase === "synthesizing" && !isLoading && rules.length === 0) {
      synthesize();
    }
  }, [phase, isLoading, rules.length, synthesize]);

  // Loading state
  if (phase === "idle" && isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">
            Preparing the learning session...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error && phase === "idle") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-destructive mb-4" />
          <p className="text-sm text-destructive font-medium mb-2">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to Recording
            </Button>
            <Button onClick={startLearning}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Complete state
  if (phase === "complete") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-green-600 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Learning Complete!</h2>
          <p className="text-sm text-muted-foreground mb-1">
            MimicAI has learned your workflow
            {workflowId ? " and saved it." : "."}
          </p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-6">
            <span>{learnedSteps.length} steps</span>
            <span>{rules.length} rules</span>
            <span>{edgeCases.length} edge cases</span>
            <span>{variables.length} variables</span>
          </div>
          <div className="flex gap-2">
            {workflowId ? (
              <Button onClick={() => router.push(`/workflows/${workflowId}`)}>
                <ExternalLink className="mr-1 h-3 w-3" />
                View Workflow
              </Button>
            ) : (
              <Button onClick={onBack}>
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back to Dashboard
              </Button>
            )}
            <Button variant="outline" onClick={() => router.push("/workflows")}>
              All Workflows
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Learning Mode
          </h1>
          <p className="text-sm text-muted-foreground">
            {phase === "questioning"
              ? "Answer questions about each step so MimicAI understands your reasoning."
              : phase === "synthesizing"
                ? "Analyzing your answers to extract rules and patterns..."
                : "Review what MimicAI learned. Edit anything that looks wrong."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-1 h-3 w-3" />
          Back
        </Button>
      </div>

      {/* Progress */}
      <LearningProgress
        phase={phase === "idle" ? "questioning" : phase}
        currentActionIndex={currentActionIndex}
        totalActions={totalActions}
        questionsAnswered={questionsAnswered}
      />

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Synthesizing state */}
      {phase === "synthesizing" && isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm font-medium mb-1">
              Synthesizing your workflow...
            </p>
            <p className="text-xs text-muted-foreground">
              Extracting rules, edge cases, and variables from{" "}
              {questionsAnswered} answers
            </p>
          </CardContent>
        </Card>
      )}

      {/* Questioning phase */}
      {phase === "questioning" && currentAction && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Left: Action context */}
          <ActionReview
            action={currentAction}
            actionIndex={currentActionIndex}
            totalActions={totalActions}
            screenshotFilename={screenshotFilename}
          />

          {/* Right: Q&A conversation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="h-4 w-4" />
                MimicAI is asking...
                {currentQuestion && (
                  <Badge variant="outline" className="text-[10px]">
                    {pendingQuestionsLabel()} remaining
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs">
                Help MimicAI understand why you did this step.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ConversationPanel
                conversation={conversation}
                currentQuestion={currentQuestion}
                onAnswer={submitAnswer}
                onSkip={skipQuestion}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reviewing phase */}
      {phase === "reviewing" && (
        <>
          <UnderstandingPanel
            rules={rules}
            edgeCases={edgeCases}
            variables={variables}
            learnedSteps={learnedSteps}
            onUpdateRule={updateRule}
            onDeleteRule={deleteRule}
            onUpdateEdgeCase={updateEdgeCase}
            onDeleteEdgeCase={deleteEdgeCase}
            onUpdateVariable={updateVariable}
            onDeleteVariable={deleteVariable}
            onFinalize={() => finalize(workflowName || undefined, workflowDesc || undefined)}
            isLoading={isLoading}
          />

          {/* Workflow naming before finalize */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Workflow
              </CardTitle>
              <CardDescription className="text-xs">
                Name your workflow before saving. You can change this later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Workflow Name</label>
                <Input
                  placeholder="e.g., Spectrophotometer Data Entry"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">
                  Description{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  placeholder="What does this workflow do?"
                  value={workflowDesc}
                  onChange={(e) => setWorkflowDesc(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// The count is informational — we don't know exact total since follow-ups are dynamic
function pendingQuestionsLabel(): string {
  return "?";
}
