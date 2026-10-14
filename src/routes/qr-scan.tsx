import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AlertTriangle, Copy, ImageUp, Link2, Loader2, ScanLine, X, XCircle } from "lucide-react";
import { toast } from "sonner";

import { PageShell, cardClass, primaryBtn, secondaryBtn } from "@/components/AppHeader";
import { looksLikeUrl } from "@/lib/url-check";

export const Route = createFileRoute("/qr-scan")({
  head: () => ({
    meta: [
      { title: "QR Code Scanner — Cyber Bro" },
      { name: "description", content: "Upload a QR code image and safely read what's inside without opening any link." },
      { property: "og:title", content: "QR Code Scanner — Cyber Bro" },
      { property: "og:description", content: "Decode QR images on your device and see the content before you act on it." },
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

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 1600;

async function decodeFile(file: File): Promise<string | null> {
  const { default: jsQR } = await import("jsqr");
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
    const code = jsQR(data.data, w, h, { inversionAttempts: "attemptBoth" });
    return code ? code.data : null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function QrPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [preview, setPreview] = useState<string | null>(null);

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
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setState({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <PageShell
      title="QR Code Scanner"
      intro="Upload a photo or screenshot of a QR code. We read it on your device and show what's inside — any link is shown as text and never opened."
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
          <button type="button" onClick={reset} disabled={state.kind === "idle" && !preview} className={secondaryBtn}>
            <X className="h-4 w-4" /> Clear
          </button>
        </div>
        {preview && (
          <img src={preview} alt="Uploaded QR code" className="mt-4 max-h-56 rounded-xl border border-border object-contain" />
        )}
      </section>

      {state.kind === "idle" && (
        <p className="rounded-2xl border border-dashed border-border bg-card/60 p-4 text-center text-sm text-muted-foreground">
          <ScanLine className="mx-auto mb-1 h-5 w-5" />
          No image yet. Upload a QR code image to read it.
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

      {state.kind === "success" && (
        <section className={`${cardClass} space-y-3`} aria-live="polite">
          <p className="font-semibold text-foreground">QR code content</p>
          <pre data-testid="qr-result" className="whitespace-pre-wrap break-all rounded-xl bg-muted p-3 text-sm text-foreground">{state.text}</pre>
          {looksLikeUrl(state.text) && (
            <p className="flex items-start gap-2 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              This QR code contains a link. It has not been opened. Check it before visiting.
            </p>
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
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
            {looksLikeUrl(state.text) && (
              <Link to="/link-check" search={{ url: state.text }} className={primaryBtn}>
                <Link2 className="h-4 w-4" /> Check this link
              </Link>
            )}
          </div>
        </section>
      )}
    </PageShell>
  );
}
