import { createFileRoute } from "@tanstack/react-router";

const ARRAY_COLS = new Set(["interested_student_types", "technical_issues", "what_needs_to_change"]);
const INT_COLS = new Set([
  "students_tried", "playoff_student_count", "student_engagement",
  "recommend_to_schools", "setup_ease", "internet_reliability",
]);

const ALLOWED = new Set([
  "completed_by", "school", "role", "setup_ease", "headset_setup", "safe_space_worked",
  "casting_worked", "internet_reliability", "technical_issues", "sessions_run",
  "students_tried", "lunchtime_format_worked", "enough_rotation_time",
  "non_sport_students_involved", "non_sport_students_comments", "ran_playoffs",
  "playoff_format", "playoff_felt_fair", "playoff_student_count", "student_engagement",
  "interested_student_types", "spectator_element_value", "house_points_drove_participation",
  "tournament_timing_workable", "students_understood_rules", "felt_like_event",
  "what_worked_best", "hardest_to_manage", "created_vr_sport_interest",
  "created_physical_tt_interest", "would_run_again", "what_needs_to_change",
  "recommend_to_schools", "final_comments",
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

export const Route = createFileRoute("/api/survey/staff")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const row = normalize(body);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.from("staff_survey_responses").insert(row as never);
          if (error) {
            console.error("[survey/staff] insert error", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          }
          return Response.json({ ok: true });
        } catch (e) {
          console.error("[survey/staff] error", e);
          return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});