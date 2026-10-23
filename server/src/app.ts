/**
 * src/app.ts
 * Creates and configures the Express application.
 * Kept separate from the HTTP server so it can be imported in tests.
 */

import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import instrumentsRouter from "./routes/instruments";

export function createApp(): Application {
  const app = express();

  // ── Middleware ──────────────────────────────────────────────────────────
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: true,
    })
  );
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ── Routes ──────────────────────────────────────────────────────────────
  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/instruments", instrumentsRouter);

  // 404 handler — must come after all routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found", message: "Resource not found" });
  });

  // Global centralized error handler — does not leak internal stack traces to clients
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Internal Server Error:", err.message);
    res.status(500).json({
      error: "Internal server error",
      message:
        env.NODE_ENV === "development"
          ? err.message
          : "An unexpected error occurred.",
    });
  });

  return app;
}
