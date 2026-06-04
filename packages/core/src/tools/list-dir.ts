import { readdir, stat } from "node:fs/promises";
import { resolve, join } from "node:path";

export const listDirSchema = {
  name: "list_dir",
  description:
    "List contents of a directory. Use this to explore project structure before reading files.",
  parameters: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description: "Relative path to directory (default: '.')",
      },
    },
    required: [],
  },
};

export async function listDirExecute(
  args: Record<string, unknown>,
  workingDir: string,
): Promise<{ result: string; isError: boolean }> {
  const dirPath = (args.path as string) || ".";
  const absolutePath = resolve(workingDir, dirPath);

  try {
    const entries = await readdir(absolutePath);
    const lines: string[] = [];

    for (const entry of entries) {
      if (["node_modules", ".git", "dist", ".next"].includes(entry)) {
        lines.push(`${entry}/ (skipped)`);
        continue;
      }
      const info = await stat(join(absolutePath, entry));
      const size =
        info.size < 1024
          ? `${info.size}B`
          : `${(info.size / 1024).toFixed(1)}KB`;
      lines.push(info.isDirectory() ? `${entry}/` : `${entry} (${size})`);
    }

    return { result: lines.join("\n"), isError: false };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "ENOENT")
      return { result: `Directory not found: ${dirPath}`, isError: true };
    return {
      result: `Error listing directory: ${err.message}`,
      isError: true,
    };
  }
}
