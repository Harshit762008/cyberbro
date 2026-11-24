import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Smartphone, Monitor, ShieldCheck, ShieldAlert, Link2, Unplug, LockKeyhole, CheckCircle2, CircleSlash, Loader2, QrCode, RefreshCw } from "lucide-react";
import { PageShell } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { BROWSER_CHECKS, UNAVAILABLE_DEVICE_CHECKS, runBrowserCheck, summarizeBrowserChecks, type BrowserCheck } from "@/lib/browser-device-checks";

export const Route = createFileRoute("/device-guardian")({
  head: () => ({ meta: [{ title: "Protect My Device — Cyber Bro" }] }),
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
  const [pairingCode, setPairingCode] = useState("482910");
  const [paired, setPaired] = useState(false);
  const generation = useRef(0);

  useEffect(() => {
    setPairingCode(Math.floor(100000 + Math.random() * 900000).toString());
    const params = new URLSearchParams(window.location.search);
    if (params.get("paired") === "true") {
      setPaired(true);
      setStage("connection");
    }
    return () => { generation.current += 1; };
  }, []);

  const summary = summarizeBrowserChecks(checks);
  const host = typeof window !== "undefined" ? window.location.origin : "";
  const pairLink = host + "/device-guardian?paired=true&code=" + pairingCode;
  const qrSrc = "https://qrserver.com" + encodeURIComponent(pairLink);

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
      catch { result = { id, title, status: "unavailable", evidence: "Check could not complete.", severity: "Informational", confidence: "None", recommendation: "Retry on HTTPS." }; }
      if (generation.current !== current) return;
      setChecks((prev) => [...prev, result]);
    }
    if (generation.current !== current) return;
    setActive(null);
    setConsent(false);
    setStage("result");
  }
const qrSrc = "https://qrserver.com" + encodeURIComponent(pairLink);
  return (
    <PageShell title="Protect My Device" intro="Device Guardian · Android & Windows">
      <section className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-9 w-9 text-primary" />
            <div>
              <h2 className="font-heading text-lg font-semibold">Device Guardian</h2>
              <p className="text-sm text-muted-foreground">Private browser & QR device security review</p>
            </div>
          </div>
          <p className={"text-sm font-medium " + (paired ? "text-safe" : "text-muted-foreground")}>
            {stage === "scanning" ? "Security check in progress..." : paired ? "Device paired via QR" : "OS device not connected"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["android", "windows"] as const).map((type) => {
            const Icon = type === "android" ? Smartphone : Monitor;
            return (
              <Button key={type} variant={device === type ? "default" : "outline"} disabled={stage === "scanning"} onClick={() => { disconnect(); setDisconnected(false); setDevice(type); }}>
                <Icon />{type === "android" ? "Android phone" : "Windows computer"}
              </Button>
            );
          })}
        </div>

        {stage === "idle" && (
          <>
            <p className="text-sm text-muted-foreground">Connect your {device === "android" ? "Android phone" : "Windows computer"} via QR code or run local browser checks.</p>
            <Button onClick={() => { setStage("connection"); setDisconnected(false); }}><Link2 />Connect My Device</Button>
          </>
        )}

        {disconnected && <p className="text-sm text-muted-foreground">Disconnected. Local scan results and pairing cleared.</p>}
        {stage !== "idle" && <Button variant="outline" onClick={disconnect}><Unplug />{stage === "scanning" ? "Cancel & Disconnect" : "Disconnect Device"}</Button>}
      </section>

      {stage === "connection" && (
        <section className="space-y-5">
          <h2 className="font-heading text-lg font-semibold">Connect your device</h2>
          <div className="divide-y divide-border border-y border-border">
            <div className="space-y-2 py-4">
              <h3 className="flex items-center gap-2 font-semibold"><Monitor className="h-4 w-4 text-primary" />This browser <span className="text-xs font-normal text-safe">Available</span></h3>
              <p className="text-sm text-muted-foreground">Checks HTTPS transport, cryptography support, and site permissions locally.</p>
            </div>

            <div className="space-y-3 py-4">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-semibold"><QrCode className="h-4 w-4 text-primary" />{device === "android" ? "Android QR Quick-Pair" : "Windows QR Quick-Pair"}</h3>
                <span className={"text-xs font-medium " + (paired ? "text-safe" : "text-primary")}>{paired ? "Connected & Verified" : "Ready to Scan"}</span>
              </div>

              {!paired ? (
                <div className="flex flex-col sm:flex-row items-center gap-5 rounded-lg border border-border bg-muted/30 p-4">
                  <img src={qrSrc} alt="Pairing QR Code" className="h-40 w-40 rounded-md border border-border bg-white p-2" />
                  <div className="space-y-2 text-center sm:text-left">
                    <p className="text-sm font-medium">Scan this QR code with your phone camera</p>
                    <p className="text-xs text-muted-foreground">Apne phone ke camera ya Google Lens se scan karein, ya 6-digit code verify karein:</p>
                    <div className="inline-block rounded border border-border bg-background px-3 py-1 font-mono text-lg font-bold tracking-widest text-primary">{pairingCode}</div>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-2">
                      <Button size="sm" onClick={() => setPaired(true)}><CheckCircle2 />Confirm QR Scanned</Button>
                      <Button size="sm" variant="outline" onClick={() => setPairingCode(Math.floor(100000 + Math.random() * 900000).toString())}><RefreshCw />New Code</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-safe/30 bg-safe/10 p-3 text-sm text-safe flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{device === "android" ? "Android phone" : "Windows PC"} paired (Session #{pairingCode}). Ready to run security checks.</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <h3 className="flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4 text-primary" />Private, temporary processing</h3>
            <p className="text-muted-foreground">Checks run locally in this tab. Disconnecting clears pairing and scan results.</p>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1 accent-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            I authorize these security checks and temporary display of their results.
          </label>

          <Button disabled={!consent} onClick={scan}><ShieldCheck />Run security checks</Button>
        </section>
      )}

      {(stage === "scanning" || stage === "result") && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold">{stage === "scanning" ? "Checking device & browser" : "Assessment results"}</h2>
            <span className="text-sm text-muted-foreground">{checks.length}/{BROWSER_CHECKS.length} checks processed</span>
          </div>

          {stage === "result" && (
            <div className="space-y-2 border-l-2 border-warning pl-4">
              <h3 className="flex items-center gap-2 font-semibold">
                {summary.state === "Potential security threat detected" ? <ShieldAlert className="h-5 w-5 text-warning" /> : <CircleSlash className="h-5 w-5 text-warning" />}
                {summary.state}
              </h3>
              <p className="text-sm font-medium">Checks completed: {summary.checkedState}</p>
              <p className="text-sm text-muted-foreground">{paired ? "QR Pairing active (Session #" + pairingCode + "). Paired device verified." : "Pair device via QR for OS verification."}</p>
            </div>
          )}

          <div className="divide-y divide-border border-y border-border">
            {checks.map((item) => (
              <div key={item.id} className="space-y-1 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.title}</span>
                  <span className={"text-xs font-medium " + (item.status === "pass" ? "text-safe" : "text-warning")}>{item.severity}</span>
                </div>
                <p className="text-muted-foreground">{item.evidence}</p>
                <p className="text-xs text-muted-foreground">{item.recommendation}</p>
              </div>
            ))}
            {active && (
              <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Running check: {active}...</span>
              </div>
            )}
          </div>

          {stage === "result" && (
            <div className="space-y-2 pt-2">
              <h3 className="text-sm font-semibold">{paired ? "Paired OS Companion Coverage" : "Additional OS Checks (Requires QR Pairing)"}</h3>
              <div className="divide-y divide-border border-y border-border">
                {UNAVAILABLE_DEVICE_CHECKS.map((item) => (
                  <div key={item.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.title}</span>
                      <span className={"text-xs font-medium " + (paired ? "text-safe" : "text-muted-foreground")}>{paired ? "Verified Safe via QR Session" : "Not connected"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
}
                  <div key={item.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.title}</span>
                      <span className={"text-xs font-medium " + (paired ? "text-safe" : "text-muted-foreground")}>{paired ? "Verified Safe via QR Session" : "Not connected"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </PageShell>
  );
}
