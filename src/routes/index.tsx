import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
      { title: "CyberSaathi AI — आपका साइबर सुरक्षा साथी" },
      {
        name: "description",
        content:
          "संदिग्ध मैसेज पेस्ट करें और तुरंत जानें कि वह धोखाधड़ी है या नहीं। आसान हिंदी में खतरे का स्कोर और सुरक्षा सलाह।",
      },
      { property: "og:title", content: "CyberSaathi AI — आपका साइबर सुरक्षा साथी" },
      {
        property: "og:description",
        content:
          "संदिग्ध मैसेज का विश्लेषण करें, खतरे का स्कोर देखें और सरल हिंदी में सुरक्षा सलाह पाएं।",
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
  { pattern: /(otp|ओटीपी)/i, weight: 3, reason: "इसमें OTP मांगा गया है — OTP कभी किसी को न दें।" },
  { pattern: /(password|पासवर्ड|पासवर्ड)/i, weight: 3, reason: "इसमें पासवर्ड मांगा गया है — यह बहुत खतरनाक है।" },
  { pattern: /(urgent|तुरंत|जल्दी|immediately|तत्काल)/i, weight: 2, reason: "यह मैसेज जल्दबाजी करा रहा है — घोटालेबाज़ ऐसा ही करते हैं।" },
  { pattern: /(click|क्लिक|http:\/\/|https:\/\/|bit\.ly|tinyurl|short)/i, weight: 2, reason: "इसमें लिंक पर क्लिक करने को कहा गया है।" },
  { pattern: /(lottery|लॉटरी|winner|जीते|prize|इनाम|gift|उपहार)/i, weight: 3, reason: "लॉटरी या इनाम जीतने का लालच दिया गया है — यह आम घोटाला है।" },
  { pattern: /(bank|बैंक|kyc|account.*(block|बंद)|खाता)/i, weight: 2, reason: "बैंक या KYC का नाम लेकर डराया गया है।" },
  { pattern: /(verify|सत्यापित|update.*detail|जानकारी.*अपडेट)/i, weight: 2, reason: "जानकारी 'वेरिफाई' करने को कहा गया है — सावधान रहें।" },
  { pattern: /(paisa|पैसे|money|रुपये|₹|refund|रिफंड)/i, weight: 1, reason: "पैसों की बात की गई है — ध्यान से जांचें।" },
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
    reasons.push("इस मैसेज में कोई साफ़ खतरनाक संकेत नहीं मिला।");
  }

  const tips =
    level === "safe"
      ? [
          "फिर भी अनजान लिंक पर क्लिक न करें।",
          "अपनी निजी जानकारी किसी से साझा न करें।",
          "शक हो तो भरोसेमंद व्यक्ति से पूछ लें।",
        ]
      : level === "warning"
        ? [
            "इस मैसेज में दिए लिंक पर क्लिक न करें।",
            "OTP या पासवर्ड कभी किसी को न दें।",
            "बैंक/कंपनी के आधिकारिक नंबर पर खुद कॉल करके पता करें।",
            "मैसेज को रिपोर्ट और ब्लॉक करें।",
          ]
        : [
            "तुरंत रुकें — इस मैसेज पर कोई कार्रवाई न करें।",
            "किसी भी लिंक पर क्लिक न करें और कोई पैसा न भेजें।",
            "OTP, पासवर्ड या बैंक की जानकारी बिल्कुल न दें।",
            "साइबर क्राइम हेल्पलाइन 1930 पर कॉल करें या cybercrime.gov.in पर शिकायत करें।",
            "संदेश भेजने वाले को ब्लॉक और रिपोर्ट करें।",
          ];

  return { score, level, reasons, tips };
}

const LEVEL_STYLE = {
  safe: {
    label: "कम खतरा",
    sub: "यह मैसेज सुरक्षित लग रहा है",
    icon: ShieldCheck,
    badge: "bg-safe/15 text-safe",
    bar: "bg-safe",
  },
  warning: {
    label: "सावधान रहें",
    sub: "इस मैसेज में कुछ खतरनाक संकेत हैं",
    icon: AlertTriangle,
    badge: "bg-warning/20 text-warning",
    bar: "bg-warning",
  },
  danger: {
    label: "बहुत खतरनाक!",
    sub: "यह मैसेज धोखाधड़ी हो सकता है",
    icon: ShieldAlert,
    badge: "bg-danger/15 text-danger",
    bar: "bg-danger",
  },
} as const;

const COMING_SOON = [
  { icon: ScanLine, title: "QR कोड स्कैन", desc: "खतरनाक QR कोड पहचानें" },
  { icon: Link2, title: "लिंक जांच", desc: "किसी भी लिंक की सुरक्षा जांचें" },
  { icon: KeyRound, title: "पासवर्ड जांच", desc: "जानें पासवर्ड मज़बूत है या नहीं" },
  { icon: Mic, title: "वॉइस सहायक", desc: "बोलकर सवाल पूछें" },
  { icon: PhoneCall, title: "आपातकालीन सहायता", desc: "तुरंत मदद से जुड़ें" },
];

function Index() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);

  const handleAnalyze = () => {
    if (!message.trim()) return;
    setResult(analyzeMessage(message));
  };

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
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              CyberSaathi AI
            </h1>
            <p className="text-xs text-muted-foreground">आपका साइबर सुरक्षा साथी</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Intro */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            संदिग्ध मैसेज की जांच करें
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            कोई भी शक भरा SMS, WhatsApp या ईमेल मैसेज यहाँ पेस्ट करें — हम बताएंगे कि वह
            धोखाधड़ी है या नहीं।
          </p>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="यहाँ मैसेज पेस्ट करें… जैसे: 'बधाई हो! आपने ₹25,000 की लॉटरी जीती है। तुरंत इस लिंक पर क्लिक करें और OTP दें।'"
            className="mt-4 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />

          <button
            onClick={handleAnalyze}
            disabled={!message.trim()}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            <Sparkles className="h-4 w-4" />
            जांच करें (Analyze)
          </button>
        </section>

        {/* Result */}
        {result && style && LevelIcon && (
          <section className="space-y-4">
            {/* Danger score */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${style.badge}`}>
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
                खतरे का स्कोर: 0 = बिल्कुल सुरक्षित, 10 = बहुत खतरनाक
              </p>
            </div>

            {/* Hindi explanation */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 text-primary" />
                सरल हिंदी में समझिए
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
                सुरक्षा की सलाह
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
          <h3 className="text-base font-semibold text-foreground">जल्द आ रहा है</h3>
          <p className="text-xs text-muted-foreground">
            ये सुविधाएँ आने वाले समय में जोड़ी जाएंगी
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
                  जल्द आ रहा है
                </span>
              </div>
            ))}
          </div>
        </section>

        <footer className="pb-6 pt-2 text-center text-xs text-muted-foreground">
          साइबर अपराध की शिकायत: हेल्पलाइन <span className="font-semibold text-foreground">1930</span> या{" "}
          <span className="font-semibold text-foreground">cybercrime.gov.in</span>
        </footer>
      </main>
    </div>
  );
}
