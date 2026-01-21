import { discover } from "@/core/http/discover.ts";

export default async (req: Request) => {
  const exec = await discover(req, {
    api: "./api",
    hooks: "./hooks",
  });

  if (typeof exec === "function") return exec(req);

  return new Response("Not found", { status: 404 });
};
