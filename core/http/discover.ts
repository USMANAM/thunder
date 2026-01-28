import { loadHooks } from "./hooks.ts";
import { loadRoutes } from "./routes.ts";
import { TMethod, TRouteExecutor } from "./router.ts";

export const discover = async (
  req: Request,
  opts?: {
    routes?: string;
    hooks?: string;
  },
): Promise<TRouteExecutor> => {
  const url = new URL(req.url);

  const routesPath = opts?.routes ?? "routes";
  const hooksPath = opts?.hooks ?? "hooks";

  const pathnameParts = url.pathname.split("/").filter(
    Boolean,
  );
  const [namespace, ...endpointParts] = pathnameParts;

  const { fallback, module } = await loadRoutes(
    routesPath,
    `./**/*.ts`,
    namespace + ".ts",
  );

  const router = module.default;

  if (typeof router?.route === "function") {
    const resolvedEndpoint = fallback
      ? `/${pathnameParts.join("/") ?? ""}`
      : `/${endpointParts.join("/") ?? ""}`;

    const exec = router.route(
      req.method.toLowerCase() as TMethod,
      resolvedEndpoint,
    );

    return async (req: Request) =>
      typeof exec === "function"
        ? await exec(
          req,
          ...(await loadHooks(hooksPath, "./**/*.ts")),
        )
        : new Response("Not found", { status: 404 });
  }

  throw new Error(`Not a valid router at ${url.pathname}`);
};
