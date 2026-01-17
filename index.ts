#!/usr/bin/env bun

import { resolve, basename, dirname } from "node:path";
import { checkbox, confirm } from "@inquirer/prompts";

import { scanForNodeModules } from "./src/scanner";
import { getDirSize, formatBytes, colors, Spinner } from "./src/utils";
import { deleteDirectories } from "./src/cleaner";

const SELECT_ALL_VALUE = "__SELECT_ALL__";

interface DirectoryInfo {
  path: string;
  size: number;
}

async function main(): Promise<void> {
  // Get target directory from command line args or use current directory
  const targetDir = resolve(Bun.argv[2] || ".");

  console.log(colors.cyan(`\nScanning: ${targetDir}\n`));

  // Scan for node_modules
  const scanSpinner = new Spinner("Scanning for node_modules...").start();

  let nodeModulesPaths: string[];
  try {
    nodeModulesPaths = await scanForNodeModules(targetDir);
  } catch (err) {
    scanSpinner.fail("Failed to scan directory");
    console.error(colors.red((err as Error).message));
    process.exit(1);
  }

  if (nodeModulesPaths.length === 0) {
    scanSpinner.succeed("Scan complete");
    console.log(colors.yellow("\nNo node_modules directories found.\n"));
    process.exit(0);
  }

  scanSpinner.text = `Found ${nodeModulesPaths.length} directories, calculating sizes...`;

  // Calculate sizes for each directory in parallel
  const directoriesWithSizes: DirectoryInfo[] = await Promise.all(
    nodeModulesPaths.map(async (dirPath) => ({
      path: dirPath,
      size: await getDirSize(dirPath),
    }))
  );

  // Sort by size (largest first)
  directoriesWithSizes.sort((a, b) => b.size - a.size);

  const totalSize = directoriesWithSizes.reduce((sum, d) => sum + d.size, 0);

  scanSpinner.succeed(
    `Found ${nodeModulesPaths.length} node_modules directories (${formatBytes(totalSize)} total)\n`
  );

  // Build choices for checkbox
  const choices = [
    {
      name: colors.bold(`Select All (${formatBytes(totalSize)} total)`),
      value: SELECT_ALL_VALUE,
    },
    ...directoriesWithSizes.map((d) => ({
      name: `${d.path} ${colors.gray(`(${formatBytes(d.size)})`)}`,
      value: d.path,
    })),
  ];

  // Interactive selection
  const selectedDirs = await checkbox({
    message: "Select directories to delete:",
    choices,
    pageSize: 15,
    loop: false,
  });

  // Handle "Select All" option
  let dirsToDelete: string[];
  if (selectedDirs.includes(SELECT_ALL_VALUE)) {
    dirsToDelete = directoriesWithSizes.map((d) => d.path);
  } else {
    dirsToDelete = selectedDirs.filter((v) => v !== SELECT_ALL_VALUE);
  }

  if (dirsToDelete.length === 0) {
    console.log(colors.yellow("\nNo directories selected. Exiting.\n"));
    process.exit(0);
  }

  // Calculate selected size
  const selectedSize = directoriesWithSizes
    .filter((d) => dirsToDelete.includes(d.path))
    .reduce((sum, d) => sum + d.size, 0);

  // Confirm deletion
  const confirmDelete = await confirm({
    message: `Are you sure you want to delete ${dirsToDelete.length} director${dirsToDelete.length === 1 ? "y" : "ies"} (${formatBytes(selectedSize)})?`,
    default: false,
  });

  if (!confirmDelete) {
    console.log(colors.yellow("\nDeletion cancelled.\n"));
    process.exit(0);
  }

  // Delete directories
  const deleteSpinner = new Spinner("Deleting directories...").start();

  const result = await deleteDirectories(
    dirsToDelete,
    (current, total, dirPath) => {
      deleteSpinner.text = `Deleting ${current}/${total}: ${basename(dirname(dirPath))}`;
    }
  );

  if (result.failed === 0) {
    deleteSpinner.succeed(
      colors.green(
        `Deleted ${result.deleted} director${result.deleted === 1 ? "y" : "ies"}, freed ${formatBytes(selectedSize)}`
      )
    );
  } else {
    deleteSpinner.warn(
      colors.yellow(
        `Deleted ${result.deleted} director${result.deleted === 1 ? "y" : "ies"}, ${result.failed} failed`
      )
    );
    console.log(colors.red("\nFailed to delete:"));
    for (const error of result.errors) {
      console.log(colors.red(`  ${error.path}: ${error.error}`));
    }
  }

  console.log("");
}

main().catch((err) => {
  console.error(colors.red("\nAn error occurred:"), (err as Error).message);
  process.exit(1);
});
