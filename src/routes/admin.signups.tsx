import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";

export const Route = createFileRoute("/admin/signups")({
  head: () => ({ meta: [{ title: "Sign-up Manager — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminSignups,
});

const SCHOOLS = ["Piopio College", "Taumarunui High School", "Otorohanga College", "Te Kuiti High School"];
const STATUSES = ["pending", "confirmed", "reserve", "withdrawn"] as const;

const STYLES = {
  black: "#1a1a1a",
  red: "#d42b2b",
  white: "#fff",
  bg: "#f5f5f5",
  mid: "#555",
  border: "#ddd",
  green: "#1a7a4a",
  amber: "#b45309",
};

interface Signup {
  id: string;
  created_at: string;
  school: string;
  student_name: string;
  year_group: string | null;
  house: string | null;
  played_before: string | null;
  status: string;
}

interface SchoolSetting {
  school: string;
  signups_open: boolean;
}

function AdminSignups() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [settings, setSettings] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchSignups = useCallback(async (pw: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/playoff/signups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.status === 401) { setAuthed(false); setError("Wrong password"); return; }
      const data = await res.json();
      setSignups(data.signups ?? []);
      const map: Record<string, boolean> = {};
      for (const s of (data.settings ?? [])) map[s.school] = s.signups_open;
      setSettings(map);
      setAuthed(true);
      setError(null);
    } catch { setError("Failed to load"); }
    setLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); fetchSignups(password); };

  const updateStatus = useCallback(async (id: string, newStatus: string) => {
    setSavingId(id);
    // Optimistic update
    setSignups(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    try {
      await fetch("/api/playoff/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id, status: newStatus }),
      });
    } catch { /* revert handled by refresh */ }
    setSavingId(null);
  }, [password]);

  const toggleSignups = useCallback(async (school: string, current: boolean) => {
    setSettings(prev => ({ ...prev, [school]: !current }));
    try {
      await fetch("/api/playoff/school-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, school, signups_open: !current }),
      });
    } catch {
      setSettings(prev => ({ ...prev, [school]: current }));
    }
  }, [password]);

  const generateBracket = useCallback((school: string) => {
    const confirmed = signups.filter(s => s.school === school && s.status === "confirmed");
    const players = confirmed.map(s => s.student_name);
    if (players.length < 2) {
      alert(`Need at least 2 confirmed players for ${school} (have ${players.length})`);
      return;
    }
    navigate({ to: "/school-bracket", search: { school, players: players.join(",") } });
  }, [signups, navigate]);

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: STYLES.bg, color: STYLES.black, fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <form onSubmit={handleLogin} style={{ background: STYLES.white, padding: "2rem", borderRadius: 6, maxWidth: 340, width: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: `3px solid ${STYLES.red}` }}>
          <h1 style={{ margin: 0, fontSize: "1.15rem" }}>Sign-up Manager</h1>
          <p style={{ margin: "0.25rem 0 1rem", color: STYLES.mid, fontSize: 13 }}>Admin password required</p>
          <input type="password" autoFocus value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${STYLES.border}`, borderRadius: 4, fontSize: 15, boxSizing: "border-box" }} />
          {error && <p style={{ color: STYLES.red, fontSize: 13, marginTop: 6 }}>{error}</p>}
          <button type="submit" style={{ marginTop: "0.75rem", width: "100%", padding: "0.65rem", background: STYLES.red, color: STYLES.white, border: 0, borderRadius: 4, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
            Unlock
          </button>
        </form>
      </div>
    );
  }

  const bySchool = SCHOOLS.map(school => {
    const rows = signups.filter(s => s.school === school);
    const confirmed = rows.filter(s => s.status === "confirmed").length;
    const pending = rows.filter(s => s.status === "pending").length;
    const reserve = rows.filter(s => s.status === "reserve").length;
    const open = settings[school] !== false; // default true
    return { school, rows, total: rows.length, confirmed, pending, reserve, open };
  });

  return (
    <div style={{ minHeight: "100vh", background: STYLES.bg, color: STYLES.black, fontFamily: "system-ui, sans-serif", fontSize: 14 }}>
      {/* Header */}
      <header style={{ background: STYLES.black, color: STYLES.white, padding: "1rem 1.5rem", borderBottom: `3px solid ${STYLES.red}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <span style={{ fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", fontSize: 13 }}>
          <span style={{ background: STYLES.red, padding: "2px 8px", marginRight: 8, fontWeight: 900 }}>E</span>
          Sign-up Manager
        </span>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button onClick={() => fetchSignups(password)} disabled={loading}
            style={{ background: STYLES.red, color: STYLES.white, border: 0, padding: "0.35rem 0.75rem", borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {loading ? "⟳" : "↻"} Refresh
          </button>
          <a href="/admin" style={{ color: "#888", fontSize: 12, textDecoration: "none" }}>← Admin</a>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.25rem" }}>
        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {bySchool.map(({ school, total, confirmed, pending, reserve, open }) => {
            const enough = confirmed >= 4;
            const ideal = confirmed >= 8;
            return (
              <div key={school} style={{ background: STYLES.white, borderRadius: 6, padding: "1rem", borderLeft: `4px solid ${open ? STYLES.red : STYLES.mid}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em", color: STYLES.mid }}>{school}</div>
                <div style={{ fontSize: 26, fontWeight: 800, margin: "2px 0" }}>{total}</div>
                <div style={{ fontSize: 12, color: STYLES.mid }}>
                  {confirmed} confirmed · {pending} pending · {reserve} reserve
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {ideal ? <span style={{ color: STYLES.green }}>✅ Enough for bracket</span> :
                    enough ? <span style={{ color: STYLES.amber }}>⚠️ Min 4 met</span> :
                    <span style={{ color: STYLES.mid }}>Need {4 - confirmed} more</span>}
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button onClick={() => toggleSignups(school, open)}
                    style={{ padding: "0.35rem 0.65rem", fontSize: 11, border: `1px solid ${STYLES.border}`, borderRadius: 4, background: STYLES.white, cursor: "pointer", color: open ? STYLES.red : STYLES.mid, fontWeight: 600 }}>
                    {open ? "🔓 Open" : "🔒 Closed"}
                  </button>
                  <button onClick={() => generateBracket(school)}
                    style={{ padding: "0.35rem 0.65rem", fontSize: 11, border: 0, borderRadius: 4, background: STYLES.black, color: STYLES.white, cursor: "pointer", fontWeight: 600 }}>
                    🎲 Generate bracket
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Table */}
        {signups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: STYLES.mid }}>No sign-ups yet.</div>
        ) : (
          SCHOOLS.filter(s => bySchool.find(b => b.school === s)!.rows.length > 0).map(school => {
            const { rows } = bySchool.find(b => b.school === school)!;
            return (
              <div key={school} style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>{school} ({rows.length})</h3>
                <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${STYLES.border}` }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: STYLES.black, color: STYLES.white, textAlign: "left" }}>
                        <th style={{ padding: "0.6rem 0.75rem" }}>Name</th>
                        <th style={{ padding: "0.6rem 0.75rem" }}>Year</th>
                        <th style={{ padding: "0.6rem 0.75rem" }}>House</th>
                        <th style={{ padding: "0.6rem 0.75rem" }}>VR Experience</th>
                        <th style={{ padding: "0.6rem 0.75rem" }}>Signed up</th>
                        <th style={{ padding: "0.6rem 0.75rem" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(r => (
                        <tr key={r.id} style={{ borderTop: `1px solid ${STYLES.border}`, background: r.status === "withdrawn" ? "#f9f9f9" : STYLES.white }}>
                          <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>{r.student_name}</td>
                          <td style={{ padding: "0.5rem 0.75rem", color: STYLES.mid }}>{r.year_group || "—"}</td>
                          <td style={{ padding: "0.5rem 0.75rem", color: STYLES.mid }}>{r.house || "—"}</td>
                          <td style={{ padding: "0.5rem 0.75rem", color: STYLES.mid }}>{r.played_before || "—"}</td>
                          <td style={{ padding: "0.5rem 0.75rem", color: STYLES.mid, fontSize: 12 }}>
                            {new Date(r.created_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td style={{ padding: "0.5rem 0.75rem" }}>
                            <select value={r.status} onChange={e => updateStatus(r.id, e.target.value)}
                              disabled={savingId === r.id}
                              style={{
                                padding: "0.3rem 0.5rem", borderRadius: 4, border: `1px solid ${STYLES.border}`,
                                fontSize: 12, fontWeight: 600,
                                background: r.status === "confirmed" ? STYLES.green : r.status === "reserve" ? STYLES.amber : STYLES.white,
                                color: r.status === "confirmed" || r.status === "reserve" ? STYLES.white : STYLES.black,
                                cursor: "pointer",
                              }}>
                              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
