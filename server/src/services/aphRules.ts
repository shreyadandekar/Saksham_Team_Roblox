/**
 * server/src/services/aphRules.ts
 *
 * AICTE Approval Process Handbook (APH) Rules Configuration.
 * Authoritative Regulatory Reference:
 *   AICTE Approval Process Handbook 2024–2027, Section 1.12 — Security Deposit, Table 1.4.
 *
 * In-memory reference constants for pure, high-performance rule evaluations.
 * Mirrors the AphRule Prisma database schema for auditability and runtime overrides.
 */

export const CURRENT_APH_VERSION = "2024-2027";
export const APH_SOURCE_CLAUSE = "AICTE APH 2024–2027, Section 1.12, Table 1.4";
export const APH_SOURCE_URL = "https://www.aicte-india.org/sites/default/files/APH%202024-27.pdf";

export type AcademicLevel = "DIPLOMA" | "UG" | "PG";

export enum PremisesOwnershipType {
  OWNED = "OWNED",
  LEASED_PRIVATE = "LEASED_PRIVATE",
  LEASED_GOVERNMENT = "LEASED_GOVERNMENT",
  GOVERNMENT_ALLOTTED = "GOVERNMENT_ALLOTTED",
  UNKNOWN = "UNKNOWN",
}

export interface AphRuleDefinition {
  ruleKey: string;
  regulatoryVersion: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  programmeKey: string;
  programmeDisplayName: string;
  academicLevel: AcademicLevel;
  baseAmountRupees: number;
  privateLeaseMultiplier: number; // 2.0 per Section 1.12.c
  sourceClause: string;
  sourceUrl: string;
  applicableConditions: string;
  notes?: string;
}

/**
 * Standard Multipliers per APH 2024–2027 Section 1.12:
 * - Leased private building/land: DOUBLE (2.0x)
 * - Owned / Govt Allotted / Govt Leased: 1.0x
 * - Concession for Minority / Women-led / PwD: 20% concession (0.8x base), capped at 20%
 */
export const MULTIPLIERS = {
  OWNED: 1.0,
  GOVERNMENT_ALLOTTED: 1.0,
  LEASED_GOVERNMENT: 1.0,
  LEASED_PRIVATE: 2.0,
  CONCESSION_MAX_DISCOUNT: 0.20, // 20% concession
  CONCESSION_FACTOR: 0.80,       // Pays 80%
} as const;

/**
 * Table 1.4: Base Security Deposit (in Integer Rupees - no floating point values).
 * 1 Lakh = 100,000 INR.
 */
export const APH_2024_2027_RULES: AphRuleDefinition[] = [
  // 1. Engineering & Technology
  {
    ruleKey: "APH_2024_ENG_TECH_DIPLOMA",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "ENGINEERING_TECHNOLOGY",
    programmeDisplayName: "Engineering & Technology",
    academicLevel: "DIPLOMA",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Diploma level in Engineering & Technology. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_ENG_TECH_UG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "ENGINEERING_TECHNOLOGY",
    programmeDisplayName: "Engineering & Technology",
    academicLevel: "UG",
    baseAmountRupees: 35_00_000, // ₹35 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Undergraduate degree (B.E./B.Tech) in Engineering & Technology. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_ENG_TECH_PG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "ENGINEERING_TECHNOLOGY",
    programmeDisplayName: "Engineering & Technology",
    academicLevel: "PG",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Postgraduate degree (M.E./M.Tech) in Engineering & Technology. Double for privately leased premises.",
  },

  // 2. Planning
  {
    ruleKey: "APH_2024_PLANNING_DIPLOMA",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "PLANNING",
    programmeDisplayName: "Planning",
    academicLevel: "DIPLOMA",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Diploma in Planning. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_PLANNING_UG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "PLANNING",
    programmeDisplayName: "Planning",
    academicLevel: "UG",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Undergraduate degree (B.Plan) in Planning. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_PLANNING_PG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "PLANNING",
    programmeDisplayName: "Planning",
    academicLevel: "PG",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Postgraduate degree (M.Plan) in Planning. Double for privately leased premises.",
  },

  // 3. Applied Arts and Crafts
  {
    ruleKey: "APH_2024_APPLIED_ARTS_DIPLOMA",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "APPLIED_ARTS_CRAFTS",
    programmeDisplayName: "Applied Arts and Crafts",
    academicLevel: "DIPLOMA",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Diploma in Applied Arts and Crafts. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_APPLIED_ARTS_UG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "APPLIED_ARTS_CRAFTS",
    programmeDisplayName: "Applied Arts and Crafts",
    academicLevel: "UG",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Undergraduate degree in Applied Arts and Crafts. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_APPLIED_ARTS_PG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "APPLIED_ARTS_CRAFTS",
    programmeDisplayName: "Applied Arts and Crafts",
    academicLevel: "PG",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Postgraduate degree in Applied Arts and Crafts. Double for privately leased premises.",
  },

  // 4. Design
  {
    ruleKey: "APH_2024_DESIGN_DIPLOMA",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "DESIGN",
    programmeDisplayName: "Design",
    academicLevel: "DIPLOMA",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Diploma in Design. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_DESIGN_UG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "DESIGN",
    programmeDisplayName: "Design",
    academicLevel: "UG",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Undergraduate degree (B.Des) in Design. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_DESIGN_PG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "DESIGN",
    programmeDisplayName: "Design",
    academicLevel: "PG",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Postgraduate degree (M.Des) in Design. Double for privately leased premises.",
  },

  // 5. Hotel Management and Catering Technology
  {
    ruleKey: "APH_2024_HMCT_DIPLOMA",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "HOTEL_MANAGEMENT_CATERING",
    programmeDisplayName: "Hotel Management and Catering Technology",
    academicLevel: "DIPLOMA",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Diploma in HMCT. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_HMCT_UG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "HOTEL_MANAGEMENT_CATERING",
    programmeDisplayName: "Hotel Management and Catering Technology",
    academicLevel: "UG",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Undergraduate degree (BHMCT) in HMCT. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_HMCT_PG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "HOTEL_MANAGEMENT_CATERING",
    programmeDisplayName: "Hotel Management and Catering Technology",
    academicLevel: "PG",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Postgraduate degree (MHMCT) in HMCT. Double for privately leased premises.",
  },

  // 6. Computer Applications (MCA / BCA)
  // Note: Diploma is NOT listed in APH Table 1.4.
  {
    ruleKey: "APH_2024_COMP_APP_UG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "COMPUTER_APPLICATIONS",
    programmeDisplayName: "Computer Applications",
    academicLevel: "UG",
    baseAmountRupees: 5_00_000, // ₹5 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Undergraduate degree (BCA) in Computer Applications. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_COMP_APP_PG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "COMPUTER_APPLICATIONS",
    programmeDisplayName: "Computer Applications",
    academicLevel: "PG",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Postgraduate degree (MCA) in Computer Applications. Double for privately leased premises.",
  },

  // 7. Management (MBA / PGDM / BBA)
  // Note: Diploma is NOT listed in APH Table 1.4.
  {
    ruleKey: "APH_2024_MANAGEMENT_UG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "MANAGEMENT",
    programmeDisplayName: "Management",
    academicLevel: "UG",
    baseAmountRupees: 5_00_000, // ₹5 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Undergraduate degree (BBA/BMS) in Management. Double for privately leased premises.",
  },
  {
    ruleKey: "APH_2024_MANAGEMENT_PG",
    regulatoryVersion: CURRENT_APH_VERSION,
    effectiveFrom: "2024-01-01",
    effectiveTo: null,
    programmeKey: "MANAGEMENT",
    programmeDisplayName: "Management",
    academicLevel: "PG",
    baseAmountRupees: 15_00_000, // ₹15 Lakh
    privateLeaseMultiplier: 2.0,
    sourceClause: APH_SOURCE_CLAUSE,
    sourceUrl: APH_SOURCE_URL,
    applicableConditions: "Postgraduate degree (MBA/PGDM) in Management. Double for privately leased premises.",
  },
];

/**
 * Normalizes user-supplied or OCR-extracted programme names to standard programme keys.
 */
export function normalizeProgrammeKey(input: string | null | undefined): string | null {
  if (!input) return null;
  const clean = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");

  // Engineering & Technology variations
  if (
    clean.includes("ENG") ||
    clean.includes("TECH") ||
    clean.includes("ENGINEERING") ||
    clean.includes("TECHNOLOGY")
  ) {
    return "ENGINEERING_TECHNOLOGY";
  }

  // Planning variations
  if (clean.includes("PLAN")) {
    return "PLANNING";
  }

  // Applied Arts and Crafts
  if (clean.includes("ART") || clean.includes("CRAFT")) {
    return "APPLIED_ARTS_CRAFTS";
  }

  // Design
  if (clean.includes("DESIGN") || clean.includes("DES")) {
    return "DESIGN";
  }

  // Hotel Management & Catering Technology
  if (clean.includes("HOTEL") || clean.includes("HMCT") || clean.includes("CATER")) {
    return "HOTEL_MANAGEMENT_CATERING";
  }

  // Computer Applications
  if (clean.includes("COMPUTER") || clean.includes("MCA") || clean.includes("BCA")) {
    return "COMPUTER_APPLICATIONS";
  }

  // Management
  if (clean.includes("MANAGEMENT") || clean.includes("MBA") || clean.includes("PGDM") || clean.includes("BBA")) {
    return "MANAGEMENT";
  }

  return null;
}

/**
 * Normalizes academic level strings to "DIPLOMA" | "UG" | "PG".
 */
export function normalizeAcademicLevel(input: string | null | undefined): AcademicLevel | null {
  if (!input) return null;
  const clean = input.trim().toUpperCase();

  if (clean === "UG" || clean.includes("UNDERGRAD") || clean.includes("BACHELOR") || clean.includes("DEGREE")) {
    return "UG";
  }
  if (clean === "PG" || clean.includes("POSTGRAD") || clean.includes("MASTER")) {
    return "PG";
  }
  if (clean.includes("DIP") || clean.includes("POLYTECHNIC")) {
    return "DIPLOMA";
  }

  return null;
}

export type RuleLookupResult =
  | { kind: "FOUND"; rule: AphRuleDefinition }
  | { kind: "NOT_LISTED"; programmeKey: string; academicLevel: AcademicLevel; reason: string }
  | { kind: "UNKNOWN_PROGRAMME"; rawProgramme: string }
  | { kind: "INVALID_LEVEL"; rawLevel: string };

/**
 * Looks up the authoritative APH rule for a given programme and level.
 */
export function findAphRule(
  rawProgramme: string,
  rawLevel: string,
  rulesList: AphRuleDefinition[] = APH_2024_2027_RULES
): RuleLookupResult {
  const programmeKey = normalizeProgrammeKey(rawProgramme);
  if (!programmeKey) {
    return { kind: "UNKNOWN_PROGRAMME", rawProgramme };
  }

  const academicLevel = normalizeAcademicLevel(rawLevel);
  if (!academicLevel) {
    return { kind: "INVALID_LEVEL", rawLevel };
  }

  const match = rulesList.find(
    (r) => r.programmeKey === programmeKey && r.academicLevel === academicLevel
  );

  if (!match) {
    return {
      kind: "NOT_LISTED",
      programmeKey,
      academicLevel,
      reason: `Programme '${programmeKey}' at level '${academicLevel}' is not listed in AICTE APH Table 1.4. Manual regulatory review required.`,
    };
  }

  return { kind: "FOUND", rule: match };
}
