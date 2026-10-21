import { createReadStream, existsSync } from "node:fs";
import path from "node:path";

import type { FastifyInstance } from "fastify";

/** Логотипы партнёров лежат файлами в server/assets/partners и раздаются без пересборки приложения. */
const DIR = path.resolve(process.cwd(), "assets/partners");

const TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

export async function registerPartnerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/partners/:file", async (request, reply) => {
    const { file } = request.params as { file: string };
    const safe = path.basename(file);
    const full = path.join(DIR, safe);
    if (!full.startsWith(DIR) || !existsSync(full)) {
      return reply.code(404).send({ error: "not_found", message: "Логотип не найден" });
    }
    const type = TYPES[path.extname(safe).toLowerCase()] ?? "application/octet-stream";
    return reply
      .header("content-type", type)
      .header("cache-control", "public, max-age=3600")
      .send(createReadStream(full));
  });
}
