/**
 * src/index.ts
 * Entry point – creates the HTTP server and starts listening.
 * Initializes the background maturity monitoring scheduler singleton.
 */

import { env } from "./config/env";
import { createApp } from "./app";
import { startMaturityScheduler, stopMaturityScheduler } from "./scheduler/maturityScheduler";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`✅  Saksham API running on http://localhost:${env.PORT}`);
  console.log(`    Environment : ${env.NODE_ENV}`);
  console.log(`    Health check: http://localhost:${env.PORT}/api/health`);

  // Start the background daily maturity & attention priority monitoring scheduler
  if (env.NODE_ENV !== "test") {
    startMaturityScheduler();
  }
});

// Graceful process shutdown
function handleShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Gracefully stopping Saksham API...`);
  stopMaturityScheduler();
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));
