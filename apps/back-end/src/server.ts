import { createApp } from "./app.js";
import { env } from "./core/config/env.js";
import { initEventHub } from "./bootstrap/event-hub.js";
import { initPrisma, shutdownPrisma } from "./bootstrap/prisma-runtime.js";
import { logger } from "./core/logger.js";

await initPrisma();
initEventHub();
const app = createApp();
const port = env.PORT ?? 4000;

app.listen(port, () => {
  logger.info(`🚀 API running at http://localhost:${port}`);
});

const exitHandler = () => {
  shutdownPrisma()
    .catch((error) => {
      logger.error("Failed to shutdown Prisma", { error });
    })
    .finally(() => {
      process.exit(0);
    });
};

process.on("SIGINT", exitHandler);
process.on("SIGTERM", exitHandler);
