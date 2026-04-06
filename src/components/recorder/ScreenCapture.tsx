"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RecordingStatus } from "@/hooks/useScreenCapture";
import {
  Monitor,
  Circle,
  Square,
  Pause,
  Play,
  Camera,
} from "lucide-react";

interface ScreenCaptureProps {
  status: RecordingStatus;
  frameCount: number;
  elapsed: number;
  error: string | null;
  videoRef: React.Ref<HTMLVideoElement>;
  canvasRef: React.Ref<HTMLCanvasElement>;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function ScreenCapture({
  status,
  frameCount,
  elapsed,
  error,
  videoRef,
  canvasRef,
  onStart,
  onStop,
  onPause,
  onResume,
}: ScreenCaptureProps) {
  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isActive = isRecording || isPaused;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Screen Capture
            </CardTitle>
            <CardDescription>
              {status === "idle"
                ? "Click Start to share your screen. Screenshots are collected automatically."
                : status === "recording"
                  ? "Recording — screenshots are being collected. AI will analyze after you stop."
                  : status === "paused"
                    ? "Recording paused. Resume to continue capturing."
                    : "Recording complete. Click 'Analyze with AI' to process."}
            </CardDescription>
          </div>

          {isActive && (
            <div className="flex items-center gap-3">
              <Badge
                variant={isRecording ? "destructive" : "secondary"}
                className="flex items-center gap-1.5"
              >
                {isRecording && (
                  <Circle className="h-2 w-2 animate-pulse fill-current" />
                )}
                {isRecording ? "REC" : "PAUSED"}
              </Badge>
              <span className="font-mono text-sm text-muted-foreground">
                {formatElapsed(elapsed)}
              </span>
              <Badge variant="outline" className="flex items-center gap-1">
                <Camera className="h-3 w-3" />
                {frameCount}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-4">
        {/* Screen Preview */}
        <div className="relative w-full overflow-hidden rounded-lg border bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full ${isActive ? "block" : "hidden"}`}
            style={{ maxHeight: "400px", objectFit: "contain" }}
          />
          {!isActive && (
            <div className="flex h-64 w-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Monitor className="mx-auto mb-2 h-12 w-12 opacity-30" />
                <p className="text-sm">
                  {status === "stopped"
                    ? "Recording ended"
                    : "Screen preview will appear here"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for frame extraction */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Error display */}
        {error && (
          <div className="w-full rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center gap-3">
          {status === "idle" && (
            <Button size="lg" onClick={onStart}>
              <Circle className="mr-2 h-4 w-4 fill-red-500 text-red-500" />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <>
              <Button variant="outline" size="lg" onClick={onPause}>
                <Pause className="mr-2 h-4 w-4" />
                Pause
              </Button>
              <Button variant="destructive" size="lg" onClick={onStop}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </>
          )}

          {isPaused && (
            <>
              <Button size="lg" onClick={onResume}>
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
              <Button variant="destructive" size="lg" onClick={onStop}>
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
            </>
          )}

          {status === "stopped" && (
            <Button size="lg" onClick={onStart}>
              <Circle className="mr-2 h-4 w-4 fill-red-500 text-red-500" />
              Record Again
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
