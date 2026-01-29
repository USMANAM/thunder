import { Env } from "@/core/utils/env.ts";
import { MongoClient } from "mongodb";

export const mongodb = new MongoClient(Env.getSync("DATABASE_URL"), {
  maxPoolSize: 30,
  waitQueueTimeoutMS: 10000,
});
