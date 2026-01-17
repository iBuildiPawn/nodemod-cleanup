import { rm } from "node:fs/promises";

interface DeleteResult {
  success: boolean;
  error?: string;
}

interface DeleteSummary {
  deleted: number;
  failed: number;
  errors: Array<{ path: string; error: string }>;
}

type ProgressCallback = (
  current: number,
  total: number,
  path: string,
  success: boolean
) => void;

/**
 * Delete a directory recursively
 */
export async function deleteDirectory(dirPath: string): Promise<DeleteResult> {
  try {
    await rm(dirPath, { recursive: true, force: true });
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Delete multiple directories
 */
export async function deleteDirectories(
  paths: string[],
  onProgress?: ProgressCallback
): Promise<DeleteSummary> {
  let deleted = 0;
  let failed = 0;
  const errors: Array<{ path: string; error: string }> = [];

  for (let i = 0; i < paths.length; i++) {
    const dirPath = paths[i];
    const result = await deleteDirectory(dirPath);

    if (result.success) {
      deleted++;
    } else {
      failed++;
      errors.push({ path: dirPath, error: result.error! });
    }

    if (onProgress) {
      onProgress(i + 1, paths.length, dirPath, result.success);
    }
  }

  return { deleted, failed, errors };
}
