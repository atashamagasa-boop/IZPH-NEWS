import { useEffect, useState, useCallback } from "react";

interface StatusData {
  ok: boolean;
  uptime: number;
  newsEnabled: boolean;
  lastPostedLink: string | null;
  lastPostedAt: string | null;
  totalPostsToday: number;
  timestamp: string;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
        ok
          ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
          : "bg-red-500/15 text-red-400 ring-1 ring-red-500/30"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
      {label}
    </span>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card>
      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
    </Card>
  );
}

export default function App() {
  const [data, setData] = useState<StatusData | null>(null);
  const [error, setError] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(30);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (!res.ok) throw new Error("Non-OK response");
      const json = (await res.json()) as StatusData;
      setData(json);
      setError(false);
    } catch {
      setError(true);
    }
    setLastRefreshed(new Date());
    setCountdown(30);
  }, []);

  useEffect(() => {
    void fetchStatus();
    const poll = setInterval(() => void fetchStatus(), 30_000);
    return () => clearInterval(poll);
  }, [fetchStatus]);

  useEffect(() => {
    const tick = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(tick);
  }, []);

  const serverOnline = !error && data?.ok === true;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-lg">🤖</div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">FB Messenger Bot</h1>
            <p className="text-xs text-muted-foreground">Philippines News Bot • Monitoring</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Auto-refresh in {countdown}s</span>
          <button
            onClick={() => void fetchStatus()}
            className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-foreground text-xs font-medium transition-colors"
          >
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Status Row */}
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge ok={serverOnline} label={serverOnline ? "Server Online" : "Server Offline"} />
          {data && (
            <StatusBadge
              ok={data.newsEnabled}
              label={data.newsEnabled ? "News Posting Active" : "News Posting Inactive"}
            />
          )}
          {lastRefreshed && (
            <span className="text-xs text-muted-foreground ml-auto">
              Last checked: {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
        </div>

        {error && !data && (
          <Card>
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold">Cannot reach the API server</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Make sure the API server workflow is running.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Server Uptime"
            value={data ? formatUptime(data.uptime) : "—"}
            accent
          />
          <StatCard
            label="News Mode"
            value={data ? (data.newsEnabled ? "Enabled" : "Disabled") : "—"}
          />
          <StatCard
            label="Posts Today"
            value={data ? String(data.totalPostsToday) : "—"}
          />
          <StatCard
            label="Last Post"
            value={data?.lastPostedAt ? formatDate(data.lastPostedAt) : "Never"}
          />
        </div>

        {/* Last Posted Article */}
        <Card>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Last Posted Article</p>
          {data?.lastPostedLink ? (
            <a
              href={data.lastPostedLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline break-all"
            >
              {data.lastPostedLink}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground italic">No articles posted yet.</p>
          )}
        </Card>

        {/* Webhook Info */}
        <Card>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Webhook Endpoints</p>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-xs font-bold">GET</span>
              <span className="text-foreground">/api/webhook</span>
              <span className="text-muted-foreground text-xs ml-auto">Webhook verification</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 text-xs font-bold">POST</span>
              <span className="text-foreground">/api/webhook</span>
              <span className="text-muted-foreground text-xs ml-auto">Incoming messages</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-xs font-bold">GET</span>
              <span className="text-foreground">/api/status</span>
              <span className="text-muted-foreground text-xs ml-auto">Bot status JSON</span>
            </div>
          </div>
        </Card>

        {/* Commands Reference */}
        <Card>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Bot Commands</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <code className="px-2 py-0.5 rounded bg-muted text-primary text-xs font-mono whitespace-nowrap">bot news on</code>
              <span className="text-muted-foreground text-xs">Enable automatic news posting every hour to the Facebook Page</span>
            </div>
            <div className="flex items-start gap-3">
              <code className="px-2 py-0.5 rounded bg-muted text-primary text-xs font-mono whitespace-nowrap">bot news off</code>
              <span className="text-muted-foreground text-xs">Stop automatic news posting</span>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Philippines News Bot · Powered by Newsdata.io + Facebook Graph API · Refreshes every 30s
        </p>
      </main>
    </div>
  );
}
