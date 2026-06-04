import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export const bashSchema = {
  name: "bash",
  description:
    "Execute a bash command and return the output. Use for running tests, installing packages, compiling, git operations. Commands timeout after 30 seconds.",
  parameters: {
    type: "object" as const,
    properties: {
      command: {
        type: "string",
        description: "The bash command to execute",
      },
    },
    required: ["command"],
  },
};

export async function bashExecute(
  args: Record<string, unknown>,
  workingDir: string,
): Promise<{ result: string; isError: boolean }> {
  const command = args.command as string;

  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: workingDir,
      timeout: 30000,
    });
    const output = [stdout, stderr].filter(Boolean).join("\n").trim();
    return { result: output || "(no output)", isError: false };
  } catch (error: unknown) {
    const err = error as {
      stdout?: string;
      stderr?: string;
      message?: string;
      killed?: boolean;
    };
    if (err.killed)
      return { result: "Command timed out after 30s", isError: true };
    const output = [err.stdout, err.stderr, err.message]
      .filter(Boolean)
      .join("\n")
      .trim();
    return { result: output || "Unknown error", isError: true };
  }
}
