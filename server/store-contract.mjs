/**
 * Application-facing persistence operations. Infrastructure-only methods such
 * as `query`, `transaction`, `ready`, and `close` are adapter specific.
 */
export const STORE_OPERATIONS = Object.freeze([
  "addOrganizationMembership",
  "approveRole",
  "audit",
  "claimJobs",
  "clearLoginFailures",
  "completeJob",
  "consumeAccountToken",
  "createAccountToken",
  "createBlock",
  "createDeletionRequest",
  "createDocumentMetadata",
  "createExportRequest",
  "createHealthEntry",
  "createImportedRecordMetadata",
  "createJob",
  "createNotification",
  "createOrganization",
  "createReport",
  "createSession",
  "createUser",
  "failJob",
  "findUserByEmail",
  "findUserById",
  "getOwnDocument",
  "hasMembership",
  "listOwnHealthEntries",
  "listSessions",
  "recordConsent",
  "recordContentReview",
  "recordEvidenceSource",
  "recordLoginFailure",
  "recordModerationAction",
  "revokeSession",
  "revokeSessionById",
  "revokeUserSessions",
  "session",
  "setFeatureFlag",
  "updatePassword",
  "upsertProfile",
  "validateCsrf",
  "verifyUser",
]);

export function assertStoreContract(store) {
  const missing = STORE_OPERATIONS.filter(
    (operation) => typeof store?.[operation] !== "function",
  );
  if (missing.length)
    throw new TypeError(
      `Store adapter is missing operations: ${missing.join(", ")}`,
    );
  return store;
}
