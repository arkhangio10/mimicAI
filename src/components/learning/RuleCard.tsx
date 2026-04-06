"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { LearnedRule } from "@/types/workflow";
import { Pencil, Trash2, Check, X } from "lucide-react";

interface RuleCardProps {
  rule: LearnedRule;
  onUpdate: (updates: Partial<LearnedRule>) => void;
  onDelete: () => void;
}

export function RuleCard({ rule, onUpdate, onDelete }: RuleCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [condition, setCondition] = useState(rule.condition);
  const [action, setAction] = useState(rule.action);

  const handleSave = () => {
    onUpdate({ condition, action });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCondition(rule.condition);
    setAction(rule.action);
    setIsEditing(false);
  };

  const confidenceColor =
    rule.confidence >= 0.8
      ? "text-green-700 bg-green-50 border-green-200"
      : rule.confidence >= 0.5
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-red-700 bg-red-50 border-red-200";

  return (
    <Card>
      <CardContent className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">IF</label>
              <Input
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="text-sm h-8"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">THEN</label>
              <Input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="text-sm h-8"
              />
            </div>
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-3 w-3" />
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Check className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm">
                <span className="font-mono text-xs text-muted-foreground">IF </span>
                <span>{rule.condition}</span>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="text-sm">
              <span className="font-mono text-xs text-muted-foreground">THEN </span>
              <span>{rule.action}</span>
            </div>
            <Badge variant="outline" className={`text-[10px] ${confidenceColor}`}>
              {Math.round(rule.confidence * 100)}% confidence
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
