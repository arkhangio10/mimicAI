"use client";

import { useRef, useEffect } from "react";
import { QuestionBubble } from "./QuestionBubble";
import { AnswerInput } from "./AnswerInput";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { QuestionAnswer } from "@/types/action";
import type { GeneratedQuestion } from "@/lib/learning-sessions";

interface ConversationPanelProps {
  conversation: QuestionAnswer[];
  currentQuestion: GeneratedQuestion | null;
  onAnswer: (answer: string) => void;
  onSkip: () => void;
  isLoading: boolean;
}

export function ConversationPanel({
  conversation,
  currentQuestion,
  onAnswer,
  onSkip,
  isLoading,
}: ConversationPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.length, currentQuestion]);

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-2" style={{ maxHeight: "400px" }}>
        <div className="space-y-4 p-4">
          {conversation.map((qa) => (
            <div key={qa.id} className="space-y-3">
              <QuestionBubble
                type="question"
                text={qa.question}
                category={qa.category}
              />
              <QuestionBubble type="answer" text={qa.answer} />
            </div>
          ))}

          {currentQuestion && (
            <QuestionBubble
              type="question"
              text={currentQuestion.question}
              category={currentQuestion.category}
            />
          )}

          {isLoading && !currentQuestion && (
            <div className="flex gap-3 items-start">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="rounded-lg rounded-tl-none bg-muted px-4 py-3 text-sm text-muted-foreground">
                Thinking of what to ask next...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {currentQuestion && (
        <div className="border-t p-4">
          <AnswerInput
            onSubmit={onAnswer}
            onSkip={onSkip}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
