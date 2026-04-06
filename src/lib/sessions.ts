import type { CapturedAction } from "@/types/action";
import { deleteScreenshot } from "@/lib/screenshots";

export interface RecordingSession {
  actions: CapturedAction[];
  screenshotPaths: string[];
  listeners: Set<(action: CapturedAction) => void>;
  isLearning: boolean;
}

// In-memory store for active recording sessions
// In production this would be Redis, but for hackathon demo this works
const activeSessions = new Map<string, RecordingSession>();

export function getSession(sessionId: string): RecordingSession | undefined {
  return activeSessions.get(sessionId);
}

export function createSession(sessionId: string): RecordingSession {
  const session: RecordingSession = {
    actions: [],
    screenshotPaths: [],
    listeners: new Set(),
    isLearning: false,
  };
  activeSessions.set(sessionId, session);
  return session;
}

export function getOrCreateSession(sessionId: string): RecordingSession {
  const existing = activeSessions.get(sessionId);
  if (existing) return existing;
  return createSession(sessionId);
}

export function deleteSession(sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    if (!session.isLearning) {
      session.screenshotPaths.forEach((p) => deleteScreenshot(p));
    }
    activeSessions.delete(sessionId);
  }
}

export function notifyListeners(
  sessionId: string,
  action: CapturedAction
): void {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.listeners.forEach((listener) => listener(action));
  }
}
