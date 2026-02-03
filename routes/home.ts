import { Router } from "@/core/http/router.ts";
import { Env } from "@/core/utils/env.ts";

export default new Router("/api/", function home({ get }) {
  get("/", function status() {
    return () => {
      return Response.json({
        environment: Env.getType(),
        msg: "Thunder api is listening the requests...",
      });
    };
  });
});
