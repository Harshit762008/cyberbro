// Demo-mode, rule-based message check. Runs entirely in the browser — no AI backend.

export type Analysis = {
  score: number;
  level: "safe" | "warning" | "danger";
  reasons: string[];
  tips: string[];
};

export const EMERGENCY_NUMBER = "9509728855";
export const MANUAL_CALL_THRESHOLD = 8; // show "Call now" option above this score
export const AUTO_CALL_THRESHOLD = 9.5; // automatically call at or above this score

const RISK_SIGNALS: { pattern: RegExp; weight: number; reason: string }[] = [
  {
    pattern: /(otp|ओटीपी|one time password)/i,
    weight: 3,
    reason: "It asks for your OTP — never share an OTP with anyone.",
  },
  {
    pattern: /(password|पासवर्ड|passcode|\bpin\b)/i,
    weight: 3,
    reason: "It asks for your password — that is a serious red flag.",
  },
  {
    pattern: /(urgent|तुरंत|जल्दी|immediately|तत्काल|hurry|now only|last day)/i,
    weight: 2,
    reason: "It pushes you to hurry — scammers create fake urgency on purpose.",
  },
  {
    pattern: /(click|क्लिक|http:\/\/|https:\/\/|bit\.ly|tinyurl|short)/i,
    weight: 2,
    reason: "It tells you to click a link — that link can steal your details.",
  },
  {
    pattern: /(lottery|लॉटरी|winner|जीत|prize|इनाम|gift|उपहार|congratulations)/i,
    weight: 3,
    reason: "It dangles a lottery or prize you never entered — a very common scam.",
  },
  {
    pattern: /(bank|बैंक|kyc|account.*(block|suspend|बंद)|खाता)/i,
    weight: 2,
    reason: "It tries to scare you with your bank account or KYC.",
  },
  {
    pattern: /(verify|सत्यापित|update.*detail|जानकारी.*अपडेट|confirm your)/i,
    weight: 2,
    reason: "It asks you to 'verify' or 'update' details — treat this with caution.",
  },
  {
    pattern: /(पैसे|money|रुपये|₹|refund|रिफंड|payment|pay now)/i,
    weight: 1,
    reason: "It talks about money — check every claim carefully.",
  },
];

export function analyzeMessage(text: string): Analysis {
  let score = 0;
  const reasons: string[] = [];

  for (const signal of RISK_SIGNALS) {
    if (signal.pattern.test(text)) {
      score += signal.weight;
      reasons.push(signal.reason);
    }
  }

  score = Math.min(10, score);
  const level: Analysis["level"] = score <= 3 ? "safe" : score <= 6 ? "warning" : "danger";

  if (reasons.length === 0) {
    reasons.push("No obvious danger signs were found in this message.");
  }

  const tips =
    level === "safe"
      ? [
          "Still, do not click links from people you do not know.",
          "Do not share personal details with anyone over message or call.",
          "If something feels off, ask someone you trust before acting.",
        ]
      : level === "warning"
        ? [
            "Do not click any link given in this message.",
            "Never share your OTP or password with anyone.",
            "Call your bank or the company on their official number to check yourself.",
            "Report and block this message.",
          ]
        : [
            "Stop right there — do not act on this message.",
            "Do not click any link and do not send any money.",
            "Never share your OTP, password or bank details.",
            "Call the cyber crime helpline 1930 or complain at cybercrime.gov.in.",
            "Block and report the sender.",
          ];

  return { score, level, reasons, tips };
}

export function shouldShowCallOption(score: number) {
  return score > MANUAL_CALL_THRESHOLD;
}

export function shouldAutoCall(score: number) {
  return score >= AUTO_CALL_THRESHOLD;
}
