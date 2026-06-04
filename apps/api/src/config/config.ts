import dotenv from "dotenv";
dotenv.config();

const getRequired = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
};

export const config = {
  ANTHROPIC_API_KEY: getRequired("ANTHROPIC_API_KEY"),
  GEMINI_API_KEY: getRequired("GEMINI_API_KEY"),
  PORT: process.env.PORT ?? "3001",
  MODEL_ID: process.env.MODEL_ID ?? "claude-sonnet-4-5-20250929",
  MAX_ITERATIONS: parseInt(process.env.MAX_ITERATIONS ?? "50"),
  WORKING_DIR: process.env.WORKING_DIR ?? process.cwd(),
};
