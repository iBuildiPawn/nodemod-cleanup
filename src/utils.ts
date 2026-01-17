import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

/**
 * Calculate the total size of a directory recursively
 * Uses parallel traversal for better performance
 */
export async function getDirSize(dir: string): Promise<number> {
  let totalSize = 0;

  async function walk(currentDir: string): Promise<number> {
    let size = 0;
    let entries: Awaited<ReturnType<typeof readdir>>;

    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      return 0;
    }

    const promises: Promise<number>[] = [];

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);

      if (entry.isDirectory()) {
        promises.push(walk(fullPath));
      } else if (entry.isFile()) {
        promises.push(
          stat(fullPath)
            .then((stats) => stats.size)
            .catch(() => 0)
        );
      }
    }

    const sizes = await Promise.all(promises);
    return sizes.reduce((sum, s) => sum + s, 0);
  }

  totalSize = await walk(dir);
  return totalSize;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

// ANSI color helpers (Bun-native, no dependencies)
export const colors = {
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

// Simple spinner for Bun
export class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private frameIndex = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private _text: string;

  constructor(text: string) {
    this._text = text;
  }

  get text(): string {
    return this._text;
  }

  set text(value: string) {
    this._text = value;
  }

  start(): this {
    process.stdout.write("\x1b[?25l"); // Hide cursor
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r${colors.cyan(frame)} ${this._text}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
    return this;
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write("\r\x1b[K"); // Clear line
    process.stdout.write("\x1b[?25h"); // Show cursor
  }

  succeed(text: string): void {
    this.stop();
    console.log(`${colors.green("✔")} ${text}`);
  }

  fail(text: string): void {
    this.stop();
    console.log(`${colors.red("✖")} ${text}`);
  }

  warn(text: string): void {
    this.stop();
    console.log(`${colors.yellow("⚠")} ${text}`);
  }
}
