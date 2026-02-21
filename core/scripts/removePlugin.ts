import { parseArgs as parse } from "@std/cli/parse-args";
import { join } from "@std/path";
import { z } from "zod";
import { Input } from "@cliffy/prompt/input";

import { writeJSONFile } from "./lib/utility.ts";
import { denoConfigPath, readDenoConfig } from "../utils/denoConfig.ts";
import { resolvePluginName } from "./addPlugin.ts";

export const removePluginFromImportMap = async (
  name: string,
) => {
  const targetConfig = await readDenoConfig(denoConfigPath, true);

  if (!targetConfig.imports && !targetConfig.scopes) return;

  delete targetConfig.imports?.[`@plugins/${name}/`];
  delete targetConfig.scopes?.[`./plugins/${name}/`];

  await writeJSONFile(denoConfigPath, targetConfig);
};

export const unlinkPlugin = async (name: string, opts?: { cwd?: string }) => {
  const cwd = opts?.cwd ?? Deno.cwd();
  const targetPath = join(cwd, "plugins", name);

  await Deno.remove(targetPath, { recursive: true });

  await removePluginFromImportMap(name);

  await Deno.remove(join(cwd, "./routes", name), { recursive: true });
  await Deno.remove(join(cwd, "./hooks", name), { recursive: true });
};

export const removePlugin = async (options: {
  name: string;
  prompt?: boolean;
}) => {
  const Options = await z.object({
    name: z.optional(z.string()),
  }).parse(options);

  if (options.prompt && !Options.name) {
    Options.name = await Input.prompt({
      message: "Name of the Plugin",
    });
  }

  if (!Options.name) throw new Error("Plugin name is required");

  const resolvedPluginName = resolvePluginName(Options.name);

  await unlinkPlugin(resolvedPluginName);
};

if (import.meta.main) {
  const { name, n } = parse(Deno.args);

  await removePlugin({
    name: name ?? n,
    prompt: true,
  });

  console.info("Success");

  Deno.exit();
}
