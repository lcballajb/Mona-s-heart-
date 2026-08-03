export const ASSOCIATION_STATUSES = [
  "draft",
  "source verification",
  "clinical review",
  "pharmacist review",
  "approved",
  "published",
  "expired",
  "withdrawn",
];
export const ASSOCIATION_TITLE =
  "Medications sometimes used for this condition";
export function visibleAssociations(
  rows,
  { production = process.env.NODE_ENV === "production", now = new Date() } = {},
) {
  return rows.filter(
    (row) =>
      row.status === "published" &&
      row.reviewer &&
      row.reviewDate &&
      (!row.expirationDate || Date.parse(row.expirationDate) > now.getTime()) &&
      (!production || (row.clinicalReviewer && row.pharmacistReviewer)),
  );
}
