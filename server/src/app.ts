/**
 * src/app.ts
 * Creates and configures the Express application.
 * Kept separate from the HTTP server so it can be imported in tests.
 */

import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import { env } from "./config/env";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import instrumentsRouter from "./routes/instruments";
import scrutinyRouter from "./routes/scrutiny";
import documentsRouter from "./routes/documents";
import custodyRouter from "./routes/custody";
import monitoringRouter from "./routes/monitoring";
import dashboardRouter from "./routes/dashboard";
import releaseRouter from "./routes/release";
import auditRouter from "./routes/audit";
import ocrRouter from "./routes/ocr";
import usersRouter from "./routes/users";
import clearancesRouter from "./routes/clearances";

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
  app.use("/api/instruments/:instrumentId/documents", documentsRouter);
  app.use("/api/instruments/:instrumentId/custody", custodyRouter);
  app.use("/api/instruments/:instrumentId/release", releaseRouter);
  app.use("/api/instruments/:instrumentId/ocr", ocrRouter);
  app.use("/api/scrutiny", scrutinyRouter);
  app.use("/api/monitoring", monitoringRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/clearances", clearancesRouter);

  // 404 handler — must come after all routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found", message: "Resource not found" });
  });

  // Multer error handler — converts upload validation errors to user-friendly responses.
  // Must be registered BEFORE the global error handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error & { code?: string }, _req: Request, res: Response, next: NextFunction): void => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          error: "File Too Large",
          message: `Uploaded file exceeds the maximum allowed size of ${Math.round(env.MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
        });
        return;
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        res.status(415).json({
          error: "Unsupported Media Type",
          message: err.message,
        });
        return;
      }
    }
    next(err);
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
