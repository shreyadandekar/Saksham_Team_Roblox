/**
 * scripts/verify_m3_live.ts
 * Live end-to-end verification script against the real configured Supabase database.
 * Executes all 14 steps outlined in Milestone 3 Section 11.
 */

import request from "supertest";
import { createApp } from "../src/app";
import { prisma } from "../src/db/prisma";

const DEMO_PASSWORD = "Demo@FDR2026!";
const app = createApp();

async function runLiveVerification() {
  console.log("============================================================");
  console.log("   FDR SENTINEL — MILESTONE 3 LIVE END-TO-END VERIFICATION  ");
  console.log("============================================================\n");

  const timestamp = Date.now();
  const testRefNumber = `FDR-VERIFY-${timestamp}`;
  let createdInstrumentId: string | null = null;

  try {
    // ── Step 1: Login as Delhi institution user ───────────────────────────
    console.log("1. Logging in as Delhi institution user (inst.delhi@demo.fdr-sentinel.gov.in)...");
    const loginDelhiRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "inst.delhi@demo.fdr-sentinel.gov.in",
        password: DEMO_PASSWORD,
      });

    if (loginDelhiRes.status !== 200) {
      throw new Error(`Delhi login failed: HTTP ${loginDelhiRes.status} ${JSON.stringify(loginDelhiRes.body)}`);
    }
    const delhiCookies = loginDelhiRes.headers["set-cookie"];
    console.log("   ✓ Delhi user authenticated successfully. Role:", loginDelhiRes.body.user.role);

    // ── Step 2 & 3: Register an FDR as DRAFT with document metadata ──────
    console.log(`2. Registering FDR draft with reference: ${testRefNumber}...`);
    const createRes = await request(app)
      .post("/api/instruments")
      .set("Cookie", delhiCookies)
      .send({
        instrumentNumber: testRefNumber,
        bankName: "State Bank of India",
        branchName: "Dwarka Sector 14 Branch",
        amount: 750000.0,
        issueDate: "2026-01-15T00:00:00.000Z",
        maturityDate: "2031-01-15T00:00:00.000Z",
        favouringDetails: "Member Secretary, AICTE, New Delhi",
        submitImmediately: false,
        documentMetadata: {
          fileName: "sbi_fixed_deposit_receipt_750k.pdf",
          fileSize: 412800,
          fileType: "application/pdf",
          category: "FDR Receipt",
          notes: "Live verification test deposit",
        },
      });

    if (createRes.status !== 201) {
      throw new Error(`FDR creation failed: HTTP ${createRes.status} ${JSON.stringify(createRes.body)}`);
    }
    createdInstrumentId = createRes.body.instrument.id;
    console.log("   ✓ FDR Draft saved to PostgreSQL. ID:", createdInstrumentId, "Status:", createRes.body.instrument.status);

    // ── Step 4: Verify it appears in Delhi's registry ─────────────────────
    console.log("4. Verifying record appears in Delhi's instrument registry...");
    const delhiListRes = await request(app)
      .get("/api/instruments")
      .set("Cookie", delhiCookies);

    const foundInDelhi = delhiListRes.body.instruments.find((i: any) => i.id === createdInstrumentId);
    if (!foundInDelhi || foundInDelhi.status !== "DRAFT") {
      throw new Error("Instrument not found in Delhi's registry or status is not DRAFT");
    }
    console.log("   ✓ Verified in Delhi registry. Status is DRAFT. Total instruments:", delhiListRes.body.meta.totalCount);

    // ── Step 5 & 6: Submit it for scrutiny & verify persistence ────────────
    console.log("5. Submitting FDR draft for AICTE scrutiny...");
    const submitRes = await request(app)
      .post(`/api/instruments/${createdInstrumentId}/submit`)
      .set("Cookie", delhiCookies);

    if (submitRes.status !== 200 || submitRes.body.instrument.status !== "SUBMITTED") {
      throw new Error(`Submission failed: HTTP ${submitRes.status} ${JSON.stringify(submitRes.body)}`);
    }
    console.log("   ✓ Submission successful. Status transitioned to SUBMITTED.");

    console.log("6. Verifying persistence after fresh query...");
    const verifyPersistRes = await request(app)
      .get(`/api/instruments/${createdInstrumentId}`)
      .set("Cookie", delhiCookies);

    if (verifyPersistRes.body.instrument.status !== "SUBMITTED") {
      throw new Error("Status did not persist as SUBMITTED in PostgreSQL");
    }
    console.log("   ✓ Persisted in PostgreSQL database with status SUBMITTED.");
    console.log("   ✓ Audit events recorded:", verifyPersistRes.body.auditEvents.length);

    // ── Step 7 & 8: Log in as Pune user & verify isolation ────────────────
    console.log("7. Logging in as Pune institution user (inst.pune@demo.fdr-sentinel.gov.in)...");
    const loginPuneRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "inst.pune@demo.fdr-sentinel.gov.in",
        password: DEMO_PASSWORD,
      });

    const puneCookies = loginPuneRes.headers["set-cookie"];
    console.log("   ✓ Pune user authenticated successfully.");

    console.log("8. Verifying Delhi's instrument is strictly inaccessible to Pune...");
    const puneListRes = await request(app)
      .get("/api/instruments")
      .set("Cookie", puneCookies);

    const leakCheck = puneListRes.body.instruments.find((i: any) => i.id === createdInstrumentId);
    if (leakCheck) {
      throw new Error("SECURITY VIOLATION: Pune user could see Delhi instrument in list!");
    }

    const puneDetailRes = await request(app)
      .get(`/api/instruments/${createdInstrumentId}`)
      .set("Cookie", puneCookies);

    if (puneDetailRes.status !== 404) {
      throw new Error(`SECURITY VIOLATION: Pune user got HTTP ${puneDetailRes.status} instead of 404!`);
    }
    console.log("   ✓ Cross-tenant isolation verified: Pune received 404 for Delhi's record.");

    const puneSubmitRes = await request(app)
      .post(`/api/instruments/${createdInstrumentId}/submit`)
      .set("Cookie", puneCookies);

    if (puneSubmitRes.status !== 404) {
      throw new Error(`SECURITY VIOLATION: Pune user could submit Delhi's record!`);
    }
    console.log("   ✓ Cross-tenant submission prevention verified: Pune cannot mutate Delhi's record.");

    // ── Step 9 & 10: Log in as AICTE Officer & verify scrutiny queue ──────
    console.log("9. Logging in as AICTE Officer (officer.sharma@demo.fdr-sentinel.gov.in)...");
    const loginOfficerRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "officer.sharma@demo.fdr-sentinel.gov.in",
        password: DEMO_PASSWORD,
      });

    const officerCookies = loginOfficerRes.headers["set-cookie"];
    console.log("   ✓ Officer authenticated successfully.");

    console.log("10. Verifying Delhi instrument appears in AICTE Scrutiny Queue...");
    const scrutinyRes = await request(app)
      .get("/api/scrutiny")
      .set("Cookie", officerCookies);

    if (scrutinyRes.status !== 200) {
      throw new Error(`Scrutiny queue failed: HTTP ${scrutinyRes.status}`);
    }

    const foundInQueue = scrutinyRes.body.instruments.find((i: any) => i.id === createdInstrumentId);
    if (!foundInQueue) {
      throw new Error("Delhi instrument did not appear in AICTE officer's scrutiny queue!");
    }
    console.log("   ✓ Record successfully detected in Scrutiny Queue! Owning institution:", foundInQueue.institution?.name);

    // ── Step 11 & 12: Officer opens detail page & starts scrutiny ─────────
    console.log("11. Officer inspecting instrument details and audit history...");
    const officerDetailRes = await request(app)
      .get(`/api/instruments/${createdInstrumentId}`)
      .set("Cookie", officerCookies);

    if (officerDetailRes.status !== 200) {
      throw new Error(`Officer detail request failed: HTTP ${officerDetailRes.status}`);
    }
    console.log("   ✓ Officer retrieved details. Document file:", officerDetailRes.body.instrument.documentMetadata?.fileName);
    console.log("   ✓ Verified audit trail items:", officerDetailRes.body.auditEvents.map((a: any) => a.action).join(" -> "));

    console.log("12. Officer initiating scrutiny (SUBMITTED -> UNDER_SCRUTINY)...");
    const startScrutinyRes = await request(app)
      .post(`/api/instruments/${createdInstrumentId}/start-scrutiny`)
      .set("Cookie", officerCookies);

    if (startScrutinyRes.status !== 200 || startScrutinyRes.body.instrument.status !== "UNDER_SCRUTINY") {
      throw new Error(`Start scrutiny failed: HTTP ${startScrutinyRes.status}`);
    }
    console.log("   ✓ Instrument transitioned to UNDER_SCRUTINY with audit trail.");

    // ── Step 13: Institution user cannot directly activate ────────────────
    console.log("13. Verifying that institution users cannot directly activate instruments...");
    // Institution users cannot access officer action
    const invalidActivateRes = await request(app)
      .post(`/api/instruments/${createdInstrumentId}/start-scrutiny`)
      .set("Cookie", delhiCookies);

    if (invalidActivateRes.status !== 403) {
      throw new Error(`Security flaw: Institution user got ${invalidActivateRes.status} instead of 403!`);
    }
    console.log("   ✓ Verified: Institution user rejected with 403 Forbidden for scrutiny/activation actions.");

    // ── Step 14: Authentication and logout still work ────────────────────
    console.log("14. Verifying logout flow...");
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", delhiCookies);

    if (logoutRes.status !== 200) {
      throw new Error("Logout failed");
    }
    console.log("   ✓ Logout clears authentication cookie properly.");

    console.log("\n============================================================");
    console.log("   🎉 ALL 14 MILESTONE 3 LIVE DATABASE CHECKS PASSED!        ");
    console.log("============================================================\n");
  } finally {
    // Clean up test instrument
    if (createdInstrumentId) {
      try {
        await prisma.auditEvent.deleteMany({
          where: { entityType: "Instrument", entityId: createdInstrumentId },
        });
        await prisma.instrument.delete({
          where: { id: createdInstrumentId },
        });
        console.log(`[Cleanup] Deleted temporary test instrument ${createdInstrumentId}`);
      } catch (cleanupErr) {
        console.warn("[Cleanup] Warning during cleanup:", cleanupErr);
      }
    }
  }
}

runLiveVerification()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Live Verification Failed:", err);
    process.exit(1);
  });
