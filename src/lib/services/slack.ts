// Slack is not used in the demo
import { ServiceError } from "@/lib/errors";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function sendMessage(..._args: unknown[]): Promise<{ ts: string }> {
  throw new ServiceError("slack", "Slack not configured for demo");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function listChannels(..._args: unknown[]): Promise<Array<{ id: string; name: string }>> {
  throw new ServiceError("slack", "Slack not configured for demo");
}
