import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export const writeFileSchema = {
  name: "write_file",
  description:
    "Write content to a file. Creates it if it does not exist, overwrites if it does. Path is relative to the working directory.",
  parameters: {
    type: "object" as const,
    properties: {
      path: {
        type: "string",
        description: "Relative path to the file",
      },
      content: {
        type: "string",
        description: "Full content to write to the file",
      },
    },
    required: ["path", "content"],
  },
};

export async function writeFileExecute(
  args: Record<string, unknown>,
  workingDir: string,
): Promise<{ result: string; isError: boolean }> {
  const filePath = args.path as string;
  const content = args.content as string;
  const absolutePath = resolve(workingDir, filePath);

  try {
    await writeFile(absolutePath, content, "utf-8");
    return {
      result: `Written ${content.length} chars to ${filePath}`,
      isError: false,
    };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "ENOENT")
      return {
        result: `Parent directory not found for: ${filePath}`,
        isError: true,
      };
    return { result: `Error writing file: ${err.message}`, isError: true };
  }
}
