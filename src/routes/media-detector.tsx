import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, ImagePlus, Trash2, RefreshCw, ShieldCheck, LockKeyhole, Info } from "lucide-react";
import { PageShell } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { MediaCapture } from "@/components/MediaCapture";
import { MEDIA_ACCEPT, validateMedia, validateDuration } from "@/lib/media-validation";

export const Route = createFileRoute("/media-detector")({
  head: () => ({ meta: [
    { title: "AI vs Human Media Detector — Cyber Bro" },
    { name: "description", content: "Select or capture photos and videos for a privacy-conscious media authenticity assessment. Gemini analysis requires configuration." },
    { property: "og:title", content: "AI vs Human Media Detector — Cyber Bro" },
    { property: "og:description", content: "Real photo and video selection and camera capture, with honest analysis availability and no fabricated detection scores." },
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
  useEffect(() => () => { selection.current += 1; }, []);
  useEffect(() => {
    if (!file) { setUrl(null); return; }
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);

  function remove() { selection.current += 1; setFile(null); setValid(false); setValidating(false); setError(""); setConsent(false); if (picker.current) picker.current.value = ""; }
  async function select(files: FileList | File[], origin = "Uploaded media") {
    remove();
    if (files.length !== 1) { setError("Choose one photo or video at a time."); return; }
    const next = files[0];
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
    <section className="space-y-3 border-l-2 border-warning pl-4" aria-label="Detector availability">
      <h2 className="flex items-center gap-2 font-semibold"><Info className="h-5 w-5 text-warning" />Detector not configured</h2>
      <p className="text-sm text-muted-foreground">Photo/video selection and camera capture work locally. Analysis is unavailable: no Gemini analysis service is connected. No media is sent, no assessment is generated and no model is configured.</p>
      <p className="text-sm text-muted-foreground">Enable Lovable Cloud from the main project chat, then configure Google Gemini with a private GEMINI_API_KEY and test the analysis service. This draft cannot enable that service.</p>
    </section>
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
        <p role="status" className="text-sm text-muted-foreground">{validating ? "Checking file readability…" : valid ? "Ready for local preview · Analysis unavailable" : "File not ready for analysis"}</p>
      </section>}
    </section>
    <section className="space-y-3 border-t border-border pt-5">
      <h2 className="flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4 text-primary" />Media privacy</h2>
      <p className="text-sm text-muted-foreground">Your selection remains in this tab. Removing or replacing it, leaving this page or reloading releases the preview. No media, extracted frames or results are saved to an account or database.</p>
      <p className="text-sm text-muted-foreground">When configured, analysis will transmit the selected media to Google Gemini only after your consent. Google’s applicable processing, retention and data-use terms must be disclosed before sending. Immediate deletion from Google cannot be promised.</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={consent} disabled={!valid} onChange={(event) => setConsent(event.target.checked)} />I consent to sending the selected media to Google Gemini once the service is configured and its data-handling terms are disclosed.</label>
      <Button disabled aria-describedby="analysis-unavailable"><ShieldCheck />Analyze Media</Button>
      <p id="analysis-unavailable" className="text-xs text-muted-foreground">Detector not configured. Consent alone does not send your file or enable analysis.</p>
    </section>
    <section className="space-y-3 border-t border-border pt-5"><h2 className="font-heading text-lg font-semibold">Authenticity has limits</h2><p className="text-sm text-muted-foreground">Visual artifacts can arise from AI generation, ordinary editing or compression. Absence of artifacts is not proof of human creation. Future assessments must explain evidence and alternatives, not present an uncalibrated probability or forensic guarantee.</p><p className="text-sm text-muted-foreground">No authenticity checks, frame analysis, audio analysis or metadata verification have been performed here. Verify the original source and any authenticity credentials independently.</p></section>
  </PageShell>;
}