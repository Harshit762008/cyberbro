import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, ImagePlus, Trash2, RefreshCw, ShieldCheck, LockKeyhole, Info } from "lucide-react";
import { PageShell } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { MediaCapture } from "@/components/MediaCapture";
import { useServerFn } from "@tanstack/react-start";
import { aiAnalyzeMedia, type AiMediaResult } from "@/lib/ai.functions";
import { MEDIA_ACCEPT, validateMedia, validateDuration } from "@/lib/media-validation";

export const Route = createFileRoute("/media-detector")({
  head: () => ({ meta: [
    { title: "AI vs Human Media Detector — Cyber Bro" },
    { name: "description", content: "Select or capture photos and videos for a privacy-conscious media authenticity assessment. Analysis by Google Gemini after consent." },
    { property: "og:title", content: "AI vs Human Media Detector — Cyber Bro" },
    { property: "og:description", content: "Real photo and video selection and camera capture, with evidence-based Gemini assessments." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MediaDetector,
});

function MediaDetector() {
  const picker = useRef<HTMLInputElement>(null);
  const selection = useRef(0);
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [valid, setValid] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState("");
  const [camera, setCamera] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [consent, setConsent] = useState(false);
  const [source, setSource] = useState("Uploaded media");
  const runMedia = useServerFn(aiAnalyzeMedia);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AiMediaResult | null>(null);
  const [aiError, setAiError] = useState("");
  async function analyze() {
    if (!file || !valid || !consent) return;
    const current = selection.current;
    setAnalyzing(true); setAiError(""); setResult(null);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = ""; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      const res = await runMedia({ data: { mime: file.type as "image/jpeg", base64: btoa(bin), consent: true } });
      if (selection.current !== current) return;
      if (res.ok) setResult(res.result); else setAiError(res.error);
    } catch { if (selection.current === current) setAiError("Analysis failed. Please try again."); }
    finally { if (selection.current === current) setAnalyzing(false); }
  }
  useEffect(() => () => { selection.current += 1; }, []);
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);

  function remove() { selection.current += 1; setResult(null); setAiError(""); setAnalyzing(false); setFile(null); setValid(false); setValidating(false); setError(""); setConsent(false); if (picker.current) picker.current.value = ""; }
  async function select(files: FileList | File[], origin = "Uploaded media") {
    const selected = Array.from(files);
    remove();
    if (selected.length !== 1) { setError("Choose one photo or video at a time."); return; }
    const next = selected[0];
    if (!next) return;
    const invalid = validateMedia(next);
    if (invalid) { setError(invalid); return; }
    const current = ++selection.current;
    setValidating(true); setFile(next); setSource(origin);
    const preview = URL.createObjectURL(next);
    try {
      await new Promise<void>((resolve, reject) => {
        const element = next.type.startsWith("image/") ? new Image() : document.createElement("video");
        const cleanup = () => { element.onload = null; element.onerror = null; if (element instanceof HTMLVideoElement) { element.onloadedmetadata = null; element.removeAttribute("src"); element.load(); } };
        const finish = (issue?: string) => { cleanup(); if (issue) reject(new Error(issue)); else resolve(); };
        element.onerror = () => finish("This file is corrupted or cannot be decoded by your browser. Choose another file.");
        if (element instanceof HTMLVideoElement) {
          element.preload = "metadata";
          element.onloadedmetadata = () => { const issue = validateDuration(element.duration); finish(issue ?? (element.videoWidth ? undefined : "No readable video track was found.")); };
        } else element.onload = () => finish(element.naturalWidth ? undefined : "This image could not be read.");
        element.src = preview;
      });
      if (selection.current === current) setValid(true);
    } catch (cause) { if (selection.current === current) setError(cause instanceof Error ? cause.message : "Media could not be read."); }
    finally { URL.revokeObjectURL(preview); if (selection.current === current) setValidating(false); }
  }

  return <PageShell title="AI vs Human Media Detector" intro="Photo & video authenticity assessment">
    <section className="space-y-4">
      <input ref={picker} type="file" accept={MEDIA_ACCEPT} className="hidden" aria-label="Choose media file" onChange={(event) => { if (event.target.files?.length) void select(event.target.files); }} />
      <div className={`flex min-h-52 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 text-center ${dragging ? "border-primary bg-accent" : "border-border bg-muted/30"}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void select(event.dataTransfer.files); }}>
        <ImagePlus className="h-10 w-10 text-primary" />
        <h2 className="font-heading text-lg font-semibold">Choose a photo or video</h2>
        <p className="text-sm text-muted-foreground">Drop one file here · JPG, PNG, WEBP, MP4 or WEBM</p>
        <Button onClick={() => picker.current?.click()}><Upload />Choose Photo or Video</Button>
        <p className="text-xs text-muted-foreground">Photos: up to 10 MB · Videos: up to 15 MB and 60 seconds</p>
      </div>
      <Button variant="outline" onClick={() => setCamera(true)} disabled={camera}><Camera />Open Camera</Button>
      {camera && <MediaCapture onClose={() => setCamera(false)} onUse={(captured) => { setCamera(false); void select([captured], captured.type.startsWith("video/") ? "Captured video (no audio)" : "Captured photo"); }} />}
      {error && <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">{error}</p>}
      {file && <section className="space-y-3 border-y border-border py-5" aria-label="Selected media">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-all font-semibold">{file.name}</h2><p className="mt-1 text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type} · {source}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => picker.current?.click()}><RefreshCw />Change File</Button><Button variant="outline" size="sm" onClick={remove}><Trash2 />Remove File</Button></div></div>
        {url && (file.type.startsWith("video/") ? <video src={url} controls playsInline className="max-h-96 w-full rounded-lg bg-muted object-contain" aria-label="Selected video preview" /> : <img src={url} alt="Selected photo preview" className="max-h-96 w-full rounded-lg bg-muted object-contain" />)}
        <p role="status" className="text-sm text-muted-foreground">{validating ? "Checking file readability…" : valid ? "Ready · tick consent below, then Analyze" : "File not ready for analysis"}</p>
      </section>}
    </section>
    <section className="space-y-3 border-t border-border pt-5">
      <h2 className="flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4 text-primary" />Media privacy</h2>
      <p className="text-sm text-muted-foreground">Your selection remains in this tab. Removing or replacing it, leaving this page or reloading releases the preview. No media, extracted frames or results are saved to an account or database.</p>
      <p className="text-sm text-muted-foreground">Analyze sends the selected file once to Google Gemini through Lovable’s AI service, using a zero-data-retention endpoint. The file is processed in memory on our server, not stored, and the result is shown only in this tab.</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={consent} disabled={!valid} onChange={(event) => setConsent(event.target.checked)} />I consent to sending this file to Google Gemini for a one-time analysis.</label>
      <Button disabled={!valid || !consent || analyzing} onClick={() => void analyze()}><ShieldCheck />{analyzing ? "Analyzing…" : "Analyze Media"}</Button>
      {analyzing && <p role="status" className="text-xs text-muted-foreground">Sending to Gemini and waiting for the assessment…</p>}
      {aiError && <p role="alert" className="border-l-2 border-danger pl-3 text-sm text-danger">{aiError}</p>}
      {result && file && <section aria-label="Assessment result" className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-xs text-muted-foreground">Gemini assessment · {file.type.startsWith("video/") ? "Video" : "Photo"} · not forensic proof</p>
        <h3 className={`font-heading text-xl font-bold ${result.category === "LIKELY AI-GENERATED" ? "text-danger" : result.category === "LIKELY AUTHENTIC/HUMAN-CREATED" ? "text-safe" : "text-warning"}`}>{result.category}</h3>
        <p className="text-sm">{result.explanation}</p>
        {([["Signs of AI generation", result.aiEvidence], ["Signs of authentic capture", result.authenticEvidence], ["Signs of editing / manipulation", result.manipulationSigns], ["Limitations", result.limitations], ["Next steps", result.nextSteps]] as const).map(([t, items]) => items.length > 0 && <div key={t}><h4 className="text-sm font-semibold">{t}</h4><ul className="ml-5 list-disc text-sm text-muted-foreground">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>)}
      </section>}
    </section>
    <section className="space-y-3 border-t border-border pt-5"><h2 className="font-heading text-lg font-semibold">Authenticity has limits</h2><p className="text-sm text-muted-foreground">Visual artifacts can arise from AI generation, ordinary editing or compression. Absence of artifacts is not proof of human creation. Future assessments must explain evidence and alternatives, not present an uncalibrated probability or forensic guarantee.</p><p className="text-sm text-muted-foreground">The AI only sees the visual (and for video, possibly audio) content; file metadata and provenance credentials are not verified. Verify the original source and any authenticity credentials independently.</p></section>
  </PageShell>;
}