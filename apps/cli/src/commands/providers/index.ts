import { Command } from "commander";
import { loginCommand } from "./login.js";
import { logoutCommand } from "./logout.js";
import { listCommand } from "./list.js";
import { setProviderCommand } from "./setProvider.js";

export const providersCommand = new Command("providers")
  .description("Manage LLM provider credentials");

providersCommand.addCommand(loginCommand);
providersCommand.addCommand(logoutCommand);
providersCommand.addCommand(listCommand);
providersCommand.addCommand(setProviderCommand);
