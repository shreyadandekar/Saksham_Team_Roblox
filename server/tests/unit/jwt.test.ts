import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { signAccessToken, verifyAccessToken } from "../../src/utils/jwt";
import { Role } from "@prisma/client";
import { env } from "../../src/config/env";

describe("JWT Utility", () => {
  const samplePayload = {
    sub: "user-cuid-123",
    email: "officer@aicte.gov.in",
    role: Role.AICTE_OFFICER,
    institutionId: null,
  };

  it("should sign and verify a valid access token", () => {
    const token = signAccessToken(samplePayload);
    expect(typeof token).toBe("string");

    const decoded = verifyAccessToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe(samplePayload.sub);
    expect(decoded?.email).toBe(samplePayload.email);
    expect(decoded?.role).toBe(Role.AICTE_OFFICER);
  });

  it("should reject an invalid or malformed token", () => {
    const decoded = verifyAccessToken("not.a.valid.jwt");
    expect(decoded).toBeNull();
  });

  it("should reject a token signed with an invalid secret", () => {
    const forgedToken = jwt.sign(samplePayload, "wrong_secret_at_least_32_characters_forged_key", {
      expiresIn: "1h",
    });

    const decoded = verifyAccessToken(forgedToken);
    expect(decoded).toBeNull();
  });

  it("should reject an expired token", () => {
    // Generate an already expired token (maxAge: -1s)
    const expiredToken = jwt.sign(samplePayload, env.JWT_SECRET, {
      expiresIn: "-1s",
    });

    const decoded = verifyAccessToken(expiredToken);
    expect(decoded).toBeNull();
  });
});
