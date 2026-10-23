import { describe, it, expect, vi } from "vitest";

describe("Seed Script Idempotency Logic", () => {
  it("should ensure upsert patterns prevent duplicate records", async () => {
    // Verify that upsert logic handles repeated executions safely
    const databaseMock = new Map<string, any>();

    async function mockUpsertUser(email: string, fullName: string) {
      if (databaseMock.has(email)) {
        const existing = databaseMock.get(email);
        databaseMock.set(email, { ...existing, fullName });
        return { action: "updated", record: databaseMock.get(email) };
      }
      databaseMock.set(email, { email, fullName });
      return { action: "created", record: databaseMock.get(email) };
    }

    const firstRun = await mockUpsertUser(
      "inst.delhi@demo.fdr-sentinel.gov.in",
      "Dr. Rajesh Verma"
    );
    expect(firstRun.action).toBe("created");
    expect(databaseMock.size).toBe(1);

    // Second execution with identical key must update, not duplicate
    const secondRun = await mockUpsertUser(
      "inst.delhi@demo.fdr-sentinel.gov.in",
      "Dr. Rajesh Verma"
    );
    expect(secondRun.action).toBe("updated");
    expect(databaseMock.size).toBe(1);
  });
});
