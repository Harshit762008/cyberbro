// Demo-mode, rule-based threat assessment. Runs entirely in the browser — no AI backend.
// Scores by the most severe category found (not by counting keywords), then adjusts for context.

export type Level = "safe" | "warning" | "danger";

export type Analysis = {
  score: number; // 0.0 – 10.0, one decimal
  level: Level;
  band: string;
  category: string;
  uncertain: boolean;
  immediateDanger: boolean;
  reasons: string[];
  tips: string[];
};

export const EMERGENCY_NUMBER = "9509728855";
export const EMERGENCY_THRESHOLD = 9.5; // emergency alert + call strictly above this score

type Category = {
  id: string;
  label: string;
  base: number;
  pattern: RegExp;
  reason: string;
};

const CATEGORIES: Category[] = [
  {
    id: "attack",
    label: "Immediate physical danger",
    base: 9.8,
    pattern:
      /(being (attacked|followed|beaten|kidnapped)|someone is (breaking in|outside my|attacking|hitting)|help me (now|please)|i('?m| am) (in danger|trapped|being held)|bachao|मदद करो|मुझे बचाओ|मार रहा है)/i,
    reason: "The message reports an ongoing attack or immediate danger to someone.",
  },
  {
    id: "death",
    label: "Credible threat to life",
    base: 9.3,
    pattern:
      /(i('?ll| will| am going to| gonna) (kill|murder|shoot|stab)|you('?re| are) (dead|going to die)|kill you|jaan se maar|मार डालूंगा|जान से मार)/i,
    reason: "It contains a direct threat to kill or seriously hurt someone.",
  },
  {
    id: "sexual",
    label: "Threat of sexual violence",
    base: 9.2,
    pattern: /(rape|sexual(ly)? assault|बलात्कार)/i,
    reason: "It contains a threat of sexual violence.",
  },
  {
    id: "violence",
    label: "Threat of physical harm",
    base: 8.0,
    pattern: /(i('?ll| will) (hurt|beat|break your|find you)|know where you live|acid|hurt your family|घर आ कर|हाथ पैर तोड़)/i,
    reason: "It threatens physical harm or says they know where you live.",
  },
  {
    id: "blackmail",
    label: "Blackmail / sextortion",
    base: 7.8,
    pattern:
      /(leak your (photos|videos|pics)|private (photos|videos)|send (it|them) to your (family|friends|contacts)|nude|viral kar|pay or (i|we) (will|'ll)|ब्लैकमेल|वायरल कर)/i,
    reason: "It threatens to leak private content unless you pay or obey — this is blackmail.",
  },
  {
    id: "credential",
    label: "Phishing / credential theft",
    base: 6.5,
    pattern: /(otp|ओटीपी|one time password|password|पासवर्ड|passcode|\bpin\b|cvv)/i,
    reason: "It asks for your OTP, PIN or password — real banks and companies never do this.",
  },
  {
    id: "harassment",
    label: "Harassment / coercion",
    base: 6.2,
    pattern: /(you('?ll| will) regret|watch your back|or else|i('?m| am) watching you|stalk|धमकी|अंजाम भुगत)/i,
    reason: "It uses intimidating language meant to scare or pressure you.",
  },
  {
    id: "lottery",
    label: "Prize / lottery scam",
    base: 5.5,
    pattern: /(lottery|लॉटरी|you (have )?won|winner|prize|इनाम|congratulations)/i,
    reason: "It promises a lottery or prize you never entered — a very common scam pattern.",
  },
  {
    id: "bank",
    label: "Bank / KYC scare",
    base: 5.0,
    pattern: /(kyc|account.*(block|suspend|बंद)|खाता.*बंद|card (is )?blocked)/i,
    reason: "It tries to scare you about your bank account or KYC.",
  },
  {
    id: "cashback",
    label: "Suspicious offer / link",
    base: 3.5,
    pattern: /(cashback|refund|रिफंड|free (gift|recharge)|offer|claim)/i,
    reason: "It offers cashback, a refund or a reward — this alone does not prove a scam.",
  },
];

const MODIFIERS: { pattern: RegExp; delta: number; reason: string }[] = [
  {
    pattern: /(urgent|तुरंत|जल्दी|immediately|तत्काल|within \d+ (hours?|minutes?)|last chance|today only)/i,
    delta: 0.6,
    reason: "It creates urgency to stop you from thinking carefully.",
  },
  {
    pattern: /(bit\.ly|tinyurl|t\.co|cutt\.ly|rb\.gy|is\.gd|http:\/\/)/i,
    delta: 0.8,
    reason: "It contains a shortened or unencrypted link that hides the real destination.",
  },
  {
    pattern: /(https?:\/\/\d{1,3}(\.\d{1,3}){3}|xn--|@[a-z0-9-]+\.[a-z]{2,}\/)/i,
    delta: 1.0,
    reason: "The link uses an IP address or look-alike characters — a phishing indicator.",
  },
  {
    pattern: /(pay|send|transfer).{0,20}(₹|rs\.?|inr|money|पैसे|upi)/i,
    delta: 0.5,
    reason: "It asks you to send money.",
  },
];

// Context that lowers severity: jokes, hypotheticals, past events, fiction.
const DAMPENERS: { pattern: RegExp; factor: number; reason: string }[] = [
  { pattern: /(\bjk\b|just kidding|joking|lol|lmao|😂|🤣|मज़ाक)/i, factor: 0.55, reason: "The wording suggests a joke — but take it seriously if unsure." },
  { pattern: /(what if|hypothetically|in the (movie|game|story)|character)/i, factor: 0.6, reason: "It appears hypothetical or fictional." },
  { pattern: /(last (year|month|week)|years ago|used to|happened before)/i, factor: 0.8, reason: "It describes a past event rather than a current threat." },
];

const round1 = (n: number) => Math.round(n * 10) / 10;

export function bandFor(score: number): string {
  if (score < 2) return "Very low apparent threat";
  if (score < 4) return "Low threat / minor concern";
  if (score < 6) return "Moderate risk — possible scam";
  if (score < 7.5) return "Significant threat";
  if (score < 9) return "High threat";
  if (score <= 9.5) return "Very severe threat";
  return "Critical — possible immediate danger";
}

export function analyzeMessage(text: string): Analysis {
  const matched = CATEGORIES.filter((c) => c.pattern.test(text)).sort((a, b) => b.base - a.base);
  const reasons: string[] = [];
  let score = 0;
  let category = "No clear threat detected";

  if (matched.length > 0) {
    const [top, ...rest] = matched;
    score = top.base;
    category = top.label;
    reasons.push(top.reason);
    // Additional categories add a little, never as much as the primary one.
    for (const c of rest.slice(0, 3)) {
      score += 0.3;
      reasons.push(c.reason);
    }
  }

  for (const m of MODIFIERS) {
    if (m.pattern.test(text)) {
      score += matched.length > 0 ? m.delta : m.delta * 1.5;
      reasons.push(m.reason);
    }
  }

  const immediateDanger = matched[0]?.id === "attack";
  if (!immediateDanger) {
    for (const d of DAMPENERS) {
      if (d.pattern.test(text)) {
        score *= d.factor;
        reasons.push(d.reason);
      }
    }
  }

  score = round1(Math.min(10, Math.max(0, score)));
  const uncertain = matched.length === 0 || (matched.length === 1 && matched[0].id === "cashback");
  const level: Level = score < 4 ? "safe" : score < 7.5 ? "warning" : "danger";

  if (reasons.length === 0) {
    reasons.push("No known danger patterns were found. This does not prove the message is safe.");
  }
  if (uncertain) {
    reasons.push("Evidence is limited — this result is uncertain, not a confirmation either way.");
  }

  const tips = immediateDanger
    ? [
        "If you are in danger right now, call the police on 112 immediately.",
        "Move to a safe place and contact someone you trust.",
        "Keep this message as evidence.",
      ]
    : level === "safe"
      ? [
          "A low score is not proof of safety — stay alert.",
          "Do not click links or share personal details with people you do not know.",
          "If something feels off, ask someone you trust before acting.",
        ]
      : level === "warning"
        ? [
            "Do not click any link in this message.",
            "Never share your OTP, PIN or password with anyone.",
            "Verify by calling the company on its official number.",
            "Report and block the sender.",
          ]
        : [
            "Do not respond, pay, or follow any instruction in this message.",
            "Save screenshots as evidence.",
            "For threats of harm call 112; for cyber crime call 1930 or visit cybercrime.gov.in.",
            "Tell someone you trust and block the sender.",
          ];

  return { score, level, band: bandFor(score), category, uncertain, immediateDanger, reasons, tips };
}

export function shouldShowEmergency(a: Pick<Analysis, "score" | "immediateDanger">) {
  return a.score > EMERGENCY_THRESHOLD || a.immediateDanger;
}
