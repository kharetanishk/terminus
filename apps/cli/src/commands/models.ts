import { Command } from "commander";
import chalk from "chalk";
import {
  getActiveProvider,
  getActiveModel,
  setActiveModel,
} from "../utils/config.js";

const KNOWN_MODELS: Record<string, string[]> = {
  anthropic: [
    "claude-opus-4-6",
    "claude-sonnet-4-5-20250929",
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
  ],
  gemini: [
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-pro",
  ],
};

export const modelsCommand = new Command("models")
  .description("List or set the model for the active provider")
  .option("--set <model>", "Set the active model for the current provider")
  .action((opts: { set?: string }) => {
    const provider = getActiveProvider();

    if (!provider) {
      console.error(
        chalk.red("✗ No active provider.") +
          chalk.dim(" Run: terminus providers set <provider>"),
      );
      process.exit(1);
    }

    if (opts.set) {
      setActiveModel(provider, opts.set);
      console.log(
        chalk.green(`✓ Model set to ${chalk.bold(opts.set)}`) +
          chalk.dim(` for ${provider}`),
      );
      return;
    }

    const models = KNOWN_MODELS[provider] ?? [];
    const active = getActiveModel();

    console.log();
    console.log(chalk.dim(`Models for ${chalk.bold(provider)}:`));
    console.log();

    if (models.length === 0) {
      console.log(
        chalk.dim("  No known models. Use --set <model> to configure."),
      );
    } else {
      for (const m of models) {
        const isActive = m === active;
        const marker = isActive ? chalk.cyan("◆") : " ";
        const label = isActive ? chalk.bold(m) : m;
        console.log(`  ${marker} ${label}`);
      }
    }

    console.log();
    console.log(
      chalk.dim(`Active: `) + (active ? chalk.cyan(active) : chalk.red("none")),
    );
    console.log(chalk.dim(`Change: terminus models --set <model>`));
    console.log();
  });
