import { writeFile, unlink, readFile, readdir, stat, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { existsSync } from "fs";

const TEMP_DIR = join(process.cwd(), "tmp", "screenshots");

async function ensureTempDir() {
  if (!existsSync(TEMP_DIR)) {
    await mkdir(TEMP_DIR, { recursive: true });
  }
}

export async function saveScreenshot(base64Data: string): Promise<string> {
  await ensureTempDir();
  const filename = `${randomUUID()}.jpg`;
  const filepath = join(TEMP_DIR, filename);
  await writeFile(filepath, Buffer.from(base64Data, "base64"));
  return filepath;
}

export async function getScreenshotBase64(filepath: string): Promise<string> {
  const buffer = await readFile(filepath);
  return buffer.toString("base64");
}

export async function deleteScreenshot(filepath: string): Promise<void> {
  try {
    await unlink(filepath);
  } catch {
    // already deleted, ignore
  }
}

/** Delete all temp screenshots older than maxAgeMs (default 1 hour) */
export async function cleanupOldScreenshots(
  maxAgeMs: number = 60 * 60 * 1000
): Promise<number> {
  await ensureTempDir();
  const files = await readdir(TEMP_DIR);
  const cutoff = Date.now() - maxAgeMs;
  let deleted = 0;

  for (const file of files) {
    const filepath = join(TEMP_DIR, file);
    try {
      const stats = await stat(filepath);
      if (stats.mtimeMs < cutoff) {
        await unlink(filepath);
        deleted++;
      }
    } catch {
      // file may have been deleted concurrently
    }
  }

  return deleted;
}

/** Delete all screenshots for a specific recording session (by file paths) */
export async function deleteScreenshots(filepaths: string[]): Promise<void> {
  await Promise.all(filepaths.map(deleteScreenshot));
}
