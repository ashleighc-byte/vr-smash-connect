import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/bracket/$school")({
  head: ({ params }) => ({ meta: [{ title: `${formatSchool(params.school)} Bracket — VR Table Tennis` }] }),
  component: PublicBracketPage,
});

const COLORS = { black: "#1a1a1a", red: "#d42b2b", white: "#fff", bg: "#f5f5f5", mid: "#555", border: "#ddd", green: "#1a7a4a", greenLT: "#e8f5ee" };
const R = 6;

function formatSchool(slug: string): string {
  return slug
    .split("-")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .replace("High", "High School")
    .replace("College", " College");
}

function slugify(school: string): string {
  return school.toLowerCase().replace(/[\s]+/g, "-").replace(/school/g, "").replace(/college/g, "").replace(/--+/g, "-").replace(/^-|-$/g, "");
}

interface BracketData {
  school: string;
  players: string[];
  matches: Record<string, { p1: string | null; p2: string | null; s1: number | null; s2: number | null; winner: string | null; walkover: boolean }>;
  sessionDates: string[];
  champion: string | null;
}

function PublicBracketPage() {
  const { school: schoolSlug } = Route.useParams();
  const schoolName = formatSchool(schoolSlug);
  const [loading, setLoading] = useState(true);
  const [bracket, setBracket] = useState<BracketData | null>(null);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/playoff/public-bracket?school=${encodeURIComponent(schoolName)}`)
      .then(r => r.json())
      .then(data => {
        if (data.published && data.bracket_data) {
          setBracket(data.bracket_data);
          setPublished(true);
        } else {
          setPublished(false);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load bracket data");
        setLoading(false);
      });
  }, [schoolName]);

  const bracketSlug = slugify(schoolName);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.black, fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: COLORS.mid }}>Loading bracket…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.black, fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", padding: "1rem" }}>
        <div style={{ fontSize: 48 }}>⚠️</div>
        <p style={{ color: COLORS.mid }}>{error}</p>
        <a href="/" style={{ color: COLORS.red, textDecoration: "none", fontWeight: 600, fontSize: 14 }}>← Back to home</a>
      </div>
    );
  }

  if (!published) {
    return (
      <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.black, fontFamily: "system-ui, sans-serif" }}>
        <header style={{ background: COLORS.black, color: COLORS.white, padding: "1rem 1.5rem", borderBottom: `3px solid ${COLORS.red}` }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", fontSize: 13 }}>
              <span style={{ background: COLORS.red, padding: "2px 8px", marginRight: 8, fontWeight: 900 }}>E</span>
              {schoolName}
            </span>
            <a href="/" style={{ color: "#888", fontSize: 13, textDecoration: "none" }}>← Home</a>
          </div>
        </header>
        <div style={{ maxWidth: 560, margin: "3rem auto", padding: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: "1rem" }}>📋</div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>{schoolName}</h1>
          <p style={{ color: COLORS.mid, fontSize: 14, lineHeight: 1.6, marginTop: "0.75rem" }}>
            The bracket for {schoolName} will be published here once sign-ups close. Check back soon.
          </p>
          <a href="/" style={{ display: "inline-block", marginTop: "1rem", padding: "0.6rem 1.5rem", background: COLORS.black, color: COLORS.white, borderRadius: R, fontWeight: 600, fontSize: 14, textDecoration: "none" }}>
            Back to home
          </a>
        </div>
      </div>
    );
  }

  const matches = bracket!.matches;
  const matchEntries = Object.entries(matches).filter(([, m]) => m.p1 || m.p2);
  const decidedMatches = matchEntries.filter(([, m]) => m.winner);
  const champion = bracket!.champion;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.black, fontFamily: "system-ui, sans-serif", fontSize: 14 }}>
      <header style={{ background: COLORS.black, color: COLORS.white, padding: "1rem 1.5rem", borderBottom: `3px solid ${COLORS.red}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", fontSize: 13 }}>
            <span style={{ background: COLORS.red, padding: "2px 8px", marginRight: 8, fontWeight: 900 }}>E</span>
            {schoolName} — Playoff Bracket
          </span>
          <a href="/" style={{ color: "#888", fontSize: 13, textDecoration: "none" }}>← Home</a>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "1.5rem auto", padding: "0 1rem" }}>
        {/* Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <SummaryCard label="Players" value={bracket!.players.length} />
          <SummaryCard label="Matches" value={matchEntries.length} />
          <SummaryCard label="Decided" value={decidedMatches.length} color="green" />
          <SummaryCard label="Sessions" value={bracket!.sessionDates.length} />
        </div>

        {/* Champion */}
        {champion && (
          <div style={{
            background: COLORS.greenLT, border: `2px solid ${COLORS.green}`, borderRadius: R,
            padding: "1.25rem", textAlign: "center", marginBottom: "1.5rem",
          }}>
            <div style={{ fontSize: 32, marginBottom: "0.25rem" }}>🏆</div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: COLORS.green }}>{champion}</div>
            <div style={{ fontSize: 12, color: COLORS.mid, marginTop: 2 }}>{schoolName} Champion</div>
          </div>
        )}

        {/* Match list */}
        <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.75rem" }}>Matches</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {matchEntries.length === 0 ? (
            <p style={{ color: COLORS.mid }}>No matches scheduled yet.</p>
          ) : (
            matchEntries.map(([id, mx]) => (
              <div key={id} style={{
                background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: R,
                padding: "0.85rem 1rem", borderLeft: `4px solid ${mx.winner ? COLORS.green : COLORS.red}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ fontWeight: 700 }}>
                    {mx.p1 || "TBD"} <span style={{ color: COLORS.mid, fontWeight: 400 }}>vs</span> {mx.p2 || "TBD"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {mx.walkover ? (
                      <span style={{ fontSize: 12, color: COLORS.red, fontWeight: 600 }}>Walkover</span>
                    ) : mx.winner ? (
                      <span style={{ fontSize: 13, color: COLORS.green, fontWeight: 700 }}>
                        {mx.s1}–{mx.s2}
                      </span>
                    ) : (
                      <span style={{ fontSize: 12, color: COLORS.mid }}>Not yet played</span>
                    )}
                  </div>
                </div>
                {mx.winner && (
                  <div style={{ fontSize: 12, color: COLORS.mid, marginTop: "0.25rem" }}>
                    Winner: <span style={{ fontWeight: 700, color: COLORS.green }}>{mx.winner}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Players list */}
        <h2 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "1.5rem 0 0.75rem" }}>Players ({bracket!.players.length})</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {bracket!.players.map((p, i) => (
            <div key={i} style={{
              background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: R,
              padding: "0.5rem 0.85rem", fontSize: 13, fontWeight: 600,
            }}>
              {p}
            </div>
          ))}
        </div>

        {/* Home link */}
        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <a href="/" style={{ color: COLORS.red, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>← Back to home</a>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const accent = color === "green" ? COLORS.green : COLORS.red;
  return (
    <div style={{ background: COLORS.white, padding: "0.85rem", borderRadius: R, borderLeft: `4px solid ${accent}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <div style={{ fontSize: 11, color: COLORS.mid, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}
