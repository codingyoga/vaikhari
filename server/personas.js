// Persona definitions are kept on the server so the polish prompt
// stays centralized and easy to tune without touching the UI.

export const personas = {
  executive: {
    name: "CEO / Executive",
    tagline: "Concise, confident, strategic.",
    styleGuide:
      "Speak like a senior executive in a board meeting. Lead with the takeaway. " +
      "Be direct, calm, and outcome-oriented. Avoid hedging. Avoid jargon unless it adds precision. " +
      "Short, punchy sentences. Confidence without arrogance.",
  },
  marketer: {
    name: "Marketer",
    tagline: "Persuasive, benefit-driven, energetic.",
    styleGuide:
      "Speak like a sharp marketer pitching to a customer. Lead with the benefit, not the feature. " +
      "Use vivid, concrete language. Inject momentum and warmth. " +
      "Avoid being salesy or hyperbolic — credible enthusiasm only.",
  },
  technical: {
    name: "Technical / Engineer",
    tagline: "Precise, structured, no fluff.",
    styleGuide:
      "Speak like a senior engineer explaining a system. Be precise about cause and effect. " +
      "Use the right technical terms. State assumptions and constraints when relevant. " +
      "Cut every word that doesn't carry information.",
  },
  friendly: {
    name: "Friendly / Casual",
    tagline: "Warm, conversational, approachable.",
    styleGuide:
      "Speak like a thoughtful friend in a relaxed conversation. Warm, easy rhythm, contractions are fine. " +
      "Approachable and human. Avoid corporate stiffness, but stay clear and respectful.",
  },
  comedian: {
    name: "Comedian",
    tagline: "Witty, light, observational.",
    styleGuide:
      "Speak with a comedian's timing — observational, mildly self-aware, with a light twist or punchline " +
      "when the content allows. Never force a joke. If the original thought is serious or sensitive, dial " +
      "the humor down to a wry tone rather than a punchline. Keep it tasteful and workplace-safe.",
  },
};
