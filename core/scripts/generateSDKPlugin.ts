import { parseArgs } from "@std/cli/parse-args";
import { generateSDKPluginContent } from "../generators/sdk-plugin.ts";

export const generateSDKPlugin = async (opts?: {
  name?: string;
  version?: string;
}) => {
  const name = opts?.name;

  if (!name) throw new Error("A plugin name is required!");

  await generateSDKPluginContent({
    name,
    cwd: Deno.cwd(),
    generateSDKContentOpts: {
      cwd: Deno.cwd(),
      version: opts?.version,
    },
  });
};

if (import.meta.main) {
  const { name, n, version, v } = parseArgs(Deno.args);

  await generateSDKPlugin({
    name: name ?? n,
    version: version ?? v,
  });

  console.info("SDK plugin has been generated");
}
