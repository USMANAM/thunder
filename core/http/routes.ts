import { expandGlob } from "@std/fs";
import { basename } from "@std/path/basename";
import { join } from "@std/path/join";
import { toFileUrl } from "@std/path/to-file-url";
import { routesCache } from "./constants.ts";

export const loadRoutes = (
  root: string,
  globPattern: string,
  target: string,
) => {
  const cacheKey = root + globPattern + target;

  let routesPromise = routesCache.get(cacheKey);

  if (routesPromise !== undefined) return routesPromise;

  const rootDir = join(Deno.cwd(), root);

  routesPromise = (async () => {
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
  })();

  routesCache.set(cacheKey, routesPromise);

  return routesPromise;
};
