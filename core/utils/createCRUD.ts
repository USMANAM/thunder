// deno-lint-ignore-file no-explicit-any
import { TRouter } from "@/core/http/router.ts";
import z from "zod";
import { bodyAsJson, paramsAsJson } from "@/core/http/utils.ts";
import { Collection, ObjectId } from "mongodb";
import { Response } from "@/core/http/response.ts";

export type TCrudDetails<T extends z.ZodObject> = {
  router: TRouter;
  schema: T;
  model: Collection<z.infer<T>>;
  insertSchema?: z.ZodObject;
  updateSchema?: z.ZodObject;
};

export type TCrudOptions<T extends z.ZodObject> = {
  disable?: {
    create?: boolean;
    get?: boolean;
    update?: boolean;
    del?: boolean;
  };
  isolationFields?: (req: Request) => {
    [K in keyof z.infer<T>]?: unknown;
  };
};

export const createCRUD = <T extends z.ZodObject>(
  details: TCrudDetails<T>,
  opts?: TCrudOptions<T>,
) => {
  if (!opts?.disable?.create) {
    details.router.post("/", function create() {
      const $body = details.insertSchema ?? details.schema;
      const $return = z.object({
        _id: z.instanceof(ObjectId),
      });

      return {
        shape: () => ({
          body: $body,
          return: $return,
        }),
        handler: async (req: Request) => {
          const body = $body.parse(await bodyAsJson(req));

          const { insertedId } = await details.model.insertOne(
            details.schema.parse({
              ...body,
              ...opts?.isolationFields?.(req),
            }) as any,
          );

          return Response.json({
            _id: insertedId.toString(),
          });
        },
      };
    });
  }

  if (!opts?.disable?.get) {
    details.router.get("{/:id}", function get() {
      const $params = z.object({
        id: z.string().optional(),
      });
      const $return = z.object({
        results: z.array(details.schema.extend({
          _id: z.instanceof(ObjectId),
        })),
      });

      return {
        shape: () => ({
          params: $params,
          return: $return,
        }),
        handler: async (req: Request) => {
          const params = $params.parse(paramsAsJson(req));

          const resultsQuery = details.model.find(
            {
              ...(params.id ? { _id: new ObjectId(params.id) } : {}),
              ...opts?.isolationFields?.(req),
            } as any,
          );

          return Response.json(
            {
              results: await resultsQuery.toArray(),
            },
          );
        },
      };
    });
  }

  const $params = z.object({
    id: z.string(),
  });

  if (opts?.disable?.update) {
    details.router.patch("/:id", function update() {
      const $body =
        (details.updateSchema ?? details.insertSchema ?? details.schema)
          .partial();

      return {
        shape: () => ({
          params: $params,
          body: $body,
        }),
        handler: async (req: Request) => {
          const params = $params.parse(paramsAsJson(req));
          const body = $body.parse(await bodyAsJson(req));

          const { modifiedCount } = await details.model.updateOne(
            {
              _id: new ObjectId(params.id),
              ...opts?.isolationFields?.(req),
            } as any,
            body,
          );

          if (!modifiedCount) throw new Error("No record updated!");

          return Response.ok();
        },
      };
    });
  }

  if (opts?.disable?.del) {
    details.router.del("/:id", function del() {
      return {
        shape: () => ({
          params: $params,
        }),
        handler: async (req: Request) => {
          const params = $params.parse(paramsAsJson(req));

          const { deletedCount } = await details.model.deleteOne({
            _id: new ObjectId(params.id),
            ...opts?.isolationFields?.(req),
          } as any);

          if (!deletedCount) throw new Error("No record deleted!");

          return Response.ok();
        },
      };
    });
  }
};
