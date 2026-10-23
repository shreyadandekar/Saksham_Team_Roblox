import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app";
import { prisma } from "../../src/db/prisma";
import { hashPassword } from "../../src/utils/password";
import { signAccessToken } from "../../src/utils/jwt";
import { Role } from "@prisma/client";

vi.mock("../../src/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    instrument: {
      findMany: vi.fn(),
    },
  },
}));

describe("Authentication Routes (/api/auth)", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/login", () => {
    it("should return 400 on malformed request body", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "not-an-email" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation error");
    });

    it("should return 401 on non-existent email without user enumeration", async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "unknown@example.com", password: "Password123" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });

    it("should return 401 if user account is deactivated", async () => {
      const hashedPassword = await hashPassword("ValidPassword123");
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "inactive-1",
        email: "inactive@college.edu",
        passwordHash: hashedPassword,
        isActive: false,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "inactive@college.edu", password: "ValidPassword123" });

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/deactivated/i);
    });

    it("should return 401 on wrong password", async () => {
      const hashedPassword = await hashPassword("CorrectPassword123");
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-1",
        email: "user@college.edu",
        passwordHash: hashedPassword,
        isActive: true,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "user@college.edu", password: "WrongPassword" });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Invalid email or password");
    });

    it("should return 200, safe user, token, and set HttpOnly cookie on successful login", async () => {
      const hashedPassword = await hashPassword("CorrectPassword123");
      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-123",
        fullName: "Dr. Vikram Patel",
        email: "vikram@engineering.edu",
        passwordHash: hashedPassword,
        role: Role.INSTITUTION_USER,
        institutionId: "inst-eng-1",
        isActive: true,
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "vikram@engineering.edu",
          password: "CorrectPassword123",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Login successful");
      expect(res.body.token).toBeDefined();

      // Ensure passwordHash is NEVER exposed in the response
      expect(res.body.user).toEqual({
        id: "user-123",
        fullName: "Dr. Vikram Patel",
        email: "vikram@engineering.edu",
        role: Role.INSTITUTION_USER,
        institutionId: "inst-eng-1",
      });
      expect(res.body.user.passwordHash).toBeUndefined();

      // Verify Set-Cookie header contains fdr_token with HttpOnly
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieString = Array.isArray(cookies) ? cookies.join("; ") : cookies;
      expect(cookieString).toContain("fdr_token=");
      expect(cookieString.toLowerCase()).toContain("httponly");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should clear the fdr_token cookie and return 200", async () => {
      const res = await request(app).post("/api/auth/logout");

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/logged out/i);

      // Verify cookie is cleared (expires in the past / cleared)
      const cookies = res.headers["set-cookie"];
      expect(cookies).toBeDefined();
      const cookieString = Array.isArray(cookies) ? cookies.join("; ") : cookies;
      expect(cookieString).toContain("fdr_token=;");
    });
  });

  describe("GET /api/auth/me", () => {
    it("should return 401 when not authenticated", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
    });

    it("should return current user when authenticated via Bearer token", async () => {
      const token = signAccessToken({
        sub: "user-me-1",
        email: "officer@aicte.gov.in",
        role: Role.AICTE_OFFICER,
        institutionId: null,
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-me-1",
        fullName: "Officer Sharma",
        email: "officer@aicte.gov.in",
        role: Role.AICTE_OFFICER,
        institutionId: null,
        isActive: true,
      });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toEqual({
        id: "user-me-1",
        fullName: "Officer Sharma",
        email: "officer@aicte.gov.in",
        role: Role.AICTE_OFFICER,
        institutionId: null,
      });
    });

    it("should return current user when authenticated via HttpOnly cookie", async () => {
      const token = signAccessToken({
        sub: "user-me-cookie",
        email: "admin@fdr-sentinel.gov.in",
        role: Role.SYSTEM_ADMIN,
        institutionId: null,
      });

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-me-cookie",
        fullName: "System Admin",
        email: "admin@fdr-sentinel.gov.in",
        role: Role.SYSTEM_ADMIN,
        institutionId: null,
        isActive: true,
      });

      const res = await request(app)
        .get("/api/auth/me")
        .set("Cookie", `fdr_token=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe(Role.SYSTEM_ADMIN);
    });
  });
});
