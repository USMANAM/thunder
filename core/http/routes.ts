import { expandGlob } from "@std/fs";
import { basename } from "@std/path/basename";
import { join } from "@std/path/join";

export const loadRoutes = async (
  root: string,
  globPattern: string,
  target: string,
) => {
  for await (
    const entry of expandGlob(globPattern, {
      followSymlinks: true,
      canonicalize: true,
      globstar: true,
      root: join(Deno.cwd(), root),
    })
  ) {
    if (target === basename(entry.path)) {
      return await import(`file:///${entry.path}`);
    }
  }

  return {};
};
