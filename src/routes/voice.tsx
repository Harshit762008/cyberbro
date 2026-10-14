import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Info, Mic, MicOff, Sparkles, X } from "lucide-react";

import { PageShell, cardClass, primaryBtn, secondaryBtn } from "@/components/AppHeader";
import { analyzeMessage, type Analysis } from "@/lib/analyze-message";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "Voice Assistant — Cyber Bro" },
      { name: "description", content: "Speak or read out a suspicious message and get a quick demo safety check." },
      { property: "og:title", content: "Voice Assistant — Cyber Bro" },
      { property: "og:description", content: "Use your voice to check a suspicious message, using your browser's free speech recognition." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VoicePage,
});

// Minimal typing for the browser Web Speech API.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const LEVEL_TEXT = { safe: "Low risk", warning: "Be careful", danger: "Very dangerous!" } as const;

function VoicePage() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    return () => recRef.current?.stop();
  }, []);

  const start = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError("");
    setResult(null);
    const rec = new Ctor();
    rec.lang = "en-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setText(t);
    };
    rec.onerror = (e) => {
      setError(
        e.error === "not-allowed"
          ? "Microphone permission was denied. Allow microphone access in your browser and try again."
          : e.error === "no-speech"
            ? "No speech heard. Please try again and speak clearly."
            : `Voice input stopped (${e.error}). Please try again.`,
      );
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone. Please try again.");
    }
  };

  const stop = () => recRef.current?.stop();

  return (
    <PageShell
      title="Voice Assistant"
      intro="Tap the microphone and read out a suspicious message. We'll turn it into text and run the same demo check as the dashboard."
    >
      <div className="flex items-start gap-2 rounded-2xl border border-warning/40 bg-warning/15 p-4 text-sm text-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Uses your browser's built-in speech recognition (works best in Chrome or Edge). Some browsers send audio to their own speech service. The safety check is demo mode (rule-based, not AI).</p>
      </div>

      <section className={cardClass}>
        {supported === false && (
          <p role="alert" className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            Voice input is not supported in this browser. You can still type the message below.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {listening ? (
            <button type="button" onClick={stop} className={`${primaryBtn} bg-danger text-danger-foreground`}>
              <MicOff className="h-4 w-4" /> Stop listening
            </button>
          ) : (
            <button type="button" onClick={start} disabled={!supported} className={primaryBtn}>
              <Mic className="h-4 w-4" /> Start speaking
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setText("");
              setResult(null);
              setError("");
            }}
            disabled={!text && !result}
            className={secondaryBtn}
          >
            <X className="h-4 w-4" /> Clear
          </button>
        </div>
        {listening && <p className="mt-2 animate-pulse text-sm text-primary">Listening… speak now</p>}
        {error && <p role="alert" className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
          aria-label="Message text"
          placeholder="Your words will appear here — you can also type or edit."
          className="mt-4 w-full resize-y rounded-xl border border-input bg-background p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button type="button" onClick={() => setResult(analyzeMessage(text))} disabled={text.trim().length < 5} className={`${primaryBtn} mt-3`}>
          <Sparkles className="h-4 w-4" /> Analyze
        </button>
      </section>

      {!result ? (
        <p className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
          Speak or type a message, then tap Analyze.
        </p>
      ) : (
        <section className={`${cardClass} space-y-2`} aria-live="polite">
          <p className="text-lg font-semibold text-foreground">
            {LEVEL_TEXT[result.level]} — {result.score}/10
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {result.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <p className="text-xs text-muted-foreground">For the full report and emergency options, paste the message on the dashboard.</p>
        </section>
      )}
    </PageShell>
  );
}
