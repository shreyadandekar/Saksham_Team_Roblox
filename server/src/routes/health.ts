/**
 * src/routes/health.ts
 * GET /api/health – basic liveness probe.
 */

import { Router, Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "fdr-sentinel-api",
    timestamp: new Date().toISOString(),
  });
});

export default router;
