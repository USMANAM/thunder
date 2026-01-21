import { Logger } from "../common/logger.ts";
import { loadHooks } from "./hooks.ts";
import { loadRoutes } from "./routes.ts";
import { TMethod, TRouteExecutor } from "./router.ts";

export const discover = async (
  req: Request,
  opts?: {
    api?: string;
    hooks?: string;
  },
): Promise<TRouteExecutor | undefined> => {
  const url = new URL(req.url);

  const apiPath = opts?.api ?? "api";
  const hooksPath = opts?.hooks ?? "hooks";

  const [namespace, ...endpointParts] = url.pathname.split("/").filter(
    Boolean,
  );

  const mod = await loadRoutes(
    apiPath,
    `./**/*.ts`,
    namespace + ".ts",
  );

  const router = mod.default;

  if (typeof router?.match === "function") {
    const exec = router.match(
      req.method.toLowerCase() as TMethod,
      `/${endpointParts.join("/") ?? ""}`,
    );

    if (!exec) return;

    return async (req: Request) => {
      const res = await exec(
        req,
        ...(await loadHooks(hooksPath, "./**/*.ts")),
      );

      const log = (() => {
        switch (true) {
          case res.status < 299:
            return Logger.success;
          case res.status < 399:
            return Logger.info;
          case res.status < 499:
            return Logger.warn;

          default:
            return Logger.error;
        }
      })();

      log.bind(Logger)(req.method.toUpperCase(), req.url, res.status);

      return res;
    };
  }

  throw new Error(`Not a valid router at ${url.pathname}`);
};
