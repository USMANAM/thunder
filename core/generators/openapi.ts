import { createDocument, ZodOpenApiPathsObject } from "zod-openapi";
// import { join } from "@std/path/posix/join";
import { generateModules } from "./sdk.ts";

export type TGenerateOpenAPIContentOpts = {
  title?: string;
  version?: string;
  routesDir?: string;
  outputDir?: string;
  cwd?: string;
  overwrite?: boolean;
  skipWrite?: boolean;
};

export const generateOpenAPIContent = async (
  opts: TGenerateOpenAPIContentOpts,
) => {
  const cwd = opts?.cwd ?? Deno.cwd();
  const title = opts?.title ?? "thunder-api";
  const version = opts?.version ?? "0.0.0";
  //   const outputPath = join(
  //     cwd,
  //     opts?.outputDir ?? "./public/www",
  //   );

  const paths: ZodOpenApiPathsObject = {};

  const modules = await generateModules(
    opts?.routesDir ?? "./routes",
    { cwd },
  );

  for (const [_, moduleDetails] of Object.entries(modules)) {
    for (
      const [method, methodDetails] of Object.entries(moduleDetails.methods)
    ) {
      const path = paths[`${moduleDetails.name}${methodDetails.endpoint}`] ??=
        {};

      path[method as "get"] = {
        requestParams: {
          ...(methodDetails.shapes?.headers
            ? { header: methodDetails.shapes.headers }
            : {}),
          ...(methodDetails.shapes?.params
            ? { path: methodDetails.shapes.params }
            : {}),
          ...(methodDetails.shapes?.query
            ? { query: methodDetails.shapes.query }
            : {}),
        },
        ...(methodDetails.shapes?.body
          ? {
            requestBody: {
              content: {
                "application/json": { schema: methodDetails.shapes.body },
              },
            },
          }
          : {}),
        responses: {
          "200": {
            description: "200 OK",
            ...(methodDetails.shapes?.return
              ? {
                content: {
                  "application/json": { schema: methodDetails.shapes.return },
                },
              }
              : {}),
          },
        },
      };
    }
  }

  const document = createDocument({
    openapi: "3.1.0",
    info: {
      title,
      version,
    },
    paths,
  });

  console.log(document);
};
