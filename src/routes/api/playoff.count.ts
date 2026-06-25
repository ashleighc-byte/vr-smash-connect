import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/playoff/count")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { count, error } = await supabaseAdmin
            .from("playoff_signups")
            .select("*", { count: "exact", head: true });

          if (error) {
            console.error("[playoff/count] error", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
          }

          // Also get per-school counts
          const { data: perSchool } = await supabaseAdmin
            .from("playoff_signups")
            .select("school, status");

          const bySchool: Record<string, { total: number; pending: number; confirmed: number; reserve: number }> = {};
          if (perSchool) {
            for (const s of perSchool) {
              if (!bySchool[s.school]) bySchool[s.school] = { total: 0, pending: 0, confirmed: 0, reserve: 0 };
              bySchool[s.school].total++;
              if (s.status === "confirmed") bySchool[s.school].confirmed++;
              else if (s.status === "reserve") bySchool[s.school].reserve++;
              else if (s.status === "pending") bySchool[s.school].pending++;
            }
          }

          return Response.json({ total: count ?? 0, bySchool });
        } catch (e) {
          console.error("[playoff/count] error", e);
          return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});
