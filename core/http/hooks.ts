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
  const cacheKey = root + globPattern;

  let hooksPromise = hooksCache.get(cacheKey);

  if (hooksPromise !== undefined) return hooksPromise;

  // Store the promise immediately so concurrent calls await the same promise
  hooksPromise = (async () => {
    const hooks: THook[] = [];

    for await (
      const entry of expandGlob(globPattern, {
        followSymlinks: true,
        canonicalize: true,
        globstar: true,
        root: join(Deno.cwd(), root),
      })
    ) {
      if (entry.isFile) {
        const mod = await import(toFileUrl(entry.path).href);

        if (
          typeof mod.default === "object" &&
          ("pre" in mod.default || "post" in mod.default)
        ) hooks.push(mod.default);
      }
    }

    hooks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    return hooks;
  })();

  hooksCache.set(cacheKey, hooksPromise);

  return hooksPromise;
};
