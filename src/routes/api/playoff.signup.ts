import { createFileRoute } from "@tanstack/react-router";

// ── Schema ──
const SCHOOLS = ["Piopio College", "Taumarunui High School", "Otorohanga College", "Te Kuiti High School"];

interface SignupBody {
  student_name: string;
  school: string;
  year_group?: string;
  house?: string;
  played_before?: string;
}

export const Route = createFileRoute("/api/playoff/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: SignupBody = await request.json();

          // Validate
          if (!body.student_name?.trim() || body.student_name.length > 100) {
            return new Response(JSON.stringify({ error: "Name is required (max 100 chars)" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }
          if (!body.school || !SCHOOLS.includes(body.school)) {
            return new Response(JSON.stringify({ error: "Valid school is required" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Check if sign-ups are open for this school
          const { data: settings } = await supabaseAdmin
            .from("playoff_school_settings")
            .select("signups_open")
            .eq("school", body.school)
            .single();

          if (settings && !settings.signups_open) {
            return new Response(JSON.stringify({ error: `Sign-ups for ${body.school} are currently closed` }), { status: 403, headers: { "Content-Type": "application/json" } });
          }

          // Dedup check
          const { data: existing } = await supabaseAdmin
            .from("playoff_signups")
            .select("id, student_name")
            .eq("school", body.school)
            .eq("student_name", body.student_name.trim())
            .maybeSingle();

          if (existing) {
            return Response.json({ ok: true, duplicate: true, message: "You're already signed up — we've got you on the list!" });
          }

          // Insert
          const { error } = await supabaseAdmin.from("playoff_signups").insert({
            school: body.school,
            student_name: body.student_name.trim(),
            year_group: body.year_group || null,
            house: body.house || null,
            played_before: body.played_before || null,
            status: "pending",
          });

          if (error) {
            console.error("[playoff/signup] insert error", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          }

          return Response.json({ ok: true, duplicate: false, name: body.student_name.trim() });
        } catch (e) {
          console.error("[playoff/signup] error", e);
          return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
