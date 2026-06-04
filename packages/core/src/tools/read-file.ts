import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const readFileSchema = {
  name: "read_file",
  description:
    "Read the contents of a file. Path is relative to the working directory.",
  parameters: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description: "Relative path to the file",
      },
    },
    required: ["path"],
  },
};

export async function readFileExecute(
  args: Record<string, unknown>,
  workingDir: string,
): Promise<{ result: string; isError: boolean }> {
  const filePath = args.path as string;
  const absolutePath = resolve(workingDir, filePath);

  try {
    const content = await readFile(absolutePath, "utf-8");
    return { result: content, isError: false };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "ENOENT")
      return { result: `File not found: ${filePath}`, isError: true };
    return { result: `Error reading file: ${err.message}`, isError: true };
  }
}
