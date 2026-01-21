import { join } from "@std/path/join";
import { toFileUrl } from "@std/path/to-file-url";

export interface IDenoConfig {
  name?: string;
  compilerOptions?: {
    target?: string;
    module?: string;
    [key: string]: unknown; // To allow additional properties
  };
  importMap?: string;
  tasks?: Record<string, string>;
  workspace?: string[];
  [key: string]: unknown; // To allow additional properties
}

export const denoConfigPath = join(Deno.cwd(), "deno.json");

export const denoConfig: IDenoConfig = (
  await import(toFileUrl(denoConfigPath).href, {
    with: { type: "json" },
  })
).default;
