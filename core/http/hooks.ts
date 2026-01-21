import { expandGlob } from "@std/fs";
import { join } from "@std/path/join";
import { toFileUrl } from "@std/path/to-file-url";

export type THook = {
  priority?: number;
  pre?: (
    scope: string,
    name: string,
    req: Request,
  ) => Response | void | Promise<Response | void>;
  post?: (
    scope: string,
    name: string,
    req: Request,
    res: Response,
  ) => Response | void | Promise<Response | void>;
};

// Cache the loading promise, not the result - prevents race conditions
let hooksPromise: Promise<THook[]> | undefined;

export const loadHooks = (
  root: string,
  globPattern: string,
): Promise<THook[]> => {
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

  return hooksPromise;
};
