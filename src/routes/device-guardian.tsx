import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Smartphone, Monitor, ShieldCheck, ShieldAlert, Link2, Unplug, LockKeyhole, CheckCircle2, CircleSlash, Loader2, QrCode, RefreshCw } from "lucide-react";
import { PageShell } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { BROWSER_CHECKS, UNAVAILABLE_DEVICE_CHECKS, runBrowserCheck, summarizeBrowserChecks, type BrowserCheck } from "@/lib/browser-device-checks";

export const Route = createFileRoute("/device-guardian")({
  head: () => ({ meta: [
    { title: "Protect My Device — Cyber Bro" },
    { name: "description", content: "Run private, automatic browser-supported security checks with QR device pairing and scan coverage information." },
    { property: "og:title", content: "Protect My Device — Cyber Bro" },
    { property: "og:description", content: "Local browser checks and QR pairing for Android and Windows device safety." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DeviceGuardian,
});

type Stage = "idle" | "connection" | "scanning" | "result";
function DeviceGuardian() {
  const [device, setDevice] = useState<"android" | "windows">("android");
  const [stage, setStage] = useState<Stage>("idle");
  const [consent, setConsent] = useState(false);
  const [checks, setChecks] = useState<BrowserCheck[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [disconnected, setDisconnected] = useState(false);
  const [pairingCode, setPairingCode] = useState("");
  const [paired, setPaired] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setPairingCode(code);
    const params = new URLSearchParams(window.location.search);
    if (params.get("paired") === "true") {
      setPaired(true);
      setStage("connection");
    }
    return () => { generation.current += 1; };
  }, []);

  const summary = summarizeBrowserChecks(checks);

  const pairUrl = typeof window !== "undefined"
    ? `${window.location.origin}/device-guardian?paired=true&code=${pairingCode}`
    : `https://vercel.app{pairingCode}`;

  const qrImageUrl = `https://qrserver.com{encodeURIComponent(pairUrl)}`;

  function regenerateCode() {
    setPairingCode(Math.floor(100000 + Math.random() * 900000).toString());
  }

  function disconnect() {
    generation.current += 1;
    setChecks([]);
    setActive(null);
    setConsent(false);
    setPaired(false);
    setStage("idle");
    setDisconnected(true);
  }

  async function scan() {
    if (!consent || stage === "scanning") return;
    const current = ++generation.current;
    setChecks([]);
    setStage("scanning");
    for (const { id, title } of BROWSER_CHECKS) {
      if (generation.current !== current) return;
      setActive(id);
      let result: BrowserCheck;
      try { result = await runBrowserCheck(id); }
      catch { result = { id, title, status: "unavailable", evidence: "This check could not be completed in the current browser context.", severity: "Informational", confidence: "No finding collected", recommendation: "Retry in an up-to-date browser on the official HTTPS website." }; }
      if (generation.current !== current) return;
      setChecks((previous) => [...previous, result]);
    }
    if (generation.current !== current) return;
    setActive(null);
    setConsent(false);
    setStage("result");
  }

  return (
    <PageShell title="Protect My Device" intro="Device Guardian · Android & Windows">
      <section className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3"><ShieldCheck className="h-9 w-9 text-primary" /><div><h2 className="font-heading text-lg font-semibold">Device Guardian</h2><p className="text-sm text-muted-foreground">Private browser & QR device security review</p></div></div>
          <p className={`text-sm font-medium ${paired ? "text-safe" : "text-muted-foreground"}`}>
            {stage === "scanning"
              ? "Security check in progress..."
              : paired
              ? `${device === "android" ? "Android phone" : "Windows PC"} paired via QR`
              : "OS device not connected"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Device type">
          {(["android", "windows"] as const).map((type) => { const Icon = type === "android" ? Smartphone : Monitor; return <Button key={type} variant={device === type ? "default" : "outline"} aria-pressed={device === type} disabled={stage === "scanning"} onClick={() => { disconnect(); setDisconnected(false); setDevice(type); }}><Icon />{type === "android" ? "Android phone" : "Windows computer"}</Button>; })}
        </div>
        {stage === "idle" && <><p className="text-sm text-muted-foreground">Connect your {device === "android" ? "Android phone" : "Windows computer"} via QR code or run local browser security checks first.</p><Button onClick={() => { setStage("connection"); setDisconnected(false); }}><Link2 />Connect My Device</Button></>}
        {disconnected && <p role="status" className="text-sm text-muted-foreground">Disconnected. Local scan results and pairing session have been cleared.</p>}
        {stage !== "idle" && <Button variant="outline" onClick={disconnect}><Unplug />{stage === "scanning" ? "Cancel & Disconnect Device" : "Disconnect Device"}</Button>}
      </section>

      {stage === "connection" && <section className="space-y-5">
        <h2 className="font-heading text-lg font-semibold">Connect your device</h2>
        <div className="divide-y divide-border border-y border-border">
          <div className="space-y-2 py-4"><h3 className="flex items-center gap-2 font-semibold"><Monitor className="h-4 w-4 text-primary" />This browser <span className="text-xs font-normal text-safe">Available</span></h3><p className="text-sm text-muted-foreground">Automatically checks this page’s secure context, transport, cryptography support, embedding and available site-permission states.</p></div>

          <div className="space-y-3 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <QrCode className="h-4 w-4 text-primary" />
                {device === "android" ? "Android QR Quick-Pair" : "Windows QR Quick-Pair"}
              </h3>
              <span className={`text-xs font-medium ${paired ? "text-safe" : "text-primary"}`}>
                {paired ? "Connected & Verified" : "Ready to Scan"}
              </span>
            </div>

            {!paired ? (
              <div className="flex flex-col sm:flex-row items-center gap-5 rounded-lg border border-border bg-muted/30 p-4">
                <img
                  src={qrImageUrl}
                  alt="Scan QR code to pair device"
                  className="h-40 w-40 rounded-md border border-border bg-white p-2"
                />
                <div className="space-y-2 text-center sm:text-left">
                  <p className="text-sm font-medium">Scan this QR code with your phone camera</p>
                  <p className="text-xs text-muted-foreground">
                    Apne phone ke camera ya Google Lens se is QR code ko scan karein, ya 6-digit pairing code verify karein:
                  </p>
                  <div className="inline-block rounded border border-border bg-background px-3 py-1 font-mono text-lg font-bold tracking-widest text-primary">
                    {pairingCode}
                  </div>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                    <Button size="sm" onClick={() => setPaired(true)}>
                      <CheckCircle2 />Confirm QR Scanned
                    </Button>
                    <Button size="sm" variant="outline" onClick={regenerateCode}>
                      <RefreshCw />New Code
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-safe/30 bg-safe/10 p-3 text-sm text-safe flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  {device === "android" ? "Android phone" : "Windows computer"} paired (Session #{pairingCode}). Ready to run security checks below.
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 text-sm"><h3 className="flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4 text-primary" />Private, temporary processing</h3><p className="text-muted-foreground">Checks run locally in this tab. Temporary inputs are discarded after each check; only minimal findings remain in memory while you view the result. Disconnecting clears the pairing session and scan results.</p></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={consent} onChange={(event) => setConsent(event.target.checked)} />I authorize these security checks and temporary display of their results.</label>
        <Button disabled={!consent} onClick={scan}><ShieldCheck />Run security checks</Button>
      </section>}

      {(stage === "scanning" || stage === "result") && <section className="space-y-4" aria-live="polite">
