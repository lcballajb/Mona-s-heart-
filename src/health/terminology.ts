export type VerificationStatus = "verified" | "unverified" | "fallback";
export type MedicationTerm = {
  rxcui?: string;
  genericName: string;
  brandName?: string;
  activeIngredient: string;
  strength?: string;
  doseForm?: string;
  prescribableName?: string;
  termType?: string;
  source: string;
  retrievedAt: string;
  verificationStatus: VerificationStatus;
};
export type DiagnosisTerm = {
  displayName: string;
  code: string;
  system: "SNOMED CT" | "ICD-10-CM" | "user-entered" | "FHIR";
  version?: string;
  source: string;
  retrievedAt: string;
  userWording?: string;
  verificationStatus: VerificationStatus;
  region: string;
  language: string;
  status: "active" | "inactive" | "retired";
};
export type ObservationTerm = {
  code: string;
  display: string;
  system: "LOINC" | "UCUM" | "FHIR value set" | string;
  version?: string;
  unit?: string;
  region: string;
  language: string;
  source: string;
  reviewDate: string;
};

const fallbackDate = "2026-08-03";
/** Small fictional/open development fallback; never represented as live or verified. */
export const medicationFallback: MedicationTerm[] = [
  {
    genericName: "Example medicine alpha",
    activeIngredient: "example ingredient alpha",
    doseForm: "example tablet",
    source: "Fictional development fallback",
    retrievedAt: fallbackDate,
    verificationStatus: "fallback",
  },
  {
    genericName: "Example medicine beta",
    activeIngredient: "example ingredient beta",
    source: "Fictional development fallback",
    retrievedAt: fallbackDate,
    verificationStatus: "fallback",
  },
];
export const diagnosisFallback: DiagnosisTerm[] = [
  {
    displayName: "Example condition alpha",
    code: "EXAMPLE-001",
    system: "user-entered",
    source: "Fictional development fallback",
    retrievedAt: fallbackDate,
    verificationStatus: "fallback",
    region: "test",
    language: "en",
    status: "active",
  },
];

export class TerminologyRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}
export async function searchMedications(
  query: string,
  signal?: AbortSignal,
): Promise<{ results: MedicationTerm[]; fallback: boolean }> {
  const normalized = query.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (normalized.length < 2) return { results: [], fallback: false };
  const response = await fetch(
    `/v1/terminology/medications?q=${encodeURIComponent(normalized)}`,
    {
      signal,
      credentials: "same-origin",
      headers: { accept: "application/json" },
    },
  );
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { code?: string };
    throw new TerminologyRequestError(
      response.status === 429
        ? "Too many searches. Please wait and retry."
        : "Medication terminology is unavailable.",
      body.code ?? "UNAVAILABLE",
    );
  }
  return response.json() as Promise<{
    results: MedicationTerm[];
    fallback: boolean;
  }>;
}
export const searchMedicationFallback = (query: string) =>
  medicationFallback.filter((term) =>
    `${term.genericName} ${term.activeIngredient}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
export const searchDiagnoses = (query: string) =>
  query.trim().length < 2
    ? []
    : diagnosisFallback.filter((term) =>
        term.displayName.toLowerCase().includes(query.trim().toLowerCase()),
      );
export const unverifiedMedication = (wording: string): MedicationTerm => ({
  genericName: wording.trim(),
  activeIngredient: "Not verified",
  source: "User-entered free text",
  retrievedAt: new Date().toISOString(),
  verificationStatus: "unverified",
});
