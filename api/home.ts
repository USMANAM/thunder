import { Router } from "@core/http/router.ts";

export default new Router("/api/", function home({ get }) {
  get("/", function status() {
    return () => {
      return Response.json({
        success: true,
        msg: "Thunder api is listening the requests...",
      });
    };
  });
});
