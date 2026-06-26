import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [{ title: "Register to play — VR Table Tennis Tournament" }] }),
  component: TournamentSignUp,
});

const SCHOOLS = [
  "Piopio College",
  "Taumarunui High School",
  "Ōtorohanga College",
  "Te Kuiti High School",
] as const;

const YEAR_LEVELS = ["Year 9", "Year 10", "Year 11", "Year 12", "Year 13"];

type SignUpState = "form" | "submitting" | "success" | "duplicate" | "error";

function TournamentSignUp() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [karawhiuaId, setKarawhiuaId] = useState("");
  const [teacherConsent, setTeacherConsent] = useState(false);
  const [privacyAck, setPrivacyAck] = useState(false);
  const [state, setState] = useState<SignUpState>("form");
  const [errMsg, setErrMsg] = useState("");

  const valid =
    name.trim().length > 1 &&
    school !== "" &&
    yearLevel !== "" &&
    teacherConsent &&
    privacyAck;

  const handleSubmit = async () => {
    if (!valid) return;
    setState("submitting");

    try {
      const { error } = await supabase.from("playoff_signups").insert({
        student_name: name.trim(),
        school,
        year_group: yearLevel,
        karawhiua_user_id: karawhiuaId.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      setState("success");
      setTimeout(() => navigate({ to: "/school-bracket" }), 2500);
    } catch (err: any) {
      // 23505 = unique violation on (school, student_name)
      if (err?.code === "23505") {
        setState("duplicate");
      } else {
        setState("error");
        setErrMsg(err?.message ?? "Something went wrong. Please try again.");
      }
    }
  };

  // ── Success screen ────────────────────────────────────────────────────

  if (state === "success") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: "3.5rem", textAlign: "center", display: "block", marginBottom: "1rem" }}>🏓</div>
          <h1 style={styles.successHeading}>You're registered!</h1>
          <p style={styles.successBody}>
            <strong>{name}</strong> from <strong>{school}</strong> — you're
            in the draw. Taking you to the bracket now…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <span style={styles.eyebrow}>VR Smash Connect</span>
          <h1 style={styles.heading}>Register to play</h1>
          <p style={styles.subheading}>
            Sign up for the Eleven Table Tennis VR tournament. Your name goes straight into
            the bracket.
          </p>
        </div>

        {state === "duplicate" && (
          <div style={styles.alertRed}>
            Already signed up! It looks like you've already registered for this tournament.
          </div>
        )}
        {state === "error" && (
          <div style={styles.alertRed}>
            {errMsg}
          </div>
        )}

        <div style={styles.fields}>
          <label style={styles.label}>
            Your name *
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Alex Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
            />
          </label>

          <label style={styles.label}>
            School *
            <select
              style={styles.input}
              value={school}
              onChange={(e) => setSchool(e.target.value)}
            >
              <option value="">Select your school…</option>
              {SCHOOLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Year level *
            <select
              style={styles.input}
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value)}
            >
              <option value="">Select year level…</option>
              {YEAR_LEVELS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </label>

          <label style={styles.label}>
            Karawhiua username
            <span style={styles.optional}> (optional — links your house points)</span>
            <input
              style={styles.input}
              type="text"
              placeholder="Your Karawhiua username"
              value={karawhiuaId}
              onChange={(e) => setKarawhiuaId(e.target.value)}
              maxLength={80}
            />
          </label>

          <div style={styles.checkboxGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={teacherConsent}
                onChange={(e) => setTeacherConsent(e.target.checked)}
                style={styles.checkbox}
              />
              My teacher knows I'm signing up for this tournament.
            </label>

            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={privacyAck}
                onChange={(e) => setPrivacyAck(e.target.checked)}
                style={styles.checkbox}
              />
              I've read and agree to the{" "}
              <a href="/for-teachers" style={styles.link} target="_blank" rel="noreferrer">
                privacy &amp; safety information
              </a>
              .
            </label>
          </div>
        </div>

        <button
          style={{
            ...styles.submitBtn,
            ...(!valid || state === "submitting" ? styles.submitBtnDisabled : {}),
          }}
          onClick={handleSubmit}
          disabled={!valid || state === "submitting"}
        >
          {state === "submitting" ? "Registering…" : "Join the tournament →"}
        </button>

        <p style={styles.footnote}>
          Having trouble? Ask your Sport Waikato contact or teacher for help.
        </p>
      </div>
    </div>
  );
}

// ─── Inline styles (consistent with site palette) ─────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#1a1a1a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    fontFamily: "'Inter', system-ui, sans-serif",
  },
  card: {
    background: "#f5f5f5",
    borderRadius: "12px",
    padding: "2.5rem 2rem",
    maxWidth: "480px",
    width: "100%",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  },
  header: {
    marginBottom: "2rem",
  },
  eyebrow: {
    display: "block",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    color: "#d42b2b",
    marginBottom: "0.5rem",
  },
  heading: {
    fontSize: "1.75rem",
    fontWeight: 800,
    color: "#1a1a1a",
    margin: "0 0 0.5rem",
    lineHeight: 1.15,
  },
  subheading: {
    fontSize: "0.95rem",
    color: "#555",
    margin: 0,
    lineHeight: 1.5,
  },
  alertRed: {
    background: "#fdecea",
    border: "1px solid #d42b2b",
    borderRadius: "8px",
    padding: "0.85rem 1rem",
    marginBottom: "1.25rem",
    color: "#a81e1e",
    fontSize: "0.9rem",
    lineHeight: 1.45,
  },
  fields: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    marginBottom: "1.75rem",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#1a1a1a",
  },
  optional: {
    fontWeight: 400,
    color: "#888",
    fontSize: "0.8rem",
  },
  input: {
    padding: "0.65rem 0.85rem",
    borderRadius: "8px",
    border: "1.5px solid #d1d1d1",
    fontSize: "0.95rem",
    color: "#1a1a1a",
    background: "#fff",
    outline: "none",
    transition: "border-color 0.15s",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
  },
  checkboxGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    paddingTop: "0.25rem",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "0.6rem",
    fontSize: "0.875rem",
    color: "#333",
    lineHeight: 1.45,
    cursor: "pointer",
  },
  checkbox: {
    marginTop: "2px",
    accentColor: "#d42b2b",
    flexShrink: 0,
    width: "16px" as const,
    height: "16px" as const,
  },
  link: {
    color: "#1e5fa8",
    textDecoration: "underline",
  },
  submitBtn: {
    display: "block",
    width: "100%",
    padding: "0.85rem",
    background: "#d42b2b",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.15s",
    marginBottom: "1rem",
  },
  submitBtnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed" as const,
  },
  footnote: {
    fontSize: "0.78rem",
    color: "#888",
    textAlign: "center" as const,
    margin: 0,
  },
  successHeading: {
    fontSize: "1.75rem",
    fontWeight: 800,
    color: "#1a1a1a",
    textAlign: "center" as const,
    margin: "0 0 0.75rem",
  },
  successBody: {
    fontSize: "1rem",
    color: "#444",
    textAlign: "center" as const,
    lineHeight: 1.6,
    margin: 0,
  },
};
