export const SAFE_FALLBACK =
  "Mona’s Heart does not have enough verified information to answer this safely. Please ask a qualified healthcare professional.";
export const AI_NOTICE =
  "Mona’s Heart uses artificial intelligence to help organize information, explain general concepts, and support peer connections. AI output may be incomplete or incorrect and is not medical advice, diagnosis, or treatment.";
const emergency =
  /chest pain|chest hurts|can.?t breathe|overdose|suicid|emergency/i;
const prohibited =
  /replace (my )?(blood thinner|insulin|medicine|medication)|stop (taking )?(insulin|medicine|medication)|natural cure|what dose|prescribe|pretend you are my doctor|show me another user|ignore (your )?(medical |safety )?rules/i;
export type GuardrailResult = {
  allowed: boolean;
  message: string;
  category: "emergency" | "refusal" | "allowed";
};
export function guardMedicalPrompt(input: string): GuardrailResult {
  if (emergency.test(input))
    return {
      allowed: false,
      category: "emergency",
      message:
        "If you may be experiencing a medical emergency, contact local emergency services immediately. Mona’s Heart cannot recommend emergency treatment.",
    };
  if (prohibited.test(input))
    return {
      allowed: false,
      category: "refusal",
      message: `I can’t diagnose, prescribe, suggest doses, recommend stopping or replacing medication, claim a cure, impersonate a clinician, or access another user’s information. ${SAFE_FALLBACK}`,
    };
  return { allowed: true, category: "allowed", message: "" };
}
