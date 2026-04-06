import { getTokenForService } from "@/lib/auth0";
import { ServiceError } from "@/lib/errors";

export async function appendRows(
  spreadsheetId: string,
  range: string,
  values: unknown[][]
): Promise<{ updatedRows: number }> {
  const token = await getTokenForService("sheets");

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!response.ok) {
    throw new ServiceError("sheets", `Failed to append rows: ${response.statusText}`);
  }

  const data = await response.json();
  return { updatedRows: data.updates?.updatedRows ?? 0 };
}

export async function readRange(
  spreadsheetId: string,
  range: string
): Promise<{ values: unknown[][] }> {
  const token = await getTokenForService("sheets");

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new ServiceError("sheets", `Failed to read range: ${response.statusText}`);
  }

  const data = await response.json();
  return { values: data.values ?? [] };
}
