"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { LearningPhase } from "@/lib/learning-sessions";
import { Brain, MessageSquare, CheckCircle, Loader2 } from "lucide-react";

const PHASE_CONFIG: Record<
  LearningPhase,
  { label: string; icon: React.ReactNode }
> = {
  questioning: {
    label: "Asking Questions",
    icon: <MessageSquare className="h-3 w-3" />,
  },
  synthesizing: {
    label: "Synthesizing Rules",
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  reviewing: {
    label: "Review Results",
    icon: <Brain className="h-3 w-3" />,
  },
  complete: {
    label: "Complete",
    icon: <CheckCircle className="h-3 w-3" />,
  },
};

interface LearningProgressProps {
  phase: LearningPhase;
  currentActionIndex: number;
  totalActions: number;
  questionsAnswered: number;
}

export function LearningProgress({
  phase,
  currentActionIndex,
  totalActions,
  questionsAnswered,
}: LearningProgressProps) {
  const phaseInfo = PHASE_CONFIG[phase];
  const progress =
    phase === "reviewing" || phase === "complete"
      ? 100
      : totalActions > 0
        ? Math.round((currentActionIndex / totalActions) * 100)
        : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            {phaseInfo.icon}
            {phaseInfo.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          {phase === "questioning" && (
            <span>
              Action {Math.min(currentActionIndex + 1, totalActions)} of{" "}
              {totalActions}
            </span>
          )}
          <span>{questionsAnswered} questions answered</span>
        </div>
      </div>
      <Progress value={progress} />
    </div>
  );
}
