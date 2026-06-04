import dotenv from "dotenv";
dotenv.config();

export const config = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  PORT: process.env.PORT ?? "3001",
  MODEL_ID: process.env.MODEL_ID ?? "claude-sonnet-4-5",
  PROVIDER: process.env.PROVIDER ?? "anthropic",
  MAX_ITERATIONS: parseInt(process.env.MAX_ITERATIONS ?? "50"),
  WORKING_DIR: process.env.WORKING_DIR ?? process.cwd(),
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN ?? "http://localhost:5173",
  get API_KEY(): string {
    return this.PROVIDER === "gemini" ? this.GEMINI_API_KEY : this.ANTHROPIC_API_KEY;
  },
};
