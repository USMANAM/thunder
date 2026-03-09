import z, { ZodError } from "zod";
import { match, MatchFunction, MatchResult } from "path-to-regexp";
import { THook } from "./hooks.ts";
import { paramsMap } from "./constants.ts";
import { Env, EnvType } from "../utils/env.ts";

export type TResponse = Response | Promise<Response>;
export type THandler = (req: Request) => TResponse;
export type TNextFunction = () => TResponse;
export type TMiddleware = (req: Request, next: TNextFunction) => TResponse;
export type THandlerIOShapes = {
  headers?: z.ZodType<Record<string, unknown>, Record<string, unknown>>;
  params?: z.ZodType<Record<string, unknown>, Record<string, unknown>>;
  query?: z.ZodType<Record<string, unknown>, Record<string, unknown>>;
  body?: z.ZodType;
  return?: z.ZodType;
};
export type TPrepareHandlerIOShapes = () => THandlerIOShapes;
export type THandlerOpts = {
  shape?: TPrepareHandlerIOShapes;
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

export type TRouter = Record<
  Exclude<TMethod, "delete"> | "del",
  TRegisterMethod
>;

export type TRegisterFn = (
  router: TRouter,
) => void;

export class Router {
  protected rootPath?: string;
  protected parser?: MatchFunction<Record<string, string>>;
  protected methodNames = new Set<string>();
  protected registry: Map<
    string,
    {
      fullPath: string;
      endpoint: string;
      parser: MatchFunction<Record<string, string>>;
      methods: {
        [K in TMethod]?: {
          name: string;
          handler: TPreparedHandler;
        };
      };
    }
  > = new Map();

  public name: string;

  constructor(
    registerFn: TRegisterFn,
  );
  constructor(
    root: string,
    registerFn: TRegisterFn,
  );
  constructor(
    root: string | TRegisterFn,
    registerFn?: TRegisterFn,
  ) {
    let rootPath: string | undefined;
    let fn: TRegisterFn;

    if (typeof root === "function") {
      fn = root;
    } else {
      rootPath = root;

      if (!registerFn) {
        throw new Error("Register function must be provided!");
      }

      fn = registerFn;
    }

    if (!fn.name) {
      throw new Error("A named function should be passed to router!");
    }

    this.name = fn.name;

    if (rootPath) {
      this.rootPath = rootPath;
      this.parser = match(`/${rootPath.replace(/^\/|\/$/g, "")}{*__endpoint}`);
    }

    // deno-lint-ignore no-explicit-any
    fn(this as any);
  }

  protected toFullPath(endpoint: string) {
    return "/" + this.rootPath?.replace(/^\/|\/$/g, "") +
      endpoint;
  }

  protected registerMethod(
    endpoint: string,
    prepare: TPrepareHandler,
    method?: TMethod,
  ) {
    if (!prepare.name) {
      throw new Error("A named function should be passed to route handler!");
    }

    if (this.methodNames.has(prepare.name)) {
      throw new Error(
        `An endpoint function with same name '${prepare.name}' already exists in this router!`,
      );
    }

    this.methodNames.add(prepare.name);

    const resolvedMethod = method || "all";

    const routing = this.registry.get(endpoint);

    if (!routing) {
      this.registry.set(endpoint, {
        fullPath: this.toFullPath(endpoint),
        endpoint,
        parser: match(endpoint),
        methods: {
          [resolvedMethod]: {
            name: prepare.name,
            handler: prepare(),
          },
        },
      });

      return this;
    }

    if (routing.methods[resolvedMethod]) {
      throw new Error(
        "Defining two routes with same endpoint and method is ambiguous!",
      );
    }

    routing.methods[resolvedMethod] = {
      name: prepare.name,
      handler: prepare(),
    };

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

  protected del: TRegisterMethod = (path, prepare) =>
    this.registerMethod(path, prepare, "delete");

  protected all: TRegisterMethod = (path, prepare) =>
    this.registerMethod(path, prepare);

  protected tryHandle = async (callback: () => Promise<Response>) => {
    try {
      return await callback();
    } catch (error) {
      if (error instanceof ZodError) {
        return Response.json({
          error: z.prettifyError(error),
        }, { status: 400 });
      }

      if (error instanceof Response) {
        return error;
      }

      return Response.json({
        error: error instanceof Error
          ? {
            message: error.message,
            name: error.name,
            stack: Env.is(EnvType.DEVELOPMENT) ? error.stack : undefined,
          }
          : error,
      }, { status: 500 });
    }
  };

  protected handle = (
    details?: {
      name?: string;
      handler?: TPreparedHandler;
    },
    match?: MatchResult<Record<string, string>>,
  ) => {
    return async (req: Request, ...hooks: THook[]) => {
      return await this.tryHandle(async () => {
        const res = await this.tryHandle(async () => {
          for (const hook of hooks) {
            if (typeof hook.pre === "function") {
              const hookRes = await hook.pre({
                req,
                scope: this.name,
                name: details?.name,
              });

              if (hookRes instanceof Response) return hookRes;
            }
          }

          match && paramsMap.set(req, match.params);

          const handler = details?.handler;

          if (typeof handler === "function") {
            return await handler(req);
          } else {
            return await handler?.handler(req) ??
              new Response("Request handler not found", { status: 404 });
          }
        });

        for (const hook of hooks) {
          if (typeof hook.post === "function") {
            const hookRes = await hook.post({
              req,
              res,
              scope: this.name,
              name: details?.name,
            });

            if (hookRes instanceof Response) return hookRes;
          }
        }

        return res;
      });
    };
  };

  public route(method: TMethod, endpoint: string) {
    let targetEndpoint = endpoint;

    if (this.parser) {
      const match = this.parser(endpoint);

      if (!match) return;

      targetEndpoint = "/" +
        ((match.params.__endpoint as unknown as Array<string> | undefined)
          ?.filter(Boolean).join("/") ?? "");
    }

    for (const routing of this.registry.values()) {
      const match = routing.parser(targetEndpoint);

      if (!match) continue;

      const handlerObj = routing.methods[method] || routing.methods["all"];

      if (handlerObj) {
        return this.handle(handlerObj, match);
      }
    }

    return this.handle();
  }
}
