import { Env } from "./core/common/env.ts";
import { Surreal } from "surrealdb";

export const db = new Surreal();

const connectionString = Env.getSync("DATABASE_URL");
const connectionURL = new URL(connectionString);

const namespace = connectionURL.searchParams.get("namespace") ?? undefined;
const database = connectionURL.searchParams.get("database") ?? undefined;
const username = connectionURL.username;
const password = connectionURL.password;

await db.connect(
  connectionURL.origin + connectionURL.pathname,
  {
    namespace,
    database,
    auth: {
      namespace,
      database,
      username,
      password,
    },
  },
);
