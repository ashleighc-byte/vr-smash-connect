import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  SCHEDULE,
  SCHOOLS,
  type MatchResult,
  type School,
  type ScheduledMatch,
  type TournamentRoster,
} from "@/lib/tournament";

export const Route = createFileRoute("/admin/scores")({
  head: () => ({
    meta: [
      { title: "Admin — Match Scores" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminScoresPage,
});

const BLACK = "#1a1a1a";
const RED = "#d42b2b";
const BG = "#f5f5f5";
const BORDER = "#ddd";

function usePasswordGate() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("check-admin-password", {
        body: { password },
      });
      if (fnError || !data?.ok) {
        setError("Invalid password");
        return;
      }
      setUnlocked(true);
    } catch {
      setError("Invalid password");
    } finally {
      setLoading(false);
    }
  }

  return { password, setPassword, unlocked, setUnlocked, error, loading, unlock };
}

async function fetchRosters(): Promise<TournamentRoster[]> {
  const { data, error } = await supabase.from("tournament_rosters").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as TournamentRoster[]) ?? [];
}

async function fetchResults(): Promise<MatchResult[]> {
  const { data, error } = await supabase.from("match_results").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as MatchResult[]) ?? [];
}

async function upsertResult(result: Partial<MatchResult> & { id?: string }) {
  const { error } = await supabase.from("match_results").upsert(result as unknown as Record<string, unknown>);
  if (error) throw error;
}

function getPlayersForSchool(rosters: TournamentRoster[], school: School) {
  return rosters.filter((r) => r.school === school).map((r) => r.student_name);
}

function calculateResult(
  g1a: number,
  g1b: number,
  g2a: number,
  g2b: number,
  g3a: number | null,
  g3b: number | null,
  walkover: boolean
) {
  if (walkover) {
    return { gamesWonA: 0, gamesWonB: 0, pointsA: 0, pointsB: 0 };
  }
  let gwA = 0;
  let gwB = 0;
  if (g1a > g1b) gwA++; else gwB++;
  if (g2a > g2b) gwA++; else gwB++;
  if (gwA === 1 && gwB === 1) {
    if (g3a != null && g3b != null) {
      if (g3a > g3b) gwA++; else gwB++;
    }
  }
  const winner = gwA > gwB ? "A" : "B";
  let pointsA = 0;
  let pointsB = 0;
  if (winner === "A") {
    pointsA = gwA === 2 && gwB === 0 ? 3 : 2;
    pointsB = gwB;
  } else {
    pointsB = gwB === 2 && gwA === 0 ? 3 : 2;
    pointsA = gwA;
  }
  return { gamesWonA: gwA, gamesWonB: gwB, pointsA, pointsB };
}

function AdminScoresPage() {
  const { password, setPassword, unlocked, error, loading, unlock } = usePasswordGate();
  const queryClient = useQueryClient();

  const { data: rosters } = useQuery({ queryKey: ["tournament_rosters"], queryFn: fetchRosters, enabled: unlocked });
  const { data: results } = useQuery({ queryKey: ["match_results"], queryFn: fetchResults, enabled: unlocked });

  const [selectedMatchLabel, setSelectedMatchLabel] = useState<string>(SCHEDULE[0].label);
  const [walkover, setWalkover] = useState(false);
  const [walkoverWinner, setWalkoverWinner] = useState<"A" | "B" | null>(null);
  const [playerA, setPlayerA] = useState("");
  const [playerB, setPlayerB] = useState("");
  const [g1a, setG1a] = useState<number | "">("");
  const [g1b, setG1b] = useState<number | "">("");
  const [g2a, setG2a] = useState<number | "">("");
  const [g2b, setG2b] = useState<number | "">("");
  const [g3a, setG3a] = useState<number | "">("");
  const [g3b, setG3b] = useState<number | "">("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const match = useMemo(() => SCHEDULE.find((m) => m.label === selectedMatchLabel) ?? SCHEDULE[0], [selectedMatchLabel]);

  const schoolAPlayers = useMemo(() => (rosters ? getPlayersForSchool(rosters, match.schoolA as School) : []), [rosters, match]);
  const schoolBPlayers = useMemo(() => (rosters ? getPlayersForSchool(rosters, match.schoolB as School) : []), [rosters, match]);

  const game1Split = g1a !== "" && g1b !== "" ? (Number(g1a) > Number(g1b) ? "A" : "B") : null;
  const game2Split = g2a !== "" && g2b !== "" ? (Number(g2a) > Number(g2b) ? "A" : "B") : null;
  const needGame3 = game1Split && game2Split && game1Split !== game2Split;

  const existingResult = useMemo(() => {
    if (!results) return undefined;
    return results.find((r) => r.match_day === match.day && r.school_a === match.schoolA && r.school_b === match.schoolB);
  }, [results, match]);

  function resetForm() {
    setWalkover(false);
    setWalkoverWinner(null);
    setPlayerA("");
    setPlayerB("");
    setG1a("");
    setG1b("");
    setG2a("");
    setG2b("");
    setG3a("");
    setG3b("");
    setEditingId(null);
  }

  function loadExisting(r: MatchResult) {
    setWalkover(r.walkover);
    setWalkoverWinner(r.walkover ? (r.points_a > r.points_b ? "A" : "B") : null);
    setPlayerA(r.player_a);
    setPlayerB(r.player_b);
    setG1a(r.game1_a);
    setG1b(r.game1_b);
    setG2a(r.game2_a);
    setG2b(r.game2_b);
    setG3a(r.game3_a ?? "");
    setG3b(r.game3_b ?? "");
    setEditingId(r.id);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const computed = calculateResult(
        Number(g1a),
        Number(g1b),
        Number(g2a),
        Number(g2b),
        g3a === "" ? null : Number(g3a),
        g3b === "" ? null : Number(g3b),
        walkover
      );
      const payload: Partial<MatchResult> & { id?: string } = {
        id: editingId ?? undefined,
        match_day: match.day,
        school_a: match.schoolA as School,
        school_b: match.schoolB as School,
        player_a: playerA,
        player_b: playerB,
        game1_a: Number(g1a),
        game1_b: Number(g1b),
        game2_a: Number(g2a),
        game2_b: Number(g2b),
        game3_a: g3a === "" ? null : Number(g3a),
        game3_b: g3b === "" ? null : Number(g3b),
        games_won_a: computed.gamesWonA,
        games_won_b: computed.gamesWonB,
        points_a: walkover ? (walkoverWinner === "A" ? 1 : 0) : computed.pointsA,
        points_b: walkover ? (walkoverWinner === "B" ? 1 : 0) : computed.pointsB,
        walkover,
      };
      await upsertResult(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match_results"] });
      resetForm();
    },
  });

  if (!unlocked) {
    return (
      <div style={{ minHeight: "100vh", background: BG, color: BLACK, fontFamily: "system-ui, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <form onSubmit={unlock} style={{ background: "#fff", padding: "2rem", borderRadius: 6, maxWidth: 380, width: "100%", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", borderTop: `3px solid ${RED}` }}>
          <h1 style={{ margin: 0, marginBottom: "0.5rem", fontSize: "1.25rem" }}>Admin access</h1>
          <p style={{ margin: 0, marginBottom: "1rem", color: "#555", fontSize: 14 }}>Match Score Entry</p>
          <label htmlFor="pw" style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Password</label>
          <input id="pw" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 15 }} />
          {error && <p style={{ color: RED, fontSize: 13, marginTop: 8 }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ marginTop: "1rem", width: "100%", padding: "0.7rem", background: RED, color: "#fff", border: 0, borderRadius: 4, fontWeight: 700, cursor: "pointer", fontSize: 15 }}>
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG, color: BLACK, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ background: BLACK, color: "#f5f5f5", padding: "1rem 1.5rem", borderBottom: `3px solid ${RED}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase", fontSize: 14 }}>
          <span style={{ background: RED, padding: "2px 8px", marginRight: 8, fontWeight: 900 }}>E</span>
          Match Scores — Admin
        </div>
        <a href="/admin" style={{ color: "#ccc", fontSize: 13, textDecoration: "none" }}>← Back to admin</a>
      </header>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.25rem" }}>
        <section style={{ background: "#fff", borderRadius: 6, padding: "1.25rem 1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "1.5rem" }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Select Match</label>
          <select
            value={selectedMatchLabel}
            onChange={(e) => {
              setSelectedMatchLabel(e.target.value);
              resetForm();
            }}
            style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 15 }}
          >
            {SCHEDULE.map((m) => (
              <option key={m.label} value={m.label}>
                {m.day} — {m.label}
              </option>
            ))}
          </select>
        </section>

        {existingResult && !editingId && (
          <div style={{ background: "#fff3cd", border: "1px solid #ffeeba", borderRadius: 6, padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14 }}>
              Result already recorded for this match. {existingResult.walkover ? "(Walkover)" : `${existingResult.game1_a}-${existingResult.game1_b}, ${existingResult.game2_a}-${existingResult.game2_b}`}
            </span>
            <button
              onClick={() => loadExisting(existingResult)}
              style={{ background: BLACK, color: "#fff", border: 0, padding: "0.4rem 0.85rem", borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Edit
            </button>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <div style={{ background: "#fff", borderRadius: 6, padding: "1.25rem 1.5rem", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", marginBottom: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{match.schoolA} Player</label>
                <select required value={playerA} onChange={(e) => setPlayerA(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 15 }}>
                  <option value="">Select player…</option>
                  {schoolAPlayers.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{match.schoolB} Player</label>
                <select required value={playerB} onChange={(e) => setPlayerB(e.target.value)} style={{ width: "100%", padding: "0.6rem 0.75rem", border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 15 }}>
                  <option value="">Select player…</option>
                  {schoolBPlayers.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
                <input type="checkbox" checked={walkover} onChange={() => setWalkover((w) => !w)} />
                Walkover
              </label>
              {walkover && (
                <div style={{ marginTop: "0.5rem" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, marginRight: 12 }}>Winner:</span>
                  <label style={{ marginRight: 12, fontSize: 13, cursor: "pointer" }}>
                    <input type="radio" name="walkoverWinner" value="A" checked={walkoverWinner === "A"} onChange={() => setWalkoverWinner("A")} /> {match.schoolA}
                  </label>
                  <label style={{ fontSize: 13, cursor: "pointer" }}>
                    <input type="radio" name="walkoverWinner" value="B" checked={walkoverWinner === "B"} onChange={() => setWalkoverWinner("B")} /> {match.schoolB}
                  </label>
                </div>
              )}
            </div>

            {!walkover && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <GameRow label="Game 1" a={g1a} b={g1b} onA={setG1a} onB={setG1b} />
                <GameRow label="Game 2" a={g2a} b={g2b} onA={setG2a} onB={setG2b} />
                {needGame3 && <GameRow label="Game 3" a={g3a} b={g3b} onA={setG3a} onB={setG3b} />}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              type="submit"
              disabled={saveMutation.isPending || (walkover && !walkoverWinner)}
              style={{
                padding: "0.75rem 1.5rem",
                background: RED,
                color: "#fff",
                border: 0,
                borderRadius: 4,
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 15,
              }}
            >
              {saveMutation.isPending ? "Saving…" : editingId ? "Update Result" : "Submit Result"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#fff",
                  color: BLACK,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 4,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: 15,
                }}
              >
                Cancel
              </button>
            )}
            {saveMutation.isSuccess && <span style={{ color: "#2e7d32", fontSize: 14, fontWeight: 600 }}>Saved ✓</span>}
            {saveMutation.isError && <span style={{ color: RED, fontSize: 14, fontWeight: 600 }}>Error saving</span>}
          </div>
        </form>
      </div>
    </div>
  );
}

function GameRow({
  label,
  a,
  b,
  onA,
  onB,
}: {
  label: string;
  a: number | "";
  b: number | "";
  onA: (v: number | "") => void;
  onB: (v: number | "") => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
      <span style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", minWidth: 80 }}>{label}</span>
      <input
        type="number"
        min={0}
        value={a}
        onChange={(e) => onA(e.target.value === "" ? "" : Number(e.target.value))}
        style={{ width: 80, padding: "0.5rem 0.75rem", border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 15 }}
      />
      <span style={{ fontWeight: 700 }}>vs</span>
      <input
        type="number"
        min={0}
        value={b}
        onChange={(e) => onB(e.target.value === "" ? "" : Number(e.target.value))}
        style={{ width: 80, padding: "0.5rem 0.75rem", border: `1px solid ${BORDER}`, borderRadius: 4, fontSize: 15 }}
      />
    </div>
  );
}
