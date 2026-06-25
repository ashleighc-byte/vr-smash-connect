import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/playoff/school-settings")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { password, school, signups_open } = body;

          if (!password || password !== process.env.VITE_ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
          }
          if (!school || typeof signups_open !== "boolean") {
            return new Response(JSON.stringify({ error: "Invalid school or signups_open" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("playoff_school_settings")
            .upsert({ school, signups_open, updated_at: new Date().toISOString() }, { onConflict: "school" });

          if (error) {
            console.error("[playoff/school-settings] error", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          }

          return Response.json({ ok: true });
        } catch (e) {
          console.error("[playoff/school-settings] error", e);
          return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
