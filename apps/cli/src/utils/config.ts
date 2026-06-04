import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".terminus");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface ProviderConfig {
  apiKey: string;
}

interface TerminusConfig {
  providers: Record<string, ProviderConfig>;
  activeProvider: string | null;
  activeModels: Record<string, string>;
}

const DEFAULT_ACTIVE_MODELS: Record<string, string> = {
  claude: "claude-sonnet-4-5",
  gemini: "gemini-2.0-flash",
};

function getConfig(): TerminusConfig {
  if (!existsSync(CONFIG_FILE)) {
    return {
      providers: {},
      activeProvider: null,
      activeModels: { ...DEFAULT_ACTIVE_MODELS },
    };
  }
  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<TerminusConfig>;
    return {
      providers: parsed.providers ?? {},
      activeProvider: parsed.activeProvider ?? null,
      activeModels: {
        ...DEFAULT_ACTIVE_MODELS,
        ...(parsed.activeModels ?? {}),
      },
    };
  } catch {
    return {
      providers: {},
      activeProvider: null,
      activeModels: { ...DEFAULT_ACTIVE_MODELS },
    };
  }
}

function saveConfig(config: TerminusConfig): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}

// ── Provider management ────────────────────────────────────────────────────

export function getActiveProvider(): string | null {
  return getConfig().activeProvider;
}

export function setActiveProvider(provider: string): void {
  const config = getConfig();
  config.activeProvider = provider;
  saveConfig(config);
}

export function getApiKey(provider: string): string | null {
  return getConfig().providers[provider]?.apiKey ?? null;
}

export function setApiKey(provider: string, apiKey: string): void {
  const config = getConfig();
  if (!config.providers[provider]) {
    config.providers[provider] = { apiKey };
  } else {
    config.providers[provider]!.apiKey = apiKey;
  }
  saveConfig(config);
}

export function removeProvider(provider: string): void {
  const config = getConfig();
  delete config.providers[provider];
  if (config.activeProvider === provider) {
    config.activeProvider = null;
  }
  saveConfig(config);
}

export function listProviders(): Array<{
  name: string;
  hasKey: boolean;
  active: boolean;
}> {
  const config = getConfig();
  const known = ["claude", "gemini"];
  const configured = Object.keys(config.providers);
  const all = [...new Set([...known, ...configured])];

  return all.map((name) => ({
    name,
    hasKey: !!config.providers[name]?.apiKey,
    active: config.activeProvider === name,
  }));
}

// ── Model management ───────────────────────────────────────────────────────

export function getActiveModel(): string | null {
  const config = getConfig();
  const provider = config.activeProvider;
  if (!provider) return null;
  return (
    config.activeModels[provider] ?? DEFAULT_ACTIVE_MODELS[provider] ?? null
  );
}

export function setActiveModel(provider: string, model: string): void {
  const config = getConfig();
  config.activeModels[provider] = model;
  saveConfig(config);
}
