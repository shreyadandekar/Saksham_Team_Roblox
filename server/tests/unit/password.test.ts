import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword } from "../../src/utils/password";

describe("Password Utility", () => {
  it("should hash a plaintext password securely", async () => {
    const raw = "SuperSecret123!";
    const hash = await hashPassword(raw);

    expect(hash).not.toBe(raw);
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/); // Valid bcrypt pattern
  });

  it("should verify correct password match", async () => {
    const raw = "DemoPassword2026";
    const hash = await hashPassword(raw);

    const matches = await comparePassword(raw, hash);
    expect(matches).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const raw = "DemoPassword2026";
    const hash = await hashPassword(raw);

    const matches = await comparePassword("WrongPassword", hash);
    expect(matches).toBe(false);
  });
});
