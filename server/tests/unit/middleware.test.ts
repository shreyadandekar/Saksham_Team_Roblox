import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { requireAuth, requireRoles } from "../../src/middleware/auth";
import { signAccessToken } from "../../src/utils/jwt";
import { Role } from "@prisma/client";
import { prisma } from "../../src/db/prisma";

// Mock prisma for isolated unit testing
vi.mock("../../src/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe("Auth Middleware (requireAuth)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    req = { headers: {}, cookies: {} };
    res = { status: statusMock };
    next = vi.fn();
    vi.clearAllMocks();
  });

  it("should return 401 when token is missing", async () => {
    await requireAuth(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Unauthorized" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when token is invalid or malformed", async () => {
    req.headers = { authorization: "Bearer invalid.token.payload" };

    await requireAuth(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/invalid or expired/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 when user account is inactive in the database", async () => {
    const token = signAccessToken({
      sub: "inactive-user-id",
      email: "inactive@example.com",
      role: Role.INSTITUTION_USER,
      institutionId: "inst-1",
    });
    req.cookies = { fdr_token: token };

    // DB returns user as deactivated
    (prisma.user.findUnique as any).mockResolvedValue({
      id: "inactive-user-id",
      fullName: "Deactivated User",
      email: "inactive@example.com",
      role: Role.INSTITUTION_USER,
      institutionId: "inst-1",
      isActive: false,
    });

    await requireAuth(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/deactivated/i),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should attach user and call next() when token and user are valid", async () => {
    const token = signAccessToken({
      sub: "valid-user-id",
      email: "active@example.com",
      role: Role.INSTITUTION_USER,
      institutionId: "inst-1",
    });
    req.headers = { authorization: `Bearer ${token}` };

    (prisma.user.findUnique as any).mockResolvedValue({
      id: "valid-user-id",
      fullName: "Active User",
      email: "active@example.com",
      role: Role.INSTITUTION_USER,
      institutionId: "inst-1",
      isActive: true,
    });

    await requireAuth(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({
      id: "valid-user-id",
      fullName: "Active User",
      email: "active@example.com",
      role: Role.INSTITUTION_USER,
      institutionId: "inst-1",
    });
  });
});

describe("RBAC Middleware (requireRoles)", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonMock: any;
  let statusMock: any;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    req = { user: undefined };
    res = { status: statusMock };
    next = vi.fn();
  });

  it("should return 401 if user is not attached to request", () => {
    const middleware = requireRoles(Role.SYSTEM_ADMIN);
    middleware(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 403 if user role is not authorized", () => {
    req.user = {
      id: "u1",
      fullName: "Inst User",
      email: "inst@demo.com",
      role: Role.INSTITUTION_USER,
      institutionId: "inst-1",
    };

    const middleware = requireRoles(Role.SYSTEM_ADMIN, Role.AICTE_OFFICER);
    middleware(req as Request, res as Response, next);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Forbidden" })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next() if user role is authorized", () => {
    req.user = {
      id: "u2",
      fullName: "Officer User",
      email: "officer@aicte.gov.in",
      role: Role.AICTE_OFFICER,
      institutionId: null,
    };

    const middleware = requireRoles(Role.SYSTEM_ADMIN, Role.AICTE_OFFICER);
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });
});
