import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/tournament")({
  head: () => ({
    meta: [{ title: "Tournament — VR Table Tennis" }, { name: "robots", content: "noindex" }],
  }),
  component: TournamentPage,
});

// ─── Types ─────────────────────────────────────────────────────────────

interface MatchRow {
  id: string;
  player_a: string | null;
  player_b: string | null;
  school_a: string | null;
  school_b: string | null;
  round_number: number | null;
  status: string | null;
  winner: string | null;
  tournament_id: string | null;
}

interface StandingsRow {
  rank: number;
  player: string;
  school: string;
  played: number;
  won: number;
  lost: number;
  points: number;
}

// ─── Palette ────────────────────────────────────────────────────────────

const P = {
  black: "#1a1a1a",
  red: "#d42b2b",
  redDk: "#a81e1e",
  white: "#f5f5f5",
  mid: "#555",
  border: "#ddd",
  green: "#1a7a4a",
  blue: "#1e5fa8",
  cardBg: "#fff",
};

// ─── Component ──────────────────────────────────────────────────────────

function TournamentPage() {
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultMatch, setResultMatch] = useState<MatchRow | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch initial data
  const fetchMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("match_results")
        .select("*")
        .not("round_number", "is", null)
        .order("round_number", { ascending: true })
        .order("id", { ascending: true });

      if (error) throw error;
      setMatches((data as unknown as MatchRow[]) ?? []);
    } catch (err) {
      console.error("Failed to fetch matches", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Supabase realtime subscription — live updates
  useEffect(() => {
    const channel = supabase
      .channel("tournament-matches")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_results",
          filter: `round_number=neq.${null}`, // only round-robin matches
        },
        (payload) => {
          // Merge the change into state
          if (payload.eventType === "INSERT") {
            setMatches((prev) => [...prev, payload.new as unknown as MatchRow]);
          } else if (payload.eventType === "UPDATE") {
            setMatches((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as unknown as MatchRow) : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMatches((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Group matches by round
  const rounds = useMemo(() => {
    const map = new Map<number, MatchRow[]>();
    for (const m of matches) {
      const r = m.round_number ?? 0;
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [matches]);

  // Derive current match (first scheduled one)
  const currentMatch = useMemo(() => {
    return matches.find((m) => m.status === "scheduled") ?? null;
  }, [matches]);

  // Standings
  const standings = useMemo((): StandingsRow[] => {
    const playerStats = new Map<
      string,
      { school: string; played: number; won: number; lost: number }
    >();

    for (const m of matches) {
      if (m.status !== "complete" || !m.winner) continue;
      const p1 = m.player_a ?? "";
      const p2 = m.player_b ?? "";
      const s1 = m.school_a ?? "";
      const s2 = m.school_b ?? "";

      if (!playerStats.has(p1))
        playerStats.set(p1, { school: s1, played: 0, won: 0, lost: 0 });
      if (!playerStats.has(p2))
        playerStats.set(p2, { school: s2, played: 0, won: 0, lost: 0 });

      const s = playerStats.get(p1)!;
      const s_ = playerStats.get(p2)!;
      s.played++;
      s_.played++;

      if (m.winner === p1) {
        s.won++;
        s_.lost++;
      } else if (m.winner === p2) {
        s_.won++;
        s.lost++;
      }
    }

    return Array.from(playerStats.entries())
      .map(([player, stats]) => ({
        rank: 0,
        player,
        school: stats.school,
        played: stats.played,
        won: stats.won,
        lost: stats.lost,
        points: stats.won * 2 + stats.lost * 0, // win = 2, loss = 0
      }))
      .sort((a, b) => b.points - a.points || b.won - a.won)
      .map((row, i) => ({ ...row, rank: i + 1 }));
  }, [matches]);

  // Submit result
  const submitResult = useCallback(
    async (matchId: string, winner: string) => {
      setSubmitting(true);
      setErrMsg(null);
      try {
        const { error } = await supabase
          .from("match_results")
          .update({ winner, status: "complete" })
          .eq("id", matchId);

        if (error) throw error;
        setResultMatch(null);
      } catch (err: any) {
        setErrMsg(err?.message ?? "Failed to save result");
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  // ── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <PageShell>
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: P.mid, fontSize: "1rem" }}>
          Loading tournament…
        </div>
      </PageShell>
    );
  }

  if (matches.length === 0) {
    return (
      <PageShell>
        <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
          <p style={{ fontSize: "1.1rem", color: P.mid, margin: "0 0 1rem" }}>
            No tournament matches yet.
          </p>
          <p style={{ fontSize: "0.9rem", color: P.mid, margin: 0 }}>
            Ask the organiser to generate the bracket from the admin panel.
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1rem" }}>
        <h1 style={{ margin: "0 0 1rem", fontSize: "1.5rem", fontWeight: 800, color: P.black, textAlign: "center" }}>
          🏓 Round Robin Tournament
        </h1>

        {/* ── Current match callout ── */}
        {currentMatch && (
          <CurrentMatchCard
            match={currentMatch}
            onEnterResult={(m) => setResultMatch(m)}
          />
        )}

        {/* ── Standings table ── */}
        <section style={{ marginBottom: "2rem" }}>
          <SectionHeading>Standings</SectionHeading>
          <StandingsTable rows={standings} />
        </section>

        {/* ── Schedule ── */}
        <section style={{ marginBottom: "2rem" }}>
          <SectionHeading>Schedule</SectionHeading>
          {rounds.map(([round, roundMatches]) => (
            <RoundCard
              key={round}
              round={round}
              matches={roundMatches}
              totalRounds={rounds.length}
              onEnterResult={(m) => setResultMatch(m)}
              isCurrentRound={currentMatch ? currentMatch.round_number === round : false}
            />
          ))}
        </section>

        {/* ── Result entry modal ── */}
        {resultMatch && (
          <ResultPanel
            match={resultMatch}
            submitting={submitting}
            onSelect={(winner) => submitResult(resultMatch.id, winner)}
            onCancel={() => setResultMatch(null)}
          />
        )}

        {errMsg && (
          <div style={styles.alertBg}>
            <span style={styles.alertText}>{errMsg}</span>
            <button style={styles.alertDismiss} onClick={() => setErrMsg(null)}>
              ×
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: P.black,
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Nav bar */}
      <nav
        style={{
          background: P.black,
          borderBottom: `3px solid ${P.red}`,
          padding: "0 1rem",
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a
          href="/site.html"
          style={{
            color: P.white,
            fontWeight: 800,
            fontSize: 14,
            textDecoration: "none",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ background: P.red, padding: "2px 8px", marginRight: 8 }}>E</span>
          Tournament
        </a>
        <a href="/sign-up" style={{ color: P.white, fontSize: 13, textDecoration: "none", opacity: 0.7 }}>
          Sign up
        </a>
      </nav>

      <div style={{ background: P.white, minHeight: "calc(100vh - 51px)" }}>{children}</div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: 0,
        padding: "0.5rem 0",
        fontSize: "0.85rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        color: P.mid,
        borderBottom: `2px solid ${P.black}`,
      }}
    >
      {children}
    </h2>
  );
}

function CurrentMatchCard({
  match,
  onEnterResult,
}: {
  match: MatchRow;
  onEnterResult: (m: MatchRow) => void;
}) {
  return (
    <div
      style={{
        background: P.red,
        borderRadius: 10,
        padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
        color: "#fff",
        boxShadow: "0 4px 16px rgba(212,43,43,0.35)",
      }}
    >
      <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, opacity: 0.8 }}>
        Now playing — Round {match.round_number}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <div>
          <PlayerName name={match.player_a} school={match.school_a} light />
          <span style={{ margin: "0 0.75rem", fontWeight: 800, fontSize: "1.1rem", opacity: 0.7 }}>vs</span>
          <PlayerName name={match.player_b} school={match.school_b} light />
        </div>
        <button
          onClick={() => onEnterResult(match)}
          style={{
            background: "#fff",
            color: P.red,
            border: 0,
            borderRadius: 6,
            padding: "0.55rem 1.1rem",
            fontWeight: 700,
            fontSize: "0.85rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Enter result
        </button>
      </div>
    </div>
  );
}

function PlayerName({
  name,
  school,
  light,
}: {
  name: string | null;
  school: string | null;
  light?: boolean;
}) {
  return (
    <span style={{ fontWeight: 700, fontSize: "1rem", color: light ? "#fff" : P.black }}>
      {name ?? "?"}
      {school && (
        <span
          style={{
            fontWeight: 400,
            fontSize: "0.75rem",
            opacity: light ? 0.7 : 0.55,
            marginLeft: 4,
          }}
        >
          ({school.replace(" College", "").replace(" High School", "")})
        </span>
      )}
    </span>
  );
}

function RoundCard({
  round,
  matches,
  totalRounds,
  onEnterResult,
  isCurrentRound,
}: {
  round: number;
  matches: MatchRow[];
  totalRounds: number;
  onEnterResult: (m: MatchRow) => void;
  isCurrentRound: boolean;
}) {
  // Determine if any match in this round is still scheduled
  const hasLiveMatch = matches.some((m) => m.status === "scheduled");

  return (
    <div
      style={{
        background: P.cardBg,
        border: `1px solid ${isCurrentRound ? P.red : P.border}`,
        borderLeft: `4px solid ${isCurrentRound ? P.red : "transparent"}`,
        borderRadius: 8,
        marginTop: "0.5rem",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "0.6rem 1rem",
          background: "#fafafa",
          borderBottom: `1px solid ${P.border}`,
          fontSize: "0.8rem",
          fontWeight: 700,
          color: P.mid,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Round {round} of {totalRounds}</span>
        {hasLiveMatch && (
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: P.red,
              animation: "pulse 1.5s infinite",
            }}
          />
        )}
      </div>
      {matches.map((m) => (
        <MatchRow
          key={m.id}
          match={m}
          onEnterResult={onEnterResult}
        />
      ))}
    </div>
  );
}

function MatchRow({
  match,
  onEnterResult,
}: {
  match: MatchRow;
  onEnterResult: (m: MatchRow) => void;
}) {
  const isComplete = match.status === "complete";
  const isScheduled = match.status === "scheduled" || !match.status;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.7rem 1rem",
        borderBottom: `1px solid ${P.border}`,
        gap: "0.5rem",
        flexWrap: "wrap",
        background: isScheduled ? "#fffbe6" : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              ...playerChip,
              fontWeight: isComplete && match.winner === match.player_a ? 800 : 400,
              background: isComplete && match.winner === match.player_a ? "#e8f5e9" : "transparent",
              color: isComplete && match.winner === match.player_a ? P.green : P.black,
            }}
          >
            <PlayerName name={match.player_a} school={match.school_a} />
          </span>
          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: P.mid }}>vs</span>
          <span
            style={{
              ...playerChip,
              fontWeight: isComplete && match.winner === match.player_b ? 800 : 400,
              background: isComplete && match.winner === match.player_b ? "#e8f5e9" : "transparent",
              color: isComplete && match.winner === match.player_b ? P.green : P.black,
            }}
          >
            <PlayerName name={match.player_b} school={match.school_b} />
          </span>
        </div>
        {isComplete && match.winner && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: P.green,
              whiteSpace: "nowrap",
            }}
          >
            ✓ {match.winner} won
          </span>
        )}
        {isScheduled && (
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "#b8860b",
              whiteSpace: "nowrap",
            }}
          >
            ⏳ Upcoming
          </span>
        )}
      </div>

      {isScheduled && (
        <button
          onClick={() => onEnterResult(match)}
          style={{
            background: P.blue,
            color: "#fff",
            border: 0,
            borderRadius: 5,
            padding: "0.4rem 0.8rem",
            fontWeight: 600,
            fontSize: "0.75rem",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Enter result
        </button>
      )}
    </div>
  );
}

const playerChip: React.CSSProperties = {
  padding: "0.15rem 0.3rem",
  borderRadius: 4,
  display: "inline-block",
};

function StandingsTable({ rows }: { rows: StandingsRow[] }) {
  const isTop = (rank: number) => rank <= 3;
  const medal = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return "";
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr>
            {["#", "Player", "School", "Pld", "W", "L", "Pts"].map((h) => (
              <th
                key={h}
                style={{
                  ...thStyle,
                  textAlign: h === "#" || h === "Pld" || h === "W" || h === "L" || h === "Pts" ? "center" : "left",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.player}
              style={{
                background: isTop(r.rank) ? "#fffbe6" : "transparent",
                borderBottom: `1px solid ${P.border}`,
              }}
            >
              <td style={{ ...tdStyle, textAlign: "center", fontWeight: 700, fontSize: "1.1rem" }}>
                {medal(r.rank) || r.rank}
              </td>
              <td style={{ ...tdStyle, fontWeight: 600 }}>{r.player}</td>
              <td style={{ ...tdStyle, color: P.mid, fontSize: 13 }}>
                {r.school.replace(" College", "").replace(" High School", "")}
              </td>
              <td style={{ ...tdStyle, textAlign: "center" }}>{r.played}</td>
              <td style={{ ...tdStyle, textAlign: "center", color: P.green, fontWeight: 600 }}>
                {r.won}
              </td>
              <td style={{ ...tdStyle, textAlign: "center", color: P.red }}>
                {r.lost}
              </td>
              <td style={{ ...tdStyle, textAlign: "center", fontWeight: 800, fontSize: "1.1rem" }}>
                {r.points}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", color: P.mid, padding: "2rem 0.5rem" }}>
                No completed matches yet. Enter results to see standings.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Result panel overlay ───────────────────────────────────────────────

function ResultPanel({
  match,
  submitting,
  onSelect,
  onCancel,
}: {
  match: MatchRow;
  submitting: boolean;
  onSelect: (winner: string) => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: P.cardBg,
          borderRadius: 14,
          padding: "2rem 1.75rem",
          maxWidth: 380,
          width: "100%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: P.mid, marginBottom: "0.75rem" }}>
          Enter result — Round {match.round_number}
        </div>

        <div style={{ textAlign: "center", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, fontSize: "1.15rem" }}>{match.player_a}</div>
          <div style={{ fontSize: "0.8rem", color: P.mid }}>{match.school_a}</div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: P.mid, margin: "0.5rem 0" }}>vs</div>
          <div style={{ fontWeight: 700, fontSize: "1.15rem" }}>{match.player_b}</div>
          <div style={{ fontSize: "0.8rem", color: P.mid }}>{match.school_b}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <button
            onClick={() => onSelect(match.player_a ?? "")}
            disabled={submitting || !match.player_a}
            style={resultBtn(P.red)}
          >
            {submitting ? "Saving…" : `${match.player_a ?? "?"} won`}
          </button>
          <button
            onClick={() => onSelect(match.player_b ?? "")}
            disabled={submitting || !match.player_b}
            style={resultBtn(P.blue)}
          >
            {submitting ? "Saving…" : `${match.player_b ?? "?"} won`}
          </button>
          <button
            onClick={onCancel}
            disabled={submitting}
            style={{
              ...resultBtn(P.mid),
              background: "#e5e5e5",
              color: P.black,
              marginTop: "0.25rem",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function resultBtn(color: string): React.CSSProperties {
  return {
    background: color,
    color: "#fff",
    border: 0,
    borderRadius: 8,
    padding: "0.8rem 1rem",
    fontWeight: 700,
    fontSize: "0.95rem",
    cursor: "pointer",
    transition: "opacity 0.15s",
    width: "100%",
  };
}

// ─── Shared styles ──────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "0.55rem 0.5rem",
  borderBottom: `2px solid ${P.black}`,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: P.mid,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.55rem 0.5rem",
  whiteSpace: "nowrap",
};

const styles: Record<string, React.CSSProperties> = {
  alertBg: {
    position: "fixed",
    bottom: "1.5rem",
    left: "50%",
    transform: "translateX(-50%)",
    background: P.redDk,
    color: "#fff",
    padding: "0.75rem 1.25rem",
    borderRadius: 8,
    fontSize: "0.85rem",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    zIndex: 1001,
    maxWidth: "90vw",
    boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
  },
  alertText: {
    flex: 1,
  },
  alertDismiss: {
    background: "none",
    border: 0,
    color: "#fff",
    fontSize: "1.25rem",
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
    opacity: 0.7,
  },
};
