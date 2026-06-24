import { createFileRoute } from "@tanstack/react-router";

const ARRAY_COLS = new Set(["participation_barriers", "interest_reasons", "top_motivators"]);
const INT_COLS = new Set(["interest_in_vr_tt", "interest_in_physical_tt"]);

const ALLOWED = new Set([
  "year_level", "school", "house", "activity_frequency", "plays_school_team",
  "activity_identity", "participation_barriers", "gaming_frequency", "vr_experience",
  "interest_in_vr_tt", "interest_reasons", "nervousness", "physical_tt_experience",
  "interest_in_physical_tt", "wants_more_tt", "uses_karawhiua", "house_points_motivator",
  "top_motivators", "suggestions", "wants_to_represent", "other_comments",
]);

function normalize(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (!ALLOWED.has(k)) continue;
    if (v === "" || v == null) continue;
    if (ARRAY_COLS.has(k)) out[k] = Array.isArray(v) ? v : [v];
    else if (INT_COLS.has(k)) {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    } else out[k] = v;
  }
  return out;
}

export const Route = createFileRoute("/api/survey/student")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const row = normalize(body);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("student_survey_responses").insert(row as never);
          if (error) {
            console.error("[survey/student] insert error", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[survey/student] error", e);
          return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});