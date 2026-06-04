import "dotenv/config";
import { program } from "commander";
import { providersCommand } from "./commands/providers/index.js";
import { modelsCommand } from "./commands/models.js";
import { agentCommand } from "./commands/agent.js";

program
  .name("terminus")
  .description("Terminus — a coding agent harness")
  .version("0.1.0");

program.addCommand(providersCommand);
program.addCommand(modelsCommand);
program.addCommand(agentCommand);

program.parse();
