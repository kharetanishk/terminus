import "dotenv/config";
import { resolve } from "node:path";
import { program } from "commander";
import { providersCommand } from "./commands/providers/index.js";
import { modelsCommand } from "./commands/models.js";
import { agentCommand } from "./commands/agent.js";

/** Block until the user presses any key. Used to keep command output visible. */
function waitForAnyKey(): Promise<void> {
  return new Promise((res) => {
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.once("data", () => {
      stdin.setRawMode?.(false);
      stdin.pause();
      res();
    });
  });
}

program
  .name("terminus")
  .description("Terminus — a coding agent harness")
  .version("0.1.0");

program.addCommand(providersCommand);
program.addCommand(modelsCommand);
program.addCommand(agentCommand);

// no subcommand → render welcome screen, loop until user quits
program.action(async () => {
  const { render } = await import("ink");
  const React = await import("react");
  const { Welcome } = await import("./ui/welcome.js");
  const { getActiveProvider, getActiveModel } = await import(
    "./utils/config.js"
  );
  const { spawnSync } = await import("node:child_process");

  // Resolve once — absolute path avoids CWD issues when the child inherits it
  const exe = process.argv[0]!;
  let script = resolve(process.argv[1]!);

  // If the parent was launched via tsx/node against the TypeScript source, the
  // child spawn would fail because Node can't import .ts files.  Map src → dist.
  if (script.endsWith(".ts")) {
    script = script
      .replace(/([/\\])src([/\\])/, (_m, a, b) => `${a}dist${b}`)
      .replace(/\.ts$/, ".js");
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Reset terminal so Ink always gets a clean slate (important after spawnSync)
    process.stdout.write("\x1Bc");

    let pendingCommand: string | null = null as string | null;

    const { unmount, waitUntilExit } = render(
      React.createElement(Welcome, {
        provider: getActiveProvider(),
        model: getActiveModel(),
        onCommand: (cmd: string) => {
          pendingCommand = cmd;
          unmount();
        },
      }),
    );

    await waitUntilExit();

    // q or ctrl+c → pendingCommand is null → break out and let process end
    if (!pendingCommand) break;

    const args = pendingCommand.trim().split(/\s+/).filter(Boolean);
    process.stdout.write("\n");

    // Run the subcommand as a subprocess so output streams directly to the terminal
    spawnSync(exe, [script, ...args], { stdio: "inherit" });

    // Keep output on screen until the user acknowledges it
    process.stdout.write("\n\x1B[2m  ← press any key to return\x1B[0m\n");
    await waitForAnyKey();
    // loop → terminal reset + welcome screen re-renders
  }
});

program.parse();
