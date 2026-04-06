"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type RecordingStatus = "idle" | "recording" | "paused" | "stopped";

interface ScreenCaptureState {
  status: RecordingStatus;
  stream: MediaStream | null;
  error: string | null;
  frameCount: number;
  startedAt: number | null;
  elapsed: number;
}

interface UseScreenCaptureOptions {
  /** Interval between screenshots in ms (default: 2000) */
  intervalMs?: number;
  /** Callback when a new frame is captured */
  onFrame?: (base64: string, frameIndex: number) => void;
}

export function useScreenCapture(options: UseScreenCaptureOptions = {}) {
  const { intervalMs = 2000, onFrame } = options;

  const [state, setState] = useState<ScreenCaptureState>({
    status: "idle",
    stream: null,
    error: null,
    frameCount: 0,
    startedAt: null,
    elapsed: 0,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameCountRef = useRef(0);
  const onFrameRef = useRef(onFrame);

  // Keep onFrame ref updated without re-triggering effects
  useEffect(() => {
    onFrameRef.current = onFrame;
  }, [onFrame]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    // Use JPEG at 80% quality to reduce payload size
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const base64 = dataUrl.split(",")[1];

    frameCountRef.current += 1;
    const frameIndex = frameCountRef.current;

    setState((prev) => ({ ...prev, frameCount: frameIndex }));
    onFrameRef.current?.(base64, frameIndex);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, error: null }));

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 5 } },
        audio: false,
      });

      // Handle user stopping share via browser UI
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        setState((prev) => ({
          ...prev,
          status: "stopped",
          stream: null,
        }));
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
      });

      // Attach stream to video element for preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const now = Date.now();
      frameCountRef.current = 0;

      setState({
        status: "recording",
        stream,
        error: null,
        frameCount: 0,
        startedAt: now,
        elapsed: 0,
      });

      // Start periodic screenshot capture
      intervalRef.current = setInterval(captureFrame, intervalMs);

      // Start elapsed time counter
      timerRef.current = setInterval(() => {
        setState((prev) => ({
          ...prev,
          elapsed: prev.startedAt ? Date.now() - prev.startedAt : 0,
        }));
      }, 1000);

      // Capture first frame immediately after a short delay for video to load
      setTimeout(captureFrame, 500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to start screen capture";
      setState((prev) => ({ ...prev, error: message, status: "idle" }));
    }
  }, [captureFrame, intervalMs]);

  const stopRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (state.stream) {
      state.stream.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState((prev) => ({
      ...prev,
      status: "stopped",
      stream: null,
    }));
  }, [state.stream]);

  const pauseRecording = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((prev) => ({ ...prev, status: "paused" }));
  }, []);

  const resumeRecording = useCallback(() => {
    if (state.status !== "paused") return;
    intervalRef.current = setInterval(captureFrame, intervalMs);
    setState((prev) => ({ ...prev, status: "recording" }));
  }, [state.status, captureFrame, intervalMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    status: state.status,
    error: state.error,
    frameCount: state.frameCount,
    elapsed: state.elapsed,
    videoRef,
    canvasRef,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}
