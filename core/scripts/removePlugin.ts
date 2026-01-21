import { parseArgs as parse } from "@std/cli/parse-args";
import { join } from "@std/path";
import { z } from "zod";
import { Input } from "@cliffy/prompt/input";

import { sh } from "./lib/sh.ts";
import { writeJSONFile } from "./lib/utility.ts";
import { denoConfig, denoConfigPath } from "../common/denoConfig.ts";

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

  const pluginPath = `plugins/${Options.name}`;

  const deinit = [
    "git",
    "submodule",
    "deinit",
    "-f",
    pluginPath,
  ];

  await sh(deinit, { cwd: Deno.cwd() });

  const gitRm = [
    "git",
    "rm",
    "-f",
    pluginPath,
  ];

  await sh(gitRm, { cwd: Deno.cwd() });

  await Deno.remove(`.git/modules/${pluginPath}`, { recursive: true });

  await Promise.all(
    [
      join(Deno.cwd(), "./api", Options.name),
      join(Deno.cwd(), "./hooks", Options.name),
    ].map((path) =>
      Deno.remove(path, {
        recursive: true,
      })
    ),
  );

  await writeJSONFile(
    denoConfigPath,
    {
      ...denoConfig,
      workspace: denoConfig.workspace?.filter((i) =>
        i !== `./plugins/${Options.name}`
      ),
    },
  );

  console.log("Success");
};

if (import.meta.main) {
  const { name, n } = parse(Deno.args);

  await removePlugin({
    name: name ?? n,
    prompt: true,
  });

  Deno.exit();
}
