import { createFileRoute } from "@tanstack/react-router";
// Admin-only: fetch all sign-ups
export const Route = createFileRoute("/api/playoff/signups")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const password = body.password;

          if (!password || password !== process.env.VITE_ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("playoff_signups")
            .select("*")
            .order("school")
            .order("student_name");

          if (error) {
            console.error("[playoff/signups] error", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          }

          // Also fetch school settings
          const { data: settings } = await supabaseAdmin
            .from("playoff_school_settings")
            .select("*");

          return Response.json({ signups: data ?? [], settings: settings ?? [] });
        } catch (e) {
          console.error("[playoff/signups] error", e);
          return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
