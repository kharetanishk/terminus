import { bashSchema, bashExecute } from "./bash.js";
import { readFileSchema, readFileExecute } from "./read-file.js";
import { writeFileSchema, writeFileExecute } from "./write-file.js";
import { listDirSchema, listDirExecute } from "./list-dir.js";

export interface Tool {
  schema: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: string; description: string }>;
      required?: string[];
    };
  };
  execute: (
    args: Record<string, unknown>,
  ) => Promise<{ result: string; isError: boolean }>;
}

export const tools: Tool[] = [
  { schema: bashSchema, execute: bashExecute },
  { schema: readFileSchema, execute: readFileExecute },
  { schema: writeFileSchema, execute: writeFileExecute },
  { schema: listDirSchema, execute: listDirExecute },
];

export const toolSchemas = tools.map((t) => t.schema);

export function findTool(name: string): Tool | undefined {
  return tools.find((t) => t.schema.name === name);
}
