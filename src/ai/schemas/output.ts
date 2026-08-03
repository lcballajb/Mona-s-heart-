import type { GroundedOutput } from "../providers/provider";
export function isGroundedOutput(v: unknown): v is GroundedOutput {
  if (!v || typeof v !== "object") return false;
  const x = v as Partial<GroundedOutput>;
  return (
    typeof x.answer === "string" &&
    Array.isArray(x.sources) &&
    x.sources.length > 0 &&
    x.sources.every((s) =>
      Boolean(s.title && s.url && s.publishedDate && s.evidence),
    ) &&
    typeof x.limitations === "string" &&
    x.professionalReviewRecommended === true
  );
}
