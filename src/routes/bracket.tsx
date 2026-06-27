import { createFileRoute, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "./-components/open-day/NavBar";
import { COLORS } from "./-components/open-day/styles";

export const Route = createFileRoute("/bracket")({
  head: () => ({ meta: [{ title: "Bracket — VR Smash Connect Open Day" }] }),
  component: BracketLayout,
});

function BracketLayout() {
  const matchRoute = useMatchRoute();
  // Check if we're at the exact /bracket (not a child like /bracket/$school)
  const isOpenDay = matchRoute({ to: "/bracket", fuzzy: false });

  if (isOpenDay) {
    return <BracketPage />;
  }

  // Child route (e.g. /bracket/{school}) — just render the child with nav
  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <Outlet />
    </div>
  );
}

interface BracketMatch {
  id: string;
  player_1: string;
  player_2: string;
  round: number;
  status: string;
  winner: string | null;
}

const TOURNAMENT = "open-day";

function BracketPage() {
  const [matches, setMatches] = useState<BracketMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [canGenerate, setCanGenerate] = useState(false);

  // Admin state
  const [signups, setSignups] = useState<{ id: string; student_name: string }[]>([]);
  const [signupsLoading, setSignupsLoading] = useState(true);
  const [showRemoveAllConfirm, setShowRemoveAllConfirm] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);
  const [removingPlayerId, setRemovingPlayerId] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    const { data } = await supabase
      .from("match_results")
      .select("id, player_1, player_2, round, status, winner")
      .eq("tournament_id", TOURNAMENT)
      .order("round", { ascending: true });
    if (data) {
      setMatches(data as BracketMatch[]);
      if (data.length === 0) setCanGenerate(true);
    }
    setLoading(false);
  }, []);

  const fetchSignups = useCallback(async () => {
    const { data } = await supabase
      .from("playoff_signups")
      .select("id, student_name")
      .eq("tournament_id", TOURNAMENT);
    if (data) {
      setSignups(data as { id: string; student_name: string }[]);
    }
    setSignupsLoading(false);
  }, []);

  // Initial fetch + realtime subscription
  useEffect(() => {
    fetchMatches();
    fetchSignups();

    const matchSub = supabase
      .channel("bracket-realtime")
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

    const signupSub = supabase
      .channel("bracket-signups-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "playoff_signups", filter: `tournament_id=eq.${TOURNAMENT}` },
        () => fetchSignups(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(matchSub);
      supabase.removeChannel(signupSub);
    };
  }, [fetchMatches, fetchSignups]);

  // ─── Admin handlers ────────────────────────────────────────────────

  const handleRemoveAll = async () => {
    setAdminBusy(true);
    try {
      await supabase.from("playoff_signups").delete().eq("tournament_id", TOURNAMENT);
      await supabase.from("match_results").delete().eq("tournament_id", TOURNAMENT);
      setAdminMsg("All players removed. Go to Sign Up to add new players.");
      setShowRemoveAllConfirm(false);
      setCanGenerate(true);
      await Promise.all([fetchMatches(), fetchSignups()]);
    } catch {
      setAdminMsg("Failed to remove players.");
    } finally {
      setAdminBusy(false);
    }
  };

  const handleRegenFromSignups = async () => {
    setAdminBusy(true);
    try {
      // Clear existing matches first
      await supabase.from("match_results").delete().eq("tournament_id", TOURNAMENT);
      // Fetch fresh signup list
      const { data: fresh } = await supabase
        .from("playoff_signups")
        .select("student_name")
        .eq("tournament_id", TOURNAMENT);

      if (!fresh || fresh.length < 2) {
        setAdminMsg("Need at least 2 players to regenerate.");
        setShowRegenConfirm(false);
        setAdminBusy(false);
        return;
      }

      const players = fresh.map((s) => s.student_name);
      const numPlayers = players.length;
      const isOdd = numPlayers % 2 !== 0;
      const totalSlots = isOdd ? numPlayers + 1 : numPlayers;
      const rounds = numPlayers - 1;
      const matchesPerRound = Math.floor(totalSlots / 2);

      const rotation = [...players];
      if (isOdd) rotation.push("__BYE__");

      const insertData: Array<Record<string, unknown>> = [];

      for (let r = 0; r < rounds; r++) {
        for (let m = 0; m < matchesPerRound; m++) {
          const i = m;
          const j = totalSlots - 1 - m;
          const p1 = rotation[i];
          const p2 = rotation[j];
          if (p1 === "__BYE__" || p2 === "__BYE__") continue;
          insertData.push({
            player_1: p1,
            player_2: p2,
            round: r + 1,
            status: "scheduled",
            tournament_id: TOURNAMENT,
          });
        }
        const last = rotation.pop()!;
        rotation.splice(1, 0, last);
      }

      const { error: insertErr } = await supabase.from("match_results").insert(insertData as never);
      if (insertErr) throw insertErr;

      setAdminMsg(`Bracket regenerated — ${insertData.length} matches, ${rounds} rounds.`);
      setShowRegenConfirm(false);
      setCanGenerate(false);
      await fetchMatches();
    } catch {
      setAdminMsg("Failed to regenerate bracket.");
    } finally {
      setAdminBusy(false);
    }
  };

  const handleRemovePlayer = async (id: string, name: string) => {
    setRemovingPlayerId(id);
    try {
      await supabase.from("playoff_signups").delete().eq("id", id);
      // If bracket exists, clear it
      if (matches.length > 0) {
        await supabase.from("match_results").delete().eq("tournament_id", TOURNAMENT);
      }
      setAdminMsg(`Removed ${name}. Bracket cleared — regenerate when ready.`);
      setCanGenerate(true);
      await Promise.all([fetchMatches(), fetchSignups()]);
    } catch {
      setAdminMsg(`Failed to remove ${name}.`);
    } finally {
      setRemovingPlayerId(null);
    }
  };

  // Generate bracket
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // 1. Fetch all pending signups
      const { data: signups, error: signupErr } = await supabase
        .from("playoff_signups")
        .select("student_name")
        .eq("tournament_id", TOURNAMENT)
        .eq("status", "pending");

      if (signupErr) throw signupErr;
      if (!signups || signups.length < 2) {
        alert("Need at least 2 players to generate a bracket.");
        setGenerating(false);
        return;
      }

      const players = signups.map((s) => s.student_name);

      // 2. Generate round robin pairs using circle method
      const numPlayers = players.length;
      const isOdd = numPlayers % 2 !== 0;
      const totalSlots = isOdd ? numPlayers + 1 : numPlayers;
      const rounds = numPlayers - 1;
      const matchesPerRound = Math.floor(totalSlots / 2);

      // Copy and set up the rotation: fix first player, rotate the rest
      const rotation = [...players];
      if (isOdd) rotation.push("__BYE__");

      const insertData: Array<Record<string, unknown>> = [];

      for (let r = 0; r < rounds; r++) {
        for (let m = 0; m < matchesPerRound; m++) {
          const i = m;
          const j = totalSlots - 1 - m;
          const p1 = rotation[i];
          const p2 = rotation[j];
          if (p1 === "__BYE__" || p2 === "__BYE__") continue;
          insertData.push({
            player_1: p1,
            player_2: p2,
            round: r + 1,
            status: "scheduled",
            tournament_id: TOURNAMENT,
          });
        }
        // Rotate: keep first element fixed, rotate rest clockwise
        const last = rotation.pop()!;
        rotation.splice(1, 0, last);
      }

      // 3. Insert all matches
      const { error: insertErr } = await supabase.from("match_results").insert(insertData as never);
      if (insertErr) throw insertErr;

      setCanGenerate(false);
      await fetchMatches();
    } catch (err: any) {
      alert(err?.message ?? "Failed to generate bracket");
    } finally {
      setGenerating(false);
    }
  };

  // Group matches by round
  const byRound: Record<number, BracketMatch[]> = {};
  for (const m of matches) {
    const r = m.round || 1;
    if (!byRound[r]) byRound[r] = [];
    byRound[r].push(m);
  }
  const roundKeys = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => a - b);

  // Find first scheduled match
  const firstScheduledMatch = matches.find((m) => m.status === "scheduled");

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "system-ui, sans-serif" }}>
      <NavBar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 0.25rem" }}>
          Tournament Bracket
        </h1>
        <p style={{ fontSize: "0.85rem", color: COLORS.textMuted, margin: "0 0 1.5rem" }}>
          VR Smash Connect — Open Day
        </p>

        {/* Generate button */}
        {canGenerate && (
          <div
            style={{
              background: COLORS.surface,
              borderRadius: 12,
              padding: "1.5rem",
              marginBottom: "1.5rem",
              border: `1px solid ${COLORS.border}`,
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "0.9rem", color: COLORS.textMuted, margin: "0 0 1rem" }}>
              No bracket generated yet. Ready to set up the tournament?
            </p>
            <button
              disabled={generating}
              onClick={handleGenerate}
              style={{
                padding: "0.75rem 2rem",
                background: COLORS.red,
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: "1rem",
                fontWeight: 700,
                cursor: generating ? "not-allowed" : "pointer",
                opacity: generating ? 0.5 : 1,
              }}
            >
              {generating ? "Generating…" : "Generate bracket"}
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: "center", padding: "3rem", color: COLORS.textMuted }}>
            Loading bracket…
          </div>
        )}

        {/* Empty state */}
        {!loading && matches.length === 0 && !canGenerate && (
          <div style={{ textAlign: "center", padding: "3rem", color: COLORS.textMuted, fontSize: "0.9rem" }}>
            No matches yet. The bracket will appear here once generated.
          </div>
        )}

        {/* Now playing highlight */}
        {firstScheduledMatch && (
          <div
            style={{
              background: COLORS.surface,
              borderRadius: 12,
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              border: `2px solid ${COLORS.red}`,
              animation: "pulse-border 2s infinite",
              boxShadow: `0 0 12px ${COLORS.red}44`,
            }}
          >
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: COLORS.red, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.25rem" }}>
              ▶ Now playing
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 600 }}>
              {firstScheduledMatch.player_1} vs {firstScheduledMatch.player_2}
            </div>
            <div style={{ fontSize: "0.8rem", color: COLORS.textMuted, marginTop: "0.15rem" }}>
              Round {firstScheduledMatch.round}
            </div>
          </div>
        )}

        {/* Rounds */}
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
                <div
                  key={match.id}
                  style={{
                    background: COLORS.surface,
                    borderRadius: 8,
                    padding: "0.85rem 1rem",
                    border: `1px solid ${COLORS.border}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: match.winner === match.player_1 ? 700 : 400,
                        color: match.winner === match.player_1 ? COLORS.red : match.status === "complete" ? `${COLORS.text}66` : COLORS.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {match.player_1}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: COLORS.textMuted }}>vs</span>
                    <span
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: match.winner === match.player_2 ? 700 : 400,
                        color: match.winner === match.player_2 ? COLORS.red : match.status === "complete" ? `${COLORS.text}66` : COLORS.text,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {match.player_2}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.5rem",
                      borderRadius: 4,
                      whiteSpace: "nowrap",
                      background: match.status === "complete" ? `${COLORS.green}22` : `${COLORS.amber}22`,
                      color: match.status === "complete" ? COLORS.green : COLORS.amber,
                    }}
                  >
                    {match.status === "complete" ? `Winner: ${match.winner}` : "Scheduled"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ─── Admin Section ──────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: "2.5rem",
            paddingTop: "1.5rem",
            borderTop: `1px solid #2a2a2a`,
          }}
        >
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#555", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "1rem" }}>
            Admin
          </div>

          {/* Admin message */}
          {adminMsg && (
            <div
              style={{
                fontSize: "0.85rem",
                padding: "0.6rem 0.85rem",
                borderRadius: 8,
                marginBottom: "1rem",
                background: "#2a2a2a",
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {adminMsg}
              <button
                onClick={() => setAdminMsg(null)}
                style={{
                  marginLeft: "0.75rem",
                  background: "none",
                  border: "none",
                  color: COLORS.textMuted,
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  textDecoration: "underline",
                  padding: 0,
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Signed-up players list */}
          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 600, color: COLORS.textMuted, margin: "0 0 0.6rem" }}>
              Players signed up ({signups.length})
            </h3>
            {signupsLoading ? (
              <div style={{ fontSize: "0.8rem", color: COLORS.textMuted }}>Loading players…</div>
            ) : signups.length === 0 ? (
              <div style={{ fontSize: "0.8rem", color: COLORS.textMuted }}>
                No players signed up yet. Go to Sign Up to add players.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {signups.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: COLORS.surface,
                      borderRadius: 6,
                      padding: "0.45rem 0.75rem",
                      fontSize: "0.85rem",
                    }}
                  >
                    <span>{p.student_name}</span>
                    <button
                      disabled={removingPlayerId === p.id}
                      onClick={() => handleRemovePlayer(p.id, p.student_name)}
                      style={{
                        background: "none",
                        border: "none",
                        color: COLORS.red,
                        fontSize: "0.75rem",
                        cursor: removingPlayerId === p.id ? "not-allowed" : "pointer",
                        opacity: removingPlayerId === p.id ? 0.4 : 1,
                        padding: "0.2rem 0.4rem",
                      }}
                    >
                      {removingPlayerId === p.id ? "Removing…" : "✕ Remove"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Admin action buttons */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* Remove all players */}
            {!showRemoveAllConfirm ? (
              <button
                disabled={adminBusy}
                onClick={() => setShowRemoveAllConfirm(true)}
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.8rem",
                  background: "#2a2a2a",
                  color: COLORS.text,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 6,
                  cursor: adminBusy ? "not-allowed" : "pointer",
                  opacity: adminBusy ? 0.4 : 1,
                }}
              >
                Remove all players
              </button>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                <span style={{ color: COLORS.textMuted }}>Are you sure?</span>
                <button
                  disabled={adminBusy}
                  onClick={handleRemoveAll}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.8rem",
                    background: COLORS.red,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: adminBusy ? "not-allowed" : "pointer",
                    opacity: adminBusy ? 0.4 : 1,
                  }}
                >
                  {adminBusy ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  disabled={adminBusy}
                  onClick={() => setShowRemoveAllConfirm(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: COLORS.textMuted,
                    cursor: adminBusy ? "not-allowed" : "pointer",
                    fontSize: "0.8rem",
                    textDecoration: "underline",
                    padding: "0.25rem",
                  }}
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Regenerate bracket — only when signups exist but no matches */}
            {canGenerate && signups.length >= 2 && (
              !showRegenConfirm ? (
                <button
                  disabled={adminBusy}
                  onClick={() => setShowRegenConfirm(true)}
                  style={{
                    padding: "0.5rem 1rem",
                    fontSize: "0.8rem",
                    background: COLORS.blue,
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: adminBusy ? "not-allowed" : "pointer",
                    opacity: adminBusy ? 0.4 : 1,
                  }}
                >
                  Regenerate bracket
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                  <span style={{ color: COLORS.textMuted }}>Regenerate from current signups?</span>
                  <button
                    disabled={adminBusy}
                    onClick={handleRegenFromSignups}
                    style={{
                      padding: "0.5rem 1rem",
                      fontSize: "0.8rem",
                      background: COLORS.red,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: adminBusy ? "not-allowed" : "pointer",
                      opacity: adminBusy ? 0.4 : 1,
                    }}
                  >
                    {adminBusy ? "Regenerating…" : "Yes, regenerate"}
                  </button>
                  <button
                    disabled={adminBusy}
                    onClick={() => setShowRegenConfirm(false)}
                    style={{
                      background: "none",
                      border: "none",
                      color: COLORS.textMuted,
                      cursor: adminBusy ? "not-allowed" : "pointer",
                      fontSize: "0.8rem",
                      textDecoration: "underline",
                      padding: "0.25rem",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )
            )}
          </div>
        </div>

        {/* Pulse animation keyframes injected via style tag */}
        <style>{`
          @keyframes pulse-border {
            0%, 100% { border-color: ${COLORS.red}; box-shadow: 0 0 8px ${COLORS.red}33; }
            50% { border-color: ${COLORS.red}88; box-shadow: 0 0 16px ${COLORS.red}66; }
          }
        `}</style>
      </div>
    </div>
  );
}
