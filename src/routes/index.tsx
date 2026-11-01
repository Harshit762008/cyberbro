import { createFileRoute, Link } from "@tanstack/react-router";
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
  Loader2,
  Info,
  X,
  ChevronRight,
} from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import {
  analyzeMessage,
  shouldShowEmergency,
  EMERGENCY_NUMBER,
  type Analysis,
} from "@/lib/analyze-message";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cyber Bro — Your Cyber Safety Companion" },
      {
        name: "description",
        content:
          "Paste a suspicious message and instantly find out if it is a scam. Get a 0-10 danger score, a plain-English risk explanation, and safety advice.",
      },
      { property: "og:title", content: "Cyber Bro — Your Cyber Safety Companion" },
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

const TOOLS = [
  { to: "/qr-scan", icon: ScanLine, title: "QR Code Scan", desc: "Read a QR image safely" },
  { to: "/link-check", icon: Link2, title: "Link Check", desc: "Check a link's format" },
  { to: "/password-check", icon: KeyRound, title: "Password Check", desc: "See if your password is strong" },
  { to: "/voice", icon: Mic, title: "Voice Assistant", desc: "Speak a message to check it" },
  { to: "/emergency", icon: PhoneCall, title: "Emergency Support", desc: "Get help right away" },
  { to: "/device-guardian", icon: ShieldCheck, title: "Protect My Device", desc: "Review Android or Windows security" },
  { to: "/media-detector", icon: Sparkles, title: "AI vs Human Media Detector", desc: "Photo & video · Setup required" },
] as const;

type Status = "idle" | "loading" | "done" | "error";

function Index() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  const handleAnalyze = () => {
    const text = message.trim();
    if (text.length < 5) {
      setStatus("error");
      setError("Please paste a longer message (at least 5 characters).");
      setResult(null);
      return;
    }
    setStatus("loading");
    setError("");
    // Short pause so the "checking" state is visible; the check itself runs on this device.
    window.setTimeout(() => {
      try {
        setResult(analyzeMessage(text));
        setStatus("done");
      } catch {
        setStatus("error");
        setError("Something went wrong while checking. Please try again.");
      }
    }, 350);
  };

  const handleClear = () => {
    setMessage("");
    setResult(null);
    setStatus("idle");
    setError("");
  };

  // Auto-call the emergency number when the score is 9.5 or higher
  useEffect(() => {
    if (result && result.score > 9.5) {
      window.location.href = `tel:${EMERGENCY_NUMBER}`;
    }
  }, [result]);

  const showEmergencyCall = result !== null && shouldShowEmergency(result);

  const style = result ? LEVEL_STYLE[result.level] : null;
  const LevelIcon = style?.icon;

  return (
    <div className="min-h-screen bg-background font-sans">
      <AppHeader />

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        {/* Intro */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-lg font-semibold text-foreground">Check a suspicious message</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
              <Info className="h-3 w-3" />
              Demo mode — rule-based check, not AI
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste any doubtful SMS, WhatsApp or email message here — we will look for common scam
            signs. The check runs on your device; nothing is uploaded.
          </p>

          <textarea
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              if (status === "error") setStatus("idle");
            }}
            rows={5}
            maxLength={2000}
            aria-label="Suspicious message"
            placeholder="Paste the message here… e.g. 'Congrats! You have won a ₹25,000 lottery. Click this link now and share your OTP.'"
            className="mt-4 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-right text-[11px] text-muted-foreground">{message.length}/2000</p>

          {status === "error" && (
            <p role="alert" className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!message.trim() || status === "loading"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {status === "loading" ? "Checking…" : "Analyze"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!message && !result}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <X className="h-4 w-4" />
              Clear
            </button>
          </div>
        </section>

        {status === "idle" && !result && (
          <p className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
            Your danger score and safety advice will appear here after you tap Analyze.
          </p>
        )}

        {/* Result */}
        {status === "done" && result && style && LevelIcon && (
          <section className="space-y-4" aria-live="polite">
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
                    <p className="text-xs text-muted-foreground">{result.band}</p>
                    <p className="mt-0.5 text-xs font-medium text-foreground">
                      Category: {result.category}
                      {result.uncertain && " · Uncertain"}
                    </p>
                  </div>
                </div>
                <p className="text-3xl font-bold tabular-nums text-foreground" data-testid="score">
                  {result.score.toFixed(1)}
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
                Danger score: 0 = no warning signs found, 10 = very dangerous. Demo mode: based on
                keyword patterns only, so always use your own judgement.
              </p>
            </div>

            {/* Emergency call */}
            {showEmergencyCall && (
              <div className="rounded-2xl border border-danger/40 bg-danger/10 p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger text-danger-foreground">
                    <PhoneCall className="h-6 w-6" />
                  </span>
                  <div className="flex-1">
                    <p className="text-base font-semibold text-foreground">
                      {result.score > 9.5
                        ? "Critical danger — calling emergency support now…"
                        : "Immediate danger reported — get help now"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {result.score > 9.5
                        ? "If the call does not start automatically, tap the button below."
                        : "Don't wait for the score — call for help, or dial 112 for police."}
                    </p>
                    <a
                      href={`tel:${EMERGENCY_NUMBER}`}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-danger px-5 py-3 text-sm font-semibold text-danger-foreground transition-opacity hover:opacity-90"
                    >
                      <PhoneCall className="h-4 w-4" />
                      Call now: {EMERGENCY_NUMBER}
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Explanation */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Why this score
              </h2>
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
              <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <CheckCircle2 className="h-5 w-5 text-safe" />
                Safety recommendations
              </h2>
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

        {/* Safety tools */}
        <section>
          <h2 className="text-base font-semibold text-foreground">Safety tools</h2>
          <p className="text-xs text-muted-foreground">Tap a tool to open it</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {TOOLS.map(({ to, icon: Icon, title, desc }) => (
              <Link
                key={title}
                to={to}
                className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/50 hover:bg-accent/40"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">{title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
                <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
                  Open <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="pb-6 pt-2 text-center text-xs text-muted-foreground">
          Report cyber crime: helpline{" "}
          <a href="tel:1930" className="font-semibold text-foreground underline-offset-2 hover:underline">
            1930
          </a>{" "}
          or{" "}
          <a
            href="https://cybercrime.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground underline-offset-2 hover:underline"
          >
            cybercrime.gov.in
          </a>
        </footer>
      </main>
    </div>
  );
}
