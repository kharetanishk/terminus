import { Command } from "commander";
import chalk from "chalk";
import { listProviders } from "../../utils/config.js";

export const listCommand = new Command("list")
  .description("List configured providers and their status")
  .action(() => {
    const providers = listProviders();

    console.log();
    for (const p of providers) {
      const activeMarker = p.active ? chalk.cyan("  ◆ active") : "";
      const keyStatus = p.hasKey
        ? chalk.green("✓ key set")
        : chalk.dim("✗ no key");
      console.log(`  ${chalk.bold(p.name)}  ${keyStatus}${activeMarker}`);
    }
    console.log();

    if (providers.every((p) => !p.hasKey)) {
      console.log(
        chalk.dim(
          "  No keys configured. Run:\n" +
            "  terminus providers login --provider anthropic --api-key sk-...",
        ),
      );
      console.log();
    }
  });
