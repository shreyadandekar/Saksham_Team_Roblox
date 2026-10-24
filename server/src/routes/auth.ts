/**
 * src/routes/auth.ts
 * Authentication endpoints: login, logout, and current user profile.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { comparePassword } from "../utils/password";
import { signAccessToken, verifyAccessToken } from "../utils/jwt";
import { requireAuth, extractToken } from "../middleware/auth";
import { createLoginRateLimiter, clearLoginAttempt } from "../middleware/rateLimit";
import { env } from "../config/env";
import { SafeUser } from "../types/auth";

const router = Router();
const loginLimiter = createLoginRateLimiter();

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

/**
 * POST /api/auth/login
 * Validates credentials, sets HttpOnly access cookie, records audit event, and returns safe user.
 */
router.post(
  "/login",
  loginLimiter,
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
        // Record failed attempt without revealing account existence or exposing passwords
        await prisma.auditEvent.create({
          data: {
            actorId: null,
            action: "LOGIN_FAILED",
            entityType: "User",
            entityId: "UNKNOWN",
            metadata: {
              email: email.toLowerCase(),
              reason: "INVALID_CREDENTIALS",
            },
          },
        }).catch((err) => {
          console.error("Failed to record login failure audit event:", err);
        });

        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password",
        });
        return;
      }

      if (!user.isActive) {
        await prisma.auditEvent.create({
          data: {
            actorId: user.id,
            action: "LOGIN_FAILED",
            entityType: "User",
            entityId: user.id,
            metadata: {
              email: user.email,
              reason: "ACCOUNT_DEACTIVATED",
            },
          },
        }).catch((err) => {
          console.error("Failed to record login failure audit event:", err);
        });

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
        await prisma.auditEvent.create({
          data: {
            actorId: user.id,
            action: "LOGIN_FAILED",
            entityType: "User",
            entityId: user.id,
            metadata: {
              email: user.email,
              reason: "INVALID_CREDENTIALS",
            },
          },
        }).catch((err) => {
          console.error("Failed to record login failure audit event:", err);
        });

        res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password",
        });
        return;
      }

      // Reset failed login attempt counter for this IP on successful authentication
      clearLoginAttempt(req);

      // Record successful login audit event
      await prisma.auditEvent.create({
        data: {
          actorId: user.id,
          action: "LOGIN_SUCCESS",
          entityType: "User",
          entityId: user.id,
          metadata: {
            email: user.email,
            role: user.role,
          },
        },
      }).catch((err) => {
        console.error("Failed to record login audit event:", err);
      });

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
 * Clears the HttpOnly authentication cookie and records LOGOUT audit event if token present.
 * Semantics: With short-lived JWTs, the cookie is purged from the browser
 * so subsequent browser requests cannot authenticate.
 */
router.post("/logout", async (req: Request, res: Response): Promise<void> => {
  const token = extractToken(req);
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      await prisma.auditEvent.create({
        data: {
          actorId: payload.sub,
          action: "LOGOUT",
          entityType: "User",
          entityId: payload.sub,
          metadata: {
            email: payload.email,
            role: payload.role,
          },
        },
      }).catch((err) => {
        console.error("Failed to record logout audit event:", err);
      });
    }
  }

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
