import { discover } from "@/core/http/discover.ts";

import "./database.ts";

export default async (req: Request) => {
  const exec = await discover(req, {
    routes: "./routes",
    hooks: "./hooks",
  });

  return exec(req);
};
