import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "./-components/open-day/NavBar";
import { COLORS } from "./-components/open-day/styles";

export const Route = createFileRoute("/enter-result")({
  head: () => ({ meta: [{ title: "Enter Result — VR Smash Connect Open Day" }] }),
  component: EnterResultPage,
});

interface MatchRow {
  id: string;
  player_1: string;
  player_2: string;
  round: number;
  status: string;
  winner: string | null;
  bracket_position: number | null;
}

const TOURNAMENT = "open-day";

function EnterResultPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    const { data } = await supabase
      .from("match_results")
      .select("id, player_1, player_2, round, status, winner, bracket_position")
      .eq("tournament_id", TOURNAMENT)
      .order("round", { ascending: true })
      .order("bracket_position", { ascending: true });
    if (data) {
      setMatches(data as MatchRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMatches();
    const sub = supabase
      .channel("enter-result-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_results",
          filter: `tournament_id=eq.${TOURNAMENT}`,
        },
        () => fetchMatches(),
      )
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, [fetchMatches]);

  const handleResult = async (matchId: string, winnerName: string) => {
    setSubmittingId(matchId);
    const current = matches.find((m) => m.id === matchId);
    const { error } = await supabase
      .from("match_results")
      .update({ winner: winnerName, status: "complete" })
      .eq("id", matchId);
    if (error) {
      alert(error.message);
    } else if (current && current.bracket_position !== null) {
      // Advance winner into next round
      const nextRound = current.round + 1;
      const nextPos = Math.floor(current.bracket_position / 2);
      const slotField = current.bracket_position % 2 === 0 ? "player_1" : "player_2";
      const { error: advErr } = await supabase
        .from("match_results")
        .update({ [slotField]: winnerName } as never)
        .eq("tournament_id", TOURNAMENT)
        .eq("round", nextRound)
        .eq("bracket_position", nextPos);
      if (advErr) console.error("Failed to advance winner:", advErr);
    }
    setSubmittingId(null);
    setOpenId(null);
  };

  // Group by round
  const byRound: Record<number, MatchRow[]> = {};
  for (const m of matches) {
    const r = m.round || 1;
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push(m);
  }
  const roundKeys = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.25rem" }}>
          Enter Result
        </h1>
        <p style={{ fontSize: "0.85rem", color: COLORS.textMuted, margin: "0 0 1.5rem" }}>
          Tap a match to record the winner.
        </p>

        {loading && (
          <div style={{ textAlign: "center", padding: "3rem", color: COLORS.textMuted }}>
            Loading…
          </div>
        )}

        {!loading && matches.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: COLORS.textMuted, fontSize: "0.9rem" }}>
            No matches yet. Go to the Bracket page to generate the tournament.
          </div>
        )}

        {/* Matches grouped by round */}
        {roundKeys.map((round) => (
          <div key={round} style={{ marginBottom: "1.5rem" }}>
            <h2
              style={{
                fontSize: "0.85rem",
                fontWeight: 700,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0 0 0.75rem",
              }}
            >
              Round {round}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {byRound[round].map((match) => (
                <div key={match.id}>
                  {/* Match row */}
                  <div
                    style={{
                      background: COLORS.surface,
                      borderRadius: 8,
                      padding: "0.85rem 1rem",
                      border: `1px solid ${COLORS.border}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: match.status === "complete" && match.winner === match.player_1 ? 700 : 400,
                          color: match.status === "complete" && match.winner === match.player_1
                            ? COLORS.red
                            : match.status === "complete"
                              ? `${COLORS.text}66`
                              : COLORS.text,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {match.player_1}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: COLORS.textMuted }}>vs</span>
                      <span
                        style={{
                          fontSize: "0.9rem",
                          fontWeight: match.status === "complete" && match.winner === match.player_2 ? 700 : 400,
                          color: match.status === "complete" && match.winner === match.player_2
                            ? COLORS.red
                            : match.status === "complete"
                              ? `${COLORS.text}66`
                              : COLORS.text,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {match.player_2}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.5rem",
                          borderRadius: 4,
                          background: match.status === "complete" ? `${COLORS.green}22` : `${COLORS.amber}22`,
                          color: match.status === "complete" ? COLORS.green : COLORS.amber,
                        }}
                      >
                        {match.status === "complete" ? "Complete" : "Scheduled"}
                      </span>
                      {match.status !== "complete" && (
                        <button
                          disabled={match.player_1 === "TBD" || match.player_2 === "TBD"}
                          onClick={() => setOpenId(openId === match.id ? null : match.id)}
                          style={{
                            padding: "0.4rem 0.75rem",
                            background: match.player_1 === "TBD" || match.player_2 === "TBD" ? `${COLORS.text}22` : COLORS.blue,
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: match.player_1 === "TBD" || match.player_2 === "TBD" ? "not-allowed" : "pointer",
                            whiteSpace: "nowrap",
                            opacity: match.player_1 === "TBD" || match.player_2 === "TBD" ? 0.5 : 1,
                          }}
                        >
                          {match.player_1 === "TBD" || match.player_2 === "TBD" ? "Awaiting players" : "Enter result"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline result panel */}
                  {openId === match.id && (
                    <div
                      style={{
                        background: COLORS.surfaceAlt,
                        borderRadius: 8,
                        padding: "1rem 1rem",
                        marginTop: "0.35rem",
                        border: `1px solid ${COLORS.border}`,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontSize: "0.8rem", color: COLORS.textMuted, fontWeight: 600 }}>
                        Who won?
                      </span>
                      <button
                        disabled={submittingId === match.id}
                        onClick={() => handleResult(match.id, match.player_1)}
                        style={{
                          padding: "0.5rem 1rem",
                          background: submittingId === match.id ? `${COLORS.text}22` : COLORS.red,
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: submittingId === match.id ? "not-allowed" : "pointer",
                          opacity: submittingId === match.id ? 0.5 : 1,
                        }}
                      >
                        {match.player_1} won
                      </button>
                      <button
                        disabled={submittingId === match.id}
                        onClick={() => handleResult(match.id, match.player_2)}
                        style={{
                          padding: "0.5rem 1rem",
                          background: submittingId === match.id ? `${COLORS.text}22` : COLORS.blue,
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          cursor: submittingId === match.id ? "not-allowed" : "pointer",
                          opacity: submittingId === match.id ? 0.5 : 1,
                        }}
                      >
                        {match.player_2} won
                      </button>
                      <button
                        onClick={() => setOpenId(null)}
                        style={{
                          padding: "0.5rem 1rem",
                          background: "transparent",
                          color: COLORS.textMuted,
                          border: "none",
                          borderRadius: 6,
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
