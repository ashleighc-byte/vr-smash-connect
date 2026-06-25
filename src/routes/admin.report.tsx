import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchReportData } from "@/lib/report.functions";

export const Route = createFileRoute("/admin/report")({
  head: () => ({ meta: [{ title: "Survey Report — VR Table Tennis Pilot" }, { name: "robots", content: "noindex" }] }),
  component: ReportPage,
});

// ── Design tokens ──
const BLACK = "#1a1a1a";
const RED = "#d42b2b";
const RED_DK = "#a81e1e";
const RED_LT = "#fdecea";
const BG = "#f5f5f5";
const WHITE = "#fff";
const MID = "#555";
const BORDER = "#ddd";
const GREEN = "#1a7a4a";
const GREEN_LT = "#e8f5ee";
const BLUE = "#1e5fa8";
const BLUE_LT = "#e8f0fb";
const AMBER = "#b45309";
const AMBER_LT = "#fef3c7";
const R = 6;

const CHART_COLORS = ["#d42b2b", "#1e5fa8", "#1a7a4a", "#b45309", "#6b21a8", "#0d9488", "#ca8a04", "#dc2626"];
const CHART_COLORS_CS = ["#d42b2b80", "#1e5fa880", "#1a7a4a80", "#b4530980", "#6b21a880", "#0d948880", "#ca8a0480", "#dc262680"];

type Tab = "student" | "staff" | "combined";
type Row = Record<string, unknown>;

// ── Helpers ──
function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = Array.isArray(v) ? v.join("; ") : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Row[], order?: string[]): string {
  if (!rows.length) return "";
  const cols = order ?? Array.from(rows.reduce((set, r) => { Object.keys(r).forEach(k => set.add(k)); return set; }, new Set<string>()));
  return cols.join(",") + "\n" + rows.map(r => cols.map(c => csvEscape(r[c])).join(",")).join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function countBy<T extends Row>(rows: T[], key: string): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const v = (r[key] ?? "—") as string;
    if (v.trim()) acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}

function flattenCount(rows: Row[], key: string): Record<string, number> {
  const acc: Record<string, number> = {};
  for (const r of rows) {
    const v = r[key];
    if (Array.isArray(v)) (v as string[]).forEach(item => { if (item?.trim()) acc[item.trim()] = (acc[item.trim()] ?? 0) + 1; });
    else if (typeof v === "string" && v.trim()) {
      // Some arrays stored as comma-separated strings
      v.split(",").map(s => s.trim()).filter(Boolean).forEach(s => { acc[s] = (acc[s] ?? 0) + 1; });
    }
  }
  return acc;
}

function average(rows: Row[], key: string): number | null {
  const vals = rows.map(r => Number(r[key])).filter(n => Number.isFinite(n));
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function percentage(rows: Row[], key: string, match: string): number {
  if (!rows.length) return 0;
  const count = rows.filter(r => String(r[key]) === match).length;
  return Math.round((count / rows.length) * 100);
}

function topN(obj: Record<string, number>, n: number): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

// ═══════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

function ReportPage() {
  const fetchData = useServerFn(fetchReportData);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ students: Row[]; staff: Row[] } | null>(null);
  const [tab, setTab] = useState<Tab>("student");

  // Chart.js reference (loaded from CDN, untyped)
  const chartJsRef = useRef<any>(null);
  const [chartsReady, setChartsReady] = useState(false);

  // Load Chart.js from CDN once
  useEffect(() => {
    if (chartJsRef.current) return;
    import("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" as unknown as string)
      .then(mod => {
        mod.Chart.defaults.color = MID;
        mod.Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        chartJsRef.current = mod;
        setChartsReady(true);
      })
      .catch(() => {});
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const res = await fetchData({ data: { password } });
      if (!res.ok) { setError(res.error); return; }
      setData({ students: res.students, staff: res.staff });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally { setLoading(false); }
  }

  // Refresh data
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetchData({ data: { password } });
      if (res.ok) setData({ students: res.students, staff: res.staff });
    } finally { setRefreshing(false); }
  }, [password, fetchData]);

  if (!data) {
    return (
      <div style={{ minHeight: "100vh", background: BG, color: BLACK, fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <form onSubmit={unlock} style={{ background: WHITE, padding: "2rem", borderRadius: R, maxWidth: 380, width: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: `3px solid ${RED}` }}>
          <h1 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1.25rem" }}>Survey report</h1>
          <p style={{ margin: 0, marginBottom: "1rem", color: MID, fontSize: 14 }}>VR Table Tennis Pilot — Sport Waikato</p>
          <label htmlFor="pw" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Password</label>
          <input id="pw" type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 15 }} />
          {error && <p style={{ color: RED, fontSize: 13, marginTop: 8 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ marginTop: "1rem", width: "100%", padding: "0.7rem", background: RED, color: WHITE, border: 0, borderRadius: 4, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
            {loading ? "Loading…" : "Open report"}
          </button>
        </form>
      </div>
    );
  }

  const students = data.students;
  const staff = data.staff;
  const n = { students: students.length, staff: staff.length };

  return (
    <div className="report-page" style={{ minHeight: "100vh", background: BG, color: BLACK, fontFamily: "system-ui, sans-serif", fontSize: 14, lineHeight: 1.5 }}>
      {/* Header */}
      <header style={{ background: BLACK, color: WHITE, padding: "1rem 1.5rem", borderBottom: `3px solid ${RED}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", fontSize: 14 }}>
          <span style={{ background: RED, padding: "2px 8px", marginRight: 8, fontWeight: 900 }}>E</span>
          Survey Report Dashboard
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ color: "#888", fontSize: 12 }}>
            {n.students} student · {n.staff} staff
          </span>
          <button onClick={refresh} disabled={refreshing}
            style={{ background: RED, color: WHITE, border: 0, padding: "0.4rem 0.85rem", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            {refreshing ? "⟳" : "↻"} Refresh
          </button>
          <a href="/admin" style={{ color: "#888", fontSize: 13, textDecoration: "none" }}>← Admin</a>
        </div>
      </header>

      {/* Tab Nav */}
      <div style={{ display: "flex", borderBottom: `1px solid ${BORDER}`, background: WHITE, paddingLeft: "1.5rem" }}>
        {(["student", "staff", "combined"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: "0.7rem 1.25rem", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
              cursor: "pointer", border: "none", borderBottom: tab === t ? `2px solid ${RED}` : "2px solid transparent",
              background: "transparent", color: tab === t ? RED : MID, textTransform: "capitalize",
            }}>
            {t === "student" ? "Student survey" : t === "staff" ? "Staff feedback" : "Combined summary"}
          </button>
        ))}
      </div>

      <div className="report-content" style={{ maxWidth: 1200, margin: "0 auto", padding: "1.5rem 1.25rem" }}>
        {tab === "student" && <StudentTab rows={students} chartsReady={chartsReady} chartJsRef={chartJsRef} />}
        {tab === "staff" && <StaffTab rows={staff} chartsReady={chartsReady} chartJsRef={chartJsRef} />}
        {tab === "combined" && <CombinedTab students={students} staff={staff} chartsReady={chartsReady} chartJsRef={chartJsRef} />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STUDENT TAB
// ═══════════════════════════════════════════════════════════════

function StudentTab({ rows, chartsReady, chartJsRef }: { rows: Row[]; chartsReady: boolean; chartJsRef: React.MutableRefObject<typeof import("chart.js") | null> }) {
  const n = rows.length;
  const schools = ["Piopio College", "Taumarunui High School", "Otorohanga College", "Te Kuiti High School"];

  // Computed metrics
  const bySchool = useMemo(() => countBy(rows, "school"), [rows]);
  const avgInterest = useMemo(() => average(rows, "interest_in_vr_tt"), [rows]);
  const activityIdentity = useMemo(() => {
    const target = "I would like to be more active but find it hard to get involved";
    return { count: rows.filter(r => String(r.activity_identity) === target).length, total: n, pct: percentage(rows, "activity_identity", target) };
  }, [rows]);
  const byFreq = useMemo(() => countBy(rows, "activity_frequency"), [rows]);
  const byInterest = useMemo(() => countBy(rows, "interest_in_vr_tt"), [rows]);
  const byGaming = useMemo(() => countBy(rows, "gaming_frequency"), [rows]);
  const barrierCounts = useMemo(() => flattenCount(rows, "participation_barriers"), [rows]);
  const motivatorCounts = useMemo(() => flattenCount(rows, "top_motivators"), [rows]);
  const topBarriers = useMemo(() => topN(barrierCounts, 5), [barrierCounts]);
  const topMotivators = useMemo(() => topN(motivatorCounts, 5), [motivatorCounts]);

  // Open responses
  const openResponses = useMemo(() =>
    rows.filter(r => {
      const s = String(r.suggestions ?? "").trim();
      const o = String(r.other_comments ?? "").trim();
      return s.length > 3 || o.length > 3;
    }), [rows]);

  // Insights
  const insights = useMemo(() => {
    const list: string[] = [];
    if (n > 0) {
      if (activityIdentity.pct > 40) list.push(`**${activityIdentity.pct}%** of students (${activityIdentity.count} of ${n}) selected *"I would like to be more active but find it hard to get involved"* — this group is the core audience for VR sport as a low-barrier entry point.`);
      if (avgInterest !== null) list.push(`Average interest in VR table tennis is **${avgInterest.toFixed(1)}/5**, with ${Object.entries(byInterest).filter(([k]) => Number(k) >= 4).reduce((s, [, v]) => s + v, 0)} of ${n} rating it 4 or 5.`);
      const mostFreq = topN(byFreq, 1)[0];
      if (mostFreq) list.push(`The most common activity frequency is *"${mostFreq[0]}"* (${mostFreq[1]} responses, ${Math.round(mostFreq[1] / n * 100)}%).`);
      const topMot = topMotivators[0];
      if (topMot) list.push(`The #1 motivator is *"${topMot[0]}"* (${topMot[1]} selections), highlighting what drives students to participate.`);
      const topBar = topBarriers[0];
      if (topBar) list.push(`The top participation barrier is *"${topBar[0]}"* (${topBar[1]} mentions), which should inform outreach strategies.`);
    }
    return list;
  }, [n, activityIdentity, avgInterest, byInterest, byFreq, topMotivators, topBarriers]);

  return (
    <div className="tab-content">
      {n === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: MID }}>
          <p>No student survey responses yet.</p>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <Section>
            <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.85rem" }}>
              <MetricCard label="Total responses" value={n} />
              {schools.map(s => <MetricCard key={s} label={s} value={bySchool[s] ?? 0} />)}
              <MetricCard label="Avg interest in VR TT" value={avgInterest !== null ? avgInterest.toFixed(1) : "—"} suffix="/5" />
              <MetricCard label="Wants to be more active" value={`${activityIdentity.pct}%`} sub={`${activityIdentity.count} of ${n}`} />
            </div>
          </Section>

          {/* Insights */}
          {insights.length > 0 && (
            <Section title="Key insights">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {insights.map((s, i) => <InsightBox key={i} text={s} color="blue" />)}
              </div>
            </Section>
          )}

          {/* Charts */}
          <Section>
            <ChartCard title="Activity frequency" id="student_chart_freq">
              {chartsReady && <BarChart canvasId="student_chart_freq" data={byFreq} chartJsRef={chartJsRef} />}
            </ChartCard>
            <ChartCard title="Interest in VR Table Tennis (1–5)" id="student_chart_interest">
              {chartsReady && <BarChart canvasId="student_chart_interest" data={byInterest} chartJsRef={chartJsRef} />}
            </ChartCard>
            <ChartCard title="Responses by school" id="student_chart_school">
              {chartsReady && <DonutChart canvasId="student_chart_school" data={bySchool} chartJsRef={chartJsRef} />}
            </ChartCard>
            <ChartCard title="Top 5 participation barriers" id="student_chart_barriers">
              {chartsReady && <HBarChart canvasId="student_chart_barriers" data={Object.fromEntries(topBarriers)} chartJsRef={chartJsRef} />}
            </ChartCard>
            <ChartCard title="Top 5 motivators" id="student_chart_motivators">
              {chartsReady && <HBarChart canvasId="student_chart_motivators" data={Object.fromEntries(topMotivators)} chartJsRef={chartJsRef} />}
            </ChartCard>
            <ChartCard title="Gaming frequency" id="student_chart_gaming">
              {chartsReady && <DonutChart canvasId="student_chart_gaming" data={byGaming} chartJsRef={chartJsRef} />}
            </ChartCard>
          </Section>

          {/* Open responses */}
          {openResponses.length > 0 && (
            <Section title={`Open responses (${openResponses.length})`}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {openResponses.map((r, i) => {
                  const school = String(r.school ?? "—");
                  const year = String(r.year_level ?? "");
                  const suggestions = String(r.suggestions ?? "").trim();
                  const other = String(r.other_comments ?? "").trim();
                  return (
                    <div key={i} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: R, padding: "1rem", borderLeft: `3px solid ${RED}` }}>
                      {suggestions && <p style={{ margin: 0, marginBottom: other ? "0.5rem" : 0, whiteSpace: "pre-wrap" }}>"{suggestions}"</p>}
                      {other && <p style={{ margin: 0, fontStyle: suggestions ? "normal" : "italic", whiteSpace: "pre-wrap", color: suggestions ? MID : "inherit" }}>"{other}"</p>}
                      <div style={{ fontSize: 12, color: MID, marginTop: "0.5rem" }}>— {school}{year ? `, Year ${year}` : ""}</div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Export */}
          <div className="no-print" style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <ExportButton label="Download CSV" onClick={() => download("student_survey_report.csv", toCsv(rows))} />
            <ExportButton label="Print report" onClick={() => window.print()} />
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAFF TAB
// ═══════════════════════════════════════════════════════════════

function StaffTab({ rows, chartsReady, chartJsRef }: { rows: Row[]; chartsReady: boolean; chartJsRef: React.MutableRefObject<typeof import("chart.js") | null> }) {
  const n = rows.length;

  const avgSetup = useMemo(() => average(rows, "setup_ease"), [rows]);
  const avgEngagement = useMemo(() => average(rows, "student_engagement"), [rows]);
  const runAgainPct = useMemo(() => percentage(rows, "would_run_again", "Yes"), [rows]);
  const byEngagement = useMemo(() => countBy(rows, "student_engagement"), [rows]);
  const techIssues = useMemo(() => flattenCount(rows, "technical_issues"), [rows]);
  const topTechIssues = useMemo(() => topN(techIssues, 6), [techIssues]);
  const studentTypes = useMemo(() => flattenCount(rows, "interested_student_types"), [rows]);
  const topStudentTypes = useMemo(() => topN(studentTypes, 6), [studentTypes]);
  const byRecommend = useMemo(() => countBy(rows, "recommend_to_schools"), [rows]);

  const finalComments = useMemo(() =>
    rows.filter(r => String(r.final_comments ?? "").trim().length > 3), [rows]);

  const insights = useMemo(() => {
    const list: string[] = [];
    if (n > 0) {
      if (runAgainPct >= 80) list.push(`**${runAgainPct}%** of staff said they *would run the program again* — strong endorsement for ongoing delivery.`);
      if (avgSetup !== null) list.push(`Average setup ease rating is **${avgSetup.toFixed(1)}/5**, reflecting how smoothly sessions ran from a logistics perspective.`);
      if (avgEngagement !== null) list.push(`Average student engagement rating is **${avgEngagement.toFixed(1)}/5**, indicating the program's appeal to students during sessions.`);
      const topIssue = topTechIssues[0];
      if (topIssue) list.push(`The most common technical issue reported is *"${topIssue[0]}"* (${topIssue[1]} mentions) — consider pre-session checks or additional training.`);
    }
    return list;
  }, [n, runAgainPct, avgSetup, avgEngagement, topTechIssues]);

  return (
    <div className="tab-content">
      {n === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: MID }}>
          <p>No staff feedback yet.</p>
        </div>
      ) : (
        <>
          {/* Metric cards */}
          <Section>
            <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.85rem" }}>
              <MetricCard label="Total responses" value={n} />
              <MetricCard label="Avg setup ease" value={avgSetup !== null ? avgSetup.toFixed(1) : "—"} suffix="/5" />
              <MetricCard label="Avg student engagement" value={avgEngagement !== null ? avgEngagement.toFixed(1) : "—"} suffix="/5" />
              <MetricCard label="Would run again" value={`${runAgainPct}%`} suffix={`Yes`} />
            </div>
          </Section>

          {/* Insights */}
          {insights.length > 0 && (
            <Section title="Key insights">
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {insights.map((s, i) => <InsightBox key={i} text={s} color="blue" />)}
              </div>
            </Section>
          )}

          {/* Charts */}
          <Section>
            <ChartCard title="Student engagement (1–5)" id="staff_chart_engagement">
              {chartsReady && <BarChart canvasId="staff_chart_engagement" data={byEngagement} chartJsRef={chartJsRef} />}
            </ChartCard>
            <ChartCard title="Technical issues" id="staff_chart_tech">
              {chartsReady && <HBarChart canvasId="staff_chart_tech" data={Object.fromEntries(topTechIssues)} chartJsRef={chartJsRef} />}
            </ChartCard>
            <ChartCard title="Interested student types" id="staff_chart_types">
              {chartsReady && <HBarChart canvasId="staff_chart_types" data={Object.fromEntries(topStudentTypes)} chartJsRef={chartJsRef} />}
            </ChartCard>
            <ChartCard title="Recommend to other schools" id="staff_chart_recommend">
              {chartsReady && <DonutChart canvasId="staff_chart_recommend" data={byRecommend} chartJsRef={chartJsRef} />}
            </ChartCard>
          </Section>

          {/* Open responses */}
          {finalComments.length > 0 && (
            <Section title={`Final comments (${finalComments.length})`}>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {finalComments.map((r, i) => {
                  const school = String(r.school ?? "—");
                  const role = String(r.role ?? "");
                  return (
                    <div key={i} style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: R, padding: "1rem", borderLeft: `3px solid ${RED}` }}>
                      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>"{String(r.final_comments ?? "").trim()}"</p>
                      <div style={{ fontSize: 12, color: MID, marginTop: "0.5rem" }}>— {school}{role ? `, ${role}` : ""}</div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Export */}
          <div className="no-print" style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
            <ExportButton label="Download CSV" onClick={() => download("staff_survey_report.csv", toCsv(rows))} />
            <ExportButton label="Print report" onClick={() => window.print()} />
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMBINED TAB
// ═══════════════════════════════════════════════════════════════

function CombinedTab({ students, staff }: { students: Row[]; staff: Row[]; chartsReady: boolean; chartJsRef: React.MutableRefObject<typeof import("chart.js") | null> }) {
  const s = students, t = staff;
  const sn = s.length, tn = t.length;

  // Metrics
  const schools = ["Piopio College", "Taumarunui High School", "Otorohanga College", "Te Kuiti High School"];
  const bySchool = useMemo(() => countBy(s, "school"), [s]);
  const schoolsWithData = useMemo(() => schools.filter(sc => (bySchool[sc] ?? 0) > 0 || t.some(r => String(r.school) === sc)), [bySchool, t]);
  const avgInterest = useMemo(() => average(s, "interest_in_vr_tt"), [s]);
  const avgEngagement = useMemo(() => average(t, "student_engagement"), [t]);
  const runAgainPct = useMemo(() => percentage(t, "would_run_again", "Yes"), [t]);
  const activityPct = useMemo(() => percentage(s, "activity_identity", "I would like to be more active but find it hard to get involved"), [s]);

  // Tech issues analysis
  const techIssues = useMemo(() => flattenCount(t, "technical_issues"), [t]);
  const pctWithCastingIssues = useMemo(() => {
    const total = t.length;
    if (!total) return 0;
    const castingCount = t.filter(r => {
      const issues = r.technical_issues;
      if (Array.isArray(issues)) return (issues as string[]).some(i => i.toLowerCase().includes("cast") || i.toLowerCase().includes("mirror") || i.toLowerCase().includes("screen"));
      if (typeof issues === "string") return issues.toLowerCase().includes("cast") || issues.toLowerCase().includes("mirror") || issues.toLowerCase().includes("screen");
      return false;
    }).length;
    return Math.round((castingCount / total) * 100);
  }, [t]);

  // Insights
  const greenInsight = useMemo(() => {
    if (runAgainPct >= 90) return `**${runAgainPct}%** of staff would run the program again — a resounding vote of confidence across participating schools.`;
    if (runAgainPct >= 70) return `**${runAgainPct}%** of staff would run the program again — strong support for continued delivery.`;
    if (avgInterest !== null && avgInterest >= 4) return `Student interest in VR table tennis averages **${avgInterest.toFixed(1)}/5**, indicating very strong appeal — students actively want this program.`;
    if (avgEngagement !== null && avgEngagement >= 4) return `Staff report student engagement averaging **${avgEngagement.toFixed(1)}/5** — the program effectively captures student attention.`;
    return `**${sn}** student responses and **${tn}** staff responses collected across ${schoolsWithData.length} schools.`;
  }, [runAgainPct, avgInterest, avgEngagement, sn, tn, schoolsWithData]);

  const blueInsight = useMemo(() => {
    if (activityPct > 50) return `**${activityPct}%** of students (${Math.round(sn * activityPct / 100)} of ${sn}) said they *want to be more active but find it hard to get involved* — VR table tennis directly addresses this gap.`;
    if (avgInterest !== null) return `Average student interest in VR table tennis is **${avgInterest.toFixed(1)}/5**, with participation patterns suggesting the program fills a niche between sport and gaming.`;
    if (sn > 0) return `The program reached **${sn}** students across **${schoolsWithData.length}** schools, demonstrating strong engagement in the Waikato KC Cluster.`;
    return `Staff feedback highlights operational findings across setup, engagement, and technical areas.`;
  }, [activityPct, avgInterest, sn, schoolsWithData]);

  const amberInsight = useMemo(() => {
    const topIssues = topN(techIssues, 3);
    if (pctWithCastingIssues > 40) return `**${pctWithCastingIssues}%** of staff reported casting or screen-mirroring issues — the most common technical challenge. Consider testing casting setups before each session or providing alternative connection guides.`;
    if (topIssues.length > 0) return `Technical issues were reported: *${topIssues.slice(0, 2).map(([issue, count]) => `"${issue}" (${count})`).join(", ")}*. Review equipment handling procedures to reduce friction.`;
    if (tn > 0 && avgEngagement !== null && avgEngagement < 3) return `Average student engagement rated **${avgEngagement.toFixed(1)}/5** by staff — below target. Consider reviewing session format or activity variety.`;
    return `No major risks identified from survey data — continue monitoring participation and technical setup across sessions.`;
  }, [pctWithCastingIssues, techIssues, avgEngagement, tn]);

  // Recommended next steps (data-driven)
  const recommendations = useMemo(() => {
    const list: string[] = [];
    if (activityPct > 60) {
      list.push(`**Prioritise low-barrier entry.** With ${activityPct}% of students expressing they want to be more active but find it hard to get involved, continue promoting VR table tennis as an accessible sport option. Consider separate beginner-friendly sessions.`);
    } else if (activityPct > 30) {
      list.push(`**Target less active students.** ${activityPct}% of respondents want to be more active — ensure VR table tennis is specifically marketed as a low-barrier, non-intimidating entry to sport.`);
    } else {
      list.push(`**Build on existing engagement.** With ${sn} student responses collected, maintain momentum through regular lunchtime sessions and promotional events.`);
    }

    if (runAgainPct === 100) {
      list.push(`**Scale the program.** Every staff respondent said they would run the program again — capitalise on this enthusiasm by expanding session availability and recruiting additional staff facilitators.`);
    } else if (runAgainPct >= 80) {
      list.push(`**Retain staff buy-in.** ${runAgainPct}% of staff would run the program again. Gather qualitative feedback from the remaining ${Math.round(tn * (100 - runAgainPct) / 100)} staff to address any concerns.`);
    } else {
      list.push(`**Address staff concerns.** Only ${runAgainPct}% of staff would run the program again. Follow up with staff who responded negatively to understand barriers and iterate on program structure.`);
    }

    const topIssues = topN(techIssues, 2);
    if (topIssues.length > 0) {
      list.push(`**Resolve top technical issues.** Address *"${topIssues[0][0]}"* (${topIssues[0][1]} reports)${topIssues[1] ? ` and *"${topIssues[1][0]}"* (${topIssues[1][1]} reports)` : ""}. Consider a pre-session checklist or dedicated tech support during lunchtimes.`);
    }

    // Schools without data
    const schoolsWithout = schools.filter(sc => !schoolsWithData.includes(sc));
    if (schoolsWithout.length > 0) {
      list.push(`**Engage missing schools.** ${schoolsWithout.length} school(s) have no survey data yet: ${schoolsWithout.join(", ")}. Reach out to coordinators.`);
    }

    return list;
  }, [activityPct, runAgainPct, techIssues, schoolsWithData, schools, sn, tn]);

  return (
    <div className="tab-content">
      <Section>
        <div className="metric-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.85rem" }}>
          <MetricCard label="Student responses" value={sn} />
          <MetricCard label="Staff responses" value={tn} />
          <MetricCard label="Schools with data" value={schoolsWithData.length} suffix={`/4`} />
          <MetricCard label="Avg interest in VR TT" value={avgInterest !== null ? avgInterest.toFixed(1) : "—"} suffix="/5" color="blue" />
          <MetricCard label="Avg student engagement" value={avgEngagement !== null ? avgEngagement.toFixed(1) : "—"} suffix="/5" color="blue" />
          <MetricCard label="Staff would run again" value={`${runAgainPct}%`} suffix="Yes" color="green" />
        </div>
      </Section>

      {/* Insight boxes */}
      <Section title="Insights summary">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <InsightBox text={greenInsight} color="green" />
          <InsightBox text={blueInsight} color="blue" />
          <InsightBox text={amberInsight} color="amber" />
        </div>
      </Section>

      {/* Recommended next steps */}
      <Section title="Recommended next steps">
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          {recommendations.map((rec, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: "0.75rem", alignItems: "start" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", background: RED, color: WHITE,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 13, flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ paddingTop: "0.25rem", lineHeight: 1.6, maxWidth: 700 }}>
                <div dangerouslySetInnerHTML={{ __html: rec }} />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Export */}
      <div className="no-print" style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
        <ExportButton label="Download Student CSV" onClick={() => download("student_survey_report.csv", toCsv(s))} />
        <ExportButton label="Download Staff CSV" onClick={() => download("staff_survey_report.csv", toCsv(t))} />
        <ExportButton label="Generate PDF Report" onClick={() => window.print()} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHART COMPONENTS
// ═══════════════════════════════════════════════════════════════

function BarChart({ canvasId, data, chartJsRef }: { canvasId: string; data: Record<string, number>; chartJsRef: React.MutableRefObject<typeof import("chart.js") | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<import("chart.js").Chart | null>(null);

  useEffect(() => {
    if (!chartJsRef.current || !canvasRef.current) return;
    const chartJs = chartJsRef.current;
    if (chartRef.current) { chartRef.current.destroy(); }
    const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    chartRef.current = new chartJs.Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(([k]) => truncate(k, 20)),
        datasets: [{
          label: "Responses",
          data: sorted.map(([, v]) => v),
          backgroundColor: RED,
          borderRadius: 3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
          x: { ticks: { maxRotation: 45 } },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data, chartJsRef]);

  return <canvas ref={canvasRef} id={canvasId} style={{ width: "100%", height: 220 }} />;
}

function HBarChart({ canvasId, data, chartJsRef }: { canvasId: string; data: Record<string, number>; chartJsRef: React.MutableRefObject<typeof import("chart.js") | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<import("chart.js").Chart | null>(null);

  useEffect(() => {
    if (!chartJsRef.current || !canvasRef.current) return;
    const chartJs = chartJsRef.current;
    if (chartRef.current) { chartRef.current.destroy(); }
    const sorted = Object.entries(data).sort((a, b) => a[1] - b[1]);
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    chartRef.current = new chartJs.Chart(ctx, {
      type: "bar",
      data: {
        labels: sorted.map(([k]) => truncate(k, 28)),
        datasets: [{
          label: "Mentions",
          data: sorted.map(([, v]) => v),
          backgroundColor: BLUE,
          borderRadius: 3,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data, chartJsRef]);

  return <canvas ref={canvasRef} id={canvasId} style={{ width: "100%", height: Math.max(180, Object.keys(data).length * 36) }} />;
}

function DonutChart({ canvasId, data, chartJsRef }: { canvasId: string; data: Record<string, number>; chartJsRef: React.MutableRefObject<typeof import("chart.js") | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<import("chart.js").Chart | null>(null);

  useEffect(() => {
    if (!chartJsRef.current || !canvasRef.current) return;
    const chartJs = chartJsRef.current;
    if (chartRef.current) { chartRef.current.destroy(); }
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    chartRef.current = new chartJs.Chart(ctx, {
      type: "doughnut",
      data: {
        labels: entries.map(([k]) => k),
        datasets: [{
          data: entries.map(([, v]) => v),
          backgroundColor: CHART_COLORS.slice(0, entries.length).concat(CHART_COLORS_CS.slice(0, Math.max(0, entries.length - CHART_COLORS.length))),
          borderWidth: 0,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data, chartJsRef]);

  // Build HTML legend
  const entries = Object.entries(data);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  return (
    <div>
      <canvas ref={canvasRef} id={canvasId} style={{ width: "100%", height: 200 }} />
      <div className="chart-legend" style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center", marginTop: "0.75rem" }}>
        {entries.map(([k, v], i) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: 12, color: MID }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }} />
            <span>{k}</span>
            <span style={{ fontWeight: 700 }}>({total > 0 ? Math.round((v / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════

function MetricCard({ label, value, suffix, sub, color }: { label: string; value: string | number; suffix?: string; sub?: string; color?: string }) {
  const accent = color === "green" ? GREEN : color === "blue" ? BLUE : color === "amber" ? AMBER : BLACK;
  return (
    <div className="metric-card" style={{ background: WHITE, padding: "1rem 1.15rem", borderRadius: R, borderLeft: `4px solid ${accent}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 12, color: MID, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 2, lineHeight: 1 }}>
        {value}{suffix && <span style={{ fontSize: 14, fontWeight: 600, color: MID, marginLeft: 4 }}>{suffix}</span>}
      </div>
      {sub && <div style={{ fontSize: 12, color: MID, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="report-section" style={{ marginBottom: "1.5rem" }}>
      {title && <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, marginBottom: "0.85rem", letterSpacing: "-0.01em" }}>{title}</h2>}
      {children}
    </section>
  );
}

function ChartCard({ title, id, children }: { title: string; id: string; children: React.ReactNode }) {
  return (
    <div className="chart-card" style={{ background: WHITE, border: `1px solid ${BORDER}`, borderRadius: R, padding: "1rem", marginBottom: "1rem" }}>
      <h3 className="chart-title" style={{ fontSize: 13, fontWeight: 700, margin: 0, marginBottom: "0.75rem", color: MID, textTransform: "uppercase", letterSpacing: "0.03em" }}>{title}</h3>
      {children}
    </div>
  );
}

function InsightBox({ text, color }: { text: string; color: "green" | "blue" | "amber" }) {
  const palette = {
    green: { bg: GREEN_LT, border: GREEN, textColor: GREEN },
    blue: { bg: BLUE_LT, border: BLUE, textColor: "#1a3a6a" },
    amber: { bg: AMBER_LT, border: AMBER, textColor: "#7a3a00" },
  };
  const p = palette[color];
  return (
    <div style={{ background: p.bg, borderLeft: `3px solid ${p.border}`, borderRadius: `0 ${R}px ${R}px 0`, padding: "0.75rem 1rem", fontSize: "0.88rem", color: p.textColor, lineHeight: 1.6 }}>
      <div dangerouslySetInnerHTML={{ __html: text }} />
    </div>
  );
}

function ExportButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: BLACK, color: WHITE, border: 0, padding: "0.55rem 1.1rem", borderRadius: R,
      fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em",
    }}>
      {label}
    </button>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// ── Print styles ──
const printStyle = document.createElement("style");
printStyle.textContent = `
@media print {
  body { background: #fff !important; }
  .no-print { display: none !important; }
  .report-page header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .report-page header, .report-page header * { background: #1a1a1a !important; color: #f5f5f5 !important; }
  .report-section { break-inside: avoid; }
  .chart-card { break-inside: avoid; page-break-inside: avoid; }
  .metric-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .chart-legend { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .metric-grid { grid-template-columns: repeat(4, 1fr) !important; }
  .report-content { padding: 0.5in !important; }
}
`;
document.head.appendChild(printStyle);
