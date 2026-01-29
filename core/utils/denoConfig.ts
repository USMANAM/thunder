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
  imports?: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
  [key: string]: unknown; // To allow additional properties
}

export const denoConfigPath = join(Deno.cwd(), "deno.json");

export const readDenoConfig = async (
  path: string,
  readStatic?: boolean,
): Promise<IDenoConfig> => {
  if (readStatic) return JSON.parse(await Deno.readTextFile(path));

  const denoConfig: IDenoConfig = (
    await import(toFileUrl(path).href, {
      with: { type: "json" },
    })
  ).default;

  return denoConfig;
};

export const denoConfig = await readDenoConfig(denoConfigPath);
