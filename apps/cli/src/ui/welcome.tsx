import { useEffect, useRef, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import chalk from "chalk";

interface WelcomeProps {
  provider: string | null;
  model: string | null;
  onCommand: (cmd: string) => void;
}

// ── palette ──────────────────────────────────────────────────────────────
const G = chalk.hex("#00ff41"); // matrix green — head & hood
const GD = chalk.hex("#1f9e3f"); // mid green — upper coils
const GY = chalk.hex("#9acd32"); // yellow-green — lower coils
const R = chalk.hex("#ff3131"); // red — eyes
const W = chalk.white; // fangs

const WIDTH = 62;
const TOP_BORDER = "╔" + "═".repeat(WIDTH - 2) + "╗";
const BOTTOM_BORDER = "╚" + "═".repeat(WIDTH - 2) + "╝";

const TAGLINES = [
  ">>> THE AGENT AWAKENS <<<",
  ">>> TOOLS LOADED. READY TO STRIKE <<<",
  ">>> CONTEXT WINDOW: OPEN <<<",
];

const HISS_PATTERN =
  "sssssss~~~~~SSSSS~~~~~sssssss~~~~~SSSSS~~~~~sssssss~~~~~SSSSS~~~~~";
const HISS_WIDTH = 40;

// ── the cobra ──────────────────────────────────────────────────────────────
// Each line is fully colored via chalk so it can live inside one <Text> block.
// `eye` is injected so the eyes can blink between ◉ and ●.
function buildCobra(eye: string, hiss: string): string[] {
  const e = R(eye);
  return [
    G("                ╔════════════════════╗"),
    G("            ╔═══╝                    ╚═══╗"),
    G("         ╔══╝      ╔══════════════╗      ╚══╗"),
    G("       ╔═╝       ╔═╝                ╚═╗      ╚═╗"),
    G("      ║        ╔═╝    ") + e + G("          ") + e + G("    ╚═╗        ║"),
    G("      ║        ║      ╔════════════╗      ║        ║"),
    G("       ╚═╗      ╚═╗   ║   ╲      ╱  ║   ╔═╝      ╔═╝"),
    G("         ╚═╗      ╚═╗ ║    ╲    ╱   ║ ╔═╝      ╔═╝"),
    G("           ╚══╗     ╚╣     ") + W("v  v") + G("     ╠╝     ╔══╝"),
    G("              ╚══╗    ╚╗    ") + W("╲╱") + G("    ╔╝    ╔══╝"),
    G("                 ╚══╗   ╚══════════╝   ╔══╝"),
    GD("                    ╚═══╗   ║║║║   ╔═══╝"),
    GD("                        ╚╗  ║║║║  ╔╝"),
    GD("                         ║  ║║║║  ║"),
    GD("                         ╚╗ ║║║║ ╔╝"),
    GD("                          ╚╗║║║║╔╝"),
    GD("                           ║║║║║║"),
    GD("                          ╔╝╚╬╬╝╚╗"),
    GD("                         ╔╝  ╬╬  ╚╗"),
    GY("                        ╔╝  ╔╝╚╗  ╚╗"),
    GY("                       ╔╝  ╔╝  ╚╗  ╚╗"),
    GY("                      ╔╝  ╔╝    ╚╗  ╚╗"),
    GY("                     ╔╝  ╔╝  " + GY("~~") + GY("  ╚╗  ╚╗")),
    GY("                    ╔╝  ╔╝ ") + GY(hiss) + GY(" ╚╗  ╚╗"),
    GY("                   ╚═══╝ ╚═══════════╝ ╚═══╝"),
  ];
}

const COBRA_LINES = 25;

export function Welcome({ provider, model, onCommand }: WelcomeProps) {
  const { exit } = useApp();

  // single master tick — all animations derive from this via modulo math
  const [tickCount, setTickCount] = useState(0);
  // live typed input at the prompt line
  const [commandInput, setCommandInput] = useState("");
  // ref-based typing flag — avoids stale closure inside the interval
  const typingRef = useRef(false);

  useInput((input, key) => {
    // ctrl+c always exits
    if (key.ctrl && input === "c") {
      exit();
      return;
    }
    // Enter — run the command if something was typed, otherwise do nothing
    if (key.return) {
      typingRef.current = false;
      const trimmed = commandInput.trim();
      if (trimmed) {
        onCommand(trimmed);
      }
      return;
    }
    // Backspace / delete
    if (key.backspace || key.delete) {
      setCommandInput((prev) => {
        const next = prev.slice(0, -1);
        if (next === "") typingRef.current = false;
        return next;
      });
      return;
    }
    // q with empty input = quit
    if (input === "q" && commandInput === "") {
      exit();
      return;
    }
    // accumulate printable characters — freeze animations while typing
    if (input && !key.ctrl && !key.meta) {
      typingRef.current = true;
      setCommandInput((prev) => prev + input);
    }
  });

  useEffect(() => {
    const i = setInterval(() => {
      if (!typingRef.current) setTickCount((n) => n + 1);
    }, 200);
    return () => clearInterval(i);
  }, []);

  // derived animation states
  const eyesBlink = tickCount % 3 === 0; // every 600ms
  const taglineIndex = Math.floor(tickCount / 8) % TAGLINES.length; // every 1600ms
  const statusPulse = tickCount % 4 === 0; // every 800ms
  const cursorBlink = tickCount % 3 === 0; // every 600ms
  const hissOffset = tickCount % HISS_PATTERN.length;
  const revealLine = Math.min(tickCount, COBRA_LINES);

  const eye = eyesBlink ? "◉" : "●";
  const tailHiss = eyesBlink ? "sSSSs" : "SsssS";
  const cobra = buildCobra(eye, tailHiss);
  const snake = cobra.slice(0, revealLine).join("\n");

  const hissDoubled = HISS_PATTERN + HISS_PATTERN;
  const hissView = hissDoubled.slice(hissOffset, hissOffset + HISS_WIDTH);

  const hasProvider = !!provider;
  const providerLabel = hasProvider ? provider! : "not configured";
  const modelLabel = model ?? "—";
  const dot = statusPulse ? "●" : "○";
  const tagline = taglineIndex;
  const cursorOn = cursorBlink;

  return (
    <Box flexDirection="column" alignItems="center" paddingY={1}>
      {/* 1. top border */}
      <Text color="cyan">{TOP_BORDER}</Text>

      {/* 2. header row */}
      <Text>
        <Text color="cyan">║ </Text>
        <Text color="white" bold>
          {" "}
          TERMINUS{" "}
        </Text>
        <Text color="#00ff41">v0.1.0</Text>
        <Text dimColor> | </Text>
        <Text color="cyan">[AGENT]</Text>
        <Text dimColor> | </Text>
        <Text color="cyan">2026</Text>
        <Text color="cyan"> ║</Text>
      </Text>

      {/* 3. cobra */}
      <Box marginTop={1} justifyContent="center">
        <Text>{snake}</Text>
      </Box>

      {/* 4. animated tagline */}
      <Box marginTop={1}>
        <Text color="yellow" bold>
          {TAGLINES[tagline]}
        </Text>
      </Box>

      {/* subtle hissing scroll */}
      <Box>
        <Text dimColor color="#1f9e3f">
          {hissView}
        </Text>
      </Box>

      {/* 5. status bar */}
      <Box
        marginTop={1}
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
      >
        <Text>
          <Text dimColor>provider: </Text>
          <Text color={hasProvider ? "#00ff41" : "red"} bold>
            {providerLabel}
          </Text>
          <Text dimColor>    model: </Text>
          <Text color="cyan">{modelLabel}</Text>
          <Text dimColor>    status: </Text>
          <Text color={hasProvider ? "green" : "red"}>{dot}</Text>
          <Text color={hasProvider ? "green" : "red"}>
            {hasProvider ? " ready" : " not configured"}
          </Text>
        </Text>
      </Box>

      {/* 6. command menu */}
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text>
          <Text color="cyan">[agent]</Text>
          <Text dimColor> run a task</Text>
          <Text dimColor>{"        "}</Text>
          <Text color="cyan">[providers]</Text>
          <Text dimColor> manage api keys</Text>
        </Text>
        <Text>
          <Text color="cyan">[models]</Text>
          <Text dimColor> list models</Text>
          <Text dimColor>{"      "}</Text>
          <Text color="cyan">[q / ctrl+c]</Text>
          <Text dimColor> quit</Text>
        </Text>
      </Box>

      {/* 7. bottom border + live input prompt */}
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text color="cyan">{BOTTOM_BORDER}</Text>
        <Text>
          <Text color="#00ff41"> terminus:~$ </Text>
          <Text color="white">{commandInput}</Text>
          <Text color="white">{cursorOn ? "_" : " "}</Text>
        </Text>
      </Box>
    </Box>
  );
}
