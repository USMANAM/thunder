import type { THook } from "./hooks.ts";

export const paramsMap = new WeakMap<Request, Record<string, string>>();
export const indexFileCache = new Map<string, string>();
export const hooksCache = new Map<string, Promise<THook[]>>();
export const routesCache = new Map<
  string,
  Promise<{
    fallback?: true;
    // deno-lint-ignore no-explicit-any
    module: any;
  }>
>();
