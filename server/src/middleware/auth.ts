/**
 * src/middleware/auth.ts
 * Authentication and Role-Based Access Control (RBAC) middleware.
 * Verifies JWT tokens from HttpOnly cookies or Bearer headers and
 * resolves the user from the database to guarantee the account is active.
 */

import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../db/prisma";

export function extractToken(req: Request): string | null {
  // Check HttpOnly cookie first (primary browser mechanism)
  if (req.cookies && typeof req.cookies.fdr_token === "string") {
    return req.cookies.fdr_token;
  }

  // Fallback to Authorization: Bearer header (for API clients, automated tests)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);

  if (!token) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token is missing. Please log in.",
    });
    return;
  }

  const payload = verifyAccessToken(token);

  if (!payload) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token is invalid or expired.",
    });
    return;
  }

  try {
    // Resolve user from database to ensure account is active and role/institutionId are current
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        institutionId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Account does not exist or has been deactivated.",
      });
      return;
    }

    req.user = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      institutionId: user.institutionId,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function matchesRole(userRole: Role, targetRole: Role): boolean {
  if (userRole === targetRole) return true;
  // Backward compatibility during migration:
  // Legacy AICTE_OFFICER maps strictly to SCRUTINY_OFFICER
  if (targetRole === Role.SCRUTINY_OFFICER && userRole === Role.AICTE_OFFICER) return true;
  if (targetRole === Role.AICTE_OFFICER && userRole === Role.SCRUTINY_OFFICER) return true;
  // Legacy SYSTEM_ADMIN maps strictly to ADMIN
  if (targetRole === Role.ADMIN && userRole === Role.SYSTEM_ADMIN) return true;
  if (targetRole === Role.SYSTEM_ADMIN && userRole === Role.ADMIN) return true;

  // IMPORTANT: Neither ADMIN nor SYSTEM_ADMIN may ever match APPROVER or SCRUTINY_OFFICER
  // AICTE_OFFICER / SCRUTINY_OFFICER may never match APPROVER
  return false;
}

export function requireRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required.",
      });
      return;
    }

    const isAuthorized = allowedRoles.some((role) => matchesRole(req.user!.role, role));

    if (!isAuthorized) {
      res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to access this resource.",
      });
      return;
    }

    next();
  };
}

