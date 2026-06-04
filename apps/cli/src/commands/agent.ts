import { Command } from "commander";
import chalk from "chalk";
import { runAgentLoop } from "@terminus/core";
import {
  getActiveProvider,
  getApiKey,
  getActiveModel,
} from "../utils/config.js";

const DEFAULT_MODEL: Record<string, string> = {
  anthropic: "claude-sonnet-4-5",
  gemini: "gemini-2.0-flash",
};

export const agentCommand = new Command("agent")
  .description("Run the Terminus coding agent on a task")
  .requiredOption("-p, --prompt <text>", "Task for the agent")
  .option("--cwd <path>", "Working directory (default: current directory)")
  .option("--max-iterations <n>", "Maximum agent turns", "50")
  .action(
    async (opts: { prompt: string; cwd?: string; maxIterations: string }) => {
      const provider = getActiveProvider();
      if (!provider) {
        console.error(
          chalk.red("✗ No active provider.") +
            chalk.dim(
              "\n  Run: terminus providers login --provider anthropic --api-key sk-...",
            ),
        );
        process.exit(1);
      }

      const apiKey = getApiKey(provider);
      if (!apiKey) {
        console.error(
          chalk.red(`✗ No API key for ${provider}.`) +
            chalk.dim(
              `\n  Run: terminus providers login --provider ${provider} --api-key <key>`,
            ),
        );
        process.exit(1);
      }

      const modelId =
        getActiveModel() ?? DEFAULT_MODEL[provider] ?? "claude-sonnet-4-5";
      const workingDir = opts.cwd ?? process.cwd();
      const maxIterations = parseInt(opts.maxIterations, 10);

      console.log(
        chalk.dim(
          `provider: ${provider}  model: ${modelId}  cwd: ${workingDir}`,
        ),
      );
      console.log();

      try {
        for await (const event of runAgentLoop(opts.prompt, {
          provider,
          apiKey,
          modelId,
          workingDir,
          maxIterations,
        })) {
          switch (event.type) {
            case "agent_start":
              console.log(chalk.cyan("◆ agent started"));
              break;

            case "turn_start":
              console.log(chalk.dim(`── turn ${event.turn} ──`));
              break;

            case "text_delta":
              process.stdout.write(event.delta);
              break;

            case "tool_start":
              process.stdout.write("\n");
              console.log(
                chalk.yellow(`⚡ ${event.name}`) +
                  "  " +
                  chalk.dim(JSON.stringify(event.args)),
              );
              break;

            case "tool_end":
              if (event.isError) {
                console.log(
                  chalk.red(`✗ ${event.name}`) +
                    chalk.dim(": " + event.result.slice(0, 160)),
                );
              } else {
                console.log(
                  chalk.green(`✓ ${event.name}`) +
                    chalk.dim(": " + event.result.slice(0, 160)),
                );
              }
              break;

            case "turn_end":
              console.log(
                chalk.dim(`   ${(event.durationMs / 1000).toFixed(1)}s`),
              );
              break;

            case "agent_end":
              console.log();
              console.log(chalk.green("✓ done"));
              break;

            case "error":
              console.error(chalk.red(`✗ ${event.message}`));
              process.exit(1);
          }
        }
      } catch (err: unknown) {
        console.error(
          chalk.red(
            `✗ ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
        process.exit(1);
      }
    },
  );
