import { discover } from "@/core/http/discover.ts";

export default async (req: Request) => {
  const exec = await discover(req, {
    apis: "./apis",
    hooks: "./hooks",
  });

  return exec(req);
};
