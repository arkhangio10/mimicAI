"use client";

import { Badge } from "@/components/ui/badge";
import { Bot, User } from "lucide-react";

const CATEGORY_STYLES = {
  identity: "bg-blue-100 text-blue-800 border-blue-200",
  reason: "bg-purple-100 text-purple-800 border-purple-200",
  rule: "bg-amber-100 text-amber-800 border-amber-200",
  edge_case: "bg-red-100 text-red-800 border-red-200",
} as const;

const CATEGORY_LABELS = {
  identity: "What is this?",
  reason: "Why?",
  rule: "Always?",
  edge_case: "What if?",
} as const;

interface QuestionBubbleProps {
  type: "question" | "answer";
  text: string;
  category?: "identity" | "reason" | "rule" | "edge_case";
}

export function QuestionBubble({ type, text, category }: QuestionBubbleProps) {
  if (type === "question") {
    return (
      <div className="flex gap-3 items-start">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </div>
        <div className="space-y-1.5 max-w-[85%]">
          {category && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${CATEGORY_STYLES[category]}`}
            >
              {CATEGORY_LABELS[category]}
            </Badge>
          )}
          <div className="rounded-lg rounded-tl-none bg-muted px-3 py-2 text-sm">
            {text}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 items-start justify-end">
      <div className="max-w-[85%]">
        <div className="rounded-lg rounded-tr-none bg-primary px-3 py-2 text-sm text-primary-foreground">
          {text}
        </div>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <User className="h-4 w-4" />
      </div>
    </div>
  );
}
