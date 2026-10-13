import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ScanLine,
  Link2,
  KeyRound,
  Mic,
  PhoneCall,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CyberSaathi AI — Your Cyber Safety Companion" },
      {
        name: "description",
        content:
          "Paste a suspicious message and instantly find out if it is a scam. Get a 0-10 danger score, a plain-English risk explanation, and safety advice.",
      },
      { property: "og:title", content: "CyberSaathi AI — Your Cyber Safety Companion" },
      {
        property: "og:description",
        content:
          "Analyse suspicious SMS, WhatsApp and email messages, see a 0-10 danger score, and get simple safety advice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Analysis = {
  score: number;
  level: "safe" | "warning" | "danger";
  reasons: string[];
  tips: string[];
};

const RISK_SIGNALS: { pattern: RegExp; weight: number; reason: string }[] = [
  {
    pattern: /(otp|ओटीपी|one time password)/i,
    weight: 3,
    reason: "It asks for your OTP — never share an OTP with anyone.",
  },
  {
    pattern: /(password|पासवर्ड|passcode|pin)/i,
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

function analyzeMessage(text: string): Analysis {
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

const LEVEL_STYLE = {
  safe: {
    label: "Low risk",
    sub: "This message looks safe",
    icon: ShieldCheck,
    badge: "bg-safe/15 text-safe",
    bar: "bg-safe",
  },
  warning: {
    label: "Be careful",
    sub: "This message has some danger signs",
    icon: AlertTriangle,
    badge: "bg-warning/20 text-warning",
    bar: "bg-warning",
  },
  danger: {
    label: "Very dangerous!",
    sub: "This message is likely a scam",
    icon: ShieldAlert,
    badge: "bg-danger/15 text-danger",
    bar: "bg-danger",
  },
} as const;

const EMERGENCY_NUMBER = "9509728855";
const MANUAL_CALL_THRESHOLD = 8; // show "Call now" option above this score
const AUTO_CALL_THRESHOLD = 9.5; // automatically call at or above this score

const COMING_SOON = [
  { icon: ScanLine, title: "QR Code Scan", desc: "Spot harmful QR codes" },
  { icon: Link2, title: "Link Check", desc: "Check if any link is safe" },
  { icon: KeyRound, title: "Password Check", desc: "See if your password is strong" },
  { icon: Mic, title: "Voice Assistant", desc: "Ask questions by speaking" },
  { icon: PhoneCall, title: "Emergency Support", desc: "Get help right away" },
];

function Index() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);

  const handleAnalyze = () => {
    if (!message.trim()) return;
    setResult(analyzeMessage(message));
  };

  // Auto-call the emergency number when the score is 9.5 or higher
  useEffect(() => {
    if (result && result.score >= AUTO_CALL_THRESHOLD) {
      window.location.href = `tel:${EMERGENCY_NUMBER}`;
    }
  }, [result]);

  const showEmergencyCall = result !== null && result.score > MANUAL_CALL_THRESHOLD;

  const style = result ? LEVEL_STYLE[result.level] : null;
  const LevelIcon = style?.icon;

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">CyberSaathi AI</h1>
            <p className="text-xs text-muted-foreground">Your cyber safety companion</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Intro */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Check a suspicious message</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste any doubtful SMS, WhatsApp or email message here — we will tell you whether it is
            a scam.
          </p>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="Paste the message here… e.g. 'Congrats! You have won a ₹25,000 lottery. Click this link now and share your OTP.'"
            className="mt-4 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <button
            onClick={handleAnalyze}
            disabled={!message.trim()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Sparkles className="h-4 w-4" />
            Analyze
          </button>
        </section>

        {/* Result */}
        {result && style && LevelIcon && (
          <section className="space-y-4">
            {/* Danger score */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.badge}`}
                  >
                    <LevelIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-foreground">{style.label}</p>
                    <p className="text-xs text-muted-foreground">{style.sub}</p>
                  </div>
                </div>
                <p className="text-3xl font-bold tabular-nums text-foreground">
                  {result.score}
                  <span className="text-base font-medium text-muted-foreground">/10</span>
                </p>
              </div>
              <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
                  style={{ width: `${result.score * 10}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Danger score: 0 = completely safe, 10 = very dangerous
              </p>
            </div>

            {/* Explanation */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Why this is risky
              </h3>
              <ul className="mt-3 space-y-2">
                {result.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {/* Safety tips */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <CheckCircle2 className="h-5 w-5 text-safe" />
                Safety recommendations
              </h3>
              <ul className="mt-3 space-y-2">
                {result.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-safe" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Coming soon */}
        <section>
          <h3 className="text-base font-semibold text-foreground">Coming soon</h3>
          <p className="text-xs text-muted-foreground">
            These features will be added in a later update
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {COMING_SOON.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl border border-dashed border-border bg-card/60 p-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Coming soon
                </span>
              </div>
            ))}
          </div>
        </section>

        <footer className="pb-6 pt-2 text-center text-xs text-muted-foreground">
          Report cyber crime: helpline{" "}
          <span className="font-semibold text-foreground">1930</span> or{" "}
          <span className="font-semibold text-foreground">cybercrime.gov.in</span>
        </footer>
      </main>
    </div>
  );
}
