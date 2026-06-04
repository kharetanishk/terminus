import type { Tool } from "../types.js";
import { bashSchema, bashExecute } from "./bash.js";
import { readFileSchema, readFileExecute } from "./read-file.js";
import { writeFileSchema, writeFileExecute } from "./write-file.js";
import { listDirSchema, listDirExecute } from "./list-dir.js";

export function createTools(): Tool[] {
  return [
    { schema: bashSchema, execute: bashExecute },
    { schema: readFileSchema, execute: readFileExecute },
    { schema: writeFileSchema, execute: writeFileExecute },
    { schema: listDirSchema, execute: listDirExecute },
  ];
}

export function findTool(tools: Tool[], name: string): Tool | undefined {
  return tools.find((t) => t.schema.name === name);
}
