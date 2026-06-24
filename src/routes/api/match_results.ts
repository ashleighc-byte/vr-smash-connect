import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/match_results")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin
            .from("match_results")
            .select("*")
            .order("created_at", { ascending: true });
          if (error) {
            console.error("[match_results] fetch error", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          }
          return Response.json(data ?? []);
        } catch (e) {
          console.error("[match_results] error", e);
          return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
