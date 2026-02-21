import { parseArgs } from "@std/cli/parse-args";
import { generateOpenAPIContent } from "../generators/openapi.ts";
import { denoConfig } from "../utils/denoConfig.ts";

export const generateOpenAPI = async (opts?: {
  title?: string;
  version?: string;
  overwrite?: boolean;
}) => {
  const title = (opts?.title ?? denoConfig.title ?? "thunder-sdk") as string;
  const version = opts?.version ?? "0.0.1";

  await generateOpenAPIContent({
    title,
    version,
    overwrite: opts?.overwrite,
    cwd: Deno.cwd(),
  });
};

if (import.meta.main) {
  const { title, t, version, v, overwrite } = parseArgs(Deno.args);

  await generateOpenAPI({
    title: title ?? t,
    version: version ?? v,
    overwrite,
  });

  console.info("SDK has been generated");
}
