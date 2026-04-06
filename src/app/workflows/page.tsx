"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowCard } from "@/components/workflows/WorkflowCard";
import { Plus } from "lucide-react";

interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  services: string[];
  steps: unknown[];
  rules: unknown[];
  variables: unknown[];
  triggerType: string;
  requiresScreenCapture: boolean;
  sourceApp: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { installations: number };
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const res = await fetch("/api/workflows");
        if (!res.ok) throw new Error("Failed to fetch workflows");
        const data = await res.json();
        setWorkflows(data.workflows ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setIsLoading(false);
      }
    }
    fetchWorkflows();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Workflows</h1>
          <p className="text-muted-foreground">
            Workflows you&apos;ve taught MimicAI by recording your screen.
          </p>
        </div>
        <Link href="/record">
          <Button>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New Workflow
          </Button>
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full mt-1" />
              </CardHeader>
              <CardContent>
                <div className="flex gap-1.5 mb-3">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-5 w-14" />
                </div>
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Workflow Grid */}
      {!isLoading && !error && workflows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <WorkflowCard key={wf.id} workflow={wf} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && workflows.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No workflows yet</CardTitle>
            <CardDescription>
              Record your first workflow to get started. MimicAI will learn your
              process and create a reusable automation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/record">
              <Button variant="outline">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Start Recording
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
    </div>
  );
}
