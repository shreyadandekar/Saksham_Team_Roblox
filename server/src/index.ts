/**
 * src/index.ts
 * Entry point – creates the HTTP server and starts listening.
 */

import { env } from "./config/env";
import { createApp } from "./app";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`✅  FDR Sentinel API running on http://localhost:${env.PORT}`);
  console.log(`    Environment : ${env.NODE_ENV}`);
  console.log(`    Health check: http://localhost:${env.PORT}/api/health`);
});
