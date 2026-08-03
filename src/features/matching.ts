export type MatchProfile = {
  confirmedDiagnoses: string[];
  confirmedMedications: string[];
  language: string;
  timeZone: string;
  communication: string;
  visibility: "private" | "approved-connections" | "matched-mentors";
  blockedIds: string[];
};
export function explainMatch(a: MatchProfile, b: MatchProfile) {
  const factors = [
    ...a.confirmedDiagnoses
      .filter((x) => b.confirmedDiagnoses.includes(x))
      .map((x) => `${x} experience`),
    ...(a.language === b.language ? [`${a.language} language`] : []),
    ...(a.communication === b.communication
      ? [`${a.communication} support`]
      : []),
  ];
  return {
    eligible: factors.length > 0,
    factors,
    explanation: factors.length
      ? `Matched because both users selected ${factors.join(", ")}.`
      : "No confirmed shared factors were found.",
  };
}
