import { expandGlob } from "@std/fs";
import { basename } from "@std/path/basename";
import { join } from "@std/path/join";
import { toFileUrl } from "@std/path/to-file-url";

export const loadRoutes = async (
  root: string,
  globPattern: string,
  target: string,
) => {
  const rootDir = join(Deno.cwd(), root);

  for await (
    const entry of expandGlob(globPattern, {
      followSymlinks: true,
      canonicalize: true,
      globstar: true,
      root: rootDir,
    })
  ) {
    if (target === basename(entry.path)) {
      return {
        module: await import(toFileUrl(entry.path).href),
      };
    }
  }

  return {
    fallback: true,
    module: await import(toFileUrl(join(rootDir, "index.ts")).href),
  };
};
