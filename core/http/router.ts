import z, { ZodError } from "zod";
import { match, MatchFunction } from "path-to-regexp";
import { THook } from "./hooks.ts";
import { paramsMap } from "./constants.ts";
import { Env, EnvType } from "../common/env.ts";

export type TResponse = Response | Promise<Response>;
export type THandler = (req: Request) => TResponse;
export type TNextFunction = () => TResponse;
export type TMiddleware = (req: Request, next: TNextFunction) => TResponse;
export type THandlerIOShapes = () => {
  params: z.ZodType;
  query: z.ZodType;
  body: z.ZodType;
  return: z.ZodType;
};
export type THandlerOpts = {
  shape?: THandlerIOShapes;
  handler: THandler;
};
export type TPreparedHandler = THandlerOpts | THandler;
export type TPrepareHandler = () => TPreparedHandler;
export type TMethod = "get" | "post" | "patch" | "put" | "delete" | "all";
export type TRouteExecutor = (req: Request) => Promise<Response> | Response;

export type TRegisterMethod = (
  path: string,
  prepare: TPrepareHandler,
) => Router;

export class Router {
  protected routesTree: {
    [K in TMethod]?: Map<string, {
      name: string;
      endpoint: string;
      handler: TPreparedHandler;
      parser: MatchFunction<Record<string, string>>;
    }>;
  } = {};

  constructor(
    protected root: string,
    protected registerFn: (method: Record<TMethod, TRegisterMethod>) => void,
  ) {
    if (!registerFn.name) {
      throw new Error("A named function should be passed to router!");
    }

    // deno-lint-ignore no-explicit-any
    registerFn(this as any);
  }

  protected registerMethod(
    path: string,
    prepare: TPrepareHandler,
    method?: TMethod,
  ) {
    if (!prepare.name) {
      throw new Error("A named function should be passed to route handler!");
    }

    const routes = this.routesTree[method ?? "all"] ??= new Map();
    const endpoint = `/${
      (this.root + path).split("/").filter(Boolean).join("/")
    }`;

    if (routes.has(endpoint)) return this;

    routes.set(endpoint, {
      name: prepare.name,
      endpoint,
      handler: prepare(),
      parser: match<Record<string, string>>(endpoint),
    });

    return this;
  }

  protected get: TRegisterMethod = (path, prepare) =>
    this.registerMethod(path, prepare, "get");

  protected post: TRegisterMethod = (path, prepare) =>
    this.registerMethod(path, prepare, "post");

  protected patch: TRegisterMethod = (path, prepare) =>
    this.registerMethod(path, prepare, "patch");

  protected put: TRegisterMethod = (path, prepare) =>
    this.registerMethod(path, prepare, "put");

  protected delete: TRegisterMethod = (path, prepare) =>
    this.registerMethod(path, prepare, "delete");

  protected all: TRegisterMethod = (path, prepare) =>
    this.registerMethod(path, prepare);

  public match(method: TMethod, endpoint: string) {
    const mainRoutes = this.routesTree[method];
    const otherRoutes = this.routesTree["all"];

    if (!mainRoutes && !otherRoutes) {
      return (_req: Request) => new Response("Not found", { status: 404 });
    }

    for (const routes of [mainRoutes, otherRoutes]) {
      if (routes) {
        for (const [, { name, handler, parser }] of routes) {
          const match = parser(endpoint);

          if (match) {
            return async (req: Request, ...hooks: THook[]) => {
              try {
                for (const hook of hooks) {
                  if (typeof hook.pre === "function") {
                    const hookRes = await hook.pre(
                      this.registerFn.name,
                      name,
                      req,
                    );

                    if (hookRes instanceof Response) return hookRes;
                  }
                }

                paramsMap.set(req, match.params);

                let res: Response;

                if (typeof handler === "function") {
                  res = await handler(req);
                } else {
                  res = await handler.handler(req);
                }

                for (const hook of hooks) {
                  if (typeof hook.post === "function") {
                    const hookRes = await hook.post(
                      this.registerFn.name,
                      name,
                      req,
                      res,
                    );

                    if (hookRes instanceof Response) return hookRes;
                  }
                }

                return res;
              } catch (error) {
                if (error instanceof ZodError) {
                  return Response.json({
                    error: z.prettifyError(error),
                  }, { status: 400 });
                }

                return Response.json({
                  error: error instanceof Error
                    ? {
                      message: error.message,
                      name: error.name,
                      stack: Env.is(EnvType.DEVELOPMENT)
                        ? error.stack
                        : undefined,
                    }
                    : error,
                }, { status: 500 });
              }
            };
          }
        }
      }
    }
  }
}
