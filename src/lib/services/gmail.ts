import { getTokenForService } from "@/lib/auth0";
import { ServiceError } from "@/lib/errors";

export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ messageId: string }> {
  const token = await getTokenForService("gmail");

  const raw = Buffer.from(
    `To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${body}`
  ).toString("base64url");

  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw }),
    }
  );

  if (!response.ok) {
    throw new ServiceError("gmail", `Failed to send email: ${response.statusText}`);
  }

  const data = await response.json();
  return { messageId: data.id };
}

export async function readEmails(
  query: string,
  maxResults: number = 10
): Promise<{ messages: Array<{ id: string; snippet: string }> }> {
  const token = await getTokenForService("gmail");

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new ServiceError("gmail", `Failed to read emails: ${response.statusText}`);
  }

  return response.json();
}
