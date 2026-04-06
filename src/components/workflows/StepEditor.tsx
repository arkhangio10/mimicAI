"use client";

import type { WorkflowStep, LearnedRule, EdgeCase } from "@/types/workflow";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Send,
  ArrowRightLeft,
  GitBranch,
  Bell,
  ArrowRight,
} from "lucide-react";

const STEP_TYPE_CONFIG: Record<
  string,
  { icon: typeof Monitor; label: string; color: string }
> = {
  read_screen: {
    icon: Monitor,
    label: "Screen Read",
    color: "bg-blue-100 text-blue-700",
  },
  write_api: {
    icon: Send,
    label: "API Write",
    color: "bg-green-100 text-green-700",
  },
  transform: {
    icon: ArrowRightLeft,
    label: "Transform",
    color: "bg-yellow-100 text-yellow-700",
  },
  decision: {
    icon: GitBranch,
    label: "Decision",
    color: "bg-purple-100 text-purple-700",
  },
  notify: {
    icon: Bell,
    label: "Notify",
    color: "bg-orange-100 text-orange-700",
  },
};

interface StepEditorProps {
  steps: WorkflowStep[];
  rules: LearnedRule[];
  edgeCases: EdgeCase[];
}

export function StepEditor({ steps, rules, edgeCases }: StepEditorProps) {
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Step Flow */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Workflow Steps ({steps.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedSteps.map((step, idx) => {
            const config = STEP_TYPE_CONFIG[step.type] ?? STEP_TYPE_CONFIG.transform;
            const Icon = config.icon;

            return (
              <div key={step.id}>
                <div className="flex items-start gap-3">
                  {/* Step number + connector */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${config.color}`}
                    >
                      {idx + 1}
                    </div>
                    {idx < sortedSteps.length - 1 && (
                      <div className="w-px h-6 bg-border mt-1" />
                    )}
                  </div>

                  {/* Step details */}
                  <div className="flex-1 min-w-0 pb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">
                        {step.action}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {config.label}
                      </Badge>
                      {step.service && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {step.service}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {step.purpose}
                    </p>
                    {step.isConditional && step.condition && (
                      <div className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                        <GitBranch className="h-3 w-3" />
                        IF: {step.condition}
                      </div>
                    )}
                    {step.inputFrom && (
                      <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowRight className="h-3 w-3" />
                        Input from: {step.inputFrom}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {steps.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No steps defined yet.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Rules */}
      {rules.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              Rules ({rules.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-md border p-2.5 text-xs space-y-1"
              >
                <div>
                  <span className="font-medium text-amber-600">IF </span>
                  {rule.condition}
                </div>
                <div>
                  <span className="font-medium text-green-600">THEN </span>
                  {rule.action}
                </div>
                <div className="text-muted-foreground">
                  Confidence: {Math.round(rule.confidence * 100)}%
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Edge Cases */}
      {edgeCases.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Edge Cases ({edgeCases.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {edgeCases.map((ec) => (
              <div
                key={ec.id}
                className="rounded-md border p-2.5 text-xs space-y-1"
              >
                <div>
                  <span className="font-medium text-blue-600">WHEN </span>
                  {ec.scenario}
                </div>
                <div>
                  <span className="font-medium text-green-600">THEN </span>
                  {ec.response}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
