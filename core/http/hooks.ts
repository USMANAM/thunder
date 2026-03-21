import { expandGlob } from "@std/fs/expand-glob";
import { join } from "@std/path/join";
import { toFileUrl } from "@std/path/to-file-url";
import { hooksCache } from "./constants.ts";

export type THook = {
  priority?: number;
  pre?: (
    ctx: {
      req: Request;
      scope: string;
      name?: string;
    },
  ) => Response | void | Promise<Response | void>;
  post?: (
    ctx: {
      req: Request;
      res: Response;
      scope: string;
      name?: string;
    },
  ) => Response | void | Promise<Response | void>;
};

export const loadHooks = (
  root: string,
  globPattern: string,
): Promise<THook[]> => {
  const cacheKey = JSON.stringify([root, globPattern]);

  if (!hooksCache.has(cacheKey)) {
    const rootDir = join(Deno.cwd(), root);

    hooksCache.set(
      cacheKey,
      (async () => {
        const hooks: THook[] = [];

        for await (
          const entry of expandGlob(globPattern, {
            followSymlinks: true,
            canonicalize: true,
            globstar: true,
            root: rootDir,
          })
        ) {
          if (entry.isFile) {
            const mod = await import(toFileUrl(entry.path).href);
            const d = mod.default;

            if (
              d != null &&
              typeof d === "object" &&
              ("pre" in d || "post" in d)
            ) {
              hooks.push(d as THook);
            }
          }
        }

        hooks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

        return hooks;
      })(),
    );
  }

  return hooksCache.get(cacheKey)!;
};
