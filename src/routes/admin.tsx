import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { fetchAdminData } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — VR Table Tennis Pilot" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

type Row = Record<string, unknown>;

const BLACK = "#1a1a1a";
const RED = "#d42b2b";
const BG = "#f5f5f5";
const BORDER = "#ddd";

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = Array.isArray(v) ? v.join("; ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Row[]): string {
  if (!rows.length) return "";
  const cols = Array.from(rows.reduce((set, r) => { Object.keys(r).forEach(k => set.add(k)); return set; }, new Set<string>()));
  const header = cols.join(",");
  const body = rows.map(r => cols.map(c => csvEscape(r[c])).join(",")).join("\n");
  return header + "\n" + body;
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function countBy<T extends Row>(rows: T[], key: string): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const v = (r[key] ?? "—") as string;
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}

function AdminPage() {
  const fetchData = useServerFn(fetchAdminData);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Row[] | null>(null);
  const [staff, setStaff] = useState<Row[] | null>(null);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetchData({ data: { password } });
      if (!res.ok) { setError(res.error); return; }
      setStudents(res.students as Row[]);
      setStaff(res.staff as Row[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally { setLoading(false); }
  }

  const bySchool = useMemo(() => students ? countBy(students, "school") : {}, [students]);
  const byFreq = useMemo(() => students ? countBy(students, "activity_frequency") : {}, [students]);

  if (!students || !staff) {
    return (
      <div style={{ minHeight: "100vh", background: BG, color: BLACK, fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <form onSubmit={unlock} style={{ background: "#fff", padding: "2rem", borderRadius: 6, maxWidth: 380, width: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: `3px solid ${RED}` }}>
          <h1 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1.25rem" }}>Admin access</h1>
          <p style={{ margin: 0, marginBottom: "1rem", color: "#555", fontSize: 14 }}>VR Table Tennis Pilot — Sport Waikato</p>
          <label htmlFor="pw" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Password</label>
          <input id="pw" type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 15 }} />
          {error && <p style={{ color: RED, fontSize: 13, marginTop: 8 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ marginTop: "1rem", width: "100%", padding: "0.7rem", background: RED, color: "#fff", border: 0, borderRadius: 4, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: BLACK, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: BLACK, color: "#f5f5f5", padding: "1rem 1.5rem", borderBottom: `3px solid ${RED}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", fontSize: 14 }}>
          <span style={{ background: RED, padding: "2px 8px", marginRight: 8, fontWeight: 900 }}>E</span>
          VR Table Tennis — Admin
        </div>
        <a href="/site.html" style={{ color: "#ccc", fontSize: 13, textDecoration: "none" }}>← Back to site</a>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <StatCard label="Student responses" value={students.length} />
          <StatCard label="Staff responses" value={staff.length} />
          <StatCard label="Schools represented" value={Object.keys(bySchool).length} />
        </section>

        <section style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem", flexWrap: "wrap" }}>
          <a href="/admin/roster" style={{ background: BLACK, color: "#f5f5f5", padding: "0.75rem 1.25rem", borderRadius: 4, fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: "0.02em" }}>Roster</a>
          <a href="/admin/scores" style={{ background: RED, color: "#f5f5f5", padding: "0.75rem 1.25rem", borderRadius: 4, fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: "0.02em" }}>Scores</a>
          <a href="/admin/report" style={{ background: "#1e5fa8", color: "#f5f5f5", padding: "0.75rem 1.25rem", borderRadius: 4, fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: "0.02em" }}>Survey Report</a>
          <a href="/admin/signups" style={{ background: "#b45309", color: "#f5f5f5", padding: "0.75rem 1.25rem", borderRadius: 4, fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: "0.02em" }}>Sign-ups</a>
        </section>

        <Panel title="Student survey — by school" onDownload={() => download("student_survey.csv", toCsv(students))}>
          <BreakdownTable data={bySchool} keyLabel="School" />
        </Panel>

        <Panel title="Student survey — by activity frequency (Q4)">
          <BreakdownTable data={byFreq} keyLabel="Activity frequency" />
        </Panel>

        <Panel title={`Staff feedback (${staff.length})`} onDownload={() => download("staff_survey.csv", toCsv(staff))}>
          <StaffTable rows={staff} />
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", padding: "1.25rem", borderRadius: 6, borderLeft: `4px solid ${RED}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 12, color: "#555", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function Panel({ title, children, onDownload }: { title: string; children: React.ReactNode; onDownload?: () => void }) {
  return (
    <section style={{ background: "#fff", borderRadius: 6, padding: "1.25rem 1.5rem", marginBottom: "1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
        <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{title}</h2>
        {onDownload && (
          <button onClick={onDownload} style={{ background: BLACK, color: "#f5f5f5", border: 0, padding: "0.45rem 0.85rem", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Download CSV
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function BreakdownTable({ data, keyLabel }: { data: Record<string, number>; keyLabel: string }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return <p style={{ color: "#555", fontSize: 14 }}>No responses yet.</p>;
  const total = entries.reduce((s, [, n]) => s + n, 0);
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead><tr><th style={th}>{keyLabel}</th><th style={{ ...th, textAlign: "right" }}>Count</th><th style={{ ...th, textAlign: "right" }}>%</th></tr></thead>
      <tbody>
        {entries.map(([k, n]) => (
          <tr key={k}>
            <td style={td}>{k}</td>
            <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{n}</td>
            <td style={{ ...td, textAlign: "right", color: "#555" }}>{Math.round((n / total) * 100)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const STAFF_COLS: Array<[string, string]> = [
  ["created_at", "Submitted"],
  ["school", "School"],
  ["completed_by", "Name"],
  ["role", "Role"],
  ["setup_ease", "Setup"],
  ["student_engagement", "Engagement"],
  ["would_run_again", "Run again?"],
  ["recommend_to_schools", "Recommend"],
];

function StaffTable({ rows }: { rows: Row[] }) {
  if (!rows.length) return <p style={{ color: "#555", fontSize: 14 }}>No staff feedback yet.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>{STAFF_COLS.map(([, label]) => <th key={label} style={th}>{label}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {STAFF_COLS.map(([k]) => {
                let v = r[k];
                if (k === "created_at" && v) v = new Date(String(v)).toLocaleString("en-NZ");
                return <td key={k} style={td}>{v == null || v === "" ? "—" : String(v)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "0.55rem 0.5rem", borderBottom: `2px solid ${BLACK}`, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" };
const td: React.CSSProperties = { padding: "0.55rem 0.5rem", borderBottom: `1px solid ${BORDER}` };