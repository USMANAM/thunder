import { parseArgs as parse } from "@std/cli/parse-args";
import { join } from "@std/path";
// import { deepMerge } from "@std/collections";
// import { existsSync, expandGlob } from "@std/fs";
// import { printStream } from "./lib/utility.ts";
import { z } from "zod";
import { Input } from "@cliffy/prompt/input";

import { sh } from "./lib/sh.ts";

export const resolvePluginName = (name: string) =>
  name
    .split("/")
    .filter(Boolean)
    .join("/")
    .split("\\")
    .filter(Boolean)
    .join("\\");

export const addPlugin = async (options: {
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

  const GitRepoUrl = new URL(resolvedPluginName, "https://github.com");

  const command = [
    "git",
    "submodule",
    "add",
    GitRepoUrl.toString(),
    join("./plugins", Options.name),
  ];

  console.log("Executing command:", command.join(" "));

  await sh(command, { cwd: Deno.cwd() });

  console.log("Success");
};

if (import.meta.main) {
  const { name, n } = parse(Deno.args);

  await addPlugin({
    name: name ?? n,
    prompt: true,
  });

  Deno.exit();
}
