import { Command } from "commander";
import chalk from "chalk";
import {
  setApiKey,
  setActiveProvider,
  getActiveProvider,
} from "../../utils/config.js";

export const loginCommand = new Command("login")
  .description("Save an API key for a provider")
  .requiredOption("--provider <name>", "Provider name (anthropic, gemini)")
  .requiredOption("--api-key <key>", "API key")
  .action((opts: { provider: string; apiKey: string }) => {
    const provider = opts.provider.toLowerCase();
    setApiKey(provider, opts.apiKey);

    if (!getActiveProvider()) {
      setActiveProvider(provider);
      console.log(
        chalk.green(`✓ Saved API key for ${provider}`) +
          chalk.dim(" (set as active provider)"),
      );
    } else {
      console.log(chalk.green(`✓ Saved API key for ${provider}`));
    }
  });
