import { Router } from "@core/http/router.ts";
import { paramsAsJson, serveAssets } from "@core/http/utils.ts";
import { fromFileUrl } from "@std/path/from-file-url";
import z from "zod";

export default new Router("/", function index({ get }) {
  get("/{*endpoint}", function index() {
    const $params = z.object({
      endpoint: z.array(z.string()).optional(),
    });

    return (req) => {
      const { endpoint } = $params.parse(paramsAsJson(req));

      return serveAssets(
        req,
        fromFileUrl(import.meta.resolve("../public/www")),
        endpoint?.join("/"),
      );
    };
  });
});
