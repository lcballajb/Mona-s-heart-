export type HealthVisibility =
  | "private"
  | "approved-connections"
  | "matched-mentors"
  | "authorized-care-organization"
  | "hidden-from-public";
export const DEFAULT_HEALTH_VISIBILITY: HealthVisibility = "private";
export function canAccessHealthData(
  ownerId: string,
  viewerId: string,
  authorizedIds: string[],
) {
  return ownerId === viewerId || authorizedIds.includes(viewerId);
}
