import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";

export const Route = createFileRoute("/signup")({
  head: () => ({ meta: [{ title: "Sign up — VR School Playoffs" }] }),
  component: SignupPage,
});

const SCHOOLS = ["Piopio College", "Taumarunui High School", "Otorohanga College", "Te Kuiti High School"];
const YEAR_GROUPS = Array.from({ length: 5 }, (_, i) => `Year ${i + 9}`);

const COLORS = { black: "#1a1a1a", red: "#d42b2b", redDK: "#a81e1e", white: "#fff", bg: "#f5f5f5", mid: "#555", border: "#ddd" };
const R = 6;

function SignupPage() {
  const [step, setStep] = useState<"form" | "confirm" | "duplicate" | "closed" | "error">("form");
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [yearGroup, setYearGroup] = useState("");
  const [house, setHouse] = useState("");
  const [playedBefore, setPlayedBefore] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [signupsClosed, setSignupsClosed] = useState<string[]>([]);

  // Fetch public signup count + closed schools
  useEffect(() => {
    fetch("/api/playoff/count")
      .then(r => r.json())
      .then(d => { if (d.total != null) setTotalCount(d.total); })
      .catch(() => {});
    fetch("/api/playoff/school-settings")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSignupsClosed(d.filter((s: any) => !s.signups_open).map((s: any) => s.school)); })
      .catch(() => {});
  }, []);

  const [confirmedName, setConfirmedName] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !school) return;
    setSubmitting(true);
    setErrMsg("");

    try {
      // Check closed
      if (signupsClosed.includes(school)) {
        setStep("closed");
        setSubmitting(false);
        return;
      }

      const res = await fetch("/api/playoff/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_name: name.trim(), school, year_group: yearGroup, house, played_before: playedBefore }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.error?.includes("closed")) {
          setStep("closed");
        } else {
          setErrMsg(data.error || "Something went wrong. Try again.");
        }
        setSubmitting(false);
        return;
      }

      if (data.duplicate) {
        setStep("duplicate");
      } else {
        setConfirmedName(data.name || name.trim());
        setStep("confirm");
      }
      // Refresh count
      fetch("/api/playoff/count")
        .then(r => r.json())
        .then(d => { if (d.total != null) setTotalCount(d.total); })
        .catch(() => {});
    } catch {
      setErrMsg("Network error. Check your connection and try again.");
    }
    setSubmitting(false);
  }, [name, school, yearGroup, house, playedBefore, signupsClosed]);

  const resetForm = () => {
    setStep("form");
    setName("");
    setSchool("");
    setYearGroup("");
    setHouse("");
    setPlayedBefore("");
    setErrMsg("");
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.black, fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <header style={{ background: COLORS.black, color: COLORS.white, padding: "1rem 1.5rem", borderBottom: `3px solid ${COLORS.red}` }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", fontSize: 13 }}>
            <span style={{ background: COLORS.red, padding: "2px 8px", marginRight: 8, fontWeight: 900 }}>E</span>
            School Playoffs
          </span>
          <a href="/" style={{ color: "#888", fontSize: 13, textDecoration: "none" }}>← Home</a>
        </div>
      </header>

      <div style={{ maxWidth: 560, margin: "2rem auto", padding: "0 1rem" }}>
        {/* Live counter */}
        {totalCount !== null && (
          <div style={{ textAlign: "center", marginBottom: "1.5rem", background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: R, padding: "0.75rem 1rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <span style={{ fontSize: 13, color: COLORS.mid }}>🎮 </span>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{totalCount}</span>
            <span style={{ fontSize: 13, color: COLORS.mid }}> player{totalCount !== 1 ? "s" : ""} signed up so far</span>
          </div>
        )}

        {step === "form" && (
          <div style={{ background: COLORS.white, borderRadius: R, padding: "2rem", borderTop: `3px solid ${COLORS.red}` }}>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800 }}>Sign up for school playoffs</h1>
            <p style={{ margin: "0.5rem 0 1.5rem", color: COLORS.mid, fontSize: 14 }}>
              Register your interest in representing your school in the VR table tennis tournament.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <Field label="Your name *">
                <input type="text" required value={name} onChange={e => setName(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${COLORS.border}`, borderRadius: 4, fontSize: 15, boxSizing: "border-box" }}
                  placeholder="e.g. Anahera Smith" maxLength={100} />
              </Field>

              {/* School */}
              <Field label="Your school *">
                <select required value={school} onChange={e => setSchool(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${COLORS.border}`, borderRadius: 4, fontSize: 15, background: COLORS.white, boxSizing: "border-box" }}>
                  <option value="">Select your school</option>
                  {SCHOOLS.map(s => (
                    <option key={s} value={s}>
                      {signupsClosed.includes(s) ? `${s} (closed)` : s}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Year group */}
              <Field label="Year group">
                <select value={yearGroup} onChange={e => setYearGroup(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${COLORS.border}`, borderRadius: 4, fontSize: 15, background: COLORS.white, boxSizing: "border-box" }}>
                  <option value="">Select year</option>
                  {YEAR_GROUPS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>

              {/* House */}
              <Field label="House">
                <input type="text" value={house} onChange={e => setHouse(e.target.value)}
                  style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${COLORS.border}`, borderRadius: 4, fontSize: 15, boxSizing: "border-box" }}
                  placeholder="e.g. Kahurangi" />
              </Field>

              {/* Played before */}
              <Field label="Have you played VR table tennis before?">
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {["Yes", "A few times", "Never"].map(opt => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: 14 }}>
                      <input type="radio" name="playedBefore" value={opt}
                        checked={playedBefore === opt}
                        onChange={e => setPlayedBefore(e.target.value)} />
                      {opt}
                    </label>
                  ))}
                </div>
              </Field>

              {errMsg && <p style={{ color: COLORS.red, fontSize: 13, marginTop: 8 }}>{errMsg}</p>}

              <button type="submit" disabled={submitting || !name.trim() || !school}
                style={{ marginTop: "1.25rem", width: "100%", padding: "0.75rem", background: COLORS.red, color: COLORS.white, border: 0, borderRadius: 4, fontWeight: 700, cursor: "pointer", fontSize: 15, opacity: submitting || !name.trim() || !school ? 0.6 : 1 }}>
                {submitting ? "Submitting…" : "Sign me up"}
              </button>
            </form>
          </div>
        )}

        {step === "confirm" && (
          <div style={{ background: COLORS.white, borderRadius: R, padding: "2rem", borderTop: `3px solid ${COLORS.red}`, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: "0.5rem" }}>🎉</div>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>You're on the list, {confirmedName}!</h2>
            <p style={{ color: COLORS.mid, fontSize: 14, lineHeight: 1.6, marginTop: "0.75rem" }}>
              We'll confirm your spot once sign-ups close. Watch the noticeboard for when the bracket is published.
            </p>
            <button onClick={resetForm}
              style={{ marginTop: "1rem", padding: "0.6rem 1.5rem", background: COLORS.black, color: COLORS.white, border: 0, borderRadius: 4, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
              Sign up another player
            </button>
          </div>
        )}

        {step === "duplicate" && (
          <div style={{ background: COLORS.white, borderRadius: R, padding: "2rem", borderTop: `3px solid ${COLORS.red}`, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: "0.5rem" }}>✅</div>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>You're already signed up!</h2>
            <p style={{ color: COLORS.mid, fontSize: 14, lineHeight: 1.6, marginTop: "0.75rem" }}>
              We've got you on the list. No need to sign up again — we'll confirm your spot once sign-ups close.
            </p>
            <a href="/" style={{ display: "inline-block", marginTop: "1rem", padding: "0.6rem 1.5rem", background: COLORS.black, color: COLORS.white, border: 0, borderRadius: 4, fontWeight: 600, cursor: "pointer", fontSize: 14, textDecoration: "none" }}>
              Back to home
            </a>
          </div>
        )}

        {step === "closed" && (
          <div style={{ background: COLORS.white, borderRadius: R, padding: "2rem", borderTop: `3px solid ${COLORS.red}`, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: "0.5rem" }}>🔒</div>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Sign-ups are now closed</h2>
            <p style={{ color: COLORS.mid, fontSize: 14, lineHeight: 1.6, marginTop: "0.75rem" }}>
              Sign-ups for your selected school are currently closed. Check back for the published bracket or contact your school coordinator.
            </p>
            <button onClick={resetForm}
              style={{ marginTop: "1rem", padding: "0.6rem 1.5rem", background: COLORS.black, color: COLORS.white, border: 0, borderRadius: 4, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
              Try another school
            </button>
          </div>
        )}

        {step === "error" && (
          <div style={{ background: COLORS.white, borderRadius: R, padding: "2rem", borderTop: `3px solid ${COLORS.red}`, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: "0.5rem" }}>⚠️</div>
            <h2 style={{ margin: 0, fontSize: "1.25rem" }}>Something went wrong</h2>
            <p style={{ color: COLORS.mid, fontSize: 14, marginTop: "0.75rem" }}>{errMsg}</p>
            <button onClick={resetForm}
              style={{ marginTop: "1rem", padding: "0.6rem 1.5rem", background: COLORS.black, color: COLORS.white, border: 0, borderRadius: 4, fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: "1rem" }}>
      <span style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}
