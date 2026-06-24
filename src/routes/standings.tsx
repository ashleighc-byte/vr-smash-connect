import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  SCHOOLS,
  ROUND_ROBIN_DAYS,
  type MatchResult,
  type School,
} from "@/lib/tournament";

export const Route = createFileRoute("/standings")({
  head: () => ({
    meta: [
      { title: "Tournament Standings — VR Table Tennis" },
      { name: "description", content: "Live tournament standings for the VR Table Tennis interschool pilot." },
    ],
  }),
  component: StandingsPage,
});

const BLACK = "#1a1a1a";
const RED = "#d42b2b";
const BG = "#f5f5f5";
const BORDER = "#ddd";

async function fetchResults(): Promise<MatchResult[]> {
  const { data, error } = await supabase.from("match_results").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data as JSON as MatchResult[]) ?? [];
}

interface SchoolStats {
  school: School;
  played: number;
  won: number;
  lost: number;
  gamesWon: number;
  ptsDiff: number;
  points: number;
}

function computeStats(results: MatchResult[]): SchoolStats[] {
  const stats: Record<School, SchoolStats> = {} as Record<School, SchoolStats>;
  for (const s of SCHOOLS as unknown as School[]) {
    stats[s] = { school: s, played: 0, won: 0, lost: 0, gamesWon: 0, ptsDiff: 0, points: 0 };
  }

  for (const r of results) {
    if (!ROUND_ROBIN_DAYS.includes(r.match_day)) continue;
    const a = r.school_a as School;
    const b = r.school_b as School;

    stats[a].played += 1;
    stats[b].played += 1;
    stats[a].points += r.points_a;
    stats[b].points += r.points_b;
    stats[a].gamesWon += r.games_won_a;
    stats[b].gamesWon += r.games_won_b;

    if (r.points_a > r.points_b) {
      stats[a].won += 1;
      stats[b].lost += 1;
    } else if (r.points_b > r.points_a) {
      stats[b].won += 1;
      stats[a].lost += 1;
    }

    const diffA = r.game1_a + r.game2_a + (r.game3_a ?? 0) - (r.game1_b + r.game2_b + (r.game3_b ?? 0));
    stats[a].ptsDiff += diffA;
    stats[b].ptsDiff -= diffA;
  }

  return Object.values(stats);
}

function headToHeadWinner(a: School, b: School, results: MatchResult[]): School | null {
  const match = results.find((r) => (r.school_a === a && r.school_b === b) || (r.school_a === b && r.school_b === a));
  if (!match) return null;
  if (match.points_a > match.points_b) return match.school_a as School;
  if (match.points_b > match.points_a) return match.school_b as School;
  return null;
}

function StandingsPage() {
  const { data: results } = useQuery({ queryKey: ["match_results"], queryFn: fetchResults });

  const stats = useMemo(() => computeStats(results ?? []), [results]);

  const sorted = useMemo(() => {
    const arr = [...stats];
    arr.sort((x, y) => {
      if (y.points !== x.points) return y.points - x.points;
      const h2h = headToHeadWinner(x.school, y.school, results ?? []);
      if (h2h === x.school) return -1;
      if (h2h === y.school) return 1;
      if (y.gamesWon !== x.gamesWon) return y.gamesWon - x.gamesWon;
      if (y.ptsDiff !== x.ptsDiff) return y.ptsDiff - x.ptsDiff;
      return 0;
    });
    return arr;
  }, [stats, results]);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: BLACK, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: BLACK, color: "#f5f5f5", padding: "1rem 1.5rem", borderBottom: `3px solid ${RED}` }}>
        <div style={{ fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", fontSize: 14 }}>
          <span style={{ background: RED, padding: "2px 8px", marginRight: 8, fontWeight: 900 }}>E</span>
          VR Table Tennis — Tournament Standings
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <section style={{ background: "#fff", borderRadius: 6, padding: "1.25rem 1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem", fontWeight: 700 }}>Round Robin Standings</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  {["Rank", "School", "Played", "Won", "Lost", "Games Won", "Pts Diff", "Points"].map((h) => (
                    <th key={h} style={{ ...th, textAlign: h === "School" ? "left" : "center" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const top2 = i < 2;
                  return (
                    <tr key={s.school} style={top2 ? { borderLeft: "4px solid #2e7d32" } : undefined}>
                      <td style={{ ...td, textAlign: "center", fontWeight: 800, fontSize: 16 }}>{i + 1}</td>
                      <td style={td}><strong>{s.school}</strong></td>
                      <td style={{ ...td, textAlign: "center" }}>{s.played}</td>
                      <td style={{ ...td, textAlign: "center" }}>{s.won}</td>
                      <td style={{ ...td, textAlign: "center" }}>{s.lost}</td>
                      <td style={{ ...td, textAlign: "center" }}>{s.gamesWon}</td>
                      <td style={{ ...td, textAlign: "center" }}>{s.ptsDiff > 0 ? `+${s.ptsDiff}` : s.ptsDiff}</td>
                      <td style={{ ...td, textAlign: "center", fontWeight: 800, fontSize: 16 }}>{s.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ margin: "0.75rem 0 0", fontSize: 12, color: "#666" }}>
            Top 2 advance to semi-finals. Green left border indicates advancing teams.
          </p>
        </section>

        <section style={{ background: "#fff", borderRadius: 6, padding: "1.25rem 1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.1rem", fontWeight: 700 }}>Match Results Log</h2>
          {(!results || results.length === 0) ? (
            <p style={{ color: "#555", fontSize: 14 }}>No results yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {results.map((r) => (
                <div key={r.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "0.75rem 1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ fontWeight: 700 }}>{r.match_day} — {r.school_a} vs {r.school_b}</div>
                    <div style={{ fontSize: 13, color: "#555" }}>
                      {r.walkover ? "Walkover" : `${r.points_a}–${r.points_b} pts`}
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "#555", marginTop: 4 }}>
                    Players: {r.player_a} vs {r.player_b}
                  </div>
                  {!r.walkover && (
                    <div style={{ fontSize: 13, color: "#333", marginTop: 4 }}>
                      Games: {r.game1_a}–{r.game1_b}, {r.game2_a}–{r.game2_b}
                      {r.game3_a != null && r.game3_b != null ? `, ${r.game3_a}–${r.game3_b}` : ""}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "0.55rem 0.5rem", borderBottom: `2px solid ${BLACK}`, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" };
const td: React.CSSProperties = { padding: "0.55rem 0.5rem", borderBottom: `1px solid ${BORDER}` };
