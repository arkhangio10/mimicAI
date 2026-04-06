import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

const TEMP_DIR = join(process.cwd(), "tmp", "screenshots");

/**
 * GET /api/screenshots/[filename]
 * Serves screenshot images from the temp directory.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Prevent directory traversal
  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filepath = join(TEMP_DIR, filename);

  if (!existsSync(filepath)) {
    return NextResponse.json({ error: "Screenshot not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(filepath);
    const ext = filename.split(".").pop()?.toLowerCase();
    const contentType = ext === "png" ? "image/png" : "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to read screenshot" },
      { status: 500 }
    );
  }
}
