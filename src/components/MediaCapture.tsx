import { useEffect, useRef, useState } from "react";
import { Camera, Circle, Square, RotateCcw, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS } from "@/lib/media-validation";

export function MediaCapture({ onUse, onClose }: { onUse: (file: File) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const attempt = useRef(0);
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [captured, setCaptured] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [canRecord, setCanRecord] = useState(false);
  const [recordType, setRecordType] = useState("");

  function stopTracks() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; attempt.current += 1; if (recorder.current?.state === "recording") recorder.current.stop(); stopTracks(); };
  }, []);
  useEffect(() => {
    if (!captured) { setPreview(null); return; }
    const url = URL.createObjectURL(captured);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [captured]);

  async function open() {
    if (opening) return;
    const current = ++attempt.current;
    setOpening(true); setError(""); setCaptured(null); setReady(false);
    stopTracks();
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const tracks = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!alive.current || attempt.current !== current) { tracks.getTracks().forEach((track) => track.stop()); return; }
      stream.current = tracks;
      const element = video.current;
      if (!element) { stopTracks(); return; }
      element.srcObject = tracks;
      await element.play();
      if (!alive.current || attempt.current !== current) { stopTracks(); return; }
      setReady(true);
      const type = typeof MediaRecorder === "undefined" ? "" : ["video/webm;codecs=vp8", "video/webm", "video/mp4"].find((mime) => MediaRecorder.isTypeSupported(mime)) ?? "";
      setCanRecord(Boolean(type)); setRecordType(type);
    } catch (cause) {
      stopTracks();
      if (!alive.current || attempt.current !== current) return;
      const name = cause instanceof Error ? cause.name : "";
      setError(name === "NotAllowedError" || name === "SecurityError" ? "Camera permission was denied. Allow camera access in your browser, or upload a file instead." : name === "NotFoundError" ? "No camera was found. Upload a file instead." : "Camera could not start. Use a supported browser on HTTPS, or upload a file instead.");
    } finally { if (alive.current && attempt.current === current) setOpening(false); }
  }
  function photo() {
    const element = video.current;
    if (!element || !element.videoWidth || !ready) return;
    const canvas = document.createElement("canvas");
    canvas.width = element.videoWidth; canvas.height = element.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) { setError("Photo capture is unavailable. Upload a file instead."); return; }
    context.drawImage(element, 0, 0);
    canvas.toBlob((blob) => {
      canvas.width = 0; canvas.height = 0;
      if (!alive.current) return;
      if (blob) setCaptured(new File([blob], "camera-photo.jpg", { type: "image/jpeg" }));
      else setError("Photo capture failed. Please retry.");
      stopTracks(); setReady(false);
    }, "image/jpeg", 0.9);
  }
  function record() {
    if (!stream.current || !canRecord || recording) return;
    try {
      const recordingStream = stream.current;
      const instance = new MediaRecorder(recordingStream, { mimeType: recordType, videoBitsPerSecond: 1500000 });
      const chunks: Blob[] = [];
      let bytes = 0;
      recorder.current = instance;
      instance.ondataavailable = (event) => { if (event.data.size) { chunks.push(event.data); bytes += event.data.size; if (bytes > MAX_VIDEO_BYTES && instance.state === "recording") instance.stop(); } };
      instance.onerror = () => { stopTracks(); if (alive.current) { setError("Video recording failed. Upload a file instead."); setRecording(false); setReady(false); } };
      instance.onstop = () => {
        stopTracks();
        if (!alive.current) { chunks.length = 0; return; }
        setRecording(false); setReady(false);
        if (bytes > MAX_VIDEO_BYTES) { chunks.length = 0; setError("Recording exceeded 15 MB. Please record a shorter video."); return; }
        const type = recordType.split(";")[0];
        const blob = new Blob(chunks, { type }); chunks.length = 0;
        if (!blob.size) { setError("No video was captured. Try again."); return; }
        setCaptured(new File([blob], type === "video/mp4" ? "camera-video.mp4" : "camera-video.webm", { type }));
      };
      instance.start(250); setRecording(true); setError("");
      timer.current = setTimeout(() => { if (instance.state === "recording") instance.stop(); }, MAX_VIDEO_SECONDS * 1000);
    } catch { stopTracks(); setReady(false); setError("Recording could not start. Upload a video instead."); }
  }

  return <section className="space-y-4 border-y border-border py-5" aria-label="Camera capture">
    <div className="flex items-center justify-between gap-3"><h2 className="font-heading text-lg font-semibold">Camera capture</h2><Button variant="ghost" size="icon" aria-label="Close camera" onClick={onClose}><X /></Button></div>
    <p className="text-sm text-muted-foreground">Camera only, no microphone. Videos are silent and limited to 60 seconds. Nothing is sent for analysis here.</p>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {!captured && <video ref={video} autoPlay muted playsInline className="aspect-video w-full rounded-lg bg-muted object-contain" aria-label="Live camera preview" />}
    {preview && (captured?.type.startsWith("video/") ? <video src={preview} controls playsInline className="aspect-video w-full rounded-lg bg-muted object-contain" aria-label="Captured video preview" /> : <img src={preview} alt="Captured photo preview" className="max-h-96 w-full rounded-lg bg-muted object-contain" />)}
    <div className="flex flex-wrap gap-2">
      {!ready && !captured && <Button disabled={opening} onClick={open}><Camera />{opening ? "Requesting camera…" : "Enable camera"}</Button>}
      {ready && !recording && <><Button onClick={photo}><Camera />Capture photo</Button><Button variant="outline" disabled={!canRecord} onClick={record}><Circle />Record video</Button></>}
      {recording && <Button variant="destructive" onClick={() => { if (recorder.current?.state === "recording") recorder.current.stop(); }}><Square />Stop recording</Button>}
      {captured && <><Button variant="outline" onClick={open}><RotateCcw />Retake</Button><Button onClick={() => { stopTracks(); onUse(captured); }}><Check />{captured.type.startsWith("video/") ? "Use This Video" : "Use This Photo"}</Button></>}
    </div>
    {ready && !canRecord && <p className="text-xs text-muted-foreground">Video recording is unsupported in this browser. Photo capture is available.</p>}
  </section>;
}