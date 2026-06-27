import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "./-components/open-day/NavBar";
import { COLORS } from "./-components/open-day/styles";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — VR Smash Connect Open Day" }] }),
  component: LeaderboardPage,
});

interface MatchRow {
  id: string;
  player_1: string;
  player_2: string;
  round: number;
  status: string;
  winner: string | null;
}

interface StandingsEntry {
  player: string;
  played: number;
  won: number;
  lost: number;
  points: number;
}

const TOURNAMENT = "open-day";

function LeaderboardPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    const { data } = await supabase
      .from("match_results")
      .select("id, player_1, player_2, round, status, winner")
      .eq("tournament_id", TOURNAMENT)
      .order("round", { ascending: true });
    if (data) {
      setMatches(data as MatchRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMatches();
    const sub = supabase
      .channel("leaderboard-realtime")
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

  // Calculate standings from completed matches
  const standings = useMemo(() => {
    const completed = matches.filter((m) => m.status === "complete" && m.winner);
    const map = new Map<string, { played: number; won: number; lost: number; points: number }>();

    for (const m of completed) {
      if (!m.winner) continue;
      const loser = m.winner === m.player_1 ? m.player_2 : m.player_1;

      for (const p of [m.player_1, m.player_2]) {
        if (!map.has(p)) {
          map.set(p, { played: 0, won: 0, lost: 0, points: 0 });
        }
        const entry = map.get(p)!;
        entry.played++;
        if (p === m.winner) {
          entry.won++;
          entry.points += 2;
        } else {
          entry.lost++;
        }
      }
    }

    const arr: StandingsEntry[] = [];
    for (const [player, data] of map) {
      arr.push({ player, ...data });
    }

    arr.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.won !== a.won) return b.won - a.won;
      return a.player.localeCompare(b.player);
    });

    return arr;
  }, [matches]);

  // Find scheduled matches (still to play)
  const scheduledMatches = useMemo(() => {
    return matches
      .filter((m) => m.status === "scheduled")
      .sort((a, b) => (a.round || 1) - (b.round || 1));
  }, [matches]);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
            Leaderboard
          </h1>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.7rem",
              fontWeight: 700,
              color: COLORS.green,
              padding: "0.15rem 0.5rem 0.15rem 0.35rem",
              borderRadius: 20,
              border: `1px solid ${COLORS.green}44`,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: COLORS.green,
                display: "inline-block",
              }}
            />
            Live
          </span>
        </div>
        <p style={{ fontSize: "0.85rem", color: COLORS.textMuted, margin: "0 0 1.5rem" }}>
          VR Smash Connect — Open Day
        </p>

        {loading && (
          <div style={{ textAlign: "center", padding: "3rem", color: COLORS.textMuted }}>
            Loading…
          </div>
        )}

        {!loading && standings.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: COLORS.textMuted, fontSize: "0.9rem" }}>
            No results yet. Standings will appear here once matches are completed.
          </div>
        )}

        {standings.length > 0 && (
          <div
            style={{
              background: COLORS.surface,
              borderRadius: 12,
              border: `1px solid ${COLORS.border}`,
              overflow: "hidden",
              marginBottom: "2rem",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr 56px 56px 56px 56px",
                gap: 0,
                padding: "0.6rem 1rem",
                fontSize: "0.7rem",
                fontWeight: 700,
                color: COLORS.textMuted,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                borderBottom: `1px solid ${COLORS.border}`,
              }}
            >
              <span>Rank</span>
              <span>Player</span>
              <span style={{ textAlign: "center" }}>Pld</span>
              <span style={{ textAlign: "center" }}>W</span>
              <span style={{ textAlign: "center" }}>L</span>
              <span style={{ textAlign: "center" }}>Pts</span>
            </div>

            {/* Table rows */}
            {standings.map((entry, idx) => {
              const rank = idx + 1;
              const borderColor =
                rank === 1 ? COLORS.gold : rank === 2 ? COLORS.silver : rank === 3 ? COLORS.bronze : "transparent";
              const medal =
                rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
              return (
                <div
                  key={entry.player}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "48px 1fr 56px 56px 56px 56px",
                    gap: 0,
                    padding: "0.7rem 1rem",
                    borderLeft: `3px solid ${borderColor}`,
                    borderBottom: `1px solid ${COLORS.border}`,
                    fontSize: "0.9rem",
                    alignItems: "center",
                    background: rank <= 3 ? `${COLORS.surfaceAlt}` : "transparent",
                  }}
                >
                  <span style={{ fontSize: "1rem", fontWeight: 700 }}>
                    {medal ?? rank}
                  </span>
                  <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {entry.player}
                  </span>
                  <span style={{ textAlign: "center", color: COLORS.textMuted }}>{entry.played}</span>
                  <span style={{ textAlign: "center", color: COLORS.green }}>{entry.won}</span>
                  <span style={{ textAlign: "center", color: COLORS.red }}>{entry.lost}</span>
                  <span style={{ textAlign: "center", fontWeight: 700, color: COLORS.text }}>{entry.points}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Matches still to play */}
        {scheduledMatches.length > 0 && (
          <div>
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
              Matches still to play ({scheduledMatches.length})
            </h2>
            <div
              style={{
                background: COLORS.surface,
                borderRadius: 12,
                padding: "1rem 1.25rem",
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {scheduledMatches.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0",
                    borderBottom: `1px solid ${COLORS.border}`,
                    fontSize: "0.9rem",
                  }}
                >
                  <span>
                    <strong>{m.player_1}</strong> vs <strong>{m.player_2}</strong>
                  </span>
                  <span style={{ fontSize: "0.75rem", color: COLORS.textMuted, whiteSpace: "nowrap" }}>
                    Round {m.round}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
