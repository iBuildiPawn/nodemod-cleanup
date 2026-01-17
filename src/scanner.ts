import { readdir } from "node:fs/promises";
import { join } from "node:path";

/**
 * Recursively scan a directory for node_modules folders
 * Uses Bun's optimized file system operations
 */
export async function scanForNodeModules(dir: string): Promise<string[]> {
  const nodeModulesPaths: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    let entries: Awaited<ReturnType<typeof readdir>>;
    try {
      entries = await readdir(currentDir, { withFileTypes: true });
    } catch {
      // Skip directories we can't access
      return;
    }

    const promises: Promise<void>[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const fullPath = join(currentDir, entry.name);

      if (entry.name === "node_modules") {
        // Found a node_modules directory
        nodeModulesPaths.push(fullPath);
        // Don't recurse into node_modules to avoid nested duplicates
      } else if (!entry.name.startsWith(".")) {
        // Recurse into subdirectories in parallel for better performance
        promises.push(walk(fullPath));
      }
    }

    await Promise.all(promises);
  }

  await walk(dir);
  return nodeModulesPaths;
}
