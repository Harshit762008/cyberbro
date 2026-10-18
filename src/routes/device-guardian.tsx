import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Smartphone, Monitor, ShieldCheck, ShieldAlert, Link2, Unplug, LockKeyhole, CheckCircle2, CircleSlash, Loader2 } from "lucide-react";
import { PageShell } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { BROWSER_CHECKS, UNAVAILABLE_DEVICE_CHECKS, runBrowserCheck, summarizeBrowserChecks, type BrowserCheck } from "@/lib/browser-device-checks";

export const Route = createFileRoute("/device-guardian")({
  head: () => ({ meta: [
    { title: "Protect My Device — Cyber Bro" },
    { name: "description", content: "Run private, automatic browser-supported security checks with honest device connection and scan coverage information." },
    { property: "og:title", content: "Protect My Device — Cyber Bro" },
    { property: "og:description", content: "Local browser checks with no saved scan history. Android and Windows OS checks require an authorized companion." },
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
  const generation = useRef(0);
  useEffect(() => () => { generation.current += 1; }, []);
  const summary = summarizeBrowserChecks(checks);

  function disconnect() {
    generation.current += 1;
    setChecks([]);
    setActive(null);
    setConsent(false);
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
          <div className="flex items-center gap-3"><ShieldCheck className="h-9 w-9 text-primary" /><div><h2 className="font-heading text-lg font-semibold">Device Guardian</h2><p className="text-sm text-muted-foreground">Private browser security review</p></div></div>
          <p className="text-sm font-medium text-muted-foreground">{stage === "scanning" ? "Browser check in progress · OS not connected" : "OS device not connected"}</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Device type">
          {(["android", "windows"] as const).map((type) => { const Icon = type === "android" ? Smartphone : Monitor; return <Button key={type} variant={device === type ? "default" : "outline"} aria-pressed={device === type} disabled={stage === "scanning"} onClick={() => { disconnect(); setDisconnected(false); setDevice(type); }}><Icon />{type === "android" ? "Android phone" : "Windows computer"}</Button>; })}
        </div>
        {stage === "idle" && <><p className="text-sm text-muted-foreground">Check this browser first. Deeper {device === "android" ? "Android" : "Windows"} security checks need a compatible, explicitly authorized {device === "android" ? "companion app" : "security agent"}.</p><Button onClick={() => { setStage("connection"); setDisconnected(false); }}><Link2 />Connect My Device</Button></>}
        {disconnected && <p role="status" className="text-sm text-muted-foreground">Disconnected. Local scan results have been cleared. No pairing session was created.</p>}
        {stage !== "idle" && <Button variant="outline" onClick={disconnect}><Unplug />{stage === "scanning" ? "Cancel & Disconnect Device" : "Disconnect Device"}</Button>}
      </section>

      {stage === "connection" && <section className="space-y-5">
        <h2 className="font-heading text-lg font-semibold">Connect your device</h2>
        <div className="divide-y divide-border border-y border-border">
          <div className="space-y-2 py-4"><h3 className="flex items-center gap-2 font-semibold"><Monitor className="h-4 w-4 text-primary" />This browser <span className="text-xs font-normal text-safe">Available</span></h3><p className="text-sm text-muted-foreground">Automatically checks this page’s secure context, transport, cryptography support, embedding and available site-permission states. No camera, microphone, location, file or OS access is requested.</p></div>
          <div className="space-y-2 py-4"><h3 className="font-semibold">{device === "android" ? "Android companion app" : "Windows security agent"}</h3><p className="text-sm font-medium text-warning">Device connection unavailable</p><p className="text-sm text-muted-foreground">No compatible companion or security integration is configured. QR pairing and one-time links are unavailable. A QR code alone cannot grant operating-system access.</p></div>
        </div>
        <div className="space-y-2 text-sm"><h3 className="flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4 text-primary" />Private, temporary processing</h3><p className="text-muted-foreground">Checks run locally in this tab. Temporary inputs are discarded after each check; only the minimal findings remain in memory while you view the result. Disconnecting, leaving or reloading clears them. No scan database, saved history, external AI calls or third-party scan requests are used.</p><p className="text-muted-foreground">The website itself is served normally; ordinary page requests are separate from this local scan. Permission queries read only this site’s existing permission state, never other apps’ permissions. Account data is separate and is not inspected.</p></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={consent} onChange={(event) => setConsent(event.target.checked)} />I authorize these local browser checks and temporary display of their results. This does not connect to my operating system.</label>
        <Button disabled={!consent} onClick={scan}><ShieldCheck />Run browser checks</Button>
      </section>}

      {(stage === "scanning" || stage === "result") && <section className="space-y-4" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-heading text-lg font-semibold">{stage === "scanning" ? "Checking this browser" : "Assessment results"}</h2><span className="text-sm text-muted-foreground">{checks.length}/{BROWSER_CHECKS.length} checks processed</span></div>
        <progress className="h-2 w-full accent-primary" value={checks.length} max={BROWSER_CHECKS.length} aria-label="Browser checks progress" />
        {stage === "result" && <div className="space-y-2 border-l-2 border-warning pl-4"><h3 className="flex items-center gap-2 font-semibold">{summary.state === "Potential security threat detected" ? <ShieldAlert className="h-5 w-5 text-warning" /> : <CircleSlash className="h-5 w-5 text-warning" />}{summary.state}</h3><p className="text-sm font-medium">Browser checks: {summary.checkedState}</p><p className="text-sm text-muted-foreground">{summary.completed} completed · {summary.unavailable} check groups unavailable. Operating-system coverage is missing. These observations concern this page, not whether your device is hacked or malware-free.</p><p className="text-xs text-muted-foreground">Local check access has ended. No temporary pairing session exists to revoke. Disconnect Device clears the displayed result.</p></div>}
        <ul className="divide-y divide-border">{BROWSER_CHECKS.map(({ id, title }) => { const result = checks.find((check) => check.id === id); return <li key={id} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{title}</span><span className="flex shrink-0 items-center gap-2 text-muted-foreground">{result ? <>{result.status === "passed" ? <CheckCircle2 className="h-4 w-4 text-safe" /> : result.status === "attention" ? <ShieldAlert className="h-4 w-4 text-warning" /> : <CircleSlash className="h-4 w-4" />}{result.status === "passed" ? "Passed" : result.status === "attention" ? "Needs attention" : result.status === "unavailable" ? "Unavailable" : "Observed"}</> : active === id ? <><Loader2 className="h-4 w-4 motion-safe:animate-spin" />Checking</> : "Pending"}</span></li>; })}</ul>
        {stage === "result" && <div className="space-y-3">{checks.map((check) => <article key={check.id} className="rounded-lg border border-border bg-card p-4"><h3 className="font-semibold">{check.title}</h3><p className="mt-1 text-xs text-muted-foreground">Severity: {check.severity} · Confidence: {check.confidence}</p><p className="mt-3 text-sm"><strong>Evidence:</strong> {check.evidence}</p><p className="mt-2 text-sm text-muted-foreground"><strong>Recommended action:</strong> {check.recommendation}</p></article>)}</div>}
      </section>}

      {stage !== "idle" && <section className="space-y-3 border-t border-border pt-5"><h2 className="font-heading text-lg font-semibold">Unavailable device checks</h2><p className="text-sm text-muted-foreground">These checks have not run. No files, processes, installed apps, account sessions or operating-system settings were accessed.</p><ul className="divide-y divide-border">{UNAVAILABLE_DEVICE_CHECKS.map((check) => <li key={check.title} className="py-3"><p className="flex items-start gap-2 text-sm font-medium"><CircleSlash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{check.title}</p><p className="mt-1 pl-6 text-xs text-muted-foreground">Requires: {check.permission}. Not configured.</p></li>)}</ul></section>}
    </PageShell>
  );
}
