import type { InstrumentSummary, Role, User } from "../types/auth";

// Development-only preview mode: lets the UI be reviewed before the API and
// PostgreSQL database are connected. Never enabled in production builds.
export const PREVIEW_ENABLED = import.meta.env.DEV;

const PREVIEW_ID_PREFIX = "preview-";

export function isPreviewUser(user: User | null): boolean {
  return PREVIEW_ENABLED && !!user && user.id.startsWith(PREVIEW_ID_PREFIX);
}

const INSTITUTIONS = [
  { id: "inst-del", name: "Delhi Institute of Advanced Engineering", code: "1-DL-0142" },
  { id: "inst-pun", name: "Maharashtra Institute of Pharmacy", code: "1-MH-0387" },
  { id: "inst-blr", name: "Bengaluru College of Technology", code: "1-KA-0219" },
  { id: "inst-chn", name: "Chennai School of Architecture", code: "1-TN-0455" },
];

export const PREVIEW_USERS: Record<Role, User> = {
  INSTITUTION_USER: {
    id: `${PREVIEW_ID_PREFIX}inst`,
    fullName: "Ritu Malhotra",
    email: "inst.delhi@demo.fdr-sentinel.gov.in",
    role: "INSTITUTION_USER",
    institutionId: "inst-del",
  },
  AICTE_OFFICER: {
    id: `${PREVIEW_ID_PREFIX}officer`,
    fullName: "Anil Sharma",
    email: "officer.sharma@demo.fdr-sentinel.gov.in",
    role: "AICTE_OFFICER",
    institutionId: null,
  },
  SYSTEM_ADMIN: {
    id: `${PREVIEW_ID_PREFIX}admin`,
    fullName: "Kavya Iyer",
    email: "admin.sentinel@demo.fdr-sentinel.gov.in",
    role: "SYSTEM_ADMIN",
    institutionId: null,
  },
};

// Only the chosen preview role is kept, per tab, so reloads and direct links keep working.
const PREVIEW_STORAGE_KEY = "fdr-sentinel:preview-role";

export function readPreviewRole(): Role | null {
  if (!PREVIEW_ENABLED) return null;
  try {
    const value = sessionStorage.getItem(PREVIEW_STORAGE_KEY);
    return value && value in PREVIEW_USERS ? (value as Role) : null;
  } catch {
    return null;
  }
}

export function writePreviewRole(role: Role | null): void {
  if (!PREVIEW_ENABLED) return;
  try {
    if (role) sessionStorage.setItem(PREVIEW_STORAGE_KEY, role);
    else sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
  } catch {
    // Storage can be unavailable (e.g. blocked in an iframe); preview still works for this page load.
  }
}

const BANKS = [
  ["State Bank of India", "Parliament Street"],
  ["Punjab National Bank", "Connaught Place"],
  ["Bank of Baroda", "Shivajinagar"],
  ["Canara Bank", "MG Road"],
  ["Union Bank of India", "Anna Salai"],
  ["Indian Bank", "Nungambakkam"],
] as const;

const STATUSES = [
  "ACTIVE", "ACTIVE", "ACTIVE", "ACTIVE", "SUBMITTED", "UNDER_SCRUTINY",
  "CORRECTION_REQUIRED", "MATURED", "RELEASE_REQUESTED", "RELEASED", "DRAFT", "REJECTED",
];

const AMOUNTS = [500000, 750000, 1000000, 1250000, 1500000, 2000000, 2500000, 3500000];

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function buildInstruments(): InstrumentSummary[] {
  const records: InstrumentSummary[] = [];
  for (let i = 0; i < 48; i++) {
    const institution = INSTITUTIONS[i % INSTITUTIONS.length];
    const [bankName, branchName] = BANKS[(i * 5) % BANKS.length];
    const status = STATUSES[(i * 7) % STATUSES.length];
    // Spread maturities from ~2 months past to ~2 years ahead, with a cluster in the next 90 days.
    const maturityOffset =
      status === "MATURED" || status === "RELEASE_REQUESTED" || status === "RELEASED"
        ? -15 - ((i * 11) % 60)
        : i % 3 === 0
          ? 5 + ((i * 13) % 85)
          : 95 + ((i * 37) % 640);
    const tenure = 365 * (1 + (i % 3));
    const issueOffset = maturityOffset - tenure;
    records.push({
      id: `fdr-${String(i + 1).padStart(3, "0")}`,
      instrumentNumber: `FDR${(204100 + i * 37).toString()}${String.fromCharCode(65 + (i % 26))}`,
      bankName,
      branchName,
      amount: AMOUNTS[(i * 3) % AMOUNTS.length],
      issueDate: isoDaysFromNow(issueOffset),
      maturityDate: isoDaysFromNow(maturityOffset),
      favouringDetails: "Member Secretary, AICTE, New Delhi",
      status,
      institutionId: institution.id,
      createdAt: isoDaysFromNow(issueOffset + 3),
      updatedAt: isoDaysFromNow(Math.min(-1, issueOffset + 20 + (i % 40))),
      institution,
    });
  }
  return records;
}

let previewInstruments: InstrumentSummary[] | null = null;

export function getPreviewInstruments(user: User): InstrumentSummary[] {
  previewInstruments ??= buildInstruments();
  if (user.role === "INSTITUTION_USER") {
    return previewInstruments.filter((r) => r.institutionId === user.institutionId);
  }
  return previewInstruments;
}
