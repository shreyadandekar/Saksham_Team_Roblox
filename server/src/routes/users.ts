/**
 * src/routes/users.ts
 * Dedicated user management module for ADMIN role.
 * Enforces least-privilege, auditability, self-demotion/deactivation protections,
 * and safe output serialization (never exposing password hashes or credentials).
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../db/prisma";
import { requireAuth, requireRoles } from "../middleware/auth";
import { hashPassword } from "../utils/password";

const router = Router();

// Gated strictly to ADMIN and legacy SYSTEM_ADMIN
router.use(requireAuth, requireRoles(Role.ADMIN, Role.SYSTEM_ADMIN));

const createUserSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.nativeEnum(Role, { errorMap: () => ({ message: "Invalid role specified" }) }),
  institutionId: z.string().trim().nullable().optional(),
});

const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  role: z.nativeEnum(Role).optional(),
  institutionId: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});

/**
 * GET /api/users
 * Lists user accounts without exposing password hashes.
 */
router.get("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { role, search, page = "1", limit = "20" } = req.query;

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (role && typeof role === "string" && Object.values(Role).includes(role as Role)) {
      where.role = role as Role;
    }

    if (search && typeof search === "string" && search.trim()) {
      const q = search.trim();
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          institutionId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          institution: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.user.count({ where }),
    ]);

    res.status(200).json({
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/users
 * Creates a new user account with hashed password and audit logging.
 */
router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = req.user!;
    const parsed = createUserSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Validation Error",
        message: "Invalid user creation particulars.",
        issues: parsed.error.issues,
      });
      return;
    }

    const { fullName, email, password, role, institutionId } = parsed.data;

    // Check email uniqueness
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      res.status(409).json({
        error: "Conflict",
        message: "A user with this email address already exists.",
      });
      return;
    }

    // If INSTITUTION_USER, institutionId is mandatory
    if (role === Role.INSTITUTION_USER && !institutionId) {
      res.status(400).json({
        error: "Validation Error",
        message: "institutionId is mandatory for INSTITUTION_USER role.",
      });
      return;
    }

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName,
          email: email.toLowerCase(),
          passwordHash,
          role,
          institutionId: institutionId || null,
          isActive: true,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          institutionId: true,
          isActive: true,
          createdAt: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId: caller.id,
          action: "USER_CREATED",
          entityType: "User",
          entityId: created.id,
          metadata: {
            createdUserEmail: created.email,
            assignedRole: created.role,
            institutionId: created.institutionId,
          },
        },
      });

      return created;
    });

    res.status(201).json({
      message: "User account created successfully.",
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/users/:id
 * Updates an existing user account with protection against self-deactivation
 * and removing the last administrator.
 */
router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const caller = req.user!;
    const targetUserId = String(req.params.id);

    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Validation Error",
        message: "Invalid update fields.",
        issues: parsed.error.issues,
      });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      res.status(404).json({
        error: "Not Found",
        message: "User account not found.",
      });
      return;
    }

    const { fullName, role, institutionId, isActive } = parsed.data;

    // Protection 1: Prevent self-deactivation
    if (caller.id === targetUserId && isActive === false) {
      res.status(400).json({
        error: "Bad Request",
        message: "Administrators cannot deactivate their own active account.",
      });
      return;
    }

    // Protection 2: Prevent self-demotion from administrative role
    if (
      caller.id === targetUserId &&
      role &&
      role !== Role.ADMIN &&
      role !== Role.SYSTEM_ADMIN
    ) {
      res.status(400).json({
        error: "Bad Request",
        message: "Administrators cannot remove their own administrator privileges.",
      });
      return;
    }

    // Protection 3: Prevent deactivating or demoting the last active administrator
    if (
      (targetUser.role === Role.ADMIN || targetUser.role === Role.SYSTEM_ADMIN) &&
      (isActive === false || (role && role !== Role.ADMIN && role !== Role.SYSTEM_ADMIN))
    ) {
      const activeAdminCount = await prisma.user.count({
        where: {
          role: { in: [Role.ADMIN, Role.SYSTEM_ADMIN] },
          isActive: true,
        },
      });

      if (activeAdminCount <= 1) {
        res.status(400).json({
          error: "Bad Request",
          message: "Cannot deactivate or demote the system's sole remaining active administrator.",
        });
        return;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.user.update({
        where: { id: targetUserId },
        data: {
          ...(fullName !== undefined && { fullName }),
          ...(role !== undefined && { role }),
          ...(institutionId !== undefined && { institutionId }),
          ...(isActive !== undefined && { isActive }),
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          institutionId: true,
          isActive: true,
          updatedAt: true,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorId: caller.id,
          action: "USER_UPDATED",
          entityType: "User",
          entityId: targetUserId,
          metadata: {
            changes: parsed.data,
            targetEmail: targetUser.email,
          },
        },
      });

      return result;
    });

    res.status(200).json({
      message: "User account updated successfully.",
      user: updated,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
