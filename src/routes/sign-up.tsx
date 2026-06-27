import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "./-components/open-day/NavBar";
import { COLORS } from "./-components/open-day/styles";

export const Route = createFileRoute("/sign-up")({
  head: () => ({ meta: [{ title: "Sign Up — VR Smash Connect Open Day" }] }),
  component: SignUpPage,
});

function SignUpPage() {
  const [name, setName] = useState("");
  const [teacherOk, setTeacherOk] = useState(false);
  const [privacyOk, setPrivacyOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "duplicate"; text: string } | null>(null);

  const valid = name.trim().length > 0 && teacherOk && privacyOk;

  const handleSubmit = async () => {
    if (!valid) return;
    setSubmitting(true);
    setMsg(null);

    try {
      const { error } = await supabase.from("playoff_signups").insert({
        student_name: name.trim(),
        school: "Open Day",
        status: "pending",
        tournament_id: "open-day",
      });

      if (error) throw error;

      setMsg({ type: "success", text: `You're in, ${name.trim()}! Watch the bracket come together at the Bracket page.` });
      setTimeout(() => {
        setName("");
        setTeacherOk(false);
        setPrivacyOk(false);
        setMsg(null);
      }, 3000);
    } catch (err: any) {
      if (err?.code === "23505") {
        setMsg({ type: "duplicate", text: "You're already signed up!" });
      } else {
        setMsg({ type: "error", text: err?.message ?? "Something went wrong." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <div style={{ display: "flex", justifyContent: "center", padding: "3rem 1rem" }}>
        <div
          style={{
            background: COLORS.surface,
            borderRadius: 12,
            padding: "2.5rem 2rem",
            maxWidth: 440,
            width: "100%",
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.25rem", lineHeight: 1.2 }}>
            VR Smash Connect — Open Day
          </h1>
          <p style={{ fontSize: "0.9rem", color: COLORS.textMuted, margin: "0 0 1.75rem", lineHeight: 1.5 }}>
            Enter your name to join the tournament. You'll be added to the bracket automatically.
          </p>

          {msg && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: 8,
                marginBottom: "1.25rem",
                fontSize: "0.9rem",
                lineHeight: 1.45,
                background:
                  msg.type === "success" ? "#0d2a1a" : msg.type === "duplicate" ? "#2a1a0d" : "#2a0d0d",
                border: `1px solid ${
                  msg.type === "success" ? COLORS.green : msg.type === "duplicate" ? COLORS.amber : COLORS.red
                }`,
                color: msg.type === "success" ? "#a0e0a0" : msg.type === "duplicate" ? "#e0c080" : "#e0a0a0",
              }}
            >
              {msg.text}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.75rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>
              Player name
              <input
                type="text"
                placeholder="Your name"
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  padding: "0.7rem 0.85rem",
                  borderRadius: 8,
                  border: `1px solid ${COLORS.border}`,
                  fontSize: "0.95rem",
                  color: COLORS.text,
                  background: COLORS.bg,
                  outline: "none",
                }}
              />
            </label>

            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.85rem", lineHeight: 1.45, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={teacherOk}
                onChange={(e) => setTeacherOk(e.target.checked)}
                style={{ marginTop: 2, accentColor: COLORS.red, flexShrink: 0, width: 16, height: 16 }}
              />
              My teacher knows I'm entering this tournament.
            </label>

            <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.85rem", lineHeight: 1.45, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={privacyOk}
                onChange={(e) => setPrivacyOk(e.target.checked)}
                style={{ marginTop: 2, accentColor: COLORS.red, flexShrink: 0, width: 16, height: 16 }}
              />
              I've read the{" "}
              <a href="/privacy" style={{ color: COLORS.blue, textDecoration: "underline" }}>
                privacy & safety info
              </a>
              .
            </label>
          </div>

          <button
            disabled={!valid || submitting}
            onClick={handleSubmit}
            style={{
              display: "block",
              width: "100%",
              padding: "0.85rem",
              background: COLORS.red,
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: "1rem",
              fontWeight: 700,
              cursor: !valid || submitting ? "not-allowed" : "pointer",
              opacity: !valid || submitting ? 0.45 : 1,
            }}
          >
            {submitting ? "Signing up…" : "Join the tournament →"}
          </button>
        </div>
      </div>
    </div>
  );
}
