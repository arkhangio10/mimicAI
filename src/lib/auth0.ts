import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client();

// Token Vault connection names (must match Auth0 Dashboard social connections)
export const CONNECTIONS = {
  GOOGLE: "google-oauth2",
} as const;

export type ConnectionName = (typeof CONNECTIONS)[keyof typeof CONNECTIONS];

// Scopes required per service
export const SERVICE_SCOPES: Record<string, string[]> = {
  gmail: [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
  sheets: [
    "https://www.googleapis.com/auth/spreadsheets",
  ],
};

/**
 * Get a third-party access token via Auth0 Token Vault.
 * Uses the logged-in user's session to fetch the Google/Slack token.
 */
export async function getTokenForService(
  service: "gmail" | "sheets"
): Promise<string> {
  try {
    const tokenResponse = await auth0.getAccessTokenForConnection({
      connection: CONNECTIONS.GOOGLE,
    });
    return tokenResponse.token;
  } catch (err) {
    console.error(`[Token Vault] Failed to get token for ${service}:`, err);
    throw new Error(
      `Failed to get ${service} token from Token Vault. User may need to connect their Google account.`
    );
  }
}

/**
 * Build the authorization URL for connecting a service via Token Vault.
 * Redirects the user to Auth0 → Google consent → back to the app.
 */
export function getConnectionAuthUrl(service: "gmail" | "sheets"): string {
  const scopes = SERVICE_SCOPES[service] ?? [];
  const baseUrl = process.env.AUTH0_BASE_URL || "http://localhost:3000";

  // Auth0 v4: use the /auth/login route with connection and scope params
  const params = new URLSearchParams({
    connection: CONNECTIONS.GOOGLE,
    connection_scope: scopes.join(" "),
    returnTo: `${baseUrl}/settings?connected=${service}`,
  });

  return `/auth/login?${params.toString()}`;
}
