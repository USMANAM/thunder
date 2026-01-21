import z, { ZodError, ZodObject } from "zod";
import { match, MatchFunction, pathToRegexp } from "path-to-regexp";
import { THook } from "./hooks.ts";

export type TResponse = Response | Promise<Response>;
export type THandler = (req: Request) => TResponse;
export type TNextFunction = () => TResponse;
export type TMiddleware = (req: Request, next: TNextFunction) => TResponse;
export type THandlerIOShapes = () => {
  params: ZodObject;
  query: ZodObject;
  body: ZodObject;
  return: ZodObject;
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
    [K in TMethod]?: Map<RegExp, {
      endpoint: string;
      prepare: TPrepareHandler;
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
    const routes = this.routesTree[method ?? "all"] ??= new Map();
    const endpoint = `/${
      (this.root + path).split("/").filter(Boolean).join("/")
    }`;

    routes.set(pathToRegexp(endpoint).regexp, {
      endpoint,
      prepare,
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
        for (const [regex, { prepare, parser }] of routes) {
          if (regex.test(endpoint)) {
            const handlerOpts = prepare();

            return async (req: Request, ...hooks: THook[]) => {
              try {
                for (const hook of hooks) {
                  if (typeof hook.pre === "function") {
                    const hookRes = await hook.pre(
                      this.registerFn.name,
                      prepare.name,
                      req,
                    );

                    if (hookRes instanceof Response) return hookRes;
                  }
                }

                // deno-lint-ignore ban-ts-comment
                // @ts-ignore
                req._params = parser(endpoint).params;

                let res: Response;

                if (typeof handlerOpts === "function") {
                  res = await handlerOpts(req);
                } else {
                  res = await handlerOpts.handler(req);
                }

                for (const hook of hooks) {
                  if (typeof hook.post === "function") {
                    const hookRes = await hook.post(
                      this.registerFn.name,
                      prepare.name,
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
                  error,
                }, { status: 500 });
              }
            };
          }
        }
      }
    }
  }
}
