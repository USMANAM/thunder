import { exists } from "@std/fs/exists";
import { parseQueryParams } from "../utils/parseQueryParams.ts";
import { join } from "@std/path/join";
import { serveFile } from "@std/http/file-server";
import { indexFileCache, paramsMap } from "./constants.ts";
import type { IParseOptions } from "qs";

export const paramsAsJson = <T extends Record<string, string>>(
  req: Request,
): T => {
  return (paramsMap.get(req) ?? {}) as T;
};

export const queryAsJson = (req: Request, opts?: IParseOptions) => {
  const url = new URL(req.url);

  return parseQueryParams(url.search, opts);
};

export const bodyAsJson = (req: Request) => req.json();

export const serveAssets = async (
  req: Request,
  root: string,
  filePath?: string,
) => {
  if (!await exists(root)) {
    return new Response("Not found", { status: 404 });
  }

  let IndexFile = indexFileCache.get(root);

  if (!IndexFile) {
    IndexFile = "index.html";

    if (!await exists(join(root, IndexFile))) {
      for await (const item of Deno.readDir(root)) {
        if (!item.isDirectory && /^index.*/.test(item.name)) {
          IndexFile = item.name;
          break;
        }
      }
    }

    indexFileCache.set(root, IndexFile);
  }

  return await serveFile(req, join(root, filePath ?? IndexFile)).then(
    async (res) => {
      if (res.status === 404) {
        return await serveFile(req, join(root, IndexFile));
      }

      return res;
    },
  );
};
