// @client-only — this component must never run on the server
import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SCHOOLS, type School, type TournamentRoster } from "@/lib/tournament";

export default function SchoolBracket() {
  return <SchoolBracketPage />;
}

// Re-export Route type for search params
import { Route } from "../school-bracket";

// ── Tokens ──
const BLACK = "#1a1a1a";
const RED = "#d42b2b";
const RED_DK = "#a81e1e";
const RED_LT = "#fdecea";
const WHITE = "#f5f5f5";
const BLUE = "#1e5fa8";
const BLUE_LT = "#e8f0fb";
const MID = "#666";
const BORDER = "#e0e0e0";
const GREEN = "#1a7a4a";
const GREEN_LT = "#e8f5ee";
const AMBER = "#b45309";
const AMBER_LT = "#fef3c7";
const R = 6;

// ── Types ──
interface Player { id: number; name: string; slot?: string; }

interface MatchState {
  p1: string | null;
  p2: string | null;
  s1: number | null;
  s2: number | null;
  g1s1: number;
  g1s2: number;
  g2s1: number;
  g2s2: number;
  g3s1: number;
  g3s2: number;
  winner: string | null;
  walkover: boolean;
  savedId?: string; // Supabase row ID if persisted
}

type BracketType = "knockout" | "groups" | "too-few";

interface RoundInfo { id: string; p1: string | null; p2: string | null; }

// ── Helpers ──
function nextPow2(n: number): number {
  let p = 1; while (p < n) p *= 2; return p;
}

function seedOrder(n: number): number[] {
  if (n === 1) return [1];
  const half = n / 2;
  const left = seedOrder(half);
  const right = left.map(s => n + 1 - s);
  const result: number[] = [];
  for (let i = 0; i < half; i++) result.push(left[i], right[i]);
  return result;
}

function chooseBracketType(n: number): BracketType {
  if (n <= 1) return "too-few";
  if (n <= 8) return "knockout";
  if (n <= 12) return "groups";
  return "knockout";
}

function countMatches(type: BracketType, n: number): number {
  if (type === "knockout") return nextPow2(n) - 1;
  if (type === "groups") {
    const half = Math.ceil(n / 2);
    const other = n - half;
    return (half * (half - 1)) / 2 + (other * (other - 1)) / 2 + 3;
  }
  return 0;
}

function groupRoundRobinCount(n: number): number {
  return (n * (n - 1)) / 2;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
}

// ── Supabase helpers ──
async function fetchRosters(): Promise<TournamentRoster[]> {
  const { data, error } = await supabase.from("tournament_rosters").select("*").order("player_slot", { ascending: true });
  if (error) throw error;
  return (data as unknown as TournamentRoster[]) ?? [];
}

async function upsertRoster(rows: { school: School; player_slot: string; student_name: string }[]) {
  if (!rows.length) return;
  const { error } = await supabase.from("tournament_rosters").upsert(rows, { onConflict: "school,player_slot" });
  if (error) throw error;
}

async function deleteRosterRows(school: School, slots: string[]) {
  for (const slot of slots) {
    await supabase.from("tournament_rosters").delete().eq("school", school).eq("player_slot", slot);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
function SchoolBracketPage() {
  const queryClient = useQueryClient();

  const { school: searchSchool, players: searchPlayers } = useSearch({ from: Route.id });

  const { data: rosters } = useQuery({ queryKey: ["tournament_rosters"], queryFn: fetchRosters });

  // ── State ──
  const [school, setSchool] = useState<School>((searchSchool as School) || "Piopio College");
  const [players, setPlayers] = useState<Player[]>([]);
  const [startDate, setStartDate] = useState("");
  const [sessionDays, setSessionDays] = useState<number[]>([3]); // Wednesday default
  const [lunchStart, setLunchStart] = useState("12:30");
  const [matches, setMatches] = useState<Record<string, MatchState>>({});
  const [savedMatchIds, setSavedMatchIds] = useState<Set<string>>(new Set()); // match IDs we've saved
  const [modalMatchId, setModalMatchId] = useState<string | null>(null);

  // Init start date to next Monday
  useEffect(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
    setStartDate(d.toISOString().split("T")[0]);
  }, []);

  // Load players from rosters when school changes
  useEffect(() => {
    if (!rosters) return;
    const schoolRosters = rosters.filter(r => r.school === school);
    const loaded: Player[] = schoolRosters
      .filter(r => r.student_name.trim())
      .map((r, i) => ({
        id: Date.now() + i + Math.random(),
        name: r.student_name,
        slot: r.player_slot,
      }));
    if (loaded.length > 0) setPlayers(loaded);
  }, [rosters, school]);

  // Pre-populate players from search params (from sign-up manager)
  useEffect(() => {
    if (searchPlayers) {
      const names = searchPlayers.split(",").filter(Boolean);
      if (names.length > 0) {
        setPlayers(names.map((name: string, i: number) => ({ id: Date.now() + i + Math.random(), name })));
      }
    }
  }, [searchPlayers]);

  // ── Player management ──
  const addPlayer = useCallback((name = "") => {
    setPlayers(prev => [...prev, { id: Date.now() + Math.random(), name }]);
  }, []);

  const removePlayer = useCallback((id: number) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  }, []);

  const updatePlayerName = useCallback((id: number, name: string) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name } : p));
  }, []);

  const resetAll = useCallback(() => {
    if (!confirm("Reset everything? This clears all players and scores.")) return;
    setPlayers([]);
    setMatches({});
    setSavedMatchIds(new Set());
  }, []);

  // ── Publish bracket state ──
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<string | null>(null);

  // ── Regenerate from sign-ups via server function ──
  const regenerateFromSignups = useCallback(async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin
        .from("playoff_signups")
        .select("student_name")
        .eq("school", school)
        .eq("status", "confirmed");
      const names = (data ?? []).map((r: any) => r.student_name).filter(Boolean);
      if (names.length < 2) { alert(`Need at least 2 confirmed players for ${school} (found ${names.length})`); return; }
      setPlayers(names.map((name: string, i: number) => ({ id: Date.now() + i + Math.random(), name })));
    } catch { alert("Network error fetching sign-ups"); }
  }, [school]);

  // ── Save rosters to Supabase ──
  const saveRosterMutation = useMutation({
    mutationFn: async () => {
      const rows: { school: School; player_slot: string; student_name: string }[] = [];
      players.forEach((p, i) => {
        if (p.name.trim()) {
          rows.push({ school, player_slot: `bracket_player_${i + 1}`, student_name: p.name.trim() });
        }
      });
      // Clear old bracket players
      const slotPrefix = `bracket_player_`;
      for (const r of rosters?.filter(r => r.school === school && r.player_slot?.startsWith(slotPrefix)) ?? []) {
        const stillExists = rows.some(row => row.student_name === r.student_name);
        if (!stillExists) {
          try { await supabase.from("tournament_rosters").delete().eq("id", r.id); } catch { /* ignore */ }
        }
      }
      await upsertRoster(rows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tournament_rosters"] });
    },
  });

  // ── Save single match result to Supabase ──
  const saveMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const mx = matches[matchId];
      if (!mx || !mx.winner) return;
      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        match_day: `School Playoffs - ${school}`,
        school_a: school,
        school_b: school,
        player_a: mx.p1 ?? "",
        player_b: mx.p2 ?? "",
        game1_a: mx.g1s1,
        game1_b: mx.g1s2,
        game2_a: mx.g2s1,
        game2_b: mx.g2s2,
        game3_a: mx.g3s1 || null,
        game3_b: mx.g3s2 || null,
        games_won_a: 0,
        games_won_b: 0,
        points_a: 0,
        points_b: 0,
        walkover: mx.walkover,
        created_at: now,
      };

      // Compute winner
      let gwA = 0, gwB = 0;
      if (!mx.walkover) {
        if (mx.g1s1 > mx.g1s2) gwA++; else if (mx.g1s2 > mx.g1s1) gwB++;
        if (mx.g2s1 > mx.g2s2) gwA++; else if (mx.g2s2 > mx.g2s1) gwB++;
        if ((gwA === 1 && gwB === 1) && (mx.g3s1 || mx.g3s2)) {
          if (mx.g3s1 > mx.g3s2) gwA++; else if (mx.g3s2 > mx.g3s1) gwB++;
        }
        payload.games_won_a = gwA;
        payload.games_won_b = gwB;
        payload.points_a = gwA > gwB ? (gwA === 2 && gwB === 0 ? 3 : 2) : 1;
        payload.points_b = gwB > gwA ? (gwB === 2 && gwA === 0 ? 3 : 2) : 1;
      } else {
        payload.points_a = mx.winner === mx.p1 ? 1 : 0;
        payload.points_b = mx.winner === mx.p2 ? 1 : 0;
      }

      if (mx.savedId) {
        payload.id = mx.savedId;
        const { error } = await supabase.from("match_results").update(payload as never).eq("id", mx.savedId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("match_results").insert(payload as never).select("id").single();
        if (error) throw error;
        setSavedMatchIds(prev => new Set(prev).add(matchId));
        // Store the saved ID
        setMatches(prev => ({
          ...prev,
          [matchId]: { ...prev[matchId], savedId: (data as unknown as Record<string, string>)?.id },
        }));
      }
    },
  });

  // ── Modal handlers ──
  const openModal = useCallback((matchId: string) => {
    setModalMatchId(matchId);
  }, []);

  const closeModal = useCallback(() => {
    setModalMatchId(null);
  }, []);

  const saveScoreFromModal = useCallback(() => {
    if (!modalMatchId) return;
    const mx = matches[modalMatchId];
    if (!mx) return;

    const woCheck = (document.getElementById("woCheck") as HTMLInputElement)?.checked ?? false;
    let w1 = 0, w2 = 0;

    if (woCheck) {
      const choice = prompt(`Walkover: who IS present?\n1: ${mx.p1}\n2: ${mx.p2}\n(Enter 1 or 2)`);
      if (choice === "1") {
        setMatches(prev => ({
          ...prev,
          [modalMatchId]: { ...prev[modalMatchId], winner: mx.p1, s1: 0, s2: 0, walkover: true },
        }));
      } else if (choice === "2") {
        setMatches(prev => ({
          ...prev,
          [modalMatchId]: { ...prev[modalMatchId], winner: mx.p2, s1: 0, s2: 0, walkover: true },
        }));
      } else {
        alert("Enter 1 or 2 to indicate which player is present.");
        return;
      }
      setModalMatchId(null);
      saveMatchMutation.mutate(modalMatchId);
      return;
    }

    const g1s1 = parseInt((document.getElementById("g1s1") as HTMLInputElement)?.value ?? "0") || 0;
    const g1s2 = parseInt((document.getElementById("g1s2") as HTMLInputElement)?.value ?? "0") || 0;
    const g2s1 = parseInt((document.getElementById("g2s1") as HTMLInputElement)?.value ?? "0") || 0;
    const g2s2 = parseInt((document.getElementById("g2s2") as HTMLInputElement)?.value ?? "0") || 0;
    const g3s1 = parseInt((document.getElementById("g3s1") as HTMLInputElement)?.value ?? "0") || 0;
    const g3s2 = parseInt((document.getElementById("g3s2") as HTMLInputElement)?.value ?? "0") || 0;

    if (g1s1 > g1s2) w1++; else if (g1s2 > g1s1) w2++;
    if (g2s1 > g2s2) w1++; else if (g2s2 > g2s1) w2++;
    if (w1 === 1 && w2 === 1) {
      if (g3s1 > g3s2) w1++; else if (g3s2 > g3s1) w2++;
    }

    if (w1 < 2 && w2 < 2) {
      alert("Match not decided yet — one player needs to win 2 games.");
      return;
    }

    const winner = w1 >= 2 ? mx.p1 : mx.p2;
    setMatches(prev => ({
      ...prev,
      [modalMatchId]: {
        ...prev[modalMatchId],
        g1s1, g1s2, g2s1, g2s2, g3s1, g3s2,
        s1: w1, s2: w2,
        winner,
        walkover: false,
      },
    }));
    setModalMatchId(null);
    saveMatchMutation.mutate(modalMatchId);
  }, [modalMatchId, matches, saveMatchMutation]);

  // Auto-advance winners through bracket
  useEffect(() => {
    setMatches(prev => {
      const next = { ...prev };
      // Find matches that feed into others by match ID pattern
      for (const [id, mx] of Object.entries(next)) {
        if (!mx.winner) continue;
        // Find which match this feeds into
        const parts = id.match(/r(\d+)m(\d+)/);
        if (!parts) continue;
        const round = parseInt(parts[1]);
        const matchIdx = parseInt(parts[2]);
        const targetRound = round + 1;
        const targetMatchIdx = Math.floor(matchIdx / 2);
        const targetId = `r${targetRound}m${targetMatchIdx}`;
        const target = next[targetId];
        if (!target) continue;
        const isLeft = matchIdx % 2 === 0;
        if (isLeft) {
          if (target.p1 !== mx.winner) {
            next[targetId] = { ...target, p1: mx.winner };
          }
        } else {
          if (target.p2 !== mx.winner) {
            next[targetId] = { ...target, p2: mx.winner };
          }
        }
      }
      return next;
    });
  }, [matches]); // careful - but react handles this

  // ── Derived state ──
  const names = players.map(p => p.name || `Player ${players.indexOf(p) + 1}`);
  const n = names.length;
  const type = chooseBracketType(n);
  const total = countMatches(type, n);
  const sessions = Math.ceil(total / 2);

  function getSessionDates(numSessions: number): Date[] {
    if (!startDate) return [];
    const days = sessionDays;
    if (!days.length) return [];
    const dates: Date[] = [];
    const d = new Date(startDate + "T12:00:00");
    while (dates.length < numSessions) {
      const dow = d.getDay();
      if (days.includes(dow)) dates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return dates;
  }

  const sessionDates = getSessionDates(sessions);

  // ── Publish bracket via supabase ──
  const publishBracket = useCallback(async () => {
    if (!confirm(`Publish this bracket for ${school}? It will be visible at /bracket/${school.toLowerCase().replace(/\s+/g, "-")}.`)) return;
    setPublishing(true);
    setPublishMsg(null);
    try {
      const bracketState = {
        school,
        players: players.map(p => p.name.trim()).filter(Boolean),
        matches: Object.fromEntries(
          Object.entries(matches).filter(([, m]) => m.p1 && m.p2)
        ),
        sessionDates: sessionDates.map(d => d.toISOString()),
        sessionDays,
        lunchStart,
        startDate,
        type,
        total,
        sessions,
        champion: (() => {
          const allIds = Object.keys(matches);
          if (!allIds.length) return null;
          const finalId = allIds.find(id => {
            const m = matches[id];
            return m && m.p1 && m.p2 && !Object.keys(matches).some(otherId => {
              if (otherId === id) return false;
              const o = matches[otherId];
              return o && (o.p1 === m.p1 || o.p2 === m.p1 || o.p1 === m.p2 || o.p2 === m.p2);
            });
          });
          return finalId ? matches[finalId]?.winner : null;
        })(),
      };

      const { error } = await supabase
        .from("published_brackets")
        .upsert({
          school,
          bracket_data: bracketState as never,
          is_live: true,
          published_at: new Date().toISOString(),
        } as never, { onConflict: "school" });
      if (error) throw error;
      setPublishMsg("\u2713 Bracket published!");
    } catch {
      setPublishMsg("Error publishing bracket");
    }
    setPublishing(false);
  }, [school, players, matches, sessionDates, sessionDays, lunchStart, startDate, type, total, sessions]);

  // ── Bracket build ──
  function buildBracket(): { rounds: RoundInfo[][]; roundNames: string[] } | null {
    if (n < 2) return null;

    if (type === "knockout") {
      const size = nextPow2(n);
      const seeded = new Array(size).fill(null);
      const order = seedOrder(size);
      order.forEach((s, i) => { seeded[i] = names[s - 1] ?? null; });

      const numRounds = Math.log2(size);
      const roundNames: string[] = [];
      for (let r = 0; r < numRounds; r++) {
        const m = size / Math.pow(2, r + 1);
        if (m === 1) roundNames.push("Grand Final");
        else if (m === 2) roundNames.push("Semi-finals");
        else if (m === 4) roundNames.push("Quarter-finals");
        else roundNames.push(`Round of ${m * 2}`);
      }

      const rounds: RoundInfo[][] = [];
      // Round 0
      const r0: RoundInfo[] = [];
      for (let i = 0; i < size; i += 2) {
        const id = `r0m${i / 2}`;
        r0.push({ id, p1: seeded[i], p2: seeded[i + 1] });
      }
      rounds.push(r0);

      // Subsequent rounds
      for (let r = 1; r < numRounds; r++) {
        const prev = rounds[r - 1];
        const rr: RoundInfo[] = [];
        for (let i = 0; i < prev.length; i += 2) {
          const id = `r${r}m${i / 2}`;
          const p1 = matches[prev[i]?.id]?.winner ?? prev[i]?.p1 ?? null;
          const p2 = matches[prev[i + 1]?.id]?.winner ?? prev[i + 1]?.p1 ?? null;
          rr.push({ id, p1, p2 });
        }
        rounds.push(rr);
      }

      // Init matches in state
      setMatches(prev => {
        const next = { ...prev };
        for (const round of rounds) {
          for (const m of round) {
            if (!next[m.id]) {
              next[m.id] = {
                p1: m.p1, p2: m.p2, s1: null, s2: null,
                g1s1: 0, g1s2: 0, g2s1: 0, g2s2: 0, g3s1: 0, g3s2: 0,
                winner: null, walkover: false,
              };
            } else {
              // Sync names
              if (m.p1 && !next[m.id].p1) next[m.id] = { ...next[m.id], p1: m.p1 };
              if (m.p2 && !next[m.id].p2) next[m.id] = { ...next[m.id], p2: m.p2 };
              // Auto-advance byes
              if (m.p2 === null && !next[m.id].winner) {
                next[m.id] = { ...next[m.id], winner: m.p1 };
              }
            }
          }
        }
        return next;
      });

      return { rounds, roundNames };
    }

    if (type === "groups") {
      // Simplified: build groups, just return knockout of top 4 placeholder
      const half = Math.ceil(n / 2);
      const shuffled = [...names].sort(() => Math.random() - 0.5);
      const groupA = shuffled.slice(0, half);
      const groupB = shuffled.slice(half);

      // Just render groups + placeholder knockout
      const seeded = ["1st A", "2nd A", "1st B", "2nd B"];
      const size = 4;
      const order = seedOrder(size);
      const arrangement = new Array(size).fill(null);
      order.forEach((s, i) => { arrangement[i] = seeded[s - 1] ?? null; });

      const roundNames = ["Semi-finals", "Grand Final"];
      const rounds: RoundInfo[][] = [];

      const r0: RoundInfo[] = [{ id: "sf1", p1: arrangement[0], p2: arrangement[1] }, { id: "sf2", p1: arrangement[2], p2: arrangement[3] }];
      rounds.push(r0);
      const r1: RoundInfo[] = [{ id: "final", p1: matches["sf1"]?.winner ?? null, p2: matches["sf2"]?.winner ?? null }];
      rounds.push(r1);

      return { rounds, roundNames };
    }

    return null;
  }

  const bracket = buildBracket();

  // ── Cleanup stale matches ──
  // (only run bracket rebuild when names change, not on every match update)
  // Actually we need to be careful about the effect loop.
  // We'll rely on the inline bracket build reading from matches state.

  // ── Schedule HTML helper ──
  function buildScheduleHTML(): string {
    if (!sessionDates.length) return "";
    const [h, m] = lunchStart.split(":").map(Number);
    const m1 = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
    const m2h = h + (m + 20 >= 60 ? 1 : 0);
    const m2m = (m + 20) % 60;
    const m2 = `${m2h.toString().padStart(2, "0")}:${m2m.toString().padStart(2, "0")}`;

    interface MatchSlot { label: string; css: string; }
    const allMatches: MatchSlot[] = [];

    if (type === "knockout") {
      const size = nextPow2(n);
      const numRounds = Math.log2(size);
      for (let r = 0; r < numRounds; r++) {
        const count = size / Math.pow(2, r + 1);
        const lb = count === 1 ? "Final" : count === 2 ? "SF" : count === 4 ? "QF" : `R${count * 2}`;
        const css = count === 1 ? "f" : count === 2 ? "sf" : "";
        for (let i = 0; i < count; i++) allMatches.push({ label: lb, css });
      }
    } else {
      allMatches.push({ label: "GS", css: "" }, { label: "GS", css: "" });
      allMatches.push({ label: "SF", css: "sf" }, { label: "SF", css: "sf" });
      allMatches.push({ label: "Final", css: "f" });
    }

    let html = "";
    for (let s = 0; s < sessionDates.length; s++) {
      const date = sessionDates[s];
      const pair = allMatches.slice(s * 2, s * 2 + 2);
      if (!pair.length) break;
      html += `<div style="border:1px solid ${BORDER};border-radius:${R}px;margin-bottom:0.6rem;overflow:hidden">`;
      html += `<div style="background:${BLACK};color:#fff;padding:0.45rem 0.75rem;display:flex;align-items:center;justify-content:space-between;font-size:0.8rem;font-weight:700">`;
      html += `<span>Session ${s + 1}</span><span style="font-size:0.7rem;color:#888;font-weight:400">${formatDate(date)}</span>`;
      html += "</div>";
      pair.forEach((mx, i) => {
        const time = i === 0 ? m1 : m2;
        html += `<div style="padding:0.45rem 0.75rem;border-bottom:1px solid #f5f5f5;font-size:0.8rem;display:flex;align-items:center;gap:0.5rem">`;
        const cssB = mx.css === "f" ? GREEN : mx.css === "sf" ? BLUE : RED;
        html += `<span style="font-size:0.7rem;color:${MID};min-width:45px;font-weight:600">${time}</span>`;
        html += `<span style="font-size:0.68rem;background:${cssB};color:#fff;padding:1px 5px;border-radius:3px;font-weight:700">${mx.label}</span>`;
        html += `<span style="color:${MID}">Match ${s * 2 + i + 1}</span>`;
        html += "</div>";
      });
      html += "</div>";
    }
    return html;
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", background: WHITE, color: BLACK, fontFamily: "system-ui, sans-serif", fontSize: 14, lineHeight: 1.5 }}>
      <header style={{ background: BLACK, padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", borderBottom: `3px solid ${RED}` }}>
        <span style={{ background: RED, color: "#fff", fontWeight: 900, fontSize: "0.9rem", padding: "3px 10px", letterSpacing: "0.05em" }}>ELEVEN VR</span>
        <h1 style={{ color: "#fff", fontSize: "1rem", fontWeight: 700, letterSpacing: "0.02em" }}>School Playoff Bracket Generator</h1>
        <span style={{ color: "#888", fontSize: "0.8rem", marginLeft: "auto" }}>2 headsets · 40 min lunchtime · ~2 matches/session</span>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: "calc(100vh - 52px)" }}>
        {/* ── SIDEBAR ── */}
        <aside style={{ background: "#fff", borderRight: `1px solid ${BORDER}`, padding: "1.25rem", overflowY: "auto" }}>
          {/* School selector */}
          <div className="panel">
            <div className="panel-title">School roster</div>
            <div className="field">
              <label>School</label>
              <select value={school} onChange={e => setSchool(e.target.value as School)}
                style={{ ...inputStyle }}>
                {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Schedule */}
          <div className="panel">
            <div className="panel-title">School &amp; schedule</div>
            <div className="field">
              <label>First session date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle }} />
            </div>
            <div className="field">
              <label>Session days</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 4, marginTop: 4 }}>
                {[
                  { v: 1, label: "Mon" },
                  { v: 2, label: "Tue" },
                  { v: 3, label: "Wed" },
                  { v: 4, label: "Thu" },
                  { v: 5, label: "Fri" },
                ].map(d => (
                  <label key={d.v} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, fontWeight: 400, fontSize: "0.72rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={sessionDays.includes(d.v)}
                      onChange={() => setSessionDays(prev =>
                        prev.includes(d.v) ? prev.filter(x => x !== d.v) : [...prev, d.v].sort()
                      )} />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="field">
              <label>Lunchtime start</label>
              <input type="time" value={lunchStart} onChange={e => setLunchStart(e.target.value)} style={{ ...inputStyle }} />
            </div>
          </div>

          {/* Players */}
          <div className="panel">
            <div className="panel-title">
              Players <span style={{ fontWeight: 400, color: MID, fontSize: "0.75rem" }}>
                {players.length ? `(${players.length})` : ""}
              </span>
            </div>
            <div id="playerListSidebar">
              {players.map((p, i) => (
                <div key={p.id} className="player-row" style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                  <span className="player-num" style={{
                    width: 20, height: 20, background: BLACK, color: "#fff", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem",
                    fontWeight: 700, flexShrink: 0,
                  }}>{i + 1}</span>
                  <input type="text" value={p.name} placeholder="Student name"
                    onChange={e => updatePlayerName(p.id, e.target.value)}
                    style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => removePlayer(p.id)}
                    style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: "1rem", padding: "0 0.2rem" }}
                    onMouseOver={e => (e.target as HTMLElement).style.color = RED}
                    onMouseOut={e => (e.target as HTMLElement).style.color = "#ccc"}>
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addPlayer("")}
              style={{
                width: "100%", padding: "0.45rem", border: `1.5px dashed ${BORDER}`, borderRadius: R,
                background: "none", fontSize: "0.82rem", color: MID, cursor: "pointer", marginTop: "0.25rem",
              }}>
              + Add player
            </button>
          </div>

          {/* Stats */}
          <div className="panel" style={{ display: n >= 2 ? "block" : "none" }}>
            <div className="panel-title">Schedule summary</div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
              {[
                { num: n, label: "Players" },
                { num: total, label: "Matches" },
                { num: sessions, label: "Sessions" },
                { num: Math.ceil(sessions / (sessionDays.length || 1)), label: "Weeks" },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, minWidth: 70, background: BLACK, color: "#fff", borderRadius: R,
                  padding: "0.6rem 0.5rem", textAlign: "center",
                }}>
                  <div style={{ fontSize: "1.3rem", fontWeight: 900, color: RED, lineHeight: 1 }}>{s.num}</div>
                  <div style={{ fontSize: "0.62rem", color: "#aaa", marginTop: "0.15rem" }}>{s.label}</div>
                </div>
              ))}
            </div>
            {sessionDays.length === 0 ? (
              <div style={{
                background: AMBER_LT, borderLeft: `3px solid ${AMBER}`, padding: "0.65rem 0.8rem",
                borderRadius: `0 ${R}px ${R}px 0`, fontSize: "0.8rem", marginBottom: "0.85rem", color: "#7a3a00",
              }}>
                Select at least one session day.
              </div>
            ) : !startDate ? (
              <div style={{
                background: BLUE_LT, borderLeft: `3px solid ${BLUE}`, padding: "0.65rem 0.8rem",
                borderRadius: `0 ${R}px ${R}px 0`, fontSize: "0.8rem", marginBottom: "0.85rem", color: "#1a3a6a",
              }}>
                Add a start date to see the schedule.
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: buildScheduleHTML() }} />
            )}
          </div>

          {/* Action buttons */}
          {(n >= 2) && (
            <>
              <button onClick={publishBracket}
                disabled={publishing}
                style={{
                  display: "inline-block", padding: "0.5rem 1rem", borderRadius: R, fontSize: "0.82rem",
                  fontWeight: 700, cursor: "pointer", border: "none", letterSpacing: "0.02em",
                  background: GREEN, color: "#fff", width: "100%", textAlign: "center", marginBottom: "0.5rem",
                }}>
                {publishing ? "Publishing…" : "\uD83D\uDCE2 Publish bracket"}
              </button>
              {publishMsg && (
                <span style={{ color: publishMsg.startsWith("\u2713") ? GREEN : RED, fontSize: 12, fontWeight: 600, display: "block", textAlign: "center", marginBottom: "0.5rem" }}>
                  {publishMsg}
                </span>
              )}
            </>
          )}
          {searchPlayers && (
            <button onClick={regenerateFromSignups}
              style={{
                display: "inline-block", padding: "0.5rem 1rem", borderRadius: R, fontSize: "0.82rem",
                fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em",
                background: "transparent", color: BLUE, border: `1.5px solid ${BLUE}`,
                width: "100%", textAlign: "center", marginBottom: "0.5rem",
              }}>
              \uD83D\uDD04 Regenerate from sign-ups
            </button>
          )}
          <button onClick={() => saveRosterMutation.mutate()}
            disabled={saveRosterMutation.isPending}
            style={{
              display: "inline-block", padding: "0.5rem 1rem", borderRadius: R, fontSize: "0.82rem",
              fontWeight: 700, cursor: "pointer", border: "none", letterSpacing: "0.02em",
              background: BLUE, color: "#fff", width: "100%", textAlign: "center", marginBottom: "0.5rem",
            }}>
            {saveRosterMutation.isPending ? "Saving…" : "Save Roster"}
          </button>
          {saveRosterMutation.isSuccess && (
            <span style={{ color: GREEN, fontSize: 13, fontWeight: 600, display: "block", textAlign: "center", marginBottom: "0.5rem" }}>
              Roster saved \u2713
            </span>
          )}
          <button onClick={resetAll}
            style={{
              display: "inline-block", padding: "0.5rem 1rem", borderRadius: R, fontSize: "0.82rem",
              fontWeight: 700, cursor: "pointer", letterSpacing: "0.02em", width: "100%", textAlign: "center",
              background: "transparent", color: BLACK, border: `1.5px solid ${BORDER}`,
            }}>
            Reset
          </button>
        </aside>

        {/* ── MAIN ── */}
        <main className="main" style={{ padding: "1.5rem", overflowX: "auto" }}>
          {n < 2 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: MID }}>
              <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>🏓</div>
              <p>Add at least <strong>2 players</strong> to get started.</p>
            </div>
          ) : bracket ? (
            <>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.5rem",
              }}>
                <div>
                  <h2 style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.01em", margin: 0 }}>
                    {school} Playoff Bracket
                  </h2>
                  <div style={{ fontSize: "0.78rem", color: MID, marginTop: 2 }}>
                    {n} players · {total} matches · {sessions} lunchtime sessions needed
                  </div>
                </div>
                <span style={{
                  background: RED, color: "#fff", fontSize: "0.7rem", fontWeight: 700,
                  padding: "3px 10px", borderRadius: 3, letterSpacing: "0.04em",
                }}>
                  {type === "groups" ? "GROUP STAGE + KNOCKOUT" : `${nextPow2(n)}-DRAW KNOCKOUT`}
                </span>
              </div>

              {/* Bracket */}
              <div style={{ overflowX: "auto", paddingBottom: "1rem" }}>
                <div style={{ display: "flex", gap: 0, alignItems: "flex-start" }}>
                  {bracket.rounds.map((round, rIdx) => (
                    <div key={rIdx} className="round" style={{ display: "flex", flexDirection: "column", minWidth: 180 }}>
                      <div className="round-label" style={{
                        fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em",
                        textTransform: "uppercase", color: MID, padding: "0 8px 8px", textAlign: "center",
                      }}>
                        {bracket.roundNames[rIdx]}
                      </div>
                      {round.map((m, mIdx) => {
                        const mx = matches[m.id];
                        if (!mx) return null;
                        const gap = rIdx > 0 ? Math.pow(2, rIdx) * 8 : 0;
                        const isBye = mx.p2 === null;
                        if (isBye && !mx.winner) {
                          // Schedule auto-advance
                          setTimeout(() => {
                            setMatches(prev => prev[m.id]?.p1 && !prev[m.id].winner
                              ? { ...prev, [m.id]: { ...prev[m.id], winner: prev[m.id].p1 } }
                              : prev);
                          }, 0);
                        }

                        return (
                          <div key={m.id} style={{ margin: `${rIdx > 0 ? gap : 4}px 8px`, position: "relative" }}>
                            {/* connector */}
                            <div style={{ position: "absolute", right: -8, top: "50%", width: 8, height: 1, background: BORDER }} />
                            {/* Slot 1 */}
                            <div className="slot" style={{
                              display: "flex", alignItems: "center", background: "#fff",
                              border: `1px solid ${BORDER}`,
                              borderTopLeftRadius: R, borderTopRightRadius: R,
                              borderBottom: "none",
                              ...(mx.winner === mx.p1 ? { background: GREEN_LT, borderColor: GREEN } : {}),
                            }}>
                              <span className="slot-seed" style={{
                                width: 22, height: 34, background: mx.winner === mx.p1 ? GREEN : BLACK,
                                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "0.65rem", fontWeight: 700, flexShrink: 0,
                              }}>{rIdx * 2 + 1}</span>
                              <span className="slot-name" style={{
                                flex: 1, padding: "0 0.5rem", fontSize: "0.8rem",
                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                ...(mx.winner === mx.p1 ? { color: GREEN, fontWeight: 700 } : {}),
                              }}>{mx.p1 || "TBD"}</span>
                              <span className="slot-score" onClick={() => !isBye && openModal(m.id)}
                                style={{
                                  width: 28, height: 34, borderLeft: `1px solid ${BORDER}`,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "0.82rem", fontWeight: 700, color: MID, cursor: isBye ? "default" : "pointer",
                                  flexShrink: 0,
                                  ...(mx.winner === mx.p1 && !isBye ? { color: GREEN, background: GREEN_LT } : {}),
                                  ...(mx.winner && mx.winner !== mx.p1 && !isBye ? { color: "#ccc" } : {}),
                                }}>
                                {isBye ? "BYE" : (mx.s1 !== null ? mx.s1 : "·")}
                              </span>
                            </div>
                            {/* Slot 2 */}
                            {!isBye && (
                              <div className="slot" style={{
                                display: "flex", alignItems: "center", background: "#fff",
                                border: `1px solid ${BORDER}`,
                                borderBottomLeftRadius: R, borderBottomRightRadius: R,
                                ...(mx.winner === mx.p2 ? { background: GREEN_LT, borderColor: GREEN } : {}),
                              }}>
                                <span className="slot-seed" style={{
                                  width: 22, height: 34, background: mx.winner === mx.p2 ? GREEN : "#555",
                                  color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                                  fontSize: "0.65rem", fontWeight: 700, flexShrink: 0,
                                }}>{rIdx * 2 + 2}</span>
                                <span className="slot-name" style={{
                                  flex: 1, padding: "0 0.5rem", fontSize: "0.8rem",
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                  ...(mx.winner === mx.p2 ? { color: GREEN, fontWeight: 700 } : {}),
                                }}>{mx.p2 || "TBD"}</span>
                                <span className="slot-score" onClick={() => openModal(m.id)}
                                  style={{
                                    width: 28, height: 34, borderLeft: `1px solid ${BORDER}`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: "0.82rem", fontWeight: 700, color: MID, cursor: "pointer",
                                    flexShrink: 0,
                                    ...(mx.winner === mx.p2 ? { color: GREEN, background: GREEN_LT } : {}),
                                    ...(mx.winner && mx.winner !== mx.p2 ? { color: "#ccc" } : {}),
                                  }}>
                                  {mx.s2 !== null ? mx.s2 : "·"}
                                </span>
                              </div>
                            )}
                            <div className="match-id" style={{
                              fontSize: "0.6rem", color: "#ccc", textAlign: "center", marginTop: 2, padding: "0 8px",
                            }}>
                              {mx.walkover ? "walkover" : mx.s1 !== null ? `${mx.p1} ${mx.s1}–${mx.s2} ${mx.p2}` : ""}
                            </div>
                          </div>
                        );
                      })}

                      {/* Connector to next round */}
                      {rIdx < bracket.rounds.length - 1 && (
                        <div style={{
                          width: 1, background: BORDER,
                          marginTop: 24 + Math.pow(2, rIdx) * 8,
                          alignSelf: "stretch",
                        }} />
                      )}
                    </div>
                  ))}

                  {/* Champion */}
                  {(() => {
                    const finalId = bracket.rounds[bracket.rounds.length - 1]?.[0]?.id;
                    const champion = finalId ? matches[finalId]?.winner : null;
                    return (
                      <div className="round" style={{ display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 24, minWidth: 180 }}>
                        <div style={{
                          fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.1em",
                          textTransform: "uppercase", color: MID, padding: "0 8px 8px", textAlign: "center",
                        }}>Champion</div>
                        <div style={{
                          margin: "4px 8px", background: champion ? GREEN_LT : "#f5f5f5",
                          border: `2px solid ${champion ? GREEN : BORDER}`, borderRadius: R,
                          padding: "0.75rem", textAlign: "center", minWidth: 160,
                        }}>
                          <div style={{ fontSize: "1.4rem", marginBottom: "0.25rem" }}>🏆</div>
                          <div style={{
                            fontWeight: 800, fontSize: "0.9rem",
                            color: champion ? GREEN : MID,
                          }}>{champion ?? "TBD"}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Usage */}
              <div style={{
                marginTop: "1.5rem", padding: "0.85rem", background: "#fff",
                border: `1px solid ${BORDER}`, borderRadius: R, fontSize: "0.78rem", color: MID,
              }}>
                <strong style={{ color: BLACK }}>How to use:</strong>
                Click any score cell to enter a result. Winners advance automatically.
                Best of 3 games, first to 11 points. Allow ~15 min per match + 5 min changeover.
              </div>
            </>
          ) : null}
        </main>
      </div>

      {/* ── SCORE MODAL ── */}
      <div style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: modalMatchId ? "flex" : "none",
        alignItems: "center", justifyContent: "center", zIndex: 100,
      }} onClick={() => setModalMatchId(null)}>
        <div style={{
          background: "#fff", borderRadius: R, padding: "1.5rem", width: 320, maxWidth: "90vw",
        }} onClick={e => e.stopPropagation()}>
          {(() => {
            const mx = modalMatchId ? matches[modalMatchId] : null;
            if (!mx) return null;
            let w1 = 0, w2 = 0;
            if (mx.g1s1 > mx.g1s2) w1++; else if (mx.g1s2 > mx.g1s1) w2++;
            if (mx.g2s1 > mx.g2s2) w1++; else if (mx.g2s2 > mx.g2s1) w2++;
            if (w1 === 1 && w2 === 1) {
              if (mx.g3s1 > mx.g3s2) w1++; else if (mx.g3s2 > mx.g3s1) w2++;
            }
            const decided = w1 >= 2 || w2 >= 2;

            return (
              <>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: "0.25rem", margin: 0 }}>
                  Enter match result
                </h3>
                <p className="sub" style={{ fontSize: "0.8rem", color: MID, marginBottom: "1.25rem" }}>
                  {mx.p1 || "TBD"} vs {mx.p2 || "TBD"} — Best of 3, first to 11
                </p>
                <div id="gameInputs">
                  <div className="game-label" style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: MID, marginBottom: "0.4rem" }}>
                    Game scores (first to 11)
                  </div>
                  {[1, 2, 3].map(g => (
                    <div key={g} style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <span className="player" style={{ flex: 1, fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {mx.p1 || "TBD"}
                      </span>
                      <input id={`g${g}s1`} type="number" min={0} max={15}
                        defaultValue={mx[`g${g}s1` as keyof MatchState] as number || ""}
                        placeholder="0" onInput={() => { }}
                        disabled={g === 3 && decided}
                        style={{
                          width: 60, textAlign: "center", fontSize: "1.1rem", fontWeight: 700,
                          padding: "0.4rem", border: `1px solid ${BORDER}`, borderRadius: R,
                          fontFamily: "inherit",
                        }} />
                      <span style={{ color: MID, fontSize: "0.8rem" }}>–</span>
                      <input id={`g${g}s2`} type="number" min={0} max={15}
                        defaultValue={mx[`g${g}s2` as keyof MatchState] as number || ""}
                        placeholder="0" onInput={() => { }}
                        disabled={g === 3 && decided}
                        style={{
                          width: 60, textAlign: "center", fontSize: "1.1rem", fontWeight: 700,
                          padding: "0.4rem", border: `1px solid ${BORDER}`, borderRadius: R,
                          fontFamily: "inherit",
                        }} />
                      <span className="player" style={{ flex: 1, fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
                        {mx.p2 || "TBD"}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", fontSize: "0.82rem" }}>
                  <input type="checkbox" id="woCheck" />
                  <label htmlFor="woCheck" style={{ fontWeight: 400, cursor: "pointer" }}>
                    Walkover — opponent unable to play
                  </label>
                </div>
                <div className="modal-footer" style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button onClick={() => setModalMatchId(null)}
                    style={{
                      flex: 1, padding: "0.5rem 1rem", borderRadius: R, fontSize: "0.82rem",
                      fontWeight: 700, cursor: "pointer", border: "none", letterSpacing: "0.02em",
                      background: "#f0f0f0", color: BLACK,
                    }}>
                    Cancel
                  </button>
                  <button onClick={saveScoreFromModal}
                    disabled={saveMatchMutation.isPending}
                    style={{
                      flex: 1, padding: "0.5rem 1rem", borderRadius: R, fontSize: "0.82rem",
                      fontWeight: 700, cursor: "pointer", border: "none", letterSpacing: "0.02em",
                      background: RED, color: "#fff",
                    }}>
                    {saveMatchMutation.isPending ? "Saving…" : "Save result"}
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Shared input style ──
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.45rem 0.6rem", border: `1px solid ${BORDER}`,
  borderRadius: R, fontSize: "0.85rem", fontFamily: "inherit", color: BLACK,
  background: "#fff", boxSizing: "border-box",
};
