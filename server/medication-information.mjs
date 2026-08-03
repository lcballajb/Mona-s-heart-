export const MEDICATION_INFORMATION_SOURCES = Object.freeze({
  dailymed: {
    organization: "U.S. National Library of Medicine",
    baseUrl: "https://dailymed.nlm.nih.gov/dailymed/services/v2",
  },
  fda: {
    organization: "U.S. Food and Drug Administration",
    baseUrl: "https://api.fda.gov/drug/label.json",
  },
  medlinePlus: {
    organization: "U.S. National Library of Medicine",
    baseUrl: "https://medlineplus.gov/druginformation.html",
  },
});
export function medicationInformationRecord(value) {
  const required = [
    "medicationIdentifier",
    "sourceOrganization",
    "sourceTitle",
    "sourceIdentifierOrUrl",
    "retrievalDate",
    "region",
    "humanReviewStatus",
    "reReviewDate",
  ];
  if (required.some((key) => !value[key]))
    throw new Error("Incomplete medication information provenance");
  return {
    ...value,
    publicationOrRevisionDate: value.publicationOrRevisionDate ?? null,
    commonUses: value.commonUses ?? [],
    importantWarnings: value.importantWarnings ?? [],
    contraindications: value.contraindications ?? [],
    limitations: value.limitations ?? [
      "General label information is not personalized medical advice and contains no individualized dosing.",
    ],
  };
}
