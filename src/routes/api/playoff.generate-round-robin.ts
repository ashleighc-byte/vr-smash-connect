import { createFileRoute } from "@tanstack/react-router";

// ─── Circle method round-robin generator ───────────────────────────────
// Standard algorithm: fix the first player, rotate the rest clockwise.
// Each round pairings: (fixed, rotating[i]) for i=0..half-1.
// If odd number of players, fixed player gets a bye.

function generateRoundRobin(players: string[]): { round: number; player1: string; player2: string }[] {
  const n = players.length;
  if (n < 2) return [];

  // Clone + sort for deterministic output
  const pool = [...players].sort();
  // If odd, add a dummy "bye" marker
  if (n % 2 === 1) pool.push("__BYE__");

  const fixed = pool[0];
  const rotators = pool.slice(1);
  const totalRounds = rotators.length; // = n-1 for even, n for odd (but last round has byes)
  const matchesPerRound = pool.length / 2;
  const matches: { round: number; player1: string; player2: string }[] = [];

  for (let r = 0; r < totalRounds; r++) {
    // Pair fixed with first rotator, then inner pairs
    const pairings: { player1: string; player2: string }[] = [];
    for (let i = 0; i < matchesPerRound; i++) {
      const p1 = i === 0 ? fixed : rotators[pool.length - 1 - i];
      const p2 = rotators[i];
      if (p1 === "__BYE__" || p2 === "__BYE__") continue; // skip bye
      pairings.push({ player1: p1, player2: p2 });
    }
    matches.push(...pairings.map((p) => ({ round: r + 1, ...p })));

    // Rotate: keep fixed in place, move last rotator to position after fixed
    if (rotators.length > 1) {
      const last = rotators.pop()!;
      rotators.splice(1, 0, last);
    }
  }

  return matches;
}

interface PlayerInfo {
  id: string;
  school: string;
  student_name: string;
  player_slot: string;
}

export const Route = createFileRoute("/api/playoff/generate-round-robin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: { password: string; tournament_id?: string } = await request.json();

          if (!body.password) {
            return new Response(JSON.stringify({ error: "Password is required" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Verify admin password
          const { data: pwCheck, error: pwErr } = await supabaseAdmin.functions.invoke("check-admin-password", {
            body: { password: body.password },
          });
          if (pwErr || !pwCheck?.ok) {
            return new Response(JSON.stringify({ error: "Invalid password" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            });
          }

          const tournamentId = body.tournament_id ?? `round-robin-${Date.now()}`;

          // Fetch all players from tournament_rosters
          const { data: players, error: fetchErr } = await supabaseAdmin
            .from("tournament_rosters")
            .select("id, school, student_name, player_slot")
            .not("student_name", "is", null)
            .order("school", { ascending: true })
            .order("player_slot", { ascending: true });

          if (fetchErr) {
            return new Response(JSON.stringify({ error: "Failed to fetch players" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          if (!players || players.length < 2) {
            return new Response(
              JSON.stringify({ error: "Need at least 2 players to generate a bracket. Add players via the roster page first." }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          if (players.length > 8) {
            return new Response(
              JSON.stringify({ error: `Round robin supports 8 players max (found ${players.length}). Use the knockout bracket instead.` }),
              { status: 400, headers: { "Content-Type": "application/json" } }
            );
          }

          // Check if matches already exist for this tournament_id
          const { count: existingCount } = await supabaseAdmin
            .from("match_results")
            .select("*", { count: "exact", head: true })
            .eq("tournament_id", tournamentId);

          if (existingCount && existingCount > 0) {
            return new Response(
              JSON.stringify({ error: `Matches already exist for this tournament. Delete existing matches first to regenerate.`, count: existingCount }),
              { status: 409, headers: { "Content-Type": "application/json" } }
            );
          }

          // Map to player keys for round robin - use student_name + school
          const playerList = players.map((p: PlayerInfo) => ({
            key: `${p.student_name}__${p.school}`,
            name: p.student_name,
            school: p.school,
          }));

          // Generate round robin schedule
          const rawMatches = generateRoundRobin(playerList.map((p) => p.key));

          const playerMap = new Map(playerList.map((p) => [p.key, p]));

          // Build insert rows
          const insertRows = rawMatches.map((m) => {
            const p1 = playerMap.get(m.player1)!;
            const p2 = playerMap.get(m.player2)!;

            return {
              player_a: p1.name,
              player_b: p2.name,
              school_a: p1.school,
              school_b: p2.school,
              round_number: m.round,
              status: "scheduled",
              winner: null,
              tournament_id: tournamentId,
              match_day: `Round ${m.round}`,
            };
          });

          // Batch insert all matches
          const { error: insertErr } = await supabaseAdmin.from("match_results").insert(insertRows);

          if (insertErr) {
            console.error("[generate-round-robin] insert error", insertErr);
            return new Response(JSON.stringify({ error: insertErr.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }

          return Response.json({
            ok: true,
            tournament_id: tournamentId,
            match_count: insertRows.length,
            player_count: playerList.length,
            rounds: Math.max(...rawMatches.map((m) => m.round)),
          });
        } catch (e) {
          console.error("[generate-round-robin] error", e);
          return new Response(JSON.stringify({ error: "Invalid request" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
