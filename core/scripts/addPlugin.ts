import { parseArgs as parse } from "@std/cli/parse-args";
import { dirname, isAbsolute, join } from "@std/path";
import { exists } from "@std/fs/exists";
import { expandGlob } from "@std/fs/expand-glob";
import { z } from "zod";
import { Input } from "@cliffy/prompt/input";

import { sh } from "./lib/sh.ts";
import { symlink, writeJSONFile } from "./lib/utility.ts";
import { denoConfigPath, readDenoConfig } from "../common/denoConfig.ts";

export const resolvePluginName = (name: string) =>
  name
    .split("/")
    .filter(Boolean)
    .join("/")
    .split("\\")
    .filter(Boolean)
    .join("\\");

export const addPluginToImportMap = async (
  name: string,
  opts?: { cwd?: string },
) => {
  const cwd = opts?.cwd ?? Deno.cwd();
  const sourcePath = join(cwd, "_temp", name);

  const sourceConfig = await readDenoConfig(denoConfigPath, true);
  const targetConfig = await readDenoConfig(
    join(sourcePath, "deno.json"),
    true,
  );

  if (!sourceConfig.imports) sourceConfig.imports = {};
  if (!sourceConfig.scopes) sourceConfig.scopes = {};

  sourceConfig.imports[`@plugins/${name}/`] = `./plugins/${name}/`;
  sourceConfig.scopes[`./plugins/${name}/`] = Object.fromEntries(
    Object.entries(targetConfig.imports || {}).map(([key, value]) => {
      if (key.startsWith("@core/")) return [key, value];

      let isUrl: boolean;

      try {
        new URL(value);
        isUrl = true;
      } catch {
        isUrl = false;
      }

      const resolvedValue = !isUrl && !isAbsolute(value)
        ? `./${join(`./plugins/${name}/`, value).replace(/\\/g, "/")}`
        : value;

      return [key, resolvedValue];
    }),
  );

  await writeJSONFile(denoConfigPath, sourceConfig);
};

export const linkPlugin = async (name: string, opts?: { cwd?: string }) => {
  const cwd = opts?.cwd ?? Deno.cwd();
  const sourcePath = join(cwd, "_temp", name);
  const targetPath = join(cwd, "plugins", name);

  if (!await exists(sourcePath)) {
    throw new Error(`Plugin source path does not exist: ${sourcePath}`);
  }

  // Copy plugin source to plugins directory
  // We will only copy the following files/folders: api, hooks, deno.json, README.md
  await Deno.mkdir(targetPath, { recursive: true });

  const globPatterns = [
    "{api,db,hooks,public}/**/*",
  ];

  for (const pattern of globPatterns) {
    for await (
      const entry of expandGlob(pattern, {
        root: sourcePath,
        includeDirs: false,
      })
    ) {
      if (!entry.isDirectory) {
        const filePath = entry.path.replace(
          sourcePath,
          targetPath,
        );

        const directoryPath = dirname(filePath);

        await Deno.mkdir(directoryPath, { recursive: true }).catch(
          () => {
            // Do nothing...
          },
        );

        await Deno.copyFile(entry.path, filePath);
      }
    }
  }

  await symlink(
    join(targetPath, "./api"),
    join(Deno.cwd(), "./api", name),
  );

  await symlink(
    join(targetPath, "./hooks"),
    join(Deno.cwd(), "./hooks", name),
  );

  await addPluginToImportMap(name);
};

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
  const TempPath = join(Deno.cwd(), "_temp", resolvedPluginName);

  if (!await exists(join(TempPath, "deno.json"))) {
    const GitRepoUrl = new URL(resolvedPluginName, "https://github.com");

    const command = [
      "git",
      "clone",
      "--single-branch",
      GitRepoUrl.toString(),
      TempPath,
    ];

    await sh(command, { cwd: Deno.cwd() });
  }

  await linkPlugin(resolvedPluginName);

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
