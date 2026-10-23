/**
 * src/app.ts
 * Creates and configures the Express application.
 * Kept separate from the HTTP server so it can be imported in tests.
 */

import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import { env } from "./config/env";
import healthRouter from "./routes/health";

export function createApp(): Application {
  const app = express();

  // ── Middleware ──────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Routes ──────────────────────────────────────────────────────────────
  app.use("/api/health", healthRouter);

  // 404 handler — must come after all routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  // Global error handler — must have four parameters
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
