"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Play,
  Clock,
  GitBranch,
  Users,
} from "lucide-react";

interface WorkflowCardProps {
  workflow: {
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
  };
}

const SERVICE_COLORS: Record<string, string> = {
  gmail: "bg-red-100 text-red-700",
  sheets: "bg-green-100 text-green-700",
  slack: "bg-purple-100 text-purple-700",
};

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const steps = Array.isArray(workflow.steps) ? workflow.steps : [];
  const rules = Array.isArray(workflow.rules) ? workflow.rules : [];
  const variables = Array.isArray(workflow.variables) ? workflow.variables : [];

  return (
    <Link href={`/workflows/${workflow.id}`}>
      <Card className="transition-colors hover:border-primary/30 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">
                {workflow.name}
              </CardTitle>
              {workflow.description && (
                <CardDescription className="line-clamp-2 mt-1">
                  {workflow.description}
                </CardDescription>
              )}
            </div>
            {workflow.isPublished && (
              <Badge variant="secondary" className="ml-2 shrink-0">
                Published
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Services */}
          <div className="flex flex-wrap gap-1.5 mb-3">
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
                Screen
              </Badge>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {steps.length} steps
            </span>
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              {rules.length} rules
            </span>
            {variables.length > 0 && (
              <span>{variables.length} variables</span>
            )}
            {(workflow._count?.installations ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {workflow._count!.installations}
              </span>
            )}
          </div>

          {/* Trigger + time */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
            <span className="capitalize">{workflow.triggerType} trigger</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(workflow.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
