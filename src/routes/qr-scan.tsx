import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Copy,
  ExternalLink,
  HelpCircle,
  ImageUp,
  Link2,
  Loader2,
  ScanLine,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { PageShell, cardClass, primaryBtn, secondaryBtn } from "@/components/AppHeader";
import { checkUrl, looksLikeUrl } from "@/lib/url-check";

export const Route = createFileRoute("/qr-scan")({
  head: () => ({
    meta: [
      { title: "QR Code Security Scanner — Cyber Bro" },
      {
        name: "description",
        content:
          "Scan QR codes with your camera or upload an image. See what's inside and get a safety verdict before opening any link.",
      },
      { property: "og:title", content: "QR Code Security Scanner — Cyber Bro" },
      {
        property: "og:description",
        content: "Decode QR codes on your device and check links for suspicious patterns before you act on them.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QrPage,
});

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; text: string }
  | { kind: "error"; message: string };

type Verdict = "safe" | "suspicious" | "unverified";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 1600;
const SCAN_INTERVAL_MS = 350;

async function decodeImageData(data: Uint8ClampedArray, w: number, h: number): Promise<string | null> {
  const { default: jsQR } = await import("jsqr");
  const code = jsQR(data, w, h, { inversionAttempts: "attemptBoth" });
  return code ? code.data : null;
}

async function decodeFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Could not read this image."));
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser cannot process images.");
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h);
    return decodeImageData(data.data, w, h);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function verdictFor(text: string): { verdict: Verdict; reasons: string[] } {
  if (!looksLikeUrl(text)) {
    return { verdict: "unverified", reasons: ["This QR code contains plain text, not a web link."] };
  }
  const result = checkUrl(text);
  if (!result.valid) {
    return { verdict: "unverified", reasons: [result.error] };
  }
  const warnings = result.notes.filter((n) => n.kind === "warn").map((n) => n.text);
  if (warnings.length > 0) return { verdict: "suspicious", reasons: warnings };
  return {
    verdict: "safe",
    reasons: [
      "No suspicious patterns found in this link.",
      "This is a basic pattern check only — it is not a guarantee the site is safe.",
    ],
  };
}

const verdictStyles: Record<Verdict, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  safe: {
    label: "Potentially Safe",
    className: "border-safe/40 bg-safe/10 text-safe",
    Icon: CheckCircle2,
  },
  suspicious: {
    label: "Suspicious",
    className: "border-danger/40 bg-danger/10 text-danger",
    Icon: AlertTriangle,
  },
  unverified: {
    label: "Unable to Verify",
    className: "border-warning/40 bg-warning/10 text-warning",
    Icon: HelpCircle,
  },
};

function QrPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const [state, setState] = useState<State>({ kind: "idle" });
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearInterval(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Your browser does not support camera access. Try uploading an image instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      await video.play();
      setCameraOn(true);

      const canvas = document.createElement("canvas");
      scanTimerRef.current = window.setInterval(async () => {
        const v = videoRef.current;
        if (!v || v.readyState < 2 || !v.videoWidth) return;
        const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
        const w = Math.max(1, Math.round(v.videoWidth * scale));
        const h = Math.max(1, Math.round(v.videoHeight * scale));
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(v, 0, 0, w, h);
        try {
          const frame = ctx.getImageData(0, 0, w, h);
          const text = await decodeImageData(frame.data, w, h);
          if (text) {
            stopCamera();
            setState({ kind: "success", text });
            toast.success("QR code detected");
          }
        } catch {
          // keep scanning; a single bad frame is not an error
        }
      }, SCAN_INTERVAL_MS);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setCameraError("Camera permission was denied. Allow camera access in your browser settings, or upload an image instead.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setCameraError("No camera was found on this device. Try uploading an image instead.");
      } else {
        setCameraError("Could not start the camera. Try uploading an image instead.");
      }
    }
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setState({ kind: "error", message: "Please choose an image file (PNG, JPG, etc.)." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setState({ kind: "error", message: "This image is too large. Please use one under 10 MB." });
      return;
    }
    stopCamera();
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setState({ kind: "loading" });
    try {
      const text = await decodeFile(file);
      setState(
        text
          ? { kind: "success", text }
          : { kind: "error", message: "No QR code found in this image. Try a clearer, closer photo." },
      );
    } catch (e) {
      setState({ kind: "error", message: e instanceof Error ? e.message : "Could not read this image." });
    }
  };

  const reset = () => {
    stopCamera();
    setCameraError(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setState({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const result = state.kind === "success" ? verdictFor(state.text) : null;
  const isUrl = state.kind === "success" && looksLikeUrl(state.text);

  return (
    <PageShell
      title="QR Code Security Scanner"
      intro="Scan a QR code with your camera or upload an image. We decode it on your device, show what's inside, and check links for suspicious patterns — nothing is ever opened automatically."
    >
      <section className={cardClass}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          id="qr-file"
          data-testid="qr-input"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={state.kind === "loading"} className={primaryBtn}>
            <ImageUp className="h-4 w-4" /> Upload QR image
          </button>
          {cameraOn ? (
            <button type="button" onClick={stopCamera} className={secondaryBtn}>
              <X className="h-4 w-4" /> Stop camera
            </button>
          ) : (
            <button type="button" onClick={startCamera} disabled={state.kind === "loading"} className={secondaryBtn}>
              <Camera className="h-4 w-4" /> Scan with camera
            </button>
          )}
          <button type="button" onClick={reset} disabled={state.kind === "idle" && !preview && !cameraOn} className={secondaryBtn}>
            <X className="h-4 w-4" /> Clear
          </button>
        </div>

        {cameraError && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-danger/40 bg-danger/10 p-3 text-sm text-foreground">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            {cameraError}
          </p>
        )}

        <div className={cameraOn ? "mt-4" : "hidden"}>
          <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
            <video ref={videoRef} playsInline muted className="max-h-72 w-full object-contain" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-40 w-40 rounded-xl border-2 border-primary/70" />
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">Point your camera at a QR code — scanning happens on your device.</p>
        </div>

        {preview && (
          <img src={preview} alt="Uploaded QR code" className="mt-4 max-h-56 rounded-xl border border-border object-contain" />
        )}
      </section>

      {state.kind === "idle" && !cameraOn && (
        <p className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
          <ScanLine className="mx-auto mb-1 h-5 w-5" />
          No QR code yet. Use your camera or upload an image to read one.
        </p>
      )}

      {state.kind === "loading" && (
        <p className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading QR code…
        </p>
      )}

      {state.kind === "error" && (
        <section role="alert" className="flex items-start gap-3 rounded-2xl border border-danger/40 bg-danger/10 p-5">
          <XCircle className="h-5 w-5 shrink-0 text-danger" />
          <p className="text-sm text-foreground">{state.message}</p>
        </section>
      )}

      {state.kind === "success" && result && (
        <section className={`${cardClass} space-y-4`} aria-live="polite">
          <div className={`flex items-center gap-2 rounded-xl border px-4 py-3 ${verdictStyles[result.verdict].className}`}>
            {(() => {
              const VIcon = verdictStyles[result.verdict].Icon;
              return <VIcon className="h-5 w-5 shrink-0" />;
            })()}
            <p className="font-semibold" data-testid="qr-verdict">
              {verdictStyles[result.verdict].label}
            </p>
          </div>

          <div>
            <p className="font-semibold text-foreground">QR code content</p>
            <pre data-testid="qr-result" className="mt-2 whitespace-pre-wrap break-all rounded-xl bg-muted p-3 text-sm text-foreground">
              {state.text}
            </pre>
          </div>

          <ul className="space-y-1.5 text-sm text-foreground">
            {result.reasons.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />
                {r}
              </li>
            ))}
          </ul>

          {isUrl && (
            <p className="flex items-start gap-2 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              This link has not been opened. Review the verdict above before visiting it.
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              className={secondaryBtn}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(state.text);
                  toast.success("Copied to clipboard");
                } catch {
                  toast.error("Could not copy — please select the text and copy it manually.");
                }
              }}
            >
              <Copy className="h-4 w-4" /> Copy text
            </button>
            {isUrl && (
              <>
                <Link to="/link-check" search={{ url: state.text }} className={secondaryBtn}>
                  <Link2 className="h-4 w-4" /> Detailed link check
                </Link>
                <a
                  href={state.text}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className={result.verdict === "suspicious" ? secondaryBtn : primaryBtn}
                  data-testid="qr-open-link"
                >
                  <ExternalLink className="h-4 w-4" />
                  {result.verdict === "suspicious" ? "Open anyway (not recommended)" : "Open link"}
                </a>
              </>
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}
