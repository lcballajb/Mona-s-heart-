import { objectInput } from "./validation.mjs";

// Synthetic-only preferences. Never a grant of discovery, mentor, or medical access.
export function validateOnboarding(actor, input) {
  const invalid = () => {
    throw Object.assign(new Error("Invalid onboarding details or consent"), {
      statusCode: 400,
    });
  };
  const accountType = ["patient", "survivor", "caregiver"].find((role) =>
    actor.roles.includes(role),
  );
  if (!accountType) invalid();
  const fields = {
    patient: ["diagnosis", "symptoms", "medications"],
    survivor: ["livedExperience", "availability"],
    caregiver: ["caregiverInformation"],
  }[accountType];
  const flags =
    accountType === "survivor" ? ["willingToMentor", "matchingConsent"] : [];
  const value = objectInput(input, [
    ...fields,
    ...flags,
    "supportPreferences",
    "privacy",
    "consentVersion",
    "consent",
  ]);
  if (
    value.consent !== true ||
    value.consentVersion !== "synthetic-onboarding-v1" ||
    value.privacy !== "private"
  )
    invalid();
  const result = {
    accountType,
    privacy: "private",
    consentVersion: value.consentVersion,
    completedAt: new Date().toISOString(),
  };
  for (const field of [...fields, "supportPreferences"]) {
    const text = value[field] ?? "";
    if (
      typeof text !== "string" ||
      text.length > 1000 ||
      !text.isWellFormed() ||
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(text)
    )
      invalid();
    result[field] = text.trim();
  }
  for (const flag of flags) {
    if (value[flag] !== undefined && typeof value[flag] !== "boolean")
      invalid();
    result[flag] = value[flag] === true;
  }
  return result;
}
