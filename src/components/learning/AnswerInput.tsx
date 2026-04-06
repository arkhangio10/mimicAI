"use client";

import { useState, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, SkipForward, Loader2 } from "lucide-react";

interface AnswerInputProps {
  onSubmit: (answer: string) => void;
  onSkip: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export function AnswerInput({
  onSubmit,
  onSkip,
  isLoading,
  placeholder = "Type your answer...",
}: AnswerInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    onSubmit(trimmed);
    setValue("");
  }, [value, isLoading, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  return (
    <div className="space-y-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        className="min-h-[60px] resize-none"
        rows={2}
      />
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          disabled={isLoading}
          className="text-muted-foreground"
        >
          <SkipForward className="mr-1 h-3 w-3" />
          Skip
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!value.trim() || isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <Send className="mr-1 h-3 w-3" />
          )}
          {isLoading ? "Thinking..." : "Answer"}
        </Button>
      </div>
    </div>
  );
}
