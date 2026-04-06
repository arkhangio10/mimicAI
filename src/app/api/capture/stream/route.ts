import { NextRequest } from "next/server";
import { getOrCreateSession } from "@/lib/sessions";

/**
 * GET /api/capture/stream?sessionId=xxx
 * Server-Sent Events stream for real-time action updates during recording.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("sessionId query parameter is required", {
      status: 400,
    });
  }

  const session = getOrCreateSession(sessionId);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send existing actions first (replay)
      for (const action of session.actions) {
        const data = `data: ${JSON.stringify(action)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      // Listen for new actions
      const listener = (action: unknown) => {
        try {
          const data = `data: ${JSON.stringify(action)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          session.listeners.delete(listener);
        }
      };

      session.listeners.add(listener);

      // Send heartbeat every 15 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
          session.listeners.delete(listener);
        }
      }, 15000);

      // Cleanup when client disconnects
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        session.listeners.delete(listener);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
