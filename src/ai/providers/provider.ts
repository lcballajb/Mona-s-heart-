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

// Exact provider/model identifiers are added only after every approval recorded in
// docs/ai/AI_MODEL_REGISTRY.md. An empty registry deliberately disables AI.
export const APPROVED_AI_MODELS: readonly string[] = [];

export function isApprovedAIModel(provider?: string, model?: string) {
  return Boolean(
    provider && model && APPROVED_AI_MODELS.includes(`${provider}:${model}`),
  );
}

export function isAIConfigured(env: Record<string, string | undefined>) {
  return (
    env.AI_ENABLED === "true" &&
    isApprovedAIModel(env.AI_PROVIDER, env.AI_MODEL) &&
    Boolean(env.AI_API_KEY)
  );
}
