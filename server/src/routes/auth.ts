/**
 * src/routes/auth.ts
 * Authentication endpoints: login, logout, and current user profile.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { comparePassword } from "../utils/password";
import { signAccessToken } from "../utils/jwt";
import { requireAuth } from "../middleware/auth";
import { env } from "../config/env";
import { SafeUser } from "../types/auth";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /api/auth/login
 * Validates credentials, sets HttpOnly access cookie, and returns safe user.
 */
router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const validation = loginSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          error: "Validation error",
          issues: validation.error.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
        });
        return;
      }

      const { email, password } = validation.data;

      // Look up user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Constant-time check / generic message to avoid email enumeration
      if (!user) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password",
        });
        return;
      }

      if (!user.isActive) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Account has been deactivated. Please contact support.",
        });
        return;
      }

      const passwordMatches = await comparePassword(
        password,
        user.passwordHash
      );
      if (!passwordMatches) {
        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password",
        });
        return;
      }

      const safeUser: SafeUser = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        institutionId: user.institutionId,
      };

      const token = signAccessToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        institutionId: user.institutionId,
      });

      // Set HttpOnly cookie for browser security against XSS
      res.cookie("fdr_token", token, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 1000, // 1 hour
        path: "/",
      });

      res.status(200).json({
        message: "Login successful",
        token, // returned for non-cookie / API clients
        user: safeUser,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/logout
 * Clears the HttpOnly authentication cookie.
 * Semantics: With short-lived JWTs, the cookie is purged from the browser
 * so subsequent browser requests cannot authenticate.
 */
router.post("/logout", (_req: Request, res: Response) => {
  res.clearCookie("fdr_token", {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  res.status(200).json({
    message: "Logged out successfully",
  });
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user's safe profile.
 */
router.get(
  "/me",
  requireAuth,
  (req: Request, res: Response): void => {
    res.status(200).json({
      user: req.user,
    });
  }
);

export default router;
