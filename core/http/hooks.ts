import { expandGlob } from "@std/fs";
import { join } from "@std/path/join";

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

let hooks: THook[] | undefined;

export const loadHooks = async (
  root: string,
  globPattern: string,
) => {
  if (hooks !== undefined) return hooks;

  hooks = [];

  for await (
    const entry of expandGlob(globPattern, {
      followSymlinks: true,
      canonicalize: true,
      globstar: true,
      root: join(Deno.cwd(), root),
    })
  ) {
    if (entry.isFile) {
      const mod = await import(`file:///${entry.path}`);

      if (
        typeof mod.default === "object" &&
        ("pre" in mod.default || "post" in mod.default)
      ) hooks.push(mod.default);
    }
  }

  hooks.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

  return hooks;
};
