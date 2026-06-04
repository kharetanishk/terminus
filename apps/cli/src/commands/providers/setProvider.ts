import { Command } from "commander";
import chalk from "chalk";
import { setActiveProvider, getApiKey } from "../../utils/config.js";

export const setProviderCommand = new Command("set")
  .description("Set the active provider")
  .argument("<provider>", "Provider name (anthropic, gemini)")
  .action((provider: string) => {
    provider = provider.toLowerCase();

    if (!getApiKey(provider)) {
      console.error(
        chalk.red(`✗ No API key for ${provider}.`) +
          chalk.dim(
            ` Run: terminus providers login --provider ${provider} --api-key <key>`,
          ),
      );
      process.exit(1);
    }

    setActiveProvider(provider);
    console.log(chalk.green(`✓ Active provider set to ${provider}`));
  });
