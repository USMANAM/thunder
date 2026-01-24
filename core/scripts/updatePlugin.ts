import { parseArgs as parse } from "@std/cli/parse-args";
import { z } from "zod";
import { Input } from "@cliffy/prompt/input";

import { addPlugin } from "./addPlugin.ts";
import { removePlugin } from "./removePlugin.ts";

export const updatePlugin = async (options: {
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

  await removePlugin(options);
  await addPlugin(options);
};

if (import.meta.main) {
  const { name, n } = parse(Deno.args);

  await updatePlugin({
    name: name ?? n,
    prompt: true,
  });

  console.log("Success");

  Deno.exit();
}
