import { buildApp } from "./app.js";
import { readEnv } from "./env.js";
import { createDb } from "./supabase.js";

async function main(): Promise<void> {
  const env = readEnv();
  const db = createDb(env);
  const app = await buildApp(env, db);

  const close = async (signal: string): Promise<void> => {
    app.log.info("остановка по сигналу " + signal);
    await app.close();
    process.exit(0);
  };
  process.on("SIGINT", () => void close("SIGINT"));
  process.on("SIGTERM", () => void close("SIGTERM"));

  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info("Moby Family API слушает " + env.HOST + ":" + env.PORT);
}

main().catch((error: unknown) => {
  console.error("Не удалось запустить API:", error);
  process.exit(1);
});
