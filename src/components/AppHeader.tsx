import { Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";

export function AppHeader({ showBack = false }: { showBack?: boolean }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
        <Link to="/" className="flex items-center gap-3" aria-label="Cyber Bro dashboard">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="font-heading text-xl font-bold tracking-tight text-foreground">Cyber Bro</p>
            <p className="text-xs text-muted-foreground">Your cyber safety companion</p>
          </div>
        </Link>
        {showBack && (
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
        )}
      </div>
    </header>
  );
}

export function PageShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans">
      <AppHeader showBack />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{intro}</p>
        </div>
        {children}
      </main>
    </div>
  );
}

export const cardClass = "rounded-2xl border border-border bg-card p-5 shadow-sm";
export const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50";
