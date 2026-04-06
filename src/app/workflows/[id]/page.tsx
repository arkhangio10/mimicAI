"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type {
  WorkflowStep,
  LearnedRule,
  EdgeCase,
  WorkflowVariable,
} from "@/types/workflow";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { StepEditor } from "@/components/workflows/StepEditor";
import { WorkflowRunner } from "@/components/workflows/WorkflowRunner";
import {
  ArrowLeft,
  Monitor,
  Clock,
  Trash2,
  Globe,
  Loader2,
} from "lucide-react";

interface WorkflowDetail {
  id: string;
  name: string;
  description: string;
  services: string[];
  steps: WorkflowStep[];
  rules: LearnedRule[];
  edgeCases: EdgeCase[];
  variables: WorkflowVariable[];
  triggerType: string;
  triggerConfig: Record<string, unknown> | null;
  requiresScreenCapture: boolean;
  sourceApp: string | null;
  isPublished: boolean;
  price: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  recordings: Array<{
    id: string;
    status: string;
    createdAt: string;
  }>;
  _count: { installations: number };
}

const SERVICE_COLORS: Record<string, string> = {
  gmail: "bg-red-100 text-red-700",
  sheets: "bg-green-100 text-green-700",
  slack: "bg-purple-100 text-purple-700",
};

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [workflow, setWorkflow] = useState<WorkflowDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchWorkflow() {
      try {
        const res = await fetch(`/api/workflows/${id}`);
        if (!res.ok) {
          if (res.status === 404) throw new Error("Workflow not found");
          throw new Error("Failed to fetch workflow");
        }
        const data = await res.json();
        setWorkflow(data.workflow);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) fetchWorkflow();
  }, [id]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Delete this workflow? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      if (res.ok) router.push("/workflows");
    } catch {
      setIsDeleting(false);
    }
  }, [id, router]);

  const handlePublishToggle = useCallback(async () => {
    if (!workflow) return;
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !workflow.isPublished }),
      });
      if (res.ok) {
        const data = await res.json();
        setWorkflow((prev) =>
          prev ? { ...prev, isPublished: data.workflow.isPublished } : null
        );
      }
    } catch {
      // Publish toggle failure — non-critical
    }
  }, [id, workflow]);

  // Loading
  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
      </div>
    );
  }

  // Error / Not found
  if (error || !workflow) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-destructive mb-4">
            {error ?? "Workflow not found"}
          </p>
          <Link href="/workflows">
            <Button variant="outline">
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Back to Workflows
            </Button>
          </Link>
        </CardContent>
      </Card>
      </div>
    );
  }

  const steps = (Array.isArray(workflow.steps) ? workflow.steps : []) as WorkflowStep[];
  const rules = (Array.isArray(workflow.rules) ? workflow.rules : []) as LearnedRule[];
  const edgeCases = (Array.isArray(workflow.edgeCases) ? workflow.edgeCases : []) as EdgeCase[];
  const variables = (Array.isArray(workflow.variables) ? workflow.variables : []) as WorkflowVariable[];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/workflows">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">
              {workflow.name}
            </h1>
            {workflow.isPublished && (
              <Badge className="bg-green-100 text-green-700">Published</Badge>
            )}
          </div>
          {workflow.description && (
            <p className="text-muted-foreground ml-10">
              {workflow.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePublishToggle}
          >
            <Globe className="mr-1.5 h-3.5 w-3.5" />
            {workflow.isPublished ? "Unpublish" : "Publish"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap items-center gap-2 ml-10">
        {workflow.services.map((s) => (
          <Badge
            key={s}
            variant="outline"
            className={SERVICE_COLORS[s] ?? ""}
          >
            {s}
          </Badge>
        ))}
        {workflow.requiresScreenCapture && (
          <Badge variant="outline" className="bg-blue-100 text-blue-700">
            <Monitor className="mr-1 h-3 w-3" />
            Screen Capture
          </Badge>
        )}
        {workflow.sourceApp && (
          <Badge variant="outline">{workflow.sourceApp}</Badge>
        )}
        <Badge variant="outline">
          <Clock className="mr-1 h-3 w-3" />
          {new Date(workflow.updatedAt).toLocaleDateString()}
        </Badge>
        <Badge variant="outline" className="capitalize">
          {workflow.triggerType}
        </Badge>
      </div>

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Workflow details */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="steps">
            <TabsList>
              <TabsTrigger value="steps">
                Steps ({steps.length})
              </TabsTrigger>
              <TabsTrigger value="variables">
                Variables ({variables.length})
              </TabsTrigger>
              <TabsTrigger value="recordings">
                Recordings ({workflow.recordings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="mt-4">
              <StepEditor
                steps={steps}
                rules={rules}
                edgeCases={edgeCases}
              />
            </TabsContent>

            <TabsContent value="variables" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Variables
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Values that can change between runs.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {variables.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No variables detected for this workflow.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {variables.map((v) => (
                        <div
                          key={v.name}
                          className="rounded-md border p-3 space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium font-mono">
                              {v.name}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {v.type}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {v.source}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {v.description}
                          </p>
                          {v.default != null && (
                            <p className="text-xs">
                              Default:{" "}
                              <code className="bg-muted px-1 rounded">
                                {String(v.default)}
                              </code>
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recordings" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Recordings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {workflow.recordings.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No recordings linked to this workflow.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {workflow.recordings.map((rec) => (
                        <div
                          key={rec.id}
                          className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                        >
                          <span className="font-mono text-xs truncate">
                            {rec.id}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {rec.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(rec.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: Run panel */}
        <div>
          <WorkflowRunner
            workflowId={workflow.id}
            variables={variables}
            stepCount={steps.length}
          />
        </div>
      </div>
    </div>
    </div>
  );
}
