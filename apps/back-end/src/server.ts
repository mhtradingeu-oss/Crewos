import { createApp } from "./app.js";
import { env } from "./core/config/env.js";
import { initEventHub } from "./core/events/register.js";

initEventHub();
const app = createApp();
const port = env.PORT ?? 4000;

app.listen(port, () => {
  console.log(`🚀 API running at http://localhost:${port}`);
});
