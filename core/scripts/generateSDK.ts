import { parseArgs } from "@std/cli/parse-args";
import { generateSDKContent } from "../generators/sdk.ts";
import { denoConfig } from "../utils/denoConfig.ts";

export const generateSDK = async (opts?: {
  name?: string;
  version?: string;
}) => {
  const name = opts?.name ?? denoConfig.name ?? "thunder-sdk";
  const version = opts?.version ?? "0.0.1";

  await generateSDKContent({
    name,
    version,
    cwd: Deno.cwd(),
  });
};

if (import.meta.main) {
  const { name, n, version, v } = parseArgs(Deno.args);

  await generateSDK({
    name: name ?? n,
    version: version ?? v,
  });

  console.info("SDK has been generated");
}
