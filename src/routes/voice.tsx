// ============= Full file contents =============

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check, Info, Mic, MicOff, Sparkles, Volume2, X } from "lucide-react";

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

// Spoken replies, in English and Hindi. The reply language follows the
// language of the message the user spoke or typed.
const SPEECH = {
  en: {
    level: { safe: "Low risk", warning: "Be careful", danger: "Very dangerous!" },
    score: (s: string) => `Danger score ${s} out of 10.`,
  },
  hi: {
    level: { safe: "कम खतरा", warning: "सावधान रहें", danger: "बहुत खतरनाक!" },
    score: (s: string) => `खतरे का स्कोर 10 में से ${s} है।`,
  },
} as const;

type SpeechLang = keyof typeof SPEECH;

// Hindi messages arrive in Devanagari script from speech recognition.
function detectLang(text: string): SpeechLang {
  return /[\u0900-\u097F]/.test(text) ? "hi" : "en";
}

// Short sample sentence used by the audio check.
const SAMPLE_TEXT = "This is a voice test. If you can hear me, your device is ready to read out safety results.";
// Some browsers never report that playback finished, so stop showing
// "playing" once the sample should be over.
const SAMPLE_MS = 6000;

function pickVoice(lang: SpeechLang): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const wanted = lang === "hi" ? ["hi-in", "hi"] : ["en-in", "en"];
  for (const prefix of wanted) {
    const match = voices.find((v) => v.lang.toLowerCase().startsWith(prefix));
    if (match) return match;
  }
  return voices[0] ?? null;
}

// Speaks text out loud. Returns false when this browser cannot play speech.
function speakText(text: string, lang: SpeechLang = "en", onEnd?: () => void): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(lang);
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = lang === "hi" ? "hi-IN" : "en-IN";
  }
  u.rate = 1;
  u.volume = 1;
  if (onEnd) {
    u.onend = onEnd;
    u.onerror = onEnd;
  }
  window.speechSynthesis.speak(u);
  return true;
}

// Reads the result out loud in the same language the user spoke or typed.
function speakResult(r: Analysis, lang: SpeechLang) {
  const t = SPEECH[lang];
  const detail =
    lang === "hi"
      ? "कृपया इस मैसेज के किसी भी लिंक पर क्लिक न करें और अपना OTP या पासवर्ड किसी को न दें।"
      : `${r.reasons[0] ?? ""} ${r.tips[0] ?? ""}`;
  return speakText(`${t.level[r.level]}. ${t.score(r.score.toFixed(1))} ${detail}`, lang);
}

type AudioTest = "idle" | "playing" | "finished" | "unsupported";

function VoicePage() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [audioTest, setAudioTest] = useState<AudioTest>("idle");
  const [heard, setHeard] = useState<boolean | null>(null);
  const [hasVoices, setHasVoices] = useState<boolean | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const sampleTimer = useRef<number | null>(null);

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    // Pre-load speech synthesis voices — Chrome loads them asynchronously,
    // and speaking before they are ready can silently fail.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => setHasVoices(window.speechSynthesis.getVoices().length > 0);
      loadVoices();
      window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
        window.speechSynthesis.cancel();
        if (sampleTimer.current !== null) window.clearTimeout(sampleTimer.current);
        recRef.current?.stop();
      };
    }
    setHasVoices(false);
    return () => recRef.current?.stop();
  }, []);

  const runAudioTest = () => {
    setError("");
    setHeard(null);
    const started = speakText(SAMPLE_TEXT, "en", () => setAudioTest("finished"));
    if (!started) {
      setAudioTest("unsupported");
      return;
    }
    setAudioTest("playing");
    if (sampleTimer.current !== null) window.clearTimeout(sampleTimer.current);
    sampleTimer.current = window.setTimeout(() => setAudioTest("finished"), SAMPLE_MS);
  };

  const start = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    setError("");
    setResult(null);
    const rec = new Ctor();
    // hi-IN recognition also transcribes English speech well enough for
    // short messages, and lets Hindi speakers be understood.
    rec.lang = "hi-IN";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        const first = result?.[0];
        if (first) t += first.transcript;
      }
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
        <p>Uses your browser's built-in speech recognition (works best in Chrome or Edge). If the microphone doesn't start inside the editor preview, open the page in a new browser tab and allow microphone access. The result is also read out loud. The safety check is demo mode (rule-based, not AI).</p>
      </div>

      <section className={cardClass} aria-live="polite">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Check your audio first</p>
            <p className="text-xs text-muted-foreground">Play a short sample voice to make sure your device can read results out loud.</p>
          </div>
          <button type="button" onClick={runAudioTest} disabled={audioTest === "playing"} className={`${secondaryBtn} shrink-0`}>
            <Volume2 className="h-4 w-4" /> {audioTest === "playing" ? "Playing sample…" : "Test audio"}
          </button>
        </div>

        {audioTest === "playing" && (
          <p className="mt-3 animate-pulse text-sm text-primary">Playing a short sample… turn your volume up.</p>
        )}

        {audioTest === "unsupported" && (
          <p role="alert" className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            This browser can't play speech. Try Chrome or Edge, or update your browser.
          </p>
        )}

        {audioTest === "finished" && (
          <div className="mt-3 space-y-2">
            {heard === null ? (
              <>
                <p className="text-sm text-foreground">Did you hear the sample voice?</p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setHeard(true)} className={primaryBtn}>
                    <Check className="h-4 w-4" /> Yes, I heard it
                  </button>
                  <button type="button" onClick={() => setHeard(false)} className={secondaryBtn}>
                    <X className="h-4 w-4" /> No, I didn't
                  </button>
                </div>
              </>
            ) : heard ? (
              <p className="rounded-lg bg-safe/15 px-3 py-2 text-sm text-foreground">
                Great — your device can play speech. Results will be read out after you tap Analyze.
              </p>
            ) : (
              <div className="rounded-lg bg-warning/15 px-3 py-2 text-sm text-foreground">
                <p className="font-medium">No audio heard. Try these:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>Turn the volume up and make sure the device isn't on silent.</li>
                  <li>Use Chrome or Edge — some browsers have no voice built in.</li>
                  {hasVoices === false && <li>This browser has no speech voices installed. On Android, add a language or voice pack in the system settings.</li>}
                  <li>Then tap Test audio again.</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

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
        <button
          type="button"
          onClick={() => {
            const r = analyzeMessage(text);
            setResult(r);
            if (!speakResult(r, detectLang(text))) {
              setError("Audio playback is not supported in this browser.");
            }
          }}
          disabled={text.trim().length < 5}
          className={`${primaryBtn} mt-3`}
        >
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
            {LEVEL_TEXT[result.level]} — {result.score.toFixed(1)}/10
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
            {result.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
          <button type="button" onClick={() => speakResult(result, detectLang(text))} className={secondaryBtn}>
            <Volume2 className="h-4 w-4" /> Listen again
          </button>
          <p className="text-xs text-muted-foreground">For the full report and emergency options, paste the message on the dashboard.</p>
        </section>
      )}
    </PageShell>
  );
}
