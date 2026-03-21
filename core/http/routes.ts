import { expandGlob } from "@std/fs/expand-glob";
import { basename } from "@std/path/basename";
import { join } from "@std/path/join";
import { toFileUrl } from "@std/path/to-file-url";
import { routesCache } from "./constants.ts";

export const loadRoutes = (
  root: string,
  globPattern: string,
  target: string,
) => {
  const cacheKey = JSON.stringify([root, globPattern, target]);

  if (!routesCache.has(cacheKey)) {
    const rootDir = join(Deno.cwd(), root);

    routesCache.set(
      cacheKey,
      (async () => {
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
      })(),
    );
  }

  return routesCache.get(cacheKey)!;
};
