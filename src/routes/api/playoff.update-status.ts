import { createFileRoute } from "@tanstack/react-router";

const VALID_STATUSES = ["pending", "confirmed", "reserve", "withdrawn"];

export const Route = createFileRoute("/api/playoff/update-status")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { password, id, status } = body;

          if (!password || password !== process.env.VITE_ADMIN_PASSWORD) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
          }
          if (!id || !status || !VALID_STATUSES.includes(status)) {
            return new Response(JSON.stringify({ error: "Invalid id or status" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("playoff_signups")
            .update({ status })
            .eq("id", id);

          if (error) {
            console.error("[playoff/update-status] error", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          }

          return Response.json({ ok: true });
        } catch (e) {
          console.error("[playoff/update-status] error", e);
          return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
