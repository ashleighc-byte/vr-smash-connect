import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/playoff/publish-bracket")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { password, school, bracket_data, is_live } = body;

          if (!password || password !== process.env.VITE_ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
          }
          if (!school || !bracket_data) {
            return new Response(JSON.stringify({ error: "Missing school or bracket_data" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Upsert by school
          const { error } = await supabaseAdmin
            .from("published_brackets")
            .upsert({
              school,
              bracket_data,
              is_live: is_live ?? true,
              published_at: new Date().toISOString(),
            }, { onConflict: "school" });

          if (error) {
            console.error("[playoff/publish-bracket] error", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          }

          return Response.json({ ok: true });
        } catch (e) {
          console.error("[playoff/publish-bracket] error", e);
          return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
