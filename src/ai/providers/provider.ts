export type GroundedSource = {
  title: string;
  url: string;
  publishedDate: string;
  evidence:
    | "government reference"
    | "human-approved guideline"
    | "human-reviewed content";
};
export type GroundedOutput = {
  answer: string;
  sources: GroundedSource[];
  limitations: string;
  reviewStatus: "pending human review" | "human reviewed";
  professionalReviewRecommended: true;
};
export interface AIProvider {
  organize(input: string, sources: GroundedSource[]): Promise<GroundedOutput>;
}
export function isAIConfigured(env: Record<string, string | undefined>) {
  return (
    env.AI_ENABLED === "true" &&
    Boolean(env.AI_PROVIDER) &&
    Boolean(env.AI_API_KEY)
  );
}
