import { Command } from "commander";
import chalk from "chalk";
import { removeProvider } from "../../utils/config.js";

export const logoutCommand = new Command("logout")
  .description("Remove a provider's API key")
  .requiredOption("--provider <name>", "Provider name (anthropic, gemini)")
  .action((opts: { provider: string }) => {
    removeProvider(opts.provider.toLowerCase());
    console.log(chalk.yellow(`○ Removed credentials for ${opts.provider}`));
  });
