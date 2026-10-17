import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Smartphone, Monitor, ShieldCheck, ShieldAlert, ClipboardCheck, RotateCcw, Download, LockKeyhole } from "lucide-react";
import { PageShell } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { DEVICE_CHECKS, assessDevice, type Answer, type DeviceType, type Observations, type DeviceReport } from "@/lib/device-assessment";

export const Route = createFileRoute("/device-guardian")({
  head: () => ({ meta: [
    { title: "Device Guardian — Cyber Bro" },
    { name: "description", content: "Review Android and Windows security with evidence-based guided checks and account recovery steps." },
    { property: "og:title", content: "Device Guardian — Cyber Bro" },
    { property: "og:description", content: "Assess user-reported device security findings without claiming browser access to your operating system." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: DeviceGuardian,
});

type Review = { id: number; device: DeviceType; time: string; report: DeviceReport };

function DeviceGuardian() {
  const [device, setDevice] = useState<DeviceType>("android");
  const [consent, setConsent] = useState(false);
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Observations>({});
  const [report, setReport] = useState<DeviceReport | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [fixes, setFixes] = useState<Record<string, boolean>>({});
  const progress = assessDevice(answers);

  function reset() {
    setStarted(false);
    setConsent(false);
    setAnswers({});
    setReport(null);
    setFixes({});
  }

  function review() {
    const result = assessDevice(answers);
    setReport(result);
    setFixes({});
    setReviews((previous) => [{ id: Date.now(), device, time: new Date().toLocaleString(), report: result }, ...previous].slice(0, 10));
  }

  function download() {
    if (!report) return;
    const text = [`Cyber Bro — ${device === "android" ? "Android" : "Windows"} guided assessment`, report.state, `${report.checked}/${report.total} items checked`, report.limitations, ...report.findings.flatMap((finding) => [finding.title, `Severity: ${finding.severity}; confidence: ${finding.confidence}`, finding.evidence, finding.explanation, ...finding.actions]), ...report.nextSteps].join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cyber-bro-device-report.txt";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <PageShell title="Protect My Device" intro="Device Guardian · Android & Windows">
      <section className="space-y-4 border-b border-border pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-9 w-9 text-primary" />
            <div><h2 className="font-heading text-lg font-semibold">Device Guardian</h2><p className="text-sm text-muted-foreground">Website-only guided assessment</p></div>
          </div>
          <span className="text-sm font-medium text-muted-foreground">Not connected</span>
        </div>
        <p className="text-sm text-muted-foreground">No companion app is connected. This website cannot scan your files, processes, installed apps or operating-system internals. You can review security settings and report what you find.</p>
        <div className="flex gap-2" role="group" aria-label="Device type">
          {(["android", "windows"] as const).map((type) => {
            const Icon = type === "android" ? Smartphone : Monitor;
            return <Button key={type} variant={device === type ? "default" : "outline"} aria-pressed={device === type} onClick={() => { reset(); setDevice(type); }}><Icon />{type === "android" ? "Android phone" : "Windows computer"}</Button>;
          })}
        </div>
        {!started && <div className="space-y-3">
          <p className="text-sm font-medium">Permission required — guided review consent</p>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={consent} onChange={(event) => setConsent(event.target.checked)} />I agree to review settings myself and use my answers for this assessment. This does not grant device access.</label>
          <Button disabled={!consent} onClick={() => setStarted(true)}><ClipboardCheck />Start guided assessment</Button>
        </div>}
        <details className="border-t border-border pt-3 text-sm">
          <summary className="cursor-pointer font-medium">Secure pairing & companion apps</summary>
          <div className="mt-3 space-y-2 text-muted-foreground">
            <p>QR pairing alone never grants operating-system access. Secure pairing is not available here yet; no pairing code or token has been generated.</p>
            <p>Pairing, one-time links, expiry, disconnect and session revocation require a connected account service. Lovable Cloud must be enabled from the main project chat, not this draft.</p>
            <p>Authorized Android app checks require a separate Android companion app and explicit device permissions. Windows file and process checks require a separate Windows agent. Neither is installed or connected by this website.</p>
            <p>A future companion connection must show its permission scope and collect only supported findings after consent. No device actions will run silently.</p>
          </div>
        </details>
      </section>

      {started && <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Guided checks</h2><Button variant="outline" onClick={reset}><RotateCcw />End review</Button></div>
        <p className="text-sm text-muted-foreground" aria-live="polite">{progress.checked} of {progress.total} checked · {progress.checked < progress.total ? "Scan incomplete" : "Ready for review"}</p>
        <progress value={progress.checked} max={progress.total} className="h-2 w-full accent-primary" aria-label="Guided assessment progress" />
        <div className="divide-y divide-border">
          {DEVICE_CHECKS.map((check, index) => <fieldset key={check.id} className="space-y-3 py-5">
            <legend className="pt-4 text-sm font-semibold">{index + 1}. {check.label}</legend>
            <p className="text-sm text-muted-foreground">{check[device]}</p>
            <div className="flex flex-wrap gap-4">
              {(["yes", "no", "unknown"] as const).map((answer: Answer) => <label key={answer} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name={check.id} value={answer} className="accent-primary" checked={answers[check.id]?.answer === answer} onChange={() => { setAnswers((previous) => ({ ...previous, [check.id]: { answer, detail: previous[check.id]?.detail ?? "" } })); setReport(null); }} />
                {answer === "yes" ? "Yes" : answer === "no" ? "No" : "Not sure"}
              </label>)}
            </div>
            {answers[check.id]?.answer === "yes" && <div><label htmlFor={`evidence-${check.id}`} className="text-xs text-muted-foreground">Optional evidence — app name, permission or warning (no passwords or personal details)</label><textarea id={`evidence-${check.id}`} maxLength={500} rows={2} value={answers[check.id]?.detail ?? ""} onChange={(event) => { const detail = event.target.value; setAnswers((previous) => ({ ...previous, [check.id]: { answer: "yes", detail } })); setReport(null); }} className="mt-1 w-full rounded-lg border border-input bg-background p-3 text-sm" /></div>}
          </fieldset>)}
        </div>
        <Button onClick={review}><ShieldCheck />Review findings</Button>
      </section>}

      {report && <section className="space-y-4 border-t border-border pt-6" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-lg font-semibold">{report.state === "Potential threat found" ? <ShieldAlert className="text-warning" /> : <ShieldCheck className="text-primary" />}{report.state}</h2><Button variant="outline" onClick={download}><Download />Download report</Button></div>
        <p className="text-sm text-muted-foreground">{report.checked}/{report.total} items checked</p>
        <p className="border-l-2 border-warning pl-3 text-sm text-muted-foreground">{report.limitations}</p>
        {report.findings.map((finding) => <article key={finding.id} className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold">{finding.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Severity: {finding.severity} · Confidence: {finding.confidence}</p>
          <p className="mt-3 break-words text-sm"><strong>Evidence:</strong> {finding.evidence}</p>
          <p className="mt-2 text-sm text-muted-foreground">{finding.explanation}</p>
          <ul className="mt-3 space-y-3">{finding.actions.map((action, index) => { const key = `${finding.id}-${index}`; return <li key={key}><label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={fixes[key] ?? false} onChange={(event) => setFixes((previous) => ({ ...previous, [key]: event.target.checked }))} />{action}</label></li>; })}</ul>
        </article>)}
        <h3 className="font-semibold">Next steps</h3>
        <ul className="list-disc space-y-2 pl-5 text-sm">{report.nextSteps.map((step) => <li key={step}>{step}</li>)}</ul>
        <p className="text-xs text-muted-foreground">Checked actions record only what you report doing; no settings were changed by this website. No automatic uninstall, deletion or reset is performed.</p>
      </section>}

      <section className="space-y-3 border-t border-border pt-6">
        <h2 className="flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4 text-primary" />Review history</h2>
        <p className="text-xs text-muted-foreground">This page session only — not saved to an account. Download a report before leaving. Reloading clears these reviews.</p>
        {!reviews.length ? <p className="text-sm text-muted-foreground">No guided reviews yet.</p> : <ul className="divide-y divide-border">{reviews.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-medium">{entry.device === "android" ? "Android" : "Windows"} · {entry.report.state}</p><p className="text-xs text-muted-foreground">{entry.time} · {entry.report.checked}/{entry.report.total} checked</p></div><Button variant="outline" size="sm" onClick={() => { setReport(entry.report); setFixes({}); }}>View report</Button></li>)}</ul>}
      </section>
    </PageShell>
  );
}