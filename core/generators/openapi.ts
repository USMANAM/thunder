// import { createDocument, ZodOpenApiPathsObject } from "zod-openapi";
// import { join } from "@std/path/posix/join";
// import { generateModules } from "./sdk.ts";

// export type TGenerateOpenAPIOpts = {
//   title?: string;
//   version?: string;
//   routesDir?: string;
//   outputDir?: string;
//   cwd?: string;
//   skipWrite?: boolean;
// };

// export const generateOpenAPI = async (opts: TGenerateOpenAPIOpts) => {
//   const cwd = opts?.cwd ?? Deno.cwd();
//   const title = opts?.title ?? "thunder-api";
//   const version = opts?.version ?? "0.0.0";
//   const outputPath = join(
//     cwd,
//     opts?.outputDir ?? "./public/www/openapi",
//   );

//   const paths: ZodOpenApiPathsObject = {};

//   const modules = await generateModules(
//     opts?.routesDir ?? "./routes",
//     { cwd },
//   );

//   const document = createDocument({
//     openapi: "3.1.0",
//     info: {
//       title,
//       version,
//     },
//     paths: {
//       "/jobs/{jobId}": {
//         put: {
//           requestParams: { path: z.object({ jobId }) },
//           requestBody: {
//             content: {
//               "application/json": { schema: z.object({ title }) },
//             },
//           },
//           responses: {
//             "200": {
//               description: "200 OK",
//               content: {
//                 "application/json": { schema: z.object({ jobId, title }) },
//               },
//             },
//           },
//         },
//       },
//     },
//   });
// };
